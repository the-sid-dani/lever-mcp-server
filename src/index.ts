import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { LeverClient } from "./lever/client";
import type { LeverOpportunity, LeverPosting } from "./types/lever";
import { registerAdditionalTools } from "./additional-tools";
import { registerInterviewTools } from "./interview-tools";
import { resolveStageIdentifier } from "./utils/stage-helpers";

// Environment interface
interface Env {
	LEVER_API_KEY: string;
}

// Helper to format opportunity data
function formatOpportunity(opp: LeverOpportunity): Record<string, any> {
	if (!opp || typeof opp !== "object") {
		return {
			id: "",
			name: "Error: Invalid data",
			email: "N/A",
			stage: "Unknown",
			posting: "Unknown",
			location: "Unknown",
			organizations: "",
			created: "Unknown",
		};
	}

	const name = opp.name || "Unknown";
	const emails = opp.emails || [];
	const email = emails[0] || "N/A";

	const stageText =
		typeof opp.stage === "object" && opp.stage
			? opp.stage.text
			: String(opp.stage || "Unknown");

	const postingText =
		opp.posting && typeof opp.posting === "object"
			? opp.posting.text
			: "Unknown";

	// Location is a string in the API, not an object
	const location = opp.location || "Unknown";

	const createdDate = opp.createdAt
		? new Date(opp.createdAt).toISOString().split("T")[0]
		: "Unknown";

	return {
		id: opp.id || "",
		name,
		email,
		stage: stageText,
		posting: postingText,
		location,
		organizations: opp.headline || "",
		created: createdDate,
	};
}

// Helper to format posting data
function formatPosting(posting: LeverPosting): Record<string, any> {
	// Access location and team from categories object as per API docs
	const location = posting.categories?.location || "Unknown";
	const team = posting.categories?.team || "Unknown";
	
	// Format owner information
	let ownerName = "Unassigned";
	let ownerId = "";
	if (typeof posting.owner === "object" && posting.owner) {
		ownerName = posting.owner.name || "Unknown";
		ownerId = posting.owner.id || "";
	} else if (typeof posting.owner === "string") {
		ownerId = posting.owner;
		ownerName = `User ID: ${posting.owner}`;
	}
	
	// Format hiring manager
	let hiringManagerName = "Unassigned";
	let hiringManagerId = "";
	if (typeof posting.hiringManager === "object" && posting.hiringManager) {
		hiringManagerName = posting.hiringManager.name || "Unknown";
		hiringManagerId = posting.hiringManager.id || "";
	} else if (typeof posting.hiringManager === "string") {
		hiringManagerId = posting.hiringManager;
		hiringManagerName = `User ID: ${posting.hiringManager}`;
	}
	
	// Format created date
	const createdDate = posting.createdAt
		? new Date(posting.createdAt).toISOString().split("T")[0]
		: "Unknown";
	
	return {
		id: posting.id || "",
		title: posting.text || "Unknown",
		state: posting.state || "Unknown",
		location: location,
		team: team,
		// Add owner and people information
		posting_owner: {
			id: ownerId,
			name: ownerName,
		},
		hiring_manager: {
			id: hiringManagerId,
			name: hiringManagerName,
		},
		// Add additional useful fields
		workplace_type: posting.workplaceType || "unspecified",
		commitment: posting.categories?.commitment || "Unknown",
		department: posting.categories?.department || "Unknown",
		created_date: createdDate,
		url: posting.urls?.show || "",
		apply_url: posting.urls?.apply || "",
	};
}

// Define our Lever MCP agent
export class LeverMCP extends McpAgent {
	server = new McpServer({
		name: "Lever ATS",
		version: "1.0.0",
	});

	private client!: LeverClient;
	private toolsRegistered = false; // Guard against double registration
	private requestId = 0; // For tracing

	// Generate a unique trace ID for each request
	private generateTraceId(): string {
		this.requestId++;
		return `${Date.now()}-${this.requestId}-${Math.random().toString(36).substring(7)}`;
	}

	// Log with trace context
	private trace(traceId: string, message: string, data?: any) {
		const timestamp = new Date().toISOString();
		console.log(`[TRACE ${traceId}] [${timestamp}] ${message}`, data ? JSON.stringify(data) : '');
	}

