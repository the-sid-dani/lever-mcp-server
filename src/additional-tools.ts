import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { LeverClient } from "./lever/client";
import type { LeverOpportunity } from "./types/lever";
import { resolveSingleStageIdentifier } from "./utils/stage-helpers";

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

// Helper to format posting data 
function formatPosting(posting: any): Record<string, any> {
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
	
	return {
		id: posting.id || "",
		title: posting.text || "Unknown",
		state: posting.state || "Unknown",
		location: location,
		team: team,
		posting_owner: {
			id: ownerId,
			name: ownerName,
		},
		url: posting.urls?.show || "",
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



	// NEW TOOLS: Following the implementation plan



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

	// Tool 12: Search archived candidates with interview data
	server.tool(
		"lever_search_archived_candidates",
		{
			posting_id: z.string().optional().describe("Specific posting ID to search within"),
			archived_at_start: z.string().optional().describe("Start date for archive filter (YYYY-MM-DD)"),
			archived_at_end: z.string().optional().describe("End date for archive filter (YYYY-MM-DD)"),
			archive_reason_id: z.string().optional().describe("Specific archive reason ID to filter by"),
			include_interviews: z.boolean().default(true).describe("Include interview count and details"),
			recruiter_name: z.string().optional().describe("Filter by recruiter/owner name"),
			limit: z.number().default(100).describe("Maximum number of archived candidates to return per page"),
			offset: z.string().optional().describe("Pagination offset token"),
			fetch_all_pages: z.boolean().default(false).describe("Whether to fetch all pages of results (ignores limit)"),
		},
		async (args) => {
			try {
				const allCandidates: any[] = [];
				let offset = args.offset;
				let hasNext = true;
				let totalFetched = 0;
				let pageCount = 0;
				const maxPages = args.fetch_all_pages ? 50 : 1; // Safety limit

				// Fetch candidates with pagination
				while (hasNext && pageCount < maxPages) {
					const response = await client.getArchivedCandidates({
						posting_id: args.posting_id,
						archived_at_start: args.archived_at_start,
						archived_at_end: args.archived_at_end,
						archive_reason_id: args.archive_reason_id,
						limit: args.limit,
						offset: offset,
					});

					allCandidates.push(...response.data);
					totalFetched += response.data.length;
					pageCount++;

					// Check if we should continue fetching
					if (!args.fetch_all_pages) {
						// Single page mode - include pagination info in response
						hasNext = false;
					} else {
						// Multi-page mode - continue if there are more results
						if (!response.hasNext || !response.next) break;
						offset = response.next;
					}

					// For single page, preserve pagination info for next call
					if (!args.fetch_all_pages) {
						hasNext = response.hasNext || false;
						break;
					}
				}

				// Filter by recruiter name if provided
				let filteredCandidates = allCandidates;
				if (args.recruiter_name) {
					const recruiterLower = args.recruiter_name.toLowerCase();
					filteredCandidates = allCandidates.filter((candidate: any) => {
						// Check posting owner
						if (candidate.posting && typeof candidate.posting === 'object') {
							const posting = candidate.posting;
							if (typeof posting.owner === 'object' && posting.owner?.name) {
								return posting.owner.name.toLowerCase().includes(recruiterLower);
							}
						}
						
						// Check candidate owner
						if (typeof candidate.owner === 'object' && candidate.owner?.name) {
							return candidate.owner.name.toLowerCase().includes(recruiterLower);
						}
						
						return false;
					});
				}

				// Process candidates with interview data if requested
				const processedCandidates = await Promise.all(
					filteredCandidates.map(async (candidate: any) => {
						const candidateData = formatOpportunity(candidate);
						
						if (args.include_interviews) {
							try {
								// Get interview data for this candidate
								const interviewsResponse = await client.getOpportunityInterviews(candidate.id);
								const interviews = interviewsResponse.data || [];
								candidateData.interview_count = interviews.length;
								candidateData.interviews = interviews.map((interview: any) => ({
									id: interview.id,
									subject: interview.subject || "Interview",
									date: interview.date ? new Date(interview.date).toISOString() : "Unknown",
									interviewers: interview.interviewers?.map((i: any) => i.name || i.email || "Unknown") || [],
									feedback_submitted: !!interview.feedbacks?.length,
								}));
							} catch (error) {
								// If we can't get interviews, just note it
								candidateData.interview_count = "Unable to fetch";
								candidateData.interviews = [];
							}
						}

						return candidateData;
					})
				);

				// Generate summary statistics
				const totalInterviews = processedCandidates.reduce((sum: number, candidate: any) => {
					return sum + (typeof candidate.interview_count === 'number' ? candidate.interview_count : 0);
				}, 0);

				const summary = {
					total_archived_candidates: processedCandidates.length,
					total_interviews_conducted: args.include_interviews ? totalInterviews : "Not calculated",
					pages_fetched: pageCount,
					search_criteria: {
						posting_id: args.posting_id || "All postings",
						date_range: args.archived_at_start && args.archived_at_end 
							? `${args.archived_at_start} to ${args.archived_at_end}`
							: "All time",
						recruiter: args.recruiter_name || "All recruiters",
						archive_reason: args.archive_reason_id || "All reasons",
						fetch_mode: args.fetch_all_pages ? "All pages" : "Single page",
					},
				};

				// Include pagination info for single page mode
				const result: any = {
					summary,
					candidates: processedCandidates,
				};

				if (!args.fetch_all_pages) {
					result.pagination = {
						has_next: hasNext,
						next_offset: offset,
						current_page_size: allCandidates.length,
					};
				}

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(result, null, 2),
						},
					],
				};
			} catch (error: any) {
				return {
					content: [
						{
							type: "text",
							text: `Error searching archived candidates: ${error.message}`,
						},
					],
				};
			}
		},
	);

	// Consolidated update tool for stage, owner, and tags
	server.tool(
		"lever_update_candidate",
		{
			opportunity_id: z.string().describe("The candidate's opportunity ID"),
			stage_id: z.string().optional().describe("Move to this stage ID"),
			stage_name: z.string().optional().describe("Move to stage with this name"),
			owner_id: z.string().optional().describe("Assign to this user"),
			add_tags: z.array(z.string()).optional().describe("Tags to add"),
			remove_tags: z.array(z.string()).optional().describe("Tags to remove"),
		},
		async (args) => {
			try {
				const updates: any = {};
				
				// Handle stage update by name
				if (args.stage_name && !args.stage_id) {
					const stages = await client.getStages();
					const stage = stages.data.find((s: any) => 
						s.text.toLowerCase().includes(args.stage_name!.toLowerCase())
					);
					if (stage) {
						args.stage_id = stage.id;
					} else {
						throw new Error(`Stage "${args.stage_name}" not found`);
					}
				}
				
				// Perform updates
				const results = [];
				
				if (args.stage_id) {
					await client.updateOpportunityStage(args.opportunity_id, args.stage_id);
					results.push({ action: "stage_updated", stage_id: args.stage_id });
				}
				
				if (args.owner_id) {
					// Note: This would need a new method in LeverClient
					// await client.updateOpportunityOwner(args.opportunity_id, args.owner_id);
					results.push({ action: "owner_updated", owner_id: args.owner_id, note: "Owner update not yet implemented in LeverClient" });
				}
				
				if (args.add_tags || args.remove_tags) {
					// Handle tag updates
					if (args.add_tags && args.add_tags.length > 0) {
						await client.addCandidateTags(args.opportunity_id, args.add_tags);
					}
					if (args.remove_tags && args.remove_tags.length > 0) {
						await client.removeCandidateTags(args.opportunity_id, args.remove_tags);
					}
					results.push({ 
						action: "tags_updated", 
						added: args.add_tags || [],
						removed: args.remove_tags || []
					});
				}
				
				// Get updated candidate info
				const opportunityResponse = await client.getOpportunity(args.opportunity_id);
				const opportunity = opportunityResponse.data;
				
				return {
					content: [{
						type: "text",
						text: JSON.stringify({
							success: true,
							opportunity_id: args.opportunity_id,
							candidate_name: opportunity.name || "Unknown",
							current_stage: typeof opportunity.stage === 'object' && opportunity.stage 
								? opportunity.stage.text 
								: "Unknown",
							updates: results
						}, null, 2)
					}]
				};
			} catch (error) {
				return {
					content: [{
						type: "text",
						text: JSON.stringify({
							error: error instanceof Error ? error.message : String(error),
							opportunity_id: args.opportunity_id
						})
					}]
				};
			}
		}
	);
}
