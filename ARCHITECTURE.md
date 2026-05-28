# ARCHITECTURE.md

Request-flow diagrams + auth-chain failure recovery for the Lever MCP Server. Sourced from [`system-design.md`](./system-design.md) §3 + §12; this doc is the engineer-facing condensed reference.

For the full system design (decision rationale, alternatives evaluated, decision log), read `system-design.md`. For Claude Code session guidance, read `CLAUDE.md`.

---

## Request flow

### Happy path (multi-tenant v3 target)

```
┌─────────────────┐                                              ┌──────────────────┐
│  Claude         │  1. MCP request (no token)                   │  Lever MCP       │
│  (MCP client)   │ ───────────────────────────────────────────► │  Server          │
└─────────────────┘                                              │  (Cloud Run)     │
        ▲                                                        └────────┬─────────┘
        │                                                                 │
        │                                       2. 401 Unauthorized
        │                                          + WWW-Authenticate header
        │                                          (with resource_metadata URL)
        │                                                                 │
        │                                                                 ▼
        │                                                        Auth0 discovery
        │ 3. OAuth 2.1 authorization code + PKCE flow                     │
        ├──────────────────────────────────────────────────────────┐      │
        │                                                          ▼      │
        │  ┌────────────────────────────────────────────────────────────┐ │
        │  │  Auth0 (OAuth 2.1 AS)                                      │ │
        │  │  + Google Workspace Enterprise Connection                  │ │
        │  │    (domain-restricted to samba.tv)                         │ │
        │  │  + Post-Login Action (defense in depth: reject non-@samba) │ │
        │  └────────────────────────────────────────────────────────────┘ │
        │                                                                 │
        │ 4. Bearer JWT (RS256)                                           │
        │    - audience: https://lever-mcp-201626763325.us-central1.run.app
        │    - claims: email, email_verified, hd, name, sub               │
        │                                                                 │
        ▼                                                                 │
   ┌──────────────────────────────────────────────────────────────────────┘
   │ 5. MCP request with `Authorization: Bearer <jwt>`
   ▼
┌──────────────────┐
│  Lever MCP       │   6. Validate JWT
│  Server          │      - signature via Auth0 JWKS (cached, jose.createRemoteJWKSet)
│  middleware      │      - aud, iss, exp claims
│                  │      - extract email claim
│                  │
│                  │   7. perform-as-resolver
│                  │      - cache hit → return Lever user ID
│                  │      - cache miss → GET /v1/users?email=<email>
│                  │      - cache result with 1h TTL
│                  │      - resolver returns null AND OAUTH_ENABLED=true
│                  │        → throw PerformAsUnresolvedError
│                  │      - OAUTH_ENABLED=false (cron, internal)
│                  │        → fallback to LEVER_DEFAULT_USER_ID
│                  │
│                  │   8. Tool dispatch (zod-validated args)
│                  │
│                  │   9. Lever REST API call via client-write.ts
│                  │      - attach perform_as=<resolved-user-id>
│                  │      - rate-limited via shared token bucket singleton
└────────┬─────────┘
         ▼
┌──────────────────┐
│  Lever ATS API   │   10. Process write
│  (api.lever.co)  │   11. Return response
└────────┬─────────┘
         │
         ▼
   Response formatted (formatOpportunity, etc.), returned to Claude
```

### Current single-tenant fallback (pre-v3-M3b)

When `OAUTH_ENABLED=false` OR when running locally without a configured Auth0 tenant: server skips JWT validation, gates at the Cloud Run IAM layer (Google service-account auth), attaches `LEVER_DEFAULT_USER_ID` env var directly as `perform_as` on all writes. Used by Sid in single-tenant mode and for cron jobs / internal callers.

---

## Component breakdown

| Module | Responsibility | Critical invariants |
|---|---|---|
| `src/server.ts` | Cloud Run entry. Express setup. MCP transport wiring. Routes `/mcp`, `/health`, OAuth Protected Resource Metadata. | Transports map is per-container memory. Revision swap drops active sessions. |
| `src/tools.ts` | `registerAllTools(server, client)`. Dispatches to additional + interview tool registrations. | Split into `src/tools/index.ts` + domain files in v3 M3a. |
| `src/additional-tools.ts` | 16+ tool registrations (post-M1: includes `lever_get_users`). | Use the `server.tool(name, schema, handler)` registration pattern. |
| `src/interview-tools.ts` | 2 interview-specific tool registrations. | Same pattern as additional-tools.ts. |
| `src/lever/client.ts` | LeverClient — REST wrapper, HTTP request layer, pagination, rate limiting via token bucket. | Single token bucket instance (shared across split files in v3 M3a). |
| `src/auth/middleware.ts` | JWT validation + OAUTH_ENABLED toggle + Cloud Run IAM fallback. | Validates aud, iss, exp. JWKS fetched via cached `jose.createRemoteJWKSet` (5-min cooldown). |
| `src/auth/metadata.ts` | OAuth 2.0 Protected Resource Metadata endpoint (RFC 9728). | Returns `authorization_servers` field with Auth0 issuer URL. |
| `src/auth/perform-as-resolver.ts` | (v3 M3b) email → Lever user lookup with TTL cache (1h). | Fail loud on auth-enabled-but-unmatched. Fallback to env default ONLY when `OAUTH_ENABLED=false`. |
| `src/lever/client-write.ts` | (v3 M3a/M3b) Write-request shim. Attaches resolved `perform_as` on every POST/PUT/DELETE. | All write tools MUST route through this. No direct `client.makeRequest("POST", ...)` outside this file. |

