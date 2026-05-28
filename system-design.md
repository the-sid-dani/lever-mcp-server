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

**Where it sits in the stack.** Behind an OAuth 2.1 Authorization Server (Auth0, targeted v3) which federates to Google Workspace SSO restricted to `@samba.tv`. The server itself is an OAuth 2.1 Resource Server — it validates inbound bearer tokens, derives the calling user's identity from token claims, looks up their Lever user record, and attaches the resolved user ID as the `perform_as` parameter on outbound Lever API writes.

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
| Auth (env-toggle) | OAuth 2.1 + Auth0; falls back to Cloud Run IAM when `OAUTH_ENABLED=false` |
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

### v3 (target, multi-tenant)

The auth chain:

```
1. Claude.ai (MCP client)
   └── Sends OAuth 2.1 authorization request to Auth0
      (with PKCE S256, resource=https://lever-mcp-201626763325.us-central1.run.app)

2. Auth0
   ├── Routes login to Google Workspace Enterprise Connection
   │   (domain-restricted to samba.tv)
   ├── Post-Login Action (defense in depth): reject if email NOT @samba.tv
   └── Issues Bearer token (RS256), audience-bound to MCP server URL

3. Lever MCP Server
   ├── Validates token: signature via Auth0 JWKS, audience, issuer, expiry
   ├── Extracts email claim
   ├── Calls perform-as-resolver.resolve(email)
   │   ├── Cache hit (1h TTL) → return cached Lever user ID
   │   └── Cache miss → GET api.lever.co/v1/users?email={email}&perform_as=<bootstrap-id>
   ├── If Lever user found: attach as perform_as on writes
   ├── If Lever user NOT found AND OAUTH_ENABLED=true: FAIL LOUD
   │   ("Your Lever account is not provisioned. Contact Talent team.")
   └── If OAUTH_ENABLED=false (cron jobs, internal callers): fall back to LEVER_DEFAULT_USER_ID
```

**Critical invariant.** `LEVER_DEFAULT_USER_ID` is NEVER used as the fallback for authenticated requests. Authenticated-but-unmatched MUST fail loud. Otherwise, a new hire who hasn't been provisioned in Lever yet would have writes attributed to Sid — an attribution bug AND a compliance issue.

### Auth0 setup requirements (the IT ticket)

Per MCP spec 2025-11-25, the Auth0 tenant needs:

| Setting | Value |
|---|---|
| API Identifier (audience) | `https://lever-mcp-201626763325.us-central1.run.app` |
| Signing algorithm | RS256 |
| Token lifetime | 12 hours |
| Application type | Regular Web Application, public client (PKCE required) |
| Grant types | Authorization Code, Refresh Token |
| PKCE method | S256 (mandatory) |
| Dynamic Client Registration | **Enabled** (allows Claude.ai to self-register without manual setup) |
| Google Workspace Enterprise Connection | **Sole IdP**, domain-restricted to samba.tv |
| Database (username/password) connection | **Disabled** for this app |
| Post-Login Action | Reject non-@samba.tv (defense in depth) |
| Resource Parameter Compatibility Profile | **Enabled** (RFC 8707 — off by default in Auth0, required by MCP spec) |
| `authorization_response_iss_parameter_supported` | **`true`** (RFC 9207 — set via Management API, off by default) |
| Token claims | `email`, `email_verified`, `hd`, `name`, `sub` |

The last two toggles (Resource Parameter Compatibility Profile and `iss` parameter support) are **off by default in Auth0** and will silently break Claude's MCP client if not enabled. They're called out explicitly in the IT ticket because the failure mode is non-obvious.

### Auth alternatives evaluated and rejected

- **Raw Google OAuth without Auth0** — Google's OAuth doesn't support RFC 8707 resource indicators or Dynamic Client Registration, both required by MCP spec for Claude's connector flow. Domain restriction via `hd` is supported but doesn't fill the other gaps.
- **Identity-aware access proxies (pre-registration only)** — gateways that front the service with SSO can satisfy RFC 8707 and federate with Google, but those lacking Dynamic Client Registration (no `/register` endpoint) only work if the MCP client roster stabilizes to a known finite set. Rejected for the same DCR gap.
- **Self-hosted OAuth 2.1 server** — federates to Google as the IdP, server issues its own audience-bound tokens. ~1-2 days of code; loses to Auth0 on operational complexity (you own OAuth security forever).

## 5. MCP protocol compliance

