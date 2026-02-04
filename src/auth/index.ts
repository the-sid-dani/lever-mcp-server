// Auth module exports
export { bearerAuth, validateBearerToken, validateRequestAuth } from './middleware.js';
export type { AuthenticatedRequest } from './middleware.js';
export { OAUTH_CONFIG, validateOAuthConfig, isOAuthEnabled } from './constants.js';
export { getProtectedResourceMetadata } from './metadata.js';
export type { Auth0TokenPayload, AuthenticatedUser } from './types.js';
