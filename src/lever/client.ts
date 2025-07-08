import type {
	LeverApiResponse,
	LeverOpportunity,
	LeverPosting,
} from "../types/lever";

export class LeverClient {
	private baseUrl = "https://api.lever.co/v1";
	private requestQueue: Promise<any> = Promise.resolve();
	private lastRequestTime = 0;
	private minRequestInterval = 125; // 8 requests per second

	constructor(private apiKey: string) {}

	private async rateLimit(): Promise<void> {
		const now = Date.now();
		const timeSinceLastRequest = now - this.lastRequestTime;

		if (timeSinceLastRequest < this.minRequestInterval) {
			await new Promise((resolve) =>
				setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest),
			);
		}

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

			try {
				const response = await fetch(url.toString(), {
					method,
					headers: {
						Authorization: `Bearer ${this.apiKey}`,
						"Content-Type": "application/json",
					},
					body: body ? JSON.stringify(body) : undefined,
				});

				if (!response.ok) {
					const errorText = await response.text();
					
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
		return this.makeRequest<LeverApiResponse<LeverOpportunity>>(
			"GET",
			"/opportunities",
			params,
		);
	}

	async getOpportunity(id: string): Promise<{ data: LeverOpportunity }> {
		try {
			const opportunity = await this.makeRequest<LeverOpportunity>(
				"GET",
				`/opportunities/${id}`,
			);
			
			// Check if the API returned null or undefined
			if (!opportunity) {
				console.error(`API returned null/undefined for opportunity ${id}`);
				throw new Error(`Opportunity ${id} not found - API returned empty response`);
			}
			
			// Log successful fetch for debugging
			console.log(`Successfully fetched opportunity ${id}, has data: ${!!opportunity.id}`);
			return { data: opportunity };
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
	): Promise<LeverApiResponse<LeverPosting>> {
		const params: any = {
			state,
			limit: Math.min(limit, 100),
		};
		if (offset) {
			params.offset = offset;
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
	): Promise<any> {
		return this.makeRequest(
			"POST",
			`/opportunities/${opportunityId}/archived`,
			undefined,
			{
				reason: reasonId,
			},
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
		reason?: string,
	): Promise<any> {
		const data: any = { stage: stageId };
		if (reason) {
			data.reason = reason;
		}
		return this.makeRequest(
			"POST",
			`/opportunities/${opportunityId}/stage`,
			undefined,
			data,
		);
	}
}
