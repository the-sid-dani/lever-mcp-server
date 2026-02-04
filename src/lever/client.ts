import type {
	LeverApiResponse,
	LeverOpportunity,
	LeverPosting,
	LeverInterview,
	LeverPanel,
} from "../types/lever.js";

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
	private requestQueue: Promise<any> = Promise.resolve();
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
		params?: Record<string, any>,
		body?: any,
		retryCount: number = 0,
	): Promise<T> {
		// Queue requests to ensure rate limiting
		this.requestQueue = this.requestQueue.then(async () => {
			await this.rateLimit();

			const url = new URL(`${this.baseUrl}${endpoint}`);

			if (params) {
				Object.entries(params).forEach(([key, value]) => {
					if (value !== undefined && value !== null) {
						// Handle arrays by appending multiple times
						if (Array.isArray(value)) {
							value.forEach(v => url.searchParams.append(key, String(v)));
						} else {
							url.searchParams.append(key, String(value));
						}
					}
				});
			}

			const traceId = `api-${Date.now()}-${Math.random().toString(36).substring(7)}`;
			console.log(`[API-TRACE ${traceId}] START ${method} ${endpoint}`);
			const startTime = Date.now();

			try {
				const response = await fetch(url.toString(), {
					method,
					headers: {
						Authorization: `Bearer ${this.apiKey}`,
						"Content-Type": "application/json",
					},
					body: body ? JSON.stringify(body) : undefined,
				});

				const duration = Date.now() - startTime;
				console.log(`[API-TRACE ${traceId}] Response: ${response.status} | Duration: ${duration}ms | Attempt: ${retryCount + 1}`);

				if (!response.ok) {
					const errorText = await response.text();
					
					// Handle rate limiting specifically
					if (response.status === 429) {
						const retryAfter = response.headers.get('Retry-After');
						const waitTime = retryAfter 
							? parseInt(retryAfter) * 1000 
							: Math.min(2 ** retryCount * 1000, 30000); // Max 30s
						
						console.error(`Rate limited (429). Waiting ${waitTime}ms before retry...`);
						
						if (retryCount < 3) {
							await new Promise(resolve => setTimeout(resolve, waitTime));
							return this.makeRequest<T>(method, endpoint, params, body, retryCount + 1);
						}
						
						throw new Error(`Rate limit exceeded after ${retryCount} retries`);
					}
					
					// Retry on server errors (5xx) but not client errors (4xx)
					if (response.status >= 500 && retryCount < 2) {
						console.error(`Lever API error ${response.status}, retrying... (attempt ${retryCount + 1}/3)`);
						// Wait before retrying (exponential backoff)
						await new Promise(resolve => setTimeout(resolve, 2 ** retryCount * 1000));
						return this.makeRequest<T>(method, endpoint, params, body, retryCount + 1);
					}
					
					// Log 404 errors specifically
					if (response.status === 404) {
						console.error(`Lever API 404: Resource not found at ${endpoint}`);
					}
					
					throw new Error(`Lever API error: ${response.status} - ${errorText}`);
				}

				const responseData = await response.json();
				
				// Log if we get an empty response
				if (!responseData || (typeof responseData === 'object' && Object.keys(responseData).length === 0)) {
					console.warn(`Empty response from Lever API for ${endpoint}`);
				}
				
				console.log(`[API-TRACE ${traceId}] SUCCESS | Total duration: ${Date.now() - startTime}ms`);
				return responseData;
			} catch (error) {
				// Retry on network errors
				if (retryCount < 2 && error instanceof TypeError && error.message.includes('fetch')) {
					console.error(`Network error, retrying... (attempt ${retryCount + 1}/3)`);
					await new Promise(resolve => setTimeout(resolve, 2 ** retryCount * 1000));
					return this.makeRequest<T>(method, endpoint, params, body, retryCount + 1);
				}
				throw error;
			}
		});

		return this.requestQueue;
	}

	async getOpportunities(params: {
		stage_id?: string;
		posting_id?: string;
		email?: string;
		tag?: string;
		origin?: string;
		limit?: number;
		offset?: string;
	}): Promise<LeverApiResponse<LeverOpportunity>> {
		const response = await this.makeRequest<LeverApiResponse<LeverOpportunity>>(
			"GET",
			"/opportunities",
			params,
		);
		
		// Debug logging
		if (response && response.data && response.data.length > 0) {
			console.log(`getOpportunities: Got ${response.data.length} candidates, first has name: ${response.data[0].name || 'NO_NAME'}`);
		}
		
		return response;
	}

	async getOpportunity(id: string): Promise<{ data: LeverOpportunity }> {
		try {
			// The API returns { data: opportunity } structure, so we expect that format
			const response = await this.makeRequest<{ data: LeverOpportunity }>(
			"GET",
			`/opportunities/${id}`,
		);
			
			// Check if the API returned null or undefined
			if (!response || !response.data) {
				console.error(`API returned null/undefined for opportunity ${id}`);
				throw new Error(`Opportunity ${id} not found - API returned empty response`);
			}
			
			// Log successful fetch for debugging
			console.log(`Successfully fetched opportunity ${id}, has data: ${!!response.data}`);
			console.log(`Opportunity data:`, JSON.stringify(response).substring(0, 200));
			return response;
		} catch (error) {
			console.error(`Failed to fetch opportunity ${id}:`, error);
			throw error;
		}
	}

	async addNote(
		opportunityId: string,
		note: string,
		authorEmail?: string,
	): Promise<any> {
		const data: any = { value: note };
		if (authorEmail) {
			data.author = authorEmail;
		}
		return this.makeRequest(
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
		const params: any = {
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

	async getStages(): Promise<any> {
		return this.makeRequest("GET", "/stages");
	}

	async getArchiveReasons(): Promise<any> {
		return this.makeRequest("GET", "/archive_reasons");
	}

	async archiveOpportunity(
		opportunityId: string,
		reasonId: string,
		performAs?: string,
		cleanInterviews?: boolean,
		requisitionId?: string,
	): Promise<any> {
		const data: any = { reason: reasonId };
		if (performAs) {
			data.perform_as = performAs;
		}
		if (cleanInterviews !== undefined) {
			data.cleanInterviews = cleanInterviews;
		}
		if (requisitionId) {
			data.requisitionId = requisitionId;
		}
		return this.makeRequest(
			"PUT", // Changed from POST to PUT to match API docs
			`/opportunities/${opportunityId}/archived`,
			undefined,
			data,
		);
	}

	async getOpportunityApplications(opportunityId: string): Promise<any> {
		return this.makeRequest(
			"GET",
			`/opportunities/${opportunityId}/applications`,
		);
	}

	async getApplication(
		opportunityId: string,
		applicationId: string,
	): Promise<any> {
		return this.makeRequest(
			"GET",
			`/opportunities/${opportunityId}/applications/${applicationId}`,
		);
	}

	async getOpportunityFiles(opportunityId: string): Promise<any> {
		return this.makeRequest("GET", `/opportunities/${opportunityId}/files`);
	}

	async getOpportunityResumes(opportunityId: string): Promise<any> {
		return this.makeRequest("GET", `/opportunities/${opportunityId}/resumes`);
	}

	async updateOpportunityStage(
		opportunityId: string,
		stageId: string,
		performAs?: string,
	): Promise<any> {
		const data: any = { stage: stageId };
		if (performAs) {
			data.perform_as = performAs;
		}
		return this.makeRequest(
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
	}): Promise<any> {
		return this.makeRequest("GET", "/requisitions", params);
	}

	async getRequisition(requisitionId: string): Promise<any> {
		return this.makeRequest("GET", `/requisitions/${requisitionId}`);
	}

	async getRequisitionByCode(requisitionCode: string): Promise<any> {
		// First try to find by code using the filter
		const response = await this.getRequisitions({
			requisition_code: requisitionCode,
			limit: 1,
		});
		
		if (response && response.data && response.data.length > 0) {
			return { data: response.data[0] };
		}
		
		throw new Error(`Requisition with code '${requisitionCode}' not found`);
	}

	async createRequisition(data: any): Promise<any> {
		return this.makeRequest("POST", "/requisitions", undefined, data);
	}

	async updateRequisition(requisitionId: string, data: any): Promise<any> {
		return this.makeRequest("PUT", `/requisitions/${requisitionId}`, undefined, data);
	}

	async deleteRequisition(requisitionId: string): Promise<any> {
		return this.makeRequest("DELETE", `/requisitions/${requisitionId}`);
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
		
		console.log(`getPostingsByOwner: Fetched ${allPostings.length} postings in ${batchesFetched} batches for owner search: ${ownerName}`);
		
		// Filter by owner name (case-insensitive partial match)
		const filteredPostings = allPostings.filter(posting => {
			if (typeof posting.owner === "object" && posting.owner?.name) {
				return posting.owner.name.toLowerCase().includes(ownerName.toLowerCase());
			}
			return false;
		});
		
		console.log(`getPostingsByOwner: Found ${filteredPostings.length} postings for ${ownerName}`);
		
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
		const queryParams: any = {
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
	): Promise<any> {
		const params: any = {};
		if (performAs) {
			params.perform_as = performAs;
		}
		
		return this.makeRequest(
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
	): Promise<any> {
		const params: any = {};
		if (performAs) {
			params.perform_as = performAs;
		}
		
		return this.makeRequest(
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
		const params: any = {};
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
		const params: any = {};
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
		const params: any = {};
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
		const params: any = {};
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
		const params: any = {};
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
		const params: any = {};
		if (performAs) {
			params.perform_as = performAs;
		}
		await this.makeRequest('DELETE', `opportunities/${opportunityId}/panels/${panelId}`, params);
	}

	// Note: The following methods are placeholders for functionality that may not be 
	// directly supported by the Lever API or require additional research:
	
	// async getUsers(): Promise<any> {
	//   // TODO: Implement if/when Lever API provides a users endpoint
	//   throw new Error("getUsers is not yet implemented - Lever API documentation needed");
	// }
	
	// async updateOpportunityOwner(opportunityId: string, ownerId: string): Promise<any> {
	//   // TODO: Implement if/when Lever API provides an owner update endpoint
	//   // The API doesn't seem to have a direct endpoint for updating the owner field
	//   throw new Error("updateOpportunityOwner is not yet implemented - Lever API may not support this directly");
	// }
}
