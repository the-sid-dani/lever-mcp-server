# Agent-driven evals

This is the **agent-driven** eval harness: a real headless LLM agent (the
`claude` CLI) drives the Lever MCP tools end to end, and a deterministic grader
checks whether each golden task actually worked. It complements -- and does
**not** replace -- the static `npm run eval:schema` contract gate.

| Gate | What it proves | Needs a model? | Needs the API key? |
|------|----------------|----------------|--------------------|
| `npm run eval:schema` | All 17 tools registered, descriptions non-empty, golden tool names resolve (Layer 0 static contract). | No | No |
| `npm run eval:agent` | A real agent picks the right tool for each prompt and the answer is non-empty / honest / graceful against the LOCAL server. | Yes (logged-in `claude` CLI) | Yes (`~/.second-brain-os.env`) |

## How it works

1. `run.sh` sources `~/.second-brain-os.env`, boots a local dev server
   (`PORT=8095 OAUTH_ENABLED=false npm run dev`), waits for `/health`, then runs
   the orchestrator.
2. `run.ts` writes a temp MCP config pointing the server name `lever` at the
   local `/mcp` endpoint, then for each selected golden task spawns:

   ```
   claude -p "<prompt>" --mcp-config <tmp> --allowed-tools "mcp__lever__*" \
     --output-format stream-json --verbose
   ```

   It captures the `stream-json` output, extracts every `tool_use` block + the
   final result text, and grades via `grade.ts`.
3. `grade.ts` is **pure** (no I/O): it strips the `mcp__lever__` prefix off tool
   names, checks tool-selection against `expected_tool` /
   `expected_tool_sequence`, and applies the output assertion (non_empty,
   has_field, behavior_check, graceful_error, tool_selection, write_op).
4. A markdown report lands at `evals/agent/last-run-report.md`.

## Running it

```bash
# Full live run (boots server + invokes the agent). Requires the logged-in
# `claude` CLI and ~/.second-brain-os.env with LEVER_API_KEY + LEVER_DEFAULT_USER_ID.
npm run eval:agent
```

The grader **self-test** proves the logic with NO model and NO network -- this
is the gate that ships in CI-style checks:

```bash
npx tsx evals/agent/selfcheck.ts   # must print PASS and exit 0
```

You can also dry-run the orchestrator without a model; it loads the golden
tasks, prints "live mode off", and exits 0:

```bash
npx tsx evals/agent/run.ts          # EVAL_LIVE unset -> no claude spawn
```

## Env knobs

| Var | Default | Meaning |
|-----|---------|---------|
| `MCP_URL` | `http://localhost:8095/mcp` | MCP endpoint the agent connects to. |
| `EVAL_LIVE` | unset | `1` to actually invoke `claude`; otherwise live mode is off. |
| `EVAL_TASKS` | (read-only set) | Comma list of golden task ids to run. |
| `EVAL_WRITES` | unset | `1` to include `write_op` tasks in the default set. |

## Read-only by default + writes

The default live task set is **read-only**: `write_op` tasks (GT-004, GT-006,
GT-007) are excluded unless `EVAL_WRITES=1`. Even when included, write tasks are
graded **params-only** -- the harness checks that the agent selected the right
write tool with plausible params; it does **not** await or require a real Lever
mutation. Keep write tasks out of the routine live run unless you specifically
want to exercise tool selection on mutations.

ASCII only. No emojis.