	// Override onMessage to trace all incoming MCP messages
	async onMessage(message: any, session: any) {
		const traceId = this.generateTraceId();
		
		// Log ALL incoming messages to catch ghost tools
		console.log(`[MCP-MESSAGE ${traceId}] Incoming:`, JSON.stringify({
			method: message.method,
			params: message.params,
			id: message.id
		}));

		// Special logging for tool calls
		if (message.method === 'tools/call') {
			console.log(`[GHOST-DETECTOR ${traceId}] Tool call requested:`, {
				toolName: message.params?.name,
				toolArgs: message.params?.arguments,
				allRegisteredTools: Object.keys((this.server as any)._tools || {})
			});
			
			// Check if this tool exists
			const tools = (this.server as any)._tools || {};
			const toolExists = message.params?.name && tools[message.params.name];
			
			if (!toolExists) {
				console.error(`[GHOST-TOOL-FOUND ${traceId}] Ghost tool detected! Tool '${message.params?.name}' not in registered tools:`, Object.keys(tools));
			}
		}

		// Special logging for tools list to see what Claude receives
		if (message.method === 'tools/list') {
			console.log(`[TOOLS-LIST ${traceId}] Claude is requesting tool list`);
		}

		// Call parent handler
		try {
			const result: any = await super.onMessage(message, session);
			
			// Log the tools being sent to Claude
			if (message.method === 'tools/list' && result?.tools) {
				console.log(`[TOOLS-LIST ${traceId}] Sending ${result.tools.length} tools to Claude:`, 
					result.tools.map((t: any) => t.name));
			}
			
			console.log(`[MCP-MESSAGE ${traceId}] Response:`, JSON.stringify(result).substring(0, 200));
			return result;
		} catch (error) {
			console.error(`[MCP-MESSAGE ${traceId}] Error:`, error);
			throw error;
		}
	}

	// Wrapper for tool execution with tracing
	private wrapToolWithTrace(toolName: string, handler: (args: any) => Promise<any>) {
		return async (args: any) => {
			const traceId = this.generateTraceId();
			const startTime = Date.now();
			
			this.trace(traceId, "TOOL_START", { 
				tool: toolName, 
				args: JSON.stringify(args).substring(0, 200) // Limit arg logging
			});
			
			try {
				const result = await handler(args);
				const duration = Date.now() - startTime;
				
				this.trace(traceId, "TOOL_SUCCESS", { 
					tool: toolName, 
					duration_ms: duration,
					result_preview: JSON.stringify(result).substring(0, 100)
				});
				
				return result;
			} catch (error) {
				const duration = Date.now() - startTime;
				
				this.trace(traceId, "TOOL_ERROR", { 
					tool: toolName, 
					duration_ms: duration,
					error: error instanceof Error ? error.message : String(error),
					stack: error instanceof Error ? error.stack : undefined
				});
				
				throw error;
			}
		};
	}

	async init() {
		const traceId = this.generateTraceId();
		this.trace(traceId, "INIT_START", { toolsRegistered: this.toolsRegistered });
		
		// Check if tools are already registered
		if (this.toolsRegistered) {
			console.warn("⚠️ TOOLS ALREADY REGISTERED - SKIPPING REGISTRATION TO PREVENT GHOSTS");
			this.trace(traceId, "INIT_SKIPPED", { reason: "tools_already_registered" });
			return;
		}
		
		try {
			// Initialize Lever client with API key from environment
			const env = this.env as Env;
			const apiKey = env.LEVER_API_KEY;
			if (!apiKey) {
				this.trace(traceId, "INIT_ERROR", { error: "LEVER_API_KEY not found" });
				throw new Error("LEVER_API_KEY environment variable is required");
			}
			this.trace(traceId, "INIT_CLIENT", { hasApiKey: true });
			this.client = new LeverClient(apiKey);

			// Register all Lever tools
			this.trace(traceId, "REGISTER_TOOLS_START");
			this.registerSearchTools();
			this.trace(traceId, "REGISTER_TOOLS", { phase: "search_tools_complete" });
			
			this.registerCandidateTools();
			this.trace(traceId, "REGISTER_TOOLS", { phase: "candidate_tools_complete" });
			
			this.registerUtilityTools();
			this.trace(traceId, "REGISTER_TOOLS", { phase: "utility_tools_complete" });

			// Register additional tools to complete the set of 16
			registerAdditionalTools(this.server, this.client);
			this.trace(traceId, "REGISTER_TOOLS", { phase: "additional_tools_complete" });
			
			// Register interview tools
			registerInterviewTools(this.server, this.client);
			this.trace(traceId, "REGISTER_TOOLS", { phase: "interview_tools_complete" });
			
			// Mark tools as registered
			this.toolsRegistered = true;
			console.log("✅ Tools registered successfully");
			this.trace(traceId, "INIT_COMPLETE", { success: true });
		} catch (error) {
			this.trace(traceId, "INIT_ERROR", { 
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined
			});
			throw error;
		}
	}

