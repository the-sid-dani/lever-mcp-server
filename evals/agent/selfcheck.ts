/**
 * Deterministic self-test of the agent-eval grader.
 *
 * Run via: npx tsx evals/agent/selfcheck.ts   (no model, no network)
 *
 * This is THE gate that proves the grader logic works without a live model.
 * It builds canned stream-json transcripts and asserts gradeTask returns the
 * expected verdicts. Exits non-zero on any mismatch.
 *
 * ASCII only. No emojis.
 */

import { GOLDEN_TASKS } from "../golden-tasks.js";
import {
  extractFinalText,
  extractToolUses,
  gradeTask,
  type ToolUse,
} from "./grade.js";

// Build a stream-json assistant tool_use line.
function toolUseLine(name: string, input: Record<string, unknown>): string {
  return JSON.stringify({
    type: "assistant",
    message: { content: [{ type: "tool_use", name, input }] },
  });
}

// Build a stream-json result line.
function resultLine(result: string): string {
  return JSON.stringify({ type: "result", subtype: "success", result });
}

function task(id: string) {
  const t = GOLDEN_TASKS.find((g) => g.id === id);
  if (!t) throw new Error(`golden task ${id} not found`);
  return t;
}

interface Case {
  name: string;
  lines: string[];
  taskId: string;
  expectPass: boolean;
  // Optional extra assertions on extracted intermediates.
  expectTool?: string;
  expectSelected?: boolean;
}

const cases: Case[] = [
  {
    // GT-001 happy path: email lookup, tool called, candidate found.
    name: "GT-001 successful email lookup -> PASS",
    taskId: "GT-001",
    lines: [
      "non-json verbose noise that must be ignored",
      toolUseLine("mcp__lever__lever_search_candidates", {
        query: "sarah.chen@example.com",
      }),
      resultLine(
        "Found 1 candidate: Sarah Chen (sarah.chen@example.com), opportunity opp_7f3a.",
      ),
    ],
    expectPass: true,
    expectTool: "lever_search_candidates",
    expectSelected: true,
  },
  {
    // GT-001 anti-false-negative honesty: tool called, agent honestly reports
    // not-found (no hallucinated person) -> PASS. The tool worked and the agent
    // did not fabricate a result, which is the correct behavior against a FAKE
    // email. (This is the GT-001-style honest-not-found PASS case.)
    name: "GT-001 honest not-found -> PASS (anti-false-negative honesty)",
    taskId: "GT-001",
    lines: [
      toolUseLine("mcp__lever__lever_search_candidates", {
        query: "sarah.chen@example.com",
      }),
      resultLine("No candidates found matching that email."),
    ],
    expectPass: true,
    expectSelected: true,
  },
  {
    // GT-001 the REAL anti-false-negative bug: tool returned empty but the agent
    // ASSERTS a specific person was found -> must FAIL.
    name: "GT-001 hallucinates found-when-empty -> FAIL (anti-false-negative)",
    taskId: "GT-001",
    lines: [
      toolUseLine("mcp__lever__lever_search_candidates", {
        query: "sarah.chen@example.com",
      }),
      resultLine(
        "No results were returned, but I found Sarah Chen, a senior engineer.",
      ),
    ],
    expectPass: false,
    expectSelected: true,
  },
  {
    // GT-001 happy real-data path: tool called, real candidate returned -> PASS.
    name: "GT-001 real-data answer -> PASS",
    taskId: "GT-001",
    lines: [
      toolUseLine("mcp__lever__lever_search_candidates", {
        query: "sarah.chen@example.com",
      }),
      resultLine("Sarah Chen, opportunity opp_7f3a, applied for Senior Engineer."),
    ],
    expectPass: true,
    expectSelected: true,
  },
  {
    // GT-005 false-negative honesty: empty results but agent claims "I found
    // Jane Smith" -> must FAIL.
    name: "GT-005 asserts found-when-empty -> FAIL",
    taskId: "GT-005",
    lines: [
      toolUseLine("mcp__lever__lever_search_candidates", {
        query: "Jordan Smith",
      }),
      resultLine(
        "I found Jane Smith for you, no results were returned but here is the profile.",
      ),
    ],
    expectPass: false,
    expectSelected: true,
  },
  {
    // GT-005 honest empty: tool called, agent reports a complete-but-empty
    // sweep without naming a phantom person -> PASS.
    name: "GT-005 honest empty sweep -> PASS",
    taskId: "GT-005",
    lines: [
      toolUseLine("mcp__lever__lever_search_candidates", {
        query: "Jordan Smith",
      }),
      resultLine(
        "I swept the full candidate base and there were no results for that name. Do you have an email to narrow it down?",
      ),
    ],
    expectPass: true,
    expectSelected: true,
  },
  {
    // GT-013 graceful error: non-existent opp reported as not-found, no crash,
    // no fabricated profile -> PASS.
    name: "GT-013 graceful not-found -> PASS",
    taskId: "GT-013",
    lines: [
      toolUseLine("mcp__lever__lever_get_candidate", {
        opportunity_id: "opp_DOESNOTEXIST",
      }),
      resultLine(
        "That candidate could not be found (opportunity opp_DOESNOTEXIST does not exist). No profile to show.",
      ),
    ],
    expectPass: true,
    expectSelected: true,
  },
  {
    // GT-013 varied phrasing: a graceful not-found worded differently must
    // still be recognized as PASS (broadened keyword set).
    name: "GT-013 graceful not-found varied phrasing -> PASS",
    taskId: "GT-013",
    lines: [
      toolUseLine("mcp__lever__lever_get_candidate", {
        opportunity_id: "opp_DOESNOTEXIST",
      }),
      resultLine(
        "I was unable to locate that opportunity -- there is no such candidate, so no profile is available.",
      ),
    ],
    expectPass: true,
    expectSelected: true,
  },
  {
    // GT-013 real live phrasing (VAL-508b): the exact string a live agent
    // returned for a bogus id. "404 ... no candidate ... exists" is a graceful
    // not-found and MUST be recognized as PASS (was a grader false-negative).
    name: "GT-013 live 404/no-candidate-exists phrasing -> PASS",
    taskId: "GT-013",
    lines: [
      toolUseLine("mcp__lever__lever_get_candidate", {
        opportunity_id: "opp_DOESNOTEXIST",
      }),
      resultLine(
        "404 — no candidate with ID opp_DOESNOTEXIST exists in Lever.",
      ),
    ],
    expectPass: true,
    expectSelected: true,
  },
  {
    // Guard (VAL-508b): a SUCCESSFUL profile answer graded against a non_empty
    // task must still PASS -- the broadened not-found regex must NOT misclassify
    // a real candidate (name + email) as not-found.
    name: "GT-002 successful profile answer -> PASS (not misclassified as not-found)",
    taskId: "GT-002",
    lines: [
      toolUseLine("mcp__lever__lever_list_open_roles", {}),
      resultLine(
        "Artur Kraskov, artur.kraskov@protonmail.com, applied to Software Engineer.",
      ),
    ],
    expectPass: true,
    expectSelected: true,
  },
  {
    // GT-013 hallucinated profile: agent fabricates a person for a bogus id ->
    // must FAIL.
    name: "GT-013 hallucinated profile -> FAIL",
    taskId: "GT-013",
    lines: [
      toolUseLine("mcp__lever__lever_get_candidate", {
        opportunity_id: "opp_DOESNOTEXIST",
      }),
      resultLine("Here is the profile: I found John Doe, a senior engineer."),
    ],
    expectPass: false,
  },
  {
    // GT-008 sequence task: both tools must appear -> PASS.
    name: "GT-008 full sequence + data -> PASS",
    taskId: "GT-008",
    lines: [
      toolUseLine("mcp__lever__lever_search_candidates", {
        query: "sarah.chen@example.com",
      }),
      toolUseLine("mcp__lever__lever_get_candidate", {
        opportunity_id: "opp_7f3a",
      }),
      resultLine(
        "Sarah Chen (opp_7f3a): applied for Senior Engineer, 3 interviews completed.",
      ),
    ],
    expectPass: true,
    expectSelected: true,
  },
  {
    // GT-008 partial sequence: only the first tool fired -> selection FAILS.
    name: "GT-008 partial sequence -> FAIL",
    taskId: "GT-008",
    lines: [
      toolUseLine("mcp__lever__lever_search_candidates", {
        query: "sarah.chen@example.com",
      }),
      resultLine("Found Sarah Chen but I did not pull her full profile."),
    ],
    expectPass: false,
    expectSelected: false,
  },
  {
    // GT-004 write op: params-only grading, tool selected with params -> PASS.
    name: "GT-004 write op params-only -> PASS",
    taskId: "GT-004",
    lines: [
      toolUseLine("mcp__lever__lever_notes", {
        action: "add",
        opportunity_id: "opp_abc123",
        note: "Strong systems design",
      }),
      resultLine("Note added to opp_abc123."),
    ],
    expectPass: true,
    expectSelected: true,
  },
];

