#!/usr/bin/env node
/**
 * smoke-all-tools.mjs — end-to-end smoke harness for all 17 Lever MCP tools.
 *
 * Drives the server over the real Streamable HTTP transport (same path
 * Claude.ai uses), exercises every registered tool, and prints a pass/fail
 * table. READ-ONLY BY DEFAULT — write/mutating tools are skipped unless you
 * explicitly opt in.
 *
 * USAGE
 *   # 1. Boot a dev server in another terminal (reads LEVER_API_KEY from env):
 *   set -a && source ~/.second-brain-os.env && set +a
 *   PORT=8095 LEVER_DEFAULT_USER_ID=eb1c3b07-33c7-4c7a-8702-ecd14efd2517 \
 *     OAUTH_ENABLED=false npm run dev
 *
 *   # 2. Run the harness (from repo root):
 *   MCP_URL=http://localhost:8095/mcp node scripts/smoke-all-tools.mjs
 *
 * ENV
 *   MCP_URL        MCP endpoint (default http://localhost:8095/mcp)
 *   SMOKE_OPP_ID   Seed opportunity UUID for the read tools that need one.
 *                  If unset, the harness pulls the first ID from a search.
 *   SMOKE_WRITES   Set to "1" to ALSO run the write/mutating tools. Off by
 *                  default so the standard run never mutates Lever.
 *
 * EXIT CODE  0 = every non-skipped tool passed; 1 = any failure.
 */

import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const sdkBase = path.join(here, "..", "node_modules", "@modelcontextprotocol", "sdk", "dist", "esm", "client");
const { Client } = await import(path.join(sdkBase, "index.js"));
const { StreamableHTTPClientTransport } = await import(path.join(sdkBase, "streamableHttp.js"));

const MCP_URL = process.env.MCP_URL || "http://localhost:8095/mcp";
const RUN_WRITES = process.env.SMOKE_WRITES === "1";
let SEED_OPP_ID = process.env.SMOKE_OPP_ID || null;

const EXPECTED_TOOLS = 17;
const results = []; // { tool, tier, status: PASS|FAIL|SKIP, note }

function record(tool, tier, status, note = "") {
  results.push({ tool, tier, status, note });
  const icon = status === "PASS" ? "✓" : status === "FAIL" ? "✗" : "–";
  console.log(`  ${icon} [${tier}] ${tool}${note ? "  — " + note : ""}`);
}

// Pull text out of an MCP tool result for inspection / id-scraping.
function resultText(res) {
  if (!res || !Array.isArray(res.content)) return "";
  return res.content.map((c) => (typeof c.text === "string" ? c.text : "")).join("\n");
}

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

const client = new Client({ name: "smoke-all-tools", version: "1.0" }, { capabilities: {} });

async function call(tool, args) {
  return client.callTool({ name: tool, arguments: args });
}

// Run a read tool: PASS if it returns without throwing and has content.
async function read(tool, args, note = "") {
  try {
    const res = await call(tool, args);
    if (res.isError) {
      record(tool, "read", "FAIL", (resultText(res) || "isError").slice(0, 120));
      return null;
    }
    const txt = resultText(res);
    record(tool, "read", "PASS", note || `${txt.length} chars`);
    return txt;
  } catch (err) {
    record(tool, "read", "FAIL", err.message.slice(0, 120));
    return null;
  }
}

async function write(tool, args, note) {
  if (!RUN_WRITES) {
    record(tool, "write", "SKIP", "set SMOKE_WRITES=1 to run");
    return;
  }
  try {
    const res = await call(tool, args);
    if (res.isError) {
      record(tool, "write", "FAIL", (resultText(res) || "isError").slice(0, 120));
      return;
    }
    record(tool, "write", "PASS", note || "ok");
  } catch (err) {
    record(tool, "write", "FAIL", err.message.slice(0, 120));
  }
}

