---
title: Lever MCP Server — System Design
status: active
version: v2 (post-OAuth migration) → v3 (refactor in progress per ATF-476)
last_updated: 2026-05-26
owner: Sid Dani (sid.dani@samba.tv)
epic: https://sambatv.atlassian.net/browse/ATF-476
predecessor_epic: https://sambatv.atlassian.net/browse/ATF-435 (v1, closed Done)
repo: https://github.com/the-sid-dani/lever-mcp-server
live: https://lever-mcp-201626763325.us-central1.run.app/mcp
---

# Lever MCP Server — System Design

## 1. Overview

The Lever MCP Server is a remote Model Context Protocol (MCP) server that exposes the Lever ATS (Applicant Tracking System) API as tools callable from Claude. It runs on GCP Cloud Run and is reachable from Claude.ai connectors and Claude Code via the standard MCP OAuth flow.

**Why it exists.** Samba's Talent Acquisition team uses Lever as the ATS. Common hiring-loop tasks — checking candidate status, reading interview feedback, finding postings by recruiter, submitting feedback — require either Lever UI clicks or scraping Lever notification emails. The MCP server lets Claude perform those tasks directly via the Lever REST API, with audit-trail attribution to the requesting user.

**Where it sits in the stack.** The server is its **own** OAuth 2.1 Authorization Server (v3 target), brokering Google Workspace sign-in restricted to `@samba.tv` — no third-party AS in the login path. It validates each user's sign-in, derives their email, looks up their Lever user record, and attaches the resolved user ID as the `perform_as` parameter on outbound Lever API writes.

## 2. Current state (post-v1, pre-v3)

v1 shipped 2026-02-03 (commit `38e4768 feat(auth): Add OAuth 2.1 with Auth0 for Claude.ai Connector support`). Built on Express + Cloud Run + Streamable HTTP transport, with OAuth 2.1 via Auth0 added in the same commit. Documentation (README.md, CLAUDE.md) was reconciled with this architecture in v3 (ATF-476 M2).

### v1 stack

| Component | Value |
|---|---|
| Language | TypeScript (Node.js runtime) |
| HTTP server | Express 4.21 |
| MCP SDK | `@modelcontextprotocol/sdk` 1.25.0 |
| MCP transport | Streamable HTTP |
| MCP-Protocol-Version | `2025-06-18` (pinned in `src/server.ts:26`) |
| JWT validation | `jose` 6.1.3 |
| Schema validation | `zod` 3.25 |
| Deploy target | GCP Cloud Run, region `us-central1` |
| Service URL | `https://lever-mcp-201626763325.us-central1.run.app/mcp` |
| Auth (env-toggle) | OAuth 2.1 — v3 target is the self-hosted Google OAuth broker; falls back to Cloud Run IAM when `OAUTH_ENABLED=false` |
| Live tool count | 17 (see §8) |
| LOC (live code) | ~4,325 across 7 source files |
| LOC (dead code) | None — 1,322 LOC of unused `src/index.ts` removed in v3 M1 (commit `0c369eb`) |

### v1 acceptance state

| Original criterion (ATF-435) | Status |
|---|---|
| MCP server connects to Lever APIs | ✅ shipped |
| Candidate and opportunity tools | ✅ shipped (17 tools) |
| Authentication flow working | ✅ shipped (OAuth 2.1 + Auth0) |
| Documentation complete | ✅ shipped — README + repo CLAUDE.md rewritten in v3 M2 to describe Express + Cloud Run + Auth0 architecture |
| Webhook support for real-time updates | ❌ not shipped (deferred to v3 M6 as registration-only; ingestion sink stays out of scope) |

## 3. Architecture

### Request flow (current, single-tenant)

