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

// Pull the URL string + init the client passed to fetch on call N.
function calledUrl(spy: ReturnType<typeof vi.fn>, n = 0): string {
	return String(spy.mock.calls[n]![0]);
}
function calledInit(spy: ReturnType<typeof vi.fn>, n = 0): any {
	return spy.mock.calls[n]![1] as any;
}

describe("LeverClient read methods", () => {
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

	it("getNotes: GETs /opportunities/:id/notes, parses data, clamps limit to 100", async () => {
		const client = new LeverClient("test-key");
		fetchSpy.mockResolvedValueOnce(
			makeResponse({ ok: true, status: 200, json: { data: [{ id: "n1" }] } }),
		);

		const res = await client.getNotes("opp-1", { limit: 500 });

		expect(res).toEqual({ data: [{ id: "n1" }] });
		const url = new URL(calledUrl(fetchSpy));
		expect(url.origin + url.pathname).toBe("https://api.lever.co/v1/opportunities/opp-1/notes");
		expect(calledInit(fetchSpy).method).toBe("GET");
		// limit clamped to 100 via Math.min
		expect(url.searchParams.get("limit")).toBe("100");
	});

	it("getOpportunityFeedback: GETs /opportunities/:id/feedback, clamps limit", async () => {
		const client = new LeverClient("test-key");
		fetchSpy.mockResolvedValueOnce(
			makeResponse({ ok: true, status: 200, json: { data: [{ id: "fb1" }] } }),
		);

		const res = await client.getOpportunityFeedback("opp-2", { limit: 250 });

		expect(res).toEqual({ data: [{ id: "fb1" }] });
		const url = new URL(calledUrl(fetchSpy));
		expect(url.origin + url.pathname).toBe(
			"https://api.lever.co/v1/opportunities/opp-2/feedback",
		);
		expect(calledInit(fetchSpy).method).toBe("GET");
		expect(url.searchParams.get("limit")).toBe("100");
	});

	it("getFeedbackTemplates: GETs /feedback_templates, clamps limit", async () => {
		const client = new LeverClient("test-key");
		fetchSpy.mockResolvedValueOnce(
			makeResponse({ ok: true, status: 200, json: { data: [{ id: "tpl1" }] } }),
		);

		const res = await client.getFeedbackTemplates({ limit: 999 });

		expect(res).toEqual({ data: [{ id: "tpl1" }] });
		const url = new URL(calledUrl(fetchSpy));
		expect(url.origin + url.pathname).toBe("https://api.lever.co/v1/feedback_templates");
		expect(calledInit(fetchSpy).method).toBe("GET");
		expect(url.searchParams.get("limit")).toBe("100");
	});

	it("getEmails: GETs /opportunities/:id/emails, clamps limit", async () => {
		const client = new LeverClient("test-key");
		fetchSpy.mockResolvedValueOnce(
			makeResponse({ ok: true, status: 200, json: { data: [{ id: "e1" }] } }),
		);

		const res = await client.getEmails("opp-3", { limit: 101 });

		expect(res).toEqual({ data: [{ id: "e1" }] });
		const url = new URL(calledUrl(fetchSpy));
		expect(url.origin + url.pathname).toBe(
			"https://api.lever.co/v1/opportunities/opp-3/emails",
		);
		expect(calledInit(fetchSpy).method).toBe("GET");
		expect(url.searchParams.get("limit")).toBe("100");
	});

	it("getUsers: GETs /users, clamps limit to 100", async () => {
		const client = new LeverClient("test-key");
		fetchSpy.mockResolvedValueOnce(
			makeResponse({ ok: true, status: 200, json: { data: [{ id: "u1" }] } }),
		);

		const res = await client.getUsers({ limit: 5000 });

		expect(res).toEqual({ data: [{ id: "u1" }] });
		const url = new URL(calledUrl(fetchSpy));
		expect(url.origin + url.pathname).toBe("https://api.lever.co/v1/users");
		expect(calledInit(fetchSpy).method).toBe("GET");
		expect(url.searchParams.get("limit")).toBe("100");
	});

	it("getStages: GETs /stages and parses data", async () => {
		const client = new LeverClient("test-key");
		fetchSpy.mockResolvedValueOnce(
			makeResponse({ ok: true, status: 200, json: { data: [{ id: "s1" }] } }),
		);

		const res = await client.getStages();

		expect(res).toEqual({ data: [{ id: "s1" }] });
		const url = new URL(calledUrl(fetchSpy));
		expect(url.origin + url.pathname).toBe("https://api.lever.co/v1/stages");
		expect(calledInit(fetchSpy).method).toBe("GET");
	});

	it("getRequisitions: GETs /requisitions and parses data", async () => {
		const client = new LeverClient("test-key");
		fetchSpy.mockResolvedValueOnce(
			makeResponse({ ok: true, status: 200, json: { data: [{ id: "r1" }] } }),
		);

		const res = await client.getRequisitions({ status: "open" });

		expect(res).toEqual({ data: [{ id: "r1" }] });
		const url = new URL(calledUrl(fetchSpy));
		expect(url.origin + url.pathname).toBe("https://api.lever.co/v1/requisitions");
		expect(calledInit(fetchSpy).method).toBe("GET");
		expect(url.searchParams.get("status")).toBe("open");
	});
});

