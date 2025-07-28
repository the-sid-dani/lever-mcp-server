import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { LeverClient } from "./lever/client";
import type { LeverOpportunity, LeverPosting } from "./types/lever";
import { registerAdditionalTools } from "./additional-tools";

// Environment interface
interface Env {
	LEVER_API_KEY: string;
	MCP_OBJECT: DurableObjectNamespace;
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

// Define our Lever MCP server
export class LeverMCP {
	private server: McpServer;
	private client!: LeverClient;
	private toolsRegistered = false; // Guard against double registration
	private state: DurableObjectState;
	private env: Env;

	constructor(state: DurableObjectState, env: Env) {
		this.state = state;
		this.env = env;
		
		// Initialize MCP server
		this.server = new McpServer({
			name: "Lever ATS",
			version: "1.0.0",
		}, {
			capabilities: {
				tools: {}
			}
		});
		
		// Initialize on construction
		this.state.blockConcurrencyWhile(async () => {
			await this.init();
		});
	}
	
	// Generate a unique session ID
	private generateSessionId(): string {
		return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
	}

	async init() {
		console.log("=== INIT CALLED ===", new Date().toISOString());
		console.log("Init call stack:", new Error().stack?.split('\n').slice(1, 5).join('\n'));
		
		// Check if tools are already registered
		if (this.toolsRegistered) {
			console.warn("⚠️ TOOLS ALREADY REGISTERED - SKIPPING REGISTRATION TO PREVENT GHOSTS");
			return;
		}
		
		// Initialize Lever client with API key from environment
		const env = this.env as Env;
		const apiKey = env.LEVER_API_KEY;
		if (!apiKey) {
			throw new Error("LEVER_API_KEY environment variable is required");
		}
		this.client = new LeverClient(apiKey);

		// Register all Lever tools
		this.registerSearchTools();
		this.registerCandidateTools();
		this.registerUtilityTools();

		// Register additional tools to complete the set of 16
		registerAdditionalTools(this.server, this.client);
		
		// Mark tools as registered
		this.toolsRegistered = true;
		console.log("✅ Tools registered successfully");
		
		// Log all registered tools to help debug ghost tools
		console.log("=== LEVER MCP: All registered tools ===");
		const tools = (this.server as any)._tools || (this.server as any).tools || [];
		if (Array.isArray(tools)) {
			tools.forEach((tool: any) => {
				console.log(`- ${tool.name || tool}`);
			});
		} else if (typeof tools === 'object') {
			Object.keys(tools).forEach(toolName => {
				console.log(`- ${toolName}`);
			});
		}
		console.log("=== End of registered tools ===");
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
			},
			async (args) => {
				try {
					// Parse search criteria
					const companyList = args.companies
						? args.companies.split(",").map((c) => c.trim().toLowerCase())
						: [];
					const skillList = args.skills
						? args.skills.split(",").map((s) => s.trim().toLowerCase())
						: [];
					const locationList = args.locations
						? args.locations.split(",").map((l) => l.trim().toLowerCase())
						: [];
					const tagList = args.tags
						? args.tags.split(",").map((t) => t.trim().toLowerCase())
						: [];

					const allCandidates: LeverOpportunity[] = [];
					let offset: string | undefined;
					// Reduce maxFetch to stay within Cloudflare's free plan 50 subrequest limit
					// Each API call counts as a subrequest, and we fetch 100 candidates per call
					// So we can make at most 45 API calls (leaving 5 for other operations)
					const maxFetch = Math.min(args.limit * 10, 1000, 4500); // Max 4500 candidates = 45 API calls
					let totalMatches = 0; // Track total matches for pagination info
					let totalScanned = 0; // Track how many candidates we've looked at
					let totalFetched = 0; // Track how many candidates we fetched from API
					let totalProcessed = 0; // Track how many we actually filtered/examined
					let earlyExit = false; // Track if we exited early
					const startTime = Date.now();
					const maxExecutionTime = 60000; // Increased from 25s to 60s - well within Cloudflare's 5min limit
					let apiCallCount = 0; // Track API calls to prevent hitting subrequest limit

					// Fetch candidates with pagination
					while (allCandidates.length < maxFetch && apiCallCount < 45) { // Limit to 45 API calls
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

						const response = await this.client.getOpportunities({
							stage_id: args.stage,
							posting_id: args.posting_id,
							tag: args.tags ? args.tags.split(",")[0] : undefined, // API only supports single tag
							limit: 100,
							offset,
						});

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

							// Check each criteria
							// Company match: check in headline (primary) or organizations
							const companyMatch =
								!companyList.length ||
								companyList.some(
									(comp) =>
										cHeadline.includes(comp) ||
										cOrganizationsLower.some((org) => org.includes(comp)),
								);

							// Skills match: ANY skill match (OR logic)
							const skillMatch =
								!skillList.length ||
								skillList.some((skill) => cAllText.includes(skill));

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
								tagList.some((tag) => cTagsLower.includes(tag));

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
											tags: args.tags,
											posting: args.posting_id,
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
					if (wasTimeout || allCandidates.length >= maxFetch || apiCallCount >= 45) {
						if (apiCallCount >= 45) {
							searchResult.warning = `Search limited by Cloudflare Workers free plan (50 subrequest limit). Scanned ${totalScanned} candidates and found ${allCandidates.length} matches. Consider upgrading to Workers Paid plan for deeper searches.`;
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
											tags: args.tags,
											posting: args.posting_id,
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
			},
		);

		// Find by company tool
		this.server.tool(
			"lever_find_by_company",
			{
				companies: z.string(),
				current_only: z.boolean().default(false).describe("Filter to only current employees (default: false - searches all work history)"),
				limit: z.number().default(200),
				page: z.number().default(1).describe("Page number (1-based)"),
			},
			async (args) => {
				try {
					// Parse company list
					const companyList = args.companies.split(",").map((c) => c.trim());

					// Search for candidates from each company
					const allCandidates: any[] = [];
					const seenIds = new Set<string>();

					// Fetch candidates and filter by company
					let offset: string | undefined;
					let totalFetched = 0;
					const maxFetch = Math.min(args.limit * 5, 500); // Fetch more to ensure we get enough matches

					while (totalFetched < maxFetch) {
						const response = await this.client.getOpportunities({
							limit: 100,
							offset,
						});

						const candidates = response.data || [];
						if (candidates.length === 0) break;

						totalFetched += candidates.length;

						// Filter to ensure company match in headline
						for (const candidate of candidates) {
							const headline = (candidate.headline || "").toLowerCase();
							const tags = (candidate.tags || []).map((t: string) =>
								t.toLowerCase(),
							);

							// Check for company match
							let companyFound = false;
							let matchedCompany = "";

							for (const company of companyList) {
								const companyLower = company.toLowerCase();

								if (headline) {
									// Split headline by comma to get individual companies
									const headlineCompanies = headline
										.split(",")
										.map((c) => c.trim());
									for (const hc of headlineCompanies) {
										if (
											companyLower.includes(hc) ||
											hc.includes(companyLower)
										) {
											companyFound = true;
											matchedCompany = company;
											break;
										}
									}
								}

								if (
									!companyFound &&
									tags.some((tag) => tag.includes(companyLower))
								) {
									companyFound = true;
									matchedCompany = company;
								}

								if (companyFound) break;
							}

							// Add to results if company match found and not duplicate
							if (companyFound && !seenIds.has(candidate.id)) {
								seenIds.add(candidate.id);
								allCandidates.push({
									...candidate,
									matched_company: matchedCompany,
									full_headline: candidate.headline || "",
								});
							}
						}

						// Check if we have enough results
						if (allCandidates.length >= args.limit) break;

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

					const results = {
						count: paginatedCandidates.length,
						page: page,
						total_matches: allCandidates.length,
						total_pages: totalPages,
						has_more: hasMore,
						next_page: hasMore ? page + 1 : null,
						searched_companies: companyList,
						current_employees_only: args.current_only,
						candidates: paginatedCandidates.map((c) => ({
							...formatOpportunity(c),
							matched_company: c.matched_company || "Unknown",
							all_organizations: c.full_headline || c.headline || "",
						})),
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
			},
		);
	}

	private registerCandidateTools() {
		// Get candidate details
		this.server.tool(
			"lever_get_candidate",
			{
				opportunity_id: z.string(),
			},
			async (args) => {
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
			},
		);

		// Add note to candidate
		this.server.tool(
			"lever_add_note",
			{
				opportunity_id: z.string(),
				note: z.string(),
			},
			async (args) => {
				await this.client.addNote(args.opportunity_id, args.note);
				return {
					content: [
						{
							type: "text",
							text: `Note added successfully to candidate ${args.opportunity_id}`,
						},
					],
				};
			},
		);
	}

	private registerUtilityTools() {
		// List open roles
		this.server.tool("lever_list_open_roles", {
			expand_owners: z.boolean().default(true).describe("Include posting owner and hiring manager details"),
		}, async (args) => {
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
		});

		// Get stages
		this.server.tool("lever_get_stages", {}, async () => {
			const stages = await this.client.getStages();
			return {
				content: [
					{
						type: "text",
						text: JSON.stringify(stages, null, 2),
					},
				],
			};
		});

		// Get archive reasons
		this.server.tool("lever_get_archive_reasons", {}, async () => {
			const reasons = await this.client.getArchiveReasons();
			return {
				content: [
					{
						type: "text",
						text: JSON.stringify(reasons, null, 2),
					},
				],
			};
		});

		// Find postings by owner/recruiter name or ID
		this.server.tool(
			"lever_find_postings_by_owner",
			{
				owner_name: z.string().optional().describe("Name of the posting owner/recruiter (partial match supported) - use owner_id if available for better performance"),
				owner_id: z.string().optional().describe("Owner/recruiter ID (more reliable than name)"),
				state: z.enum(["published", "closed", "draft", "pending", "rejected"]).default("published"),
				limit: z.number().default(50),
			},
			async (args) => {
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
						// More efficient: Get all postings and filter by owner ID
						const allPostingsResponse = await this.client.getPostings(args.state, args.limit, undefined, ["owner"]);
						
						// Filter by owner ID
						const filteredPostings = allPostingsResponse.data.filter(posting => {
							if (typeof posting.owner === 'object' && posting.owner?.id) {
								return posting.owner.id === args.owner_id;
							}
							return false;
						});
						
						response = {
							data: filteredPostings,
							hasNext: false,
							next: undefined,
						};
					} else {
						// Fallback: Search by name (less efficient)
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
			},
		);

		// Test connection tool
		this.server.tool("test_lever_connection", {}, async () => {
			try {
				console.log("Testing Lever API connection...");
				
				// Try to fetch a small number of opportunities to test the connection
				const response = await this.client.getOpportunities({
					limit: 1
				});
				
				console.log("Connection test successful, response:", JSON.stringify(response).slice(0, 200));
				
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								status: "success",
								message: "Lever API connection is working",
								test_results: {
									api_responded: true,
									candidates_found: response.data ? response.data.length : 0,
									has_data: response.data && response.data.length > 0,
									sample_id: response.data && response.data[0] ? response.data[0].id : null
								}
							}, null, 2),
						},
					],
				};
			} catch (error) {
				console.error("Connection test failed:", error);
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								status: "error",
								message: "Lever API connection failed",
								error: error instanceof Error ? error.message : String(error),
								hint: "Please check your LEVER_API_KEY is correctly set"
							}, null, 2),
						},
					],
				};
			}
		});

		// Test rate limits tool - verify our rate limiting is working
		this.server.tool(
			"test_rate_limits",
			{
				requests: z.number().default(20).describe("Number of test requests to make"),
				concurrent: z.boolean().default(false).describe("Run requests concurrently instead of sequentially"),
			},
			async (args) => {
				const results: any[] = [];
				const startTime = Date.now();
				
				if (args.concurrent) {
					// Test concurrent requests
					const promises = [];
					for (let i = 0; i < args.requests; i++) {
						promises.push(
							(async (index) => {
								const reqStart = Date.now();
								try {
									await this.client.getOpportunities({ limit: 1 });
									return {
										request: index + 1,
										success: true,
										duration: Date.now() - reqStart,
										timestamp: Date.now() - startTime,
									};
								} catch (error) {
									return {
										request: index + 1,
										success: false,
										error: error instanceof Error ? error.message : String(error),
										duration: Date.now() - reqStart,
										timestamp: Date.now() - startTime,
									};
								}
							})(i)
						);
					}
					
					results.push(...await Promise.all(promises));
				} else {
					// Test sequential requests
					for (let i = 0; i < args.requests; i++) {
						const reqStart = Date.now();
						try {
							await this.client.getOpportunities({ limit: 1 });
							results.push({
								request: i + 1,
								success: true,
								duration: Date.now() - reqStart,
								timestamp: Date.now() - startTime,
							});
						} catch (error) {
							results.push({
								request: i + 1,
								success: false,
								error: error instanceof Error ? error.message : String(error),
								duration: Date.now() - reqStart,
								timestamp: Date.now() - startTime,
							});
						}
					}
				}
				
				const totalTime = Date.now() - startTime;
				const successCount = results.filter(r => r.success).length;
				const failureCount = results.filter(r => !r.success).length;
				const actualRate = args.requests / (totalTime / 1000);
				
				// Calculate average delay between requests
				const delays = [];
				for (let i = 1; i < results.length; i++) {
					delays.push(results[i].timestamp - results[i-1].timestamp);
				}
				const avgDelay = delays.length > 0 ? delays.reduce((a, b) => a + b, 0) / delays.length : 0;
				
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								summary: {
									total_requests: args.requests,
									successful: successCount,
									failed: failureCount,
									total_time_seconds: Math.round(totalTime / 100) / 10,
									actual_rate_per_second: Math.round(actualRate * 10) / 10,
									average_delay_ms: Math.round(avgDelay),
									execution_mode: args.concurrent ? "concurrent" : "sequential",
								},
								rate_limit_status: actualRate > 10 
									? "⚠️ EXCEEDING LIMIT" 
									: actualRate > 8 
										? "⚡ Near limit" 
										: "✅ Within safe limits",
								errors: results.filter(r => !r.success),
								timing_distribution: {
									min_duration: Math.min(...results.map(r => r.duration)),
									max_duration: Math.max(...results.map(r => r.duration)),
									avg_duration: Math.round(results.reduce((sum, r) => sum + r.duration, 0) / results.length),
								},
							}, null, 2),
						},
					],
				};
			},
		);

		// Verify API response tool - check what the API actually returns
		this.server.tool(
			"verify_api_response",
			{
				batches: z.number().default(3).describe("Number of API batches to fetch (max 5)"),
			},
			async (args) => {
				const results: any[] = [];
				let offset: string | undefined;
				const batchCount = Math.min(args.batches, 5); // Limit to 5 batches
				
				for (let i = 0; i < batchCount; i++) {
					const response = await this.client.getOpportunities({
						limit: 100,
						offset,
					});
					
					const batchResult = {
						batch: i + 1,
						requested_limit: 100,
						actual_count: response.data ? response.data.length : 0,
						has_data: !!response.data,
						is_array: Array.isArray(response.data),
						hasNext: response.hasNext,
						next_offset: response.next,
						sample_ids: [] as string[],
						sample_names: [] as string[],
					};
					
					if (response.data && response.data.length > 0) {
						// Get first, middle, and last candidate as samples
						const samples = [
							response.data[0],
							response.data[Math.floor(response.data.length / 2)],
							response.data[response.data.length - 1]
						];
						
						batchResult.sample_ids = samples.map(s => s.id);
						batchResult.sample_names = samples.map(s => s.name || 'NO_NAME');
					}
					
					results.push(batchResult);
					
					if (!response.hasNext || !response.next) break;
					offset = response.next;
				}
				
				const summary = {
					total_batches: results.length,
					total_candidates_fetched: results.reduce((sum, r) => sum + r.actual_count, 0),
					all_batches_returned_100: results.every(r => r.actual_count === 100),
					batches: results,
				};
				
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(summary, null, 2),
						},
					],
				};
			},
		);

		// Debug get candidate - returns raw response
		this.server.tool(
			"debug_get_candidate",
			{
				opportunity_id: z.string(),
			},
			async (args) => {
				try {
					console.log(`DEBUG: Fetching raw data for candidate ${args.opportunity_id}`);
					
					// Make a direct API call to see what we get back
					const response = await this.client.getOpportunity(args.opportunity_id);
					
					console.log(`DEBUG: Raw response:`, JSON.stringify(response));
					
					return {
						content: [
							{
								type: "text",
								text: JSON.stringify({
									debug_info: {
										opportunity_id: args.opportunity_id,
										response_exists: !!response,
										data_exists: !!response?.data,
										data_type: typeof response?.data,
										data_keys: response?.data ? Object.keys(response.data) : [],
										has_id: !!response?.data?.id,
										id_value: response?.data?.id || "NO_ID",
										raw_data: response
									}
								}, null, 2),
							},
						],
					};
				} catch (error) {
					console.error(`DEBUG: Error fetching candidate:`, error);
					return {
						content: [
							{
								type: "text",
								text: JSON.stringify({
									debug_error: {
										opportunity_id: args.opportunity_id,
										error_message: error instanceof Error ? error.message : String(error),
										error_type: error?.constructor?.name || "Unknown",
										error_stack: error instanceof Error ? error.stack : undefined
									}
								}, null, 2),
							},
						],
					};
				}
			},
		);

		// Debug postings - returns raw structure
		this.server.tool(
			"debug_postings",
			{},
			async () => {
				try {
					console.log(`DEBUG: Fetching raw postings data`);
					
					// Get postings to see raw structure
					const response = await this.client.getPostings("published", 3);
					
					console.log(`DEBUG: Raw postings response:`, JSON.stringify(response).slice(0, 500));
					
					// Get detailed info about the first posting
					const firstPosting = response.data?.[0];
					
					return {
						content: [
							{
								type: "text",
								text: JSON.stringify({
									debug_info: {
										total_postings: response.data?.length || 0,
										has_next: response.hasNext,
										first_posting_keys: firstPosting ? Object.keys(firstPosting) : [],
										first_posting_raw: firstPosting,
										location_type: firstPosting?.location ? typeof firstPosting.location : "undefined",
										team_type: firstPosting?.team ? typeof firstPosting.team : "undefined",
										sample_data: {
											id: firstPosting?.id,
											text: firstPosting?.text,
											state: firstPosting?.state,
											location_raw: firstPosting?.location,
											team_raw: firstPosting?.team,
											urls_raw: firstPosting?.urls
										}
									}
								}, null, 2),
							},
						],
					};
				} catch (error) {
					console.error(`DEBUG: Error fetching postings:`, error);
					return {
						content: [
							{
								type: "text",
								text: JSON.stringify({
									debug_error: {
										error_message: error instanceof Error ? error.message : String(error),
										error_type: error?.constructor?.name || "Unknown"
									}
								}, null, 2),
							},
						],
					};
				}
			},
		);

		// Debug opportunities list - check what's coming back
		this.server.tool(
			"debug_opportunities_list",
			{
				name_search: z.string().optional(),
				limit: z.number().default(5),
			},
			async (args) => {
				try {
					console.log(`DEBUG: Fetching opportunities list`);
					
					// Get opportunities
					const response = await this.client.getOpportunities({
						limit: args.limit,
					});
					
					console.log(`DEBUG: Raw opportunities response has ${response.data?.length || 0} items`);
					
					// Log the raw response
					if (response.data && response.data.length > 0) {
						console.log(`DEBUG: First opportunity raw:`, JSON.stringify(response.data[0]));
					}
					
					// If searching by name, filter results
					let opportunities = response.data || [];
					if (args.name_search) {
						const searchLower = args.name_search.toLowerCase();
						opportunities = opportunities.filter(opp => {
							const name = (opp.name || "").toLowerCase();
							return name.includes(searchLower);
						});
					}
					
					return {
						content: [
							{
								type: "text",
								text: JSON.stringify({
									debug_info: {
										total_opportunities: response.data?.length || 0,
										filtered_count: opportunities.length,
										name_search: args.name_search || "none",
										has_next: response.hasNext,
										first_opportunity_keys: response.data?.[0] ? Object.keys(response.data[0]) : [],
										opportunities: opportunities.slice(0, 3).map(opp => ({
											id: opp.id,
											name: opp.name || "NO_NAME",
											name_exists: !!opp.name,
											name_type: typeof opp.name,
											email: opp.emails?.[0] || "NO_EMAIL", 
											location: opp.location || "NO_LOCATION",
											location_type: typeof opp.location,
											headline: opp.headline || "NO_HEADLINE",
											created: opp.createdAt ? new Date(opp.createdAt).toISOString() : "NO_DATE",
											raw_snippet: JSON.stringify(opp).substring(0, 200)
										}))
									}
								}, null, 2),
							},
						],
					};
				} catch (error) {
					console.error(`DEBUG: Error fetching opportunities:`, error);
					return {
						content: [
							{
								type: "text",
								text: JSON.stringify({
									debug_error: {
										error_message: error instanceof Error ? error.message : String(error),
										error_type: error?.constructor?.name || "Unknown"
									}
								}, null, 2),
							},
						],
					};
				}
			},
		);

		// Find candidates for role
		this.server.tool(
			"lever_find_candidates_for_role",
			{
				posting_id: z.string(),
				limit: z.number().default(200),
				page: z.number().default(1).describe("Page number (1-based)"),
			},
			async (args) => {
				try {
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

					// Calculate pagination
					const page = Math.max(1, args.page);
					const startIndex = (page - 1) * args.limit;
					const endIndex = startIndex + args.limit;
					const paginatedCandidates = allCandidates.slice(startIndex, endIndex);
					const totalPages = Math.ceil(allCandidates.length / args.limit);
					const hasMore = page < totalPages;

					return {
						content: [
							{
								type: "text",
								text: JSON.stringify(
									{
										count: paginatedCandidates.length,
										page: page,
										total_matches: allCandidates.length,
										total_pages: totalPages,
										has_more: hasMore,
										next_page: hasMore ? page + 1 : null,
										posting_id: args.posting_id,
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
			},
		);
	}

	// Handle incoming requests
	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);
		
		// Handle SSE endpoint - GET request for establishing SSE connection
		if (url.pathname === "/sse" && request.method === "GET") {
			console.log("SSE connection request received");
			
			// Create SSE stream
			const { readable, writable } = new TransformStream();
			const writer = writable.getWriter();
			const encoder = new TextEncoder();
			
			// Send initial endpoint message
			const sessionId = url.searchParams.get("sessionId") || this.generateSessionId();
			const endpointMessage = `event: endpoint\ndata: /message?sessionId=${sessionId}\n\n`;
			writer.write(encoder.encode(endpointMessage));
			
			// Keep connection alive with periodic pings
			const keepAlive = setInterval(() => {
				const ping = `event: ping\ndata: ${Date.now()}\n\n`;
				writer.write(encoder.encode(ping)).catch(() => {
					clearInterval(keepAlive);
				});
			}, 30000);
			
			// Clean up on disconnect
			request.signal.addEventListener("abort", () => {
				clearInterval(keepAlive);
				writer.close().catch(() => {});
			});
			
			// Return SSE response
			return new Response(readable, {
				headers: {
					'Content-Type': 'text/event-stream',
					'Cache-Control': 'no-cache',
					'Connection': 'keep-alive',
					'Access-Control-Allow-Origin': '*',
				},
			});
		}
		
		// Handle message endpoint - POST requests for MCP messages
		if (url.pathname === "/message" && request.method === "POST") {
			try {
				const sessionId = url.searchParams.get("sessionId");
				if (!sessionId) {
					return new Response(JSON.stringify({
						jsonrpc: "2.0",
						error: {
							code: -32600,
							message: "Session ID required"
						}
					}), {
						status: 400,
						headers: { 
							"Content-Type": "application/json",
							'Access-Control-Allow-Origin': '*',
						}
					});
				}
				
				const message = await request.json() as {
					id?: string | number;
					method?: string;
					params?: any;
					jsonrpc?: string;
				};
				
				console.log("Received MCP message:", message);
				
				// Validate JSON-RPC version
				if (message.jsonrpc !== "2.0") {
					return new Response(JSON.stringify({
						jsonrpc: "2.0",
						id: message.id,
						error: {
							code: -32600,
							message: "Invalid JSON-RPC version"
						}
					}), {
						headers: { 
							"Content-Type": "application/json",
							'Access-Control-Allow-Origin': '*',
						}
					});
				}
				
				// Handle different message types
				let response;
				
				if (message.method === "initialize") {
					// Initialize handshake
					response = {
						jsonrpc: "2.0",
						id: message.id,
						result: {
							protocolVersion: "2024-11-05",
							capabilities: {
								tools: {}
							},
							serverInfo: {
								name: "Lever MCP Server",
								version: "1.0.0"
							}
						}
					};
				} else if (message.method === "tools/list") {
					// Return the list of available tools
					const tools = (this.server as any)._registeredTools || new Map();
					response = {
						jsonrpc: "2.0",
						id: message.id,
						result: {
							tools: Array.from(tools as Map<string, any>).map(([name, tool]) => ({
								name,
								description: tool.description || "",
								inputSchema: tool.inputSchema || {
									type: "object",
									properties: {},
									required: []
								}
							}))
						}
					};
				} else if (message.method === "tools/call") {
					// Call a specific tool
					const toolName = message.params?.name;
					const toolArgs = message.params?.arguments || {};
					
					// Find and execute the tool
					const tools = (this.server as any)._registeredTools;
					if (tools && tools.has(toolName)) {
						try {
							const tool = tools.get(toolName);
							const result = await tool.handler(toolArgs);
							response = {
								jsonrpc: "2.0",
								id: message.id,
								result
							};
						} catch (error) {
							console.error(`Error executing tool ${toolName}:`, error);
							response = {
								jsonrpc: "2.0",
								id: message.id,
								error: {
									code: -32603,
									message: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
								}
							};
						}
					} else {
						response = {
							jsonrpc: "2.0",
							id: message.id,
							error: {
								code: -32601,
								message: `Tool not found: ${toolName}`
							}
						};
					}
				} else {
					response = {
						jsonrpc: "2.0",
						id: message.id,
						error: {
							code: -32601,
							message: `Method not found: ${message.method}`
						}
					};
				}
				
				// Return the response
				return new Response(JSON.stringify(response), {
					headers: { 
						"Content-Type": "application/json",
						'Access-Control-Allow-Origin': '*',
					}
				});
			} catch (error) {
				console.error("Error handling message:", error);
				return new Response(JSON.stringify({
					jsonrpc: "2.0",
					error: {
						code: -32603,
						message: "Internal error"
					}
				}), {
					status: 500,
					headers: { 
						"Content-Type": "application/json",
						'Access-Control-Allow-Origin': '*',
					}
				});
			}
		}
		
		// Handle OPTIONS requests for CORS
		if (request.method === "OPTIONS") {
			return new Response(null, {
				headers: {
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
					'Access-Control-Allow-Headers': 'Content-Type',
				},
			});
		}
		
		// Health check
		if (url.pathname === "/health") {
			return new Response("OK", { status: 200 });
		}
		
		// Default response
		return new Response(
			JSON.stringify({
				name: "Lever MCP Server",
				description: "Remote MCP server for Lever ATS integration",
				version: "1.0.0",
				endpoints: {
					sse: "/sse",
					health: "/health",
				},
				note: "This server uses Server-Sent Events (SSE) for communication"
			}, null, 2),
			{
				status: 200,
				headers: { "Content-Type": "application/json" }
			}
		);
	}
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		// All requests go through the Durable Object
		const id = env.MCP_OBJECT.idFromName("main");
		const stub = env.MCP_OBJECT.get(id);
		return stub.fetch(request);
	}
};
