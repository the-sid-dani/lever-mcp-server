// Per-request context carried via Node AsyncLocalStorage.
// Tool handlers execute synchronously inside transport.handleRequest(); this
// store lets them read the authenticated email without threading it through
// every call signature. Populated by server.ts at the /mcp boundary (VAL-302).

import { AsyncLocalStorage } from "node:async_hooks";

export interface RequestContext {
	email?: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

export function runWithRequestContext<T>(ctx: RequestContext, fn: () => T): T {
	return storage.run(ctx, fn);
}

export function getRequestEmail(): string | undefined {
	return storage.getStore()?.email;
}
