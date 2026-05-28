import { describe, it, expect, vi, beforeEach } from 'vitest';
import { jwtVerify } from 'jose';

// Mirror the established jose-mocking pattern from middleware.test.ts:
// createRemoteJWKSet returns a sentinel; jwtVerify is a mock we drive per-case.
vi.mock('jose', () => ({
  createRemoteJWKSet: vi.fn(() => 'mock-jwks'),
  jwtVerify: vi.fn(),
}));

const GOOGLE_CLIENT_ID = 'client-abc.apps.googleusercontent.com';
const HOSTED_DOMAIN = 'samba.tv';

function makeValidPayload(overrides: Record<string, unknown> = {}) {
  return {
    iss: 'https://accounts.google.com',
    aud: GOOGLE_CLIENT_ID,
    sub: 'google-user-123',
    email: 'sid@samba.tv',
    email_verified: true,
    name: 'Sid Dani',
    hd: 'samba.tv',
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
    ...overrides,
  };
}

describe('GoogleWorkspaceVerifier', () => {
  beforeEach(() => {
    (jwtVerify as any).mockReset();
  });

  describe('constructor', () => {
    it('throws when googleClientId is empty', async () => {
      const { GoogleWorkspaceVerifier } = await import('../google-verifier.js');
      expect(
        () => new GoogleWorkspaceVerifier({ googleClientId: '', hostedDomain: HOSTED_DOMAIN })
      ).toThrow();
    });

    it('throws when hostedDomain is empty', async () => {
      const { GoogleWorkspaceVerifier } = await import('../google-verifier.js');
      expect(
        () => new GoogleWorkspaceVerifier({ googleClientId: GOOGLE_CLIENT_ID, hostedDomain: '' })
      ).toThrow();
    });
  });

  it('returns claims with email for a valid @samba.tv token', async () => {
    (jwtVerify as any).mockResolvedValueOnce({ payload: makeValidPayload() });

    const { GoogleWorkspaceVerifier } = await import('../google-verifier.js');
    const verifier = new GoogleWorkspaceVerifier({
      googleClientId: GOOGLE_CLIENT_ID,
      hostedDomain: HOSTED_DOMAIN,
    });
    const claims = await verifier.verify('valid-token');

    expect(claims).not.toBeNull();
    expect(claims?.email).toBe('sid@samba.tv');
    expect(claims?.hd).toBe('samba.tv');
    expect(claims?.sub).toBe('google-user-123');

    // jose called with RS256, both Google issuers, configured audience, required claims
    expect(jwtVerify).toHaveBeenCalledWith(
      'valid-token',
      'mock-jwks',
      expect.objectContaining({
        issuer: ['https://accounts.google.com', 'accounts.google.com'],
        audience: GOOGLE_CLIENT_ID,
        algorithms: ['RS256'],
        requiredClaims: ['exp', 'iat', 'iss', 'aud'],
      })
    );
  });

  it('returns null when iss is wrong (jose rejects)', async () => {
    // jose enforces issuer; a wrong iss surfaces as a thrown claim-validation error.
    (jwtVerify as any).mockRejectedValueOnce(new Error('JWTClaimValidationFailed: iss'));

    const { GoogleWorkspaceVerifier } = await import('../google-verifier.js');
    const verifier = new GoogleWorkspaceVerifier({
      googleClientId: GOOGLE_CLIENT_ID,
      hostedDomain: HOSTED_DOMAIN,
    });
    expect(await verifier.verify('wrong-iss-token')).toBeNull();
  });

  it('returns null when aud is wrong (jose rejects)', async () => {
    (jwtVerify as any).mockRejectedValueOnce(new Error('JWTClaimValidationFailed: aud'));

    const { GoogleWorkspaceVerifier } = await import('../google-verifier.js');
    const verifier = new GoogleWorkspaceVerifier({
      googleClientId: GOOGLE_CLIENT_ID,
      hostedDomain: HOSTED_DOMAIN,
    });
    expect(await verifier.verify('wrong-aud-token')).toBeNull();
  });

  it('returns null when hd claim is missing', async () => {
    (jwtVerify as any).mockResolvedValueOnce({
      payload: makeValidPayload({ hd: undefined }),
    });

    const { GoogleWorkspaceVerifier } = await import('../google-verifier.js');
    const verifier = new GoogleWorkspaceVerifier({
      googleClientId: GOOGLE_CLIENT_ID,
      hostedDomain: HOSTED_DOMAIN,
    });
    expect(await verifier.verify('no-hd-token')).toBeNull();
  });

  it('returns null when hd is not the configured hosted domain', async () => {
    (jwtVerify as any).mockResolvedValueOnce({
      payload: makeValidPayload({ hd: 'evil.com', email: 'attacker@evil.com' }),
    });

    const { GoogleWorkspaceVerifier } = await import('../google-verifier.js');
    const verifier = new GoogleWorkspaceVerifier({
      googleClientId: GOOGLE_CLIENT_ID,
      hostedDomain: HOSTED_DOMAIN,
    });
    expect(await verifier.verify('wrong-hd-token')).toBeNull();
  });

  it('returns null when the token is expired (jose rejects)', async () => {
    (jwtVerify as any).mockRejectedValueOnce(new Error('JWTExpired'));

    const { GoogleWorkspaceVerifier } = await import('../google-verifier.js');
    const verifier = new GoogleWorkspaceVerifier({
      googleClientId: GOOGLE_CLIENT_ID,
      hostedDomain: HOSTED_DOMAIN,
    });
    expect(await verifier.verify('expired-token')).toBeNull();
  });

  it('returns null on bad signature (jose rejects) and never throws', async () => {
    (jwtVerify as any).mockRejectedValueOnce(new Error('JWSSignatureVerificationFailed'));

    const { GoogleWorkspaceVerifier } = await import('../google-verifier.js');
    const verifier = new GoogleWorkspaceVerifier({
      googleClientId: GOOGLE_CLIENT_ID,
      hostedDomain: HOSTED_DOMAIN,
    });
    await expect(verifier.verify('bad-sig-token')).resolves.toBeNull();
  });
});
