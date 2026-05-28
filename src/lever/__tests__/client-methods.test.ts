import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LeverClient } from '../client.js';

// Build a minimal fetch-Response-like object the client understands.
function makeResponse(opts: {
	ok: boolean;
	status: number;
	json?: any;
	text?: string;
	headers?: Record<string, string>;
}) {
	const headers = opts.headers ?? {};
	return {
		ok: opts.ok,
		status: opts.status,
		headers: { get: (k: string) => headers[k] ?? null },
		json: async () => opts.json ?? {},
		text: async () => opts.text ?? '',
	};
}

// Pull the URL string + init the client passed to fetch on call N.
function calledUrl(spy: ReturnType<typeof vi.fn>, n = 0): string {
	return String(spy.mock.calls[n]![0]);
}
function calledInit(spy: ReturnType<typeof vi.fn>, n = 0): any {
	return spy.mock.calls[n]![1] as any;
}

describe('LeverClient read methods', () => {
	let fetchSpy: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		fetchSpy = vi.fn();
		vi.stubGlobal('fetch', fetchSpy);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it('getNotes: GETs /opportunities/:id/notes, parses data, clamps limit to 100', async () => {
		const client = new LeverClient('test-key');
		fetchSpy.mockResolvedValueOnce(
			makeResponse({ ok: true, status: 200, json: { data: [{ id: 'n1' }] } }),
		);

		const res = await client.getNotes('opp-1', { limit: 500 });

		expect(res).toEqual({ data: [{ id: 'n1' }] });
		const url = new URL(calledUrl(fetchSpy));
		expect(url.origin + url.pathname).toBe(
			'https://api.lever.co/v1/opportunities/opp-1/notes',
		);
		expect(calledInit(fetchSpy).method).toBe('GET');
		// limit clamped to 100 via Math.min
		expect(url.searchParams.get('limit')).toBe('100');
	});

	it('getOpportunityFeedback: GETs /opportunities/:id/feedback, clamps limit', async () => {
		const client = new LeverClient('test-key');
		fetchSpy.mockResolvedValueOnce(
			makeResponse({ ok: true, status: 200, json: { data: [{ id: 'fb1' }] } }),
		);

		const res = await client.getOpportunityFeedback('opp-2', { limit: 250 });

		expect(res).toEqual({ data: [{ id: 'fb1' }] });
		const url = new URL(calledUrl(fetchSpy));
		expect(url.origin + url.pathname).toBe(
			'https://api.lever.co/v1/opportunities/opp-2/feedback',
		);
		expect(calledInit(fetchSpy).method).toBe('GET');
		expect(url.searchParams.get('limit')).toBe('100');
	});

	it('getFeedbackTemplates: GETs /feedback_templates, clamps limit', async () => {
		const client = new LeverClient('test-key');
		fetchSpy.mockResolvedValueOnce(
			makeResponse({ ok: true, status: 200, json: { data: [{ id: 'tpl1' }] } }),
		);

		const res = await client.getFeedbackTemplates({ limit: 999 });

		expect(res).toEqual({ data: [{ id: 'tpl1' }] });
		const url = new URL(calledUrl(fetchSpy));
		expect(url.origin + url.pathname).toBe(
			'https://api.lever.co/v1/feedback_templates',
		);
		expect(calledInit(fetchSpy).method).toBe('GET');
		expect(url.searchParams.get('limit')).toBe('100');
	});

	it('getEmails: GETs /opportunities/:id/emails, clamps limit', async () => {
		const client = new LeverClient('test-key');
		fetchSpy.mockResolvedValueOnce(
			makeResponse({ ok: true, status: 200, json: { data: [{ id: 'e1' }] } }),
		);

		const res = await client.getEmails('opp-3', { limit: 101 });

		expect(res).toEqual({ data: [{ id: 'e1' }] });
		const url = new URL(calledUrl(fetchSpy));
		expect(url.origin + url.pathname).toBe(
			'https://api.lever.co/v1/opportunities/opp-3/emails',
		);
		expect(calledInit(fetchSpy).method).toBe('GET');
		expect(url.searchParams.get('limit')).toBe('100');
	});

	it('getUsers: GETs /users, clamps limit to 100', async () => {
		const client = new LeverClient('test-key');
		fetchSpy.mockResolvedValueOnce(
			makeResponse({ ok: true, status: 200, json: { data: [{ id: 'u1' }] } }),
		);

		const res = await client.getUsers({ limit: 5000 });

		expect(res).toEqual({ data: [{ id: 'u1' }] });
		const url = new URL(calledUrl(fetchSpy));
		expect(url.origin + url.pathname).toBe('https://api.lever.co/v1/users');
		expect(calledInit(fetchSpy).method).toBe('GET');
		expect(url.searchParams.get('limit')).toBe('100');
	});

	it('getStages: GETs /stages and parses data', async () => {
		const client = new LeverClient('test-key');
		fetchSpy.mockResolvedValueOnce(
			makeResponse({ ok: true, status: 200, json: { data: [{ id: 's1' }] } }),
		);

		const res = await client.getStages();

		expect(res).toEqual({ data: [{ id: 's1' }] });
		const url = new URL(calledUrl(fetchSpy));
		expect(url.origin + url.pathname).toBe('https://api.lever.co/v1/stages');
		expect(calledInit(fetchSpy).method).toBe('GET');
	});

	it('getRequisitions: GETs /requisitions and parses data', async () => {
		const client = new LeverClient('test-key');
		fetchSpy.mockResolvedValueOnce(
			makeResponse({ ok: true, status: 200, json: { data: [{ id: 'r1' }] } }),
		);

		const res = await client.getRequisitions({ status: 'open' });

		expect(res).toEqual({ data: [{ id: 'r1' }] });
		const url = new URL(calledUrl(fetchSpy));
		expect(url.origin + url.pathname).toBe('https://api.lever.co/v1/requisitions');
		expect(calledInit(fetchSpy).method).toBe('GET');
		expect(url.searchParams.get('status')).toBe('open');
	});
});