```
┌──────────┐                                         ┌──────────┐
│  Claude  │  1. MCP request (no token)              │ Lever MCP│
│  client  │ ──────────────────────────────────────► │  Server  │
└──────────┘                                         └────┬─────┘
     ▲                                                    │
     │                                          2. 401 + WWW-Authenticate
     │                                                    │
     │     3. OAuth 2.1 discovery + auth flow             ▼
     │   ┌──────────────────────────────────┐
     ├──►│  Auth0 (OAuth 2.1 AS)            │
     │   │  + Google Workspace IdP          │
     │   │  + @samba.tv domain restriction  │
     │   └──────────────────────────────────┘
     │                                                    
     │     4. MCP request with Bearer token               
     └────────────────────────────────────────────────────►
                                                          │
                                          5. Validate JWT (audience, iss, exp, signature via JWKS)
                                                          │
                                          6. Tool invocation (zod-validated args)
                                                          │
                                                          ▼
                                          7. Lever REST call (api.lever.co/v1)
                                                          │
                                                          ▼
                                          8. Format response, return to Claude
```

### Source tree (v1 — pre-refactor)

```
src/
├── server.ts                 # Cloud Run entry, Express setup, MCP transport wiring (237 LOC)
│                              # (index.ts deleted in v3 M1 — was 1,322 LOC of unused, never-imported code)
├── tools.ts                  # registerAllTools — registers 7 tools inline + dispatches to others (425 LOC)
├── additional-tools.ts       # 8 more tool registrations + formatter helpers (997 LOC, split in v3 M3a)
├── interview-tools.ts        # 2 interview-specific tool registrations (480 LOC)
├── lever/
│   └── client.ts             # LeverClient — REST wrapper, rate limit, pagination (744 LOC, split in v3 M3a)
├── auth/
│   ├── middleware.ts         # JWT validation, OAUTH_ENABLED toggle, Cloud Run IAM fallback (120 LOC)
│   ├── metadata.ts           # OAuth 2.0 Protected Resource Metadata endpoint
│   ├── constants.ts
│   ├── types.ts
│   └── index.ts
├── types/
│   └── lever.ts              # Lever API response types
└── utils/
    └── stage-helpers.ts
```

### Source tree (v3 target — post-refactor)

```
src/
├── server.ts                 # unchanged
├── tools/
│   ├── index.ts              # registerAllTools, dispatches to groups
│   ├── search.ts             # advanced_search, search_candidates, search_archived, find_postings_by_owner
│   ├── candidates.ts         # get_candidate, update_candidate, add_note, archive_candidate
│   ├── applications.ts       # list_applications, list_files
│   ├── interviews.ts         # manage_interview, get_interview_insights
│   ├── requisitions.ts       # list_requisitions, get_requisition_details
│   ├── reference.ts          # list_open_roles, get_stages, get_archive_reasons, get_users (new)
│   ├── feedback.ts           # NEW — 5 tools per v3 M5
│   └── webhooks.ts           # NEW — 3 tools per v3 M6
├── lever/
│   ├── client.ts             # core HTTP, < 400 LOC
│   ├── client-pagination.ts  # pagination helpers
│   ├── client-ratelimit.ts   # rate-limit singleton (token bucket)
│   └── client-write.ts       # write-request shim, attaches perform_as
├── auth/
│   ├── middleware.ts         # token validation + JWKS cache (jose.createRemoteJWKSet)
│   ├── perform-as-resolver.ts  # NEW — email → Lever user lookup with TTL cache
│   ├── metadata.ts
│   ├── constants.ts
│   ├── types.ts
│   └── index.ts
├── types/lever.ts            # unchanged
└── utils/stage-helpers.ts    # unchanged
```

Discipline: **no file > 400 LOC** post-M3a. Splits driven by domain, not arbitrary line counts.

## 4. Auth model

### v1 (current, single-tenant)

OAuth 2.1 + Auth0 is wired into `src/auth/middleware.ts` but is env-toggle-able via `OAUTH_ENABLED`. When `OAUTH_ENABLED=false`, the server falls back to Cloud Run IAM gating (Google service-account auth at the infrastructure layer). The Auth0 path validates JWTs against the Auth0 JWKS, checks `aud` and `iss` claims, and lets the request through if valid. Writes attach a hardcoded `LEVER_DEFAULT_USER_ID` env var as `perform_as`.

