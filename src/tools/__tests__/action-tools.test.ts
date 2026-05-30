import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { LeverClient } from "../../lever/client.js";
import { registerNoteTools } from "../notes.js";
import { registerFeedbackTools } from "../feedback.js";
import { registerStageTools } from "../stages.js";
import { registerArchiveTools } from "../archive.js";
import { registerRequisitionTools } from "../requisitions.js";
import { registerSearchTools } from "../search.js";
import { registerUserTools } from "../users.js";
import { registerCandidateTools } from "../candidates.js";
import { registerSearchTools as registerAdvancedSearchTools } from "../../tools.js";
import { registerInterviewTools } from "../../interview-tools.js";
import { __resetSharedResolver } from "../../auth/resolve-perform-as.js";

// A tiny fake McpServer that captures (name, schema, handler) registrations.
type Handler = (args: any) => Promise<{ content: Array<{ type: string; text: string }> }>;

function makeFakeServer() {
	const registry = new Map<string, { schema: any; handler: Handler }>();
	const server = {
		tool: (name: string, _desc: any, schema: any, handler: Handler) => {
			registry.set(name, { schema, handler });
		},
	} as unknown as McpServer;
	return { server, registry };
}

// Parse the JSON text payload out of an MCP tool response.
function parsePayload(res: { content: Array<{ type: string; text: string }> }): any {
	expect(Array.isArray(res.content)).toBe(true);
	expect(res.content[0]!.type).toBe("text");
	return JSON.parse(res.content[0]!.text);
}

describe("lever_notes action dispatch", () => {
	let client: any;
	let registry: Map<string, { schema: any; handler: Handler }>;

	beforeEach(() => {
		client = {
			getNotes: vi.fn(async () => ({ data: [{ id: "n1", value: "hi" }], hasNext: false })),
			getNote: vi.fn(async () => ({ data: { id: "n1", value: "hi" } })),
			addNote: vi.fn(async () => ({ data: { id: "n-new" } })),
		};
		const fake = makeFakeServer();
		registry = fake.registry;
		registerNoteTools(fake.server, client as LeverClient);
		// resolvePerformAs (OAUTH disabled in test env) needs a default user.
		process.env.LEVER_DEFAULT_USER_ID = "test-default-user";
		__resetSharedResolver();
	});

	afterEach(() => {
		delete process.env.LEVER_DEFAULT_USER_ID;
	});

	it("action='list' routes to client.getNotes", async () => {
		const { handler } = registry.get("lever_notes")!;
		const res = await handler({ action: "list", opportunity_id: "opp-1" });
		expect(client.getNotes).toHaveBeenCalledTimes(1);
		const payload = parsePayload(res);
		expect(payload.count).toBe(1);
		expect(payload.notes[0].id).toBe("n1");
	});

	it("action='get' routes to client.getNote", async () => {
		const { handler } = registry.get("lever_notes")!;
		const res = await handler({ action: "get", opportunity_id: "opp-1", note_id: "n1" });
		expect(client.getNote).toHaveBeenCalledWith("opp-1", "n1");
		const payload = parsePayload(res);
		expect(payload.id).toBe("n1");
	});

	it("action='add' routes to client.addNote with the resolved perform_as", async () => {
		const { handler } = registry.get("lever_notes")!;
		const res = await handler({ action: "add", opportunity_id: "opp-1", note: "a note" });
		expect(client.addNote).toHaveBeenCalledWith("opp-1", "a note", "test-default-user");
		const payload = parsePayload(res);
		expect(payload.success).toBe(true);
	});

	it("action='add' fails loud and does NOT write when perform_as cannot be resolved", async () => {
		// OAuth off + no LEVER_DEFAULT_USER_ID -> resolvePerformAs throws -> caught by handler.
		delete process.env.LEVER_DEFAULT_USER_ID;
		__resetSharedResolver();
		const { handler } = registry.get("lever_notes")!;
		const res = await handler({ action: "add", opportunity_id: "opp-1", note: "a note" });
		expect(client.addNote).not.toHaveBeenCalled();
		const payload = parsePayload(res);
		expect(payload.error).toMatch(/perform_as cannot be resolved/i);
	});

	it("action='add' with no note returns an error response (handler catches the throw)", async () => {
		const { handler } = registry.get("lever_notes")!;
		const res = await handler({ action: "add", opportunity_id: "opp-1" });
		expect(client.addNote).not.toHaveBeenCalled();
		const payload = parsePayload(res);
		expect(payload.error).toMatch(/note is required/i);
	});
});

