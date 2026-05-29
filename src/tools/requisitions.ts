import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { LeverClient } from "../lever/client.js";

export function registerRequisitionTools(server: McpServer, client: LeverClient) {
	// lever_requisitions — consolidated (replaces lever_list_requisitions + lever_get_requisition_details)
	server.tool(
		"lever_requisitions",
		"Read job requisition data. Use action='list' to fetch requisitions filtered by status / requisition_code / date range / confidentiality, or action='get' to fetch full details for one requisition by either its Lever UUID or its external requisition_code (smart lookup — tries UUID-shape first, falls back to code lookup).",
		{
			action: z.enum(["list", "get"]).describe(
				"Operation to perform. list=fetch requisitions with optional filters; get=fetch full details for a single requisition by ID or code."
			),
			// list action params
			status: z.enum(["open", "closed", "onHold", "draft"]).optional().describe("For action='list' only — filter by requisition status."),
			requisition_code: z.string().optional().describe("For action='list' only — filter by external HRIS requisition code (e.g., 'ENG-145'). Use action='get' with requisition_identifier if you want the full record for a specific code."),
			created_at_start: z.number().optional().describe("For action='list' only — filter by creation date (timestamp in milliseconds)."),
			created_at_end: z.number().optional().describe("For action='list' only — filter by creation date (timestamp in milliseconds)."),
			confidentiality: z.enum(["confidential", "non-confidential", "all"]).default("non-confidential").optional().describe("For action='list' only — filter by confidentiality level."),
			limit: z.number().default(25).optional().describe("For action='list' only — number of results to return (max 100, capped via Math.min)."),
			offset: z.string().optional().describe("For action='list' only — pagination offset token."),
			// get action params
			requisition_identifier: z.string().optional().describe("For action='get' only — either the Lever ID (UUID, 36 chars with hyphens) or the external requisition code (e.g., 'ENG-145'). Smart-lookup tries one then the other."),
		},
		async (args) => {
			try {
				switch (args.action) {
					case "list": {
						const confidentiality = args.confidentiality ?? "non-confidential";
						const limit = args.limit ?? 25;
						// Prepare parameters for API call
						const params: any = {
							limit: Math.min(limit, 100),
							confidentiality: confidentiality,
						};
						if (args.status) params.status = args.status;
						if (args.requisition_code) params.requisition_code = args.requisition_code;
						if (args.created_at_start) params.created_at_start = args.created_at_start;
						if (args.created_at_end) params.created_at_end = args.created_at_end;
						if (args.offset) params.offset = args.offset;

						// Get requisitions from API -- full pagination loop (VAL-105)
						const allReqs: any[] = [];
						let pageOffset = args.offset;
						while (true) {
							const pageParams = { ...params, offset: pageOffset };
							const response = await client.getRequisitions(pageParams);
							if (response.data && response.data.length > 0) {
								allReqs.push(...response.data);
							}
							if (!response.hasNext || !response.next) break;
							pageOffset = response.next;
						}
						const requisitions = allReqs;

						// Format the results to clearly show ID vs Code distinction
						const formattedResults = requisitions.map((req: any) => ({
							// CRITICAL: Show both ID and Code clearly
							lever_id: req.id || "",
							requisition_code: req.requisitionCode || "",
							name: req.name || "",
							status: req.status || "",
							headcount: {
								total: req.headcountTotal || 0,
								hired: req.headcountHired || 0,
								remaining: (req.headcountTotal || 0) - (req.headcountHired || 0),
							},
							details: {
								employment_status: req.employmentStatus || "",
								location: req.location || "",
								team: req.team || "",
								department: req.department || "",
								confidentiality: req.confidentiality || "",
							},
							compensation: req.compensationBand ? {
								currency: req.compensationBand.currency || "",
								min: req.compensationBand.min || 0,
								max: req.compensationBand.max || 0,
								interval: req.compensationBand.interval || "",
							} : null,
							owner: req.owner || "",
							hiring_manager: req.hiringManager || "",
							created_at: req.createdAt ? new Date(req.createdAt).toISOString().split("T")[0] : "",
							updated_at: req.updatedAt ? new Date(req.updatedAt).toISOString().split("T")[0] : "",
						}));

						const result = {
							count: formattedResults.length,
							filters_applied: {
								status: args.status || "all",
								requisition_code: args.requisition_code || "none",
								confidentiality: confidentiality,
							},
							note: "Use lever_id for API calls, requisition_code for HRIS integration",
							requisitions: formattedResults,
						};

						return {
							content: [
								{
									type: "text",
									text: JSON.stringify(result, null, 2),
								},
							],
						};
					}
					case "get": {
						if (!args.requisition_identifier) throw new Error("requisition_identifier is required for action='get'");

						let requisition: any;
						let lookupMethod: string;

						// Smart lookup logic: determine if input is ID or code
						const identifier = args.requisition_identifier.trim();

						// Check if it looks like a UUID (contains hyphens and is 36 chars)
						const isUUID = identifier.length === 36 && identifier.includes("-");

						if (isUUID) {
							// Try direct ID lookup first
							try {
								const response = await client.getRequisition(identifier);
								requisition = response.data;
								lookupMethod = "direct_id_lookup";
							} catch (error) {
								// If direct ID lookup fails, try as code
								try {
									const response = await client.getRequisitionByCode(identifier);
									requisition = response.data;
									lookupMethod = "code_lookup_fallback";
								} catch (codeError) {
									throw new Error(`Requisition not found using ID '${identifier}': ${error instanceof Error ? error.message : String(error)}`);
								}
							}
						} else {
							// Looks like a code, try code lookup first
							try {
								const response = await client.getRequisitionByCode(identifier);
								requisition = response.data;
								lookupMethod = "code_lookup";
							} catch (error) {
								// If code lookup fails, try as direct ID
								try {
									const response = await client.getRequisition(identifier);
									requisition = response.data;
									lookupMethod = "id_lookup_fallback";
								} catch (idError) {
									throw new Error(`Requisition not found using code '${identifier}': ${error instanceof Error ? error.message : String(error)}`);
								}
							}
						}

						// Format the detailed response
						const result = {
							lookup_method: lookupMethod,
							requisition_details: {
								// Core identifiers
								lever_id: requisition.id || "",
								requisition_code: requisition.requisitionCode || "",
								name: requisition.name || "",

								// Status and headcount
								status: requisition.status || "",
								headcount: {
									total: requisition.headcountTotal || 0,
									hired: requisition.headcountHired || 0,
									remaining: (requisition.headcountTotal || 0) - (requisition.headcountHired || 0),
								},
								backfill: requisition.backfill || false,

								// Details
								employment_status: requisition.employmentStatus || "",
								location: requisition.location || "",
								team: requisition.team || "",
								department: requisition.department || "",
								confidentiality: requisition.confidentiality || "",

								// Compensation
								compensation_band: requisition.compensationBand ? {
									currency: requisition.compensationBand.currency || "",
									min: requisition.compensationBand.min || 0,
									max: requisition.compensationBand.max || 0,
									interval: requisition.compensationBand.interval || "",
								} : null,

								// People
								owner: requisition.owner || "",
								hiring_manager: requisition.hiringManager || "",
								creator: requisition.creator || "",

								// Associated postings
								postings: requisition.postings || [],

								// Approval
								approval: requisition.approval || null,

								// Custom fields
								custom_fields: requisition.customFields || {},

								// Internal notes
								internal_notes: requisition.internalNotes || "",

								// Timestamps
								created_at: requisition.createdAt ? new Date(requisition.createdAt).toISOString() : "",
								updated_at: requisition.updatedAt ? new Date(requisition.updatedAt).toISOString() : "",
								closed_at: requisition.closedAt ? new Date(requisition.closedAt).toISOString() : "",
							},
						};

						return {
							content: [
								{
									type: "text",
									text: JSON.stringify(result, null, 2),
								},
							],
						};
					}
					default:
						throw new Error(`Unknown action: ${(args as any).action}`);
				}
			} catch (error) {
				// Preserve the get-action note for backwards compatibility on lookup errors
				const payload: any = { error: error instanceof Error ? error.message : String(error) };
				if (args.action === "get") {
					payload.note = "You can use either the Lever ID (UUID) or the external requisition code (e.g., 'ENG-145')";
				}
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(payload),
						},
					],
				};
			}
		},
	);
}
