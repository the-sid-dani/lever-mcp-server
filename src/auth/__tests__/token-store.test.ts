import { describe, it, expect, vi, afterEach } from "vitest";
import {
	InMemoryTokenStore,
	createTokenStore,
	FirestoreTokenStore,
	type StoredToken,
	type StoredClient,
} from "../token-store.js";

function makeToken(overrides: Partial<StoredToken> = {}): StoredToken {
	return {
		token: "at_test",
		clientId: "mcp-client-1",
		scopes: ["openid", "email"],
		expiresAt: Math.floor(Date.now() / 1000) + 3600,
		email: "sid@samba.tv",
		...overrides,
	};
}

describe("InMemoryTokenStore tokens", () => {
	it("put/get round-trip", async () => {
		const store = new InMemoryTokenStore();
		const t = makeToken();
		await store.putToken(t);
		const got = await store.getToken("at_test");
		expect(got).toEqual(t);
	});

	it("getToken returns null for unknown token", async () => {
		const store = new InMemoryTokenStore();
		expect(await store.getToken("at_nope")).toBeNull();
	});

	it("deleteToken removes the token", async () => {
		const store = new InMemoryTokenStore();
		await store.putToken(makeToken());
		await store.deleteToken("at_test");
		expect(await store.getToken("at_test")).toBeNull();
	});

	it("expired token returns null AND is evicted", async () => {
		const store = new InMemoryTokenStore();
		await store.putToken(makeToken({ expiresAt: Math.floor(Date.now() / 1000) - 1 }));
		expect(await store.getToken("at_test")).toBeNull();

		// Eviction: even if time were rewound, the entry is gone.
		const nowS = Math.floor(Date.now() / 1000);
		vi.spyOn(Date, "now").mockReturnValue((nowS - 7200) * 1000);
		expect(await store.getToken("at_test")).toBeNull();
		vi.restoreAllMocks();
	});
});

describe("InMemoryTokenStore clients", () => {
	it("put/get round-trip", async () => {
		const store = new InMemoryTokenStore();
		const c: StoredClient = {
			client_id: "mcp-client-1",
			redirect_uris: ["https://claude.ai/api/mcp/auth_callback"],
		};
		await store.putClient(c);
		const got = await store.getClient("mcp-client-1");
		expect(got).toEqual(c);
	});

	it("getClient returns null for unknown client", async () => {
		const store = new InMemoryTokenStore();
		expect(await store.getClient("nope")).toBeNull();
	});
});

describe("createTokenStore", () => {
	const prev = process.env.TOKEN_STORE;
	afterEach(() => {
		if (prev === undefined) {
			delete process.env.TOKEN_STORE;
		} else {
			process.env.TOKEN_STORE = prev;
		}
	});

	it("defaults to in-memory when TOKEN_STORE unset", () => {
		delete process.env.TOKEN_STORE;
		expect(createTokenStore()).toBeInstanceOf(InMemoryTokenStore);
	});

	it("returns Firestore backend when TOKEN_STORE=firestore", () => {
		process.env.TOKEN_STORE = "firestore";
		// Lazy-init: constructing the store must NOT touch GCP.
		expect(createTokenStore()).toBeInstanceOf(FirestoreTokenStore);
	});
});