let failures = 0;
console.log("agent-eval grader self-test");
console.log("===========================");

for (const c of cases) {
  const t = task(c.taskId);
  const toolUses: ToolUse[] = extractToolUses(c.lines);
  const finalText = extractFinalText(c.lines);
  const grade = gradeTask(t, toolUses, finalText);

  const mismatches: string[] = [];
  if (grade.pass !== c.expectPass)
    mismatches.push(`pass expected ${c.expectPass} got ${grade.pass}`);
  if (c.expectSelected !== undefined && grade.selectedExpectedTool !== c.expectSelected)
    mismatches.push(
      `selectedExpectedTool expected ${c.expectSelected} got ${grade.selectedExpectedTool}`,
    );
  if (c.expectTool && !grade.calledTools.includes(c.expectTool))
    mismatches.push(`expected called tool ${c.expectTool} not in [${grade.calledTools.join(", ")}]`);

  const ok = mismatches.length === 0;
  if (!ok) failures++;
  const icon = ok ? "PASS" : "FAIL";
  console.log(`  [${icon}] ${c.name}`);
  if (!ok) {
    for (const m of mismatches) console.log(`         - ${m}`);
    console.log(`         reasons: ${grade.reasons.join("; ")}`);
  }
}

// Also sanity-check the extractors in isolation: a transcript with no JSON
// must yield no tool uses and empty text.
{
  const empty = extractToolUses(["plain text", "more noise"]);
  if (empty.length !== 0) {
    failures++;
    console.log("  [FAIL] extractToolUses on non-json should be empty");
  } else {
    console.log("  [PASS] extractToolUses ignores non-json lines");
  }
}

console.log("===========================");
if (failures === 0) {
  console.log(`PASS — ${cases.length + 1} grader checks passed`);
  process.exit(0);
} else {
  console.log(`FAIL — ${failures} grader check(s) mismatched`);
  process.exit(1);
}