describe("LeverClient write methods", () => {
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

	// Parse the JSON body the client sent on call N.
	function sentBody(n = 0): any {
		const init = calledInit(fetchSpy, n);
		return init.body ? JSON.parse(init.body) : undefined;
	}

	it("submitFeedback: POSTs feedback with fieldValues (NOT fields) and completedAt set by default", async () => {
		const client = new LeverClient("test-key");
		fetchSpy.mockResolvedValueOnce(
			makeResponse({
				ok: true,
				status: 200,
				json: { data: { id: "fb-new", completedAt: 123 } },
			}),
		);

		const before = Date.now();
		await client.submitFeedback("opp-9", "tpl-1", [{ id: "f1", value: "yes" }]);
		const after = Date.now();

		const url = new URL(calledUrl(fetchSpy));
		expect(url.origin + url.pathname).toBe(
			"https://api.lever.co/v1/opportunities/opp-9/feedback",
		);
		expect(calledInit(fetchSpy).method).toBe("POST");

		const body = sentBody();
		expect(body.baseTemplateId).toBe("tpl-1");
		// Write-shape uses fieldValues, NOT fields (M1.8 asymmetry quirk).
		expect(body.fieldValues).toEqual([{ id: "f1", value: "yes" }]);
		expect(body.fields).toBeUndefined();
		// completedAt is set (submitted-as-complete is the default).
		expect(typeof body.completedAt).toBe("number");
		expect(body.completedAt).toBeGreaterThanOrEqual(before);
		expect(body.completedAt).toBeLessThanOrEqual(after);
	});

	it("submitFeedback: omits completedAt when markComplete===false (draft mode quirk)", async () => {
		const client = new LeverClient("test-key");
		fetchSpy.mockResolvedValueOnce(
			makeResponse({ ok: true, status: 200, json: { data: { id: "fb-draft" } } }),
		);

		await client.submitFeedback("opp-9", "tpl-1", [{ id: "f1", value: "no" }], {
			markComplete: false,
		});

		const body = sentBody();
		expect(body.fieldValues).toEqual([{ id: "f1", value: "no" }]);
		expect(body.completedAt).toBeUndefined();
	});

	it("archiveOpportunity: PUTs to /archived with reason + perform_as when provided", async () => {
		const client = new LeverClient("test-key");
		fetchSpy.mockResolvedValueOnce(
			makeResponse({ ok: true, status: 200, json: { data: { id: "opp-9" } } }),
		);

		await client.archiveOpportunity("opp-9", "reason-1", "user-42");

		const url = new URL(calledUrl(fetchSpy));
		expect(url.origin + url.pathname).toBe(
			"https://api.lever.co/v1/opportunities/opp-9/archived",
		);
		expect(calledInit(fetchSpy).method).toBe("PUT");
		const body = sentBody();
		expect(body.reason).toBe("reason-1");
		expect(body.perform_as).toBe("user-42");
	});

	it("updateOpportunityStage: PUTs to /stage with stage + perform_as when provided", async () => {
		const client = new LeverClient("test-key");
		fetchSpy.mockResolvedValueOnce(
			makeResponse({ ok: true, status: 200, json: { data: { id: "opp-9" } } }),
		);

		await client.updateOpportunityStage("opp-9", "stage-7", "user-42");

		const url = new URL(calledUrl(fetchSpy));
		expect(url.origin + url.pathname).toBe("https://api.lever.co/v1/opportunities/opp-9/stage");
		expect(calledInit(fetchSpy).method).toBe("PUT");
		const body = sentBody();
		expect(body.stage).toBe("stage-7");
		expect(body.perform_as).toBe("user-42");
	});
});

