import type {
	LeverApiResponse,
	LeverOpportunity,
	LeverPosting,
	LeverInterview,
	LeverPanel,
	LeverUser,
	LeverNote,
	LeverFeedback,
	LeverFeedbackTemplate,
	LeverEmail,
	LeverStage,
	LeverArchiveReason,
	LeverRequisition,
	LeverApplication,
	LeverFile,
} from "../types/lever.js";
import { randomUUID } from "node:crypto";
import { logger } from "../utils/logger.js";

// Simple token bucket implementation for rate limiting
class TokenBucket {
	private tokens: number;
	private lastRefill: number = Date.now();
	
	constructor(
		private maxTokens: number = 15, // Allow some burst capacity
		private refillRate: number = 8   // 8 tokens per second (below 10 req/s limit)
	) {
		this.tokens = maxTokens;
	}
	
	async waitForToken(): Promise<void> {
		this.refill();
		
		if (this.tokens < 1) {
			// Calculate wait time needed for 1 token
			const waitMs = ((1 - this.tokens) / this.refillRate) * 1000;
			await new Promise(resolve => setTimeout(resolve, Math.ceil(waitMs)));
			return this.waitForToken(); // Retry after waiting
		}
		
		this.tokens -= 1;
	}
	
	private refill(): void {
		const now = Date.now();
		const elapsedSeconds = (now - this.lastRefill) / 1000;
		const tokensToAdd = elapsedSeconds * this.refillRate;
		
		this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
		this.lastRefill = now;
	}
}

export class LeverClient {
	private baseUrl = "https://api.lever.co/v1";
	private requestQueue: Promise<unknown> = Promise.resolve();
	private lastRequestTime = 0;
	private minRequestInterval = 125; // 8 requests per second
	private tokenBucket = new TokenBucket(); // Add token bucket for better rate limiting

	constructor(private apiKey: string) {}

	private async rateLimit(): Promise<void> {
		// Use token bucket instead of simple delay
		await this.tokenBucket.waitForToken();
		
		// Still track last request time for logging
		this.lastRequestTime = Date.now();
	}

