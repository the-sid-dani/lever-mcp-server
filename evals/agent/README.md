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
| `EVAL_TASKS` | (LIVE_SAFE set) | Comma list of golden task ids to run. Explicit override wins over the default LIVE_SAFE / id-injected set. |
| `EVAL_WRITES` | unset | `1` to include `write_op` tasks in the default set. |
| `EVAL_OPP_ID` | unset | Real opportunity UUID. Replaces the literal `opp_abc123` in prompts + `expected_params`. The intentionally-bad `opp_DOESNOTEXIST` (GT-013) is never replaced. |
| `EVAL_EMAIL` | unset | Real candidate email. Replaces `sarah.chen@example.com`. |
| `EVAL_POSTING_ID` | unset | Real posting id. Replaces `post_x`. |

When any of `EVAL_OPP_ID` / `EVAL_EMAIL` / `EVAL_POSTING_ID` is set, the matching
placeholder is string-replaced in each task's prompt (and string-valued
`expected_params`) before the agent runs. Applied substitutions are logged per
task. Unset vars leave their placeholder untouched.

## Default task set: LIVE_SAFE + id-injected

A plain `npm run eval:agent` (no `EVAL_TASKS`, no injected ids) runs the
**LIVE_SAFE** set -- tasks that give a clean pass against ANY real Lever account
without needing seeded ids:

- `GT-002` open roles
- `GT-005` name-search honesty
- `GT-011` requisitions
- `GT-012` users
- `GT-013` graceful not-found (uses an intentionally-bad id; tests honesty)
- `GT-001` email lookup -- with a FAKE email the correct behavior is an HONEST
  not-found, so GT-001 passes on honest-not-found here (its `anti-false-negative`
  tag makes the grader accept honest-not-found and only fail a hallucinated
  found-when-empty result).

When `EVAL_OPP_ID` / `EVAL_EMAIL` / `EVAL_POSTING_ID` are provided, the
id-dependent tasks `GT-003`, `GT-008`, `GT-009`, `GT-010` join the set as
real-data tasks (they need a real id to return data).

`EVAL_TASKS` (explicit comma list) still overrides the whole default selection.

## Tool scope

The agent is launched with `--allowed-tools "mcp__lever__*"` AND
`--disallowed-tools "Bash Edit Write WebFetch WebSearch"`, so the eval stays
focused on MCP tool usage with no local file/shell/web side effects. `ToolSearch`
is intentionally NOT blocked -- the agent needs it to discover the MCP tools in
this environment.

## Read-only by default + writes

The default live task set is **read-only**: `write_op` tasks (GT-004, GT-006,
GT-007) are excluded unless `EVAL_WRITES=1`. Even when included, write tasks are
graded **params-only** -- the harness checks that the agent selected the right
write tool with plausible params; it does **not** await or require a real Lever
mutation. Keep write tasks out of the routine live run unless you specifically
want to exercise tool selection on mutations.

ASCII only. No emojis.