---

## Deployment topology

- **One Cloud Run service:** `lever-mcp` in project `<project-id>`, region `us-central1`.
- **One revision per deploy.** Traffic split via `gcloud run services update-traffic`.
- **Env vars** held in Cloud Run service config (NOT in `.env` files in production):
  - `LEVER_API_KEY` — rotated post-refactor in M7.
  - `LEVER_DEFAULT_USER_ID` — fallback for non-authenticated paths only.
  - `OAUTH_ENABLED` = `true`.
  - `AUTH0_DOMAIN`, `AUTH0_AUDIENCE`, `AUTH0_ISSUER` — set in M0b after IT delivers prod Auth0 tenant.
- **Build:** Dockerfile + `cloudbuild.yaml`. Reconciled in v3 M2.6.

### MCP session state

The server keeps an in-memory `transports` map keyed by session ID. **Session state is per-container memory.** Cloud Run revision swap drops active MCP sessions; clients reconnect transparently on the next request (negligible UX impact for single-shot tool calls; brief failure window for long-running streams).

Acceptable for single-region single-revision deploy. If multi-user use grows, move to Redis or Firestore — tracked as out-of-scope follow-up.

### Rollback procedures

**Per-deploy** rollback (last good revision is one revision ago):

```bash
gcloud run services update-traffic lever-mcp \
  --to-revisions=<previous-revision>=100 \
  --region us-central1
```

Traffic flips in seconds.

**Pre-refactor** rollback (absolute fallback to pre-v3 state):

```bash
git fetch origin
git checkout pre-refactor-2026-05-22
# Build + deploy this tag's container via cloudbuild.yaml
```

---

## Auth chain failure recovery

When a Samba employee reports "MCP can't connect" or "401 from Lever MCP," walk this decision tree:

### 1. Google account active?

Confirm the user's `@samba.tv` Google account is active in Google Workspace admin console. If suspended or deleted, the Google Workspace Enterprise Connection rejects them at the IdP layer — Auth0 never even sees the login.

### 2. Auth0 rejected? Check Auth0 logs

Auth0 dashboard > Monitoring > Logs. Filter by `user_email` matching the failing user.

**Common rejection reasons:**

| Rejection | Diagnosis | Recovery |
|---|---|---|
| `Failed Silent Auth` for non-`@samba.tv` email | Defense-in-depth Post-Login Action triggered | User must use their `@samba.tv` Google account, not personal Google |
| `Login required` with no Google Workspace error | Google Workspace connection misconfig | Verify enterprise connection status in Auth0 dashboard |
| `Connection lapsed` | Auth0 / Google Workspace federation contract expired | Renew or refresh the connection in Auth0 |

### 3. Auth0 succeeded, Lever MCP returned 401?

Token validation failed server-side. Check Cloud Run logs:

```bash
gcloud logging read 'resource.type="cloud_run_revision"
  AND resource.labels.service_name="lever-mcp"
  AND severity>=WARNING' \
  --limit 50 --freshness 1h --format json
```

Look for log entries from `auth/middleware.ts` indicating which claim failed:

| Log message | Diagnosis | Recovery |
|---|---|---|
| `Invalid audience claim` | Auth0 API audience mismatch — token issued for wrong resource | Verify `AUTH0_AUDIENCE` env var matches the Auth0 API identifier exactly |
| `Invalid issuer claim` | Auth0 issuer URL drift | Verify `AUTH0_ISSUER` env var matches `https://<tenant>.<region>.auth0.com/` (trailing slash matters) |
| `Token expired` | Refresh token didn't rotate / Claude session stale | User re-authenticates (re-add MCP server in Claude Desktop) |
| `JWKS fetch failed` | Auth0 network blip OR JWKS endpoint URL wrong | Check JWKS cooldown didn't get stuck on a stale 5xx; restart Cloud Run revision |

### 4. Token validated, but tool returns "Your Lever account is not provisioned"

The user's `@samba.tv` email is in Google Workspace + Auth0 + their Lever MCP token is valid, but `perform-as-resolver` returned null. This means they don't have a corresponding Lever user record.

