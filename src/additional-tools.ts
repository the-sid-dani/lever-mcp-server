import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { LeverClient } from "./lever/client";
import type { LeverOpportunity } from "./types/lever";

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
      limit: z.number().default(100),
    },
    async (args) => {
      try {
        // Check if query looks like an email
        let emailFilter: string | undefined;
        if (args.query && args.query.includes("@")) {
          emailFilter = args.query;
        }

        if (emailFilter) {
          // Use email search
          const response = await client.getOpportunities({ 
            email: emailFilter,
            stage_id: args.stage, 
            limit: args.limit 
          });
          
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                count: response.data.length,
                query: args.query,
                candidates: response.data.map(formatOpportunity)
              }, null, 2)
            }]
          };
        } else if (args.query) {
          // For name searches, fetch and filter locally
          const allOpportunities: LeverOpportunity[] = [];
          let offset: string | undefined;
          let pagesChecked = 0;
          const maxPages = 2; // Only check first 200 candidates
          const queryLower = args.query.toLowerCase();
          
          while (pagesChecked < maxPages && allOpportunities.length < args.limit) {
            const response = await client.getOpportunities({
              stage_id: args.stage,
              limit: 100,
              offset
            });
            
            if (!response.data || response.data.length === 0) break;
            
            // Filter candidates by name
            for (const c of response.data) {
              const name = (c.name || "").toLowerCase();
              if (queryLower && name.includes(queryLower)) {
                allOpportunities.push(c);
                if (allOpportunities.length >= args.limit) break;
              }
            }
            
            pagesChecked++;
            if (!response.hasNext) break;
            
            // Get next offset
            const lastCandidate = response.data[response.data.length - 1];
            offset = lastCandidate?.id;
            if (!offset) break;
          }
          
          const result: any = {
            count: allOpportunities.length,
            query: args.query,
            candidates: allOpportunities.map(formatOpportunity)
          };
          
          // Add warning if we hit the limit
          if (pagesChecked >= maxPages && allOpportunities.length === 0) {
            result.warning = "Search limited to first 200 candidates. Results may be incomplete. Try using email search or tags for better results.";
            result.total_scanned = pagesChecked * 100;
          }
          
          return {
            content: [{
              type: "text",
              text: JSON.stringify(result, null, 2)
            }]
          };
        } else {
          // No search criteria, just get candidates
          const response = await client.getOpportunities({ 
            stage_id: args.stage, 
            limit: args.limit 
          });
          
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                count: response.data.length,
                query: args.query,
                candidates: response.data.map(formatOpportunity)
              }, null, 2)
            }]
          };
        }
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

  // Quick find by name
  server.tool(
    "lever_quick_find_candidate",
    {
      name_or_email: z.string(),
    },
    async (args) => {
      try {
        // If it looks like an email, use email search
        if (args.name_or_email.includes("@")) {
          const response = await client.getOpportunities({
            email: args.name_or_email,
            limit: 10
          });
          
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                count: response.data.length,
                search_type: "email",
                query: args.name_or_email,
                candidates: response.data.map(formatOpportunity)
              }, null, 2)
            }]
          };
        }
        
        // Otherwise, do a limited name search
        const queryLower = args.name_or_email.toLowerCase();
        const matched: LeverOpportunity[] = [];
        let offset: string | undefined;
        let pagesChecked = 0;
        const maxPages = 3; // Only check first 300 candidates
        
        while (pagesChecked < maxPages) {
          const response = await client.getOpportunities({
            limit: 100,
            offset
          });
          
          if (!response.data || response.data.length === 0) break;
          
          // Quick scan for name matches
          for (const c of response.data) {
            const cName = (c.name || "").toLowerCase();
            
            if (queryLower && (queryLower.includes(cName) || cName.includes(queryLower))) {
              matched.push(c);
              if (matched.length >= 5) break; // Return first 5 matches
            }
          }
          
          if (matched.length >= 5) break;
          
          pagesChecked++;
          if (!response.hasNext) break;
          
          // Get next offset
          const lastCandidate = response.data[response.data.length - 1];
          offset = lastCandidate?.id;
          if (!offset) break;
        }
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              count: matched.length,
              search_type: "quick_name_search",
              query: args.name_or_email,
              candidates: matched.map(formatOpportunity),
              note: `Quick search checked first ${pagesChecked * 100} candidates. For comprehensive search, use email if available.`
            }, null, 2)
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

  // Find candidates in specific posting by name
  server.tool(
    "lever_find_candidate_in_posting",
    {
      name: z.string(),
      posting_id: z.string(),
      stage: z.string().optional(),
    },
    async (args) => {
      try {
        const nameLower = args.name.toLowerCase();
        const matched: LeverOpportunity[] = [];
        let offset: string | undefined;
        let totalChecked = 0;
        
        // Search with posting filter - much more targeted
        while (totalChecked < 1000) { // Can check more when filtered by posting
          const response = await client.getOpportunities({ 
            posting_id: args.posting_id,
            stage_id: args.stage,
            limit: 100,
            offset
          });
          
          if (!response.data || response.data.length === 0) break;
          
          totalChecked += response.data.length;
          
          // Check each candidate with flexible matching
          for (const c of response.data) {
            const cName = (c.name || "").toLowerCase();
            // More flexible matching - split name into parts
            const nameParts = nameLower.split(' ');
            if (nameParts.some(part => cName.includes(part)) || nameLower.includes(cName) || cName.includes(nameLower)) {
              matched.push(c);
            }
          }
          
          if (!response.hasNext) break;
          
          // Get next offset
          const lastCandidate = response.data[response.data.length - 1];
          offset = lastCandidate?.id;
          if (!offset) break;
        }
        
        const result: any = {
          count: matched.length,
          posting_id: args.posting_id,
          total_checked: totalChecked,
          query: args.name,
          candidates: matched.map(formatOpportunity)
        };
        
        if (matched.length === 0 && totalChecked > 0) {
          result.note = `No matches found for '${args.name}' among ${totalChecked} candidates in this posting`;
        }
        
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
            text: JSON.stringify({ error: error instanceof Error ? error.message : String(error) })
          }]
        };
      }
    }
  );

  // Find internal referrals for a role
  server.tool(
    "lever_find_internal_referrals_for_role",
    {
      posting_id: z.string(),
      limit: z.number().default(100),
    },
    async (args) => {
      try {
        // First get the posting details
        const postingsResponse = await client.getPostings('published', 100);
        const postings = postingsResponse.data || [];
        
        let targetPosting: any = null;
        for (const posting of postings) {
          if (posting.id === args.posting_id) {
            targetPosting = posting;
            break;
          }
        }
        
        if (!targetPosting) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({ error: `Posting ${args.posting_id} not found` })
            }]
          };
        }
        
        const postingTitle = targetPosting.text || "";
        const postingTeam = targetPosting.team?.text || "";
        
        // Search for candidates who might be good referral sources
        // Fetch all candidates with limit
        const response = await client.getOpportunities({ 
          limit: args.limit * 2  // Fetch more to filter
        });
        
        const candidates = response.data || [];
        
        // Filter for likely employees who could refer
        const potentialReferrers: any[] = [];
        
        for (const candidate of candidates) {
          const tags = (candidate.tags || []).map((t: string) => t.toLowerCase());
          const headline = (candidate.headline || '').toLowerCase();
          
          // Check if they're marked as internal/employee
          const isInternal = (
            tags.includes('employee') ||
            tags.includes('internal') ||
            tags.some(tag => tag.includes('referral')) ||
            headline.includes('current')
          );
          
          // Check if they're in a related team/role
          const isRelated = (
            (postingTeam && headline.includes(postingTeam.toLowerCase())) ||
            (postingTeam && tags.some(tag => tag.includes(postingTeam.toLowerCase()))) ||
            postingTitle.toLowerCase().split(' ').some((keyword: string) => 
              keyword.length > 3 && headline.includes(keyword)
            )
          );
          
          if (isInternal || isRelated) {
            potentialReferrers.push({
              ...candidate,
              referral_relevance: isInternal ? "internal" : "related"
            });
          }
        }
        
        // Limit results
        const limitedReferrers = potentialReferrers.slice(0, args.limit);
        
        const results = {
          count: limitedReferrers.length,
          role: postingTitle,
          team: postingTeam,
          potential_referrers: limitedReferrers.map(c => ({
            ...formatOpportunity(c),
            relevance: c.referral_relevance || "unknown"
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
          const filesResponse = await client.getOpportunityFiles(args.opportunity_id);
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
          const resumesResponse = await client.getOpportunityResumes(args.opportunity_id);
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
          files: allFiles.map(f => ({
            id: f.id || "",
            filename: f.file?.name || f.name || f.filename || "Unknown",
            type: f.file?.ext || f.type || f.mimetype || "Unknown",
            size: f.file?.size || f.size || 0,
            uploaded_at: f.createdAt ? 
              new Date(f.createdAt).toISOString().replace('T', ' ').substring(0, 16) : 
              "Unknown",
            download_url: f.file?.downloadUrl || f.downloadUrl || f.url || "",
            source: f.source || "unknown"
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
        const response = await client.getOpportunityApplications(args.opportunity_id);
        const applications = response.data || [];
        
        const results = {
          candidate: opportunity.name || "Unknown",
          application_count: applications.length,
          applications: applications.map((app: any) => ({
            id: app.id || "",
            posting: app.posting?.text || "Unknown",
            posting_id: app.posting?.id || "",
            status: app.status || "Unknown",
            created_at: app.createdAt ? 
              new Date(app.createdAt).toISOString().replace('T', ' ').substring(0, 16) : 
              "Unknown",
            user: app.user?.name || "System"
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

  // Get specific application details
  server.tool(
    "lever_get_application",
    {
      opportunity_id: z.string(),
      application_id: z.string(),
    },
    async (args) => {
      try {
        // Get application details
        const application = await client.getApplication(args.opportunity_id, args.application_id);
        
        // Get candidate info for context
        const oppResponse = await client.getOpportunity(args.opportunity_id);
        const opportunity = oppResponse.data;
        
        const result = {
          candidate: opportunity.name || "Unknown",
          application: {
            id: application.id || "",
            posting: {
              id: application.posting?.id || "",
              title: application.posting?.text || "Unknown",
              team: application.posting?.team?.text || "Unknown"
            },
            status: application.status || "Unknown",
            created_at: application.createdAt ? 
              new Date(application.createdAt).toISOString().replace('T', ' ').substring(0, 16) : 
              "Unknown",
            created_by: application.user?.name || "System",
            type: application.type || "Unknown",
            posting_owner: application.postingOwner?.name || "Unknown"
          }
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
            text: JSON.stringify({ error: error instanceof Error ? error.message : String(error) })
          }]
        };
      }
    }
  );
}