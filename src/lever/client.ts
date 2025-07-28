import type {
	LeverApiResponse,
	LeverOpportunity,
	LeverPosting,
} from "../types/lever";

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
						url.searchParams.append(key, String(value));
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
							: Math.min(Math.pow(2, retryCount) * 1000, 30000); // Max 30s
						
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
						await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
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
					await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
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
		if (expand && expand.length > 0) {
			expand.forEach(field => {
				// Lever API accepts multiple expand parameters
				params[`expand`] = field;
			});
		}
		
		// Support for including optional fields
		if (include && include.length > 0) {
			include.forEach(field => {
				params[`include`] = field;
			});
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

	// Add method to get interviews for a candidate
	async getOpportunityInterviews(opportunityId: string): Promise<any> {
		return this.makeRequest("GET", `/opportunities/${opportunityId}/interviews`);
	}

	// Add method to find postings by owner name
	async getPostingsByOwner(ownerName: string, state: string = "published"): Promise<LeverApiResponse<LeverPosting>> {
		// Get all postings with owner and hiringManager data expanded
		const response = await this.getPostings(state, 100, undefined, ["owner", "hiringManager"]);
		
		// Filter by owner name (case-insensitive partial match)
		const filteredPostings = response.data.filter(posting => {
			if (typeof posting.owner === "object" && posting.owner?.name) {
				return posting.owner.name.toLowerCase().includes(ownerName.toLowerCase());
			}
			return false;
		});
		
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
}
