import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { LeverClient } from "../lever/client.js";
import type { LeverOpportunity } from "../types/lever.js";
import { resolveSingleStageIdentifier } from "../utils/stage-helpers.js";
import { formatOpportunity } from "./formatters.js";

export function registerSearchTools(server: McpServer, client: LeverClient) {
	// Basic search tool
	server.tool(
		"lever_search_candidates",
		{
			query: z.string().optional().describe("Search query for name or email"),
			stage_name: z.string().optional().describe("Stage name (not ID)"),
			posting_id: z.string().optional().describe("Filter by specific posting"),
			limit: z.number().default(200),
			page: z.number().default(1).describe("Page number (1-based)"),
		},
		async (args) => {
			try {
				// Resolve stage name to ID if provided
				let stageId: string | undefined;
				if (args.stage_name) {
					try {
						stageId = await resolveSingleStageIdentifier(client, args.stage_name);
					} catch (error) {
						return {
							content: [
								{
									type: "text",
									text: JSON.stringify({
										error: `Invalid stage name: ${args.stage_name}. ${error instanceof Error ? error.message : String(error)}`,
									}),
								},
							],
						};
					}
				}

				// Check if query looks like an email
				let emailFilter: string | undefined;
				if (args.query && args.query.includes("@")) {
					emailFilter = args.query;
				}

				if (emailFilter) {
					// Use email search
					const response = await client.getOpportunities({
						email: emailFilter,
						stage_id: stageId,
						posting_id: args.posting_id,
						limit: args.limit,
					});

					return {
						content: [
							{
								type: "text",
								text: JSON.stringify(
									{
										count: response.data.length,
										query: args.query,
										candidates: response.data.map(formatOpportunity),
									},
									null,
									2,
								),
							},
						],
					};
				} else if (args.query) {
					// For name searches, fetch and filter locally
					const allOpportunities: LeverOpportunity[] = [];
					let offset: string | undefined;
					let pagesChecked = 0;
					const maxPages = 5; // Increased to check more candidates
					const queryLower = args.query.toLowerCase();
					const maxFetch = args.limit * 5; // Fetch more to ensure we have enough for pagination

					while (
						pagesChecked < maxPages &&
						allOpportunities.length < maxFetch
					) {
						const response = await client.getOpportunities({
							stage_id: stageId,
							posting_id: args.posting_id,
							limit: 100,
							offset,
						});

						if (!response.data || response.data.length === 0) break;

						// Filter candidates by name
						for (const c of response.data) {
							const name = (c.name || "").toLowerCase();
							if (queryLower && name.includes(queryLower)) {
								allOpportunities.push(c);
							}
						}

						pagesChecked++;
						if (!response.hasNext || !response.next) break;

						// Use the next token from the API response
						offset = response.next;
					}

					// Calculate pagination
					const page = Math.max(1, args.page);
					const startIndex = (page - 1) * args.limit;
					const endIndex = startIndex + args.limit;
					const paginatedCandidates = allOpportunities.slice(
						startIndex,
						endIndex,
					);
					const totalPages = Math.ceil(allOpportunities.length / args.limit);
					const hasMore = page < totalPages;

					const result: any = {
						count: paginatedCandidates.length,
						page: page,
						total_matches: allOpportunities.length,
						total_pages: totalPages,
						has_more: hasMore,
						next_page: hasMore ? page + 1 : null,
						query: args.query,
						candidates: paginatedCandidates.map(formatOpportunity),
					};

					// Add warning if we hit the limit
					if (pagesChecked >= maxPages && hasMore) {
						result.warning = `Search limited to first ${pagesChecked * 100} candidates. More results may exist.`;
						result.total_scanned = pagesChecked * 100;
					}

					return {
						content: [
							{
								type: "text",
								text: JSON.stringify(result, null, 2),
							},
						],
					};
				} else {
					// No search criteria, just get candidates
					const response = await client.getOpportunities({
						stage_id: stageId,
						posting_id: args.posting_id,
						limit: args.limit,
					});

					return {
						content: [
							{
								type: "text",
								text: JSON.stringify(
									{
										count: response.data.length,
										query: args.query,
										candidates: response.data.map(formatOpportunity),
									},
									null,
									2,
								),
							},
						],
					};
				}
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