This works for single-user (Sid) but does not scale to multi-user. Anyone who passes the Auth0 gate writes to Lever as Sid, breaking audit attribution.

### v3 (target, multi-tenant) — Google OAuth broker

The server acts as its **own** OAuth 2.1 Authorization Server, brokering Google Workspace sign-in directly. **No Auth0 in the login path.** This mirrors the MSCI MCP, which runs this exact pattern in production (`src/mcp_server/core/auth/oauth_broker.py` in that repo) — a proven design in Samba's environment.

The auth chain:

```
1. Claude (MCP client)
   ├── Discovers this server IS the Authorization Server
   │   (GET /.well-known/oauth-authorization-server → our URL)
   ├── Self-registers via Dynamic Client Registration (POST /register)
   └── Sends OAuth 2.1 + PKCE S256 authorization request to OUR /authorize

2. Lever MCP Server (acting as Authorization Server)
   ├── /authorize → stashes the MCP request, redirects the user agent to Google
   │   (accounts.google.com/o/oauth2/v2/auth, scope=openid email profile,
   │    hd=samba.tv, prompt=select_account)
   │
   ├── /oauth/google/callback ← Google redirects back with a code
   │   ├── Exchanges code → Google ID token (server-side, with client_secret)
   │   ├── Validates ID token: RS256 sig via Google JWKS, iss ∈ accounts.google.com,
   │   │   aud == our Google client_id, exp/iat present
   │   ├── Enforces hd == samba.tv  (reject otherwise — domain gate)
   │   ├── Extracts email claim
   │   └── Mints an opaque MCP auth code ↔ email, redirects back to Claude
   │
   └── /token → exchanges the MCP code for an opaque Bearer access token (1h TTL)
       mapped server-side to the validated email

3. Per /mcp request
   ├── Validates the opaque Bearer token → resolves the user's email
   ├── Calls perform-as-resolver.resolve(email)
   │   ├── Cache hit (1h TTL) → return cached Lever user ID
   │   └── Cache miss → GET api.lever.co/v1/users?email={email}&perform_as=<bootstrap-id>
   ├── If Lever user found: attach as perform_as on writes
   ├── If Lever user NOT found AND OAUTH_ENABLED=true: FAIL LOUD
   │   ("Your Lever account is not provisioned. Contact Talent team.")
   └── If OAUTH_ENABLED=false (cron jobs, internal callers): fall back to LEVER_DEFAULT_USER_ID
```

Tokens and DCR registrations are held in-memory per Cloud Run instance (same as MSCI). A scale-out or restart drops active sessions; affected clients re-run the OAuth flow (one click in Claude). Acceptable for an internal team server; move to Firestore/Redis only if multi-instance session continuity becomes a hard requirement.

**Critical invariant.** `LEVER_DEFAULT_USER_ID` is NEVER used as the fallback for authenticated requests. Authenticated-but-unmatched MUST fail loud. Otherwise, a new hire who hasn't been provisioned in Lever yet would have writes attributed to Sid — an attribution bug AND a compliance issue.

### Google OAuth client setup (self-serve — no IT ticket)

The only provisioning step is a **Google OAuth 2.0 Web Client**, created in the GCP project the service already runs in (`ai-workflows-459123`, owned by Sid). No Auth0, no IT dependency. See [`docs/google-oauth-setup.md`](./docs/google-oauth-setup.md) for the click-path.

| Setting | Value |
|---|---|
| Credential type | OAuth 2.0 Client ID — **Web application** |
| GCP project | `ai-workflows-459123` |
| OAuth consent screen | **Internal** (auto-restricts to the samba.tv Workspace org) |
| Authorized redirect URI | `https://lever-mcp-201626763325.us-central1.run.app/oauth/google/callback` |
| Scopes requested | `openid email profile` |
| Domain gate | `hd=samba.tv` on the auth request + `hd` claim check on the returned ID token (defense in depth) |

