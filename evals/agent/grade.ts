/**
 * Pure, testable grading logic for the agent-driven eval harness.
 *
 * No I/O, no network, no model. Given the stream-json lines a headless
 * `claude` run emitted (one JSON object per line), extract which MCP tools the
 * agent actually called and the final text answer, then grade each golden task
 * on (a) tool-selection correctness and (b) output faithfulness / honesty.
 *
 * The deterministic verdicts here are exercised by evals/agent/selfcheck.ts
 * against canned transcripts, so the harness logic is proven WITHOUT a live
 * model. ASCII only. No emojis.
 */

import type { GoldenTask } from "../golden-tasks.js";

// The MCP server is named "lever" in the mcp-config, so the CLI surfaces tools
// as `mcp__lever__lever_search_candidates`. Strip the prefix to match the
// golden `expected_tool` names (e.g. `lever_search_candidates`).
const MCP_PREFIX = "mcp__lever__";

export interface ToolUse {
  name: string;
  input: Record<string, unknown>;
}

function stripPrefix(name: string): string {
  return name.startsWith(MCP_PREFIX) ? name.slice(MCP_PREFIX.length) : name;
}

/**
 * Parse stream-json lines, collecting every tool_use block from assistant
 * messages. Non-JSON lines and lines without assistant tool_use blocks are
 * ignored. The `mcp__lever__` prefix is stripped from each tool name so the
 * result matches golden `expected_tool` values.
 */
export function extractToolUses(streamJsonLines: string[]): ToolUse[] {
  const uses: ToolUse[] = [];
  for (const line of streamJsonLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let obj: unknown;
    try {
      obj = JSON.parse(trimmed);
    } catch {
      continue; // non-JSON line (verbose noise) -> skip
    }
    if (!obj || typeof obj !== "object") continue;
    const rec = obj as Record<string, unknown>;
    // stream-json assistant messages: { type: "assistant", message: { content: [...] } }
    if (rec.type !== "assistant") continue;
    const message = rec.message as Record<string, unknown> | undefined;
    const content = message?.content;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      if (!block || typeof block !== "object") continue;
      const b = block as Record<string, unknown>;
      if (b.type !== "tool_use") continue;
      const name = typeof b.name === "string" ? stripPrefix(b.name) : "";
      const input =
        b.input && typeof b.input === "object"
          ? (b.input as Record<string, unknown>)
          : {};
      if (name) uses.push({ name, input });
    }
  }
  return uses;
}

/**
 * Pull the final answer text. Prefer the `result` field of the final
 * `{type:"result"}` line; fall back to concatenating assistant text blocks.
 */
export function extractFinalText(streamJsonLines: string[]): string {
  let resultText: string | null = null;
  const assistantText: string[] = [];
  for (const line of streamJsonLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let obj: unknown;
    try {
      obj = JSON.parse(trimmed);
    } catch {
      continue;
    }
    if (!obj || typeof obj !== "object") continue;
    const rec = obj as Record<string, unknown>;
    if (rec.type === "result") {
      if (typeof rec.result === "string") {
        resultText = rec.result; // last one wins
      }
      continue;
    }
    if (rec.type === "assistant") {
      const message = rec.message as Record<string, unknown> | undefined;
      const content = message?.content;
      if (!Array.isArray(content)) continue;
      for (const block of content) {
        if (!block || typeof block !== "object") continue;
        const b = block as Record<string, unknown>;
        if (b.type === "text" && typeof b.text === "string") {
          assistantText.push(b.text);
        }
      }
    }
  }
  if (resultText !== null) return resultText;
  return assistantText.join("\n");
}

export interface TaskGrade {
  id: string;
  pass: boolean;
  selectedExpectedTool: boolean;
  calledTools: string[];
  reasons: string[];
}

