import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { LeverClient } from '../../lever/client.js';
import { registerNoteTools } from '../notes.js';
import { registerFeedbackTools } from '../feedback.js';
import { registerStageTools } from '../stages.js';
import { registerArchiveTools } from '../archive.js';
import { registerRequisitionTools } from '../requisitions.js';
import { registerSearchTools } from '../search.js';

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
	expect(res.content[0]!.type).toBe('text');
	return JSON.parse(res.content[0]!.text);
}

describe('lever_notes action dispatch', () => {
	let client: any;
	let registry: Map<string, { schema: any; handler: Handler }>;

	beforeEach(() => {
		client = {
			getNotes: vi.fn(async () => ({ data: [{ id: 'n1', value: 'hi' }], hasNext: false })),
			getNote: vi.fn(async () => ({ data: { id: 'n1', value: 'hi' } })),
			addNote: vi.fn(async () => ({ data: { id: 'n-new' } })),
		};
		const fake = makeFakeServer();
		registry = fake.registry;
		registerNoteTools(fake.server, client as LeverClient);
	});

	it("action='list' routes to client.getNotes", async () => {
		const { handler } = registry.get('lever_notes')!;
		const res = await handler({ action: 'list', opportunity_id: 'opp-1' });
		expect(client.getNotes).toHaveBeenCalledTimes(1);
		const payload = parsePayload(res);
		expect(payload.count).toBe(1);
		expect(payload.notes[0].id).toBe('n1');
	});

	it("action='get' routes to client.getNote", async () => {
		const { handler } = registry.get('lever_notes')!;
		const res = await handler({ action: 'get', opportunity_id: 'opp-1', note_id: 'n1' });
		expect(client.getNote).toHaveBeenCalledWith('opp-1', 'n1');
		const payload = parsePayload(res);
		expect(payload.id).toBe('n1');
	});

	it("action='add' routes to client.addNote", async () => {
		const { handler } = registry.get('lever_notes')!;
		const res = await handler({ action: 'add', opportunity_id: 'opp-1', note: 'a note' });
		expect(client.addNote).toHaveBeenCalledWith('opp-1', 'a note', undefined);
		const payload = parsePayload(res);
		expect(payload.success).toBe(true);
	});

	it("action='add' with no note returns an error response (handler catches the throw)", async () => {
		const { handler } = registry.get('lever_notes')!;
		const res = await handler({ action: 'add', opportunity_id: 'opp-1' });
		expect(client.addNote).not.toHaveBeenCalled();
		const payload = parsePayload(res);
		expect(payload.error).toMatch(/note is required/i);
	});
});

describe('lever_feedback action dispatch', () => {
	let client: any;
	let registry: Map<string, { schema: any; handler: Handler }>;

	beforeEach(() => {
		client = {
			getFeedbackTemplates: vi.fn(async () => ({ data: [{ id: 'tpl1', text: 'T' }], hasNext: false })),
			getOpportunityFeedback: vi.fn(async () => ({ data: [{ id: 'fb1' }], hasNext: false })),
			getFeedback: vi.fn(async () => ({ data: { id: 'fb1' } })),
			submitFeedback: vi.fn(async () => ({ data: { id: 'fb-new', completedAt: 123 } })),
		};
		const fake = makeFakeServer();
		registry = fake.registry;
		registerFeedbackTools(fake.server, client as LeverClient);
	});

	it("action='list_templates' routes to client.getFeedbackTemplates", async () => {
		const { handler } = registry.get('lever_feedback')!;
		const res = await handler({ action: 'list_templates' });
		expect(client.getFeedbackTemplates).toHaveBeenCalledTimes(1);
		const payload = parsePayload(res);
		expect(payload.count).toBe(1);
		expect(payload.templates[0].id).toBe('tpl1');
	});

	it("action='list' routes to client.getOpportunityFeedback", async () => {
		const { handler } = registry.get('lever_feedback')!;
		const res = await handler({ action: 'list', opportunity_id: 'opp-1' });
		expect(client.getOpportunityFeedback).toHaveBeenCalledTimes(1);
		const payload = parsePayload(res);
		expect(payload.count).toBe(1);
	});

	it("action='get' routes to client.getFeedback", async () => {
		const { handler } = registry.get('lever_feedback')!;
		const res = await handler({ action: 'get', opportunity_id: 'opp-1', feedback_id: 'fb1' });
		expect(client.getFeedback).toHaveBeenCalledWith('opp-1', 'fb1');
		const payload = parsePayload(res);
		expect(payload.id).toBe('fb1');
	});

	it("action='submit' routes to client.submitFeedback", async () => {
		const { handler } = registry.get('lever_feedback')!;
		const res = await handler({
			action: 'submit',
			opportunity_id: 'opp-1',
			base_template_id: 'tpl1',
			field_values: [{ id: 'f1', value: 'yes' }],
		});
		expect(client.submitFeedback).toHaveBeenCalledTimes(1);
		const payload = parsePayload(res);
		expect(payload.success).toBe(true);
		expect(payload.feedback_id).toBe('fb-new');
		expect(payload.status).toBe('submitted');
	});

	it("action='submit' with no field_values returns an error response", async () => {
		const { handler } = registry.get('lever_feedback')!;
		const res = await handler({ action: 'submit', opportunity_id: 'opp-1', base_template_id: 'tpl1' });
		expect(client.submitFeedback).not.toHaveBeenCalled();
		const payload = parsePayload(res);
		expect(payload.error).toMatch(/field_values is required/i);
	});
});

