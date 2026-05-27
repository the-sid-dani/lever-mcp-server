# Lever MCP Server

A remote [Model Context Protocol](https://modelcontextprotocol.io/) server exposing the Lever ATS API as tools callable from Claude. Built on **Express + GCP Cloud Run** with **OAuth 2.1 via Auth0** federating to Google Workspace SSO restricted to `@samba.tv`.

> **Canonical architecture spec:** [`system-design.md`](./system-design.md) (404 lines, 13 sections — current state, target architecture, multi-tenant auth model, MCP spec 2025-11-25 compliance, operational runbook, decision log).
>
> **Refactor tracking:** [ATF-476](https://sambatv.atlassian.net/browse/ATF-476) on Jira · [Confluence hub](https://sambatv.atlassian.net/wiki/spaces/ATF/pages/14838136852).

---

## What this is

When a Samba employee asks Claude to "check the candidate status for X" or "submit my interview feedback for Y," Claude calls this MCP server. The server validates the user's OAuth token, resolves their authenticated email to a Lever user record (multi-tenant `perform_as` model — see system-design.md §4), and forwards the request to the Lever REST API with proper audit attribution.

> **Status (as of 2026-05-27):** Single-tenant mode. All write operations attribute to `LEVER_DEFAULT_USER_ID` (Sid). Per-user `perform_as` resolution lands in [M3b](./CLAUDE.md#v3-refactor-in-progress) — JWT validation and email logging are live today, but the email→Lever user ID resolver is not yet wired. Read operations are unaffected.

**Live endpoint:** `https://lever-mcp-201626763325.us-central1.run.app/mcp`

**Tool count:** 17 live tools across search, candidate management, applications/files, interviews, requisitions, reference data, user lookup, and 5 action-enum tools (notes, feedback, archive, stages, requisitions). See [Tools](#tools) below.

---

## Architecture

```
Claude (MCP client)
   │ OAuth 2.1 flow with PKCE + resource indicator (RFC 8707)
   ▼
Auth0 (OAuth 2.1 Authorization Server)
   │ + Google Workspace Enterprise Connection (domain-restricted to samba.tv)
   │ + Post-Login Action (defense in depth: reject non-@samba.tv)
   ▼ Bearer JWT (RS256, audience-bound to MCP server URL)
Lever MCP Server (this repo, on GCP Cloud Run us-central1)
   │ - Validates token via Auth0 JWKS (cached via jose.createRemoteJWKSet)
   │ - Extracts email claim from token
   │ - Resolves email → Lever user ID via perform-as-resolver (TTL cache) — **M3b, pending**
   │ - Attaches resolved user ID as `perform_as` on writes
   ▼
Lever ATS REST API (api.lever.co/v1)
```

**Stack:**

| Layer | Choice |
|---|---|
| Language | TypeScript (Node.js 20+) |
| HTTP server | Express 4.21 |
| MCP SDK | `@modelcontextprotocol/sdk` 1.29 |
| MCP transport | Streamable HTTP |
| MCP-Protocol-Version | `2025-06-18` (target: `2025-11-25` per M1.5) |
| JWT validation | `jose` 6 |
| Schema validation | `zod` 3 |
| Deploy target | GCP Cloud Run, region `us-central1` |
| Auth | OAuth 2.1 + Auth0 (Google Workspace IdP) |

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for request-flow diagrams + auth-chain failure recovery procedures.

---

## Prerequisites

- Node.js 20+ and npm
- [GCP account](https://cloud.google.com/) with Cloud Run enabled (for deploy)
- [Lever API key](https://hire.lever.co/settings/integrations) with scopes for: opportunities, postings, users, stages, archive_reasons, feedback_templates, requisitions, feedback (read + write), interviews (write), notes (write), webhooks (read + write)
- [Auth0 tenant](https://auth0.com/) configured per [system-design.md §4 Auth0 setup requirements](./system-design.md#auth-model)

---

## Install

```bash
git clone https://github.com/the-sid-dani/lever-mcp-server.git
cd lever-mcp-server
npm install
```

---

## Local development

```bash
# Run local dev server (tsx watch, port 8080)
npm run dev

# Type check (no emit)
npm run type-check

# Run tests (vitest)
npm test

# Watch mode
npm run test:watch

# Format
npm run format

# Lint + autofix
npm run lint:fix
```

Set the required env vars locally (see [`.env.example`](./.env.example) for the full list):

```bash
export LEVER_API_KEY=<your-key>
export LEVER_DEFAULT_USER_ID=<your-lever-user-uuid>
export NODE_ENV=development
```

For the OAuth 2.1 path during local dev, also set `AUTH0_ISSUER_URL` and `AUTH0_AUDIENCE`. To bypass OAuth locally and use single-tenant fallback (server reads `LEVER_DEFAULT_USER_ID` for `perform_as`), set `OAUTH_ENABLED=false`.

---

## Deploy

```bash
# Build + push container + deploy revision via Cloud Build + Cloud Run
npm run deploy
```

Behind the scenes: `gcloud builds submit --config cloudbuild.yaml`. Production environment variables are managed via Cloud Run service config (no `.env` file in production).

Rollback to a previous revision:

```bash
gcloud run revisions list --service lever-mcp --region us-central1
gcloud run services update-traffic lever-mcp \
  --to-revisions=<previous-revision>=100 \
  --region us-central1
```

---

## Connect from Claude

Once the server is deployed and the Auth0 tenant is configured, register the MCP server in Claude.ai (or Claude Code) using the standard remote MCP flow. Claude handles OAuth discovery + the PKCE auth code flow automatically. First connect prompts a Google login at `@samba.tv` and consents to the requested scopes; subsequent connects reuse the refresh token.

Local dev / debugging:

```bash
# Install the MCP Inspector
npm install -g @modelcontextprotocol/inspector

# Run inspector against local dev server (OAUTH_ENABLED=false recommended)
npx @modelcontextprotocol/inspector
# Enter: http://localhost:8080/mcp
```

---

## Tools

17 tools registered (post-consolidation). See [system-design.md §8](./system-design.md#tool-surface-v1--v3) for the canonical inventory.

**Search & discovery (4)**

`lever_advanced_search`, `lever_search_candidates`, `lever_find_postings_by_owner`, `lever_list_open_roles`

**Candidate management (2)**

`lever_get_candidate`, `lever_update_candidate`

**Application / files / emails (3)**

`lever_list_applications`, `lever_list_files`, `lever_list_emails`

**Interview (2)**

`lever_manage_interview`, `lever_get_interview_insights`

**User lookup (1)**

`lever_get_users`

**Notes (1) — `lever_notes(action)`**

- `action="list"` — fetch all notes on a candidate
- `action="get"` — fetch one note by id
- `action="add"` — create a new note (single-tenant — attributed via `LEVER_DEFAULT_USER_ID`)

**Feedback (1) — `lever_feedback(action)`**

- `action="list_templates"` — discover available feedback forms org-wide
- `action="list"` — all feedback on a candidate
- `action="get"` — one feedback form by id
- `action="submit"` — submit a filled-out form (single-tenant — uses `fieldValues[]` write-shape per Lever API)

**Archive (1) — `lever_archive(action)`**

- `action="list_reasons"` — discover valid archive reason IDs
- `action="archive"` — archive a candidate
- `action="search"` — query archived candidates by posting / date range / recruiter / reason

**Stages (1) — `lever_stages(action)`**

- `action="list"` — fetch all pipeline stages
- `action="history"` — stage-change history for a specific opportunity

**Requisitions (1) — `lever_requisitions(action)`**

- `action="list"` — fetch requisitions with optional filters (status, code, date, confidentiality)
- `action="get"` — fetch full details for one requisition by Lever UUID or external code (smart lookup)

### Why action-enum tools?

Reduces schema-token overhead ~30-40% vs the prior 26-tool registry (consolidated 2026-05-27, commits `17951ea`...`71d999c`). Same-resource operations share one tool, dispatched by `action` enum. Background: `continuum/research/code-mode-vs-many-tools/findings.md`.

### Out of scope (future batches)

- M5 write tools (`lever_feedback(action="update")`) — blocked on Auth0 IT ticket for multi-tenant perform_as resolver
- M6 webhook tools (`lever_list_webhooks`, `lever_register_webhook`, `lever_delete_webhook`) — same blocker

---

## Project structure

```
src/
├── server.ts                 # Cloud Run entry, Express setup, MCP transport wiring
├── tools.ts                  # registerAllTools + 4 tool registrations (search, candidates, postings)
├── additional-tools.ts       # 11 tool registrations including 5 consolidated action-enum tools (split into src/tools/ in v3 M3a)
├── interview-tools.ts        # 2 interview-specific tool registrations
├── lever/
│   └── client.ts             # LeverClient — REST wrapper, rate limit, pagination
├── auth/
│   ├── middleware.ts         # JWT validation, OAUTH_ENABLED toggle, Cloud Run IAM fallback
│   ├── metadata.ts           # OAuth 2.0 Protected Resource Metadata endpoint
│   ├── constants.ts
│   ├── types.ts
│   └── index.ts
├── types/lever.ts            # Lever API response type definitions
└── utils/stage-helpers.ts

test-fixtures/lever-api/      # Probe captures (2026-05-22) + synthetic fixtures for M4 tests
system-design.md              # Canonical architecture spec (v3 refactor)
ARCHITECTURE.md               # Request-flow diagrams + failure recovery
scaffold-spec.yaml            # Spec used to publish Confluence + create Jira Stories
```

---

## Testing

```bash
npm test         # vitest run (full suite)
npm run test:watch
```

Current coverage focuses on auth middleware (`src/auth/__tests__/middleware.test.ts`). Tool-level test coverage lands in v3 M4 — fixtures already captured in `test-fixtures/lever-api/`.

---

## Known limitations

1. **`perform_as` is required on every Lever write** — every POST/PUT in Lever v1 requires `perform_as=<user-uuid>`. v3 multi-tenant resolver (M3b) derives this from the authenticated user's email → Lever user lookup. v1/v2 single-tenant mode uses `LEVER_DEFAULT_USER_ID` env var.
2. **MCP session state is per-Cloud-Run-container memory** — revision swaps drop active sessions; clients reconnect transparently. Acceptable for single-region single-revision deploy. See system-design.md §7 "MCP session state" for context.
3. **No webhook ingestion sink** — v3 M6 ships registration tools only (3 tools). Persisting inbound webhook events is a separate future project once a real consumer use case exists.
4. **MCP-Protocol-Version pinned at `2025-06-18`** — v3 M1.5 bumps to `2025-11-25` after a compliance audit (RFC 8707 resource parameter, RFC 9207 iss validation, PKCE S256 hard-MUST, Client ID Metadata Documents support).

---

## Contributing

This is `the-sid-dani`'s personal repo. The v3 refactor is tracked at [ATF-476](https://sambatv.atlassian.net/browse/ATF-476). Each milestone has its own Story (ATF-477 through ATF-490). PRs welcome with reference to the relevant Story.

```bash
git checkout -b refactor/<feature>
# make changes...
npm run type-check && npm test
git commit -m "feat(...): short description"
# Push, open PR against `main`
```

---

## License

MIT (see [LICENSE](./LICENSE) if present).

---

## References

- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Lever ATS Developer Documentation](https://hire.lever.co/developer/documentation)
- [Auth0 Documentation](https://auth0.com/docs)
- [GCP Cloud Run](https://cloud.google.com/run/docs)
- [`system-design.md`](./system-design.md) — canonical v3 design
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — request-flow + failure recovery
- [`CLAUDE.md`](./CLAUDE.md) — Claude Code guidance for this codebase
