import { OAUTH_CONFIG } from './constants.js';

/**
 * RFC 9728 - OAuth 2.0 Protected Resource Metadata
 *
 * This metadata tells MCP clients which authorization server to use
 * for obtaining access tokens.
 *
 * @see https://datatracker.ietf.org/doc/rfc9728/
 */
export interface ProtectedResourceMetadata {
  resource: string;
  authorization_servers: string[];
  bearer_methods_supported: string[];
  scopes_supported: string[];
}

/**
 * Generate Protected Resource Metadata for this server.
 *
 * @param resourceUrl - The URL of this resource server
 * @returns RFC 9728 compliant metadata
 */
export function getProtectedResourceMetadata(resourceUrl: string): ProtectedResourceMetadata {
  return {
    resource: resourceUrl,
    authorization_servers: [OAUTH_CONFIG.auth0Issuer],
    bearer_methods_supported: ['header'],
    scopes_supported: ['openid', 'profile', 'email'],
  };
}
