# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A remote MCP (Model Context Protocol) server that exposes the Lever ATS API as tools callable from Claude. Runs on **GCP Cloud Run** (us-central1). v3 target auth: the server is its **own OAuth 2.1 Authorization Server** brokering **Google Workspace** sign-in restricted to `@samba.tv` (no Auth0 in the login path — mirrors the MSCI MCP). See system-design.md §4.

**Canonical architecture spec:** [`system-design.md`](./system-design.md) — 13 sections covering current state, target architecture, multi-tenant auth model, MCP spec 2025-11-25 compliance, operational runbook, decision log. Read it first.

**Live URL:** `https://lever-mcp-201626763325.us-central1.run.app/mcp`

**Active refactor:** Jira Epic [ATF-476](https://sambatv.atlassian.net/browse/ATF-476). 14 Stories (ATF-477 through ATF-490) map to the milestones in system-design.md §9.

---

## Stack

| Component | Value |
|---|---|
| Language | TypeScript (Node.js 20+) |
| HTTP server | Express 4.21 |
| MCP SDK | `@modelcontextprotocol/sdk` 1.29 |
| MCP transport | Streamable HTTP |
| MCP-Protocol-Version | `2025-06-18` (target: `2025-11-25` per M1.5) |
| JWT validation | `jose` 6 |
| Schema validation | `zod` 3 |
| Test runner | Vitest 4 |
| Linter / formatter | Biome 2 |
| Deploy target | GCP Cloud Run, region us-central1 |
| Build | Dockerfile + Cloud Build (`cloudbuild.yaml`) |

---

## Development commands

```bash
# Install
npm install

# Local dev (tsx watch, port 8080)
npm run dev

# Type-check (no emit)
npm run type-check

# Tests (vitest run — full suite)
npm test

# Watch mode
npm run test:watch

# Lint + autofix (biome)
npm run lint:fix

# Format
npm run format

# Deploy (Cloud Build → Cloud Run)
npm run deploy
```

### Convention: ALWAYS run the full test suite

When making any code change, run `npm test` (full vitest suite), NOT scoped `npm test <path>` or `npm test --grep <name>`. Scoped runs miss regressions in adjacent code. Reference: prior agent reports confirmed this 3x during ATF buildout 2026-05-22.

### Eval gate (R5)

`npm run eval:schema` is a Layer-0 static contract check (all 17 tools registered, non-empty descriptions, valid schemas, golden-task tool names resolve). It needs no secrets and runs in ~1s. It is a HARD gate in GitHub Actions CI (runs right after `npm test`), so a contract regression blocks merge to main — and since deploy only happens manually off green main, it gates deploy. The recall false-negative regression (`src/__tests__/recall-regression.test.ts`) runs inside `npm test`. Full eval plan + deferred layers: `evals/README.md`.

### Convention: use `mcp__fastedit__fast_edit` for `.ts` files, not `Edit`

A project-level hook may block the `Edit` tool on `.ts` files. Use `mcp__fastedit__fast_edit` instead. If that fails (object literals, multi-statement insertions, files > 150 LOC), fall back to a Python heredoc via `Bash`:

```bash
python3 <<'PYEOF'
import pathlib
path = pathlib.Path("src/foo.ts")
text = path.read_text()
# ... mutate text ...
path.write_text(text)
PYEOF
```

Markdown, JSON, YAML, and config files are safe with `Edit`.

---

## Architecture

### Source tree

```
src/
├── server.ts                 # Cloud Run entry, Express setup, MCP transport wiring
├── tools.ts                  # registerAllTools — dispatch to additional + interview tools
├── additional-tools.ts       # 11 tool registrations including 5 consolidated action-enum tools (split into src/tools/ in v3 M3a)
├── interview-tools.ts        # 2 interview-specific tool registrations
├── lever/
│   └── client.ts             # LeverClient — REST wrapper, rate limit, pagination
├── auth/
│   ├── google-oauth-broker.ts # OAuthServerProvider — self-hosted AS, federates to Google (M0b)
│   ├── google-verifier.ts     # Google ID-token validation (RS256, iss, aud, hd==samba.tv)
│   ├── metadata.ts            # OAuth 2.0 Protected Resource Metadata endpoint
│   ├── constants.ts           # GOOGLE_OAUTH_* config + isOAuthEnabled()
│   └── index.ts
├── types/lever.ts            # Lever API response type definitions
└── utils/stage-helpers.ts
```

### Request flow

```
Claude (MCP client)
  └─treats Lever MCP as the OAuth 2.1 AS; DCRs via /register
       └─/authorize → Lever redirects to Google (hd=samba.tv)
            └─Google → /oauth/google/callback
                 - Validate Google ID token (RS256 via Google JWKS, iss, hd==samba.tv)
                 - Mint opaque MCP token ↔ email
       └─/token → opaque Bearer
  every /mcp request:
       - Validate opaque token → resolve email
       - Resolve email → Lever user ID (perform_as)
       - Forward to Lever REST API
```

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full diagram + auth-chain failure recovery procedures. The broker pattern is ported from the MSCI MCP (`src/mcp_server/core/auth/oauth_broker.py`).

### Auth model (single-tenant today, multi-tenant in v3 M3b)

- **`OAUTH_ENABLED=true`** (v3 target): the Google OAuth broker validates sign-in, reads the `email` claim, and (in v3 M3b+) resolves it to a Lever user ID for `perform_as`. No Auth0.
- **`OAUTH_ENABLED=false`** (local dev, cron jobs, internal callers): Cloud Run IAM gating at infrastructure layer. Server attaches `LEVER_DEFAULT_USER_ID` as `perform_as` on writes.

**Critical invariant (v3+):** `LEVER_DEFAULT_USER_ID` is NEVER used as a fallback for authenticated requests. Authenticated-but-unmatched MUST fail loud with "Your Lever account is not provisioned." Otherwise an unprovisioned user gets writes attributed to Sid (attribution + compliance bug).

---

## Live tool inventory (17 tools, post-consolidation)

**Same-resource clusters consolidated** into action-enum tools 2026-05-27 (commits `17951ea`...`71d999c`). Pattern: one tool per resource, `action` enum dispatches to the operation. Reduces schema-token overhead ~30-40% vs the prior 26-tool registry. See `continuum/research/code-mode-vs-many-tools/findings.md` for the analysis.

**Search & discovery (4):** `lever_advanced_search`, `lever_search_candidates`, `lever_find_postings_by_owner`, `lever_list_open_roles`

**Candidate management (2):** `lever_get_candidate`, `lever_update_candidate`

**Application / files / emails (3):** `lever_list_applications`, `lever_list_files`, `lever_list_emails`

**Interview (2):** `lever_manage_interview`, `lever_get_interview_insights`

**User lookup (1):** `lever_get_users`

**Notes (1) — consolidated 3→1:** `lever_notes` with `action: list | get | add`

**Feedback (1) — consolidated 4→1:** `lever_feedback` with `action: list_templates | list | get | submit`

**Archive (1) — consolidated 3→1:** `lever_archive` with `action: list_reasons | archive | search`

**Stages (1) — consolidated 2→1:** `lever_stages` with `action: list | history`

**Requisitions (1) — consolidated 2→1:** `lever_requisitions` with `action: list | get`

Tool registrations live in `src/tools.ts` (4), `src/additional-tools.ts` (11), and `src/interview-tools.ts` (2). The v3 M3a milestone splits these into domain-grouped files under `src/tools/`.

### Action-enum tool convention

For consolidated tools above, the schema follows this shape:

```typescript
{
  action: z.enum([...]).describe("Operation to perform. <per-action one-liner>"),
  // shared params (e.g. opportunity_id) — optional at schema level, required at runtime per action
  // action-specific params — optional, runtime-validated in the handler's switch case
}
```

Handler dispatches with `switch (args.action)`. Each case calls the matching `LeverClient` method, throws an explicit `Error` for missing required params, and returns the same shape the pre-consolidation tool returned (response shapes preserved verbatim — they are downstream contract). The Zod enum gates invalid action strings before the handler runs; the default case in the switch is defense-in-depth.

---

## Lever API integration

### `perform_as` is required on every write

Every POST/PUT in Lever v1 API requires `perform_as=<user-uuid>` as a query param or body field. Without it, returns `400 BadRequestError: Missing required parameter: perform_as`. Probe-verified 2026-05-22.

Routing for writes (v3 M3b+):
1. Authenticated request → resolver maps `email` claim → Lever user ID → attach as `perform_as`
2. Unauthenticated context (cron, internal) → attach `LEVER_DEFAULT_USER_ID` (env)
3. Resolver returns null AND auth enabled → throw `PerformAsUnresolvedError`

### Rate limiting

Lever v1 rate-limits at ~10 req/sec per API key. The client (`src/lever/client.ts`) implements a token bucket. **Critical invariant in v3 M3a file split:** the token bucket MUST be a singleton imported by all callers. Module-local state per file = 4x effective rate = 429 storms.

### Endpoints used

See [system-design.md §6](./system-design.md#lever-api-integration) for the full table.

---

## Adding a new tool

1. **Identify the right home:** which existing tool file groups by domain match? (After v3 M3a: `src/tools/{search,candidates,applications,interviews,requisitions,reference,feedback,webhooks}.ts`.)
2. **Add the client method first** in `src/lever/client.ts` (or a future `src/lever/client-write.ts` for writes). Implement pagination + rate-limit-aware retry.
3. **Register the tool** with `server.tool(name, zodSchema, async (args) => {...})`. Use the pattern in `additional-tools.ts`.
4. **For writes:** route through the write helper that attaches `perform_as`. Do NOT call `this.client.makeRequest("POST", ...)` directly.
5. **Add fixtures:** capture a real probe response (PII-scrubbed) into `test-fixtures/lever-api/responses/` OR write a synthetic fixture matching the documented Lever shape.
6. **Add a vitest test** in `src/__tests__/` mocking `LeverClient`. Cover happy path + 2-3 error paths.
7. **Run `npm test` (full suite)** + `npm run type-check`. Must pass.

---

## Testing

```bash
npm test         # vitest run (full suite, exits on first failure)
npm run test:watch
```

Current tests: `src/auth/__tests__/google-verifier.test.ts` + `google-oauth-broker.test.ts` (31 tests — the Google OAuth broker + verifier; the old Auth0 middleware tests were removed in M0b). Tool-level tests land in v3 M4 — fixtures already captured in `test-fixtures/lever-api/`.

### End-to-end tool smoke harness

`scripts/smoke-all-tools.mjs` drives all 17 tools over the real Streamable HTTP transport and prints a pass/fail table. **Read-only by default** — write/mutating tools are skipped unless `SMOKE_WRITES=1`.

```bash
# Terminal 1 — boot a dev server (reads LEVER_API_KEY from env):
set -a && source ~/.second-brain-os.env && set +a
PORT=8095 LEVER_DEFAULT_USER_ID=<your-lever-uuid> OAUTH_ENABLED=false npm run dev

# Terminal 2 — run the harness:
MCP_URL=http://localhost:8095/mcp node scripts/smoke-all-tools.mjs
```

Env knobs: `SMOKE_OPP_ID` (seed a known opportunity UUID for id-dependent reads instead of scraping one from search), `SMOKE_WRITES=1` (also run write tools). Exit code 0 = all non-skipped tools passed.

---

## Deployment

### Production

```bash
npm run deploy
# → gcloud builds submit --config cloudbuild.yaml
# → builds Docker image
# → deploys new Cloud Run revision
# → atomic traffic split to new revision
```

Env vars are set via Cloud Run service config (NOT in `.env` files in production):

- `LEVER_API_KEY` — Lever admin > Integrations & API. Rotated in v3 M7.
- `LEVER_DEFAULT_USER_ID` — Sid's Lever user UUID. Fallback only (see auth model above).
- `OAUTH_ENABLED=true`
- `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` — self-serve Google OAuth Web client (see [`docs/google-oauth-setup.md`](./docs/google-oauth-setup.md)).
- `MCP_PUBLIC_URL` = the service's public URL; `ALLOWED_HOSTED_DOMAIN=samba.tv`.

### Rollback

```bash
gcloud run revisions list --service lever-mcp --region us-central1
gcloud run services update-traffic lever-mcp \
  --to-revisions=<previous-revision>=100 \
  --region us-central1
```

Pre-refactor tag `pre-refactor-2026-05-22` available as the absolute fallback.

---

## v3 refactor in progress

The 14-milestone v3 refactor is tracked at [ATF-476](https://sambatv.atlassian.net/browse/ATF-476). Working branch: `refactor/v3`.

| Milestone | Status | Story |
|---|---|---|
| M0a — Pre-flight | ✅ Complete | [ATF-477](https://sambatv.atlassian.net/browse/ATF-477) |
| M0b — Google OAuth broker port (self-serve, no IT) | ⏳ Pending build | [ATF-478](https://sambatv.atlassian.net/browse/ATF-478) |
| M1 — Dead code + SDK bump + lever_get_users | ✅ Complete | [ATF-479](https://sambatv.atlassian.net/browse/ATF-479) |
| M1.5 — MCP protocol 2025-11-25 audit | ⏳ Pending | [ATF-480](https://sambatv.atlassian.net/browse/ATF-480) |
| M2 — Docs reality-check | ✅ Complete | [ATF-481](https://sambatv.atlassian.net/browse/ATF-481) |
| M2.5 — GitHub Actions CI | ✅ Complete (hard-gate type-check + test; lint/format soft until M3a) | [ATF-482](https://sambatv.atlassian.net/browse/ATF-482) |
| M2.6 — Deploy automation | ⏳ Pending | [ATF-483](https://sambatv.atlassian.net/browse/ATF-483) |
| M3a — File split | ⏳ Pending | [ATF-484](https://sambatv.atlassian.net/browse/ATF-484) |
| M3b — perform_as resolver (fed by broker email) | ⏳ Blocked on M0b | [ATF-485](https://sambatv.atlassian.net/browse/ATF-485) |
| M4 — Test coverage | ⏳ Pending | [ATF-486](https://sambatv.atlassian.net/browse/ATF-486) |
| M5 — 5 feedback tools | ⏳ Blocked on M3b | [ATF-487](https://sambatv.atlassian.net/browse/ATF-487) |
| M6 — 3 webhook tools | ⏳ Blocked on M3b | [ATF-488](https://sambatv.atlassian.net/browse/ATF-488) |
| M7 — Prod cutover + key rotation | ⏳ Blocked on M5/M6/M0b | [ATF-489](https://sambatv.atlassian.net/browse/ATF-489) |
| M8 (optional) — Stage + user polish | ⏳ Pending | [ATF-490](https://sambatv.atlassian.net/browse/ATF-490) |

---

## Conventions

- **Branch:** active work on `refactor/v3`, PRs against `main`.
- **Commits:** one assertion per commit. Commit messages reference the relevant Story (e.g., `Refs: ATF-479 (M1)`).
- **Tests must pass before commit** (`npm test` + `npm run type-check`).
- **Deploy is separate from commit** — pushing to main does NOT auto-deploy. Manual `npm run deploy` until v3 M2.6 lands deploy automation.
- **No emojis in code comments, commit messages, or docs.** Tables and bullets only.
- **`perform_as` is non-negotiable on writes.** Every write tool routes through the helper. No direct `client.makeRequest("POST", ...)` calls outside the helper.

---

## Known limitations

1. **Single-tenant `perform_as` until v3 M3b.** Writes attribute to `LEVER_DEFAULT_USER_ID` (Sid). Multi-tenant resolver lands in M3b.
2. **MCP session state per-container memory.** Cloud Run revision swaps drop active MCP sessions; clients reconnect on next request.
3. **No webhook ingestion sink.** v3 M6 ships registration only (3 tools). Inbound webhook persistence is a separate future project.
4. **GitHub Actions CI is active.** Type-check and tests are hard gates; lint/format are report-only until M3a cleanup.
5. **MCP-Protocol-Version pinned at `2025-06-18`.** v3 M1.5 bumps to `2025-11-25` after compliance audit.

---

## When you're confused

1. Read [`system-design.md`](./system-design.md) — canonical architecture spec.
2. Read [`ARCHITECTURE.md`](./ARCHITECTURE.md) — request flow + failure recovery.
3. Check the [Confluence hub](https://sambatv.atlassian.net/wiki/spaces/ATF/pages/14838136852) for stakeholder context.
4. Check the relevant Jira Story under [ATF-476](https://sambatv.atlassian.net/browse/ATF-476) for scope + acceptance criteria.
5. The `/sse` endpoint in `src/server.ts` is a deliberate 410-Gone deprecation marker for the superseded MCP SSE transport (clients should use `/mcp` Streamable HTTP), not debris (remove ~Aug 2026).