describe("lever_feedback action dispatch", () => {
	let client: any;
	let registry: Map<string, { schema: any; handler: Handler }>;

	beforeEach(() => {
		client = {
			getFeedbackTemplates: vi.fn(async () => ({
				data: [{ id: "tpl1", text: "T" }],
				hasNext: false,
			})),
			getOpportunityFeedback: vi.fn(async () => ({ data: [{ id: "fb1" }], hasNext: false })),
			getFeedback: vi.fn(async () => ({ data: { id: "fb1" } })),
			submitFeedback: vi.fn(async () => ({ data: { id: "fb-new", completedAt: 123 } })),
		};
		const fake = makeFakeServer();
		registry = fake.registry;
		registerFeedbackTools(fake.server, client as LeverClient);
		// resolvePerformAs (OAUTH disabled in test env) needs a default user.
		process.env.LEVER_DEFAULT_USER_ID = "test-default-user";
		__resetSharedResolver();
	});

	afterEach(() => {
		delete process.env.LEVER_DEFAULT_USER_ID;
	});

	it("action='list_templates' routes to client.getFeedbackTemplates", async () => {
		const { handler } = registry.get("lever_feedback")!;
		const res = await handler({ action: "list_templates" });
		expect(client.getFeedbackTemplates).toHaveBeenCalledTimes(1);
		const payload = parsePayload(res);
		expect(payload.count).toBe(1);
		expect(payload.templates[0].id).toBe("tpl1");
	});

	it("action='list' routes to client.getOpportunityFeedback", async () => {
		const { handler } = registry.get("lever_feedback")!;
		const res = await handler({ action: "list", opportunity_id: "opp-1" });
		expect(client.getOpportunityFeedback).toHaveBeenCalledTimes(1);
		const payload = parsePayload(res);
		expect(payload.count).toBe(1);
	});

	it("action='get' routes to client.getFeedback", async () => {
		const { handler } = registry.get("lever_feedback")!;
		const res = await handler({ action: "get", opportunity_id: "opp-1", feedback_id: "fb1" });
		expect(client.getFeedback).toHaveBeenCalledWith("opp-1", "fb1");
		const payload = parsePayload(res);
		expect(payload.id).toBe("fb1");
	});

	it("action='submit' routes to client.submitFeedback", async () => {
		const { handler } = registry.get("lever_feedback")!;
		const res = await handler({
			action: "submit",
			opportunity_id: "opp-1",
			base_template_id: "tpl1",
			field_values: [{ id: "f1", value: "yes" }],
		});
		expect(client.submitFeedback).toHaveBeenCalledTimes(1);
		const payload = parsePayload(res);
		expect(payload.success).toBe(true);
		expect(payload.feedback_id).toBe("fb-new");
		expect(payload.status).toBe("submitted");
	});

	it("action='submit' with no field_values returns an error response", async () => {
		const { handler } = registry.get("lever_feedback")!;
		const res = await handler({
			action: "submit",
			opportunity_id: "opp-1",
			base_template_id: "tpl1",
		});
		expect(client.submitFeedback).not.toHaveBeenCalled();
		const payload = parsePayload(res);
		expect(payload.error).toMatch(/field_values is required/i);
	});
});

describe("lever_stages action dispatch", () => {
	let client: any;
	let registry: Map<string, { schema: any; handler: Handler }>;

	beforeEach(() => {
		client = {
			getStages: vi.fn(async () => ({ data: [{ id: "s1", text: "Stage 1" }] })),
			getOpportunity: vi.fn(async () => ({
				data: { id: "opp-1", stageChanges: [{ toStageId: "s2", updatedAt: 1 }] },
			})),
		};
		const fake = makeFakeServer();
		registry = fake.registry;
		registerStageTools(fake.server, client as LeverClient);
	});

	it("action='list' routes to client.getStages", async () => {
		const { handler } = registry.get("lever_stages")!;
		const res = await handler({ action: "list" });
		expect(client.getStages).toHaveBeenCalledTimes(1);
		const payload = parsePayload(res);
		expect(payload.data[0].id).toBe("s1");
	});

	it("action='history' routes to client.getOpportunity and shapes stage history", async () => {
		const { handler } = registry.get("lever_stages")!;
		const res = await handler({ action: "history", opportunity_id: "opp-1" });
		expect(client.getOpportunity).toHaveBeenCalledWith("opp-1");
		const payload = parsePayload(res);
		expect(payload.count).toBe(1);
		expect(payload.stage_history[0].stageId).toBe("s2");
	});

	it("action='history' with no opportunity_id returns an error response", async () => {
		const { handler } = registry.get("lever_stages")!;
		const res = await handler({ action: "history" });
		expect(client.getOpportunity).not.toHaveBeenCalled();
		const payload = parsePayload(res);
		expect(payload.error).toMatch(/opportunity_id is required/i);
	});
});

describe("lever_archive action dispatch", () => {
	let client: any;
	let registry: Map<string, { schema: any; handler: Handler }>;

	beforeEach(() => {
		client = {
			getArchiveReasons: vi.fn(async () => ({ data: [{ id: "reason-1", text: "Hired" }] })),
			getOpportunity: vi.fn(async () => ({ data: { id: "opp-1", name: "Jane" } })),
			archiveOpportunity: vi.fn(async () => ({ data: { id: "opp-1" } })),
			getArchivedCandidates: vi.fn(async () => ({ data: [], hasNext: false })),
			getOpportunityInterviews: vi.fn(async () => ({ data: [] })),
		};
		const fake = makeFakeServer();
		registry = fake.registry;
		registerArchiveTools(fake.server, client as LeverClient);
		// resolvePerformAs (OAUTH disabled in test env) needs a default user.
		process.env.LEVER_DEFAULT_USER_ID = "test-default-user";
		__resetSharedResolver();
	});

	afterEach(() => {
		delete process.env.LEVER_DEFAULT_USER_ID;
	});

	it("action='list_reasons' routes to client.getArchiveReasons", async () => {
		const { handler } = registry.get("lever_archive")!;
		const res = await handler({ action: "list_reasons" });
		expect(client.getArchiveReasons).toHaveBeenCalledTimes(1);
		const payload = parsePayload(res);
		expect(payload.data[0].id).toBe("reason-1");
	});

	it("action='archive' routes to client.archiveOpportunity after validating reason", async () => {
		const { handler } = registry.get("lever_archive")!;
		const res = await handler({
			action: "archive",
			opportunity_id: "opp-1",
			archive_reason_id: "reason-1",
		});
		expect(client.archiveOpportunity).toHaveBeenCalledTimes(1);
		const payload = parsePayload(res);
		expect(payload.success).toBe(true);
		expect(payload.candidate).toBe("Jane");
	});

	it("action='search' routes to client.getArchivedCandidates", async () => {
		const { handler } = registry.get("lever_archive")!;
		const res = await handler({ action: "search" });
		expect(client.getArchivedCandidates).toHaveBeenCalledTimes(1);
		const payload = parsePayload(res);
		expect(payload.summary.total_archived_candidates).toBe(0);
	});

	it("action='archive' with no archive_reason_id returns an error response", async () => {
		const { handler } = registry.get("lever_archive")!;
		const res = await handler({ action: "archive", opportunity_id: "opp-1" });
		expect(client.archiveOpportunity).not.toHaveBeenCalled();
		const payload = parsePayload(res);
		expect(payload.error).toMatch(/archive_reason_id is required/i);
	});
});

