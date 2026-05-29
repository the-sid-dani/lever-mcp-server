import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { LeverClient } from "../lever/client.js";
import { getSharedResolver, resolvePerformAs } from "../auth/resolve-perform-as.js";
import { collectAllPages } from "../utils/paginate.js";

export function registerFeedbackTools(server: McpServer, client: LeverClient) {
	// lever_feedback — consolidated (replaces lever_list_feedback_templates + lever_list_feedback + lever_get_feedback + lever_submit_feedback)
	// CRITICAL: submit action uses `fieldValues[]` write-shape per M1.8 finding (asymmetric with GET response `fields[]`).
	server.tool(
		"lever_feedback",
		"Read or write interview feedback. Use action='list_templates' to discover available feedback forms, action='list' to fetch all feedback on a candidate, action='get' to fetch one feedback form by id, or action='submit' to submit a filled-out feedback form (single-tenant — attributed via LEVER_DEFAULT_USER_ID).",
		{
			action: z.enum(["list_templates", "list", "get", "submit"]).describe(
				"Operation to perform. list_templates=org-wide feedback templates; list=all feedback on opportunity_id; get=one feedback form by feedback_id; submit=create new feedback for opportunity_id using base_template_id + field_values."
			),
			opportunity_id: z.string().optional().describe("Opportunity / candidate ID. Required for actions: list, get, submit."),
			limit: z.number().default(100).optional().describe("For action='list_templates' or 'list' only — max items per request (Lever max 100, paginated up to 5 batches)."),
			feedback_id: z.string().optional().describe("For action='get' only — feedback form ID to fetch."),
			base_template_id: z.string().optional().describe("For action='submit' only — feedback template UID. Use action='list_templates' to discover available templates."),
			field_values: z.array(z.object({
				id: z.string().describe("Field UID from the template"),
				value: z.union([z.string(), z.array(z.string())]).describe("Field value. String for most types, array of strings for multiple-select. For score-system fields, use the option text like '3 - Yes' not the option UUID."),
			})).optional().describe("For action='submit' only — array of {id, value} pairs matching the template's required fields. Posted to Lever as `fieldValues[]` (write-shape; asymmetric with GET response `fields[]`)."),
			interview_id: z.string().optional().describe("For action='submit' only — interview UID to link feedback to (required if panel_id specified)."),
			panel_id: z.string().optional().describe("For action='submit' only — interview panel UID (required if interview_id specified)."),
			mark_complete: z.boolean().default(true).optional().describe("For action='submit' only — when true (default), marks feedback as submitted/complete via completedAt timestamp. When false, creates as draft in the Lever UI for human review before finalization. (Lever quirk: omitting completedAt = draft, contradicting their docs.)"),
		},
		async (args) => {
			try {
				switch (args.action) {
					case "list_templates": {
						const { items: allTemplates } = await collectAllPages((offset) =>
							client.getFeedbackTemplates({
								limit: args.limit ?? 100,
								offset,
							}),
						);
						return {
							content: [{
								type: "text",
								text: JSON.stringify({
									count: allTemplates.length,
									templates: allTemplates.map((tpl: any) => ({
										id: tpl.id,
										text: tpl.text || tpl.name || "",
										instructions: tpl.instructions || "",
										fields: Array.isArray(tpl.fields)
											? tpl.fields.map((f: any) => ({
													id: f.id,
													type: f.type,
													required: !!f.required,
													text: f.text || "",
												}))
											: [],
									})),
								}, null, 2),
							}],
						};
					}
					case "list": {
						if (!args.opportunity_id) throw new Error("opportunity_id is required for action='list'");
						const { items: allFeedback } = await collectAllPages((offset) =>
							client.getOpportunityFeedback(args.opportunity_id!, {
								limit: args.limit ?? 100,
								offset,
							}),
						);
						return {
							content: [{
								type: "text",
								text: JSON.stringify({
									count: allFeedback.length,
									feedback: allFeedback.map((fb: any) => ({
										id: fb.id,
										text: fb.text || "",
										user: fb.user || null,
										interview: fb.interview || null,
										panel: fb.panel || null,
										template: fb.baseTemplateId || fb.template || null,
										createdAt: fb.createdAt || null,
										completedAt: fb.completedAt || null,
										fields: fb.fields || [],
									})),
								}, null, 2),
							}],
						};
					}
					case "get": {
						if (!args.opportunity_id) throw new Error("opportunity_id is required for action='get'");
						if (!args.feedback_id) throw new Error("feedback_id is required for action='get'");
						const response = await client.getFeedback(args.opportunity_id, args.feedback_id);
						const fb: any = response.data || {};
						return {
							content: [{
								type: "text",
								text: JSON.stringify({
									id: fb.id,
									text: fb.text || "",
									instructions: fb.instructions || "",
									user: fb.user || null,
									interview: fb.interview || null,
									panel: fb.panel || null,
									template: fb.baseTemplateId || fb.template || null,
									createdAt: fb.createdAt || null,
									completedAt: fb.completedAt || null,
									fields: fb.fields || [],
								}, null, 2),
							}],
						};
					}
					case "submit": {
						if (!args.opportunity_id) throw new Error("opportunity_id is required for action='submit'");
						if (!args.base_template_id) throw new Error("base_template_id is required for action='submit'");
						if (!args.field_values) throw new Error("field_values is required for action='submit'");
						const performAs = await resolvePerformAs(getSharedResolver(client));
						const result = await client.submitFeedback(
							args.opportunity_id,
							args.base_template_id,
							args.field_values,
							{
								interview: args.interview_id,
								panel: args.panel_id,
								performAs,
								markComplete: args.mark_complete ?? true,
							},
						);
						return {
							content: [{
								type: "text",
								text: JSON.stringify({
									success: true,
									feedback_id: result?.data?.id,
									template_text: result?.data?.text,
									user: result?.data?.user,
									created_at: result?.data?.createdAt,
									completed_at: result?.data?.completedAt ?? null,
									status: result?.data?.completedAt ? "submitted" : "draft",
								}, null, 2),
							}],
						};
					}
					default:
						throw new Error(`Unknown action: ${(args as any).action}`);
				}
			} catch (error) {
				return {
					content: [{
						type: "text",
						text: JSON.stringify({
							error: error instanceof Error ? error.message : String(error),
						}),
					}],
				};
			}
		},
	);
}
