import { Firestore } from '@google-cloud/firestore';

/**
 * Durable token-store abstraction for the Google OAuth broker.
 *
 * The broker mints opaque access tokens and stores DCR client registrations.
 * Under Cloud Run, in-memory state is wiped on every deploy/restart, which
 * staled every active token -> 401 -> "connector not responding". This store
 * moves the DURABLE state (access tokens + DCR clients) to a pluggable backend
 * so it survives deploys. Transient state (authCodes + pendingAuth, <=5min TTL)
 * stays in-memory in the broker - a mid-flow restart is rare and the user just
 * retries the one-click flow.
 *
 * Backends:
 *   - InMemoryTokenStore  - default; tests + local dev need no Firestore.
 *   - FirestoreTokenStore  - prod; tokens persist across revisions.
 *
 * All ops are async. getToken filters (and deletes) expired tokens on read.
 */

/** A minted opaque access token record (durable). */
export interface StoredToken {
	token: string;
	clientId: string;
	scopes: string[];
	expiresAt: number; // seconds epoch
	email: string;
}

/** A DCR client registration (the OAuthClientInformationFull shape; stored as-is). */
export interface StoredClient {
	client_id: string;
	[k: string]: unknown;
}

/** Pluggable durable store for OAuth access tokens + DCR clients. */
export interface TokenStore {
	/** Returns null if missing OR expired (and deletes-if-expired). */
	getToken(token: string): Promise<StoredToken | null>;
	putToken(t: StoredToken): Promise<void>;
	deleteToken(token: string): Promise<void>;
	getClient(clientId: string): Promise<StoredClient | null>;
	putClient(c: StoredClient): Promise<void>;
}

/** Current unix time in seconds (token expiry uses seconds epoch). */
function nowSeconds(): number {
	return Math.floor(Date.now() / 1000);
}

/**
 * In-memory backend (default). Per-instance, non-durable - identical semantics
 * to the broker's prior Maps. getToken evicts expired tokens on read.
 */
export class InMemoryTokenStore implements TokenStore {
	private readonly tokens = new Map<string, StoredToken>();
	private readonly clients = new Map<string, StoredClient>();

	async getToken(token: string): Promise<StoredToken | null> {
		const t = this.tokens.get(token);
		if (!t) {
			return null;
		}
		if (t.expiresAt < nowSeconds()) {
			this.tokens.delete(token);
			return null;
		}
		return t;
	}

	async putToken(t: StoredToken): Promise<void> {
		this.tokens.set(t.token, t);
	}

	async deleteToken(token: string): Promise<void> {
		this.tokens.delete(token);
	}

	async getClient(clientId: string): Promise<StoredClient | null> {
		return this.clients.get(clientId) ?? null;
	}

	async putClient(c: StoredClient): Promise<void> {
		this.clients.set(c.client_id, c);
	}
}

const TOKENS_COLLECTION = 'lever_mcp_oauth_tokens';
const CLIENTS_COLLECTION = 'lever_mcp_oauth_clients';

/**
 * Firestore backend (prod). Tokens persist across Cloud Run revisions. Uses
 * Application Default Credentials; in prod the Cloud Run SA holds datastore.user.
 *
 *   collection lever_mcp_oauth_tokens   doc id = token
 *   collection lever_mcp_oauth_clients  doc id = client_id
 *
 * The Firestore client is lazy-initialized so importing this module (e.g. in
 * tests, or local dev with the in-memory default) never touches GCP.
 */
export class FirestoreTokenStore implements TokenStore {
	private db: Firestore | null = null;

	private firestore(): Firestore {
		if (!this.db) {
			this.db = new Firestore();
		}
		return this.db;
	}

	async getToken(token: string): Promise<StoredToken | null> {
		const snap = await this.firestore()
			.collection(TOKENS_COLLECTION)
			.doc(token)
			.get();
		if (!snap.exists) {
			return null;
		}
		const data = snap.data() as Partial<StoredToken> | undefined;
		if (!data || typeof data.expiresAt !== 'number') {
			return null;
		}
		if (data.expiresAt < nowSeconds()) {
			await this.firestore().collection(TOKENS_COLLECTION).doc(token).delete();
			return null;
		}
		return {
			token,
			clientId: String(data.clientId ?? ''),
			scopes: Array.isArray(data.scopes) ? data.scopes.map(String) : [],
			expiresAt: data.expiresAt,
			email: String(data.email ?? ''),
		};
	}

	async putToken(t: StoredToken): Promise<void> {
		await this.firestore()
			.collection(TOKENS_COLLECTION)
			.doc(t.token)
			.set({
				token: t.token,
				clientId: t.clientId,
				scopes: t.scopes,
				expiresAt: t.expiresAt,
				email: t.email,
			});
	}

	async deleteToken(token: string): Promise<void> {
		await this.firestore().collection(TOKENS_COLLECTION).doc(token).delete();
	}

	async getClient(clientId: string): Promise<StoredClient | null> {
		const snap = await this.firestore()
			.collection(CLIENTS_COLLECTION)
			.doc(clientId)
			.get();
		if (!snap.exists) {
			return null;
		}
		const data = snap.data() as StoredClient | undefined;
		if (!data) {
			return null;
		}
		return { ...data, client_id: clientId };
	}

	async putClient(c: StoredClient): Promise<void> {
		await this.firestore()
			.collection(CLIENTS_COLLECTION)
			.doc(c.client_id)
			.set(c);
	}
}

/**
 * Factory: Firestore backend when TOKEN_STORE=firestore, else in-memory.
 * In-memory is the default so tests + local dev need no Firestore.
 */
export function createTokenStore(): TokenStore {
	if (process.env.TOKEN_STORE === 'firestore') {
		return new FirestoreTokenStore();
	}
	return new InMemoryTokenStore();
}
