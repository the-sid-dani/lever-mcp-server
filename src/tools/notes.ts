import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { LeverClient } from "../lever/client.js";

export function registerNoteTools(server: McpServer, client: LeverClient) {
	// lever_notes — consolidated (replaces lever_list_notes + lever_get_note + lever_add_note)
	server.tool(
		"lever_notes",
		"Read or write candidate notes. Use action='list' to fetch all notes on a candidate, action='get' to fetch one note by id, or action='add' to create a new note (single-tenant — attributed via LEVER_DEFAULT_USER_ID).",
		{
			action: z.enum(["list", "get", "add"]).describe(
				"Operation to perform. list=fetch all notes on opportunity_id; get=fetch one note by note_id; add=create a new note with content."
			),
			opportunity_id: z.string().describe("Opportunity / candidate ID. Required for all actions."),
			limit: z.number().default(100).optional().describe("For action='list' only — max notes per request (Lever max 100, paginated up to 5 batches)."),
			note_id: z.string().optional().describe("For action='get' only — the note ID to fetch."),
			note: z.string().optional().describe("For action='add' only — the note content."),
			author_email: z.string().optional().describe("For action='add' only — email of the note author (optional)."),
		},
		async (args) => {
			try {
				switch (args.action) {
					case "list": {
						const allNotes: any[] = [];
						let offset: string | undefined;
						while (true) {
							const response = await client.getNotes(args.opportunity_id, {
								limit: args.limit ?? 100,
								offset,
							});
							if (response.data && response.data.length > 0) {
								allNotes.push(...response.data);
							}
							if (!response.hasNext || !response.next) break;
							offset = response.next;
						}
						return {
							content: [{
								type: "text",
								text: JSON.stringify({
									count: allNotes.length,
									notes: allNotes.map((n: any) => ({
										id: n.id,
										value: n.value || "",
										user: n.user || null,
										secret: !!n.secret,
										createdAt: n.createdAt || null,
										deletedAt: n.deletedAt || null,
									})),
								}, null, 2),
							}],
						};
					}
					case "get": {
						if (!args.note_id) throw new Error("note_id is required for action='get'");
						const response = await client.getNote(args.opportunity_id, args.note_id);
						const n: any = response.data || {};
						return {
							content: [{
								type: "text",
								text: JSON.stringify({
									id: n.id,
									value: n.value || "",
									user: n.user || null,
									secret: !!n.secret,
									createdAt: n.createdAt || null,
									deletedAt: n.deletedAt || null,
									fields: n.fields || null,
								}, null, 2),
							}],
						};
					}
					case "add": {
						if (!args.note) throw new Error("note is required for action='add'");
						const result = await client.addNote(args.opportunity_id, args.note, args.author_email);
						return {
							content: [{
								type: "text",
								text: JSON.stringify({ success: true, message: "Note added successfully", data: result }, null, 2),
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