// Phrases that signal the agent reported no data / could not find anything.
// Kept deliberately broad + case-insensitive so a graceful not-found is
// recognized regardless of phrasing (GT-013 can be worded many ways).
const NOT_FOUND_RE =
  /\b(not\s+found|no\s+results?|no\s+matching|no\s+candidates?|no\s+candidate\b|couldn'?t\s+(find|retrieve|locate)|could\s+not\s+(find|be\s+(found|retrieved)|retrieve)|cannot\s+find|can'?t\s+find|unable\s+to\s+(find|locate|retrieve)|nothing\s+found|zero\s+results?|0\s+results?|does\s+not\s+exist|doesn'?t\s+exist|do\s+not\s+exist|don'?t\s+exist|not\s+exist|no\s+such|invalid\s+(id|candidate)|invalid|empty|404|no\s+\w+(?:\s+\w+){0,6}?\s+exists?\b)\b/i;

// Phrases that signal a hard crash / stack trace rather than a graceful report.
const CRASH_RE = /\b(unhandled|stack\s*trace|TypeError|undefined is not|ECONNREFUSED|cannot read propert)/i;

// A name that looks like "First Last" — used to catch the agent asserting a
// specific person was found when results were empty (GT-005 false-negative).
const FOUND_PERSON_RE =
  /\b(found|here'?s|here\s+is|located|matched)\b[^.]{0,40}\b[A-Z][a-z]+\s+[A-Z][a-z]+/;

function calledToolNames(toolUses: ToolUse[]): string[] {
  return toolUses.map((t) => t.name);
}

/**
 * Grade a single golden task against the agent's actual tool calls + final
 * answer. Pure function — same inputs always yield the same verdict.
 */
export function gradeTask(
  task: GoldenTask,
  toolUses: ToolUse[],
  finalText: string,
): TaskGrade {
  const calledTools = calledToolNames(toolUses);
  const reasons: string[] = [];
  const text = (finalText || "").trim();

  // --- Tool selection -------------------------------------------------------
  let selectedExpectedTool: boolean;
  if (task.expected_tool_sequence && task.expected_tool_sequence.length > 0) {
    const missing = task.expected_tool_sequence.filter(
      (t) => !calledTools.includes(t),
    );
    selectedExpectedTool = missing.length === 0;
    if (selectedExpectedTool) {
      reasons.push(
        `all sequence tools called: ${task.expected_tool_sequence.join(" -> ")}`,
      );
    } else {
      reasons.push(`missing sequence tools: ${missing.join(", ")}`);
    }
  } else {
    selectedExpectedTool = calledTools.includes(task.expected_tool);
    reasons.push(
      selectedExpectedTool
        ? `expected tool called: ${task.expected_tool}`
        : `expected tool NOT called: ${task.expected_tool}`,
    );
  }

  const assertionType = String(task.output_assertion.type || "");
  const isWriteOp =
    assertionType === "write_op" || task.tags.includes("write");

  let pass = false;

  switch (assertionType) {
    case "non_empty": {
      const hasText = text.length > 0;
      const looksNotFound = NOT_FOUND_RE.test(text);
      const isAntiFalseNegative = task.tags.includes("anti-false-negative");
      if (isAntiFalseNegative) {
        // Anti-false-negative semantics (e.g. GT-001 email lookup): the bug we
        // hunt is the agent ASSERTING a specific found result that contradicts
        // an empty tool response. An HONEST not-found is acceptable -- the tool
        // worked and the agent did not hallucinate data. So pass if the tool
        // was called and the agent either (a) returned real data, or (b) gave
        // an honest not-found. Only FAIL when the agent both reports empty AND
        // names a specific found person (the real false-negative bug).
        const hallucinatesFound = looksNotFound && FOUND_PERSON_RE.test(text);
        pass = selectedExpectedTool && hasText && !hallucinatesFound;
        if (!hasText) reasons.push("final text is empty");
        if (hallucinatesFound)
          reasons.push(
            "FALSE NEGATIVE: asserts a specific person found while reporting empty results",
          );
        else if (pass)
          reasons.push(
            looksNotFound
              ? "honest not-found accepted (anti-false-negative: tool called, no hallucination)"
              : "non-empty data answer with expected tool",
          );
        break;
      }
      // Default non_empty: a not-found answer is a FAILURE.
      pass = selectedExpectedTool && hasText && !looksNotFound;
      if (!hasText) reasons.push("final text is empty");
      if (looksNotFound)
        reasons.push(
          "final text indicates not-found / no-results (anti-false-negative fail)",
        );
      if (pass) reasons.push("non-empty data answer with expected tool");
      break;
    }
    case "has_field": {
      // We do not have the structured tool result here, only the agent's text,
      // so grade leniently: expected tool selected + a substantive answer that
      // is not a not-found / crash report.
      const hasText = text.length > 0;
      const looksBad = NOT_FOUND_RE.test(text) || CRASH_RE.test(text);
      pass = selectedExpectedTool && hasText && !looksBad;
      if (!hasText) reasons.push("final text is empty");
      if (looksBad) reasons.push("final text reports not-found / crash");
      if (pass) reasons.push("substantive answer with expected tool");
      break;
    }
    case "tool_selection": {
      pass = selectedExpectedTool;
      if (pass) reasons.push("tool-selection-only assertion satisfied");
      break;
    }
    case "behavior_check": {
      // GT-005 name honesty. Acceptable outcomes:
      //  - agent called the tool and did NOT falsely assert a specific person
      //    was found when there were no results, OR
      //  - agent asked for an email.
      const forbidden = String(
        task.output_assertion.forbidden_behavior || "",
      );
      const looksEmpty = NOT_FOUND_RE.test(text);
      const asksForEmail = /\bemail\b/i.test(text);
      const falselyAssertsFound =
        forbidden === "assert_found_when_empty" &&
        looksEmpty &&
        FOUND_PERSON_RE.test(text);
      if (asksForEmail) {
        pass = true;
        reasons.push("agent requested an email (acceptable)");
      } else if (selectedExpectedTool && !falselyAssertsFound) {
        pass = true;
        reasons.push(
          "tool called and answer does not falsely assert found-when-empty",
        );
      } else {
        pass = false;
        if (falselyAssertsFound)
          reasons.push(
            "FALSE NEGATIVE: asserts a specific person found while reporting empty results",
          );
        if (!selectedExpectedTool)
          reasons.push("expected tool not called and no email request");
      }
      break;
    }
    case "graceful_error": {
      // GT-013. Pass if the agent reports not-found / error gracefully and did
      // not crash or hallucinate a profile.
      const crashed = CRASH_RE.test(text);
      const reportsNotFound = NOT_FOUND_RE.test(text) || /\berror\b/i.test(text);
      // Hallucinated profile heuristic: claims a found person despite the id
      // being a known non-existent one.
      const hallucinated = FOUND_PERSON_RE.test(text) && !reportsNotFound;
      pass = !crashed && reportsNotFound && !hallucinated;
      if (crashed) reasons.push("agent crashed / leaked a stack trace");
      if (!reportsNotFound)
        reasons.push("agent did not report not-found / error");
      if (hallucinated) reasons.push("agent hallucinated a profile");
      if (pass) reasons.push("graceful not-found / error report");
      break;
    }
    case "write_op": {
      // Params-only grading: pass if the expected write tool was selected with
      // plausible params. We do NOT require a real mutation here.
      const matching = toolUses.find((t) => t.name === task.expected_tool);
      const hasParams = !!matching && Object.keys(matching.input).length > 0;
      pass = selectedExpectedTool && hasParams;
      if (!matching) reasons.push("expected write tool not called");
      else if (!hasParams) reasons.push("write tool called with no params");
      if (pass) reasons.push("write tool selected with plausible params (params-only)");
      break;
    }
    default: {
      // Unknown assertion type -> fall back to tool selection only.
      pass = selectedExpectedTool;
      reasons.push(`unknown assertion type "${assertionType}" -> tool-selection-only`);
      break;
    }
  }

  if (isWriteOp) reasons.push("write task: graded params-only (no live mutation)");

  return { id: task.id, pass, selectedExpectedTool, calledTools, reasons };
}
