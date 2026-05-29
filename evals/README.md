# Lever MCP eval suite

Pre-release evaluation for the Lever MCP server. The goal is to catch
tool-contract drift and recall false-negatives BEFORE a deploy, with the
cheapest, deterministic layers running as a hard CI gate that needs no secrets.

## Layered plan

| Layer | Name | What it checks | Status |
|---|---|---|---|
| 0 | Schema / contract | Every registered tool has a non-empty description + a schema object; the registry is exactly the canonical 17; every golden-task tool reference resolves. | BUILT (`npm run eval:schema`) |
| 1 | Tool selection | Given a prompt, the agent picks the right tool (e.g. "schedule an interview" -> `lever_manage_interview`). | DEFERRED |
| 2 | Param correctness | The agent fills required params correctly (e.g. `opportunity_id`), no forbidden params. | DEFERRED |
| 3 | Output faithfulness / anti-false-negative | A known email returns a non-empty result; a name sweep is complete or honestly empty; non-existent IDs fail gracefully. | PARTIAL (golden data GT-001 / GT-005 / GT-013 + the in-suite recall regression locks the underlying pagination behavior) |
| 4 | Description LLM-judge | Tool descriptions are clear enough to drive correct selection (LLM grades them). | DEFERRED |
| 5 | Regression lockdown | Recall fixes (removed pagination caps) stay fixed. | BUILT (`src/__tests__/recall-regression.test.ts`, runs in `npm test`) |
| 6 | Weekly live contract drift | The live Lever API still matches the shapes the tools expect. | DEFERRED |

## What is BUILT now

- **Layer 0 - `evals/schema-check.ts`** (run `npm run eval:schema`). Registers
  every tool against a capturing fake server (no API key, no network, ~1s),
  asserts the static contract, and cross-checks the golden-task tool names. Exits
  non-zero on any failure. This is the intended CI hard gate.
- **Layer 5 - `src/__tests__/recall-regression.test.ts`** (runs inside
  `npm test`). Mock-based false-negative lockdown for the three pagination-cap
  bugs (BUG-002 name sweep, BUG-007 users, BUG-005 requisitions). It lives under
  `src/**` because the vitest config only includes `src/**/*.test.ts`.
- **Golden data - `evals/golden-tasks.ts`** (13 typed tasks). Consumed today by
  Layer 0 for the tool-name cross-check; the Layer 1-3 assertion fields are
  forward-looking, for the deferred harness.

## What is DEFERRED

- **Layers 1, 2, 4** and the **live-API portion of Layer 3** need a seeded Lever
  test account plus an LLM-judge harness to grade tool selection, param
  correctness, output faithfulness, and description quality against real
  responses.
- **Layer 6** (weekly live contract drift) needs the same seeded account plus a
  scheduled run.
- **OPEN QUESTION:** the judge harness is promptfoo vs a custom runner.
  Deferred until the seeded test account exists.

## How to run

```bash
# Layer 0 - static contract gate. No secrets, ~1s, exits non-zero on failure.
npm run eval:schema

# Includes the Layer 5 recall regression (full vitest suite).
npm test
```

The `eval:schema` gate is intended to block `npm run deploy`: a deploy must not
ship if the tool registry has drifted from the canonical 17 or any tool lost its
description / schema.