describe("LeverClient error path", () => {
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

	// 404 (4xx, no retry) throws an Error whose message carries status + endpoint
	// but NOT the response body (no PII leak per the recent logging change).
	it("a 404 throws with status + endpoint and no response body", async () => {
		const client = new LeverClient("test-key");
		fetchSpy.mockResolvedValueOnce(
			makeResponse({
				ok: false,
				status: 404,
				text: "SECRET_PII_LEAK_BODY",
			}),
		);

		await expect(client.getStages()).rejects.toThrow(/404/);

		// Re-run to capture the message string for the PII assertion.
		fetchSpy.mockResolvedValueOnce(
			makeResponse({ ok: false, status: 404, text: "SECRET_PII_LEAK_BODY" }),
		);
		let message = "";
		try {
			await client.getStages();
		} catch (e) {
			message = (e as Error).message;
		}
		expect(message).toContain("404");
		expect(message).toContain("/stages");
		expect(message).not.toContain("SECRET_PII_LEAK_BODY");
	});
});

describe("LeverClient getPostingsByOwner pagination (VAL-103)", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("paginates ALL pages (no maxBatches cap) until hasNext is false", async () => {
		const client = new LeverClient("test-key");

		// Spy on the instance method getPostings to drive pagination without network.
		const getPostingsSpy = vi
			.spyOn(client, "getPostings")
			.mockResolvedValueOnce({
				data: [{ id: "p1", owner: { name: "Sid Dani" } }],
				hasNext: true,
				next: "o2",
			} as any)
			.mockResolvedValueOnce({
				data: [{ id: "p2", owner: { name: "Sid Dani" } }],
				hasNext: false,
			} as any);

		const res = await client.getPostingsByOwner("Sid");

		// Two pages fetched proves the 5-batch (500-posting) cap is gone.
		expect(getPostingsSpy).toHaveBeenCalledTimes(2);
		expect(res.data.length).toBe(2);
		expect(res.data[0]!.id).toBe("p1");
		expect(res.data[1]!.id).toBe("p2");
	});
});

describe("LeverClient getArchivedCandidates expand (VAL-510)", () => {
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

	// VAL-510: archive search must NOT send expand=posting. "posting" is not an
	// expandable field on GET /opportunities -- Lever 400s ("posting is not
	// expandable"). Only expand=owner is valid. The posting_id FILTER itself is
	// fine (200 OK); only the invalid expand value caused the 400.
	it("VAL-510: sends expand=owner only, never expand=posting, with a posting_id filter", async () => {
		const client = new LeverClient("test-key");
		fetchSpy.mockResolvedValueOnce(
			makeResponse({ ok: true, status: 200, json: { data: [{ id: "opp-arch-1" }] } }),
		);

		const res = await client.getArchivedCandidates({ posting_id: "p1" });

		expect(res).toEqual({ data: [{ id: "opp-arch-1" }] });
		const url = new URL(calledUrl(fetchSpy));
		expect(url.origin + url.pathname).toBe("https://api.lever.co/v1/opportunities");
		expect(calledInit(fetchSpy).method).toBe("GET");

		// expand params must be exactly ["owner"] -- owner present, posting absent.
		const expandValues = url.searchParams.getAll("expand");
		expect(expandValues).toEqual(["owner"]);
		expect(expandValues).not.toContain("posting");

		// Raw query string guard mirroring the live 400 symptom.
		expect(url.search).toContain("expand=owner");
		expect(url.search).not.toContain("expand=posting");

		// The valid posting_id FILTER is still sent (only the expand was wrong).
		expect(url.searchParams.get("posting_id")).toBe("p1");
	});
});

