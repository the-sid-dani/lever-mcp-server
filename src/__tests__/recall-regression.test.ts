import { describe, it, expect, vi } from "vitest";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { LeverClient } from "../lever/client.js";
import { registerSearchTools } from "../tools/search.js";
import { registerUserTools } from "../tools/users.js";
import { registerRequisitionTools } from "../tools/requisitions.js";

// PERMANENT false-negative lockdown (Layer 5 regression).
//
// These tests lock the recall fixes that removed pagination caps which had
// silently dropped records:
//   - BUG-002: lever_search_candidates name sweep capped at maxPages -> missed
//     candidates on later pages.
//   - BUG-007: lever_get_users capped pagination -> missed users.
//   - BUG-005: lever_requisitions list was single-call -> missed requisitions.
//
// Each test mocks the LeverClient method to return N pages (hasNext true...false)
// and asserts the handler walked ALL pages and accumulated the full set.

// Tools under test register with the 3-arg overload (name, schema, handler) for
// some and the 4-arg overload (name, description, schema, handler) for others.
// Capture the LAST two trailing args as (schema, handler) regardless of arity.
type Handler = (args: any) => Promise<{ content: Array<{ type: string; text: string }> }>;

function makeFakeServer() {
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

// Parse the JSON text payload out of an MCP tool response.
function parsePayload(res: { content: Array<{ type: string; text: string }> }): any {
	expect(Array.isArray(res.content)).toBe(true);
	expect(res.content[0]!.type).toBe("text");
	return JSON.parse(res.content[0]!.text);
}

describe("recall regression: lever_search_candidates name sweep across pages (BUG-002)", () => {
	it("accumulates matches across 3 pages and reports complete coverage", async () => {
		const client: any = {
			getOpportunities: vi
				.fn()
				.mockResolvedValueOnce({
					data: [{ id: "a", name: "Jordan Smith" }],
					hasNext: true,
					next: "o2",
				})
				.mockResolvedValueOnce({
					data: [{ id: "b", name: "Jordan Smithson" }],
					hasNext: true,
					next: "o3",
				})
				.mockResolvedValueOnce({
					data: [{ id: "c", name: "Jordan Smithers" }],
					hasNext: false,
				}),
		};
		const fake = makeFakeServer();
		registerSearchTools(fake.server, client as LeverClient);

		const { handler } = fake.registry.get("lever_search_candidates")!;
		const res = await handler({ query: "Jordan", limit: 200, page: 1 });

		// 3 pages walked proves the maxPages cap is gone.
		expect(client.getOpportunities).toHaveBeenCalledTimes(3);
		const payload = parsePayload(res);
		expect(payload.total_matches).toBe(3);
		expect(payload.coverage.complete).toBe(true);
	});
});

describe("recall regression: lever_get_users full pagination (BUG-007)", () => {
	it("walks all 3 pages and accumulates the full user directory", async () => {
		const client: any = {
			getUsers: vi
				.fn()
				.mockResolvedValueOnce({ data: [{ id: "u1" }], hasNext: true, next: "o2" })
				.mockResolvedValueOnce({ data: [{ id: "u2" }], hasNext: true, next: "o3" })
				.mockResolvedValueOnce({ data: [{ id: "u3" }], hasNext: false }),
		};
		const fake = makeFakeServer();
		registerUserTools(fake.server, client as LeverClient);

		const { handler } = fake.registry.get("lever_get_users")!;
		const res = await handler({ limit: 100, include_deactivated: false });

		expect(client.getUsers).toHaveBeenCalledTimes(3);
		const payload = parsePayload(res);
		expect(payload.count).toBe(3);
	});
});

describe("recall regression: lever_requisitions list pagination (BUG-005)", () => {
	it("walks all 2 pages (was single-call) and accumulates the full set", async () => {
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
	});
});