	private async makeRequest<T>(
		method: string,
		endpoint: string,
		params?: Record<string, unknown>,
		body?: unknown,
		retryCount: number = 0,
	): Promise<T> {
		// Execute one HTTP attempt. Retries recurse on `attempt` (NOT back
		// through the queue): the queue slot is already held for this logical
		// request, so re-queuing would chain onto a still-pending promise and
		// deadlock. Retry counts and backoff are unchanged from the original.
		const attempt = async (attemptCount: number): Promise<T> => {
			const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
			const url = new URL(`${this.baseUrl}${path}`);

			if (params) {
				Object.entries(params).forEach(([key, value]) => {
					if (value !== undefined && value !== null) {
						// Handle arrays by appending multiple times
						if (Array.isArray(value)) {
							value.forEach((v) => {
								url.searchParams.append(key, String(v));
							});
						} else {
							url.searchParams.append(key, String(value));
						}
					}
				});
			}

			const traceId = randomUUID();
			logger.debug(`[API-TRACE ${traceId}] START ${method} ${endpoint}`);
			const startTime = Date.now();

			// Abort a hung connection so it cannot stall the serialized queue.
			const controller = new AbortController();
			const timeoutMs = 30_000;
			const timer = setTimeout(() => controller.abort(), timeoutMs);

			try {
				const response = await fetch(url.toString(), {
					method,
					headers: {
						Authorization: `Bearer ${this.apiKey}`,
						"Content-Type": "application/json",
					},
					body: body ? JSON.stringify(body) : undefined,
					signal: controller.signal,
				});

				const duration = Date.now() - startTime;
				logger.debug(`[API-TRACE ${traceId}] Response: ${response.status} | Duration: ${duration}ms | Attempt: ${attemptCount + 1}`);

				if (!response.ok) {
					
					// Handle rate limiting specifically
					if (response.status === 429) {
						const retryAfter = response.headers.get('Retry-After');
						const waitTime = retryAfter 
							? parseInt(retryAfter) * 1000 
							: Math.min(2 ** attemptCount * 1000, 30000); // Max 30s
						
						logger.warn(`Rate limited (429) on ${endpoint}. Waiting ${waitTime}ms before retry...`);
						
						if (attemptCount < 3) {
							await new Promise(resolve => setTimeout(resolve, waitTime));
							return attempt(attemptCount + 1);
						}
						
						throw new Error(`Rate limit exceeded after ${attemptCount} retries`);
					}
					
					// Retry on server errors (5xx) but not client errors (4xx)
					if (response.status >= 500 && attemptCount < 2) {
						logger.warn(`Lever API error ${response.status} on ${endpoint}, retrying... (attempt ${attemptCount + 1}/3)`);
						// Wait before retrying (exponential backoff)
						await new Promise(resolve => setTimeout(resolve, 2 ** attemptCount * 1000));
						return attempt(attemptCount + 1);
					}
					
					// Log 404 errors specifically
					if (response.status === 404) {
						logger.error(`Lever API 404: Resource not found at ${endpoint}`);
					}
					
					throw new Error(`Lever API error: ${response.status} on ${endpoint}`);
				}

				const responseData = await response.json();
				
				// Log if we get an empty response
				if (!responseData || (typeof responseData === 'object' && Object.keys(responseData).length === 0)) {
					logger.debug(`Empty response from Lever API for ${endpoint}`);
				}
				
				logger.debug(`[API-TRACE ${traceId}] SUCCESS | Total duration: ${Date.now() - startTime}ms`);
				return responseData as T;
			} catch (error) {
				// Treat a timeout/abort as a retryable error.
				const isAbort = (error as Error)?.name === "AbortError";
				const isNetwork = error instanceof TypeError && error.message.includes('fetch');
				if (attemptCount < 2 && (isNetwork || isAbort)) {
					logger.warn(`${isAbort ? 'Request timed out' : 'Network error'} on ${endpoint}, retrying... (attempt ${attemptCount + 1}/3)`);
					await new Promise(resolve => setTimeout(resolve, 2 ** attemptCount * 1000));
					return attempt(attemptCount + 1);
				}
				if (isAbort) {
					throw new Error(`Lever API request timed out after ${timeoutMs / 1000}s`);
				}
				throw error;
			} finally {
				clearTimeout(timer);
			}
		};

		// Queue requests to ensure rate limiting. The chain-advancing promise
		// (assigned to this.requestQueue) is decoupled from the result promise
		// (returned to the caller). A rejection in the work body must NOT poison
		// the queue: we swallow it ONLY for chain continuation, while the caller
		// still observes the real resolve/reject via `run`.
		const run = this.requestQueue.then(async () => {
			await this.rateLimit();
			return attempt(retryCount);
		});

		// Advance the chain regardless of outcome; swallow ONLY here so a
		// rejection does not block later requests. The caller sees `run`.
		this.requestQueue = run.catch(() => {});

		return run as Promise<T>;
	}

	async getOpportunities(params: {
		stage_id?: string;
		posting_id?: string;
		email?: string;
		tag?: string;
		origin?: string;
		limit?: number;
		offset?: string;
		expand?: string[];
	}): Promise<LeverApiResponse<LeverOpportunity>> {
		// Default expand to include owner so recruiter data is always available
		const expand = params.expand || ["owner"];
		const { expand: _ignored, ...restParams } = params;

		const response = await this.makeRequest<LeverApiResponse<LeverOpportunity>>(
			"GET",
			"/opportunities",
			{ ...restParams, expand },
		);
		
		// Debug logging
		if (response && response.data && response.data.length > 0) {
			logger.debug(`getOpportunities: Got ${response.data.length} candidates, first has name: ${response.data[0]!.name || 'NO_NAME'}`);
		}
		
		return response;
	}

	async getOpportunity(id: string): Promise<{ data: LeverOpportunity }> {
		try {
			// The API returns { data: opportunity } structure, so we expect that format
			// Expand owner to get recruiter name instead of just a UUID
			const response = await this.makeRequest<{ data: LeverOpportunity }>(
			"GET",
			`/opportunities/${id}`,
			{ expand: ["owner"] },
		);
			
			// Check if the API returned null or undefined
			if (!response || !response.data) {
				logger.error(`API returned null/undefined for opportunity ${id}`);
				throw new Error(`Opportunity ${id} not found - API returned empty response`);
			}
			
			// Log successful fetch for debugging
			logger.debug(`Successfully fetched opportunity ${id}, has data: ${!!response.data}`);
			logger.debug(`Opportunity data:`, JSON.stringify(response).substring(0, 200));
			return response;
		} catch (error) {
			logger.error(`Failed to fetch opportunity ${id}: ${(error as Error)?.name || "error"}`);
			throw error;
		}
	}

