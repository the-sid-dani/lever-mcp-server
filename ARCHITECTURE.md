# ARCHITECTURE.md

Request-flow diagrams + auth-chain failure recovery for the Lever MCP Server. Sourced from [`system-design.md`](./system-design.md) §3 + §12; this doc is the engineer-facing condensed reference.

For the full system design (decision rationale, alternatives evaluated, decision log), read `system-design.md`. For Claude Code session guidance, read `CLAUDE.md`.

---

## Request flow

### Happy path (multi-tenant v3 target — Google OAuth broker)

The server is its **own** OAuth 2.1 Authorization Server, federating to Google. No Auth0 in the login path. (Ported from the MSCI MCP's `oauth_broker.py`.)

```
┌─────────────────┐                                              ┌──────────────────┐
│  Claude         │  1. MCP request (no token)                   │  Lever MCP       │
│  (MCP client)   │ ───────────────────────────────────────────► │  (we are the AS) │
└─────────────────┘                                              └────────┬─────────┘
        ▲                                                                 │
        │  2. 401 + WWW-Authenticate (resource_metadata → OUR /.well-known)│
        │                                                                 ▼
        │  3. DCR: POST /register  →  Claude self-registers a client
        │  4. GET /authorize (PKCE S256)                                  │
        ├─────────────────────────────────────────────────────────┐      │
        │                                                          ▼      │
        │   Lever broker stashes the request, redirects user to Google:   │
        │   accounts.google.com/o/oauth2/v2/auth                          │
        │     scope=openid email profile, hd=samba.tv, prompt=select_acct │
        │                                                          │      │
        │                          5. Google → GET /oauth/google/callback?code
        │                             - exchange code → Google ID token   │
        │                             - validate RS256 (Google JWKS), iss │
        │                             - enforce hd == samba.tv  ◄── domain gate
        │                             - mint opaque MCP code ↔ email       │
        │  6. redirect back to Claude with MCP code                       │
        │  7. POST /token → opaque Bearer access token (1h TTL ↔ email)   │
        ▼                                                                 │
   ┌──────────────────────────────────────────────────────────────────────┘
   │ 8. MCP request with `Authorization: Bearer <opaque>`
   ▼
┌──────────────────┐
│  Lever MCP       │   9. Validate opaque token → resolve email
│  Server          │  10. perform-as-resolver
│                  │      - cache hit → return Lever user ID
│                  │      - cache miss → GET /v1/users?email=<email> (1h TTL)
│                  │      - null AND OAUTH_ENABLED=true → PerformAsUnresolvedError
│                  │      - OAUTH_ENABLED=false (cron) → LEVER_DEFAULT_USER_ID
│                  │  11. Tool dispatch (zod-validated) → Lever REST
│                  │      - attach perform_as, rate-limited via shared bucket
└────────┬─────────┘
         ▼
   Lever ATS API → response formatted, returned to Claude
```

### Current single-tenant fallback (`OAUTH_ENABLED=false`)

Local dev / cron / internal callers: server skips the broker, gates at the Cloud Run IAM layer (Google service-account auth), attaches `LEVER_DEFAULT_USER_ID` directly as `perform_as` on all writes.

---

## Component breakdown

| Module | Responsibility | Critical invariants |
|---|---|---|
| `src/server.ts` | Cloud Run entry. Express setup. MCP transport wiring. Routes `/mcp`, `/health`, OAuth Protected Resource Metadata. | Transports map is per-container memory. Revision swap drops active sessions. |
| `src/tools.ts` | `registerAllTools(server, client)`. Dispatches to additional + interview tool registrations. | Split into `src/tools/index.ts` + domain files in v3 M3a. |
| `src/additional-tools.ts` | 16+ tool registrations (post-M1: includes `lever_get_users`). | Use the `server.tool(name, schema, handler)` registration pattern. |
| `src/interview-tools.ts` | 2 interview-specific tool registrations. | Same pattern as additional-tools.ts. |
| `src/lever/client.ts` | LeverClient — REST wrapper, HTTP request layer, pagination, rate limiting via token bucket. | Single token bucket instance (shared across split files in v3 M3a). |
| `src/auth/google-oauth-broker.ts` | (v3 M0b) Google OAuth broker implementing the SDK's `OAuthServerProvider` — `/authorize`, `/token`, `/register`, `/revoke`, `/oauth/google/callback`. Mints + validates opaque tokens ↔ email. | In-memory token/DCR store, per-instance. Enforce `hd == samba.tv` on the Google ID token. |
| `src/auth/middleware.ts` | `OAUTH_ENABLED` toggle + Cloud Run IAM fallback; opaque-token validation via the broker. | Fallback path (`OAUTH_ENABLED=false`) attaches the env default only. |
| `src/auth/metadata.ts` | OAuth 2.0 Protected Resource Metadata endpoint (RFC 9728). | `authorization_servers` points at this server's own `MCP_PUBLIC_URL`. |
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
  - `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` — self-serve Google OAuth Web client (docs/google-oauth-setup.md).
  - `MCP_PUBLIC_URL`, `ALLOWED_HOSTED_DOMAIN=samba.tv`.
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

Confirm the user's `@samba.tv` Google account is active in the Google Workspace admin console. If suspended or deleted, Google rejects the sign-in before the broker ever sees it.

### 2. Rejected at the Google callback?

The broker logs every `/oauth/google/callback` outcome. Check Cloud Run logs:

```bash
gcloud logging read 'resource.type="cloud_run_revision"
  AND resource.labels.service_name="lever-mcp"
  AND severity>=WARNING' \
  --limit 50 --freshness 1h --format json
```

| Log reason | Diagnosis | Recovery |
|---|---|---|
| `hosted domain not allowed` (`hd != samba.tv`) | User signed in with a personal Google account | Use the `@samba.tv` account |
| `invalid issuer` | ID token `iss` not `accounts.google.com` | Almost always a misrouted callback / wrong client; verify the OAuth client |
| `upstream token exchange failed` | Wrong `GOOGLE_OAUTH_CLIENT_SECRET`, or redirect URI not authorized on the Google client | Verify secret + that the exact callback URL is an Authorized Redirect URI |

### 3. Sign-in succeeded, but a later `/mcp` call returns 401

The opaque access token expired (1h TTL) or the Cloud Run instance scaled out / restarted and dropped the in-memory token. **Recovery:** user re-runs the connector sign-in (one click). If it recurs frequently, that's the signal to move token storage to Firestore/Redis.

### 4. Token valid, but tool returns "Your Lever account is not provisioned"

The user authenticated fine but `perform-as-resolver` found no matching Lever user. **Recovery:** Talent team provisions them in Lever admin. The resolver's 1h cache may still serve null — wait for TTL, restart the revision, or (future) hit `/admin/cache/flush`.

### 5. Everything looks healthy but the MCP client can't connect at all

Test the broker's discovery + DCR surface directly:

```bash
BASE=https://lever-mcp-201626763325.us-central1.run.app

# We ARE the authorization server — this must return our own endpoints:
curl -s $BASE/.well-known/oauth-authorization-server | python3 -m json.tool
#   expect issuer + /authorize + /token + /register + code_challenge_methods_supported: ["S256"]

# Protected resource metadata (authorization_servers must point at OUR url):
curl -s $BASE/.well-known/oauth-protected-resource | python3 -m json.tool
```

If `/.well-known/oauth-authorization-server` 404s, the broker isn't wired (M0b incomplete) or `GOOGLE_OAUTH_CLIENT_ID` is unset (broker self-disables). See [system-design.md §4](./system-design.md#auth-model) + [docs/google-oauth-setup.md](./docs/google-oauth-setup.md).

---

## Auth failure surfaces (broker model)

Far smaller than the old Auth0 delegation path (one Google client we own, no tenant toggles):

1. **Google OAuth client misconfig.** Redirect URI not authorized, wrong client secret, or consent screen not Internal. Recovery: GCP Console → Credentials, verify against docs/google-oauth-setup.md.
2. **`hd` drift.** `ALLOWED_HOSTED_DOMAIN` env not `samba.tv`, or the broker's `hd` check disabled. Recovery: confirm env + the callback validation path.

**The M0b smoke test MUST include a deliberate non-`@samba.tv` reject case** to verify the domain gate fires.

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

Google OAuth client rotation (if the client secret is ever rotated): same atomic `gcloud run services update` swapping the `google-oauth-client-secret` secret reference.

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
