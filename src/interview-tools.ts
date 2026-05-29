import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { LeverClient } from "./lever/client.js";
import type { LeverInterview, LeverPanel, LeverOpportunity } from "./types/lever.js";
import { mapLimit } from "./utils/concurrency.js";
import { getSharedResolver, resolvePerformAs } from "./auth/resolve-perform-as.js";
import { collectAllPages } from "./utils/paginate.js";

/**
 * Register interview-related tools with the MCP server
 */
export function registerInterviewTools(server: McpServer, client: LeverClient) {
  // Tool 1: Get Interview Insights
  server.tool(
    "lever_get_interview_insights",
    "View scheduled or completed interviews for a candidate (opportunity_id) with dashboard, detailed, analytics, or preparation views; note the interviewer_email path is a client-side fan-out (paginate opportunities, fetch each one's interviews, filter by interviewer) since Lever has no server-side interviewer filter, so it is not an exact or fast server-side lookup.",
    {
      // WHO - Flexible targeting
      owner_email: z.string().optional().describe("Get interviews for specific posting owner"),
      posting_id: z.string().optional().describe("Filter by specific job posting"),
      opportunity_id: z.string().optional().describe("Get interviews for specific candidate"),
      interviewer_email: z.string().optional().describe("Get interviews you're conducting"),
      
      // WHEN - Time filtering
      time_scope: z.enum(["past_week", "this_week", "next_week", "this_month", "custom"]).default("this_week"),
      date_from: z.string().optional().describe("Start date for custom range (ISO format)"),
      date_to: z.string().optional().describe("End date for custom range (ISO format)"),
      
      // WHAT - Data depth control
      view_type: z.enum(["dashboard", "detailed", "analytics", "preparation"]).default("dashboard"),
      include_completed: z.boolean().default(false).describe("Include past interviews"),
      include_feedback_status: z.boolean().default(true),
      include_scheduling_conflicts: z.boolean().default(false),
      include_candidate_context: z.boolean().default(false),
      
      // FILTERS - Smart filtering
      status_filter: z.enum(["scheduled", "completed", "needs_feedback", "needs_scheduling", "conflicts"]).optional(),
      stage_filter: z.string().optional().describe("Filter by interview stage"),
      priority_only: z.boolean().default(false).describe("Only high-priority items"),
      
      limit: z.number().default(25).describe("Maximum results to return")
    },
    async (args) => {
      try {
        const results: any = {
          view_type: args.view_type,
          metadata: {
            generated_at: new Date().toISOString(),
            filters_applied: args,
            total_count: 0
          },
          data: null
        };

        // Handle specific opportunity ID request
        if (args.opportunity_id) {
          try {
            // Get interviews for this specific opportunity
            const interviewsResponse = await client.getOpportunityInterviews(args.opportunity_id);
            const interviews = interviewsResponse.data || [];
            
            // Get panels for additional context
            const panelsResponse = await client.getOpportunityPanels(args.opportunity_id);
            const panels = panelsResponse.data || [];
            
            results.metadata.total_count = interviews.length;
            
            // Format based on view type
            switch (args.view_type) {
              case "dashboard":
                results.data = formatDashboardView(interviews, panels);
                break;
              case "detailed":
                results.data = formatDetailedView(interviews, panels, args);
                break;
              case "analytics":
                results.data = formatAnalyticsView(interviews, panels);
                break;
              case "preparation":
                results.data = formatPreparationView(interviews, panels);
                break;
            }
          } catch (error: any) {
            return {
              content: [{
                type: "text",
                text: JSON.stringify({
                  error: "Failed to fetch interview data",
                  details: error.message,
                  opportunity_id: args.opportunity_id
                }, null, 2)
              }]
            };
          }
        } else {
          // Broader search: bounded interviewer_email fan-out. Lever v1 has NO
          // server-side interviewer filter (same constraint as name search), so
          // we build a working set of opportunities, fetch each one's interviews
          // with bounded concurrency, and filter interviews client-side.
          const SAFETY_CAP = 500;
          const workingSet: LeverOpportunity[] = [];
          let workingSetComplete = true;
          let offset: string | undefined = undefined;

          if (args.posting_id) {
            // Scoped by posting - paginate fully (bounded by the posting, safe).
            // collectAllPages gives stuck-cursor safety + an honest complete flag.
            const { items: scopedSet, complete } = await collectAllPages(
              (off) =>
                client.getOpportunities({
                  posting_id: args.posting_id,
                  limit: 100,
                  offset: off
                }) as Promise<{ data?: LeverOpportunity[]; hasNext?: boolean; next?: string }>
            );
            workingSet.push(...scopedSet);
            workingSetComplete = complete;
          } else {
            // Unscoped - paginate but STOP at the safety cap. Full 6000+ x
            // per-opp interview fan-out is too expensive for a synchronous call.
            // We keep this INLINE (not collectAllPages) because the cap here is an
            // intentional SILENT truncation with complete=false; collectAllPages
            // would THROW on maxPages instead. The stuck-cursor guard below keeps
            // a non-advancing cursor from looping forever.
            let reachedApiEnd = false;
            do {
              const response = await client.getOpportunities({
                limit: 100,
                offset
              });
              workingSet.push(...(response.data || []));
              if (workingSet.length >= SAFETY_CAP) {
                // Cap hit. Stop scanning regardless of whether more pages exist.
                offset = undefined;
              } else if (!response.hasNext || !response.next) {
                reachedApiEnd = true;
                offset = undefined;
              } else if (response.next === offset) {
                // Stuck-cursor guard: cursor did not advance -> would loop forever.
                offset = undefined;
              } else {
                offset = response.next;
              }
            } while (offset);
            // Enforce the cap unconditionally and report honest completeness:
            // complete only when we ran to the API end AND stayed under the cap.
            workingSet.length = Math.min(workingSet.length, SAFETY_CAP);
            workingSetComplete = reachedApiEnd && workingSet.length < SAFETY_CAP;
          }

          // Optional client-side owner filter.
          let scanSet = workingSet;
          if (args.owner_email) {
            const ownerNeedle = args.owner_email.toLowerCase();
            scanSet = workingSet.filter(opp => {
              const email = (opp.owner && (opp.owner as any).email) || "";
              return String(email).toLowerCase() === ownerNeedle;
            });
          }

          // Fan out interview fetches with bounded concurrency (limit 8). One
          // per-opp failure must not abort the batch.
          const fetched = await mapLimit(scanSet, 8, async (opp) => {
            try {
              const resp = await client.getOpportunityInterviews(opp.id);
              return { oppId: opp.id, oppName: opp.name, interviews: resp.data || [] };
            } catch {
              return { oppId: opp.id, oppName: opp.name, interviews: [] as LeverInterview[] };
            }
          });

          // Flatten, attaching candidate context.
          type CtxInterview = LeverInterview & { oppId: string; oppName?: string };
          const allInterviews: CtxInterview[] = [];
          for (const entry of fetched) {
            for (const iv of entry.interviews) {
              allInterviews.push({ ...iv, oppId: entry.oppId, oppName: entry.oppName });
            }
          }

          // Compute the time window for filtering.
          const window = computeTimeWindow(args.time_scope, args.date_from, args.date_to);
          const now = Date.now();
          // Scopes that intentionally include the past. For these, the
          // !include_completed "drop past interviews" rule must NOT apply, or it
          // would silently hide every interview the scope is meant to surface.
          const scopeIncludesPast =
            args.time_scope === "past_week" ||
            args.time_scope === "this_month" ||
            args.time_scope === "custom";

          const interviewerNeedle = args.interviewer_email
            ? args.interviewer_email.toLowerCase()
            : null;

          const matchedInterviews = allInterviews.filter(iv => {
            // interviewer_email match (case-insensitive).
            if (interviewerNeedle) {
              const hit = (iv.interviewers || []).some(
                int => String(int.email || "").toLowerCase() === interviewerNeedle
              );
              if (!hit) return false;
            }
            // Time-window match.
            const t = typeof iv.date === "number" ? iv.date : new Date(iv.date).getTime();
            if (Number.isNaN(t)) return false;
            if (t < window.start || t > window.end) return false;
            // Drop completed (past) interviews unless explicitly requested.
            // Only applies to forward-looking scopes; past-inclusive scopes keep them.
            if (!args.include_completed && !scopeIncludesPast && t < now) return false;
            return true;
          });

          const shape = (iv: CtxInterview) => ({
            id: iv.id,
            subject: iv.subject,
            date: new Date(
              typeof iv.date === "number" ? iv.date : new Date(iv.date).getTime()
            ).toISOString(),
            oppId: iv.oppId,
            oppName: iv.oppName,
            interviewers: (iv.interviewers || []).map(int => ({
              name: int.name,
              email: int.email
            }))
          });

          results.metadata.total_count = matchedInterviews.length;
          results.data = {
            interviews: matchedInterviews.slice(0, args.limit).map(shape),
            matched: matchedInterviews.length
          };
          results.coverage = {
            opportunities_scanned: scanSet.length,
            working_set_complete: workingSetComplete,
            warning: workingSetComplete
              ? null
              : "Scanned the first 500 opportunities only (interviewer search has no server-side filter). Provide posting_id to scope the search and guarantee completeness."
          };
        }
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify(results, null, 2)
          }]
        };
      } catch (error: any) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              error: "Interview insights tool error",
              message: error.message,
              stack: error.stack
            }, null, 2)
          }]
        };
      }
    }
  );

  // Tool 2: Manage Interview
  server.tool(
    "lever_manage_interview",
    "Schedule, reschedule, or cancel a candidate interview (creates within a panel); a perform_as user ID is required for any modifying action.",
    {
      action: z.enum(["schedule", "reschedule", "cancel", "update_outcome", "bulk_schedule", "check_availability"]),
      
      // Target
      opportunity_id: z.string().optional().describe("Opportunity ID for the interview"),
      interview_id: z.string().optional().describe("Specific interview ID"),
      panel_id: z.string().optional().describe("Panel ID for panel operations"),
      opportunity_ids: z.array(z.string()).optional().describe("Multiple opportunity IDs for bulk operations"),
      
      // User performing the action (required for create/update/delete)
      perform_as: z.string().optional().describe("User ID to perform action as (required for modifications)"),
      
      // Scheduling data
      interview_details: z.object({
        type: z.enum(["phone_screen", "technical", "onsite", "panel", "final"]).optional(),
        date: z.string().describe("ISO datetime for the interview"),
        duration_minutes: z.number().describe("Duration in minutes"),
        location: z.string().optional().describe("Location or video link"),
        subject: z.string().optional().describe("Interview subject/title"),
        note: z.string().optional().describe("Additional notes"),
        timezone: z.string().optional().describe("Timezone (e.g., America/Los_Angeles)"),
        interviewers: z.array(z.object({
          id: z.string().describe("Interviewer user ID"),
          feedbackTemplate: z.string().optional().describe("Feedback template ID")
        })).describe("Array of interviewers"),
        feedback_template: z.string().optional().describe("Default feedback template ID"),
        feedback_reminder: z.enum(["once", "daily", "frequently", "none"]).optional()
      }).optional(),
      
      // For rescheduling
      reschedule_data: z.object({
        new_date: z.string().describe("New ISO datetime"),
        reason: z.string().optional().describe("Reason for rescheduling")
      }).optional(),
      
      // For cancellation
      cancel_reason: z.string().optional().describe("Reason for cancellation"),
      
      // For bulk operations
      bulk_config: z.object({
        stagger_minutes: z.number().optional().describe("Minutes between interviews"),
        panel_note: z.string().optional().describe("Note for the panel")
      }).optional()
    },
    async (args) => {
      try {
        // Validate required parameters based on action
        if (!args.opportunity_id && args.action !== "check_availability") {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                error: "opportunity_id is required for this action",
                action: args.action
              }, null, 2)
            }]
          };
        }

        let result: any = null;

        switch (args.action) {
          case "schedule": {
            if (!args.interview_details) {
              throw new Error("interview_details required for scheduling");
            }
            
            // Interviews must be created within a panel
            // First, create a panel with the interview
            const panelData = {
              timezone: args.interview_details.timezone || "America/Los_Angeles",
              feedbackReminder: args.interview_details.feedback_reminder || "daily",
              note: args.interview_details.note,
              interviews: [{
                subject: args.interview_details.subject || `${args.interview_details.type} Interview`,
                note: args.interview_details.note,
                interviewers: args.interview_details.interviewers,
                date: new Date(args.interview_details.date).getTime(),
                duration: args.interview_details.duration_minutes,
                location: args.interview_details.location,
                feedbackTemplate: args.interview_details.feedback_template,
                feedbackReminder: args.interview_details.feedback_reminder
              }]
            };
            
            const performAs = await resolvePerformAs(getSharedResolver(client), args.perform_as);
            result = await client.createPanel(args.opportunity_id!, panelData, performAs);
            break;
          }

          case "reschedule": {
            if (!args.interview_id || !args.reschedule_data) {
              throw new Error("interview_id and reschedule_data required for rescheduling");
            }
            
            // Update the interview with new date
            const updateData = {
              date: new Date(args.reschedule_data.new_date).getTime()
            };
            
            const performAs = await resolvePerformAs(getSharedResolver(client), args.perform_as);
            result = await client.updateInterview(
              args.opportunity_id!,
              args.interview_id,
              updateData,
              performAs
            );
            break;
          }

          case "cancel": {
            if (!args.interview_id) {
              throw new Error("interview_id required for cancellation");
            }
            
            // Delete the interview
            const performAs = await resolvePerformAs(getSharedResolver(client), args.perform_as);
            await client.deleteInterview(
              args.opportunity_id!,
              args.interview_id,
              performAs
            );
            
            result = {
              success: true,
              action: "cancelled",
              interview_id: args.interview_id,
              reason: args.cancel_reason
            };
            break;
          }

          case "check_availability":
            // This would require calendar integration which Lever API doesn't provide
            result = {
              message: "Availability checking not supported",
              hint: "Lever API does not provide calendar/availability data",
              workaround: "Check availability through external calendar systems"
            };
            break;

          case "bulk_schedule":
            if (!args.opportunity_ids || !args.interview_details) {
              throw new Error("opportunity_ids and interview_details required for bulk scheduling");
            }
            
            result = {
              message: "Bulk scheduling would create individual panels for each opportunity",
              opportunities: args.opportunity_ids,
              note: "Each opportunity would get its own panel with interview"
            };
            break;

          case "update_outcome":
            result = {
              message: "Interview outcomes should be recorded as notes or feedback",
              hint: "Use lever_add_note tool to record interview outcomes"
            };
            break;

          default:
            throw new Error(`Unknown action: ${args.action}`);
        }
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              action: args.action,
              result
            }, null, 2)
          }]
        };
      } catch (error: any) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              error: "Interview management error",
              action: args.action,
              message: error.message,
              hint: error.message.includes("externallyManaged") ? 
                "This interview was created in Lever UI and cannot be modified via API" : undefined
            }, null, 2)
          }]
        };
      }
    }
  );
}

