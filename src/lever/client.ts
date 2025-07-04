import { LeverApiResponse, LeverOpportunity, LeverPosting } from '../types/lever';

export class LeverClient {
  private baseUrl = 'https://api.lever.co/v1';
  private requestQueue: Promise<any> = Promise.resolve();
  private lastRequestTime = 0;
  private minRequestInterval = 125; // 8 requests per second

  constructor(private apiKey: string) {}

  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      await new Promise(resolve => 
        setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest)
      );
    }
    
    this.lastRequestTime = Date.now();
  }

  private async makeRequest<T>(
    method: string,
    endpoint: string,
    params?: Record<string, any>,
    body?: any
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
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: body ? JSON.stringify(body) : undefined
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
      'GET',
      '/opportunities',
      params
    );
  }

  async getOpportunity(id: string): Promise<LeverOpportunity> {
    return this.makeRequest<LeverOpportunity>('GET', `/opportunities/${id}`);
  }

  async addNote(opportunityId: string, note: string): Promise<any> {
    return this.makeRequest('POST', `/opportunities/${opportunityId}/notes`, undefined, {
      value: note
    });
  }

  async getPostings(state: string = 'published'): Promise<LeverApiResponse<LeverPosting>> {
    return this.makeRequest<LeverApiResponse<LeverPosting>>('GET', '/postings', { state });
  }

  async getStages(): Promise<any> {
    return this.makeRequest('GET', '/stages');
  }

  async getArchiveReasons(): Promise<any> {
    return this.makeRequest('GET', '/archive_reasons');
  }

  async archiveOpportunity(opportunityId: string, reasonId: string): Promise<any> {
    return this.makeRequest('POST', `/opportunities/${opportunityId}/archived`, undefined, {
      reason: reasonId
    });
  }

  async getApplications(opportunityId: string): Promise<any> {
    return this.makeRequest('GET', `/opportunities/${opportunityId}/applications`);
  }

  async getFiles(opportunityId: string): Promise<any> {
    return this.makeRequest('GET', `/opportunities/${opportunityId}/files`);
  }
}