The resulting **client_id** + **client_secret** go into GCP Secret Manager and are injected as `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET`. The server also needs `MCP_PUBLIC_URL` (its own public origin) and `ALLOWED_HOSTED_DOMAIN=samba.tv`.

Because the consent screen is Internal and the broker re-checks `hd`, only @samba.tv Google accounts can complete the flow. RFC 8707 / RFC 9207 tenant toggles are **not relevant** here — the server is its own AS and controls the protocol surface directly (this is precisely why the broker pattern avoids the Auth0 fragility).

### Auth alternatives evaluated and rejected

- **Delegate directly to Auth0 (`auth.samba.tv`) as the AS** — the original v3 plan. Requires registering a Lever API + audience in the Auth0 tenant and flipping two off-by-default toggles (RFC 8707 Resource Parameter Profile, RFC 9207 `iss` param); Claude must DCR directly against Auth0. Fragile (silent failure if a toggle is wrong) and IT-gated. Rejected in favor of the Google broker after the MSCI MCP proved the broker pattern works with zero Auth0 in the login path. *(Auth0 remains the right tool for machine-to-machine calls to downstream Samba APIs — that is a separate concern from MCP user login.)*
- **Identity-aware access proxies (pre-registration only)** — gateways lacking Dynamic Client Registration only work if the MCP client roster is a known finite set. Rejected for the DCR gap.

## 5. MCP protocol compliance

| Spec requirement | v1 status | v3 target |
|---|---|---|
| MCP-Protocol-Version | `2025-06-18` | `2025-11-25` |
| MCP SDK | 1.25.0 | 1.29.x (minor bump, semver-safe) |
| OAuth 2.0 Protected Resource Metadata (RFC 9728) | Implemented in `src/auth/metadata.ts` | Verified in v3 M1.5 audit |
| Token audience binding (RFC 8707) | Validated in middleware | Re-verified for new resource URL |
| PKCE S256 (hard MUST per 2025-11-25) | n/a (delegation path) | Enforced by our `/authorize` + token handler in the broker (M0b) |
| `iss` parameter validation (RFC 9207) | Not enforced server-side | Server is its own AS — `iss` is our own `MCP_PUBLIC_URL`; validated in M0b |
| WWW-Authenticate header on 401 with `resource_metadata` | Implemented | Re-verified |
| Client ID Metadata Documents support | Not implemented | Broker serves DCR (`/register`) directly — CIMD not needed |
| Step-up authorization flow (insufficient_scope) | Not implemented | Out of scope for v3 unless usage demands it |

The v1 → v3 protocol bump is a minor revision within the 2025 series; no breaking changes to the JSON-RPC envelope or core capability negotiation. The compliance audit (M1.5) walks through the deltas line by line, asserts conformance, then bumps the header.

## 6. Lever API integration

### Endpoints used

| Capability | Endpoint | Auth | Notes |
|---|---|---|---|
| Search opportunities | `GET /v1/opportunities` | API key + `perform_as` | Paginated, cursor-based |
| Read opportunity | `GET /v1/opportunities/:id` | API key | `expand=owner` to get recruiter name |
| Update candidate | `PUT /v1/opportunities/:id` | API key + `perform_as` | Write — required `perform_as` |
| Add note | `POST /v1/opportunities/:id/notes` | API key + `perform_as` | Write |
| Submit feedback | `POST /v1/opportunities/:id/feedback` | API key + `perform_as` | Write, v3 M5 |
| Update feedback | `PUT /v1/opportunities/:id/feedback/:fb` | API key + `perform_as` | Write, v3 M5 |
| List feedback templates | `GET /v1/feedback_templates` | API key | Read, v3 M5 prerequisite |
| List users | `GET /v1/users` | API key | Read, v3 M1 (port from WIP) |
| Register webhook | `POST /v1/webhooks` | API key + `perform_as` | Write, v3 M6 |
| Stages | `GET /v1/stages` | API key | Reference data |

### `perform_as` is required on every write