| Spec requirement | v1 status | v3 target |
|---|---|---|
| MCP-Protocol-Version | `2025-06-18` | `2025-11-25` |
| MCP SDK | 1.25.0 | 1.29.x (minor bump, semver-safe) |
| OAuth 2.0 Protected Resource Metadata (RFC 9728) | Implemented in `src/auth/metadata.ts` | Verified in v3 M1.5 audit |
| Token audience binding (RFC 8707) | Validated in middleware | Re-verified for new resource URL |
| PKCE S256 (hard MUST per 2025-11-25) | Enforced by Auth0 Application config | Re-verified in M0b smoke test |
| `iss` parameter validation (RFC 9207) | Not enforced server-side | Added in v3 M3b |
| WWW-Authenticate header on 401 with `resource_metadata` | Implemented | Re-verified |
| Client ID Metadata Documents support | Not implemented | Evaluated in M1.5 — Auth0 supports DCR, may not need CIMD |
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
  - `AUTH0_DOMAIN`, `AUTH0_AUDIENCE`, `AUTH0_ISSUER` (set in M0b post-IT ticket)
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
| M0a | Pre-flight local — WIP triage, fixtures, log analysis, rollback tag, IT ticket filed | 1.5-2h |
| M0b | Auth0 IT gate — tenant + API + Application + Google connection + DCR + RFC 8707 + RFC 9207 toggles + creds delivered | IT-side |
| M1 | Dead-code purge + SDK 1.25→1.29 + port `lever_get_users` WIP to live path | 1.5h |
| M1.5 | MCP protocol 2025-06-18 → 2025-11-25 compliance audit | 2-3h |
| M2 | Repo docs reality-check (README + CLAUDE.md + new ARCHITECTURE.md) | 1h |
| M2.5 | GitHub Actions CI (type-check + test + lint) | 1h |
| M2.6 | Deploy automation (reconcile Dockerfile + cloudbuild.yaml) | 1.5h |
| M3a | File split — `tools/{...}.ts` + `lever/{client-pagination,client-ratelimit}.ts`, no auth wiring | 3-4h |
| M3b | `perform_as` resolver + Auth0 wiring + multi-tenant edge cases + JWKS caching | 3-4h |
| M4 | Test coverage for top-N tools + Auth0 verifier path tests | 5-7h |
| M5 | 5 feedback tools + observability (structured logging, latency histogram, error alerting) | 5-7h |
| M6 | 3 webhook registration tools | 2-3h |
| M7 | API key rotation + prod Auth0 cutover + chat-leaked key invalidated | 1h |
| M8 (optional) | Stage management + user tool polish | 2-3h |

**Total: 27-34h focused / 1-4 weeks wall-clock** depending on IT lead time for M0b.

## 10. Tigers (premortem risks + mitigations)

1. **Multi-tenant attribution bug.** Auth ok, Lever user missing → if fallback fires, writes attributed to Sid. **Mitigation:** fallback to env default ONLY when `OAUTH_ENABLED=false`. Authenticated-but-unmatched MUST fail loud.

2. **Protocol bump session re-handshake.** Live Claude.ai connector sessions handshake on 2025-06-18; bumping may force re-auth on all live sessions on first deploy. **Mitigation:** verify backward compatibility in M1.5; schedule deploy during low-use.

3. **Three independent auth failure surfaces.** Auth0 tenant misconfig, Google connection drift, Action rule misfire each silently lock the user out. **Mitigation:** M0b smoke test includes deliberate non-@samba.tv reject case + documented recovery path in this doc.

4. **IT ticket SLA risk.** Samba IT historically 2-4 weeks on Auth0 provisioning. M0b stalls = M3b/M5/M6/M7 stall. **Mitigation:** file ticket Day 0; if SLA slips beyond 2 weeks, spin up a dev-only Auth0 tenant for parallel M3b development against a throwaway tenant. Swap to prod tenant at M7 cutover.

5. **Rate-limit state coordination post-file-split.** Each split file must share the singleton token bucket. **Mitigation:** `lever/client-ratelimit.ts` exports a module-level singleton; all split files import it.

6. **JWKS cache strategy.** Hitting Auth0 JWKS per-request would rate-limit and add p95 latency. **Mitigation:** use `jose.createRemoteJWKSet` with cooldown.

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
2. Check Auth0 logs for the failing user — Application > Logs filter by email.
3. If Auth0 rejected: domain mismatch (non-@samba.tv) or Post-Login Action triggered. Confirm with Auth0 admin.
4. If Auth0 succeeded but Lever MCP returned 401: token validation failed server-side. Check Cloud Run logs for `aud`/`iss`/`exp` mismatch.
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
| 2026-05-26 | Keep Auth0 as the OAuth 2.1 AS for v3 | MCP spec requires audience binding (RFC 8707) + Dynamic Client Registration; Google OAuth lacks both |
| 2026-05-26 | Multi-tenant `perform_as` via authenticated email → Lever user lookup | Single-user default attribution is a compliance bug; resolve identity from token claims |
| 2026-05-26 | `LEVER_DEFAULT_USER_ID` is server-side fallback ONLY (not for authenticated paths) | Otherwise unmatched authenticated users get writes attributed to default — attribution + audit failure |
| 2026-05-26 | Webhook ingestion sink stays out of scope; only registration tools ship in v3 | Sink requires a real consumer use case; registration is a 3-tool half-day add usable with any existing inbound URL |

---

**This document is the canonical system design for `lever-mcp-server`.** When the code or scope changes, update this file in the same commit. Predecessor source-of-truth was the in-repo README + CLAUDE.md, both stale; they get rewritten in v3 M2 to reference this doc as the architecture spec.