describe("lever_requisitions action dispatch", () => {
	let client: any;
	let registry: Map<string, { schema: any; handler: Handler }>;

	beforeEach(() => {
		client = {
			getRequisitions: vi.fn(async () => ({
				data: [{ id: "r1", requisitionCode: "ENG-1" }],
			})),
			getRequisition: vi.fn(async () => ({ data: { id: "r1", requisitionCode: "ENG-1" } })),
			getRequisitionByCode: vi.fn(async () => ({
				data: { id: "r1", requisitionCode: "ENG-1" },
			})),
		};
		const fake = makeFakeServer();
		registry = fake.registry;
		registerRequisitionTools(fake.server, client as LeverClient);
	});

	it("action='list' routes to client.getRequisitions", async () => {
		const { handler } = registry.get("lever_requisitions")!;
		const res = await handler({ action: "list" });
		expect(client.getRequisitions).toHaveBeenCalledTimes(1);
		const payload = parsePayload(res);
		expect(payload.count).toBe(1);
		expect(payload.requisitions[0].lever_id).toBe("r1");
	});

	it("action='get' with a code routes to client.getRequisitionByCode", async () => {
		const { handler } = registry.get("lever_requisitions")!;
		const res = await handler({ action: "get", requisition_identifier: "ENG-1" });
		expect(client.getRequisitionByCode).toHaveBeenCalledWith("ENG-1");
		const payload = parsePayload(res);
		expect(payload.lookup_method).toBe("code_lookup");
		expect(payload.requisition_details.lever_id).toBe("r1");
	});

	it("action='get' with no requisition_identifier returns an error response", async () => {
		const { handler } = registry.get("lever_requisitions")!;
		const res = await handler({ action: "get" });
		expect(client.getRequisition).not.toHaveBeenCalled();
		expect(client.getRequisitionByCode).not.toHaveBeenCalled();
		const payload = parsePayload(res);
		expect(payload.error).toMatch(/requisition_identifier is required/i);
	});
});

describe("lever_search_candidates name-sweep coverage (VAL-102)", () => {
	// registerSearchTools registers lever_search_candidates with the 3-arg
	// overload (name, schema, handler) -- NO description string. This local fake
	// captures the LAST two args as (schema, handler) regardless of arity.
	function makeSearchFakeServer() {
		const registry = new Map<string, { schema: any; handler: Handler }>();
		const server = {
			tool: (name: string, ...rest: any[]) => {
				const handler = rest[rest.length - 1];
				const schema = rest[rest.length - 2];
				registry.set(name, { schema, handler });
			},
		} as unknown as McpServer;
		return { server, registry };
	}

	it("paginates to hasNext:false across all pages and reports complete coverage", async () => {
		const client: any = {
			getOpportunities: vi
				.fn()
				.mockResolvedValueOnce({
					data: [{ id: "a", name: "Jane Smith" }],
					hasNext: true,
					next: "off2",
				})
				.mockResolvedValueOnce({
					data: [{ id: "b", name: "Jane Doe" }],
					hasNext: false,
				}),
		};
		const fake = makeSearchFakeServer();
		registerSearchTools(fake.server, client as LeverClient);

		const { handler } = fake.registry.get("lever_search_candidates")!;
		const res = await handler({ query: "Jane", limit: 200, page: 1 });

		// Full sweep across both pages proves the maxPages/maxFetch caps are gone.
		expect(client.getOpportunities).toHaveBeenCalledTimes(2);
		const payload = parsePayload(res);
		expect(payload.total_matches).toBe(2);
		expect(payload.coverage.complete).toBe(true);
		expect(payload.coverage.pages_scanned).toBe(2);
	});
});

