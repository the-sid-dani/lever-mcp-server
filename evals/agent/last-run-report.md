# Agent-eval run report

- Timestamp: 2026-05-29T21:49:12.755Z
- MCP_URL: http://localhost:8095/mcp
- Mode: OFF (no model)
- Writes included: no
- Summary: 0/10 passed

## Per-task results

| id | pass | expected_tool | called tools | reasons |
|----|------|---------------|--------------|---------|
| GT-001 | FAIL | lever_search_candidates | (none) | skipped: live mode off |
| GT-005 | FAIL | lever_search_candidates | (none) | skipped: live mode off |
| GT-002 | FAIL | lever_list_open_roles | (none) | skipped: live mode off |
| GT-003 | FAIL | lever_get_candidate | (none) | skipped: live mode off |
| GT-008 | FAIL | lever_search_candidates -> lever_get_candidate | (none) | skipped: live mode off |
| GT-009 | FAIL | lever_feedback | (none) | skipped: live mode off |
| GT-010 | FAIL | lever_archive | (none) | skipped: live mode off |
| GT-011 | FAIL | lever_requisitions | (none) | skipped: live mode off |
| GT-012 | FAIL | lever_get_users | (none) | skipped: live mode off |
| GT-013 | FAIL | lever_get_candidate | (none) | skipped: live mode off |

## Prompts

- **GT-001**: Find the candidate with email sarah.chen@example.com
- **GT-005**: Find all candidates named Jordan Smith
- **GT-002**: What roles are currently open?
- **GT-003**: Get the full profile for candidate opp_abc123
- **GT-008**: Find candidate sarah.chen@example.com then get her full application details
- **GT-009**: What interview feedback exists for opp_abc123?
- **GT-010**: Show archived candidates for posting post_x
- **GT-011**: List open requisitions
- **GT-012**: List all recruiters/users in Lever
- **GT-013**: Get candidate profile for opp_DOESNOTEXIST
