# Contributing

## Branch Model

Active work happens on `refactor/v3`. Open pull requests against `main`.

Once v3 ships, `refactor/v3` will be deleted and `main` becomes the trunk.

## Setup

Run `npm install`.

Copy `.env.example` to `.env`, then populate values from GCP Secret Manager
using the instructions in `.env.example`.

## Local Verification

Always run the full `npm test` command, not scoped tests.

Type-check and tests are CI hard gates. Before opening a PR, these must pass
locally:

- `npm test`
- `npm run type-check`
- `npx biome lint .`

## Edit Tools

Repository hooks may block `Edit` on `.ts` files. Prefer
`mcp__fastedit__fast_edit` or a Python heredoc via Bash for TypeScript edits.

Markdown, JSON, and YAML files are safe with `Edit`.

## Commits

Use one assertion per commit.

Commit messages must reference the relevant ATF Story, for example:
`Refs: ATF-479 (M1)`

Do not use emoji in code, commits, or docs.

## Implementation Rules

`perform_as` is non-negotiable on writes. Route writes through the helper.

Do not call `client.makeRequest("POST", ...)` directly outside the helper.