describe("lever_advanced_search full pagination (VAL-103)", () => {
	// tools.ts registerSearchTools registers lever_advanced_search with the
	// 4-arg overload (name, description, schema, handler), so the standard
	// makeFakeServer (which captures arg positions 0,1,2,3) works directly.

	it("sweeps every page to hasNext:false and reports complete coverage", async () => {
		const client: any = {
			getOpportunities: vi
				.fn()
				.mockResolvedValueOnce({
					data: [{ id: "a", name: "Jane Smith" }],
					hasNext: true,
					next: "off2",
				})
				.mockResolvedValueOnce({
					data: [{ id: "b", name: "Jane Doe" }],
					hasNext: false,
				}),
		};
		const fake = makeFakeServer();
		registerAdvancedSearchTools(fake.server, client as LeverClient);

		const { handler } = fake.registry.get("lever_advanced_search")!;
		const res = await handler({
			limit: 50,
			page: 1,
			mode: "comprehensive",
			archived: false,
		});

		// Full sweep across both pages proves the maxFetch ceiling is gone.
		expect(client.getOpportunities).toHaveBeenCalledTimes(2);
		const payload = parsePayload(res);
		expect(payload.total_matches).toBe(2);
		expect(payload.coverage.complete).toBe(true);
		expect(payload.coverage.pages_scanned).toBe(2);
		expect(payload.coverage.records_scanned).toBe(2);
	});

	it("multi-tag: keeps candidates matching a LATER tag and does NOT narrow server-side by tag (B2)", async () => {
		// Two candidates: 'a' matches only tag "a", 'b' matches only tag "b".
		// The old code sent tag="a" server-side (first tag) which would drop 'b'.
		// With the fix the sweep is full + tags are filtered client-side, so BOTH match.
		const getOpportunities = vi.fn().mockResolvedValueOnce({
			data: [
				{ id: "a", name: "Cand A", emails: [], tags: ["a"], location: "", headline: "" },
				{ id: "b", name: "Cand B", emails: [], tags: ["b"], location: "", headline: "" },
			],
			hasNext: false,
		});
		const client: any = { getOpportunities };
		const fake = makeFakeServer();
		registerAdvancedSearchTools(fake.server, client as LeverClient);

		const { handler } = fake.registry.get("lever_advanced_search")!;
		const res = await handler({ tags: "a,b", limit: 50, page: 1, archived: false });

		const payload = parsePayload(res);
		const ids = payload.results.map((r: any) => r.id);
		expect(ids).toContain("a");
		expect(ids).toContain("b");
		expect(payload.total_matches).toBe(2);

		// No server-side `tag` narrowing on any getOpportunities call.
		for (const call of getOpportunities.mock.calls) {
			expect(call[0]).not.toHaveProperty("tag");
		}
	});

	it("archived:true is passed through to getOpportunities (B2)", async () => {
		const getOpportunities = vi.fn().mockResolvedValueOnce({
			data: [{ id: "a", name: "Cand A", emails: [], tags: [], location: "", headline: "" }],
			hasNext: false,
		});
		const client: any = { getOpportunities };
		const fake = makeFakeServer();
		registerAdvancedSearchTools(fake.server, client as LeverClient);

		const { handler } = fake.registry.get("lever_advanced_search")!;
		await handler({ archived: true, limit: 50, page: 1 });

		expect(getOpportunities).toHaveBeenCalledTimes(1);
		expect(getOpportunities.mock.calls[0]![0]).toMatchObject({ archived: true });
	});
});

describe("lever_notes action=list full pagination (VAL-105)", () => {
	it("paginates to hasNext:false (cap removed) and accumulates across pages", async () => {
		const client: any = {
			getNotes: vi
				.fn()
				.mockResolvedValueOnce({ data: [{ id: "n1" }], hasNext: true, next: "o2" })
				.mockResolvedValueOnce({ data: [{ id: "n2" }], hasNext: true, next: "o3" })
				.mockResolvedValueOnce({ data: [{ id: "n3" }], hasNext: true, next: "o4" })
				.mockResolvedValueOnce({ data: [{ id: "n4" }], hasNext: true, next: "o5" })
				.mockResolvedValueOnce({ data: [{ id: "n5" }], hasNext: true, next: "o6" })
				.mockResolvedValueOnce({ data: [{ id: "n6" }], hasNext: false }),
		};
		const fake = makeFakeServer();
		registerNoteTools(fake.server, client as LeverClient);

		const { handler } = fake.registry.get("lever_notes")!;
		const res = await handler({ action: "list", opportunity_id: "opp-1" });

		// 6 pages > old maxBatches=5 cap -> proves the cap is gone.
		expect(client.getNotes).toHaveBeenCalledTimes(6);
		const payload = parsePayload(res);
		expect(payload.count).toBe(6);
		expect(payload.notes.map((n: any) => n.id)).toEqual(["n1", "n2", "n3", "n4", "n5", "n6"]);
	});
});

describe("lever_feedback list actions full pagination (VAL-105)", () => {
	it("action='list_templates' paginates to hasNext:false", async () => {
		const client: any = {
			getFeedbackTemplates: vi
				.fn()
				.mockResolvedValueOnce({ data: [{ id: "t1" }], hasNext: true, next: "o2" })
				.mockResolvedValueOnce({ data: [{ id: "t2" }], hasNext: true, next: "o3" })
				.mockResolvedValueOnce({ data: [{ id: "t3" }], hasNext: true, next: "o4" })
				.mockResolvedValueOnce({ data: [{ id: "t4" }], hasNext: true, next: "o5" })
				.mockResolvedValueOnce({ data: [{ id: "t5" }], hasNext: true, next: "o6" })
				.mockResolvedValueOnce({ data: [{ id: "t6" }], hasNext: false }),
		};
		const fake = makeFakeServer();
		registerFeedbackTools(fake.server, client as LeverClient);

		const { handler } = fake.registry.get("lever_feedback")!;
		const res = await handler({ action: "list_templates" });

		expect(client.getFeedbackTemplates).toHaveBeenCalledTimes(6);
		const payload = parsePayload(res);
		expect(payload.count).toBe(6);
	});

	it("action='list' paginates to hasNext:false", async () => {
		const client: any = {
			getOpportunityFeedback: vi
				.fn()
				.mockResolvedValueOnce({ data: [{ id: "fb1" }], hasNext: true, next: "o2" })
				.mockResolvedValueOnce({ data: [{ id: "fb2" }], hasNext: true, next: "o3" })
				.mockResolvedValueOnce({ data: [{ id: "fb3" }], hasNext: true, next: "o4" })
				.mockResolvedValueOnce({ data: [{ id: "fb4" }], hasNext: true, next: "o5" })
				.mockResolvedValueOnce({ data: [{ id: "fb5" }], hasNext: true, next: "o6" })
				.mockResolvedValueOnce({ data: [{ id: "fb6" }], hasNext: false }),
		};
		const fake = makeFakeServer();
		registerFeedbackTools(fake.server, client as LeverClient);

		const { handler } = fake.registry.get("lever_feedback")!;
		const res = await handler({ action: "list", opportunity_id: "opp-1" });

		expect(client.getOpportunityFeedback).toHaveBeenCalledTimes(6);
		const payload = parsePayload(res);
		expect(payload.count).toBe(6);
	});
});

