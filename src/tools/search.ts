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
		"Search candidates by name or email; an email query is an exact server-side match (fast, one call), while a name query scans the full candidate base client-side (Lever has no server-side name filter) so it is complete but slower; check the response coverage object.",
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
				if (args.query?.includes("@")) {
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
				}
				if (args.query) {
					// For name searches, fetch and filter locally.
					// VAL-102: sweep the FULL base to hasNext:false (no maxPages /
					// maxFetch caps) so no candidate is silently dropped. The client
					// token bucket serializes requests + handles 429 backoff, so
					// sequential awaits here are correct (no added delay/concurrency).
					const allOpportunities: LeverOpportunity[] = [];
					let offset: string | undefined;
					let pagesScanned = 0;
					let recordsScanned = 0;
					let sawLastPage = false;
					const queryLower = args.query.toLowerCase();

					while (true) {
						const response = await client.getOpportunities({
							stage_id: stageId,
							posting_id: args.posting_id,
							limit: 100,
							offset,
						});

						if (!response.data || response.data.length === 0) break;

						// Filter candidates by name
						for (const c of response.data) {
							recordsScanned++;
							const name = (c.name || "").toLowerCase();
							if (queryLower && name.includes(queryLower)) {
								allOpportunities.push(c);
							}
						}

						pagesScanned++;
						// VAL-504: API-terminal page reached -- the sweep is honest.
						if (!response.hasNext || !response.next) {
							sawLastPage = true;
							break;
						}

						// VAL-504: non-advancing cursor guard. A stuck cursor would
						// otherwise loop forever; break defensively (sawLastPage stays
						// false -- the sweep may be partial, so coverage is not complete).
						if (response.next === offset) break;

						// Use the next token from the API response
						offset = response.next;
					}

					// Calculate pagination
					const page = Math.max(1, args.page);
					const startIndex = (page - 1) * args.limit;
					const endIndex = startIndex + args.limit;
					const paginatedCandidates = allOpportunities.slice(startIndex, endIndex);
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
						// VAL-504: coverage is DERIVED -- complete only if the sweep
						// reached the API's last page (hasNext:false). A defensive
						// stuck-cursor break leaves this false (honest, possibly partial).
						coverage: {
							records_scanned: recordsScanned,
							pages_scanned: pagesScanned,
							complete: sawLastPage,
						},
					};

					return {
						content: [
							{
								type: "text",
								text: JSON.stringify(result, null, 2),
							},
						],
					};
				}
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
