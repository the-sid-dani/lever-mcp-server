# OAuth 2.1 with Auth0 - Deployment Complete

**Date:** 2026-02-03
**Status:** BLOCKED - Awaiting Auth0 tenant access

## Blocker

User needs access to `auth.samba.tv` Auth0 tenant to create the API.
Current GCP secrets point to this tenant, not the dev tenant `dev-y1ooczxi1swxlr85`.

## Deployment Details

- **Service URL:** `https://lever-mcp-201626763325.us-central1.run.app`
- **Revision:** `lever-mcp-00007-gvj`
- **Auth Mode:** OAuth 2.1 (Auth0)

## Verified Endpoints

| Endpoint | Status | Response |
|----------|--------|----------|
| GET /health | ✅ | `{"oauthEnabled":true}` |
| GET /.well-known/oauth-protected-resource | ✅ | RFC 9728 metadata |
| POST /mcp (no auth) | ✅ | 401 Unauthorized |

## GCP Secrets

| Secret | Value |
|--------|-------|
| `lever-api-key` | Lever API key |
| `auth0-issuer-url` | `https://auth.samba.tv` |
| `auth0-audience` | `https://lever-mcp-201626763325.us-central1.run.app` |

## Auth0 Configuration Required

**⚠️ User must update Auth0 API:**

1. Go to Auth0 Dashboard → Applications → APIs
2. Update or create API with identifier: `https://lever-mcp-201626763325.us-central1.run.app`
3. Set Default Audience to same URL in Settings → General

## Test Plan

1. **Claude.ai Connector Test:**
   - Add server URL in Claude.ai Settings → Connectors
   - Sign in with @samba.tv Google account
   - Verify OAuth flow completes
   - Test a Lever tool (e.g., search candidates)

2. **MCP Inspector Test:**
   ```bash
   npx @modelcontextprotocol/inspector@latest
   # Connect to: https://lever-mcp-201626763325.us-central1.run.app/mcp
   ```

## Rollback Procedure

If issues detected:
```bash
# List revisions
gcloud run revisions list --service=lever-mcp --region=us-central1

# Rollback to previous revision
gcloud run services update-traffic lever-mcp --region=us-central1 \
  --to-revisions=lever-mcp-00004-xxx=100
```

## Files Changed

- `src/auth/constants.ts` - OAuth configuration
- `src/auth/metadata.ts` - RFC 9728 metadata
- `src/auth/middleware.ts` - JWT validation
- `src/auth/types.ts` - TypeScript types
- `src/auth/index.ts` - Exports
- `src/auth/__tests__/middleware.test.ts` - Unit tests
- `src/server.ts` - Integrated OAuth middleware
- `cloudbuild.yaml` - Updated deployment config
- `vitest.config.ts` - Test infrastructure
- `package.json` - Added vitest, jose