Confirmed via live API probe 2026-05-22. Every POST/PUT in Lever v1 requires a `perform_as=<user-uuid>` query param. Without it, the API returns 400 "missing perform_as." This is the foundational constraint driving the multi-tenant resolver design in §4.

### Rate limiting

Lever v1 rate-limits at ~10 req/sec per API key. The client implements a token bucket (`src/lever/client.ts`, refactored into `src/lever/client-ratelimit.ts` in v3 M3a as a singleton). Critical invariant in the v3 file split: the token bucket MUST be shared across all split tool files. Each file constructing its own limiter would 4x the effective rate and produce 429 storms.

## 7. Deployment model

### Service topology

- **One Cloud Run service:** `lever-mcp` in project `<project>`, region `us-central1`.
- **One revision per deploy.** Atomic traffic split via `gcloud run services update-traffic`.
- **Env vars** held in Cloud Run service config:
  - `LEVER_API_KEY` (rotated post-refactor in M7)
  - `LEVER_DEFAULT_USER_ID` (fallback for non-authenticated paths only)
  - `OAUTH_ENABLED` = `true`
  - `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` (from the self-serve Google OAuth Web client — secrets in Secret Manager)
  - `MCP_PUBLIC_URL` = `https://lever-mcp-201626763325.us-central1.run.app` (token issuer + callback origin)
  - `ALLOWED_HOSTED_DOMAIN` = `samba.tv`
- **Build:** `Dockerfile` + `cloudbuild.yaml` both present today, partially redundant. Reconciled in v3 M2.6.

### MCP session state

The server keeps in-memory `transports` map keyed by session ID. **Session state is per-container memory.** Cloud Run revision swap drops active MCP sessions; clients reconnect transparently on the next request (negligible UX impact for single-shot tool calls, brief failure window for long-running streams).

This is acceptable for v3 single-region single-revision deploy. If multi-user use grows, persist `transports` to Redis or Firestore — tracked as out-of-scope follow-up.

### Rollback

Per deploy: `gcloud run services update-traffic lever-mcp --to-revisions=<previous>=100 --region=us-central1`. Flips traffic back in seconds.

Repo-level rollback tag: `pre-refactor-2026-05-22` (created in v3 M0a before any milestone touches code).

## 8. Tool surface (v1 → v3)

### v1 (17 tools, all live)

Search & discovery (5): `lever_advanced_search`, `lever_search_candidates`, `lever_search_archived_candidates`, `lever_find_postings_by_owner`, `lever_list_open_roles`

Candidate management (4): `lever_get_candidate`, `lever_update_candidate`, `lever_add_note`, `lever_archive_candidate`

Application / files (2): `lever_list_applications`, `lever_list_files`

Interview (2): `lever_manage_interview`, `lever_get_interview_insights`

Requisitions (2): `lever_list_requisitions`, `lever_get_requisition_details`

Reference data (2): `lever_get_stages`, `lever_get_archive_reasons`

### v3 additions (10 tools across M1, M5, M6)

Reference / users (1 — v3 M1): `lever_get_users` (finishes Feb 2026 WIP — client methods already implemented, tool registration pending port from dead `index.ts` to live `tools/reference.ts`)

Feedback (5 — v3 M5): `lever_list_feedback_templates`, `lever_get_feedback`, `lever_list_feedback`, `lever_submit_feedback`, `lever_update_feedback`. Headline value-add — lets Claude submit interview feedback end-to-end without Lever UI.

Webhooks (3 — v3 M6): `lever_list_webhooks`, `lever_register_webhook`, `lever_delete_webhook`. Sid points Lever events at any inbound URL he has (briefing pipeline, Zapier inbound, future sink) without building the ingestion service.

Optional (3 — v3 M8, conditional on M5 landing smoothly): `lever_move_to_stage`, `lever_advance_with_feedback` (composite), `lever_get_user`.

**Post-v3 total: 27 tools** (17 + 10).

## 9. v3 refactor scope (ATF-476)

