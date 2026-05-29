/**
 * Golden tasks for the Lever MCP eval suite.
 *
 * These are typed data, not runnable tests. They describe a representative
 * spread of user prompts mapped to the REAL Lever MCP tool registry, plus the
 * assertion that a passing run must satisfy. The layered eval harness
 * (see evals/README.md) consumes this set:
 *   - Layer 0 (schema-check.ts) only cross-checks that every expected_tool and
 *     every name in expected_tool_sequence is a registered tool.
 *   - Layers 1-3 (tool-selection, param-correctness, output-faithfulness) are
 *     mostly DEFERRED pending an LLM-judge harness + a seeded Lever test
 *     account; GT-001 / GT-005 / GT-013 are partially exercised today by the
 *     in-suite recall regression at src/__tests__/recall-regression.test.ts.
 *
 * ASCII only. No emojis.
 */

export interface GoldenTask {
  id: string;
  prompt: string;
  expected_tool: string;
  expected_params?: Record<string, unknown>;
  forbidden_params?: Record<string, unknown>;
  expected_tool_sequence?: string[];
  // Optional per-position list of acceptable tool names for a sequence task.
  // When present, position i of expected_tool_sequence is satisfied if the agent
  // called ANY tool in accept_tools[i] (not strictly expected_tool_sequence[i]).
  // Lets a step accept a legitimate alternate path without loosening the rest of
  // the sequence (VAL-510: GT-008 "full application details" via either
  // lever_get_candidate OR lever_list_applications).
  accept_tools?: string[][];
  output_assertion: { type: string; [k: string]: unknown };
  layer: number;
  tags: string[];
}

export const GOLDEN_TASKS: GoldenTask[] = [
  {
    // THE regression. A single `query` containing '@' is treated as an exact
    // server-side email match. Must never come back empty for a known email.
    id: "GT-001",
    prompt: "Find the candidate with email sarah.chen@example.com",
    expected_tool: "lever_search_candidates",
    expected_params: { query: "sarah.chen@example.com" },
    output_assertion: { type: "non_empty", field: "candidates", min_count: 1 },
    layer: 3,
    tags: ["regression", "email-lookup", "anti-false-negative"],
  },
  {
    // Name-search honesty: a name query scans the full base client-side. It may
    // legitimately return zero, but the agent must not claim "found" when empty
    // and the coverage object must report a complete sweep.
    id: "GT-005",
    prompt: "Find all candidates named Jordan Smith",
    expected_tool: "lever_search_candidates",
    output_assertion: {
      type: "behavior_check",
      forbidden_behavior: "assert_found_when_empty",
      acceptable: [
        "result_may_be_empty_but_coverage_complete",
        "agent_requests_email",
      ],
    },
    layer: 3,
    tags: ["name-search-limitation", "false-negative-detection"],
  },
  {
    id: "GT-002",
    prompt: "What roles are currently open?",
    expected_tool: "lever_list_open_roles",
    output_assertion: { type: "non_empty", field: "roles", min_count: 1 },
    layer: 3,
    tags: ["discovery", "open-roles"],
  },
  {
    id: "GT-003",
    prompt: "Get the full profile for candidate opp_abc123",
    expected_tool: "lever_get_candidate",
    expected_params: { opportunity_id: "opp_abc123" },
    output_assertion: { type: "has_field", field: "id" },
    layer: 2,
    tags: ["candidate", "read"],
  },
  {
    id: "GT-004",
    prompt: "Add a note to candidate opp_abc123: 'Strong systems design'",
    expected_tool: "lever_notes",
    expected_params: { action: "add", opportunity_id: "opp_abc123" },
    output_assertion: { type: "write_op", ci_mode: "params_only" },
    layer: 2,
    tags: ["notes", "write"],
  },
  {
    id: "GT-006",
    prompt: "Move candidate opp_abc123 to Phone Screen",
    expected_tool: "lever_update_candidate",
    expected_params: { opportunity_id: "opp_abc123" },
    output_assertion: { type: "write_op", ci_mode: "params_only" },
    layer: 2,
    tags: ["candidate", "stage-move", "write"],
  },
  {
    id: "GT-007",
    prompt: "Schedule an interview for opp_abc123 for the Senior Engineer role",
    expected_tool: "lever_manage_interview",
    expected_params: { action: "schedule" },
    output_assertion: { type: "tool_selection" },
    layer: 1,
    tags: ["interview", "write", "tool-selection"],
  },
  {
    id: "GT-008",
    prompt:
      "Find candidate sarah.chen@example.com then get her full application details",
    expected_tool: "lever_search_candidates",
    expected_tool_sequence: ["lever_search_candidates", "lever_get_candidate"],
    // Step 2 ("full application details") is legitimately fetched via either
    // lever_get_candidate OR lever_list_applications. Accept both (VAL-510).
    accept_tools: [
      ["lever_search_candidates"],
      ["lever_get_candidate", "lever_list_applications"],
    ],
    output_assertion: { type: "non_empty", field: "candidates", min_count: 1 },
    layer: 2,
    tags: ["compound", "chaining", "regression"],
  },
  {
    id: "GT-009",
    prompt: "What interview feedback exists for opp_abc123?",
    expected_tool: "lever_feedback",
    expected_params: { action: "list", opportunity_id: "opp_abc123" },
    // Per-candidate sub-resource read: a candidate may legitimately have NO
    // feedback, so empty is a VALID outcome. Grade tool FUNCTION (selection +
    // executes without a hard error), not whether this id happens to have data.
    output_assertion: { type: "tool_functioned" },
    layer: 2,
    tags: ["feedback", "read"],
  },
  {
    id: "GT-010",
    prompt: "Show archived candidates for posting post_x",
    expected_tool: "lever_archive",
    expected_params: { action: "search", posting_id: "post_x" },
    // Per-posting sub-resource read: a posting may legitimately have NO archived
    // candidates, so empty is a VALID outcome. Grade tool FUNCTION, not data
    // presence for this particular posting.
    output_assertion: { type: "tool_functioned" },
    layer: 2,
    tags: ["archive", "read"],
  },
  {
    id: "GT-011",
    prompt: "List open requisitions",
    expected_tool: "lever_requisitions",
    expected_params: { action: "list" },
    output_assertion: { type: "has_field", field: "count" },
    layer: 2,
    tags: ["requisitions", "read"],
  },
  {
    id: "GT-012",
    prompt: "List all recruiters/users in Lever",
    expected_tool: "lever_get_users",
    output_assertion: { type: "has_field", field: "count" },
    layer: 2,
    tags: ["users", "read"],
  },
  {
    // Negative path: a non-existent opportunity must fail gracefully with an
    // error payload, never a crash or a fabricated profile.
    id: "GT-013",
    prompt: "Get candidate profile for opp_DOESNOTEXIST",
    expected_tool: "lever_get_candidate",
    expected_params: { opportunity_id: "opp_DOESNOTEXIST" },
    output_assertion: { type: "graceful_error" },
    layer: 3,
    tags: ["negative", "error-handling"],
  },
];
