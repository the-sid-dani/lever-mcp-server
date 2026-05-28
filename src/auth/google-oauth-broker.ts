import { randomBytes } from 'node:crypto';
import type { Response } from 'express';
import type {
  AuthorizationParams,
  OAuthServerProvider,
} from '@modelcontextprotocol/sdk/server/auth/provider.js';
import type { OAuthRegisteredClientsStore } from '@modelcontextprotocol/sdk/server/auth/clients.js';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import type {
  OAuthClientInformationFull,
  OAuthTokenRevocationRequest,
  OAuthTokens,
} from '@modelcontextprotocol/sdk/shared/auth.js';
import { GoogleWorkspaceVerifier, type GoogleClaims } from './google-verifier.js';

/**
 * Google OAuth broker - implements the MCP SDK OAuthServerProvider interface.
 *
 * Architecture (OAuth Proxy / Broker pattern):
 *
 *   Claude.ai --/authorize--> Lever MCP (us, the AS) --/o/oauth2/auth--> Google
 *        ^                          |  ^                                    |
 *        |   redirect(code)         |  |   /oauth/google/callback           |
 *        +--------------------------+  +------------------------------------+
 *
 * MCP clients (Claude.ai etc.) treat THIS server as the authorization server,
 * register via DCR, and complete an OAuth 2.1 + PKCE flow against our endpoints.
 * We broker to Google internally using a pre-registered Google OAuth Web client,
 * enforce the hosted-domain restriction (hd claim) on Google's returned ID token,
 * and mint our own opaque access tokens scoped to the validated user email.
 *
 * Storage is in-memory and per-instance. Under Cloud Run autoscaling a restart
 * or scale-out invalidates active sessions; affected clients re-run the OAuth
 * flow (one click in Claude.ai). Acceptable for an internal server; swap to a
 * shared store if multi-instance session continuity becomes a requirement.
 *
 * Ported from the MSCI MCP GoogleOAuthBroker (Python / mcp.server.auth).
 */

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

const AUTH_CODE_TTL_S = 300; // 5 min - codes are short-lived per RFC 6749 sec 10.5
const TOKEN_TTL_S = 3600; // 1 hr access token lifetime

/** Generate a URL-safe opaque token. 32 bytes = ~256 bits of entropy. */
function newToken(prefix: string): string {
  return `${prefix}_${randomBytes(32).toString('base64url')}`;
}

/** A verifier-shaped dependency, injectable for testability. */
interface VerifierLike {
  verify(idToken: string): Promise<GoogleClaims | null>;
}

export interface GoogleOAuthBrokerOptions {
  /** Pre-registered Google OAuth Web client ID. */
  googleClientId: string;
  /** Matching Google OAuth client secret (kept server-side). */
  googleClientSecret: string;
  /** Authorized redirect URI on the Google OAuth client (our callback route). */
  googleRedirectUri: string;
  /** Workspace domain users must belong to (hd claim), e.g. samba.tv. */
  hostedDomain: string;
  /** Public URL of this MCP server (token issuer). */
  mcpPublicUrl: string;
  /** Optional injected verifier; defaults to a GoogleWorkspaceVerifier. */
  verifier?: VerifierLike;
}

/** A pending MCP authorization request, stashed across the Google round-trip. */
interface PendingAuth {
  mcpClientId: string;
  mcpRedirectUri: string;
  mcpState?: string;
  mcpScopes: string[];
  mcpCodeChallenge: string;
  mcpResource: string | null;
  createdAt: number;
}

/** An MCP-side authorization code awaiting exchange for an access token. */
interface StoredAuthCode {
  clientId: string;
  codeChallenge: string;
  redirectUri: string;
  scopes: string[];
  resource: string | null;
  email: string;
  expiresAt: number; // ms epoch
}

/** A minted opaque access token record. */
interface StoredAccessToken {
  token: string;
  clientId: string;
  scopes: string[];
  expiresAt: number; // seconds epoch
  email: string;
}