describe("lever_requisitions action=list full pagination (VAL-105)", () => {
	it("paginates to hasNext:false (was single-call) and accumulates across pages", async () => {
		const client: any = {
			getRequisitions: vi
				.fn()
				.mockResolvedValueOnce({
					data: [{ id: "r1", requisitionCode: "ENG-1" }],
					hasNext: true,
					next: "o2",
				})
				.mockResolvedValueOnce({
					data: [{ id: "r2", requisitionCode: "ENG-2" }],
					hasNext: false,
				}),
		};
		const fake = makeFakeServer();
		registerRequisitionTools(fake.server, client as LeverClient);

		const { handler } = fake.registry.get("lever_requisitions")!;
		const res = await handler({ action: "list" });

		expect(client.getRequisitions).toHaveBeenCalledTimes(2);
		const payload = parsePayload(res);
		expect(payload.count).toBe(2);
		expect(payload.requisitions.map((r: any) => r.lever_id)).toEqual(["r1", "r2"]);
	});
});

describe("lever_get_users + lever_list_emails full pagination (VAL-105)", () => {
	// Both register with the 3-arg overload (name, schema, handler) -- NO description.
	// This local fake captures the LAST two args as (schema, handler) regardless of arity.
	function makeArityFakeServer() {
		const registry = new Map<string, { schema: any; handler: Handler }>();
		const server = {
			tool: (name: string, ...rest: any[]) => {
				const handler = rest[rest.length - 1];
				const schema = rest[rest.length - 2];
				registry.set(name, { schema, handler });
			},
		} as unknown as McpServer;
		return { server, registry };
	}

	it("lever_get_users paginates to hasNext:false (cap removed)", async () => {
		const client: any = {
			getUsers: vi
				.fn()
				.mockResolvedValueOnce({ data: [{ id: "u1" }], hasNext: true, next: "o2" })
				.mockResolvedValueOnce({ data: [{ id: "u2" }], hasNext: true, next: "o3" })
				.mockResolvedValueOnce({ data: [{ id: "u3" }], hasNext: true, next: "o4" })
				.mockResolvedValueOnce({ data: [{ id: "u4" }], hasNext: true, next: "o5" })
				.mockResolvedValueOnce({ data: [{ id: "u5" }], hasNext: true, next: "o6" })
				.mockResolvedValueOnce({ data: [{ id: "u6" }], hasNext: false }),
		};
		const fake = makeArityFakeServer();
		registerUserTools(fake.server, client as LeverClient);

		const { handler } = fake.registry.get("lever_get_users")!;
		const res = await handler({ limit: 100, include_deactivated: false });

		expect(client.getUsers).toHaveBeenCalledTimes(6);
		const payload = parsePayload(res);
		expect(payload.count).toBe(6);
	});

	it("lever_list_emails paginates to hasNext:false (cap removed)", async () => {
		const client: any = {
			getEmails: vi
				.fn()
				.mockResolvedValueOnce({ data: [{ id: "e1" }], hasNext: true, next: "o2" })
				.mockResolvedValueOnce({ data: [{ id: "e2" }], hasNext: true, next: "o3" })
				.mockResolvedValueOnce({ data: [{ id: "e3" }], hasNext: true, next: "o4" })
				.mockResolvedValueOnce({ data: [{ id: "e4" }], hasNext: true, next: "o5" })
				.mockResolvedValueOnce({ data: [{ id: "e5" }], hasNext: true, next: "o6" })
				.mockResolvedValueOnce({ data: [{ id: "e6" }], hasNext: false }),
		};
		const fake = makeArityFakeServer();
		registerCandidateTools(fake.server, client as LeverClient);

		const { handler } = fake.registry.get("lever_list_emails")!;
		const res = await handler({ opportunity_id: "opp-1", limit: 100 });

		expect(client.getEmails).toHaveBeenCalledTimes(6);
		const payload = parsePayload(res);
		expect(payload.count).toBe(6);
	});
});

describe("lever_archive action=search recall + coverage (VAL-104)", () => {
	it("Test A: fetch_all_pages=true paginates to hasNext:false (50-page cap gone) and reports complete coverage", async () => {
		const client: any = {
			getArchivedCandidates: vi
				.fn()
				.mockResolvedValueOnce({ data: [{ id: "c1" }], hasNext: true, next: "o2" })
				.mockResolvedValueOnce({ data: [{ id: "c2" }], hasNext: false }),
			getOpportunityInterviews: vi.fn(async () => ({ data: [] })),
		};
		const fake = makeFakeServer();
		registerArchiveTools(fake.server, client as LeverClient);

		const { handler } = fake.registry.get("lever_archive")!;
		const res = await handler({
			action: "search",
			fetch_all_pages: true,
			include_interviews: false,
		});

		expect(client.getArchivedCandidates).toHaveBeenCalledTimes(2);
		const payload = parsePayload(res);
		expect(payload.coverage.complete).toBe(true);
		expect(payload.summary.total_archived_candidates).toBe(2);
	});

	it("Test B: fetch_all_pages=false with a next page surfaces complete:false coverage + warning", async () => {
		const client: any = {
			getArchivedCandidates: vi
				.fn()
				.mockResolvedValueOnce({ data: [{ id: "c1" }], hasNext: true, next: "o2" }),
			getOpportunityInterviews: vi.fn(async () => ({ data: [] })),
		};
		const fake = makeFakeServer();
		registerArchiveTools(fake.server, client as LeverClient);

		const { handler } = fake.registry.get("lever_archive")!;
		const res = await handler({
			action: "search",
			fetch_all_pages: false,
			include_interviews: false,
		});

		const payload = parsePayload(res);
		expect(payload.coverage.complete).toBe(false);
		expect(typeof payload.coverage.warning).toBe("string");
		expect(payload.coverage.warning.length).toBeGreaterThan(0);
	});
});

