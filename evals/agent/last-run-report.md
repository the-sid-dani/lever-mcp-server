# Agent-eval run report

- Timestamp: 2026-05-30T00:34:18.647Z
- MCP_URL: http://localhost:8095/mcp
- Mode: LIVE (claude invoked)
- Writes included: no
- Summary: 10/10 passed

## Per-task results

| id | pass | expected_tool | called tools | reasons |
|----|------|---------------|--------------|---------|
| GT-002 | PASS | lever_list_open_roles | ToolSearch, lever_list_open_roles | expected tool called: lever_list_open_roles; non-empty data answer with expected tool |
| GT-005 | PASS | lever_search_candidates | ToolSearch, lever_search_candidates | expected tool called: lever_search_candidates; tool called and answer does not falsely assert found-when-empty |
| GT-011 | PASS | lever_requisitions | ToolSearch, lever_requisitions, Bash, Read, Grep | expected tool called: lever_requisitions; substantive answer with expected tool |
| GT-012 | PASS | lever_get_users | ToolSearch, lever_get_users | expected tool called: lever_get_users; substantive answer with expected tool |
| GT-013 | PASS | lever_get_candidate | ToolSearch, lever_get_candidate | expected tool called: lever_get_candidate; graceful not-found / error report |
| GT-001 | PASS | lever_search_candidates | ToolSearch, lever_search_candidates | expected tool called: lever_search_candidates; non-empty data answer with expected tool |
| GT-003 | PASS | lever_get_candidate | ToolSearch, lever_get_candidate | expected tool called: lever_get_candidate; substantive answer with expected tool |
| GT-008 | PASS | lever_search_candidates -> lever_get_candidate | lever_search_candidates, lever_advanced_search, lever_list_applications, lever_list_applications, lever_get_candidate | all sequence tools called: lever_search_candidates -> (lever_get_candidate/lever_list_applications); non-empty data answer with expected tool |
| GT-009 | PASS | lever_feedback | ToolSearch, lever_feedback | expected tool called: lever_feedback; tool functioned (expected tool called, no hard error; honest-empty accepted) |
| GT-010 | PASS | lever_archive | ToolSearch, lever_archive | expected tool called: lever_archive; tool functioned (expected tool called, no hard error; honest-empty accepted) |

## Prompts

- **GT-002**: What roles are currently open?
- **GT-005**: Find all candidates named Jordan Smith
- **GT-011**: List open requisitions
- **GT-012**: List all recruiters/users in Lever
- **GT-013**: Get candidate profile for opp_DOESNOTEXIST
- **GT-001**: Find the candidate with email artur.kraskov@protonmail.com
- **GT-003**: Get the full profile for candidate ebd32bcd-82cc-4811-8e09-efeb001495d2
- **GT-008**: Find candidate artur.kraskov@protonmail.com then get her full application details
- **GT-009**: What interview feedback exists for ebd32bcd-82cc-4811-8e09-efeb001495d2?
- **GT-010**: Show archived candidates for posting ca5373af-213e-44ef-af2c-471bdff8c70f