	async addNote(
		opportunityId: string,
		note: string,
		authorEmail?: string,
	): Promise<{ data: LeverNote }> {
		const data: { value: string; author?: string } = { value: note };
		if (authorEmail) {
			data.author = authorEmail;
		}
		return this.makeRequest<{ data: LeverNote }>(
			"POST",
			`/opportunities/${opportunityId}/notes`,
			undefined,
			data,
		);
	}

	async getPostings(
		state: string = "published",
		limit: number = 25,
		offset?: string,
		expand?: string[], // Add support for expanding fields like owner, hiringManager
		include?: string[], // Add support for including optional fields
	): Promise<LeverApiResponse<LeverPosting>> {
		const params: Record<string, unknown> = {
			state,
			limit: Math.min(limit, 100),
		};
		if (offset) {
			params.offset = offset;
		}
		
		// Support for expanding user objects (owner, hiringManager, etc.)
		// Pass array directly - makeRequest will handle multiple values
		if (expand && expand.length > 0) {
			params.expand = expand;
		}
		
		// Support for including optional fields
		// Pass array directly - makeRequest will handle multiple values
		if (include && include.length > 0) {
			params.include = include;
		}
		
		return this.makeRequest<LeverApiResponse<LeverPosting>>(
			"GET",
			"/postings",
			params,
		);
	}

	async getStages(): Promise<LeverApiResponse<LeverStage>> {
		return this.makeRequest<LeverApiResponse<LeverStage>>("GET", "/stages");
	}

	async getArchiveReasons(): Promise<LeverApiResponse<LeverArchiveReason>> {
		return this.makeRequest<LeverApiResponse<LeverArchiveReason>>("GET", "/archive_reasons");
	}

	async archiveOpportunity(
		opportunityId: string,
		reasonId: string,
		performAs?: string,
		cleanInterviews?: boolean,
		requisitionId?: string,
	): Promise<{ data: LeverOpportunity }> {
		const data: {
			reason: string;
			perform_as?: string;
			cleanInterviews?: boolean;
			requisitionId?: string;
		} = { reason: reasonId };
		if (performAs) {
			data.perform_as = performAs;
		}
		if (cleanInterviews !== undefined) {
			data.cleanInterviews = cleanInterviews;
		}
		if (requisitionId) {
			data.requisitionId = requisitionId;
		}
		return this.makeRequest<{ data: LeverOpportunity }>(
			"PUT", // Changed from POST to PUT to match API docs
			`/opportunities/${opportunityId}/archived`,
			undefined,
			data,
		);
	}

	async getOpportunityApplications(opportunityId: string): Promise<LeverApiResponse<LeverApplication>> {
		return this.makeRequest<LeverApiResponse<LeverApplication>>(
			"GET",
			`/opportunities/${opportunityId}/applications`,
		);
	}

	async getApplication(
		opportunityId: string,
		applicationId: string,
	): Promise<{ data: LeverApplication }> {
		return this.makeRequest<{ data: LeverApplication }>(
			"GET",
			`/opportunities/${opportunityId}/applications/${applicationId}`,
		);
	}

	async getOpportunityFiles(opportunityId: string): Promise<LeverApiResponse<LeverFile>> {
		return this.makeRequest<LeverApiResponse<LeverFile>>("GET", `/opportunities/${opportunityId}/files`);
	}

	async getOpportunityResumes(opportunityId: string): Promise<LeverApiResponse<LeverFile>> {
		return this.makeRequest<LeverApiResponse<LeverFile>>("GET", `/opportunities/${opportunityId}/resumes`);
	}

	async updateOpportunityStage(
		opportunityId: string,
		stageId: string,
		performAs?: string,
	): Promise<{ data: LeverOpportunity }> {
		const data: { stage: string; perform_as?: string } = { stage: stageId };
		if (performAs) {
			data.perform_as = performAs;
		}
		return this.makeRequest<{ data: LeverOpportunity }>(
			"PUT", // Changed from POST to PUT to match API docs
			`/opportunities/${opportunityId}/stage`,
			undefined,
			data,
		);
	}

	// New requisition methods
	async getRequisitions(params?: {
		status?: string;
		requisition_code?: string;
		created_at_start?: number;
		created_at_end?: number;
		confidentiality?: string;
		limit?: number;
		offset?: string;
	}): Promise<LeverApiResponse<LeverRequisition>> {
		return this.makeRequest<LeverApiResponse<LeverRequisition>>("GET", "/requisitions", params);
	}