**Recovery:** Talent team provisions them in Lever admin. After provisioning, the resolver's 1-hour cache may still serve null — flush via:

- Wait 1 hour for TTL expiry, OR
- Restart the Cloud Run revision (clears in-memory cache), OR
- Hit a future `/admin/cache/flush` endpoint (not yet implemented; tracked for v3 M5 observability scope)

### 5. Everything looks healthy but MCP client can't connect at all

The MCP client's discovery flow may be broken. Test directly:

```bash
# OAuth 2.0 Authorization Server metadata
curl https://<auth0-domain>/.well-known/oauth-authorization-server

# Expected: includes
#   code_challenge_methods_supported: ["S256"]
#   authorization_response_iss_parameter_supported: true
#   registration_endpoint (for Dynamic Client Registration)

# OpenID Connect discovery
curl https://<auth0-domain>/.well-known/openid-configuration

# MCP server's Protected Resource Metadata
curl https://lever-mcp-201626763325.us-central1.run.app/.well-known/oauth-protected-resource

# Expected: authorization_servers field pointing at Auth0 issuer
```

If any of these endpoints return errors, the IT-side Auth0 setup is incomplete. See [system-design.md §4 Auth0 setup requirements](./system-design.md#auth-model) for the checklist.

---

## Three independent auth failure surfaces

Premortem Tiger #3 (system-design.md §10): the auth chain has THREE independent failure surfaces, each silently locking users out:

1. **Auth0 tenant misconfig.** Resource Parameter Compatibility Profile not enabled. `authorization_response_iss_parameter_supported: true` not set. Wrong API audience. PKCE method not S256. Recovery: Auth0 admin reviews tenant config against system-design.md §4 checklist.
2. **Google Workspace connection drift.** Connection lapsed, domain restriction misconfigured, IdP federation cert expired. Recovery: Auth0 admin > Authentication > Enterprise Connections > Google Workspace, verify health.
3. **Action rule misfire.** Post-Login Action returns error on a valid user (regex bug, claim missing). Recovery: Auth0 admin > Actions > Library, review Post-Login Action source code, check logs for action execution.

**Smoke test on every M0b cutover MUST include a deliberate non-`@samba.tv` reject case** to verify all three surfaces are operating.

---

## Key rotation procedure

See [system-design.md §12 Lever API key rotation](./system-design.md#operational-runbook).

```bash
# Atomic env-var swap on Cloud Run service
gcloud run services update lever-mcp \
  --update-env-vars LEVER_API_KEY=<new-key>,LEVER_DEFAULT_USER_ID=<sid-uuid> \
  --region us-central1
```

- Active MCP sessions reconnect transparently
- Mid-flight tool calls may see one error then recover
- Schedule during low-use windows
- After verification, invalidate the OLD key in Lever admin

For v3 M7 (prod Auth0 cutover): same `gcloud run services update` command, replacing `AUTH0_DOMAIN`, `AUTH0_AUDIENCE`, `AUTH0_ISSUER` env vars from dev → prod values in a single atomic update.

---

## Per-milestone tagging scheme (v3 refactor)

Each milestone's final commit gets a git tag matching the milestone code:

| Milestone | Tag | Status |
|---|---|---|
| Pre-refactor baseline | `pre-refactor-2026-05-22` | ✅ Created |
| M0a complete | `v3-m0a` | (forthcoming) |
| M1 complete | `v3-m1` | (forthcoming) |
| M1.5 complete | `v3-m1.5` | (forthcoming) |
| M2 complete | `v3-m2` | (forthcoming) |
| M2.5 complete | `v3-m2.5` | (forthcoming) |
| M2.6 complete | `v3-m2.6` | (forthcoming) |
| M3a complete | `v3-m3a` | (forthcoming) |
| M3b complete | `v3-m3b` | (forthcoming) |
| M4 complete | `v3-m4` | (forthcoming) |
| M5 complete | `v3-m5` | (forthcoming) |
| M6 complete | `v3-m6` | (forthcoming) |
| M7 complete | `v3-m7` (v3 GA) | (forthcoming) |
| M8 complete (optional) | `v3-m8` | (forthcoming) |

To roll back to any milestone:

```bash
gcloud run services update-traffic lever-mcp \
  --to-revisions=<revision-matching-tag>=100 \
  --region us-central1
```

Cloud Run revisions are also taggable directly — use the `--tag` flag during deploy to associate revisions with milestone codes.

---

## See also

- [`system-design.md`](./system-design.md) — canonical 13-section design spec
- [`CLAUDE.md`](./CLAUDE.md) — Claude Code session guidance for this codebase
- [`README.md`](./README.md) — public-facing project README
- [Jira Epic ATF-476](https://sambatv.atlassian.net/browse/ATF-476) — v3 refactor tracking
- [Confluence design hub](https://sambatv.atlassian.net/wiki/spaces/ATF/pages/14838136852) — stakeholder-facing