// Compute a [start, end] window (ms epoch) for a given time_scope. For
// "custom", honors date_from/date_to (ISO). Falls back to a wide window when a
// custom bound is missing so a single-sided custom range still works.
function computeTimeWindow(
  timeScope: string,
  dateFrom?: string,
  dateTo?: string
): { start: number; end: number } {
  const now = new Date();
  const day = 24 * 60 * 60 * 1000;

  if (timeScope === "custom") {
    const start = dateFrom ? new Date(dateFrom).getTime() : 0;
    const end = dateTo ? new Date(dateTo).getTime() : Number.MAX_SAFE_INTEGER;
    return { start, end };
  }

  // Start of the local day, anchoring all relative windows.
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  switch (timeScope) {
    case "past_week":
      // The 7 days ending at the start of today.
      return { start: startOfToday - 7 * day, end: startOfToday };
    case "next_week":
      // The week AFTER this_week -- distinct from this_week (day +7 .. +14).
      return { start: startOfToday + 7 * day, end: startOfToday + 14 * day };
    case "this_month": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
      return { start, end };
    }
    case "this_week":
    default:
      // The 7 days starting today (day 0 .. +7).
      return { start: startOfToday, end: startOfToday + 7 * day };
  }
}

// Helper functions for formatting views

function formatDashboardView(interviews: LeverInterview[], panels: LeverPanel[]) {
  const now = new Date();
  const upcoming = interviews.filter(i => new Date(i.date) > now && !i.canceledAt);
  const past = interviews.filter(i => new Date(i.date) <= now && !i.canceledAt);
  const cancelled = interviews.filter(i => i.canceledAt);
  
  return {
    summary: {
      total_interviews: interviews.length,
      upcoming_count: upcoming.length,
      completed_count: past.length,
      cancelled_count: cancelled.length,
      total_panels: panels.length
    },
    upcoming_interviews: upcoming.slice(0, 5).map(i => ({
      id: i.id,
      subject: i.subject,
      date: i.date,
      duration: i.duration,
      interviewers: i.interviewers.map(int => int.name).join(", ")
    })),
    recent_interviews: past.slice(0, 5).map(i => ({
      id: i.id,
      subject: i.subject,
      date: i.date,
      has_feedback: i.feedbackForms.length > 0
    }))
  };
}