	async getRequisition(requisitionId: string): Promise<{ data: LeverRequisition }> {
		return this.makeRequest<{ data: LeverRequisition }>("GET", `/requisitions/${requisitionId}`);
	}

	async getRequisitionByCode(requisitionCode: string): Promise<{ data: LeverRequisition }> {
		// First try to find by code using the filter
		const response = await this.getRequisitions({
			requisition_code: requisitionCode,
			limit: 1,
		});
		
		const first = response?.data?.[0];
		if (first) {
			return { data: first };
		}
		
		throw new Error(`Requisition with code '${requisitionCode}' not found`);
	}

	async createRequisition(data: Record<string, unknown>): Promise<{ data: LeverRequisition }> {
		return this.makeRequest<{ data: LeverRequisition }>("POST", "/requisitions", undefined, data);
	}

	async updateRequisition(requisitionId: string, data: Record<string, unknown>): Promise<{ data: LeverRequisition }> {
		return this.makeRequest<{ data: LeverRequisition }>("PUT", `/requisitions/${requisitionId}`, undefined, data);
	}

	async deleteRequisition(requisitionId: string): Promise<{ data: LeverRequisition }> {
		return this.makeRequest<{ data: LeverRequisition }>("DELETE", `/requisitions/${requisitionId}`);
	}



	// Add method to find postings by owner name
	async getPostingsByOwner(ownerName: string, state: string = "published"): Promise<LeverApiResponse<LeverPosting>> {
		// Fetch more postings to ensure we don't miss any (but not ALL)
		const allPostings: LeverPosting[] = [];
		let offset: string | undefined;
		let batchesFetched = 0;
		const maxBatches = 5; // Fetch up to 500 postings (5 batches of 100)
		
		// Fetch multiple batches to increase coverage
		while (batchesFetched < maxBatches) {
			const response = await this.getPostings(state, 100, offset, ["owner", "hiringManager"]);
			
			if (response.data && response.data.length > 0) {
				allPostings.push(...response.data);
			}
			
			batchesFetched++;
			
			// Stop if no more data
			if (!response.hasNext || !response.next) {
				break;
			}
			
			offset = response.next;
		}
		
		logger.debug(`getPostingsByOwner: Fetched ${allPostings.length} postings in ${batchesFetched} batches for owner search: ${ownerName}`);
		
		// Filter by owner name (case-insensitive partial match)
		const filteredPostings = allPostings.filter(posting => {
			if (typeof posting.owner === "object" && posting.owner?.name) {
				return posting.owner.name.toLowerCase().includes(ownerName.toLowerCase());
			}
			return false;
		});
		
		logger.debug(`getPostingsByOwner: Found ${filteredPostings.length} postings for ${ownerName}`);
		
		return {
			data: filteredPostings,
			hasNext: false,
			next: undefined,
		};
	}

	// Add method to search archived candidates specifically
	async getArchivedCandidates(params: {
		posting_id?: string;
		archived_at_start?: string;
		archived_at_end?: string;
		archive_reason_id?: string;
		limit?: number;
		offset?: string; // Add pagination support
	}): Promise<LeverApiResponse<LeverOpportunity>> {
		const queryParams: Record<string, unknown> = {
			archived: true,  // Key parameter to get archived candidates
			limit: Math.min(params.limit || 100, 100),
		};

		// Add pagination offset if provided
		if (params.offset) {
			queryParams.offset = params.offset;
		}

		// Add date filters if provided
		if (params.archived_at_start) {
			queryParams.archived_at_start = params.archived_at_start;
		}
		if (params.archived_at_end) {
			queryParams.archived_at_end = params.archived_at_end;
		}

		// Filter by posting if provided
		if (params.posting_id) {
			queryParams.posting_id = params.posting_id;
		}

		// Filter by archive reason if provided
		if (params.archive_reason_id) {
			queryParams.archive_reason_id = params.archive_reason_id;
		}

		// Expand user objects for better data
		queryParams.expand = ["owner", "posting"];

		return this.makeRequest("GET", "/opportunities", queryParams);
	}