describe('lever_stages action dispatch', () => {
	let client: any;
	let registry: Map<string, { schema: any; handler: Handler }>;

	beforeEach(() => {
		client = {
			getStages: vi.fn(async () => ({ data: [{ id: 's1', text: 'Stage 1' }] })),
			getOpportunity: vi.fn(async () => ({
				data: { id: 'opp-1', stageChanges: [{ toStageId: 's2', updatedAt: 1 }] },
			})),
		};
		const fake = makeFakeServer();
		registry = fake.registry;
		registerStageTools(fake.server, client as LeverClient);
	});

	it("action='list' routes to client.getStages", async () => {
		const { handler } = registry.get('lever_stages')!;
		const res = await handler({ action: 'list' });
		expect(client.getStages).toHaveBeenCalledTimes(1);
		const payload = parsePayload(res);
		expect(payload.data[0].id).toBe('s1');
	});

	it("action='history' routes to client.getOpportunity and shapes stage history", async () => {
		const { handler } = registry.get('lever_stages')!;
		const res = await handler({ action: 'history', opportunity_id: 'opp-1' });
		expect(client.getOpportunity).toHaveBeenCalledWith('opp-1');
		const payload = parsePayload(res);
		expect(payload.count).toBe(1);
		expect(payload.stage_history[0].stageId).toBe('s2');
	});

	it("action='history' with no opportunity_id returns an error response", async () => {
		const { handler } = registry.get('lever_stages')!;
		const res = await handler({ action: 'history' });
		expect(client.getOpportunity).not.toHaveBeenCalled();
		const payload = parsePayload(res);
		expect(payload.error).toMatch(/opportunity_id is required/i);
	});
});

describe('lever_archive action dispatch', () => {
	let client: any;
	let registry: Map<string, { schema: any; handler: Handler }>;

	beforeEach(() => {
		client = {
			getArchiveReasons: vi.fn(async () => ({ data: [{ id: 'reason-1', text: 'Hired' }] })),
			getOpportunity: vi.fn(async () => ({ data: { id: 'opp-1', name: 'Jane' } })),
			archiveOpportunity: vi.fn(async () => ({ data: { id: 'opp-1' } })),
			getArchivedCandidates: vi.fn(async () => ({ data: [], hasNext: false })),
			getOpportunityInterviews: vi.fn(async () => ({ data: [] })),
		};
		const fake = makeFakeServer();
		registry = fake.registry;
		registerArchiveTools(fake.server, client as LeverClient);
	});

	it("action='list_reasons' routes to client.getArchiveReasons", async () => {
		const { handler } = registry.get('lever_archive')!;
		const res = await handler({ action: 'list_reasons' });
		expect(client.getArchiveReasons).toHaveBeenCalledTimes(1);
		const payload = parsePayload(res);
		expect(payload.data[0].id).toBe('reason-1');
	});

	it("action='archive' routes to client.archiveOpportunity after validating reason", async () => {
		const { handler } = registry.get('lever_archive')!;
		const res = await handler({
			action: 'archive',
			opportunity_id: 'opp-1',
			archive_reason_id: 'reason-1',
		});
		expect(client.archiveOpportunity).toHaveBeenCalledTimes(1);
		const payload = parsePayload(res);
		expect(payload.success).toBe(true);
		expect(payload.candidate).toBe('Jane');
	});

	it("action='search' routes to client.getArchivedCandidates", async () => {
		const { handler } = registry.get('lever_archive')!;
		const res = await handler({ action: 'search' });
		expect(client.getArchivedCandidates).toHaveBeenCalledTimes(1);
		const payload = parsePayload(res);
		expect(payload.summary.total_archived_candidates).toBe(0);
	});

	it("action='archive' with no archive_reason_id returns an error response", async () => {
		const { handler } = registry.get('lever_archive')!;
		const res = await handler({ action: 'archive', opportunity_id: 'opp-1' });
		expect(client.archiveOpportunity).not.toHaveBeenCalled();
		const payload = parsePayload(res);
		expect(payload.error).toMatch(/archive_reason_id is required/i);
	});
});

