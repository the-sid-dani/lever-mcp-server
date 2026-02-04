/**
 * Lever MCP Tools Registration
 *
 * This module exports a function to register all Lever tools on an MCP server.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { LeverClient } from "./lever/client.js";
import type { LeverOpportunity, LeverPosting } from "./types/lever.js";
import { registerAdditionalTools, formatOpportunity } from "./additional-tools.js";
import { registerInterviewTools } from "./interview-tools.js";
import { resolveStageIdentifier } from "./utils/stage-helpers.js";

// MCP Tool Response type - needs index signature for SDK compatibility
interface McpToolResponse {
	[key: string]: unknown;
	content: Array<{ type: "text"; text: string }>;
}

// Helper to format posting data
function formatPosting(posting: LeverPosting): Record<string, unknown> {
	const location = posting.categories?.location || "Unknown";
	const team = posting.categories?.team || "Unknown";

	let ownerName = "Unassigned";
	let ownerId = "";
	if (typeof posting.owner === "object" && posting.owner) {
		ownerName = posting.owner.name || "Unknown";
		ownerId = posting.owner.id || "";
	} else if (typeof posting.owner === "string") {
		ownerId = posting.owner;
		ownerName = `User ID: ${posting.owner}`;
	}

	let hiringManagerName = "Unassigned";
	let hiringManagerId = "";
	if (typeof posting.hiringManager === "object" && posting.hiringManager) {
		hiringManagerName = posting.hiringManager.name || "Unknown";
		hiringManagerId = posting.hiringManager.id || "";
	} else if (typeof posting.hiringManager === "string") {
		hiringManagerId = posting.hiringManager;
		hiringManagerName = `User ID: ${posting.hiringManager}`;
	}

	return {
		id: posting.id || "",
		title: posting.text || "Unknown",
		state: posting.state || "Unknown",
		location,
		team,
		posting_owner: { id: ownerId, name: ownerName },
		hiring_manager: { id: hiringManagerId, name: hiringManagerName },
		url: posting.urls?.show || "",
	};
}

// Tracing wrapper for tool execution
function trace(toolName: string, message: string, data?: unknown) {
	const traceId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
	console.log(`[TOOL ${traceId}] ${toolName}: ${message}`, data ? JSON.stringify(data).substring(0, 200) : "");
}

/**
 * Register all Lever tools on the given MCP server
 */
export function registerAllTools(server: McpServer, apiKey: string): void {
	const client = new LeverClient(apiKey);

	console.log("Registering Lever tools...");

	// Register search tools
	registerSearchTools(server, client);

	// Register candidate tools
	registerCandidateTools(server, client);

	// Register utility tools
	registerUtilityTools(server, client);

	// Register additional tools (from additional-tools.ts)
	registerAdditionalTools(server, client);

	// Register interview tools (from interview-tools.ts)
	registerInterviewTools(server, client);

	console.log("All Lever tools registered successfully");
}

/**
 * Register search-related tools
 */
