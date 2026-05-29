import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { LeverClient } from "../lever/client.js";

export function registerStageTools(server: McpServer, client: LeverClient) {
	// lever_stages — consolidated (replaces lever_get_stages + lever_get_stage_history)
	server.tool(
		"lever_stages",
		"Read pipeline stage data. Use action='list' to fetch all pipeline stages org-wide (returns stage IDs and names), or action='history' to fetch the stage-change history for a single opportunity (returns stage IDs only — cross-reference with action='list' to resolve names).",
		{
			action: z.enum(["list", "history"]).describe(
				"Operation to perform. list=fetch all pipeline stages; history=stage-change events for a specific opportunity_id."
			),
			opportunity_id: z.string().optional().describe("For action='history' only — opportunity ID to fetch stage history for."),
		},
		async (args) => {
			try {
				switch (args.action) {
					case "list": {
						const stages = await client.getStages();
						return {
							content: [{ type: "text", text: JSON.stringify(stages, null, 2) }],
						};
					}
					case "history": {
						if (!args.opportunity_id) throw new Error("opportunity_id is required for action='history'");
						const response = await client.getOpportunity(args.opportunity_id);
						const opp: any = response.data || {};
						const stageChanges: any[] = Array.isArray(opp.stageChanges) ? opp.stageChanges : [];
						return {
							content: [{
								type: "text",
								text: JSON.stringify({
									opportunity_id: args.opportunity_id,
									count: stageChanges.length,
									note: "stageChanges returns stage IDs only. Resolve to names via lever_stages(action='list') if needed.",
									stage_history: stageChanges.map((change: any) => ({
										stageId: change.toStageId || change.stageId || null,
										fromStageId: change.fromStageId || null,
										userId: change.userId || null,
										updatedAt: change.updatedAt || null,
									})),
								}, null, 2),
							}],
						};
					}
					default:
						throw new Error(`Unknown action: ${(args as any).action}`);
				}
			} catch (error) {
				return {
					content: [{ type: "text", text: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }) }],
				};
			}
		},
	);
}