	// Tag management methods
	async addCandidateTags(
		opportunityId: string,
		tags: string[],
		performAs?: string
	): Promise<{ data: LeverOpportunity }> {
		const params: { perform_as?: string } = {};
		if (performAs) {
			params.perform_as = performAs;
		}
		
		return this.makeRequest<{ data: LeverOpportunity }>(
			"POST",
			`/opportunities/${opportunityId}/addTags`,
			params,
			{ tags }
		);
	}

	async removeCandidateTags(
		opportunityId: string,
		tags: string[],
		performAs?: string
	): Promise<{ data: LeverOpportunity }> {
		const params: { perform_as?: string } = {};
		if (performAs) {
			params.perform_as = performAs;
		}
		
		return this.makeRequest<{ data: LeverOpportunity }>(
			"POST",
			`/opportunities/${opportunityId}/removeTags`,
			params,
			{ tags }
		);
	}

	// Interview and Panel Management Methods
	
	/**
	 * Retrieves all interviews for a specific opportunity
	 * @param opportunityId The ID of the opportunity
	 * @returns Promise resolving to an array of LeverInterview objects
	 */
	async getOpportunityInterviews(opportunityId: string): Promise<{ data: LeverInterview[], hasNext: boolean }> {
		return this.makeRequest('GET', `opportunities/${opportunityId}/interviews`);
	}

	/**
	 * Retrieves a specific interview by ID
	 * @param opportunityId The ID of the opportunity
	 * @param interviewId The ID of the interview
	 * @returns Promise resolving to a LeverInterview object
	 */
	async getInterview(opportunityId: string, interviewId: string): Promise<{ data: LeverInterview }> {
		return this.makeRequest('GET', `opportunities/${opportunityId}/interviews/${interviewId}`);
	}

	/**
	 * Retrieves all panels for a specific opportunity
	 * @param opportunityId The ID of the opportunity
	 * @returns Promise resolving to an array of LeverPanel objects
	 */
	async getOpportunityPanels(opportunityId: string): Promise<{ data: LeverPanel[], hasNext: boolean }> {
		return this.makeRequest('GET', `opportunities/${opportunityId}/panels`);
	}

	/**
	 * Retrieves a specific panel by ID
	 * @param opportunityId The ID of the opportunity
	 * @param panelId The ID of the panel
	 * @returns Promise resolving to a LeverPanel object
	 */
	async getPanel(opportunityId: string, panelId: string): Promise<{ data: LeverPanel }> {
		return this.makeRequest('GET', `opportunities/${opportunityId}/panels/${panelId}`);
	}

	/**
	 * Creates a new interview for an opportunity
	 * @param opportunityId The ID of the opportunity
	 * @param interviewData The interview data to create
	 * @param performAs Optional user ID to perform action as
	 * @returns Promise resolving to the created LeverInterview object
	 */
	async createInterview(
		opportunityId: string,
		interviewData: {
			panel: string;
			subject?: string;
			note?: string;
			interviewers: Array<{ id: string; feedbackTemplate?: string }>;
			date: number;
			duration: number;
			location?: string;
			feedbackTemplate?: string;
			feedbackReminder?: string;
		},
		performAs?: string
	): Promise<{ data: LeverInterview }> {
		const params: { perform_as?: string } = {};
		if (performAs) {
			params.perform_as = performAs;
		}
		return this.makeRequest('POST', `opportunities/${opportunityId}/interviews`, params, interviewData);
	}

	/**
	 * Creates a new panel for an opportunity
	 * @param opportunityId The ID of the opportunity
	 * @param panelData The panel data to create
	 * @param performAs Optional user ID to perform action as
	 * @returns Promise resolving to the created LeverPanel object
	 */
	async createPanel(
		opportunityId: string,
		panelData: {
			applications?: string[];
			timezone: string;
			feedbackReminder?: string;
			note?: string;
			externalUrl?: string;
			interviews: Array<{
				subject?: string;
				note?: string;
				interviewers: Array<{ id: string; feedbackTemplate?: string }>;
				date: number;
				duration: number;
				location?: string;
				feedbackTemplate?: string;
				feedbackReminder?: string;
			}>;
		},
		performAs?: string
	): Promise<{ data: LeverPanel }> {
		const params: { perform_as?: string } = {};
		if (performAs) {
			params.perform_as = performAs;
		}
		return this.makeRequest('POST', `opportunities/${opportunityId}/panels`, params, panelData);
	}

