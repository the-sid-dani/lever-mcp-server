import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { LeverClient } from "./lever/client";
import { LeverOpportunity } from "./types/lever";

// Helper to format opportunity data
export function formatOpportunity(opp: LeverOpportunity): Record<string, any> {
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

export function registerAdditionalTools(server: McpServer, client: LeverClient) {
  // Basic search tool
  server.tool(
    "lever_search_candidates",
    {
      query: z.string().optional(),
      stage: z.string().optional(),
      limit: z.number().default(25),
    },
    async (args) => {
      const response = await client.getOpportunities({ 
        stage_id: args.stage, 
        limit: args.limit 
      });
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            count: response.data.length,
            hasMore: response.hasNext || false,
            candidates: response.data.map(formatOpportunity)
          }, null, 2)
        }]
      };
    }
  );

  // Quick find by name
  server.tool(
    "lever_quick_find_candidate",
    {
      name: z.string(),
      limit: z.number().default(10),
    },
    async (args) => {
      const nameLower = args.name.toLowerCase();
      const response = await client.getOpportunities({ limit: 100 });
      
      const matches = response.data.filter(c => {
        const candidateName = (c.name || '').toLowerCase();
        return candidateName.includes(nameLower);
      });

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            search_name: args.name,
            count: matches.length,
            candidates: matches.slice(0, args.limit).map(formatOpportunity)
          }, null, 2)
        }]
      };
    }
  );

  // Find candidates in specific posting by name
  server.tool(
    "lever_find_candidate_in_posting",
    {
      posting_id: z.string(),
      candidate_name: z.string(),
    },
    async (args) => {
      const nameLower = args.candidate_name.toLowerCase();
      const response = await client.getOpportunities({ 
        posting_id: args.posting_id,
        limit: 100 
      });
      
      const matches = response.data.filter(c => {
        const candidateName = (c.name || '').toLowerCase();
        return candidateName.includes(nameLower);
      });

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            posting_id: args.posting_id,
            search_name: args.candidate_name,
            found: matches.length > 0,
            candidates: matches.map(formatOpportunity)
          }, null, 2)
        }]
      };
    }
  );

  // Find internal referrals for a role
  server.tool(
    "lever_find_internal_referrals_for_role",
    {
      posting_id: z.string(),
      limit: z.number().default(50),
    },
    async (args) => {
      const response = await client.getOpportunities({ 
        posting_id: args.posting_id,
        limit: 100 
      });
      
      // Filter for internal referrals (usually tagged or have specific sources)
      const referrals = response.data.filter(c => {
        const tags = c.tags || [];
        const origin = c.origin || '';
        const sources = c.sources || [];
        
        return tags.some(tag => tag.toLowerCase().includes('referral')) ||
               tags.some(tag => tag.toLowerCase().includes('internal')) ||
               origin.toLowerCase().includes('referral') ||
               sources.some(s => s.toLowerCase().includes('employee'));
      });

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            posting_id: args.posting_id,
            count: referrals.length,
            internal_referrals: referrals.slice(0, args.limit).map(formatOpportunity)
          }, null, 2)
        }]
      };
    }
  );

  // List files for a candidate
  server.tool(
    "lever_list_files",
    {
      opportunity_id: z.string(),
    },
    async (args) => {
      try {
        const candidate = await client.getOpportunity(args.opportunity_id);
        
        // Extract file information from the candidate data
        const files = [];
        
        // Check for resume
        if (candidate.resume) {
          files.push({
            type: 'resume',
            name: 'Resume',
            id: candidate.resumeId || 'resume',
            size: 'N/A',
            uploaded: candidate.createdAt ? new Date(candidate.createdAt).toISOString() : 'Unknown'
          });
        }
        
        // Check for other files in the files array
        if (candidate.files && Array.isArray(candidate.files)) {
          candidate.files.forEach(file => {
            files.push({
              type: file.type || 'document',
              name: file.name || 'Unnamed file',
              id: file.id,
              size: file.size || 'N/A',
              uploaded: file.uploadedAt || 'Unknown'
            });
          });
        }

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              opportunity_id: args.opportunity_id,
              candidate_name: candidate.name || 'Unknown',
              file_count: files.length,
              files: files,
              note: "Files cannot be downloaded through MCP. Access them through the Lever web interface."
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              error: error instanceof Error ? error.message : 'Failed to get candidate files',
              opportunity_id: args.opportunity_id
            }, null, 2)
          }]
        };
      }
    }
  );

  // List applications for a candidate
  server.tool(
    "lever_list_applications",
    {
      opportunity_id: z.string(),
    },
    async (args) => {
      try {
        const candidate = await client.getOpportunity(args.opportunity_id);
        
        // Extract application information
        const applications = [];
        
        // Primary application
        if (candidate.posting) {
          applications.push({
            id: candidate.id,
            posting: candidate.posting.text || 'Unknown Position',
            posting_id: candidate.posting.id || '',
            stage: typeof candidate.stage === 'object' ? candidate.stage.text : String(candidate.stage || 'Unknown'),
            applied_at: candidate.createdAt ? new Date(candidate.createdAt).toISOString() : 'Unknown',
            status: 'active'
          });
        }
        
        // Check for other applications in the applications array
        if (candidate.applications && Array.isArray(candidate.applications)) {
          candidate.applications.forEach(app => {
            applications.push({
              id: app.id,
              posting: app.posting?.text || 'Unknown Position',
              posting_id: app.posting?.id || '',
              stage: app.stage?.text || 'Unknown',
              applied_at: app.createdAt || 'Unknown',
              status: app.archived ? 'archived' : 'active'
            });
          });
        }

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              opportunity_id: args.opportunity_id,
              candidate_name: candidate.name || 'Unknown',
              application_count: applications.length,
              applications: applications
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              error: error instanceof Error ? error.message : 'Failed to get applications',
              opportunity_id: args.opportunity_id
            }, null, 2)
          }]
        };
      }
    }
  );

  // Get specific application details
  server.tool(
    "lever_get_application",
    {
      opportunity_id: z.string(),
      application_id: z.string().optional(),
    },
    async (args) => {
      try {
        const candidate = await client.getOpportunity(args.opportunity_id);
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              application: {
                id: candidate.id,
                candidate_name: candidate.name || 'Unknown',
                email: candidate.emails?.[0] || 'N/A',
                posting: candidate.posting?.text || 'Unknown Position',
                posting_id: candidate.posting?.id || '',
                stage: typeof candidate.stage === 'object' ? candidate.stage.text : String(candidate.stage || 'Unknown'),
                location: typeof candidate.location === 'object' ? candidate.location.name : String(candidate.location || 'Unknown'),
                applied_at: candidate.createdAt ? new Date(candidate.createdAt).toISOString() : 'Unknown',
                last_updated: candidate.updatedAt ? new Date(candidate.updatedAt).toISOString() : 'Unknown',
                tags: candidate.tags || [],
                sources: candidate.sources || [],
                origin: candidate.origin || 'Unknown'
              }
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              error: error instanceof Error ? error.message : 'Failed to get application details',
              opportunity_id: args.opportunity_id
            }, null, 2)
          }]
        };
      }
    }
  );
}