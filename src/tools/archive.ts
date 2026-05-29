import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { LeverClient } from "../lever/client.js";
import { getSharedResolver, resolvePerformAs } from "../auth/resolve-perform-as.js";
import { formatOpportunity } from "./formatters.js";
import { mapLimit } from "../utils/concurrency.js";

export function registerArchiveTools(server: McpServer, client: LeverClient) {
	// lever_archive — consolidated (replaces lever_get_archive_reasons + lever_archive_candidate + lever_search_archived_candidates)
	server.tool(
		"lever_archive",
		"Manage archived candidates. Use action='list_reasons' to discover valid archive reason IDs, action='archive' to archive a candidate (single-tenant — perform_as defaults to LEVER_DEFAULT_USER_ID via the client), or action='search' to query archived candidates by posting, date range, recruiter, or reason.",
		{
			action: z.enum(["list_reasons", "archive", "search"]).describe(
				"Operation to perform. list_reasons=fetch all archive reason IDs; archive=archive opportunity_id with archive_reason_id; search=query archived candidates with optional filters."
			),
			// archive action params
			opportunity_id: z.string().optional().describe("For action='archive' only — the candidate's opportunity ID."),
			archive_reason_id: z.string().optional().describe("For action='archive' or 'search' — archive reason ID. Use action='list_reasons' to discover valid IDs. For 'search' it filters; for 'archive' it is required."),
			perform_as: z.string().optional().describe("For action='archive' only — optional user ID to perform on behalf of (overrides default)."),
			clean_interviews: z.boolean().default(false).optional().describe("For action='archive' only — whether to remove pending interviews when archiving."),
			requisition_id: z.string().optional().describe("For action='archive' only — optional requisition ID if hiring against a specific requisition."),
			// search action params
			posting_id: z.string().optional().describe("For action='search' only — specific posting ID to search within."),
			archived_at_start: z.string().optional().describe("For action='search' only — start date for archive filter (YYYY-MM-DD)."),
			archived_at_end: z.string().optional().describe("For action='search' only — end date for archive filter (YYYY-MM-DD)."),
			include_interviews: z.boolean().default(true).optional().describe("For action='search' only — include interview count and details."),
			recruiter_name: z.string().optional().describe("For action='search' only — filter by recruiter/owner name."),
			limit: z.number().default(100).optional().describe("For action='search' only — max archived candidates per page."),
			offset: z.string().optional().describe("For action='search' only — pagination offset token."),
			fetch_all_pages: z.boolean().default(false).optional().describe("For action='search' only — when true, paginate exhaustively to hasNext:false (no page cap). Default false returns a single page; check the coverage object before concluding a candidate was never archived."),
		},
		async (args) => {
			try {
				switch (args.action) {
					case "list_reasons": {
						const reasons = await client.getArchiveReasons();
						return {
							content: [{
								type: "text",
								text: JSON.stringify(reasons, null, 2),
							}],
						};
					}
					case "archive": {
						if (!args.opportunity_id) throw new Error("opportunity_id is required for action='archive'");
						if (!args.archive_reason_id) throw new Error("archive_reason_id is required for action='archive'");

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
											note: "Use action='list_reasons' to see all valid archive reason IDs",
										}),
									},
								],
							};
						}

						// Resolve perform_as per auth policy. args.perform_as is the explicit
						// override, honored only on the OAUTH-disabled path.
						const performAs = await resolvePerformAs(getSharedResolver(client), args.perform_as);

						// Archive the candidate
						await client.archiveOpportunity(
							args.opportunity_id,
							args.archive_reason_id,
							performAs,
							args.clean_interviews ?? false,
							args.requisition_id,
						);

						const result = {
							success: true,
							candidate: opportunity.name || "Unknown",
							archive_details: {
								reason: selectedReason.text || "Unknown",
								reason_id: args.archive_reason_id,
								clean_interviews: args.clean_interviews ?? false,
								requisition_id: args.requisition_id || null,
							},
							performed_by: performAs,
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
					}
					case "search": {
						const allCandidates: any[] = [];
						let offset = args.offset;
						let hasNext = true;
						let totalFetched = 0;
						let pageCount = 0;
						const includeInterviews = args.fetch_all_pages ? false : (args.include_interviews ?? true);
						const limit = args.limit ?? 100;

						// Fetch candidates with pagination. fetch_all_pages=true loops to
						// exhaustion (no page cap); the client token bucket serializes the page
						// fetches and handles 429s. fetch_all_pages=false (default) fetches
						// exactly one page and preserves hasNext for the caller.
						while (hasNext) {
							const response = await client.getArchivedCandidates({
								posting_id: args.posting_id,
								archived_at_start: args.archived_at_start,
								archived_at_end: args.archived_at_end,
								archive_reason_id: args.archive_reason_id,
								limit: limit,
								offset: offset,
							});

							allCandidates.push(...response.data);
							totalFetched += response.data.length;
							pageCount++;

							if (!args.fetch_all_pages) {
								// Single-page mode: preserve pagination info for next call and stop.
								hasNext = response.hasNext || false;
								offset = response.next;
								break;
							}

							// Multi-page mode: continue until there are no more results.
							if (!response.hasNext || !response.next) break;
							// Stuck-cursor guard: a non-advancing cursor would loop forever.
							if (response.next === offset) break;
							offset = response.next;
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
						const processedCandidates = await mapLimit(
							filteredCandidates,
							8,
							async (candidate: any) => {
								const candidateData = formatOpportunity(candidate);

								if (includeInterviews) {
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
							},
						);

						// Generate summary statistics
						const totalInterviews = processedCandidates.reduce((sum: number, candidate: any) => {
							return sum + (typeof candidate.interview_count === 'number' ? candidate.interview_count : 0);
						}, 0);

						const summary = {
							total_archived_candidates: processedCandidates.length,
							total_interviews_conducted: includeInterviews ? totalInterviews : "Not calculated",
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

						// In exhaustive (fetch_all_pages) mode interviews are skipped to
						// avoid a per-candidate interview fan-out over thousands of archived
						// candidates. Surface a note so the omission is explicit.
						if (args.fetch_all_pages) {
							(summary as any).interviews_note = "Interview details skipped in exhaustive (fetch_all_pages) mode to avoid a per-candidate fan-out; use lever_get_interview_insights per candidate.";
						}

						// Always surface coverage so a partial single-page result can never be
						// mistaken for the full set. complete is true only when exhaustive:
						// all_pages ran to hasNext:false, or everything fit on one page.
						const partialSinglePage = !args.fetch_all_pages && hasNext;
						const coverage = {
							fetched: allCandidates.length,
							complete: !partialSinglePage,
							mode: args.fetch_all_pages ? "all_pages" : "single_page",
							warning: partialSinglePage
								? "Single-page archive search returned only the first page. Set fetch_all_pages=true for an exhaustive search; do not conclude a candidate was never archived from this partial result."
								: null,
						};

						// Include pagination info for single page mode
						const result: any = {
							summary,
							coverage,
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
					}
					default:
						throw new Error(`Unknown action: ${(args as any).action}`);
				}
			} catch (error) {
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
						},
					],
				};
			}
		},
	);
}