function registerSearchTools(server: McpServer, client: LeverClient): void {
	server.tool(
		"lever_advanced_search",
		"Search for candidates with advanced filters including company, skills, location, stage, and tags",
		{
			companies: z.string().optional().describe("Comma-separated company names"),
			skills: z.string().optional().describe("Comma-separated skills to search for"),
			locations: z.string().optional().describe("Comma-separated locations"),
			stage: z.string().optional().describe("Stage ID to filter by"),
			tags: z.string().optional().describe("Comma-separated tags"),
			posting_id: z.string().optional().describe("Filter by posting ID"),
			limit: z.number().default(50).describe("Results per page"),
			page: z.number().default(1).describe("Page number"),
			stages: z.array(z.string()).optional().describe("Stage names to filter by"),
			name: z.string().optional().describe("Candidate name search"),
			email: z.string().optional().describe("Exact email match"),
			archived: z.boolean().default(false).describe("Include archived candidates"),
			mode: z.enum(["comprehensive", "quick"]).default("comprehensive").describe("Search mode"),
		},
		async (params): Promise<McpToolResponse> => {
			trace("lever_advanced_search", "START", params);
			const startTime = Date.now();

			try {
				// Parse search criteria
				const companyList = params.companies
					? params.companies.split(",").map((c: string) => c.trim().toLowerCase())
					: [];
				const skillList = params.skills
					? params.skills.split(",").map((s: string) => s.trim().toLowerCase())
					: [];
				const locationList = params.locations
					? params.locations.split(",").map((l: string) => l.trim().toLowerCase())
					: [];
				const tagList = params.tags
					? params.tags.split(",").map((t: string) => t.trim().toLowerCase())
					: [];

				const stageList = params.stages || [];
				const nameSearch = params.name?.toLowerCase();
				const emailSearch = params.email?.toLowerCase();

				// Resolve stage names to IDs
				let stageIds: string[] = [];
				if (stageList.length > 0) {
					try {
						stageIds = await resolveStageIdentifier(client, stageList);
					} catch (error) {
						console.warn("Failed to resolve stage names:", error);
					}
				}

				const allCandidates: LeverOpportunity[] = [];
				let offset: string | undefined;
				const maxFetch = params.mode === "quick" ? Math.min(params.limit * 3, 500) : Math.min(params.limit * 10, 5000);

				// Fetch candidates with pagination
				while (allCandidates.length < maxFetch) {
					const searchParams: Record<string, unknown> = {
						limit: 100,
						offset,
					};

					if (emailSearch) searchParams.email = params.email;
					if (stageIds.length > 0) searchParams.stage_id = stageIds[0];
					else if (params.stage) searchParams.stage_id = params.stage;
					if (params.posting_id) searchParams.posting_id = params.posting_id;
					if (params.tags) searchParams.tag = params.tags.split(",")[0];

					const response = await client.getOpportunities(searchParams as Parameters<typeof client.getOpportunities>[0]);

					if (!response?.data?.length) break;

					// Filter candidates
					const filtered = response.data.filter((c: LeverOpportunity) => {
						if (!c) return false;

						const cName = (c.name || "").toLowerCase();
						const cEmails = (c.emails || []).map((e: string) => e.toLowerCase());
						const cTags = (c.tags || []).map((t: string) => t.toLowerCase());
						const cLocation = (c.location || "").toLowerCase();
						const cHeadline = (c.headline || "").toLowerCase();

						if (nameSearch && !cName.includes(nameSearch)) return false;
						if (emailSearch && !cEmails.includes(emailSearch)) return false;
						if (companyList.length && !companyList.some((comp: string) => cHeadline.includes(comp))) return false;
						if (skillList.length && !skillList.some((skill: string) => `${cName} ${cTags.join(" ")} ${cHeadline}`.includes(skill))) return false;
						if (locationList.length && !locationList.some((loc: string) => cLocation.includes(loc))) return false;
						if (tagList.length && !tagList.some((tag: string) => cTags.some((ct: string) => ct.includes(tag)))) return false;

						return true;
					});

					allCandidates.push(...filtered);

					if (!response.hasNext || !response.next) break;
					offset = response.next;
				}

				// Paginate results
				const startIdx = (params.page - 1) * params.limit;
				const pageResults = allCandidates.slice(startIdx, startIdx + params.limit);

				trace("lever_advanced_search", `SUCCESS (${Date.now() - startTime}ms)`, { total: allCandidates.length });

				return {
					content: [{
						type: "text",
						text: JSON.stringify({
							total_matches: allCandidates.length,
							page: params.page,
							limit: params.limit,
							results: pageResults.map(formatOpportunity),
						}, null, 2),
					}],
				};
			} catch (error) {
				trace("lever_advanced_search", `ERROR (${Date.now() - startTime}ms)`, error);
				return {
					content: [{
						type: "text",
						text: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
					}],
				};
			}
		}
	);
}

/**
 * Register candidate-related tools
 */
