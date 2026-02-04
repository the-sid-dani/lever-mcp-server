/**
 * Auth0 JWT Token Payload
 *
 * Structure of the decoded JWT access token from Auth0.
 */
export interface Auth0TokenPayload {
  iss: string; // Auth0 issuer
  sub: string; // User ID
  aud: string | string[]; // Audience (your API)
  iat: number; // Issued at
  exp: number; // Expiration
  azp: string; // Authorized party (client ID)
  scope: string; // Scopes
  email?: string; // User email (if openid scope)
  email_verified?: boolean;
}

/**
 * Authenticated user info extracted from JWT.
 */
export interface AuthenticatedUser {
  sub: string; // User ID
  email?: string; // User email
  emailVerified?: boolean;
  scopes: string[];
}
