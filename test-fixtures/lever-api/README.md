# Lever API fixtures

Two tiers, both used by Vitest tests in M4:

## Tier 1 — Real probe captures (root level)

Captured 2026-05-22 via M0 pre-flight (autonomous run). Source endpoints:

- `postings.json` — `GET /v1/postings?limit=2&state=published`
- `opportunities.json` — `GET /v1/opportunities?limit=2`
- `feedback_templates.json` — `GET /v1/feedback_templates?limit=5`

These are real API responses with PII scrub applied recursively across every nested object:

- `email` / `emails` → `test@example.com`
- `phones`, `links`, `tags` → `[]`
- `sources` → `["referral"]`
- `origin` → `"REDACTED_ORIGIN"`
- `headline` → `"REDACTED_HEADLINE"` (opportunities only)
- `location` → `"REDACTED_LOCATION"` (opportunities only)
- candidate `name` (opportunities) → `"Test Candidate"`
- posting `name` (job title) **retained** — not PII
- feedback template `name` **retained** — public form names

Structural keys, enums, dates, IDs, stage info, posting/template content all retained for schema-assertion tests.

Verification on commit: `grep -E '[a-z0-9._-]+@[a-z0-9._-]+\.[a-z]{2,}' *.json` returned only `test@example.com`. No phone patterns matched.

Do NOT replace these with raw captures without re-running the scrub.

## Tier 2 — Synthetic fixtures (`responses/` + `errors/`)

Added 2026-05-26 (VAL-003) to fill gaps in Tier 1 — endpoints not captured in the original probe, edge-case shapes (e.g., owner as string vs object), and error-path responses for negative testing.

```
responses/
├── opportunities-list.json        2-item paginated list, includes hasNext=true cursor
├── opportunity-with-owner.json    single opp with expand=owner expanded inline
├── feedback-templates-list.json   minimal shape (2 templates) for fast unit tests
├── users-list.json                4 users incl. one deactivated (for include_deactivated test)
└── webhooks-list.json             empty array (matches probe 2026-05-22 — no webhooks registered)

errors/
├── 400-missing-perform-as.json    write call without perform_as param
├── 401-unauthorized.json          expired/invalid token
├── 404-not-found.json             invalid resource ID
└── 429-rate-limited.json          rate limit hit (Retry-After header)
```

All synthetic fixtures use deterministic test values (`opp-test-001`, `user-test-recruiter-001`, etc.) and do not contain any real candidate, user, or company data.