	private registerSearchTools() {
		// Advanced search tool
		this.server.tool(
			"lever_advanced_search",
			{
				companies: z.string().optional(),
				skills: z.string().optional(),
				locations: z.string().optional(),
				stage: z.string().optional(),
				tags: z.string().optional(),
				posting_id: z.string().optional(),
				limit: z.number().default(50).describe("Results per page (recommended: 20-50 for broad searches)"),
				page: z.number().default(1).describe("Page number (1-based)"),
				// New enhanced parameters
				stages: z.array(z.string()).optional().describe("Stage names to filter by"),
				stage_contains: z.string().optional().describe("Find stages containing this text"),
				name: z.string().optional().describe("Candidate name search"),
				email: z.string().optional().describe("Exact email match"),
				current_company_only: z.boolean().optional().default(false),
				archived: z.boolean().optional().default(false).describe("Include archived candidates"),
				created_after: z.string().optional().describe("Filter by creation date (ISO format)"),
				mode: z.enum(["comprehensive", "quick"]).default("comprehensive").describe("Search mode"),
			},
			this.wrapToolWithTrace("lever_advanced_search", async (args) => {
				try {
					// Parse search criteria
					const companyList = args.companies
						? args.companies.split(",").map((c: string) => c.trim().toLowerCase())
						: [];
					const skillList = args.skills
						? args.skills.split(",").map((s: string) => s.trim().toLowerCase())
						: [];
					const locationList = args.locations
						? args.locations.split(",").map((l: string) => l.trim().toLowerCase())
						: [];
					const tagList = args.tags
						? args.tags.split(",").map((t: string) => t.trim().toLowerCase())
						: [];

					// Parse new enhanced parameters
					const stageList = args.stages || [];
					const nameSearch = args.name?.toLowerCase();
					const emailSearch = args.email?.toLowerCase();

					// Resolve stage names to IDs if needed
					let stageIds: string[] = [];
					if (stageList.length > 0) {
						try {
							stageIds = await resolveStageIdentifier(this.client, stageList);
						} catch (error) {
							console.warn("Failed to resolve some stage names:", error);
						}
					}

					// Handle stage_contains by getting all stages
					let stageContainsIds: string[] = [];
					if (args.stage_contains) {
						try {
							const stages = await this.client.getStages();
							stageContainsIds = stages.data
								.filter((s: any) => s.text.toLowerCase().includes(args.stage_contains!.toLowerCase()))
								.map((s: any) => s.id);
						} catch (error) {
							console.warn("Failed to fetch stages for stage_contains:", error);
						}
					}

					const allCandidates: LeverOpportunity[] = [];
					let offset: string | undefined;
					// Updated for Cloudflare's paid plan with 1000 subrequest limit
					// Each API call counts as a subrequest, and we fetch 100 candidates per call
					// We can make up to 900 API calls (leaving 100 for other operations)
					// In quick mode, limit to 5 batches (500 candidates max)
					const maxFetch = args.mode === "quick" 
						? Math.min(args.limit * 3, 500) 
						: Math.min(args.limit * 10, 10000, 90000); // Max 90,000 candidates = 900 API calls
					let totalMatches = 0; // Track total matches for pagination info
					let totalScanned = 0; // Track how many candidates we've looked at
					let totalFetched = 0; // Track how many candidates we fetched from API
					let totalProcessed = 0; // Track how many we actually filtered/examined
					let earlyExit = false; // Track if we exited early
					const startTime = Date.now();
					const maxExecutionTime = 60000; // Increased from 25s to 60s - well within Cloudflare's 5min limit
					let apiCallCount = 0; // Track API calls to prevent hitting subrequest limit

					// Fetch candidates with pagination
					while (allCandidates.length < maxFetch && apiCallCount < 900) { // Limit to 900 API calls
						// Check for timeout BEFORE processing
						if (Date.now() - startTime > maxExecutionTime) {
							console.warn(`Timeout before processing batch ${apiCallCount}`);
							earlyExit = true;
							break;
						}
						// Add delay between requests to avoid rate limiting
						if (offset !== undefined) {
							// Not the first request - increase delay for stability
							await new Promise((resolve) => setTimeout(resolve, 300)); // 300ms delay = ~3 requests/second
						}

						// If searching by email, use email parameter directly
						const searchParams: any = {
							limit: 100,
							offset,
						};

						// Email search is most efficient when done through API
						if (emailSearch) {
							searchParams.email = args.email;
						}

						// Handle stage filtering - prefer new stages array over single stage
						if (stageIds.length > 0) {
							// API only supports single stage_id, use first one
							searchParams.stage_id = stageIds[0];
						} else if (stageContainsIds.length > 0) {
							searchParams.stage_id = stageContainsIds[0];
						} else if (args.stage) {
							searchParams.stage_id = args.stage;
						}

						if (args.posting_id) searchParams.posting_id = args.posting_id;
						if (args.tags) searchParams.tag = args.tags.split(",")[0]; // API only supports single tag
						if (args.archived !== undefined) searchParams.archived = args.archived;

						const response = await this.client.getOpportunities(searchParams);

						apiCallCount++; // Increment API call counter
						
						// Verify response structure
						if (!response || !response.data || !Array.isArray(response.data)) {
							console.error(`Invalid API response structure for batch ${apiCallCount}:`, response);
							break;
						}

						const candidates = response.data || [];
						totalFetched += candidates.length; // Track what we fetched
						console.log(`API call ${apiCallCount}: Fetched ${candidates.length} candidates, total fetched: ${totalFetched}`);
						
						// Sample log to verify we're getting real data
						if (candidates.length > 0) {
							console.log(`Sample from batch ${apiCallCount}: First candidate ID: ${candidates[0].id}, Name: ${candidates[0].name || 'NO_NAME'}`);
							if (candidates.length > 1) {
								console.log(`Last candidate in batch: ID: ${candidates[candidates.length - 1].id}, Name: ${candidates[candidates.length - 1].name || 'NO_NAME'}`);
							}
						}
						
						// Check for timeout BEFORE processing
						if (Date.now() - startTime > maxExecutionTime) {
							console.warn(`Timeout before processing batch ${apiCallCount}`);
							earlyExit = true;
							break;
						}

						// Log the start of filtering
						console.log(`Starting to filter batch ${apiCallCount} with ${candidates.length} candidates`);
						const filterStartTime = Date.now();
						let candidatesExamined = 0; // Track per batch

						// Filter candidates based on criteria
						const filteredCandidates = candidates.filter((c) => {
							candidatesExamined++; // Count each candidate we actually look at
							if (!c || typeof c !== "object") return false;

							// Convert candidate data to lowercase for comparison
							const cName = (c.name || "").toLowerCase();
							const cEmails = c.emails || [];
							if (!Array.isArray(cEmails)) {
								return false; // Skip invalid data
							}
							const cEmailsLower = cEmails.map((e) =>
								typeof e === "string" ? e.toLowerCase() : "",
							);

							const cTags = c.tags || [];
							if (!Array.isArray(cTags)) {
								return false; // Skip invalid data
							}
							const cTagsLower = cTags.map((t) =>
								typeof t === "string" ? t.toLowerCase() : "",
							);

							// Location is a string in the API, not an object
							const cLocationStr = (c.location || "").toLowerCase();

							// Get company info from headline field
							const cHeadline = String(c.headline || "").toLowerCase();
							const cOrganizations = c.organizations || [];
							let cOrganizationsLower: string[] = [];
							if (Array.isArray(cOrganizations)) {
								cOrganizationsLower = cOrganizations.map((o) =>
									String(o).toLowerCase(),
								);
							} else if (typeof cOrganizations === "string") {
								cOrganizationsLower = [
									(cOrganizations as string).toLowerCase(),
								];
							}

							// Combine all text for skills search
							let cAllText =
								`${cName} ${cEmailsLower.join(" ")} ${cTagsLower.join(" ")} ${cHeadline} ${cOrganizationsLower.join(" ")}`.toLowerCase();

							// Also check if resume exists for more comprehensive searching
							const cResume = String(c.resume || "").toLowerCase();
							if (cResume) {
								cAllText += ` ${cResume}`;
							}

							// Check new enhanced criteria first (early filtering)
							// Name match
							if (nameSearch && !cName.includes(nameSearch)) {
								return false;
							}

							// Email match (exact match if not using API email search)
							if (emailSearch && !searchParams.email && !cEmailsLower.includes(emailSearch)) {
								return false;
							}

							// Stage filtering (handle multiple stages with OR logic)
							if (stageIds.length > 1 || stageContainsIds.length > 1) {
								const candidateStageId = typeof c.stage === 'object' && c.stage ? c.stage.id : c.stage;
								const allStageIds = [...stageIds, ...stageContainsIds];
								if (!allStageIds.includes(candidateStageId as string)) {
									return false;
								}
							}

							// Archived filter
							if (args.archived === false && c.archived) {
								return false;
							}

							// Created after filter
							if (args.created_after && c.createdAt) {
								const createdDate = new Date(c.createdAt);
								const filterDate = new Date(args.created_after);
								if (createdDate < filterDate) {
									return false;
								}
							}

							// Check each existing criteria
							// Company match: check in headline (primary) or organizations
							let companyMatch = !companyList.length;
							if (companyList.length > 0) {
								// If current_company_only is true, only check the first company in headline
								if (args.current_company_only) {
									// Extract current company (first one in headline)
									const currentCompany = cHeadline.split(',')[0].trim();
									companyMatch = companyList.some((comp: string) => currentCompany.includes(comp));
								} else {
									// Original logic - check all companies
									companyMatch = companyList.some(
										(comp: string) =>
											cHeadline.includes(comp) ||
											cOrganizationsLower.some((org: string) => org.includes(comp))
									);
								}
							}

							// Skills match: ANY skill match (OR logic)
							const skillMatch =
								!skillList.length ||
								skillList.some((skill: string) => cAllText.includes(skill));

							// Location match: ANY location match (handle UK variations)
							const ukVariations = [
								"uk",
								"united kingdom",
								"england",
								"scotland",
								"wales",
								"northern ireland",
								"britain",
								"gb",
							];
							let locationMatch = true;
							if (locationList.length) {
								locationMatch = false;
								for (const loc of locationList) {
									// Direct match
									if (cLocationStr.includes(loc)) {
										locationMatch = true;
										break;
									}
									// Check UK variations
									if (
										["uk", "united kingdom"].includes(loc) &&
										ukVariations.some((ukVar) => cLocationStr.includes(ukVar))
									) {
										locationMatch = true;
										break;
									}
								}
							}

							// Tag match: ANY tag match
							const tagMatch =
								!tagList.length ||
								tagList.some((tag: string) => cTagsLower.includes(tag));

							return companyMatch && skillMatch && locationMatch && tagMatch;
						});

						// Log filtering completion
						const filterTime = Date.now() - filterStartTime;
						console.log(`Batch ${apiCallCount}: Filtered ${candidates.length} candidates in ${filterTime}ms, found ${filteredCandidates.length} matches`);
						console.log(`Actually examined ${candidatesExamined} candidates in this batch`);

						// NOW count the candidates we actually examined
						totalProcessed += candidatesExamined; // Use the actual count
						totalScanned = totalProcessed; // Update the scanned count to match processed

						totalMatches += filteredCandidates.length;
						allCandidates.push(...filteredCandidates);
						
						console.log(`Batch ${apiCallCount}: Processed ${candidates.length} candidates, found ${filteredCandidates.length} matches`);
						console.log(`Running totals - Fetched: ${totalFetched}, Processed: ${totalProcessed}, Matches: ${allCandidates.length}`);

						if (!response.hasNext || !response.next) break;

						// Use the next token from the API response
						offset = response.next;
					}

					// Calculate pagination
					const page = Math.max(1, args.page);
					const startIndex = (page - 1) * args.limit;
					const endIndex = startIndex + args.limit;
					const paginatedCandidates = allCandidates.slice(startIndex, endIndex);
					const totalPages = Math.ceil(allCandidates.length / args.limit);
					const hasMore = page < totalPages;

					// Check if search was incomplete
					const executionTime = Date.now() - startTime;
					const wasTimeout = executionTime > maxExecutionTime;
					const searchResult: any = {
										count: paginatedCandidates.length,
										page: page,
										total_matches: allCandidates.length,
										total_pages: totalPages,
										has_more: hasMore,
										next_page: hasMore ? page + 1 : null,
										search_criteria: {
											companies: args.companies,
											skills: args.skills,
											locations: args.locations,
											stage: args.stage,
											stages: args.stages,
											stage_contains: args.stage_contains,
											name: args.name,
											email: args.email,
											current_company_only: args.current_company_only,
											archived: args.archived,
											created_after: args.created_after,
											tags: args.tags,
											posting: args.posting_id,
											mode: args.mode,
										},
						search_stats: {
							candidates_scanned: totalScanned,
							candidates_fetched: totalFetched,
							candidates_processed: totalProcessed,
							api_calls_made: apiCallCount,
							candidates_matched: allCandidates.length,
							match_rate: totalScanned > 0 ? Math.round((allCandidates.length / totalScanned) * 100) : 0,
							execution_time_seconds: Math.round((Date.now() - startTime) / 1000),
						},
										candidates: paginatedCandidates.map(formatOpportunity),
					};

					// Add warning if search was incomplete
					if (wasTimeout || allCandidates.length >= maxFetch || apiCallCount >= 900) {
						if (apiCallCount >= 900) {
							searchResult.warning = `Search reached Cloudflare Workers subrequest limit (1000 total). Scanned ${totalScanned} candidates and found ${allCandidates.length} matches. This is an extremely comprehensive search covering up to 90,000 candidates.`;
						} else if (wasTimeout) {
							searchResult.warning = `Search stopped after scanning ${totalScanned} candidates (${Math.round(executionTime / 1000)}s). Found ${allCandidates.length} matches. More candidates may exist beyond this point.`;
						} else {
							searchResult.warning = `Reached maximum search depth after scanning ${totalScanned} candidates. Found ${allCandidates.length} matches. There may be more candidates beyond this search depth.`;
						}
						
						if (earlyExit && totalProcessed < totalFetched) {
							searchResult.warning += ` Note: ${totalFetched - totalProcessed} candidates were fetched but not examined due to timeout.`;
						}
						
						searchResult.recommendation = "To search deeper: 1) Use more specific criteria to narrow the search, 2) Try searching by specific companies or skills separately, or 3) Use email search if you have candidate emails.";
					}

					return {
						content: [
							{
								type: "text",
								text: JSON.stringify(searchResult, null, 2),
							},
						],
					};
				} catch (error) {
					// Return a proper response structure even on error
					return {
						content: [
							{
								type: "text",
								text: JSON.stringify(
									{
										error:
											error instanceof Error ? error.message : String(error),
										count: 0,
										search_criteria: {
											companies: args.companies,
											skills: args.skills,
											locations: args.locations,
											stage: args.stage,
											stages: args.stages,
											stage_contains: args.stage_contains,
											name: args.name,
											email: args.email,
											current_company_only: args.current_company_only,
											archived: args.archived,
											created_after: args.created_after,
											tags: args.tags,
											posting: args.posting_id,
											mode: args.mode,
										},
										candidates: [],
									},
									null,
									2,
								),
							},
						],
					};
				}
			}),
		);


	}

