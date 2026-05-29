import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { LeverClient } from "./lever/client.js";

import { registerSearchTools } from "./tools/search.js";
import { registerCandidateTools } from "./tools/candidates.js";
import { registerRequisitionTools } from "./tools/requisitions.js";
import { registerArchiveTools } from "./tools/archive.js";
import { registerUserTools } from "./tools/users.js";
import { registerNoteTools } from "./tools/notes.js";
import { registerFeedbackTools } from "./tools/feedback.js";
import { registerStageTools } from "./tools/stages.js";

// Re-export shared formatter for backwards-compatible imports.
export { formatOpportunity } from "./tools/formatters.js";

/**
 * Aggregator for the domain-split tool modules under src/tools/.
 *
 * Receives the SINGLE shared LeverClient (the rate-limit token bucket lives on
 * that instance) and fans it out to each domain's register function. All domain
 * modules share the same client instance — no per-module LeverClient is created.
 */
export function registerAdditionalTools(
	server: McpServer,
	client: LeverClient,
) {
	registerSearchTools(server, client);
	registerCandidateTools(server, client);
	registerRequisitionTools(server, client);
	registerArchiveTools(server, client);
	registerUserTools(server, client);
	registerNoteTools(server, client);
	registerFeedbackTools(server, client);
	registerStageTools(server, client);
}