describe("lever_get_interview_insights interviewer_email fan-out (VAL-301)", () => {
	// registerInterviewTools registers lever_get_interview_insights with the
	// 4-arg overload (name, description, schema, handler). This local fake
	// captures the LAST two args as (schema, handler) regardless of arity.
	function makeInterviewFakeServer() {
		const registry = new Map<string, { schema: any; handler: Handler }>();
		const server = {
			tool: (name: string, ...rest: any[]) => {
				const handler = rest[rest.length - 1];
				const schema = rest[rest.length - 2];
				registry.set(name, { schema, handler });
			},
		} as unknown as McpServer;
		return { server, registry };
	}

	it("matches interviews by interviewer_email and reports complete coverage (posting_id path)", async () => {
		const client: any = {
			getOpportunities: vi.fn().mockResolvedValueOnce({
				data: [{ id: "opp1", name: "Jane", owner: { email: "r@x.com" } }],
				hasNext: false,
			}),
			getOpportunityInterviews: vi.fn(async () => ({
				data: [
					{
						id: "iv1",
						subject: "Tech",
						date: Date.now() + 10 * 86400000, // ~10d out -> within next_week (+7d..+14d)
						interviewers: [{ id: "u1", name: "Bob", email: "bob@samba.tv" }],
					},
				],
			})),
		};
		const fake = makeInterviewFakeServer();
		registerInterviewTools(fake.server, client as LeverClient);

		const { handler } = fake.registry.get("lever_get_interview_insights")!;
		const res = await handler({
			interviewer_email: "bob@samba.tv",
			posting_id: "post1",
			time_scope: "next_week",
			view_type: "detailed",
			limit: 25,
		});

		const payload = parsePayload(res);
		expect(payload.coverage.working_set_complete).toBe(true);
		expect(payload.coverage.opportunities_scanned).toBe(1);
		expect(payload.metadata.total_count).toBe(1);
		expect(client.getOpportunityInterviews).toHaveBeenCalledTimes(1);
		expect(Array.isArray(payload.data.interviews)).toBe(true);
	});

	it("returns total_count 0 when no interviewer matches", async () => {
		const client: any = {
			getOpportunities: vi.fn().mockResolvedValueOnce({
				data: [{ id: "opp1", name: "Jane", owner: { email: "r@x.com" } }],
				hasNext: false,
			}),
			getOpportunityInterviews: vi.fn(async () => ({
				data: [
					{
						id: "iv1",
						subject: "Tech",
						date: Date.now() + 10 * 86400000, // ~10d out -> within next_week (+7d..+14d)
						interviewers: [{ id: "u1", name: "Bob", email: "bob@samba.tv" }],
					},
				],
			})),
		};
		const fake = makeInterviewFakeServer();
		registerInterviewTools(fake.server, client as LeverClient);

		const { handler } = fake.registry.get("lever_get_interview_insights")!;
		const res = await handler({
			interviewer_email: "nobody@x.com",
			posting_id: "post1",
			time_scope: "next_week",
			view_type: "detailed",
			limit: 25,
		});

		const payload = parsePayload(res);
		expect(payload.metadata.total_count).toBe(0);
	});
});

describe("VAL-503 stuck-cursor regression (non-advancing cursor must not hang)", () => {
	// Both lever_get_users and lever_notes register with overloads whose LAST two
	// args are (schema, handler). This local fake captures them regardless of arity.
	function makeArityFakeServer() {
		const registry = new Map<string, { schema: any; handler: Handler }>();
		const server = {
			tool: (name: string, ...rest: any[]) => {
				const handler = rest[rest.length - 1];
				const schema = rest[rest.length - 2];
				registry.set(name, { schema, handler });
			},
		} as unknown as McpServer;
		return { server, registry };
	}

	it("lever_get_users RETURNS on a non-advancing cursor (calls getUsers exactly 2x)", async () => {
		// Page 1 + page 2 both report next:'a' (cursor never advances). A naive
		// while(true) loop would spin forever; collectAllPages must break after the
		// 2nd page. The 3rd mock throws, so an infinite loop surfaces as that throw.
		const getUsers = vi
			.fn()
			.mockResolvedValueOnce({ data: [{ id: "u1" }], hasNext: true, next: "a" })
			.mockResolvedValueOnce({ data: [{ id: "u2" }], hasNext: true, next: "a" })
			.mockRejectedValue(new Error("STUCK_CURSOR_LOOPED"));
		const client: any = { getUsers };
		const fake = makeArityFakeServer();
		registerUserTools(fake.server, client as LeverClient);

		const { handler } = fake.registry.get("lever_get_users")!;
		const res = await handler({ limit: 100, include_deactivated: false });

		expect(getUsers).toHaveBeenCalledTimes(2);
		const payload = parsePayload(res);
		// Both pages were accumulated before the defensive break.
		expect(payload.count).toBe(2);
		expect(payload.error).toBeUndefined();
	});

	it("lever_notes action='list' RETURNS on a non-advancing cursor (calls getNotes exactly 2x)", async () => {
		const getNotes = vi
			.fn()
			.mockResolvedValueOnce({ data: [{ id: "n1" }], hasNext: true, next: "a" })
			.mockResolvedValueOnce({ data: [{ id: "n2" }], hasNext: true, next: "a" })
			.mockRejectedValue(new Error("STUCK_CURSOR_LOOPED"));
		const client: any = { getNotes };
		const fake = makeArityFakeServer();
		registerNoteTools(fake.server, client as LeverClient);

		const { handler } = fake.registry.get("lever_notes")!;
		const res = await handler({ action: "list", opportunity_id: "opp-1" });

		expect(getNotes).toHaveBeenCalledTimes(2);
		const payload = parsePayload(res);
		expect(payload.count).toBe(2);
		expect(payload.error).toBeUndefined();
	});
});

