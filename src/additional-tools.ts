import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { LeverClient } from "./lever/client";
import type { LeverOpportunity } from "./types/lever";

// Helper to format opportunity data
export function formatOpportunity(opp: LeverOpportunity): Record<string, any> {
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

export function registerAdditionalTools(
	server: McpServer,
	client: LeverClient,
) {
	// Basic search tool
	server.tool(
		"lever_search_candidates",
		{
			query: z.string().optional(),
			stage: z.string().optional(),
			limit: z.number().default(200),
			page: z.number().default(1).describe("Page number (1-based)"),
		},
		async (args) => {
			try {
				// Check if query looks like an email
				let emailFilter: string | undefined;
				if (args.query && args.query.includes("@")) {
					emailFilter = args.query;
				}

				if (emailFilter) {
					// Use email search
					const response = await client.getOpportunities({
						email: emailFilter,
						stage_id: args.stage,
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
							stage_id: args.stage,
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
						stage_id: args.stage,
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

	// Quick find by name
	server.tool(
		"lever_quick_find_candidate",
		{
			name_or_email: z.string(),
		},
		async (args) => {
			try {
				// If it looks like an email, use email search
				if (args.name_or_email.includes("@")) {
					const response = await client.getOpportunities({
						email: args.name_or_email,
						limit: 10,
					});

					return {
						content: [
							{
								type: "text",
								text: JSON.stringify(
									{
										count: response.data.length,
										search_type: "email",
										query: args.name_or_email,
										candidates: response.data.map(formatOpportunity),
									},
									null,
									2,
								),
							},
						],
					};
				}

				// Otherwise, do a limited name search
				const queryLower = args.name_or_email.toLowerCase();
				const matched: LeverOpportunity[] = [];
				let offset: string | undefined;
				let pagesChecked = 0;
				const maxPages = 3; // Only check first 300 candidates

				while (pagesChecked < maxPages) {
					const response = await client.getOpportunities({
						limit: 100,
						offset,
					});

					if (!response.data || response.data.length === 0) break;

					// Debug: Log first candidate to see structure
					if (pagesChecked === 0 && response.data.length > 0) {
						console.log("DEBUG quick_find: First candidate data:", JSON.stringify(response.data[0]).substring(0, 300));
					}

					// Quick scan for name matches
					for (const c of response.data) {
						// Check if we have valid data
						if (!c || !c.id) {
							console.warn("Quick find: Skipping candidate with no ID");
							continue;
						}
						
						const cName = (c.name || "").toLowerCase();
						
						// Debug log for specific names
						if (cName && queryLower === "michael cox" && cName.includes("michael")) {
							console.log(`DEBUG: Found Michael - Full candidate:`, JSON.stringify(c).substring(0, 300));
						}

						if (
							queryLower &&
							cName &&
							(queryLower.includes(cName) || cName.includes(queryLower))
						) {
							matched.push(c);
							if (matched.length >= 5) break; // Return first 5 matches
						}
					}

					if (matched.length >= 5) break;

					pagesChecked++;
					if (!response.hasNext || !response.next) break;

					// Use the next token from the API response
					offset = response.next;
				}

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(
								{
									count: matched.length,
									search_type: "quick_name_search",
									query: args.name_or_email,
									candidates: matched.map(formatOpportunity),
									note: `Quick search checked first ${pagesChecked * 100} candidates. For comprehensive search, use email if available.`,
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

	// Find candidates in specific posting by name
	server.tool(
		"lever_find_candidate_in_posting",
		{
			name: z.string(),
			posting_id: z.string(),
			stage: z.string().optional(),
		},
		async (args) => {
			try {
				const nameLower = args.name.toLowerCase();
				const matched: LeverOpportunity[] = [];
				let offset: string | undefined;
				let totalChecked = 0;

				// Search with posting filter - much more targeted
				while (totalChecked < 1000) {
					// Can check more when filtered by posting
					const response = await client.getOpportunities({
						posting_id: args.posting_id,
						stage_id: args.stage,
						limit: 100,
						offset,
					});

					if (!response.data || response.data.length === 0) break;

					totalChecked += response.data.length;

					// Check each candidate with flexible matching
					for (const c of response.data) {
						const cName = (c.name || "").toLowerCase();
						// More flexible matching - split name into parts
						const nameParts = nameLower.split(" ");
						if (
							nameParts.some((part) => cName.includes(part)) ||
							nameLower.includes(cName) ||
							cName.includes(nameLower)
						) {
							matched.push(c);
						}
					}

					if (!response.hasNext || !response.next) break;

					// Use the next token from the API response
					offset = response.next;
				}

				const result: any = {
					count: matched.length,
					posting_id: args.posting_id,
					total_checked: totalChecked,
					query: args.name,
					candidates: matched.map(formatOpportunity),
				};

				if (matched.length === 0 && totalChecked > 0) {
					result.note = `No matches found for '${args.name}' among ${totalChecked} candidates in this posting`;
				}

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(result, null, 2),
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

	// Find internal referrals for a role
	server.tool(
		"lever_find_internal_referrals_for_role",
		{
			posting_id: z.string(),
			limit: z.number().default(100),
		},
		async (args) => {
			try {
				// First get the posting details
				const postingsResponse = await client.getPostings("published", 100);
				const postings = postingsResponse.data || [];

				let targetPosting: any = null;
				for (const posting of postings) {
					if (posting.id === args.posting_id) {
						targetPosting = posting;
						break;
					}
				}

				if (!targetPosting) {
					return {
						content: [
							{
								type: "text",
								text: JSON.stringify({
									error: `Posting ${args.posting_id} not found`,
								}),
							},
						],
					};
				}

				const postingTitle = targetPosting.text || "";
				// Access team from categories object as per API docs
				const postingTeam = targetPosting.categories?.team || "";

				// Search for candidates who might be good referral sources
				// Fetch all candidates with limit
				const response = await client.getOpportunities({
					limit: args.limit * 2, // Fetch more to filter
				});

				const candidates = response.data || [];

				// Filter for likely employees who could refer
				const potentialReferrers: any[] = [];

				for (const candidate of candidates) {
					const tags = (candidate.tags || []).map((t: string) =>
						t.toLowerCase(),
					);
					const headline = (candidate.headline || "").toLowerCase();

					// Check if they're marked as internal/employee
					const isInternal =
						tags.includes("employee") ||
						tags.includes("internal") ||
						tags.some((tag) => tag.includes("referral")) ||
						headline.includes("current");

					// Check if they're in a related team/role
					const isRelated =
						(postingTeam && headline.includes(postingTeam.toLowerCase())) ||
						(postingTeam &&
							tags.some((tag) => tag.includes(postingTeam.toLowerCase()))) ||
						postingTitle
							.toLowerCase()
							.split(" ")
							.some(
								(keyword: string) =>
									keyword.length > 3 && headline.includes(keyword),
							);

					if (isInternal || isRelated) {
						potentialReferrers.push({
							...candidate,
							referral_relevance: isInternal ? "internal" : "related",
						});
					}
				}

				// Limit results
				const limitedReferrers = potentialReferrers.slice(0, args.limit);

				const results = {
					count: limitedReferrers.length,
					role: postingTitle,
					team: postingTeam,
					potential_referrers: limitedReferrers.map((c) => ({
						...formatOpportunity(c),
						relevance: c.referral_relevance || "unknown",
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

	// List files for a candidate
	server.tool(
		"lever_list_files",
		{
			opportunity_id: z.string(),
		},
		async (args) => {
			try {
				// Try both endpoints - files and resumes
				const allFiles: any[] = [];

				// Try files endpoint
				try {
					const filesResponse = await client.getOpportunityFiles(
						args.opportunity_id,
					);
					const files = filesResponse.data || [];
					for (const f of files) {
						f.source = "files";
					}
					allFiles.push(...files);
				} catch (filesError) {
					// Continue even if files endpoint fails
				}

				// Try resumes endpoint
				try {
					const resumesResponse = await client.getOpportunityResumes(
						args.opportunity_id,
					);
					const resumes = resumesResponse.data || [];
					for (const r of resumes) {
						r.source = "resumes";
					}
					allFiles.push(...resumes);
				} catch (resumesError) {
					// Continue even if resumes endpoint fails
				}

				// Get candidate info for context
				const oppResponse = await client.getOpportunity(args.opportunity_id);
				const opportunity = oppResponse.data;

				const results = {
					candidate: opportunity.name || "Unknown",
					file_count: allFiles.length,
					files: allFiles.map((f) => ({
						id: f.id || "",
						filename: f.file?.name || f.name || f.filename || "Unknown",
						type: f.file?.ext || f.type || f.mimetype || "Unknown",
						size: f.file?.size || f.size || 0,
						uploaded_at: f.createdAt
							? new Date(f.createdAt)
									.toISOString()
									.replace("T", " ")
									.substring(0, 16)
							: "Unknown",
						download_url: f.file?.downloadUrl || f.downloadUrl || f.url || "",
						source: f.source || "unknown",
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

	// List applications for a candidate
	server.tool(
		"lever_list_applications",
		{
			opportunity_id: z.string(),
		},
		async (args) => {
			try {
				// Get candidate info
				const oppResponse = await client.getOpportunity(args.opportunity_id);
				const opportunity = oppResponse.data;

				// Get applications
				const response = await client.getOpportunityApplications(
					args.opportunity_id,
				);
				const applications = response.data || [];

				const results = {
					candidate: opportunity.name || "Unknown",
					application_count: applications.length,
					applications: applications.map((app: any) => ({
						id: app.id || "",
						posting: app.posting?.text || "Unknown",
						posting_id: app.posting?.id || "",
						status: app.status || "Unknown",
						created_at: app.createdAt
							? new Date(app.createdAt)
									.toISOString()
									.replace("T", " ")
									.substring(0, 16)
							: "Unknown",
						user: app.user?.name || "System",
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

	// Get specific application details
	server.tool(
		"lever_get_application",
		{
			opportunity_id: z.string(),
			application_id: z.string(),
		},
		async (args) => {
			try {
				// Get application details
				const application = await client.getApplication(
					args.opportunity_id,
					args.application_id,
				);

				// Get candidate info for context
				const oppResponse = await client.getOpportunity(args.opportunity_id);
				const opportunity = oppResponse.data;

				const result = {
					candidate: opportunity.name || "Unknown",
					application: {
						id: application.id || "",
						posting: {
							id: application.posting?.id || "",
							title: application.posting?.text || "Unknown",
							team: application.posting?.team?.text || "Unknown",
						},
						status: application.status || "Unknown",
						created_at: application.createdAt
							? new Date(application.createdAt)
									.toISOString()
									.replace("T", " ")
									.substring(0, 16)
							: "Unknown",
						created_by: application.user?.name || "System",
						type: application.type || "Unknown",
						posting_owner: application.postingOwner?.name || "Unknown",
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

	// NEW TOOLS: Following the implementation plan

	// Tool 1: Move candidate to stage
	server.tool(
		"lever_move_candidate_to_stage",
		{
			opportunity_id: z.string().describe("The candidate's opportunity ID"),
			stage_id: z.string().describe("The target stage ID (use lever_get_stages to find valid IDs)"),
			perform_as: z.string().optional().describe("Optional: User ID to perform this action on behalf of"),
		},
		async (args) => {
			try {
				// Get candidate info first for context
				const oppResponse = await client.getOpportunity(args.opportunity_id);
				const opportunity = oppResponse.data;

				// Get current stage for comparison
				const currentStage = opportunity.stage;

				// Update the stage
				const updateResponse = await client.updateOpportunityStage(
					args.opportunity_id,
					args.stage_id,
					args.perform_as,
				);

				// Get updated candidate info
				const updatedOppResponse = await client.getOpportunity(args.opportunity_id);
				const updatedOpportunity = updatedOppResponse.data;

				const result = {
					success: true,
					candidate: opportunity.name || "Unknown",
					stage_change: {
						from: typeof currentStage === "object" ? currentStage.text : String(currentStage || "Unknown"),
						to: typeof updatedOpportunity.stage === "object" ? updatedOpportunity.stage.text : String(updatedOpportunity.stage || "Unknown"),
						stage_id: args.stage_id,
					},
					performed_by: args.perform_as || "API User",
					timestamp: new Date().toISOString(),
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
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								error: error instanceof Error ? error.message : String(error),
								note: "Make sure the stage_id is valid. Use lever_get_stages to see available stages.",
							}),
						},
					],
				};
			}
		},
	);

	// Tool 2: List requisitions
	server.tool(
		"lever_list_requisitions",
		{
			status: z.enum(["open", "closed", "onHold", "draft"]).optional().describe("Filter by requisition status"),
			requisition_code: z.string().optional().describe("Filter by external HRIS requisition code (e.g., 'ENG-145')"),
			created_at_start: z.number().optional().describe("Filter by creation date (timestamp in milliseconds)"),
			created_at_end: z.number().optional().describe("Filter by creation date (timestamp in milliseconds)"),
			confidentiality: z.enum(["confidential", "non-confidential", "all"]).default("non-confidential").describe("Filter by confidentiality level"),
			limit: z.number().default(25).describe("Number of results to return (max 100)"),
			offset: z.string().optional().describe("Pagination offset token"),
		},
		async (args) => {
			try {
				// Prepare parameters for API call
				const params: any = {
					limit: Math.min(args.limit, 100),
					confidentiality: args.confidentiality,
				};

				if (args.status) params.status = args.status;
				if (args.requisition_code) params.requisition_code = args.requisition_code;
				if (args.created_at_start) params.created_at_start = args.created_at_start;
				if (args.created_at_end) params.created_at_end = args.created_at_end;
				if (args.offset) params.offset = args.offset;

				// Get requisitions from API
				const response = await client.getRequisitions(params);
				const requisitions = response.data || [];

				// Format the results to clearly show ID vs Code distinction
				const formattedResults = requisitions.map((req: any) => ({
					// CRITICAL: Show both ID and Code clearly
					lever_id: req.id || "",
					requisition_code: req.requisitionCode || "",
					name: req.name || "",
					status: req.status || "",
					headcount: {
						total: req.headcountTotal || 0,
						hired: req.headcountHired || 0,
						remaining: (req.headcountTotal || 0) - (req.headcountHired || 0),
					},
					details: {
						employment_status: req.employmentStatus || "",
						location: req.location || "",
						team: req.team || "",
						department: req.department || "",
						confidentiality: req.confidentiality || "",
					},
					compensation: req.compensationBand ? {
						currency: req.compensationBand.currency || "",
						min: req.compensationBand.min || 0,
						max: req.compensationBand.max || 0,
						interval: req.compensationBand.interval || "",
					} : null,
					owner: req.owner || "",
					hiring_manager: req.hiringManager || "",
					created_at: req.createdAt ? new Date(req.createdAt).toISOString().split("T")[0] : "",
					updated_at: req.updatedAt ? new Date(req.updatedAt).toISOString().split("T")[0] : "",
				}));

				const result = {
					count: formattedResults.length,
					filters_applied: {
						status: args.status || "all",
						requisition_code: args.requisition_code || "none",
						confidentiality: args.confidentiality,
					},
					note: "Use lever_id for API calls, requisition_code for HRIS integration",
					requisitions: formattedResults,
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

	// Tool 3: Get requisition details with smart lookup
	server.tool(
		"lever_get_requisition_details",
		{
			requisition_identifier: z.string().describe("Either the Lever ID (UUID) or the external requisition code (e.g., 'ENG-145')"),
		},
		async (args) => {
			try {
				let requisition: any;
				let lookupMethod: string;

				// Smart lookup logic: determine if input is ID or code
				const identifier = args.requisition_identifier.trim();
				
				// Check if it looks like a UUID (contains hyphens and is 36 chars)
				const isUUID = identifier.length === 36 && identifier.includes("-");

				if (isUUID) {
					// Try direct ID lookup first
					try {
						const response = await client.getRequisition(identifier);
						requisition = response.data;
						lookupMethod = "direct_id_lookup";
					} catch (error) {
						// If direct ID lookup fails, try as code
						try {
							const response = await client.getRequisitionByCode(identifier);
							requisition = response.data;
							lookupMethod = "code_lookup_fallback";
						} catch (codeError) {
							throw new Error(`Requisition not found using ID '${identifier}': ${error instanceof Error ? error.message : String(error)}`);
						}
					}
				} else {
					// Looks like a code, try code lookup first
					try {
						const response = await client.getRequisitionByCode(identifier);
						requisition = response.data;
						lookupMethod = "code_lookup";
					} catch (error) {
						// If code lookup fails, try as direct ID
						try {
							const response = await client.getRequisition(identifier);
							requisition = response.data;
							lookupMethod = "id_lookup_fallback";
						} catch (idError) {
							throw new Error(`Requisition not found using code '${identifier}': ${error instanceof Error ? error.message : String(error)}`);
						}
					}
				}

				// Format the detailed response
				const result = {
					lookup_method: lookupMethod,
					requisition_details: {
						// Core identifiers
						lever_id: requisition.id || "",
						requisition_code: requisition.requisitionCode || "",
						name: requisition.name || "",
						
						// Status and headcount
						status: requisition.status || "",
						headcount: {
							total: requisition.headcountTotal || 0,
							hired: requisition.headcountHired || 0,
							remaining: (requisition.headcountTotal || 0) - (requisition.headcountHired || 0),
						},
						backfill: requisition.backfill || false,
						
						// Details
						employment_status: requisition.employmentStatus || "",
						location: requisition.location || "",
						team: requisition.team || "",
						department: requisition.department || "",
						confidentiality: requisition.confidentiality || "",
						
						// Compensation
						compensation_band: requisition.compensationBand ? {
							currency: requisition.compensationBand.currency || "",
							min: requisition.compensationBand.min || 0,
							max: requisition.compensationBand.max || 0,
							interval: requisition.compensationBand.interval || "",
						} : null,
						
						// People
						owner: requisition.owner || "",
						hiring_manager: requisition.hiringManager || "",
						creator: requisition.creator || "",
						
						// Associated postings
						postings: requisition.postings || [],
						
						// Approval
						approval: requisition.approval || null,
						
						// Custom fields
						custom_fields: requisition.customFields || {},
						
						// Internal notes
						internal_notes: requisition.internalNotes || "",
						
						// Timestamps
						created_at: requisition.createdAt ? new Date(requisition.createdAt).toISOString() : "",
						updated_at: requisition.updatedAt ? new Date(requisition.updatedAt).toISOString() : "",
						closed_at: requisition.closedAt ? new Date(requisition.closedAt).toISOString() : "",
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
			} catch (error) {
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								error: error instanceof Error ? error.message : String(error),
								note: "You can use either the Lever ID (UUID) or the external requisition code (e.g., 'ENG-145')",
							}),
						},
					],
				};
			}
		},
	);

	// Tool 4: Archive candidate with enhanced parameters
	server.tool(
		"lever_archive_candidate",
		{
			opportunity_id: z.string().describe("The candidate's opportunity ID"),
			archive_reason_id: z.string().describe("Archive reason ID (use lever_get_archive_reasons to find valid IDs)"),
			perform_as: z.string().optional().describe("Optional: User ID to perform this action on behalf of"),
			clean_interviews: z.boolean().default(false).describe("Whether to remove pending interviews when archiving"),
			requisition_id: z.string().optional().describe("Optional: Requisition ID if hiring against a specific requisition"),
		},
		async (args) => {
			try {
				// Get candidate info first for context
				const oppResponse = await client.getOpportunity(args.opportunity_id);
				const opportunity = oppResponse.data;

				// Get archive reasons for validation and context
				const archiveReasonsResponse = await client.getArchiveReasons();
				const archiveReasons = archiveReasonsResponse.data || [];
				
				// Find the reason details
				const selectedReason = archiveReasons.find((reason: any) => reason.id === args.archive_reason_id);
				
				if (!selectedReason) {
					return {
						content: [
							{
								type: "text",
								text: JSON.stringify({
									error: `Invalid archive reason ID: ${args.archive_reason_id}`,
									available_reasons: archiveReasons.map((reason: any) => ({
										id: reason.id,
										text: reason.text,
									})),
									note: "Use lever_get_archive_reasons to see all valid archive reason IDs",
								}),
							},
						],
					};
				}

				// Archive the candidate
				const archiveResponse = await client.archiveOpportunity(
					args.opportunity_id,
					args.archive_reason_id,
					args.perform_as,
					args.clean_interviews,
					args.requisition_id,
				);

				const result = {
					success: true,
					candidate: opportunity.name || "Unknown",
					archive_details: {
						reason: selectedReason.text || "Unknown",
						reason_id: args.archive_reason_id,
						clean_interviews: args.clean_interviews,
						requisition_id: args.requisition_id || null,
					},
					performed_by: args.perform_as || "API User",
					timestamp: new Date().toISOString(),
					note: "Candidate has been archived and removed from active pipeline",
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
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								error: error instanceof Error ? error.message : String(error),
								note: "Make sure the archive_reason_id is valid. Use lever_get_archive_reasons to see available reasons.",
							}),
						},
					],
				};
			}
		},
	);
}
