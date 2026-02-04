import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import type { Response, NextFunction } from 'express';

// Store original env
const originalEnv = { ...process.env };

describe('bearerAuth middleware', () => {
  // We need to mock jose before importing the middleware
  // Using dynamic imports to handle this

  beforeAll(() => {
    process.env.AUTH0_ISSUER_URL = 'https://test-tenant.auth0.com';
    process.env.AUTH0_AUDIENCE = 'https://test-api.example.com';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('without mocking jose (basic auth header checks)', () => {
    it('returns 401 with WWW-Authenticate when no token provided', async () => {
      // Dynamic import to get fresh module
      const { bearerAuth } = await import('../middleware.js');

      const mockReq = {
        headers: {},
        protocol: 'https',
        get: vi.fn((header: string) => (header === 'host' ? 'example.com' : undefined)),
      };

      const jsonSpy = vi.fn();
      const headerSpy = vi.fn().mockReturnThis();
      const statusSpy = vi.fn(() => ({
        header: headerSpy,
        json: jsonSpy,
      }));

      const mockRes = {
        status: statusSpy,
        header: headerSpy,
        json: jsonSpy,
      } as unknown as Response;

      const mockNext = vi.fn();

      await bearerAuth(mockReq as any, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(headerSpy).toHaveBeenCalledWith(
        'WWW-Authenticate',
        expect.stringContaining('resource_metadata=')
      );
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'unauthorized',
        message: 'Bearer token required',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('returns 401 when Authorization header is not Bearer', async () => {
      const { bearerAuth } = await import('../middleware.js');

      const mockReq = {
        headers: { authorization: 'Basic abc123' },
        protocol: 'https',
        get: vi.fn((header: string) => (header === 'host' ? 'example.com' : undefined)),
      };

      const jsonSpy = vi.fn();
      const headerSpy = vi.fn().mockReturnThis();
      const statusSpy = vi.fn(() => ({
        header: headerSpy,
        json: jsonSpy,
      }));

      const mockRes = {
        status: statusSpy,
        header: headerSpy,
        json: jsonSpy,
      } as unknown as Response;

      const mockNext = vi.fn();

      await bearerAuth(mockReq as any, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});

describe('validateRequestAuth', () => {
  beforeAll(() => {
    process.env.AUTH0_ISSUER_URL = 'https://test-tenant.auth0.com';
    process.env.AUTH0_AUDIENCE = 'https://test-api.example.com';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns error when no authorization header', async () => {
    const { validateRequestAuth } = await import('../middleware.js');
    const result = await validateRequestAuth({ headers: {} } as any);

    expect(result).toEqual({
      valid: false,
      error: 'Bearer token required',
    });
  });

  it('returns error when authorization is not Bearer', async () => {
    const { validateRequestAuth } = await import('../middleware.js');
    const result = await validateRequestAuth({
      headers: { authorization: 'Basic abc' },
    } as any);

    expect(result).toEqual({
      valid: false,
      error: 'Bearer token required',
    });
  });
});

describe('getProtectedResourceMetadata', () => {
  beforeAll(() => {
    process.env.AUTH0_ISSUER_URL = 'https://test-tenant.auth0.com';
    process.env.AUTH0_AUDIENCE = 'https://test-api.example.com';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns valid RFC 9728 metadata', async () => {
    const { getProtectedResourceMetadata } = await import('../metadata.js');

    const metadata = getProtectedResourceMetadata('https://lever-mcp.example.com');

    expect(metadata).toEqual({
      resource: 'https://lever-mcp.example.com',
      authorization_servers: ['https://test-tenant.auth0.com'],
      bearer_methods_supported: ['header'],
      scopes_supported: ['openid', 'profile', 'email'],
    });
  });
});

describe('isOAuthEnabled', () => {
  it('returns true when both env vars are set', async () => {
    process.env.AUTH0_ISSUER_URL = 'https://test.auth0.com';
    process.env.AUTH0_AUDIENCE = 'https://api.example.com';

    // Need to reimport to pick up new env
    vi.resetModules();
    const { isOAuthEnabled } = await import('../constants.js');

    expect(isOAuthEnabled()).toBe(true);
  });

  it('returns false when issuer is missing', async () => {
    delete process.env.AUTH0_ISSUER_URL;
    process.env.AUTH0_AUDIENCE = 'https://api.example.com';

    vi.resetModules();
    const { isOAuthEnabled } = await import('../constants.js');

    expect(isOAuthEnabled()).toBe(false);
  });

  it('returns false when audience is missing', async () => {
    process.env.AUTH0_ISSUER_URL = 'https://test.auth0.com';
    delete process.env.AUTH0_AUDIENCE;

    vi.resetModules();
    const { isOAuthEnabled } = await import('../constants.js');

    expect(isOAuthEnabled()).toBe(false);
  });
});
