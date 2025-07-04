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

			const response = await fetch(url.toString(), {
				method,
				headers: {
					Authorization: `Bearer ${this.apiKey}`,
					"Content-Type": "application/json",
				},
				body: body ? JSON.stringify(body) : undefined,
			});

			if (!response.ok) {
				const error = await response.text();
				throw new Error(`Lever API error: ${response.status} - ${error}`);
			}

			return response.json();
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
		const opportunity = await this.makeRequest<LeverOpportunity>(
			"GET",
			`/opportunities/${id}`,
		);
		return { data: opportunity };
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
