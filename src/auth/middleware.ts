import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import type { Request, Response, NextFunction } from 'express';
import { OAUTH_CONFIG, isOAuthEnabled } from './constants.js';
import type { AuthenticatedUser } from './types.js';

// Cache the JWKS for performance
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJWKS(): ReturnType<typeof createRemoteJWKSet> {
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`${OAUTH_CONFIG.auth0Issuer}/.well-known/jwks.json`));
  }
  return jwks;
}

/**
 * Express Request extended with authenticated user info.
 */
export interface AuthenticatedRequest extends Request {
  auth?: AuthenticatedUser;
}

/**
 * Validate a Bearer token and return the user info.
 *
 * @param token - The JWT access token
 * @returns User info if valid, or error message
 */
export async function validateBearerToken(
  token: string
): Promise<{ valid: true; user: AuthenticatedUser } | { valid: false; error: string }> {
  if (!isOAuthEnabled()) {
    return { valid: false, error: 'OAuth not configured' };
  }

  try {
    const { payload } = await jwtVerify(token, getJWKS(), {
      issuer: `${OAUTH_CONFIG.auth0Issuer}/`,
      audience: OAUTH_CONFIG.audience,
    });

    const user: AuthenticatedUser = {
      sub: payload.sub as string,
      email: payload.email as string | undefined,
      emailVerified: payload.email_verified as boolean | undefined,
      scopes: typeof payload.scope === 'string' ? payload.scope.split(' ') : [],
    };

    return { valid: true, user };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Invalid token';
    return { valid: false, error: errorMessage };
  }
}

/**
 * Build the resource metadata URL for WWW-Authenticate header.
 */
function getResourceMetadataUrl(req: Request): string {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${protocol}://${host}/.well-known/oauth-protected-resource`;
}

/**
 * Express middleware for Bearer token authentication.
 *
 * Returns 401 with proper WWW-Authenticate header if authentication fails.
 * Sets req.auth with user info if successful.
 */
export async function bearerAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    // RFC 9728: Include resource_metadata in WWW-Authenticate
    const resourceMetadataUrl = getResourceMetadataUrl(req);
    res
      .status(401)
      .header('WWW-Authenticate', `Bearer resource_metadata="${resourceMetadataUrl}"`)
      .json({ error: 'unauthorized', message: 'Bearer token required' });
    return;
  }

  const token = authHeader.slice(7);
  const result = await validateBearerToken(token);

  if (!result.valid) {
    res
      .status(401)
      .header('WWW-Authenticate', `Bearer error="invalid_token", error_description="${result.error}"`)
      .json({ error: 'invalid_token', message: result.error });
    return;
  }

  req.auth = result.user;
  next();
}

/**
 * Validate Bearer token from request without using Express middleware.
 * Use this for inline auth checks in route handlers.
 *
 * @param req - Express request
 * @returns Auth result with user info or error
 */
export async function validateRequestAuth(
  req: Request
): Promise<{ valid: true; user: AuthenticatedUser } | { valid: false; error: string }> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return { valid: false, error: 'Bearer token required' };
  }

  return validateBearerToken(authHeader.slice(7));
}
