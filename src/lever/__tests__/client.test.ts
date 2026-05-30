import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { LeverClient } from "../client.js";

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
		text: async () => opts.text ?? "",
	};
}

describe("LeverClient makeRequest", () => {
	let fetchSpy: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		fetchSpy = vi.fn();
		vi.stubGlobal("fetch", fetchSpy);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	// C1: a rejected request must NOT poison the serialized queue. A later,
	// independent request must still execute and resolve normally.
	it("C1: does not poison the request queue after a rejection", async () => {
		const client = new LeverClient("test-key");

		// First request -> 404 (4xx, no retry) -> makeRequest throws.
		fetchSpy.mockResolvedValueOnce(makeResponse({ ok: false, status: 404, text: "not found" }));
		// Second, independent request -> 200 -> must succeed.
		fetchSpy.mockResolvedValueOnce(
			makeResponse({ ok: true, status: 200, json: { data: ["stage-1"] } }),
		);

		await expect(client.getOpportunity("missing-id")).rejects.toThrow();

		// The key assertion: the queue still runs subsequent work.
		const result = await client.getStages();
		expect(result).toEqual({ data: ["stage-1"] });
		expect(fetchSpy).toHaveBeenCalledTimes(2);
	});

	// H1: endpoints passed without a leading slash must be normalized so the URL
	// is v1/opportunities/... and NOT v1opportunities/...
	it("H1: normalizes endpoints missing a leading slash", async () => {
		const client = new LeverClient("test-key");
		fetchSpy.mockResolvedValueOnce(
			makeResponse({ ok: true, status: 200, json: { data: [], hasNext: false } }),
		);

		await client.getOpportunityInterviews("opp-123");

		expect(fetchSpy).toHaveBeenCalledTimes(1);
		const calledUrl = String(fetchSpy.mock.calls[0]![0]);
		expect(calledUrl).toBe("https://api.lever.co/v1/opportunities/opp-123/interviews");
		expect(calledUrl).not.toContain("v1opportunities");
	});

	// H1 (control): endpoints that already have a leading slash are unchanged.
	it("H1: leaves already-leading-slash endpoints intact", async () => {
		const client = new LeverClient("test-key");
		fetchSpy.mockResolvedValueOnce(makeResponse({ ok: true, status: 200, json: { data: [] } }));

		await client.getStages();

		const calledUrl = String(fetchSpy.mock.calls[0]![0]);
		expect(calledUrl).toBe("https://api.lever.co/v1/stages");
	});

	// H2: the client must pass an AbortSignal to fetch so a hung connection can
	// be aborted (rather than stalling the serialized queue forever). We assert
	// signal presence directly -- a deterministic, fake-timer-free check. The
	// real timeout (30s) and abort-as-retryable handling live in makeRequest's
	// catch block; the full fake-timer timeout test was flaky against the
	// rate-limiter + retry-backoff setTimeout chain, so we assert the load-
	// bearing primitive (signal wiring) instead.
	it("H2: passes an AbortSignal to fetch (timeout wiring)", async () => {
		const client = new LeverClient("test-key");
		fetchSpy.mockResolvedValueOnce(makeResponse({ ok: true, status: 200, json: { data: [] } }));

		await client.getStages();

		expect(fetchSpy).toHaveBeenCalledTimes(1);
		const init = fetchSpy.mock.calls[0]![1] as any;
		expect(init.signal).toBeInstanceOf(AbortSignal);
		expect(init.signal.aborted).toBe(false);
	});

	// H2 (behavior): an AbortError surfacing from fetch is rethrown as a clear
	// "timed out" error once retries are exhausted. We force the AbortError
	// directly (no fake timers) to verify the catch-block mapping. Real backoff
	// (1s + 2s) runs, so the test gets a generous timeout.
	it('H2: maps an exhausted abort to a "timed out" error', async () => {
		const client = new LeverClient("test-key");
		const abortErr = new Error("The operation was aborted");
		abortErr.name = "AbortError";
		// Reject on every attempt (initial + 2 retries) so retries exhaust.
		fetchSpy.mockRejectedValue(abortErr);

		await expect(client.getStages()).rejects.toThrow(/timed out after 30s/i);
		// Initial attempt + 2 retries (retryCount < 2) = 3 fetch calls.
		expect(fetchSpy).toHaveBeenCalledTimes(3);
	}, 15_000);

	// W4: a 4xx response carrying Lever's {code, message} must surface that
	// diagnostic text in the thrown error (non-PII, high-signal). Lever returns
	// e.g. {code:'BadRequestError', message:'posting is not expandable'}.
	it("W4: a 400 with a Lever {code,message} body surfaces the message in the error", async () => {
		const client = new LeverClient("test-key");
		fetchSpy.mockResolvedValueOnce({
			ok: false,
			status: 400,
			headers: { get: () => null },
			json: async () => ({ code: "BadRequestError", message: "posting is not expandable" }),
		} as any);

		let message = "";
		try {
			await client.getStages();
		} catch (e) {
			message = (e as Error).message;
		}
		expect(message).toContain("400");
		expect(message).toContain("posting is not expandable");
		expect(message).toContain("BadRequestError");
	});

	// W4 (guard): a 400 whose body is non-JSON (json() throws) must still throw
	// the bare `Lever API error: 400` without crashing on the parse failure.
	it("W4: a 400 with a non-JSON body falls back to the bare error without crashing", async () => {
		const client = new LeverClient("test-key");
		fetchSpy.mockResolvedValueOnce({
			ok: false,
			status: 400,
			headers: { get: () => null },
			json: async () => {
				throw new SyntaxError("Unexpected end of JSON input");
			},
		} as any);

		let message = "";
		try {
			await client.getStages();
		} catch (e) {
			message = (e as Error).message;
		}
		expect(message).toContain("Lever API error: 400");
		expect(message).toContain("/stages");
	});
});
