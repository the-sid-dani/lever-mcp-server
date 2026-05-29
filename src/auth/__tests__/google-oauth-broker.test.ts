import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Response } from 'express';
import type { OAuthClientInformationFull } from '@modelcontextprotocol/sdk/shared/auth.js';
import { GoogleOAuthBroker } from '../google-oauth-broker.js';
import { InMemoryTokenStore } from '../token-store.js';
import type { GoogleClaims } from '../google-verifier.js';

const BASE_OPTS = {
  googleClientId: 'gid.apps.googleusercontent.com',
  googleClientSecret: 'gsecret',
  googleRedirectUri: 'https://lever-mcp.example.com/oauth/google/callback',
  hostedDomain: 'samba.tv',
  mcpPublicUrl: 'https://lever-mcp.example.com',
};

const SAMBA_CLAIMS: GoogleClaims = {
  email: 'sid@samba.tv',
  hd: 'samba.tv',
  sub: 'google-sub-1',
  name: 'Sid Dani',
  email_verified: true,
  aud: BASE_OPTS.googleClientId,
  iss: 'https://accounts.google.com',
  exp: Math.floor(Date.now() / 1000) + 3600,
};

// A fake verifier whose verify() result we control per test.
function makeFakeVerifier(result: GoogleClaims | null) {
  return {
    verify: vi.fn(async (_idToken: string) => result),
  };
}

function makeBroker(verifierResult: GoogleClaims | null = SAMBA_CLAIMS) {
  const verifier = makeFakeVerifier(verifierResult);
  const store = new InMemoryTokenStore();
  const broker = new GoogleOAuthBroker({ ...BASE_OPTS, verifier: verifier as any, store });
  return { broker, verifier, store };
}

// Minimal full client info (SDK assigns client_id before passing to registerClient).
function makeClient(overrides: Partial<OAuthClientInformationFull> = {}): OAuthClientInformationFull {
  return {
    client_id: 'mcp-client-1',
    redirect_uris: ['https://claude.ai/api/mcp/auth_callback'],
    ...overrides,
  } as OAuthClientInformationFull;
}

const AUTH_PARAMS = {
  state: 'mcp-state-xyz',
  scopes: ['openid', 'email'],
  codeChallenge: 'challenge-abc',
  redirectUri: 'https://claude.ai/api/mcp/auth_callback',
};

describe('GoogleOAuthBroker constructor', () => {
  it('throws if any required arg is empty', () => {
    expect(() => new GoogleOAuthBroker({ ...BASE_OPTS, googleClientId: '' })).toThrow();
    expect(() => new GoogleOAuthBroker({ ...BASE_OPTS, googleClientSecret: '' })).toThrow();
    expect(() => new GoogleOAuthBroker({ ...BASE_OPTS, googleRedirectUri: '' })).toThrow();
    expect(() => new GoogleOAuthBroker({ ...BASE_OPTS, hostedDomain: '' })).toThrow();
    expect(() => new GoogleOAuthBroker({ ...BASE_OPTS, mcpPublicUrl: '' })).toThrow();
  });

  it('constructs with all required args (default verifier)', () => {
    expect(() => new GoogleOAuthBroker({ ...BASE_OPTS })).not.toThrow();
  });
});

describe('GoogleOAuthBroker clientsStore (DCR)', () => {
  it('registerClient + getClient round-trip', async () => {
    const { broker } = makeBroker();
    const client = makeClient();

    const registered = await broker.clientsStore.registerClient!(client);
    expect(registered.client_id).toBe('mcp-client-1');

    const fetched = await broker.clientsStore.getClient('mcp-client-1');
    expect(fetched).toBeDefined();
    expect(fetched?.client_id).toBe('mcp-client-1');
  });

  it('registerClient rejects when no redirect_uris', async () => {
    const { broker } = makeBroker();
    const bad = makeClient({ redirect_uris: undefined as any });
    await expect(broker.clientsStore.registerClient!(bad)).rejects.toThrow();
  });

  it('getClient returns undefined for unknown client', async () => {
    const { broker } = makeBroker();
    expect(await broker.clientsStore.getClient('nope')).toBeUndefined();
  });
});