	private registerCandidateTools() {
		// Get candidate details
		this.server.tool(
			"lever_get_candidate",
			{
				opportunity_id: z.string(),
			},
			this.wrapToolWithTrace("lever_get_candidate", async (args) => {
				try {
					console.log(`Fetching candidate ${args.opportunity_id}`);
					const response = await this.client.getOpportunity(
						args.opportunity_id,
					);
					
					// Check if response and data exist
					if (!response || !response.data) {
						console.error(`No data returned for candidate ${args.opportunity_id}`);
						throw new Error(`Candidate ${args.opportunity_id} not found`);
					}
					
					const opportunity = response.data;
					console.log(`Opportunity data:`, JSON.stringify(opportunity).slice(0, 200));

					// Check if the opportunity object is empty or has no ID
					if (!opportunity.id || Object.keys(opportunity).length === 0) {
						console.error(`Empty opportunity object returned for ${args.opportunity_id}`);
						throw new Error(`Candidate ${args.opportunity_id} not found or data is empty`);
					}

					// Extract basic info
					const name = opportunity.name || "Unknown";
					const emails = opportunity.emails || [];
					// Location is a string in the API, not an object
					const location = opportunity.location || "Unknown";

					// Format stage information
					let stage_current = "Unknown";
					let stage_id = "";
					if (typeof opportunity.stage === "object" && opportunity.stage) {
						stage_current = opportunity.stage.text || "Unknown";
						stage_id = opportunity.stage.id || "";
					} else if (opportunity.stage) {
						stage_current = String(opportunity.stage);
					}

					// Format owner information
					let owner_name = "Unassigned";
					if (typeof opportunity.owner === "object" && opportunity.owner) {
						owner_name = opportunity.owner.name || "Unassigned";
					}

					// Extract organizations from headline
					const headline = opportunity.headline || "";
					const organizations = headline
						? headline.split(",").map((org) => org.trim())
						: [];

					// Get links and phones
					const links = opportunity.links || [];
					const phones = opportunity.phones || [];

					// Format created date
					const createdAt = opportunity.createdAt
						? new Date(opportunity.createdAt)
								.toISOString()
								.replace("T", " ")
								.substring(0, 16)
						: "Unknown";

					const result = {
						basic_info: formatOpportunity(opportunity),
						contact: {
							emails: emails,
							phones: phones,
							location: location,
						},
						stage: {
							current: stage_current,
							id: stage_id,
						},
						tags: opportunity.tags || [],
						sources: opportunity.sources || [],
						origin: opportunity.origin || "Unknown",
						owner: owner_name,
						headline: headline,
						organizations: organizations,
						links: links,
						applications: opportunity.applications
							? opportunity.applications.length
							: 0,
						createdAt: createdAt,
						archived: opportunity.archived || null,
					};

					return {
						content: [
							{
								type: "text",
								text: JSON.stringify(result, null, 2),
							},
						],
					};
				} catch (error) {
					console.error(`Error in lever_get_candidate:`, error);
					const errorMessage = error instanceof Error ? error.message : String(error);
					
					// Provide more context in the error response
					return {
						content: [
							{
								type: "text",
								text: JSON.stringify(
									{
										error: errorMessage,
										opportunity_id: args.opportunity_id,
										details: "Failed to fetch candidate details. Please check if the ID is valid and the candidate exists.",
										hint: "Try searching for the candidate by name or email first to get the correct opportunity_id"
									},
									null,
									2,
								),
							},
						],
					};
				}
			}),
		);

		// Add note to candidate
		this.server.tool(
			"lever_add_note",
			{
				opportunity_id: z.string(),
				note: z.string(),
			},
			this.wrapToolWithTrace("lever_add_note", async (args) => {
				await this.client.addNote(args.opportunity_id, args.note);
				return {
					content: [
						{
							type: "text",
							text: `Note added successfully to candidate ${args.opportunity_id}`,
						},
					],
				};
			}),
		);
	}