describe('LeverClient write methods', () => {
	let fetchSpy: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		fetchSpy = vi.fn();
		vi.stubGlobal('fetch', fetchSpy);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	// Parse the JSON body the client sent on call N.
	function sentBody(n = 0): any {
		const init = calledInit(fetchSpy, n);
		return init.body ? JSON.parse(init.body) : undefined;
	}

	it('submitFeedback: POSTs feedback with fieldValues (NOT fields) and completedAt set by default', async () => {
		const client = new LeverClient('test-key');
		fetchSpy.mockResolvedValueOnce(
			makeResponse({ ok: true, status: 200, json: { data: { id: 'fb-new', completedAt: 123 } } }),
		);

		const before = Date.now();
		await client.submitFeedback('opp-9', 'tpl-1', [{ id: 'f1', value: 'yes' }]);
		const after = Date.now();

		const url = new URL(calledUrl(fetchSpy));
		expect(url.origin + url.pathname).toBe(
			'https://api.lever.co/v1/opportunities/opp-9/feedback',
		);
		expect(calledInit(fetchSpy).method).toBe('POST');

		const body = sentBody();
		expect(body.baseTemplateId).toBe('tpl-1');
		// Write-shape uses fieldValues, NOT fields (M1.8 asymmetry quirk).
		expect(body.fieldValues).toEqual([{ id: 'f1', value: 'yes' }]);
		expect(body.fields).toBeUndefined();
		// completedAt is set (submitted-as-complete is the default).
		expect(typeof body.completedAt).toBe('number');
		expect(body.completedAt).toBeGreaterThanOrEqual(before);
		expect(body.completedAt).toBeLessThanOrEqual(after);
	});

	it('submitFeedback: omits completedAt when markComplete===false (draft mode quirk)', async () => {
		const client = new LeverClient('test-key');
		fetchSpy.mockResolvedValueOnce(
			makeResponse({ ok: true, status: 200, json: { data: { id: 'fb-draft' } } }),
		);

		await client.submitFeedback('opp-9', 'tpl-1', [{ id: 'f1', value: 'no' }], {
			markComplete: false,
		});

		const body = sentBody();
		expect(body.fieldValues).toEqual([{ id: 'f1', value: 'no' }]);
		expect(body.completedAt).toBeUndefined();
	});

	it('archiveOpportunity: PUTs to /archived with reason + perform_as when provided', async () => {
		const client = new LeverClient('test-key');
		fetchSpy.mockResolvedValueOnce(
			makeResponse({ ok: true, status: 200, json: { data: { id: 'opp-9' } } }),
		);

		await client.archiveOpportunity('opp-9', 'reason-1', 'user-42');

		const url = new URL(calledUrl(fetchSpy));
		expect(url.origin + url.pathname).toBe(
			'https://api.lever.co/v1/opportunities/opp-9/archived',
		);
		expect(calledInit(fetchSpy).method).toBe('PUT');
		const body = sentBody();
		expect(body.reason).toBe('reason-1');
		expect(body.perform_as).toBe('user-42');
	});

	it('updateOpportunityStage: PUTs to /stage with stage + perform_as when provided', async () => {
		const client = new LeverClient('test-key');
		fetchSpy.mockResolvedValueOnce(
			makeResponse({ ok: true, status: 200, json: { data: { id: 'opp-9' } } }),
		);

		await client.updateOpportunityStage('opp-9', 'stage-7', 'user-42');

		const url = new URL(calledUrl(fetchSpy));
		expect(url.origin + url.pathname).toBe(
			'https://api.lever.co/v1/opportunities/opp-9/stage',
		);
		expect(calledInit(fetchSpy).method).toBe('PUT');
		const body = sentBody();
		expect(body.stage).toBe('stage-7');
		expect(body.perform_as).toBe('user-42');
	});
});

describe('LeverClient error path', () => {
	let fetchSpy: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		fetchSpy = vi.fn();
		vi.stubGlobal('fetch', fetchSpy);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	// 404 (4xx, no retry) throws an Error whose message carries status + endpoint
	// but NOT the response body (no PII leak per the recent logging change).
	it('a 404 throws with status + endpoint and no response body', async () => {
		const client = new LeverClient('test-key');
		fetchSpy.mockResolvedValueOnce(
			makeResponse({
				ok: false,
				status: 404,
				text: 'SECRET_PII_LEAK_BODY',
			}),
		);

		await expect(client.getStages()).rejects.toThrow(/404/);

		// Re-run to capture the message string for the PII assertion.
		fetchSpy.mockResolvedValueOnce(
			makeResponse({ ok: false, status: 404, text: 'SECRET_PII_LEAK_BODY' }),
		);
		let message = '';
		try {
			await client.getStages();
		} catch (e) {
			message = (e as Error).message;
		}
		expect(message).toContain('404');
		expect(message).toContain('/stages');
		expect(message).not.toContain('SECRET_PII_LEAK_BODY');
	});
});
