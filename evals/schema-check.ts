/**
 * Layer-0 static schema / contract validator for the Lever MCP server.
 *
 * Run via: npm run eval:schema  (tsx evals/schema-check.ts)
 *
 * This is the CI hard gate that needs NO API key and NO network. It registers
 * every tool against a capturing fake server (registerAllTools makes no network
 * call at registration time, so a dummy key is safe) and asserts the static
 * contract:
 *   a. every expected tool is registered (no missing);
 *   b. no UNEXPECTED extra tool is registered;
 *   c. each tool has a non-empty description string;
 *   d. each tool has a non-null schema object;
 *   e. every GOLDEN_TASKS[*].expected_tool and each name in
 *      expected_tool_sequence resolves to a registered tool.
 *
 * Exits non-zero on any failure. ASCII only. No emojis.
 *
 * NOTE: files under evals/ are NOT compiled by `tsc --noEmit` (rootDir is
 * ./src). tsx executes this at runtime, so `npm run eval:schema` is the
 * validation gate for this file.
 */

import { registerAllTools } from "../src/tools.js";
import { GOLDEN_TASKS } from "./golden-tasks.js";

// The canonical 17 tool names. This list is the contract: schema-check fails
// loud if the registry drifts in either direction (missing or extra).
const EXPECTED_TOOLS = [
  "lever_advanced_search",
  "lever_search_candidates",
  "lever_find_postings_by_owner",
  "lever_list_open_roles",
  "lever_get_candidate",
  "lever_update_candidate",
  "lever_list_applications",
  "lever_list_files",
  "lever_list_emails",
  "lever_manage_interview",
  "lever_get_interview_insights",
  "lever_get_users",
  "lever_notes",
  "lever_feedback",
  "lever_archive",
  "lever_stages",
  "lever_requisitions",
];

interface Registration {
  description: unknown;
  schema: unknown;
  handler: unknown;
}

function main(): void {
  const reg = new Map<string, Registration>();

  // Capturing fake server. server.tool is called as either
  // (name, schemaObj, handler) or (name, descriptionString, schemaObj, handler).
  // Grab the last two args as (schema, handler) and, when there are 3+ trailing
  // args, the first trailing arg is the description string.
  const server = {
    tool: (name: string, ...rest: any[]) => {
      const handler = rest[rest.length - 1];
      const schema = rest[rest.length - 2];
      const description = rest.length >= 3 ? rest[0] : undefined;
      reg.set(name, { description, schema, handler });
    },
  } as any;

  registerAllTools(server, "eval-dummy-key");

  const failures: string[] = [];

  // (a) every expected tool is registered.
  for (const name of EXPECTED_TOOLS) {
    if (!reg.has(name)) {
      failures.push(`MISSING tool: ${name} is expected but not registered`);
    }
  }

  // (b) no unexpected extra tool.
  const expectedSet = new Set(EXPECTED_TOOLS);
  for (const name of reg.keys()) {
    if (!expectedSet.has(name)) {
      failures.push(`UNEXPECTED tool: ${name} is registered but not in the expected 17`);
    }
  }

  // (c) + (d) per-tool description + schema checks (only for tools that exist).
  for (const name of EXPECTED_TOOLS) {
    const entry = reg.get(name);
    if (!entry) continue;

    if (typeof entry.description !== "string" || entry.description.trim().length === 0) {
      failures.push(`BAD description: ${name} has a missing or empty description string`);
    }

    if (entry.schema === null || entry.schema === undefined || typeof entry.schema !== "object") {
      failures.push(`BAD schema: ${name} has a missing or non-object schema`);
    }
  }

  // (e) every golden-task tool reference resolves to a registered tool.
  for (const task of GOLDEN_TASKS) {
    if (!reg.has(task.expected_tool)) {
      failures.push(`GOLDEN ${task.id}: expected_tool '${task.expected_tool}' is not registered`);
    }
    for (const step of task.expected_tool_sequence ?? []) {
      if (!reg.has(step)) {
        failures.push(`GOLDEN ${task.id}: expected_tool_sequence step '${step}' is not registered`);
      }
    }
  }

  // Report.
  if (failures.length === 0) {
    console.log(
      `eval:schema PASS - ${reg.size}/${EXPECTED_TOOLS.length} tools, ${GOLDEN_TASKS.length} golden tasks validated`
    );
    process.exit(0);
  }

  console.error(`eval:schema FAIL - ${failures.length} failure(s):`);
  for (const f of failures) {
    console.error(`  - ${f}`);
  }
  console.error(
    `Registry: ${reg.size} tools registered, ${EXPECTED_TOOLS.length} expected, ${GOLDEN_TASKS.length} golden tasks.`
  );
  process.exit(1);
}

main();