	/**
	 * Updates an existing interview
	 * @param opportunityId The ID of the opportunity
	 * @param interviewId The ID of the interview to update
	 * @param interviewData The updated interview data
	 * @param performAs Optional user ID to perform action as
	 * @returns Promise resolving to the updated LeverInterview object
	 */
	async updateInterview(
		opportunityId: string,
		interviewId: string,
		interviewData: Partial<{
			panel: string;
			subject?: string;
			note?: string;
			interviewers: Array<{ id: string; feedbackTemplate?: string }>;
			date: number;
			duration: number;
			location?: string;
			feedbackTemplate?: string;
			feedbackReminder?: string;
		}>,
		performAs?: string
	): Promise<{ data: LeverInterview }> {
		const params: { perform_as?: string } = {};
		if (performAs) {
			params.perform_as = performAs;
		}
		return this.makeRequest('PUT', `opportunities/${opportunityId}/interviews/${interviewId}`, params, interviewData);
	}

	/**
	 * Updates an existing panel
	 * @param opportunityId The ID of the opportunity
	 * @param panelId The ID of the panel to update
	 * @param panelData The updated panel data
	 * @param performAs Optional user ID to perform action as
	 * @returns Promise resolving to the updated LeverPanel object
	 */
	async updatePanel(
		opportunityId: string,
		panelId: string,
		panelData: Partial<{
			applications?: string[];
			timezone: string;
			feedbackReminder?: string;
			note?: string;
			externalUrl?: string;
			interviews: Array<{
				subject?: string;
				note?: string;
				interviewers: Array<{ id: string; feedbackTemplate?: string }>;
				date: number;
				duration: number;
				location?: string;
				feedbackTemplate?: string;
				feedbackReminder?: string;
			}>;
		}>,
		performAs?: string
	): Promise<{ data: LeverPanel }> {
		const params: { perform_as?: string } = {};
		if (performAs) {
			params.perform_as = performAs;
		}
		return this.makeRequest('PUT', `opportunities/${opportunityId}/panels/${panelId}`, params, panelData);
	}

	/**
	 * Deletes an interview
	 * @param opportunityId The ID of the opportunity
	 * @param interviewId The ID of the interview to delete
	 * @param performAs Optional user ID to perform action as
	 * @returns Promise resolving to a success message
	 */
	async deleteInterview(
		opportunityId: string,
		interviewId: string,
		performAs?: string
	): Promise<void> {
		const params: { perform_as?: string } = {};
		if (performAs) {
			params.perform_as = performAs;
		}
		await this.makeRequest('DELETE', `opportunities/${opportunityId}/interviews/${interviewId}`, params);
	}

	/**
	 * Deletes a panel
	 * @param opportunityId The ID of the opportunity
	 * @param panelId The ID of the panel to delete
	 * @param performAs Optional user ID to perform action as
	 * @returns Promise resolving to a success message
	 */
	async deletePanel(
		opportunityId: string,
		panelId: string,
		performAs?: string
	): Promise<void> {
		const params: { perform_as?: string } = {};
		if (performAs) {
			params.perform_as = performAs;
		}
		await this.makeRequest('DELETE', `opportunities/${opportunityId}/panels/${panelId}`, params);
	}

	async getUsers(params?: {
		limit?: number;
		offset?: string;
		includeDeactivated?: boolean;
	}): Promise<LeverApiResponse<LeverUser>> {
		const queryParams: { limit: number; offset?: string; includeDeactivated?: boolean } = {
			limit: Math.min(params?.limit || 100, 100),
		};
		if (params?.offset) {
			queryParams.offset = params.offset;
		}
		if (params?.includeDeactivated) {
			queryParams.includeDeactivated = true;
		}
		return this.makeRequest<LeverApiResponse<LeverUser>>("GET", "/users", queryParams);
	}

	async getUser(userId: string): Promise<{ data: LeverUser }> {
		return this.makeRequest<{ data: LeverUser }>("GET", `/users/${userId}`);
	}

	// Read-only methods for notes, feedback, emails — M1.7 (VAL-013)
	// Response item types tightened to proper Lever shapes in M3a (VAL-202).

	async getNotes(
		opportunityId: string,
		params?: { limit?: number; offset?: string },
	): Promise<LeverApiResponse<LeverNote>> {
		const queryParams: { limit: number; offset?: string } = {
			limit: Math.min(params?.limit || 100, 100),
		};
		if (params?.offset) {
			queryParams.offset = params.offset;
		}
		return this.makeRequest<LeverApiResponse<LeverNote>>(
			"GET",
			`/opportunities/${opportunityId}/notes`,
			queryParams,
		);
	}