describe("LeverClient getOpportunities expand allowlist (W5)", () => {
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

	// W5: getOpportunities must STRIP expand values not on the /opportunities
	// allowlist (e.g. "posting" 400s with "posting is not expandable"). A valid
	// value like "owner" passes through; the invalid "posting" is dropped.
	it("W5: strips invalid expand values, keeps valid ones", async () => {
		const client = new LeverClient("test-key");
		fetchSpy.mockResolvedValueOnce(makeResponse({ ok: true, status: 200, json: { data: [] } }));

		await client.getOpportunities({ expand: ["owner", "posting"] });

		const url = new URL(calledUrl(fetchSpy));
		const expandValues = url.searchParams.getAll("expand");
		expect(expandValues).toContain("owner");
		expect(expandValues).not.toContain("posting");
		expect(url.search).toContain("expand=owner");
		expect(url.search).not.toContain("expand=posting");
	});

	// W5 (default): the default ["owner"] still passes through unfiltered.
	it("W5: default expand owner passes the allowlist", async () => {
		const client = new LeverClient("test-key");
		fetchSpy.mockResolvedValueOnce(makeResponse({ ok: true, status: 200, json: { data: [] } }));

		await client.getOpportunities({});

		const url = new URL(calledUrl(fetchSpy));
		expect(url.searchParams.getAll("expand")).toEqual(["owner"]);
	});
});

describe("LeverClient tag writes perform_as in body (W3)", () => {
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

	function sentBody(n = 0): any {
		const init = calledInit(fetchSpy, n);
		return init.body ? JSON.parse(init.body) : undefined;
	}

	// W3: perform_as must travel in the BODY (consistent with archive/stage
	// writes), NOT the query string.
	it("W3: addCandidateTags puts perform_as in the body, not the query string", async () => {
		const client = new LeverClient("test-key");
		fetchSpy.mockResolvedValueOnce(
			makeResponse({ ok: true, status: 200, json: { data: { id: "opp-1" } } }),
		);

		await client.addCandidateTags("opp-1", ["x"], "user-9");

		const url = new URL(calledUrl(fetchSpy));
		expect(url.origin + url.pathname).toBe(
			"https://api.lever.co/v1/opportunities/opp-1/addTags",
		);
		expect(calledInit(fetchSpy).method).toBe("POST");
		// perform_as is NOT a query param anymore.
		expect(url.searchParams.get("perform_as")).toBeNull();
		// perform_as IS in the body alongside tags.
		const body = sentBody();
		expect(body.tags).toEqual(["x"]);
		expect(body.perform_as).toBe("user-9");
	});

	it("W3: removeCandidateTags puts perform_as in the body, not the query string", async () => {
		const client = new LeverClient("test-key");
		fetchSpy.mockResolvedValueOnce(
			makeResponse({ ok: true, status: 200, json: { data: { id: "opp-1" } } }),
		);

		await client.removeCandidateTags("opp-1", ["y"], "user-9");

		const url = new URL(calledUrl(fetchSpy));
		expect(url.origin + url.pathname).toBe(
			"https://api.lever.co/v1/opportunities/opp-1/removeTags",
		);
		expect(url.searchParams.get("perform_as")).toBeNull();
		const body = sentBody();
		expect(body.tags).toEqual(["y"]);
		expect(body.perform_as).toBe("user-9");
	});

	// W3 (no performAs): when performAs is omitted, the body carries only tags.
	it("W3: addCandidateTags without performAs sends only tags in the body", async () => {
		const client = new LeverClient("test-key");
		fetchSpy.mockResolvedValueOnce(
			makeResponse({ ok: true, status: 200, json: { data: { id: "opp-1" } } }),
		);

		await client.addCandidateTags("opp-1", ["z"]);

		const body = sentBody();
		expect(body.tags).toEqual(["z"]);
		expect(body.perform_as).toBeUndefined();
	});
});
