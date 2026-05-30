import type { LeverClient } from "../lever/client.js";
import { isOAuthEnabled } from "./constants.js";
import { getRequestEmail } from "./request-context.js";
import { PerformAsResolver } from "./perform-as-resolver.js";

let shared: PerformAsResolver | null = null;

// Lazily build ONE resolver bound to the shared LeverClient (first caller wins),
// mirroring getSharedClient in tools.ts. The resolver caches the email->userId map.
export function getSharedResolver(client: LeverClient): PerformAsResolver {
	if (!shared) shared = new PerformAsResolver(client);
	return shared;
}

// For tests: reset the singleton.
export function __resetSharedResolver(): void {
	shared = null;
}

// Resolve the perform_as Lever user ID for the CURRENT request per the auth policy.
// `explicitOverride` is honored ONLY in the OAUTH-disabled path (cron/internal callers
// that pass a perform_as). It is IGNORED when OAUTH is enabled (the authenticated
// identity always wins — never trust a caller-supplied perform_as for an authed request).
export async function resolvePerformAs(
	resolver: PerformAsResolver,
	explicitOverride?: string,
): Promise<string> {
	if (isOAuthEnabled()) {
		const email = getRequestEmail();
		if (!email) {
			throw new Error(
				"perform_as cannot be resolved: authenticated request carried no email claim.",
			);
		}
		return resolver.resolve(email); // throws PerformAsUnresolvedError if unprovisioned
	}
	// OAUTH disabled — internal/cron/local dev.
	const fallback = explicitOverride || process.env.LEVER_DEFAULT_USER_ID;
	if (!fallback) {
		throw new Error(
			"perform_as cannot be resolved: OAuth disabled and no LEVER_DEFAULT_USER_ID set.",
		);
	}
	return fallback;
}
