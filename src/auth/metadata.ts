/**
 * RFC 9728 - OAuth 2.0 Protected Resource Metadata
 *
 * This metadata tells MCP clients which authorization server to use
 * for obtaining access tokens. Since this server is its own OAuth 2.1
 * Authorization Server (Google broker), the authorization server is the
 * server itself.
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
 * @param resourceUrl - The URL of this resource server (also our AS).
 * @returns RFC 9728 compliant metadata
 */
export function getProtectedResourceMetadata(resourceUrl: string): ProtectedResourceMetadata {
	return {
		resource: resourceUrl,
		authorization_servers: [resourceUrl],
		bearer_methods_supported: ["header"],
		scopes_supported: ["openid", "email"],
	};
}