	async getNote(
		opportunityId: string,
		noteId: string,
	): Promise<{ data: LeverNote }> {
		return this.makeRequest<{ data: LeverNote }>(
			"GET",
			`/opportunities/${opportunityId}/notes/${noteId}`,
		);
	}

	async getOpportunityFeedback(
		opportunityId: string,
		params?: { limit?: number; offset?: string },
	): Promise<LeverApiResponse<LeverFeedback>> {
		const queryParams: { limit: number; offset?: string } = {
			limit: Math.min(params?.limit || 100, 100),
		};
		if (params?.offset) {
			queryParams.offset = params.offset;
		}
		return this.makeRequest<LeverApiResponse<LeverFeedback>>(
			"GET",
			`/opportunities/${opportunityId}/feedback`,
			queryParams,
		);
	}

	async getFeedback(
		opportunityId: string,
		feedbackId: string,
	): Promise<{ data: LeverFeedback }> {
		return this.makeRequest<{ data: LeverFeedback }>(
			"GET",
			`/opportunities/${opportunityId}/feedback/${feedbackId}`,
		);
	}

	async getFeedbackTemplates(params?: {
		limit?: number;
		offset?: string;
	}): Promise<LeverApiResponse<LeverFeedbackTemplate>> {
		const queryParams: { limit: number; offset?: string } = {
			limit: Math.min(params?.limit || 100, 100),
		};
		if (params?.offset) {
			queryParams.offset = params.offset;
		}
		return this.makeRequest<LeverApiResponse<LeverFeedbackTemplate>>(
			"GET",
			"/feedback_templates",
			queryParams,
		);
	}

	async getEmails(
		opportunityId: string,
		params?: { limit?: number; offset?: string },
	): Promise<LeverApiResponse<LeverEmail>> {
		const queryParams: { limit: number; offset?: string } = {
			limit: Math.min(params?.limit || 100, 100),
		};
		if (params?.offset) {
			queryParams.offset = params.offset;
		}
		return this.makeRequest<LeverApiResponse<LeverEmail>>(
			"GET",
			`/opportunities/${opportunityId}/emails`,
			queryParams,
		);
	}

	async submitFeedback(
		opportunityId: string,
		baseTemplateId: string,
		fieldValues: Array<{ id: string; value: unknown }>,
		options?: {
			interview?: string;
			panel?: string;
			performAs?: string;
			/**
			 * When true (default), sets completedAt to Date.now() in the POST body
			 * so Lever marks the feedback form as submitted/complete. When false,
			 * omits completedAt → feedback record is created as a DRAFT visible in
			 * the Lever UI but not yet finalized.
			 *
			 * Empirical finding 2026-05-28: omitting completedAt creates a draft,
			 * NOT a submitted form (despite Lever docs saying "Defaults to now").
			 * Manish Katheeth feedback (e098e104) was stuck as draft for ~11h
			 * until manually completed in the UI. Fixed by sending completedAt.
			 */
			markComplete?: boolean;
			/**
			 * Explicit completion timestamp (ms). If set, overrides markComplete.
			 * Used for backdating feedback to match the actual interview time.
			 */
			completedAt?: number;
		},
	): Promise<{ data: LeverFeedback }> {
		const data: {
			baseTemplateId: string;
			fieldValues: Array<{ id: string; value: unknown }>;
			interview?: string;
			panel?: string;
			completedAt?: number;
		} = {
			baseTemplateId,
			fieldValues,
		};
		if (options?.interview) data.interview = options.interview;
		if (options?.panel) data.panel = options.panel;

		// completedAt semantics:
		//   explicit number → use as-is (backdating)
		//   markComplete !== false → Date.now() (default: submit-as-complete)
		//   markComplete === false → omit → draft mode
		if (typeof options?.completedAt === "number") {
			data.completedAt = options.completedAt;
		} else if (options?.markComplete !== false) {
			data.completedAt = Date.now();
		}

		const params: { perform_as?: string } = {};
		if (options?.performAs) {
			params.perform_as = options.performAs;
		}

		return this.makeRequest<{ data: LeverFeedback }>(
			"POST",
			`/opportunities/${opportunityId}/feedback`,
			Object.keys(params).length > 0 ? params : undefined,
			data,
		);
	}
}
