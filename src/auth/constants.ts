/**
 * OAuth configuration constants for the Google OAuth broker.
 *
 * The server is its own OAuth 2.1 Authorization Server brokering Google
 * Workspace sign-in restricted to a hosted domain. These values are populated
 * from environment variables set via Cloud Run secrets / plain env vars.
 */
export const OAUTH_CONFIG = {
	// Google OAuth Web client ID (self-serve, no IT).
	googleClientId: process.env.GOOGLE_OAUTH_CLIENT_ID || "",

	// Matching Google OAuth client secret (kept server-side).
	googleClientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || "",

	// Public URL of this MCP server (token issuer / AS metadata base).
	mcpPublicUrl: process.env.MCP_PUBLIC_URL || "",

	// Google Workspace hosted domain users must belong to (hd claim).
	hostedDomain: process.env.ALLOWED_HOSTED_DOMAIN || "samba.tv",

	// CORS origins for Claude.ai
	corsOrigins: [
		"https://claude.ai",
		"https://claude.com",
		"https://www.anthropic.com",
		"https://api.anthropic.com",
	],
};

/**
 * Validate OAuth config at startup. Warns (does not throw) when the broker is
 * not fully configured, in which case OAuth is disabled and the server falls
 * back to Cloud Run IAM gating (LEVER_DEFAULT_USER_ID).
 */
export function validateOAuthConfig(): void {
	if (!OAUTH_CONFIG.googleClientId) {
		console.warn("WARNING: GOOGLE_OAUTH_CLIENT_ID not set - OAuth broker disabled");
	}
	if (!OAUTH_CONFIG.googleClientSecret) {
		console.warn("WARNING: GOOGLE_OAUTH_CLIENT_SECRET not set - OAuth broker disabled");
	}
	if (!OAUTH_CONFIG.mcpPublicUrl) {
		console.warn("WARNING: MCP_PUBLIC_URL not set - OAuth broker disabled");
	}
}

/**
 * Check if OAuth is enabled. The broker self-enables ONLY when both the Google
 * client ID and secret are present; otherwise OAuth is disabled and the server
 * uses Cloud Run IAM fallback.
 */
export function isOAuthEnabled(): boolean {
	return Boolean(OAUTH_CONFIG.googleClientId && OAUTH_CONFIG.googleClientSecret);
}