function formatDetailedView(interviews: LeverInterview[], panels: LeverPanel[], args: any) {
  const detailed = interviews.map(interview => {
    const panel = panels.find(p => p.id === interview.panel);
    
    const result: any = {
      id: interview.id,
      subject: interview.subject,
      note: interview.note,
      date: new Date(interview.date).toISOString(),
      duration_minutes: interview.duration,
      location: interview.location,
      timezone: interview.timezone,
      status: interview.canceledAt ? "cancelled" : 
              new Date(interview.date) > new Date() ? "scheduled" : "completed",
      interviewers: interview.interviewers,
      feedback_status: {
        template_id: interview.feedbackTemplate,
        forms_submitted: interview.feedbackForms.length,
        reminder_setting: interview.feedbackReminder
      }
    };
    
    if (args.include_candidate_context && panel) {
      result.panel_context = {
        panel_id: panel.id,
        panel_note: panel.note,
        externally_managed: panel.externallyManaged,
        external_url: panel.externalUrl
      };
    }
    
    return result;
  });
  
  return {
    interviews: detailed,
    total_count: detailed.length
  };
}

function formatAnalyticsView(interviews: LeverInterview[], panels: LeverPanel[]) {
  const interviewerStats: Record<string, any> = {};
  const hourDistribution = new Array(24).fill(0);
  const dayDistribution = new Array(7).fill(0);
  
  interviews.forEach(interview => {
    const date = new Date(interview.date);
    hourDistribution[date.getHours()]++;
    dayDistribution[date.getDay()]++;
    
    interview.interviewers.forEach(interviewer => {
      if (!interviewerStats[interviewer.id]) {
        interviewerStats[interviewer.id] = {
          name: interviewer.name,
          email: interviewer.email,
          total_interviews: 0,
          completed: 0,
          cancelled: 0,
          has_feedback: 0
        };
      }
      
      interviewerStats[interviewer.id].total_interviews++;
      if (interview.canceledAt) {
        interviewerStats[interviewer.id].cancelled++;
      } else if (new Date(interview.date) <= new Date()) {
        interviewerStats[interviewer.id].completed++;
        if (interview.feedbackForms.length > 0) {
          interviewerStats[interviewer.id].has_feedback++;
        }
      }
    });
  });
  
  return {
    interviewer_analytics: Object.values(interviewerStats),
    scheduling_patterns: {
      by_hour: hourDistribution,
      by_day_of_week: dayDistribution,
      peak_hours: hourDistribution.indexOf(Math.max(...hourDistribution)),
      peak_day: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][
        dayDistribution.indexOf(Math.max(...dayDistribution))
      ]
    },
    panel_usage: {
      total_panels: panels.length,
      externally_managed: panels.filter(p => p.externallyManaged).length,
      average_interviews_per_panel: panels.length > 0 ? 
        interviews.length / panels.length : 0
    }
  };
}

function formatPreparationView(interviews: LeverInterview[], panels: LeverPanel[]) {
  const upcoming = interviews
    .filter(i => new Date(i.date) > new Date() && !i.canceledAt)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  return {
    next_interview: upcoming[0] ? {
      id: upcoming[0].id,
      subject: upcoming[0].subject,
      date: new Date(upcoming[0].date).toISOString(),
      time_until: Math.floor((new Date(upcoming[0].date).getTime() - Date.now()) / 1000 / 60),
      duration_minutes: upcoming[0].duration,
      location: upcoming[0].location,
      interviewers: upcoming[0].interviewers,
      preparation_notes: upcoming[0].note
    } : null,
    upcoming_week: upcoming.filter(i => {
      const daysDiff = (new Date(i.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      return daysDiff <= 7;
    }).map(i => ({
      date: new Date(i.date).toISOString(),
      subject: i.subject,
      interviewers: i.interviewers.map(int => int.name).join(", ")
    }))
  };
}