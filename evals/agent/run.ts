/**
 * Agent-driven eval orchestrator for the Lever MCP server.
 *
 * Run via: npx tsx evals/agent/run.ts   (or `npm run eval:agent` via run.sh)
 *
 * A real headless `claude` agent drives the LOCAL MCP server's tools for each
 * golden task. We capture which MCP tool the agent called + the final answer,
 * then grade tool-selection + output faithfulness via the pure functions in
 * grade.ts. This complements (does not replace) the static eval:schema gate.
 *
 * SAFE TO IMPORT WITHOUT A MODEL: when EVAL_LIVE is not "1", the script loads
 * the golden tasks, prints "live mode off", and exits 0 -- no `claude` spawn.
 *
 * ENV
 *   MCP_URL         MCP endpoint (default http://localhost:8095/mcp)
 *   EVAL_LIVE       "1" to actually invoke claude; anything else = dry/off.
 *   EVAL_TASKS      optional comma list of task ids to run. Explicit override
 *                   wins over the LIVE_SAFE default below.
 *   EVAL_WRITES     "1" to include write_op tasks in the live default set.
 *   EVAL_OPP_ID     real opportunity UUID; replaces literal "opp_abc123" in
 *                   prompts + expected_params. Leaves the intentionally-bad
 *                   "opp_DOESNOTEXIST" (GT-013) untouched.
 *   EVAL_EMAIL      real candidate email; replaces "sarah.chen@example.com".
 *   EVAL_POSTING_ID real posting id; replaces "post_x".
 *
 * DEFAULT TASK SET (no EVAL_TASKS): the LIVE_SAFE set runs against any real
 * account WITHOUT injected ids -- GT-002, GT-005, GT-011, GT-012, GT-013, and
 * GT-001 (honest-not-found honesty check). When EVAL_OPP_ID / EVAL_EMAIL /
 * EVAL_POSTING_ID are provided, the id-dependent tasks (GT-003, GT-008,
 * GT-009, GT-010) join the set as real-data tasks.
 *
 * EXIT CODE  0 = all selected tasks passed (or live mode off); 1 = any failed.
 *
 * ASCII only. No emojis.
 */

import { execFile } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { GOLDEN_TASKS, type GoldenTask } from "../golden-tasks.js";
import {
  extractFinalText,
  extractToolUses,
  gradeTask,
  type TaskGrade,
} from "./grade.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPORT_PATH = path.join(HERE, "last-run-report.md");

const MCP_URL = process.env.MCP_URL || "http://localhost:8095/mcp";
const EVAL_LIVE = process.env.EVAL_LIVE === "1";
const EVAL_WRITES = process.env.EVAL_WRITES === "1";
const TASK_TIMEOUT_MS = 120_000;

// Real-id injection. Each entry maps a literal placeholder string (used by the
// golden tasks) to the env var that, when set, replaces it. The intentionally
// non-existent "opp_DOESNOTEXIST" (GT-013) is deliberately NOT listed -- it
// must stay bogus so the graceful-not-found honesty check has something to
// fail against.
const ID_SUBSTITUTIONS: { placeholder: string; envVar: string }[] = [
  { placeholder: "opp_abc123", envVar: "EVAL_OPP_ID" },
  { placeholder: "sarah.chen@example.com", envVar: "EVAL_EMAIL" },
  { placeholder: "post_x", envVar: "EVAL_POSTING_ID" },
];

// Which env vars must be set for the id-dependent tasks to become real-data
// runs. When none are set, those tasks are excluded from the default set.
const HAS_INJECTED_IDS = ID_SUBSTITUTIONS.some(
  (s) => (process.env[s.envVar] || "").trim().length > 0,
);

// LIVE_SAFE: tasks that produce a clean signal against ANY real account with no
// injected ids. GT-001 is included because, with a FAKE email, the correct
// behavior is an honest not-found (graded via its anti-false-negative tag).
const LIVE_SAFE_IDS = ["GT-002", "GT-005", "GT-011", "GT-012", "GT-013", "GT-001"];

// Tasks that need a real injected id to return data. Added to the default set
// only when the relevant env vars are present.
const ID_DEPENDENT_IDS = ["GT-003", "GT-008", "GT-009", "GT-010"];

