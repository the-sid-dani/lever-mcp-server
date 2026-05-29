import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { LeverClient } from "../lever/client.js";

export function registerUserTools(server: McpServer, client: LeverClient) {
	// Get Lever users (recruiters, hiring managers, etc.) — ported from dead index.ts 2026-05-26
	server.tool(
		"lever_get_users",
		{
			limit: z.number().default(100).describe("Maximum number of users to return (max 100)"),
			include_deactivated: z.boolean().default(false).describe("Include deactivated users"),
		},
		async (args) => {
			try {
				const allUsers: any[] = [];
				let offset: string | undefined;
				let batchesFetched = 0;
				const maxBatches = 5;

				while (batchesFetched < maxBatches) {
					const response = await client.getUsers({
						limit: 100,
						offset,
						includeDeactivated: args.include_deactivated,
					});

					if (response.data && response.data.length > 0) {
						allUsers.push(...response.data);
					}

					batchesFetched++;

					if (!response.hasNext || !response.next) break;
					offset = response.next;
				}

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								count: allUsers.length,
								users: allUsers.map((user: any) => ({
									id: user.id,
									name: user.name || "Unknown",
									email: user.email || "N/A",
									username: user.username || "",
									deactivated: !!user.deactivatedAt,
								})),
							}, null, 2),
						},
					],
				};
			} catch (error) {
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								error: error instanceof Error ? error.message : String(error),
							}),
						},
					],
				};
			}
		},
	);
}