Full vertical-slice breakdown lives in ATF-476's Stories. Summary:

| Milestone | Goal | Effort |
|---|---|---|
| M0a | Pre-flight local — WIP triage, fixtures, log analysis, rollback tag | 1.5-2h |
| M0b | Google OAuth broker port (self-AS, federate to Google, `hd=samba.tv`) — broker + verifier + `/oauth/google/callback` route + `mcpAuthRouter` wiring. Mirrors MSCI's `oauth_broker.py`. Self-serve Google OAuth client (no IT). | 4-6h |
| M1 | Dead-code purge + SDK 1.25→1.29 + port `lever_get_users` WIP to live path | 1.5h |
| M1.5 | MCP protocol 2025-06-18 → 2025-11-25 compliance audit | 2-3h |
| M2 | Repo docs reality-check (README + CLAUDE.md + new ARCHITECTURE.md) | 1h |
| M2.5 | GitHub Actions CI (type-check + test + lint) | 1h |
| M2.6 | Deploy automation (reconcile Dockerfile + cloudbuild.yaml) | 1.5h |
| M3a | File split — `tools/{...}.ts` + `lever/{client-pagination,client-ratelimit}.ts`, no auth wiring | 3-4h |
| M3b | `perform_as` resolver fed by the broker's validated email + multi-tenant edge cases | 3-4h |
| M4 | Test coverage for top-N tools + broker/verifier path tests | 5-7h |
| M5 | 5 feedback tools + observability (structured logging, latency histogram, error alerting) | 5-7h |
| M6 | 3 webhook registration tools | 2-3h |
| M7 | API key rotation + chat-leaked key invalidated | 1h |
| M8 (optional) | Stage management + user tool polish | 2-3h |

**Total: ~28-36h focused.** No external IT lead time — M0b is self-serve (Google OAuth client in a project Sid owns), so wall-clock is bounded by build time, not a ticket queue.

## 10. Tigers (premortem risks + mitigations)

1. **Multi-tenant attribution bug.** Auth ok, Lever user missing → if fallback fires, writes attributed to Sid. **Mitigation:** fallback to env default ONLY when `OAUTH_ENABLED=false`. Authenticated-but-unmatched MUST fail loud.

2. **Protocol bump session re-handshake.** Live Claude.ai connector sessions handshake on 2025-06-18; bumping may force re-auth on all live sessions on first deploy. **Mitigation:** verify backward compatibility in M1.5; schedule deploy during low-use.

3. **Auth failure surfaces.** Google OAuth client misconfig (wrong redirect URI), consent-screen not Internal, or `hd` check drift each lock users out. **Mitigation:** M0b smoke test includes a deliberate non-@samba.tv reject case + documented recovery path in this doc. Failure surface is smaller than the Auth0 path (one Google client we own, no tenant toggles).

4. **In-memory session loss on scale-out.** Broker holds tokens/DCR registrations per Cloud Run instance; a scale-out or restart drops sessions. **Mitigation:** acceptable for an internal team server (re-auth is one click); document the Firestore/Redis upgrade path if multi-instance continuity is later required. Same trade-off MSCI accepts.

5. **Rate-limit state coordination post-file-split.** Each split file must share the singleton token bucket. **Mitigation:** `lever/client-ratelimit.ts` exports a module-level singleton; all split files import it.

6. **JWKS cache strategy.** Hitting Google's JWKS (`https://www.googleapis.com/oauth2/v3/certs`) per callback would add latency. **Mitigation:** cache keys via `jose.createRemoteJWKSet` (or equivalent) with cooldown; ID-token validation happens only at `/oauth/google/callback`, not on every `/mcp` request (those use the opaque token).

## 11. Out of scope (named so they aren't forgotten)