// Apply real-id substitutions to a prompt string, returning the rewritten
// prompt + a list of human-readable substitution notes for logging.
function applyIdSubstitutions(prompt: string): {
  prompt: string;
  applied: string[];
} {
  let out = prompt;
  const applied: string[] = [];
  for (const { placeholder, envVar } of ID_SUBSTITUTIONS) {
    const value = (process.env[envVar] || "").trim();
    if (!value) continue;
    if (out.includes(placeholder)) {
      out = out.split(placeholder).join(value);
      applied.push(`${envVar} -> "${placeholder}"`);
    }
  }
  return { prompt: out, applied };
}

// Apply the same placeholder->env-value substitution to expected_params values
// so any downstream param checks line up with the rewritten prompt. Only string
// values that exactly equal a placeholder are replaced.
function substituteExpectedParams(
  params: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!params) return params;
  const out: Record<string, unknown> = { ...params };
  for (const key of Object.keys(out)) {
    const val = out[key];
    if (typeof val !== "string") continue;
    for (const { placeholder, envVar } of ID_SUBSTITUTIONS) {
      const value = (process.env[envVar] || "").trim();
      if (value && val === placeholder) {
        out[key] = value;
      }
    }
  }
  return out;
}

function isWriteTask(t: GoldenTask): boolean {
  return t.output_assertion.type === "write_op" || t.tags.includes("write");
}

// Resolve the set of tasks to run. Explicit EVAL_TASKS wins; otherwise the
// default is the LIVE_SAFE set (clean signal against any real account), plus
// the id-dependent tasks when real ids are injected via env. Write tasks stay
// excluded unless EVAL_WRITES=1.
function selectTasks(): GoldenTask[] {
  const byId = new Map(GOLDEN_TASKS.map((t) => [t.id, t] as const));

  const explicit = (process.env.EVAL_TASKS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (explicit.length > 0) {
    const picked: GoldenTask[] = [];
    for (const id of explicit) {
      const t = byId.get(id);
      if (t) picked.push(t);
      else console.warn(`  warn: EVAL_TASKS id "${id}" is not a known golden task`);
    }
    return picked;
  }

  // Default set: LIVE_SAFE, plus id-dependent tasks when ids were injected.
  const ids = HAS_INJECTED_IDS
    ? [...LIVE_SAFE_IDS, ...ID_DEPENDENT_IDS]
    : [...LIVE_SAFE_IDS];

  const picked: GoldenTask[] = [];
  for (const id of ids) {
    const t = byId.get(id);
    if (!t) continue;
    if (!EVAL_WRITES && isWriteTask(t)) continue;
    picked.push(t);
  }
  return picked;
}

function writeMcpConfig(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "lever-eval-"));
  const file = path.join(dir, "mcp-config.json");
  const config = {
    mcpServers: {
      lever: { type: "http", url: MCP_URL },
    },
  };
  writeFileSync(file, JSON.stringify(config, null, 2), "utf8");
  return file;
}

function runClaude(prompt: string, mcpConfigPath: string): Promise<string> {
  const args = [
    "-p",
    prompt,
    "--mcp-config",
    mcpConfigPath,
    "--allowed-tools",
    "mcp__lever__*",
    // Keep the eval focused on MCP tool usage with no local side effects. We
    // block local file/shell/web tools but KEEP ToolSearch -- the agent needs
    // it to discover the MCP tools in this environment.
    "--disallowed-tools",
    "Bash Edit Write WebFetch WebSearch",
    "--output-format",
    "stream-json",
    "--verbose",
  ];
  return new Promise((resolve, reject) => {
    execFile(
      "claude",
      args,
      { timeout: TASK_TIMEOUT_MS, maxBuffer: 32 * 1024 * 1024 },
      (err, stdout) => {
        // Even on a non-zero exit the CLI usually still emits stream-json we
        // can grade. Only reject when there is no usable stdout at all.
        if (err && (!stdout || stdout.trim().length === 0)) {
          reject(err);
          return;
        }
        resolve(stdout || "");
      },
    );
  });
}

interface RunRow {
  grade: TaskGrade;
  task: GoldenTask;
  error?: string;
}

function timestamp(): string {
  return new Date().toISOString();
}