export class GoogleOAuthBroker implements OAuthServerProvider {
  private readonly googleClientId: string;
  private readonly googleClientSecret: string;
  private readonly googleRedirectUri: string;
  private readonly hostedDomain: string;
  private readonly mcpPublicUrl: string;
  private readonly verifier: VerifierLike;

  // In-memory state (per instance - see class docstring).
  private readonly clients = new Map<string, OAuthClientInformationFull>();
  private readonly pendingAuth = new Map<string, PendingAuth>();
  private readonly authCodes = new Map<string, StoredAuthCode>();
  private readonly accessTokens = new Map<string, StoredAccessToken>();

  readonly skipLocalPkceValidation = false;

  constructor(options: GoogleOAuthBrokerOptions) {
    if (!options.googleClientId) {
      throw new Error('googleClientId is required');
    }
    if (!options.googleClientSecret) {
      throw new Error('googleClientSecret is required');
    }
    if (!options.googleRedirectUri) {
      throw new Error('googleRedirectUri is required');
    }
    if (!options.hostedDomain) {
      throw new Error('hostedDomain is required');
    }
    if (!options.mcpPublicUrl) {
      throw new Error('mcpPublicUrl is required');
    }
    this.googleClientId = options.googleClientId;
    this.googleClientSecret = options.googleClientSecret;
    this.googleRedirectUri = options.googleRedirectUri;
    this.hostedDomain = options.hostedDomain;
    this.mcpPublicUrl = options.mcpPublicUrl.replace(/\/+$/, '');
    this.verifier =
      options.verifier ??
      new GoogleWorkspaceVerifier({
        googleClientId: options.googleClientId,
        hostedDomain: options.hostedDomain,
      });
  }

  // ------------------------------------------------------------------ DCR
  get clientsStore(): OAuthRegisteredClientsStore {
    return {
      getClient: (clientId: string) => this.clients.get(clientId),
      registerClient: async (
        client: Omit<OAuthClientInformationFull, 'client_id' | 'client_id_issued_at'>
      ) => {
        if (!client.redirect_uris || client.redirect_uris.length === 0) {
          throw new Error('redirect_uris is required');
        }
        // The SDK assigns client_id before calling registerClient; store as-is.
        const full = client as OAuthClientInformationFull;
        this.clients.set(full.client_id, full);
        return full;
      },
    };
  }

  // ------------------------------------------------------ /authorize step 1
  async authorize(
    client: OAuthClientInformationFull,
    params: AuthorizationParams,
    res: Response
  ): Promise<void> {
    const googleState = newToken('gs');
    this.pendingAuth.set(googleState, {
      mcpClientId: client.client_id,
      mcpRedirectUri: params.redirectUri,
      mcpState: params.state,
      mcpScopes: params.scopes ?? ['openid', 'email'],
      mcpCodeChallenge: params.codeChallenge,
      mcpResource: params.resource?.href ?? null,
      createdAt: Date.now(),
    });

    const query = new URLSearchParams({
      client_id: this.googleClientId,
      redirect_uri: this.googleRedirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'online',
      prompt: 'select_account',
      hd: this.hostedDomain,
      state: googleState,
    });
    res.redirect(`${GOOGLE_AUTH_URL}?${query.toString()}`);
  }

  // ----------------------------------------- Google callback (NOT a provider
  // method - called by the custom Express callback route in production).
  /**
   * Exchange the Google authorization code for an ID token, validate the hosted
   * domain, mint an MCP-side authorization code, and return the MCP client's
   * redirect URL (with code + state). Throws on any failure.
   */
  async handleGoogleCallback(code: string, state: string): Promise<string> {
    const pending = this.pendingAuth.get(state);
    this.pendingAuth.delete(state);
    if (!pending) {
      throw new Error('Unknown or expired authorization state');
    }
    if (Date.now() - pending.createdAt > AUTH_CODE_TTL_S * 1000) {
      throw new Error('Authorization request expired');
    }

    // Exchange the Google authorization code for an ID token.
    const body = new URLSearchParams({
      client_id: this.googleClientId,
      client_secret: this.googleClientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: this.googleRedirectUri,
    });
    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!tokenRes.ok) {
      throw new Error(`Google token exchange failed: ${tokenRes.status}`);
    }
    const googleTokens = (await tokenRes.json()) as { id_token?: string };
    const idToken = googleTokens.id_token;
    if (!idToken) {
      throw new Error('No id_token in Google token response');
    }