function registerCandidateTools(server: McpServer, client: LeverClient): void {
	server.tool(
		"lever_get_candidate",
		"Get detailed information about a specific candidate",
		{
			opportunity_id: z.string().describe("The opportunity/candidate ID"),
		},
		async (params): Promise<McpToolResponse> => {
			trace("lever_get_candidate", "START", params);

			try {
				const response = await client.getOpportunity(params.opportunity_id);

				if (!response?.data) {
					return {
						content: [{
							type: "text",
							text: JSON.stringify({ error: `Candidate ${params.opportunity_id} not found` }),
						}],
					};
				}

				return {
					content: [{
						type: "text",
						text: JSON.stringify(formatOpportunity(response.data), null, 2),
					}],
				};
			} catch (error) {
				return {
					content: [{
						type: "text",
						text: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
					}],
				};
			}
		}
	);

	server.tool(
		"lever_add_note",
		"Add a note to a candidate's profile",
		{
			opportunity_id: z.string().describe("The opportunity/candidate ID"),
			note: z.string().describe("The note content"),
			author_email: z.string().optional().describe("Email of the note author"),
		},
		async (params): Promise<McpToolResponse> => {
			trace("lever_add_note", "START", params);

			try {
				const result = await client.addNote(params.opportunity_id, params.note, params.author_email);

				return {
					content: [{
						type: "text",
						text: JSON.stringify({ success: true, message: "Note added successfully", data: result }, null, 2),
					}],
				};
			} catch (error) {
				return {
					content: [{
						type: "text",
						text: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
					}],
				};
			}
		}
	);

	// lever_archive_candidate is in additional-tools.ts with enhanced parameters
}

/**
 * Register utility tools
 */
function registerUtilityTools(server: McpServer, client: LeverClient): void {
	server.tool(
		"lever_list_open_roles",
		"List all open job postings",
		{
			expand_owners: z.boolean().default(true).describe("Include posting owner and hiring manager details"),
		},
		async (params): Promise<McpToolResponse> => {
			trace("lever_list_open_roles", "START", params);

			try {
				const expandFields = params.expand_owners ? ["owner", "hiringManager"] : [];
				const response = await client.getPostings("published", 50, undefined, expandFields);

				return {
					content: [{
						type: "text",
						text: JSON.stringify({
							count: response.data.length,
							hasMore: response.hasNext || false,
							includes_owner_data: params.expand_owners,
							roles: response.data.map(formatPosting),
						}, null, 2),
					}],
				};
			} catch (error) {
				return {
					content: [{
						type: "text",
						text: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
					}],
				};
			}
		}
	);

	server.tool(
		"lever_get_stages",
		"Get all pipeline stages",
		{},
		async (): Promise<McpToolResponse> => {
			trace("lever_get_stages", "START");

			const stages = await client.getStages();
			return {
				content: [{
					type: "text",
					text: JSON.stringify(stages, null, 2),
				}],
			};
		}
	);

	server.tool(
		"lever_get_archive_reasons",
		"Get all archive reasons",
		{},
		async (): Promise<McpToolResponse> => {
			trace("lever_get_archive_reasons", "START");

			const reasons = await client.getArchiveReasons();
			return {
				content: [{
					type: "text",
					text: JSON.stringify(reasons, null, 2),
				}],
			};
		}
	);

	server.tool(
		"lever_find_postings_by_owner",
		"Find job postings by owner name or ID",
		{
			owner_name: z.string().optional().describe("Name of the posting owner (partial match)"),
			owner_id: z.string().optional().describe("Owner ID"),
			state: z.enum(["published", "closed", "draft", "pending", "rejected"]).default("published"),
			limit: z.number().default(50),
		},
		async (params): Promise<McpToolResponse> => {
			trace("lever_find_postings_by_owner", "START", params);

			try {
				if (!params.owner_name && !params.owner_id) {
					return {
						content: [{
							type: "text",
							text: JSON.stringify({ error: "Either owner_name or owner_id is required" }),
						}],
					};
				}

				let postings: LeverPosting[];

				if (params.owner_name) {
					const response = await client.getPostingsByOwner(params.owner_name, params.state);
					postings = response.data;
				} else {
					const response = await client.getPostings(params.state, params.limit, undefined, ["owner"]);
					postings = response.data.filter((p: LeverPosting) => {
						const ownerId = typeof p.owner === "object" ? p.owner?.id : p.owner;
						return ownerId === params.owner_id;
					});
				}

				return {
					content: [{
						type: "text",
						text: JSON.stringify({
							count: postings.length,
							postings: postings.slice(0, params.limit).map(formatPosting),
						}, null, 2),
					}],
				};
			} catch (error) {
				return {
					content: [{
						type: "text",
						text: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
					}],
				};
			}
		}
	);
}