describe("VAL-504 search-loop stuck-cursor safety + honest coverage", () => {
	// Both lever_search_candidates and lever_advanced_search register handlers
	// whose LAST two args are (schema, handler). This local fake captures them
	// regardless of arity (search_candidates is 3-arg, advanced_search is 4-arg).
	function makeArityFakeServer() {
		const registry = new Map<string, { schema: any; handler: Handler }>();
		const server = {
			tool: (name: string, ...rest: any[]) => {
				const handler = rest[rest.length - 1];
				const schema = rest[rest.length - 2];
				registry.set(name, { schema, handler });
			},
		} as unknown as McpServer;
		return { server, registry };
	}

	it("lever_search_candidates RETURNS on a non-advancing cursor and reports complete:false", async () => {
		// Page 1 + page 2 both report next:'x' (cursor never advances). A naive
		// while(true) would spin forever; the guard breaks after the 2nd page.
		// The 3rd mock rejects, so an infinite loop surfaces as that throw.
		const getOpportunities = vi
			.fn()
			.mockResolvedValueOnce({ data: [{ id: "a", name: "Jane" }], hasNext: true, next: "x" })
			.mockResolvedValueOnce({ data: [{ id: "b", name: "Jane" }], hasNext: true, next: "x" })
			.mockRejectedValue(new Error("STUCK_CURSOR_LOOPED"));
		const client: any = { getOpportunities };
		const fake = makeArityFakeServer();
		registerSearchTools(fake.server, client as LeverClient);

		const { handler } = fake.registry.get("lever_search_candidates")!;
		const res = await handler({ query: "Jane", limit: 200, page: 1 });

		expect(getOpportunities).toHaveBeenCalledTimes(2);
		const payload = parsePayload(res);
		// Defensive stop -- the sweep may be partial, so coverage is NOT complete.
		expect(payload.coverage.complete).toBe(false);
		expect(payload.error).toBeUndefined();
	});

	it("lever_search_candidates reports complete:true when the sweep reaches hasNext:false", async () => {
		const getOpportunities = vi
			.fn()
			.mockResolvedValueOnce({ data: [{ id: "a", name: "Jane" }], hasNext: false });
		const client: any = { getOpportunities };
		const fake = makeArityFakeServer();
		registerSearchTools(fake.server, client as LeverClient);

		const { handler } = fake.registry.get("lever_search_candidates")!;
		const res = await handler({ query: "Jane", limit: 200, page: 1 });

		expect(getOpportunities).toHaveBeenCalledTimes(1);
		const payload = parsePayload(res);
		expect(payload.coverage.complete).toBe(true);
	});

	it("lever_advanced_search RETURNS on a non-advancing cursor and reports complete:false", async () => {
		const getOpportunities = vi
			.fn()
			.mockResolvedValueOnce({ data: [{ id: "a", name: "Jane" }], hasNext: true, next: "x" })
			.mockResolvedValueOnce({ data: [{ id: "b", name: "Jane" }], hasNext: true, next: "x" })
			.mockRejectedValue(new Error("STUCK_CURSOR_LOOPED"));
		const client: any = { getOpportunities };
		const fake = makeArityFakeServer();
		registerAdvancedSearchTools(fake.server, client as LeverClient);

		const { handler } = fake.registry.get("lever_advanced_search")!;
		const res = await handler({ limit: 50, page: 1, mode: "comprehensive", archived: false });

		expect(getOpportunities).toHaveBeenCalledTimes(2);
		const payload = parsePayload(res);
		expect(payload.coverage.complete).toBe(false);
		expect(payload.error).toBeUndefined();
	});
});

