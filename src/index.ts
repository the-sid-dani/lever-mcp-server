import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { LeverClient } from "./lever/client";
import type { LeverOpportunity, LeverPosting } from "./types/lever";
import { registerAdditionalTools } from "./additional-tools";

// Environment interface
interface Env {
  LEVER_API_KEY: string;
}

// Helper to format opportunity data
function formatOpportunity(opp: LeverOpportunity): Record<string, any> {
  if (!opp || typeof opp !== 'object') {
    return {
      id: '',
      name: 'Error: Invalid data',
      email: 'N/A',
      stage: 'Unknown',
      posting: 'Unknown',
      location: 'Unknown',
      organizations: '',
      created: 'Unknown'
    };
  }

  const name = opp.name || 'Unknown';
  const emails = opp.emails || [];
  const email = emails[0] || 'N/A';
  
  const stageText = typeof opp.stage === 'object' && opp.stage ? 
    opp.stage.text : String(opp.stage || 'Unknown');
  
  const postingText = opp.posting && typeof opp.posting === 'object' ?
    opp.posting.text : 'Unknown';
  
  const location = typeof opp.location === 'object' && opp.location ?
    opp.location.name : String(opp.location || 'Unknown');

  const createdDate = opp.createdAt ? 
    new Date(opp.createdAt).toISOString().split('T')[0] : 'Unknown';

  return {
    id: opp.id || '',
    name,
    email,
    stage: stageText,
    posting: postingText,
    location,
    organizations: opp.headline || '',
    created: createdDate
  };
}

// Helper to format posting data
function formatPosting(posting: LeverPosting): Record<string, any> {
  return {
    id: posting.id || "",
    title: posting.text || "Unknown",
    state: posting.state || "Unknown",
    location: posting.location?.name || "Unknown",
    team: posting.team?.text || "Unknown",
    url: posting.urls?.show || ""
  };
}

// Define our Lever MCP agent
export class LeverMCP extends McpAgent {
  server = new McpServer({
    name: "Lever ATS",
    version: "1.0.0",
  });

  private client!: LeverClient;

  async init() {
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
        limit: z.number().default(100),
      },
      async (args) => {
        try {
          // Parse search criteria
          const companyList = args.companies ? args.companies.split(',').map(c => c.trim().toLowerCase()) : [];
          const skillList = args.skills ? args.skills.split(',').map(s => s.trim().toLowerCase()) : [];
          const locationList = args.locations ? args.locations.split(',').map(l => l.trim().toLowerCase()) : [];
          const tagList = args.tags ? args.tags.split(',').map(t => t.trim().toLowerCase()) : [];

          const allCandidates: LeverOpportunity[] = [];
          let offset: string | undefined;
          const maxFetch = Math.min(args.limit * 10, 1000);

          // Fetch candidates with pagination
          while (allCandidates.length < maxFetch) {
            // Add delay between requests to avoid rate limiting
            if (offset !== undefined) {  // Not the first request
              await new Promise(resolve => setTimeout(resolve, 200));  // 200ms delay = max 5 requests/second
            }

            const response = await this.client.getOpportunities({
              stage_id: args.stage,
              posting_id: args.posting_id,
              tag: args.tags ? args.tags.split(',')[0] : undefined,  // API only supports single tag
              limit: 100,
              offset
            });

            const candidates = response.data || [];
            
            // Filter candidates based on criteria
            const filteredCandidates = candidates.filter(c => {
              if (!c || typeof c !== 'object') return false;

              // Convert candidate data to lowercase for comparison
              const cName = (c.name || '').toLowerCase();
              const cEmails = c.emails || [];
              if (!Array.isArray(cEmails)) {
                return false;  // Skip invalid data
              }
              const cEmailsLower = cEmails.map(e => typeof e === 'string' ? e.toLowerCase() : '');
              
              const cTags = c.tags || [];
              if (!Array.isArray(cTags)) {
                return false;  // Skip invalid data
              }
              const cTagsLower = cTags.map(t => typeof t === 'string' ? t.toLowerCase() : '');
              
              const cLocation = c.location || '';
              let cLocationStr = '';
              if (typeof cLocation === 'object' && cLocation) {
                cLocationStr = (cLocation.name || '').toLowerCase();
              } else {
                cLocationStr = String(cLocation).toLowerCase();
              }
              
              // Get company info from headline field
              const cHeadline = String(c.headline || '').toLowerCase();
              const cOrganizations = c.organizations || [];
              let cOrganizationsLower: string[] = [];
              if (Array.isArray(cOrganizations)) {
                cOrganizationsLower = cOrganizations.map(o => String(o).toLowerCase());
              } else if (typeof cOrganizations === 'string') {
                cOrganizationsLower = [(cOrganizations as string).toLowerCase()];
              }
              
              // Combine all text for skills search
              let cAllText = `${cName} ${cEmailsLower.join(' ')} ${cTagsLower.join(' ')} ${cHeadline} ${cOrganizationsLower.join(' ')}`.toLowerCase();
              
              // Also check if resume exists for more comprehensive searching
              const cResume = String(c.resume || '').toLowerCase();
              if (cResume) {
                cAllText += ` ${cResume}`;
              }

              // Check each criteria
              // Company match: check in headline (primary) or organizations
              const companyMatch = !companyList.length || 
                companyList.some(comp => cHeadline.includes(comp) || 
                cOrganizationsLower.some(org => org.includes(comp)));

              // Skills match: ANY skill match (OR logic)
              const skillMatch = !skillList.length || 
                skillList.some(skill => cAllText.includes(skill));

              // Location match: ANY location match (handle UK variations)
              const ukVariations = ['uk', 'united kingdom', 'england', 'scotland', 'wales', 'northern ireland', 'britain', 'gb'];
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
                  if (['uk', 'united kingdom'].includes(loc) && ukVariations.some(ukVar => cLocationStr.includes(ukVar))) {
                    locationMatch = true;
                    break;
                  }
                }
              }

              // Tag match: ANY tag match
              const tagMatch = !tagList.length || 
                tagList.some(tag => cTagsLower.includes(tag));

              return companyMatch && skillMatch && locationMatch && tagMatch;
            });

            allCandidates.push(...filteredCandidates);

            if (!response.hasNext) break;
            
            // Get next offset from the last item
            if (candidates.length > 0) {
              offset = candidates[candidates.length - 1].id;
            } else {
              break;
            }
          }