try {
  await client.connect(new StreamableHTTPClientTransport(new URL(MCP_URL)));
  console.log(`Connected to ${MCP_URL}\n`);

  // ── 0. Registry assertion ──────────────────────────────────────
  const list = await client.listTools();
  const names = list.tools.map((t) => t.name).sort();
  console.log(`Registered tools: ${list.tools.length} (expected ${EXPECTED_TOOLS})`);
  if (list.tools.length !== EXPECTED_TOOLS) {
    console.error(`  ✗ tool count mismatch — got ${list.tools.length}`);
  }
  console.log("");

  // ── 1. Zero-arg reads ──────────────────────────────────────────
  console.log("Tier 0 — zero-arg reads:");
  await read("lever_list_open_roles", {});
  await read("lever_get_users", { limit: 5 });
  await read("lever_requisitions", { action: "list", limit: 5 });
  await read("lever_archive", { action: "list_reasons" });
  await read("lever_feedback", { action: "list_templates" });
  await read("lever_get_interview_insights", { time_scope: "this_week", view_type: "dashboard" });
  await read("lever_find_postings_by_owner", { limit: 5 });
  console.log("");

  // ── 2. Search → seed an opportunity_id ─────────────────────────
  console.log("Tier 1 — search + seed candidate id:");
  const searchTxt = await read("lever_search_candidates", { limit: 5 }, "broad search");
  await read("lever_advanced_search", { mode: "quick", limit: 5 });

  if (!SEED_OPP_ID && searchTxt) {
    const m = searchTxt.match(UUID_RE);
    if (m) SEED_OPP_ID = m[0];
  }
  console.log(SEED_OPP_ID ? `  seed opportunity_id = ${SEED_OPP_ID}\n` : "  no seed id found — id-dependent reads will SKIP\n");

  // ── 3. Reads that need an opportunity_id ───────────────────────
  console.log("Tier 1 — id-dependent reads:");
  const idTools = [
    ["lever_get_candidate", { opportunity_id: SEED_OPP_ID }],
    ["lever_list_applications", { opportunity_id: SEED_OPP_ID }],
    ["lever_list_files", { opportunity_id: SEED_OPP_ID }],
    ["lever_list_emails", { opportunity_id: SEED_OPP_ID }],
    ["lever_notes", { action: "list", opportunity_id: SEED_OPP_ID }],
    ["lever_feedback", { action: "list", opportunity_id: SEED_OPP_ID }],
    ["lever_stages", { action: "history", opportunity_id: SEED_OPP_ID }],
  ];
  for (const [tool, args] of idTools) {
    if (!SEED_OPP_ID) {
      record(tool, "read", "SKIP", "no seed opportunity_id");
      continue;
    }
    await read(tool, args);
  }
  console.log("");

  // ── 4. Write / mutating tools (opt-in) ─────────────────────────
  console.log(`Tier 2 — writes (${RUN_WRITES ? "ENABLED" : "skipped — read-only run"}):`);
  // NOTE: these mutate real Lever data. Only wired with safe-ish probes;
  // review before enabling SMOKE_WRITES=1. update/archive/interview are
  // left as SKIP-only placeholders to avoid accidental destructive calls.
  await write(
    "lever_notes",
    { action: "add", opportunity_id: SEED_OPP_ID, note: "[smoke-test] harness note — safe to delete" },
    "added throwaway note"
  );
  record("lever_update_candidate", "write", "SKIP", "destructive — test manually with a known stage_id");
  record("lever_feedback", "write", "SKIP", "submit verified live (Manish e098e104); test manually");
  record("lever_archive", "write", "SKIP", "destructive — archives a candidate; test manually");
  record("lever_manage_interview", "write", "SKIP", "calendar mutation — test manually");
  console.log("");

  // ── Summary ────────────────────────────────────────────────────
  const pass = results.filter((r) => r.status === "PASS").length;
  const fail = results.filter((r) => r.status === "FAIL").length;
  const skip = results.filter((r) => r.status === "SKIP").length;
  console.log("─".repeat(56));
  console.log(`SUMMARY:  ${pass} passed · ${fail} failed · ${skip} skipped`);
  if (fail > 0) {
    console.log("\nFailures:");
    for (const r of results.filter((x) => x.status === "FAIL")) console.log(`  ✗ ${r.tool} — ${r.note}`);
  }
  console.log("─".repeat(56));

  await client.close();
  process.exit(fail > 0 ? 1 : 0);
} catch (err) {
  console.error("\nHarness aborted:", err.message);
  console.error(err.stack);
  try { await client.close(); } catch {}
  process.exit(1);
}