describe('lever_requisitions action dispatch', () => {
	let client: any;
	let registry: Map<string, { schema: any; handler: Handler }>;

	beforeEach(() => {
		client = {
			getRequisitions: vi.fn(async () => ({ data: [{ id: 'r1', requisitionCode: 'ENG-1' }] })),
			getRequisition: vi.fn(async () => ({ data: { id: 'r1', requisitionCode: 'ENG-1' } })),
			getRequisitionByCode: vi.fn(async () => ({ data: { id: 'r1', requisitionCode: 'ENG-1' } })),
		};
		const fake = makeFakeServer();
		registry = fake.registry;
		registerRequisitionTools(fake.server, client as LeverClient);
	});

	it("action='list' routes to client.getRequisitions", async () => {
		const { handler } = registry.get('lever_requisitions')!;
		const res = await handler({ action: 'list' });
		expect(client.getRequisitions).toHaveBeenCalledTimes(1);
		const payload = parsePayload(res);
		expect(payload.count).toBe(1);
		expect(payload.requisitions[0].lever_id).toBe('r1');
	});

	it("action='get' with a code routes to client.getRequisitionByCode", async () => {
		const { handler } = registry.get('lever_requisitions')!;
		const res = await handler({ action: 'get', requisition_identifier: 'ENG-1' });
		expect(client.getRequisitionByCode).toHaveBeenCalledWith('ENG-1');
		const payload = parsePayload(res);
		expect(payload.lookup_method).toBe('code_lookup');
		expect(payload.requisition_details.lever_id).toBe('r1');
	});

	it("action='get' with no requisition_identifier returns an error response", async () => {
		const { handler } = registry.get('lever_requisitions')!;
		const res = await handler({ action: 'get' });
		expect(client.getRequisition).not.toHaveBeenCalled();
		expect(client.getRequisitionByCode).not.toHaveBeenCalled();
		const payload = parsePayload(res);
		expect(payload.error).toMatch(/requisition_identifier is required/i);
	});
});


describe('lever_search_candidates name-sweep coverage (VAL-102)', () => {
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

	it('paginates to hasNext:false across all pages and reports complete coverage', async () => {
		const client: any = {
			getOpportunities: vi
				.fn()
				.mockResolvedValueOnce({
					data: [{ id: 'a', name: 'Jane Smith' }],
					hasNext: true,
					next: 'off2',
				})
				.mockResolvedValueOnce({
					data: [{ id: 'b', name: 'Jane Doe' }],
					hasNext: false,
				}),
		};
		const fake = makeSearchFakeServer();
		registerSearchTools(fake.server, client as LeverClient);

		const { handler } = fake.registry.get('lever_search_candidates')!;
		const res = await handler({ query: 'Jane', limit: 200, page: 1 });

		// Full sweep across both pages proves the maxPages/maxFetch caps are gone.
		expect(client.getOpportunities).toHaveBeenCalledTimes(2);
		const payload = parsePayload(res);
		expect(payload.total_matches).toBe(2);
		expect(payload.coverage.complete).toBe(true);
		expect(payload.coverage.pages_scanned).toBe(2);
	});
});
