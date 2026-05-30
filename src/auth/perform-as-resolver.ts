// PerformAsResolver — maps an authenticated login email to a Lever user ID for
// perform_as attribution on writes. Builds a cached email -> userId map by
// paginating GET /users, refreshing on a TTL. Throws a typed error when the
// authenticated user has no matching Lever account (VAL-302).

import type { LeverClient } from "../lever/client.js";

export class PerformAsUnresolvedError extends Error {
	constructor(email: string) {
		super(
			`Your Lever account (${email}) is not provisioned. Ask an admin to add you as a Lever user.`,
		);
		this.name = "PerformAsUnresolvedError";
	}
}

export class PerformAsResolver {
	private cache: Map<string, string> = new Map();
	private builtAt = 0;

	constructor(
		private client: LeverClient,
		private ttlMs: number = 10 * 60 * 1000,
	) {}

	async resolve(email: string): Promise<string> {
		const key = email.trim().toLowerCase();

		if (this.cache.size === 0 || Date.now() - this.builtAt > this.ttlMs) {
			await this.rebuild();
		}

		const id = this.cache.get(key);
		if (id) {
			return id;
		}
		throw new PerformAsUnresolvedError(email);
	}

	clearCache(): void {
		this.cache.clear();
		this.builtAt = 0;
	}

	private async rebuild(): Promise<void> {
		const next = new Map<string, string>();
		let offset: string | undefined;

		// Paginate the full /users list. One rebuild per resolve when stale;
		// a miss does NOT trigger a fresh rebuild (avoids hammering the API).
		do {
			const page = await this.client.getUsers({
				limit: 100,
				offset,
				includeDeactivated: false,
			});

			for (const user of page.data) {
				const email = (user.email ?? "").trim().toLowerCase();
				if (email && user.id) {
					next.set(email, user.id);
				}
			}

			offset = page.hasNext && page.next ? page.next : undefined;
		} while (offset);

		this.cache = next;
		this.builtAt = Date.now();
	}
}