    // Validate Google ID token + hosted domain (the hd security gate).
    const claims = await this.verifier.verify(idToken);
    if (!claims) {
      throw new Error('hosted domain not allowed / invalid upstream token');
    }

    // Mint an MCP-side authorization code bound to the validated email.
    const mcpCode = newToken('code');
    this.authCodes.set(mcpCode, {
      clientId: pending.mcpClientId,
      codeChallenge: pending.mcpCodeChallenge,
      redirectUri: pending.mcpRedirectUri,
      scopes: pending.mcpScopes,
      resource: pending.mcpResource,
      email: claims.email,
      expiresAt: Date.now() + AUTH_CODE_TTL_S * 1000,
    });

    // Build the redirect back to the MCP client.
    const target = new URL(pending.mcpRedirectUri);
    target.searchParams.set('code', mcpCode);
    if (pending.mcpState) {
      target.searchParams.set('state', pending.mcpState);
    }
    // Never log tokens.
    console.info(`Google callback OK email=${claims.email}`);
    return target.toString();
  }

  // ------------------------------------------------- /token step (PKCE check)
  async challengeForAuthorizationCode(
    _client: OAuthClientInformationFull,
    authorizationCode: string
  ): Promise<string> {
    const code = this.authCodes.get(authorizationCode);
    if (!code) {
      throw new Error('Unknown authorization code');
    }
    return code.codeChallenge;
  }

  // ------------------------------------------------- /token step (code -> AT)
  async exchangeAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string,
    _codeVerifier?: string,
    _redirectUri?: string,
    _resource?: URL
  ): Promise<OAuthTokens> {
    const code = this.authCodes.get(authorizationCode);
    if (!code) {
      throw new Error('Unknown authorization code');
    }
    if (code.clientId !== client.client_id) {
      throw new Error('Authorization code was issued to a different client');
    }
    if (Date.now() > code.expiresAt) {
      this.authCodes.delete(authorizationCode);
      throw new Error('Authorization code expired');
    }
    // One-time use.
    this.authCodes.delete(authorizationCode);

    const token = newToken('at');
    this.accessTokens.set(token, {
      token,
      clientId: client.client_id,
      scopes: code.scopes,
      expiresAt: Math.floor(Date.now() / 1000) + TOKEN_TTL_S,
      email: code.email,
    });
    console.info(`Issued access token client=${client.client_id} email=${code.email}`);

    return {
      access_token: token,
      token_type: 'Bearer',
      expires_in: TOKEN_TTL_S,
      scope: code.scopes.join(' '),
    };
  }

  // ----------------------------------- Refresh tokens (not used in V1)
  async exchangeRefreshToken(
    _client: OAuthClientInformationFull,
    _refreshToken: string,
    _scopes?: string[],
    _resource?: URL
  ): Promise<OAuthTokens> {
    throw new Error('refresh tokens not supported in V1; re-authorize');
  }

  // ------------------------------------------------- /mcp request token check
  async verifyAccessToken(token: string): Promise<AuthInfo> {
    const at = this.accessTokens.get(token);
    if (!at) {
      throw new Error('Invalid access token');
    }
    if (at.expiresAt < Math.floor(Date.now() / 1000)) {
      this.accessTokens.delete(token);
      throw new Error('Access token expired');
    }
    return {
      token: at.token,
      clientId: at.clientId,
      scopes: at.scopes,
      expiresAt: at.expiresAt,
      extra: { email: at.email },
    };
  }

  // ------------------------------------------------------ /revoke
  async revokeToken(
    _client: OAuthClientInformationFull,
    request: OAuthTokenRevocationRequest
  ): Promise<void> {
    this.accessTokens.delete(request.token);
  }

  // ----------------------------------------------------- Helpers (middleware)
  /** Resolve the email associated with an opaque access token, if live. */
  getEmailForToken(token: string): string | undefined {
    return this.accessTokens.get(token)?.email;
  }
}