describe('GoogleOAuthBroker authorize', () => {
  it('redirects to Google with hd + state and stashes pendingAuth', async () => {
    const { broker } = makeBroker();
    const client = makeClient();

    const redirectSpy = vi.fn();
    const res = { redirect: redirectSpy } as unknown as Response;

    await broker.authorize(client, AUTH_PARAMS, res);

    expect(redirectSpy).toHaveBeenCalledTimes(1);
    const url = redirectSpy.mock.calls[0]![0] as string;
    expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
    expect(url).toContain('hd=samba.tv');

    const parsed = new URL(url);
    const gs = parsed.searchParams.get('state');
    expect(gs).toBeTruthy();
    expect(gs!.startsWith('gs_')).toBe(true);
    expect(parsed.searchParams.get('client_id')).toBe(BASE_OPTS.googleClientId);
    expect(parsed.searchParams.get('response_type')).toBe('code');
    expect(parsed.searchParams.get('prompt')).toBe('select_account');
  });

  it('sweeps stale pendingAuth entries on a subsequent authorize()', async () => {
    const { broker } = makeBroker();

    // Seed a stale pending entry directly (createdAt older than AUTH_CODE_TTL = 300s).
    const stalePending = (broker as any).pendingAuth as Map<string, any>;
    stalePending.set('gs_stale', {
      mcpClientId: 'mcp-client-1',
      mcpRedirectUri: 'https://claude.ai/api/mcp/auth_callback',
      mcpState: 'old-state',
      mcpScopes: ['openid', 'email'],
      mcpCodeChallenge: 'old-challenge',
      mcpResource: null,
      createdAt: Date.now() - 301 * 1000,
    });
    expect(stalePending.has('gs_stale')).toBe(true);

    const client = makeClient();
    const redirectSpy = vi.fn();
    const res = { redirect: redirectSpy } as unknown as Response;
    await broker.authorize(client, AUTH_PARAMS, res);

    // The stale entry is evicted; the freshly-stashed one survives.
    expect(stalePending.has('gs_stale')).toBe(false);
    const fresh = new URL(redirectSpy.mock.calls[0]![0] as string).searchParams.get('state')!;
    expect(stalePending.has(fresh)).toBe(true);
  });

  it('keeps non-stale pendingAuth entries when authorize() sweeps', async () => {
    const { broker } = makeBroker();

    const pending = (broker as any).pendingAuth as Map<string, any>;
    pending.set('gs_fresh', {
      mcpClientId: 'mcp-client-1',
      mcpRedirectUri: 'https://claude.ai/api/mcp/auth_callback',
      mcpState: 'recent-state',
      mcpScopes: ['openid', 'email'],
      mcpCodeChallenge: 'recent-challenge',
      mcpResource: null,
      createdAt: Date.now() - 10 * 1000,
    });

    const client = makeClient();
    const redirectSpy = vi.fn();
    const res = { redirect: redirectSpy } as unknown as Response;
    await broker.authorize(client, AUTH_PARAMS, res);

    expect(pending.has('gs_fresh')).toBe(true);
  });
});

describe('GoogleOAuthBroker handleGoogleCallback', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ id_token: 'fake-google-id-token' }),
      text: async () => '',
    }));
    vi.stubGlobal('fetch', fetchSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // Helper: run authorize to stash a pendingAuth and return its google_state.
  async function primePending(broker: GoogleOAuthBroker): Promise<string> {
    const client = makeClient();
    const redirectSpy = vi.fn();
    const res = { redirect: redirectSpy } as unknown as Response;
    await broker.authorize(client, AUTH_PARAMS, res);
    const url = new URL(redirectSpy.mock.calls[0]![0] as string);
    return url.searchParams.get('state')!;
  }

  it('happy path: mints MCP code bound to email and redirects back to MCP client', async () => {
    const { broker, verifier } = makeBroker(SAMBA_CLAIMS);
    const gs = await primePending(broker);

    const redirectUrl = await broker.handleGoogleCallback('google-auth-code', gs);

    expect(verifier.verify).toHaveBeenCalledWith('fake-google-id-token');
    const parsed = new URL(redirectUrl);
    expect(`${parsed.origin}${parsed.pathname}`).toBe('https://claude.ai/api/mcp/auth_callback');
    expect(parsed.searchParams.get('state')).toBe('mcp-state-xyz');
    const code = parsed.searchParams.get('code');
    expect(code).toBeTruthy();
    expect(code!.startsWith('code_')).toBe(true);

    // The code is bound to the verified email via challengeForAuthorizationCode.
    const client = makeClient();
    const challenge = await broker.challengeForAuthorizationCode(client, code!);
    expect(challenge).toBe('challenge-abc');
  });

  it('hd-reject: verifier returns null -> throws and mints no code', async () => {
    const { broker, verifier } = makeBroker(null);
    const gs = await primePending(broker);

    await expect(broker.handleGoogleCallback('google-auth-code', gs)).rejects.toThrow();
    expect(verifier.verify).toHaveBeenCalledWith('fake-google-id-token');

    // No auth code should have been minted: challengeForAuthorizationCode finds nothing.
    const client = makeClient();
    await expect(
      broker.challengeForAuthorizationCode(client, 'code_anything')
    ).rejects.toThrow();
  });

  it('rejects unknown/expired state', async () => {
    const { broker } = makeBroker(SAMBA_CLAIMS);
    await expect(broker.handleGoogleCallback('code', 'gs_unknown')).rejects.toThrow();
  });

  it('throws when Google token exchange fails (non-ok)', async () => {
    const { broker } = makeBroker(SAMBA_CLAIMS);
    const gs = await primePending(broker);
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({}),
      text: async () => 'bad request',
    });
    await expect(broker.handleGoogleCallback('code', gs)).rejects.toThrow();
  });

  it('throws when Google response has no id_token', async () => {
    const { broker } = makeBroker(SAMBA_CLAIMS);
    const gs = await primePending(broker);
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
      text: async () => '',
    });
    await expect(broker.handleGoogleCallback('code', gs)).rejects.toThrow();
  });
});