	private registerUtilityTools() {
		// List open roles
		this.server.tool("lever_list_open_roles", {
			expand_owners: z.boolean().default(true).describe("Include posting owner and hiring manager details"),
		}, this.wrapToolWithTrace("lever_list_open_roles", async (args) => {
			try {
				// Get postings with owner data if requested
				const expandFields = args.expand_owners ? ["owner", "hiringManager"] : [];
				const response = await this.client.getPostings("published", 50, undefined, expandFields);
				
				// Debug: Log the first posting to see the structure
				if (response.data && response.data.length > 0) {
					console.log("DEBUG: First posting raw data:", JSON.stringify(response.data[0]));
				}

				const results = {
					count: response.data.length,
					hasMore: response.hasNext || false,
					includes_owner_data: args.expand_owners,
					roles: response.data.map(formatPosting),
				};

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(results, null, 2),
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
		}));

		// Get stages
		this.server.tool("lever_get_stages", {}, this.wrapToolWithTrace("lever_get_stages", async () => {
			const stages = await this.client.getStages();
			return {
				content: [
					{
						type: "text",
						text: JSON.stringify(stages, null, 2),
					},
				],
			};
		}));

		// Get archive reasons
		this.server.tool("lever_get_archive_reasons", {}, this.wrapToolWithTrace("lever_get_archive_reasons", async () => {
			const reasons = await this.client.getArchiveReasons();
			return {
				content: [
					{
						type: "text",
						text: JSON.stringify(reasons, null, 2),
					},
				],
			};
		}));

		// Find postings by owner/recruiter name or ID
		this.server.tool(
			"lever_find_postings_by_owner",
			{
				owner_name: z.string().optional().describe("Name of the posting owner/recruiter (partial match supported) - use owner_id if available for better performance"),
				owner_id: z.string().optional().describe("Owner/recruiter ID (more reliable than name)"),
				state: z.enum(["published", "closed", "draft", "pending", "rejected"]).default("published"),
				limit: z.number().default(50),
			},
			this.wrapToolWithTrace("lever_find_postings_by_owner", async (args) => {
				try {
					// Validate input
					if (!args.owner_name && !args.owner_id) {
						return {
							content: [
								{
									type: "text",
									text: JSON.stringify({
										error: "Either owner_name or owner_id is required",
										suggestion: "Use lever_list_open_roles to get owner IDs for better performance",
									}, null, 2),
								},
							],
						};
					}

					let response;

					if (args.owner_id) {
						// More efficient: Get multiple batches of postings and filter by owner ID
						// Expand both owner and hiringManager to get names
						const allPostings: LeverPosting[] = [];
						let offset: string | undefined;
						let batchesFetched = 0;
						const maxBatches = 5; // Fetch up to 500 postings (5 batches of 100)
						
						// Fetch multiple batches to increase coverage
						while (batchesFetched < maxBatches) {
							const batchResponse = await this.client.getPostings(args.state, 100, offset, ["owner", "hiringManager"]);
							
							if (batchResponse.data && batchResponse.data.length > 0) {
								allPostings.push(...batchResponse.data);
							}
							
							batchesFetched++;
							
							// Stop if no more data
							if (!batchResponse.hasNext || !batchResponse.next) {
								break;
							}
							
							offset = batchResponse.next;
						}
						
						// Filter by owner ID
						const filteredPostings = allPostings.filter(posting => {
							if (typeof posting.owner === 'object' && posting.owner?.id) {
								return posting.owner.id === args.owner_id;
							}
							return false;
						});
						
						// Apply the limit after filtering
						const limitedPostings = args.limit ? filteredPostings.slice(0, args.limit) : filteredPostings;
						
						response = {
							data: limitedPostings,
							hasNext: filteredPostings.length > args.limit,
							next: undefined,
						};
					} else {
						// Fallback: Search by name (less efficient)
						// The getPostingsByOwner method already expands owner and hiringManager internally
						response = await this.client.getPostingsByOwner(args.owner_name!, args.state);
					}
					
					return {
						content: [
							{
								type: "text",
								text: JSON.stringify({
									count: response.data.length,
									owner_searched: args.owner_name || args.owner_id,
									search_method: args.owner_id ? "ID (efficient)" : "Name (less efficient)",
									state_filter: args.state,
									postings: response.data.map(formatPosting),
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
									owner_searched: args.owner_name || args.owner_id,
								}),
							},
						],
					};
				}
			}),
		);













		// Find candidates for role
		this.server.tool(
			"lever_find_candidates_for_role",
			{
				posting_id: z.string(),
				stage_names: z.array(z.string()).optional().describe("Filter by stage names"),
				limit: z.number().default(200),
				page: z.number().default(1).describe("Page number (1-based)"),
			},
			this.wrapToolWithTrace("lever_find_candidates_for_role", async (args) => {
				try {
					// Resolve stage names to IDs if provided
					let stageIds: string[] = [];
					if (args.stage_names && args.stage_names.length > 0) {
						try {
							stageIds = await resolveStageIdentifier(this.client, args.stage_names);
						} catch (error) {
							return {
								content: [
									{
										type: "text",
										text: JSON.stringify({
											error: `Failed to resolve stage names: ${error instanceof Error ? error.message : String(error)}`,
											posting_id: args.posting_id,
											stage_names: args.stage_names,
										}, null, 2),
									},
								],
							};
						}
					}

					const allCandidates: LeverOpportunity[] = [];
					let offset: string | undefined;
					const maxFetch = Math.min(args.limit * 10, 2000); // Support up to 10 pages

					// Fetch all candidates for this posting
					while (allCandidates.length < maxFetch) {
						const response = await this.client.getOpportunities({
							posting_id: args.posting_id,
							limit: 100,
							offset,
						});

						if (!response.data || response.data.length === 0) break;

						allCandidates.push(...response.data);

						if (!response.hasNext || !response.next) break;

						// Use the next token from the API response
						offset = response.next;
					}

					// Filter by stage if stage_names was provided
					let filteredCandidates = allCandidates;
					if (stageIds.length > 0) {
						filteredCandidates = allCandidates.filter(candidate => {
							const candidateStageId = typeof candidate.stage === 'object' && candidate.stage 
								? candidate.stage.id 
								: candidate.stage;
							return candidateStageId && stageIds.includes(candidateStageId as string);
						});
					}

					// Calculate pagination
					const page = Math.max(1, args.page);
					const startIndex = (page - 1) * args.limit;
					const endIndex = startIndex + args.limit;
					const paginatedCandidates = filteredCandidates.slice(startIndex, endIndex);
					const totalPages = Math.ceil(filteredCandidates.length / args.limit);
					const hasMore = page < totalPages;

					return {
						content: [
							{
								type: "text",
								text: JSON.stringify(
									{
										count: paginatedCandidates.length,
										page: page,
										total_matches: filteredCandidates.length,
										total_pages: totalPages,
										has_more: hasMore,
										next_page: hasMore ? page + 1 : null,
										posting_id: args.posting_id,
										stage_names: args.stage_names,
										candidates: paginatedCandidates.map(formatOpportunity),
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
								text: JSON.stringify(
									{
										error:
											error instanceof Error ? error.message : String(error),
										count: 0,
										posting_id: args.posting_id,
										candidates: [],
									},
									null,
									2,
								),
							},
						],
					};
				}
			}),
		);
	}
}

export default {
	fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);
		
		// Add Cloudflare trace headers
		const cfRay = request.headers.get('CF-Ray') || 'unknown';
		const cfCountry = request.headers.get('CF-IPCountry') || 'unknown';
		const traceId = `${cfRay}-${Date.now()}`;
		
		console.log(`[CF-TRACE] Request: ${request.method} ${url.pathname} | Ray: ${cfRay} | Country: ${cfCountry} | TraceID: ${traceId}`);

		if (url.pathname === "/sse" || url.pathname === "/sse/message") {
			const result = LeverMCP.serveSSE("/sse").fetch(request, env, ctx);
			console.log(`[CF-TRACE] SSE handled | TraceID: ${traceId}`);
			return result;
		}

		if (url.pathname === "/mcp") {
			const result = LeverMCP.serve("/mcp").fetch(request, env, ctx);
			console.log(`[CF-TRACE] MCP handled | TraceID: ${traceId}`);
			return result;
		}

		// Health check
		if (url.pathname === "/health") {
			console.log(`[CF-TRACE] Health check | TraceID: ${traceId}`);
			return new Response("OK", { status: 200 });
		}

		// Default response with instructions
		console.log(`[CF-TRACE] Default response | TraceID: ${traceId}`);
		return new Response(
			JSON.stringify(
				{
					name: "Lever MCP Server",
					description: "Remote MCP server for Lever ATS integration",
					version: "1.0.0",
					endpoints: {
						sse: "/sse",
						mcp: "/mcp",
						health: "/health",
					},
					instructions: {
						claude:
							"Use: npx mcp-remote " +
							request.url.split("/")[0] +
							"//" +
							request.headers.get("host") +
							"/sse",
						inspector:
							"Connect to: " +
							request.url.split("/")[0] +
							"//" +
							request.headers.get("host") +
							"/sse",
					},
				},
				null,
				2,
			),
			{
				headers: { "Content-Type": "application/json" },
			},
		);
	},
};
