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
 *   MCP_URL      MCP endpoint (default http://localhost:8095/mcp)
 *   EVAL_LIVE    "1" to actually invoke claude; anything else = dry/off.
 *   EVAL_TASKS   optional comma list of task ids to run (default = read-only
 *                tasks; write_op tasks excluded unless EVAL_WRITES=1).
 *   EVAL_WRITES  "1" to include write_op tasks in the live default set.
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

function isWriteTask(t: GoldenTask): boolean {
  return t.output_assertion.type === "write_op" || t.tags.includes("write");
}

// Resolve the set of tasks to run. Explicit EVAL_TASKS wins; otherwise the
// default live set is read-only tasks (writes excluded unless EVAL_WRITES=1).
function selectTasks(): GoldenTask[] {
  const explicit = (process.env.EVAL_TASKS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (explicit.length > 0) {
    const byId = new Map(GOLDEN_TASKS.map((t) => [t.id, t] as const));
    const picked: GoldenTask[] = [];
    for (const id of explicit) {
      const t = byId.get(id);
      if (t) picked.push(t);
      else console.warn(`  warn: EVAL_TASKS id "${id}" is not a known golden task`);
    }
    return picked;
  }
  return GOLDEN_TASKS.filter((t) => EVAL_WRITES || !isWriteTask(t));
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
    process.stdout.write(`  running ${t.id} ... `);
    try {
      const stdout = await runClaude(t.prompt, mcpConfigPath);
      const lines = stdout.split(/\r?\n/);
      const toolUses = extractToolUses(lines);
      const finalText = extractFinalText(lines);
      const grade = gradeTask(t, toolUses, finalText);
      rows.push({ task: t, grade });
      console.log(grade.pass ? "PASS" : "FAIL");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      rows.push({
        task: t,
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
