import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { LeverClient } from "../lever/client.js";
import { getSharedResolver, resolvePerformAs } from "../auth/resolve-perform-as.js";

export function registerCandidateTools(server: McpServer, client: LeverClient) {
	// List files for a candidate
	server.tool(
		"lever_list_files",
		"List all files and resumes attached to a candidate, with filename, type, size, and download URL.",
		{
			opportunity_id: z.string(),
		},
		async (args) => {
			try {
				// Try both endpoints - files and resumes
				const allFiles: any[] = [];

				// Try files endpoint
				try {
					const filesResponse = await client.getOpportunityFiles(
						args.opportunity_id,
					);
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
					const resumesResponse = await client.getOpportunityResumes(
						args.opportunity_id,
					);
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
					files: allFiles.map((f) => ({
						id: f.id || "",
						filename: f.file?.name || f.name || f.filename || "Unknown",
						type: f.file?.ext || f.type || f.mimetype || "Unknown",
						size: f.file?.size || f.size || 0,
						uploaded_at: f.createdAt
							? new Date(f.createdAt)
									.toISOString()
									.replace("T", " ")
									.substring(0, 16)
							: "Unknown",
						download_url: f.file?.downloadUrl || f.downloadUrl || f.url || "",
						source: f.source || "unknown",
					})),
				};

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(results, null, 2),
						},
					],
				};
			} catch (error) {
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								error: error instanceof Error ? error.message : String(error),
							}),
						},
					],
				};
			}
		},
	);

	// List applications for a candidate
	server.tool(
		"lever_list_applications",
		"List the job applications tied to a candidate, including posting, status, and creation date.",
		{
			opportunity_id: z.string(),
		},
		async (args) => {
			try {
				// Get candidate info
				const oppResponse = await client.getOpportunity(args.opportunity_id);
				const opportunity = oppResponse.data;

				// Get applications
				const response = await client.getOpportunityApplications(
					args.opportunity_id,
				);
				const applications = response.data || [];

				const results = {
					candidate: opportunity.name || "Unknown",
					application_count: applications.length,
					applications: applications.map((app: any) => ({
						id: app.id || "",
						posting: app.posting?.text || "Unknown",
						posting_id: app.posting?.id || "",
						status: app.status || "Unknown",
						created_at: app.createdAt
							? new Date(app.createdAt)
									.toISOString()
									.replace("T", " ")
									.substring(0, 16)
							: "Unknown",
						user: app.user?.name || "System",
					})),
				};

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(results, null, 2),
						},
					],
				};
			} catch (error) {
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								error: error instanceof Error ? error.message : String(error),
							}),
						},
					],
				};
			}
		},
	);

	// Consolidated update tool for stage, owner, and tags
	server.tool(
		"lever_update_candidate",
		"Update a candidate: move stage (by ID or name), add or remove tags; owner reassignment is not yet implemented.",
		{
			opportunity_id: z.string().describe("The candidate's opportunity ID"),
			stage_id: z.string().optional().describe("Move to this stage ID"),
			stage_name: z.string().optional().describe("Move to stage with this name"),
			owner_id: z.string().optional().describe("Assign to this user"),
			add_tags: z.array(z.string()).optional().describe("Tags to add"),
			remove_tags: z.array(z.string()).optional().describe("Tags to remove"),
		},
		async (args) => {
			try {
				const updates: any = {};

				// Handle stage update by name
				if (args.stage_name && !args.stage_id) {
					const stages = await client.getStages();
					const stage = stages.data.find((s: any) =>
						s.text.toLowerCase().includes(args.stage_name!.toLowerCase())
					);
					if (stage) {
						args.stage_id = stage.id;
					} else {
						throw new Error(`Stage "${args.stage_name}" not found`);
					}
				}

				// Resolve perform_as ONLY if there is a write to perform (avoid throwing
				// on a no-op call). Every write below must attach perform_as or Lever 400s.
				const hasWrite = !!(args.stage_id || args.add_tags?.length || args.remove_tags?.length);
				const performAs = hasWrite
					? await resolvePerformAs(getSharedResolver(client))
					: undefined;

				// Perform updates
				const results = [];

				if (args.stage_id) {
					await client.updateOpportunityStage(args.opportunity_id, args.stage_id, performAs);
					results.push({ action: "stage_updated", stage_id: args.stage_id });
				}

				if (args.owner_id) {
					// Note: This would need a new method in LeverClient
					// await client.updateOpportunityOwner(args.opportunity_id, args.owner_id);
					results.push({ action: "owner_updated", owner_id: args.owner_id, note: "Owner update not yet implemented in LeverClient" });
				}

				if (args.add_tags || args.remove_tags) {
					// Handle tag updates
					if (args.add_tags && args.add_tags.length > 0) {
						await client.addCandidateTags(args.opportunity_id, args.add_tags, performAs);
					}
					if (args.remove_tags && args.remove_tags.length > 0) {
						await client.removeCandidateTags(args.opportunity_id, args.remove_tags, performAs);
					}
					results.push({
						action: "tags_updated",
						added: args.add_tags || [],
						removed: args.remove_tags || []
					});
				}

				// Get updated candidate info
				const opportunityResponse = await client.getOpportunity(args.opportunity_id);
				const opportunity = opportunityResponse.data;

				return {
					content: [{
						type: "text",
						text: JSON.stringify({
							success: true,
							opportunity_id: args.opportunity_id,
							candidate_name: opportunity.name || "Unknown",
							current_stage: typeof opportunity.stage === 'object' && opportunity.stage
								? opportunity.stage.text
								: "Unknown",
							updates: results
						}, null, 2)
					}]
				};
			} catch (error) {
				return {
					content: [{
						type: "text",
						text: JSON.stringify({
							error: error instanceof Error ? error.message : String(error),
							opportunity_id: args.opportunity_id
						})
					}]
				};
			}
		}
	);

	// lever_list_emails — VAL-019 (M1.7) — read email thread history for a candidate
	server.tool(
		"lever_list_emails",
		"List the email thread history logged on a candidate, including subject, participants, body, and timestamps.",
		{
			opportunity_id: z.string().describe("Opportunity ID to list emails for"),
			limit: z.number().default(100).describe("Max emails per request (Lever max 100)"),
		},
		async (args) => {
			try {
				const allEmails: any[] = [];
				let offset: string | undefined;

				while (true) {
					const response = await client.getEmails(args.opportunity_id, {
						limit: args.limit,
						offset,
					});

					if (response.data && response.data.length > 0) {
						allEmails.push(...response.data);
					}

					if (!response.hasNext || !response.next) break;
					offset = response.next;
				}

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								count: allEmails.length,
								emails: allEmails.map((email: any) => ({
									id: email.id,
									subject: email.subject || "",
									fromContact: email.fromContact || null,
									to: email.to || [],
									cc: email.cc || [],
									bcc: email.bcc || [],
									body: email.body || email.bodyText || "",
									user: email.user || null,
									createdAt: email.createdAt || email.sentAt || null,
									threadId: email.threadId || null,
								})),
							}, null, 2),
						},
					],
				};
			} catch (error) {
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								error: error instanceof Error ? error.message : String(error),
							}),
						},
					],
				};
			}
		},
	);
}