describe("VAL-505 archive exhaustive fan-out guard + interview window correctness", () => {
	// Both lever_archive (4-arg: name, desc, schema, handler) and
	// lever_get_interview_insights register handlers whose LAST two args are
	// (schema, handler). This local fake captures them regardless of arity.
	function makeArityFakeServer() {
		const registry = new Map<string, { schema: any; handler: Handler }>();
		const server = {
			tool: (name: string, ...rest: any[]) => {
				const handler = rest[rest.length - 1];
				const schema = rest[rest.length - 2];
				registry.set(name, { schema, handler });
			},
		} as unknown as McpServer;
		return { server, registry };
	}

	it("archive search with fetch_all_pages=true SKIPS the per-candidate interview fan-out and notes it", async () => {
		const getOpportunityInterviews = vi.fn(async () => ({ data: [] }));
		const client: any = {
			getArchivedCandidates: vi
				.fn()
				.mockResolvedValueOnce({ data: [{ id: "c1" }], hasNext: true, next: "o2" })
				.mockResolvedValueOnce({ data: [{ id: "c2" }], hasNext: false }),
			getOpportunityInterviews,
		};
		const fake = makeArityFakeServer();
		registerArchiveTools(fake.server, client as LeverClient);

		const { handler } = fake.registry.get("lever_archive")!;
		// Note: include_interviews defaults to true, but fetch_all_pages must force it OFF.
		const res = await handler({ action: "search", fetch_all_pages: true });

		// The fan-out that would fire one interview call per archived candidate
		// over thousands of records must NOT run in exhaustive mode.
		expect(getOpportunityInterviews).not.toHaveBeenCalled();
		const payload = parsePayload(res);
		expect(payload.summary.total_archived_candidates).toBe(2);
		expect(typeof payload.summary.interviews_note).toBe("string");
		expect(payload.summary.interviews_note.length).toBeGreaterThan(0);
	});

	it("archive search single-page (fetch_all_pages=false, include_interviews=true) STILL fetches interviews", async () => {
		const getOpportunityInterviews = vi.fn(async () => ({ data: [{ id: "iv1" }] }));
		const client: any = {
			getArchivedCandidates: vi
				.fn()
				.mockResolvedValueOnce({ data: [{ id: "c1" }], hasNext: false }),
			getOpportunityInterviews,
		};
		const fake = makeArityFakeServer();
		registerArchiveTools(fake.server, client as LeverClient);

		const { handler } = fake.registry.get("lever_archive")!;
		const res = await handler({
			action: "search",
			fetch_all_pages: false,
			include_interviews: true,
		});

		// Single-page path keeps the (bounded) interview fan-out.
		expect(getOpportunityInterviews).toHaveBeenCalledTimes(1);
		const payload = parsePayload(res);
		expect(payload.summary.interviews_note).toBeUndefined();
	});

	it("computeTimeWindow: next_week covers +7d..+14d (distinct from this_week)", async () => {
		const tenDaysOut = Date.now() + 10 * 86400000;
		const client: any = {
			getOpportunities: vi
				.fn()
				.mockResolvedValueOnce({ data: [{ id: "o1" }], hasNext: false }),
			getOpportunityInterviews: vi.fn(async () => ({
				data: [
					{
						id: "iv1",
						subject: "Tech",
						date: tenDaysOut,
						interviewers: [{ id: "u1", name: "Bob", email: "bob@samba.tv" }],
					},
				],
			})),
		};
		const fake = makeArityFakeServer();
		registerInterviewTools(fake.server, client as LeverClient);

		const { handler } = fake.registry.get("lever_get_interview_insights")!;
		const res = await handler({
			interviewer_email: "bob@samba.tv",
			posting_id: "p1",
			time_scope: "next_week",
			view_type: "detailed",
			limit: 25,
		});

		const payload = parsePayload(res);
		// +10d falls inside next_week (+7d..+14d) -> matched.
		expect(payload.metadata.total_count).toBe(1);
	});

	it("computeTimeWindow: this_week EXCLUDES a +10d interview (proves windows are distinct)", async () => {
		const tenDaysOut = Date.now() + 10 * 86400000;
		const client: any = {
			getOpportunities: vi
				.fn()
				.mockResolvedValueOnce({ data: [{ id: "o1" }], hasNext: false }),
			getOpportunityInterviews: vi.fn(async () => ({
				data: [
					{
						id: "iv1",
						subject: "Tech",
						date: tenDaysOut,
						interviewers: [{ id: "u1", name: "Bob", email: "bob@samba.tv" }],
					},
				],
			})),
		};
		const fake = makeArityFakeServer();
		registerInterviewTools(fake.server, client as LeverClient);

		const { handler } = fake.registry.get("lever_get_interview_insights")!;
		const res = await handler({
			interviewer_email: "bob@samba.tv",
			posting_id: "p1",
			time_scope: "this_week",
			view_type: "detailed",
			limit: 25,
		});

		const payload = parsePayload(res);
		// +10d is beyond this_week (0..+7d) -> NOT matched.
		expect(payload.metadata.total_count).toBe(0);
	});
});

describe("lever_update_candidate owner_id fails loud (VAL-C03 W1)", () => {
	// registerCandidateTools registers lever_update_candidate with the 4-arg
	// overload (name, description, schema, handler), so the standard makeFakeServer
	// captures (schema, handler) at positions 2,3.
	let client: any;
	let registry: Map<string, { schema: any; handler: Handler }>;

	beforeEach(() => {
		client = {
			getStages: vi.fn(async () => ({ data: [{ id: "s1", text: "Stage 1" }] })),
			updateOpportunityStage: vi.fn(async () => ({ data: { id: "opp-1" } })),
			addCandidateTags: vi.fn(async () => ({ data: { id: "opp-1" } })),
			removeCandidateTags: vi.fn(async () => ({ data: { id: "opp-1" } })),
			getOpportunity: vi.fn(async () => ({ data: { id: "opp-1", name: "Jane" } })),
		};
		const fake = makeFakeServer();
		registry = fake.registry;
		registerCandidateTools(fake.server, client as LeverClient);
		// resolvePerformAs (OAUTH disabled in test env) needs a default user.
		process.env.LEVER_DEFAULT_USER_ID = "test-default-user";
		__resetSharedResolver();
	});

	afterEach(() => {
		delete process.env.LEVER_DEFAULT_USER_ID;
	});

	it("owner_id returns an error response and does NOT call any stage/tag client method", async () => {
		const { handler } = registry.get("lever_update_candidate")!;
		const res = await handler({ opportunity_id: "opp-1", owner_id: "u-9" });

		const payload = parsePayload(res);
		expect(payload.error).toMatch(/not yet implemented/i);
		// No success leakage and no write fired.
		expect(payload.success).toBeUndefined();
		expect(client.updateOpportunityStage).not.toHaveBeenCalled();
		expect(client.addCandidateTags).not.toHaveBeenCalled();
		expect(client.removeCandidateTags).not.toHaveBeenCalled();
	});
});
