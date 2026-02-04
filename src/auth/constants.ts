/**
 * OAuth configuration constants for Auth0 integration.
 *
 * These values are populated from environment variables set via Cloud Run secrets.
 */
export const OAUTH_CONFIG = {
  // Auth0 tenant URL (e.g., https://your-tenant.auth0.com)
  auth0Issuer: process.env.AUTH0_ISSUER_URL || '',

  // Auth0 API identifier (audience)
  audience: process.env.AUTH0_AUDIENCE || '',

  // CORS origins for Claude.ai
  corsOrigins: [
    'https://claude.ai',
    'https://claude.com',
    'https://www.anthropic.com',
    'https://api.anthropic.com',
  ],
};

/**
 * Check if OAuth is properly configured.
 * Call this at startup to fail fast if config is missing.
 */
export function validateOAuthConfig(): void {
  if (!OAUTH_CONFIG.auth0Issuer) {
    console.warn('WARNING: AUTH0_ISSUER_URL not set - OAuth will not work');
  }
  if (!OAUTH_CONFIG.audience) {
    console.warn('WARNING: AUTH0_AUDIENCE not set - OAuth will not work');
  }
}

/**
 * Check if OAuth is enabled (both required env vars are set).
 */
export function isOAuthEnabled(): boolean {
  return Boolean(OAUTH_CONFIG.auth0Issuer && OAUTH_CONFIG.audience);
}