- **Webhook ingestion sink.** v3 M6 ships registration only (3 tools). If a real consumer materializes (briefing pipeline reacts to `candidateHired`, Beru side-effect on `interviewCreated`, etc.), spin up a separate Epic.
- **MCP session persistence across Cloud Run revision swaps.** Current `transports` map is per-container memory. Move to Redis/Firestore only if multi-user use grows real.
- **Repo migration from personal `the-sid-dani/lever-mcp-server` → Samba org.** Tracked as a separate housekeeping project, doesn't block v3.
- **Observability beyond M5's structured logging baseline.** Cloud Monitoring dashboard, error-rate SLO alerting, p95 latency tracking against thresholds — separate future project once write-tool usage stabilizes.

## 12. Operational runbook

### Health check

```bash
curl https://lever-mcp-201626763325.us-central1.run.app/health
```

Expected: `200 OK`, JSON body with `lever_api_reachable`, `auth0_jwks_reachable`, `deployed_git_sha`, `perform_as_cache_size`.

### Tail logs

```bash
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="lever-mcp"' --limit 100 --freshness 1h --format json
```

### Rollback to previous revision

```bash
gcloud run revisions list --service lever-mcp --region us-central1
gcloud run services update-traffic lever-mcp --to-revisions=<previous-revision>=100 --region=us-central1
```

### Auth chain failure recovery

If a Samba employee reports "MCP can't connect" or "401 from Lever MCP":

1. Confirm their @samba.tv account is active in Google Workspace.
2. Check Cloud Run logs for the broker's callback handler — filter by email.
3. If the broker rejected at `/oauth/google/callback`: `hd` mismatch (non-@samba.tv) or Google ID-token validation failed. The log line names the reason.
4. If sign-in succeeded but a tool returns 401: the opaque access token expired (1h TTL) or the instance scaled out and dropped it — have them re-run the connector sign-in (one click).
5. If token valid but tool returns "your Lever account is not provisioned": their email is not registered in Lever. Talent team needs to provision them.

### Lever API key rotation

```bash
gcloud run services update lever-mcp \
  --update-env-vars LEVER_API_KEY=<new-key>,LEVER_DEFAULT_USER_ID=<sid-uuid> \
  --region us-central1
```

Atomic rolling deploy. Active MCP sessions reconnect transparently. Mid-flight tool calls may see one error and recover. Schedule rotations during low-use windows.

## 13. Decision log

| Date | Decision | Rationale |
|---|---|---|
| 2026-05-22 | Refactor v3 scoped (ATF-476), not rebuild | SDK + OAuth wiring + 16 working tools are non-trivial; tech debt is mechanical, not architectural |
| 2026-05-28 | **Auth: server-as-its-own-AS broker federating to Google directly** (supersedes the 2026-05-26 Auth0 decision) | The MSCI MCP proves this pattern in prod with zero Auth0 in the login path. Removes the IT dependency (Google OAuth client is self-serve in `ai-workflows-459123`, which Sid owns) and the fragile RFC 8707/9207 Auth0 tenant toggles that made the delegation path fail. Broker serves DCR + PKCE directly. |
| 2026-05-26 | ~~Keep Auth0 as the OAuth 2.1 AS for v3~~ — **superseded 2026-05-28** | (Original rationale: MCP spec needs RFC 8707 + DCR, Google OAuth lacks both. Superseded: the broker supplies RFC 8707 + DCR itself, so Google-direct federation is sufficient.) |
| 2026-05-26 | Multi-tenant `perform_as` via authenticated email → Lever user lookup | Single-user default attribution is a compliance bug; resolve identity from token claims |
| 2026-05-26 | `LEVER_DEFAULT_USER_ID` is server-side fallback ONLY (not for authenticated paths) | Otherwise unmatched authenticated users get writes attributed to default — attribution + audit failure |
| 2026-05-26 | Webhook ingestion sink stays out of scope; only registration tools ship in v3 | Sink requires a real consumer use case; registration is a 3-tool half-day add usable with any existing inbound URL |

---

**This document is the canonical system design for `lever-mcp-server`.** When the code or scope changes, update this file in the same commit. Predecessor source-of-truth was the in-repo README + CLAUDE.md, both stale; they get rewritten in v3 M2 to reference this doc as the architecture spec.
