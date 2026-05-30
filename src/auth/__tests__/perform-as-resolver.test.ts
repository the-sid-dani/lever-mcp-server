import { describe, it, expect, vi } from "vitest";
import { PerformAsResolver, PerformAsUnresolvedError } from "../perform-as-resolver.js";
import { runWithRequestContext, getRequestEmail } from "../request-context.js";
import type { LeverClient } from "../../lever/client.js";
import type { LeverUser } from "../../types/lever.js";

// Minimal getUsers page shape the resolver consumes.
type UsersPage = { data: LeverUser[]; hasNext?: boolean; next?: string };

function makeClient(getUsers: ReturnType<typeof vi.fn>): LeverClient {
	return { getUsers } as unknown as LeverClient;
}

describe("PerformAsResolver", () => {
	it("resolves a matching email to its Lever user id (case-insensitive)", async () => {
		const getUsers = vi.fn().mockResolvedValue({
			data: [
				{ id: "u1", email: "Sid@Samba.tv" },
				{ id: "u2", email: "jo@samba.tv" },
			],
			hasNext: false,
		} as UsersPage);

		const resolver = new PerformAsResolver(makeClient(getUsers));
		await expect(resolver.resolve("sid@samba.tv")).resolves.toBe("u1");
	});

	it("resolves a stored email with surrounding whitespace by its clean address", async () => {
		const getUsers = vi.fn().mockResolvedValue({
			data: [
				{ id: "u1", email: "  Sid@Samba.tv  " },
				{ id: "u2", email: "jo@samba.tv" },
			],
			hasNext: false,
		} as UsersPage);

		const resolver = new PerformAsResolver(makeClient(getUsers));
		await expect(resolver.resolve("sid@samba.tv")).resolves.toBe("u1");
	});

	it("skips a user record with no email and still resolves other valid users", async () => {
		const getUsers = vi.fn().mockResolvedValue({
			data: [
				{ id: "u1", email: undefined },
				{ id: "u2", email: "jo@samba.tv" },
			],
			hasNext: false,
		} as unknown as UsersPage);

		const resolver = new PerformAsResolver(makeClient(getUsers));
		await expect(resolver.resolve("jo@samba.tv")).resolves.toBe("u2");
	});

	it("throws PerformAsUnresolvedError for an unknown email", async () => {
		const getUsers = vi.fn().mockResolvedValue({
			data: [{ id: "u1", email: "sid@samba.tv" }],
			hasNext: false,
		} as UsersPage);

		const resolver = new PerformAsResolver(makeClient(getUsers));
		await expect(resolver.resolve("nobody@samba.tv")).rejects.toBeInstanceOf(
			PerformAsUnresolvedError,
		);
	});

	it("caches the map: a second resolve does not refetch users", async () => {
		const getUsers = vi.fn().mockResolvedValue({
			data: [{ id: "u1", email: "sid@samba.tv" }],
			hasNext: false,
		} as UsersPage);

		const resolver = new PerformAsResolver(makeClient(getUsers));
		await resolver.resolve("sid@samba.tv");
		await resolver.resolve("sid@samba.tv");

		expect(getUsers).toHaveBeenCalledTimes(1);
	});

	it("paginates the full users list across multiple pages", async () => {
		const getUsers = vi
			.fn()
			.mockResolvedValueOnce({
				data: [{ id: "u1", email: "a@x" }],
				hasNext: true,
				next: "o2",
			} as UsersPage)
			.mockResolvedValueOnce({
				data: [{ id: "u2", email: "b@x" }],
				hasNext: false,
			} as UsersPage);

		const resolver = new PerformAsResolver(makeClient(getUsers));
		await expect(resolver.resolve("b@x")).resolves.toBe("u2");
		expect(getUsers).toHaveBeenCalledTimes(2);
	});
});

describe("request-context", () => {
	it("exposes the email set inside runWithRequestContext", () => {
		const email = runWithRequestContext({ email: "z@x" }, () => getRequestEmail());
		expect(email).toBe("z@x");
	});

	it("returns undefined outside any request context", () => {
		expect(getRequestEmail()).toBeUndefined();
	});
});