          // Limit final results
          const finalCandidates = allCandidates.slice(0, args.limit);

          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                count: finalCandidates.length,
                search_criteria: {
                  companies: args.companies,
                  skills: args.skills,
                  locations: args.locations,
                  stage: args.stage,
                  tags: args.tags,
                  posting: args.posting_id
                },
                candidates: finalCandidates.map(formatOpportunity)
              }, null, 2)
            }]
          };
        } catch (error) {
          // Return a proper response structure even on error
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                error: error instanceof Error ? error.message : String(error),
                count: 0,
                search_criteria: {
                  companies: args.companies,
                  skills: args.skills,
                  locations: args.locations,
                  stage: args.stage,
                  tags: args.tags,
                  posting: args.posting_id
                },
                candidates: []
              }, null, 2)
            }]
          };
        }
      }
    );

    // Find by company tool
    this.server.tool(
      "lever_find_by_company",
      {
        companies: z.string(),
        current_only: z.boolean().default(true),
        limit: z.number().default(100),
      },
      async (args) => {
        try {
          // Parse company list
          const companyList = args.companies.split(',').map(c => c.trim());
          
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
              offset
            });
            
            const candidates = response.data || [];
            if (candidates.length === 0) break;
            
            totalFetched += candidates.length;
            
            // Filter to ensure company match in headline
            for (const candidate of candidates) {
              const headline = (candidate.headline || '').toLowerCase();
              const tags = (candidate.tags || []).map((t: string) => t.toLowerCase());
              
              // Check for company match
              let companyFound = false;
              let matchedCompany = '';
              
              for (const company of companyList) {
                const companyLower = company.toLowerCase();
                
                if (headline) {
                  // Split headline by comma to get individual companies
                  const headlineCompanies = headline.split(',').map(c => c.trim());
                  for (const hc of headlineCompanies) {
                    if (companyLower.includes(hc) || hc.includes(companyLower)) {
                      companyFound = true;
                      matchedCompany = company;
                      break;
                    }
                  }
                }
                
                if (!companyFound && tags.some(tag => tag.includes(companyLower))) {
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
                  full_headline: candidate.headline || ''
                });
              }
            }
            
            // Check if we have enough results
            if (allCandidates.length >= args.limit) break;
            
            if (!response.hasNext) break;
            
            // Get next offset
            if (candidates.length > 0) {
              offset = candidates[candidates.length - 1].id;
            } else {
              break;
            }
          }
          
          // Limit results
          const uniqueCandidates = allCandidates.slice(0, args.limit);
          
          const results = {
            count: uniqueCandidates.length,
            searched_companies: companyList,
            current_employees_only: args.current_only,
            candidates: uniqueCandidates.map(c => ({
              ...formatOpportunity(c),
              matched_company: c.matched_company || "Unknown",
              all_organizations: c.full_headline || c.headline || ""
            }))
          };
          
          return {
            content: [{
              type: "text",
              text: JSON.stringify(results, null, 2)
            }]
          };
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({ error: error instanceof Error ? error.message : String(error) })
            }]
          };
        }
      }
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
          const response = await this.client.getOpportunity(args.opportunity_id);
          const opportunity = response.data;
          
          // Extract basic info
          const name = opportunity.name || "Unknown";
          const emails = opportunity.emails || [];
          const location = typeof opportunity.location === 'object' && opportunity.location ? 
            opportunity.location.name : String(opportunity.location || "Unknown");
          
          // Format stage information
          let stage_current = "Unknown";
          let stage_id = "";
          if (typeof opportunity.stage === 'object' && opportunity.stage) {
            stage_current = opportunity.stage.text || "Unknown";
            stage_id = opportunity.stage.id || "";
          } else if (opportunity.stage) {
            stage_current = String(opportunity.stage);
          }
          
          // Format owner information
          let owner_name = "Unassigned";
          if (typeof opportunity.owner === 'object' && opportunity.owner) {
            owner_name = opportunity.owner.name || "Unassigned";
          }
          
          // Extract organizations from headline
          const headline = opportunity.headline || "";
          const organizations = headline ? headline.split(",").map(org => org.trim()) : [];
          
          // Get links and phones
          const links = opportunity.links || [];
          const phones = opportunity.phones || [];
          
          // Format created date
          const createdAt = opportunity.createdAt ? 
            new Date(opportunity.createdAt).toISOString().replace('T', ' ').substring(0, 16) : 
            "Unknown";
          
          const result = {
            basic_info: formatOpportunity(opportunity),
            contact: {
              emails: emails,
              phones: phones,
              location: location
            },
            stage: {
              current: stage_current,
              id: stage_id
            },
            tags: opportunity.tags || [],
            sources: opportunity.sources || [],
            origin: opportunity.origin || "Unknown",
            owner: owner_name,
            headline: headline,
            organizations: organizations,
            links: links,
            applications: opportunity.applications ? opportunity.applications.length : 0,
            createdAt: createdAt,
            archived: opportunity.archived || null
          };
          
          return {
            content: [{
              type: "text",
              text: JSON.stringify(result, null, 2)
            }]
          };
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                error: error instanceof Error ? error.message : 'Failed to fetch candidate'
              }, null, 2)
            }]
          };
        }
      }
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
          content: [{
            type: "text",
            text: `Note added successfully to candidate ${args.opportunity_id}`
          }]
        };
      }
    );

    // Archive candidate
    this.server.tool(
      "lever_archive_candidate",
      {
        opportunity_id: z.string(),
        reason_id: z.string(),
      },
      async (args) => {
        await this.client.archiveOpportunity(args.opportunity_id, args.reason_id);
        return {
          content: [{
            type: "text",
            text: `Candidate ${args.opportunity_id} archived successfully`
          }]
        };
      }
    );
  }

  private registerUtilityTools() {
    // List open roles
    this.server.tool(
      "lever_list_open_roles",
      {},
      async () => {
        try {
          const response = await this.client.getPostings('published', 50);
          
          const results = {
            count: response.data.length,
            hasMore: response.hasNext || false,
            roles: response.data.map(formatPosting)
          };
          
          return {
            content: [{
              type: "text",
              text: JSON.stringify(results, null, 2)
            }]
          };
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({ error: error instanceof Error ? error.message : String(error) })
            }]
          };
        }
      }
    );

    // Get stages
    this.server.tool(
      "lever_get_stages",
      {},
      async () => {
        const stages = await this.client.getStages();
        return {
          content: [{
            type: "text",
            text: JSON.stringify(stages, null, 2)
          }]
        };
      }
    );

    // Get archive reasons
    this.server.tool(
      "lever_get_archive_reasons",
      {},
      async () => {
        const reasons = await this.client.getArchiveReasons();
        return {
          content: [{
            type: "text",
            text: JSON.stringify(reasons, null, 2)
          }]
        };
      }
    );

    // Find candidates for role
    this.server.tool(
      "lever_find_candidates_for_role",
      {
        posting_id: z.string(),
        limit: z.number().default(100),
      },
      async (args) => {
        const response = await this.client.getOpportunities({ 
          posting_id: args.posting_id, 
          limit: args.limit
        });
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              count: response.data.length,
              posting_id: args.posting_id,
              candidates: response.data.map(formatOpportunity)
            }, null, 2)
          }]
        };
      }
    );
  }
}

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (url.pathname === "/sse" || url.pathname === "/sse/message") {
      return LeverMCP.serveSSE("/sse").fetch(request, env, ctx);
    }

    if (url.pathname === "/mcp") {
      return LeverMCP.serve("/mcp").fetch(request, env, ctx);
    }

    // Health check
    if (url.pathname === "/health") {
      return new Response("OK", { status: 200 });
    }

    // Default response with instructions
    return new Response(JSON.stringify({
      name: "Lever MCP Server",
      description: "Remote MCP server for Lever ATS integration",
      version: "1.0.0",
      endpoints: {
        sse: "/sse",
        mcp: "/mcp",
        health: "/health"
      },
      instructions: {
        claude: "Use: npx mcp-remote " + request.url.split('/')[0] + '//' + request.headers.get('host') + "/sse",
        inspector: "Connect to: " + request.url.split('/')[0] + '//' + request.headers.get('host') + "/sse"
      }
    }, null, 2), {
      headers: { "Content-Type": "application/json" }
    });
  },
};