describe('GoogleOAuthBroker token exchange + verification', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ id_token: 'fake-google-id-token' }),
      text: async () => '',
    }));
    vi.stubGlobal('fetch', fetchSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function fullFlowToCode(broker: GoogleOAuthBroker): Promise<string> {
    const client = makeClient();
    const redirectSpy = vi.fn();
    const res = { redirect: redirectSpy } as unknown as Response;
    await broker.authorize(client, AUTH_PARAMS, res);
    const gs = new URL(redirectSpy.mock.calls[0]![0] as string).searchParams.get('state')!;
    const redirectUrl = await broker.handleGoogleCallback('google-auth-code', gs);
    return new URL(redirectUrl).searchParams.get('code')!;
  }

  it('exchangeAuthorizationCode returns Bearer token; verifyAccessToken exposes email', async () => {
    const { broker } = makeBroker(SAMBA_CLAIMS);
    const client = makeClient();
    const code = await fullFlowToCode(broker);

    const tokens = await broker.exchangeAuthorizationCode(client, code, undefined, undefined);
    expect(tokens.token_type).toBe('Bearer');
    expect(tokens.access_token.startsWith('at_')).toBe(true);
    expect(tokens.expires_in).toBe(3600);
    expect(tokens.scope).toBe('openid email');
    expect(tokens.refresh_token).toBeUndefined();

    const authInfo = await broker.verifyAccessToken(tokens.access_token);
    expect(authInfo.clientId).toBe('mcp-client-1');
    expect(authInfo.scopes).toEqual(['openid', 'email']);
    expect(authInfo.extra?.email).toBe('sid@samba.tv');

    expect(await broker.getEmailForToken(tokens.access_token)).toBe('sid@samba.tv');
  });

  it('exchangeAuthorizationCode is one-time use', async () => {
    const { broker } = makeBroker(SAMBA_CLAIMS);
    const client = makeClient();
    const code = await fullFlowToCode(broker);

    await broker.exchangeAuthorizationCode(client, code, undefined, undefined);
    await expect(
      broker.exchangeAuthorizationCode(client, code, undefined, undefined)
    ).rejects.toThrow();
  });

  it('exchangeAuthorizationCode rejects client_id mismatch', async () => {
    const { broker } = makeBroker(SAMBA_CLAIMS);
    const code = await fullFlowToCode(broker);
    const otherClient = makeClient({ client_id: 'other-client' });
    await expect(
      broker.exchangeAuthorizationCode(otherClient, code, undefined, undefined)
    ).rejects.toThrow();
  });

  it('verifyAccessToken throws on unknown token', async () => {
    const { broker } = makeBroker(SAMBA_CLAIMS);
    await expect(broker.verifyAccessToken('at_unknown')).rejects.toThrow();
  });

  it('verifyAccessToken throws on expired token (and evicts it)', async () => {
    const { broker } = makeBroker(SAMBA_CLAIMS);
    const client = makeClient();
    const code = await fullFlowToCode(broker);
    const tokens = await broker.exchangeAuthorizationCode(client, code, undefined, undefined);

    // Force-expire by rewinding the stored expiry.
    const nowS = Math.floor(Date.now() / 1000);
    vi.spyOn(Date, 'now').mockReturnValue((nowS + 7200) * 1000);

    await expect(broker.verifyAccessToken(tokens.access_token)).rejects.toThrow();
    // Evicted: still throws (and email lookup gone).
    expect(await broker.getEmailForToken(tokens.access_token)).toBeUndefined();
    vi.restoreAllMocks();
  });

  it('exchangeRefreshToken is unsupported', async () => {
    const { broker } = makeBroker(SAMBA_CLAIMS);
    const client = makeClient();
    await expect(broker.exchangeRefreshToken(client, 'rt_anything')).rejects.toThrow();
  });

  it('revokeToken removes the access token (best-effort)', async () => {
    const { broker } = makeBroker(SAMBA_CLAIMS);
    const client = makeClient();
    const code = await fullFlowToCode(broker);
    const tokens = await broker.exchangeAuthorizationCode(client, code, undefined, undefined);

    await broker.revokeToken(client, { token: tokens.access_token });
    await expect(broker.verifyAccessToken(tokens.access_token)).rejects.toThrow();
  });

  it('skipLocalPkceValidation is false', () => {
    const { broker } = makeBroker();
    expect(broker.skipLocalPkceValidation).toBe(false);
  });
});