function writeReport(rows: RunRow[]): void {
  const passed = rows.filter((r) => r.grade.pass).length;
  const lines: string[] = [];
  lines.push("# Agent-eval run report");
  lines.push("");
  lines.push(`- Timestamp: ${timestamp()}`);
  lines.push(`- MCP_URL: ${MCP_URL}`);
  lines.push(`- Mode: ${EVAL_LIVE ? "LIVE (claude invoked)" : "OFF (no model)"}`);
  lines.push(`- Writes included: ${EVAL_WRITES ? "yes" : "no"}`);
  lines.push(`- Summary: ${passed}/${rows.length} passed`);
  lines.push("");
  lines.push("## Per-task results");
  lines.push("");
  lines.push("| id | pass | expected_tool | called tools | reasons |");
  lines.push("|----|------|---------------|--------------|---------|");
  for (const r of rows) {
    const expected =
      r.task.expected_tool_sequence?.join(" -> ") || r.task.expected_tool;
    const called = r.grade.calledTools.join(", ") || "(none)";
    const reasons = (r.error ? [`spawn error: ${r.error}`] : r.grade.reasons)
      .join("; ")
      .replace(/\|/g, "/");
    lines.push(
      `| ${r.task.id} | ${r.grade.pass ? "PASS" : "FAIL"} | ${expected} | ${called} | ${reasons} |`,
    );
  }
  lines.push("");
  lines.push("## Prompts");
  lines.push("");
  for (const r of rows) {
    lines.push(`- **${r.task.id}**: ${r.task.prompt}`);
  }
  lines.push("");
  writeFileSync(REPORT_PATH, lines.join("\n"), "utf8");
}

async function main(): Promise<void> {
  const selected = selectTasks();

  console.log("Lever MCP agent-eval orchestrator");
  console.log("=================================");
  console.log(`MCP_URL: ${MCP_URL}`);
  console.log(`Loaded ${GOLDEN_TASKS.length} golden tasks; selected ${selected.length}.`);

  if (!EVAL_LIVE) {
    console.log("");
    console.log("live mode off (EVAL_LIVE != 1) -- not invoking claude.");
    console.log("Set EVAL_LIVE=1 (and boot the local server) to run the agent.");
    console.log(`Selected task ids: ${selected.map((t) => t.id).join(", ") || "(none)"}`);
    // Still write a report so the artifact path exists.
    writeReport(
      selected.map((t) => ({
        task: t,
        grade: {
          id: t.id,
          pass: false,
          selectedExpectedTool: false,
          calledTools: [],
          reasons: ["skipped: live mode off"],
        },
      })),
    );
    process.exit(0);
  }

  const mcpConfigPath = writeMcpConfig();
  console.log(`mcp-config: ${mcpConfigPath}`);
  console.log("");

  const rows: RunRow[] = [];
  for (const t of selected) {
    // Inject real ids into the prompt + expected_params when env vars are set.
    const { prompt, applied } = applyIdSubstitutions(t.prompt);
    const expectedParams = substituteExpectedParams(t.expected_params);
    const effective: GoldenTask = {
      ...t,
      prompt,
      expected_params: expectedParams,
    };
    if (applied.length > 0) {
      console.log(`  ${t.id}: applied id substitutions: ${applied.join(", ")}`);
    }
    process.stdout.write(`  running ${t.id} ... `);
    try {
      const stdout = await runClaude(effective.prompt, mcpConfigPath);
      const lines = stdout.split(/\r?\n/);
      const toolUses = extractToolUses(lines);
      const finalText = extractFinalText(lines);
      const grade = gradeTask(effective, toolUses, finalText);
      rows.push({ task: effective, grade });
      console.log(grade.pass ? "PASS" : "FAIL");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      rows.push({
        task: effective,
        error: message,
        grade: {
          id: t.id,
          pass: false,
          selectedExpectedTool: false,
          calledTools: [],
          reasons: [`spawn error: ${message}`],
        },
      });
      console.log("FAIL (spawn error)");
    }
  }

  console.log("");
  console.log("Results");
  console.log("-------");
  console.log("id        pass  expected_tool                 called");
  for (const r of rows) {
    const expected =
      r.task.expected_tool_sequence?.join("->") || r.task.expected_tool;
    const called = r.grade.calledTools.join(",") || "-";
    console.log(
      `${r.task.id.padEnd(9)} ${(r.grade.pass ? "PASS" : "FAIL").padEnd(5)} ${expected.padEnd(29)} ${called}`,
    );
  }

  const passed = rows.filter((r) => r.grade.pass).length;
  console.log("");
  console.log(`${passed}/${rows.length} passed`);
  writeReport(rows);
  console.log(`report: ${REPORT_PATH}`);

  process.exit(passed === rows.length ? 0 : 1);
}

main().catch((err) => {
  console.error("fatal:", err);
  process.exit(1);
});
