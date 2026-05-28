# Google OAuth Client Setup — Lever MCP (self-serve, no IT ticket)

The Lever MCP Server authenticates users by acting as its own OAuth 2.1 Authorization Server that federates to **Google Workspace** sign-in (mirrors the MSCI MCP). The only thing to provision is a **Google OAuth 2.0 Web Client** in the GCP project the service already runs in. No Auth0, no IT dependency.

> Architecture rationale: system-design.md §4 (auth model). This doc is the operator click-path.

## Prerequisites

- Access to GCP project **`ai-workflows-459123`** (Sid is owner).
- The project is under the **samba.tv** Google Cloud organization (so the OAuth consent screen can be set to *Internal*, which restricts sign-in to @samba.tv automatically).

## Step 1 — OAuth consent screen (one-time, if not already done)

GCP Console → **APIs & Services → OAuth consent screen**, in project `ai-workflows-459123`:

1. User type: **Internal** (only @samba.tv Workspace users can authorize — this is the primary domain gate).
2. App name: `Lever MCP Server`. Support email: `sid.dani@samba.tv`.
3. Scopes: `openid`, `email`, `profile` (non-sensitive — no verification needed).
4. Save.

## Step 2 — Create the OAuth 2.0 Client ID

GCP Console → **APIs & Services → Credentials → Create Credentials → OAuth client ID**:

| Field | Value |
|---|---|
| Application type | **Web application** |
| Name | `lever-mcp-web` |
| Authorized redirect URI | `https://lever-mcp-201626763325.us-central1.run.app/oauth/google/callback` |

Click Create. Copy the **Client ID** and **Client secret**.

> For local dev, also add `http://localhost:8095/oauth/google/callback` (or whichever port) as a second authorized redirect URI.

## Step 3 — Store the credentials as Cloud Run secrets

```bash
PROJECT=ai-workflows-459123

printf '%s' '<CLIENT_ID>'     | gcloud secrets create google-oauth-client-id     --project=$PROJECT --data-file=- 2>/dev/null \
  || printf '%s' '<CLIENT_ID>'     | gcloud secrets versions add google-oauth-client-id     --project=$PROJECT --data-file=-
printf '%s' '<CLIENT_SECRET>' | gcloud secrets create google-oauth-client-secret --project=$PROJECT --data-file=- 2>/dev/null \
  || printf '%s' '<CLIENT_SECRET>' | gcloud secrets versions add google-oauth-client-secret --project=$PROJECT --data-file=-
```

## Step 4 — Wire them into the Cloud Run service

The deploy config (`cloudbuild.yaml`) maps these to env vars on the `lever-mcp` service:

| Env var | Source |
|---|---|
| `GOOGLE_OAUTH_CLIENT_ID` | secret `google-oauth-client-id` |
| `GOOGLE_OAUTH_CLIENT_SECRET` | secret `google-oauth-client-secret` |
| `MCP_PUBLIC_URL` | `https://lever-mcp-201626763325.us-central1.run.app` (plain env) |
| `ALLOWED_HOSTED_DOMAIN` | `samba.tv` (plain env) |
| `OAUTH_ENABLED` | `true` |

Then `npm run deploy`. The broker enables itself when `GOOGLE_OAUTH_CLIENT_ID` is present.

## Step 5 — Verify

```bash
BASE=https://lever-mcp-201626763325.us-central1.run.app

# 1. Server advertises ITSELF as the authorization server:
curl -s $BASE/.well-known/oauth-authorization-server | python3 -m json.tool
#    expect issuer + /authorize + /token + /register on the lever URL

# 2. Unauthenticated /mcp is rejected:
curl -s -o /dev/null -w "%{http_code}\n" -X POST $BASE/mcp -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}'   # expect 401
```

Then in Claude: run `/mcp` → `lever` → authenticate → sign in with your @samba.tv Google account. A non-@samba.tv account must be rejected at the Google callback (`hd` check).

## What you are NOT doing

- No Auth0 tenant, app, or audience for the **login** path. (Auth0 stays relevant only for any future machine-to-machine calls to downstream Samba APIs — a separate concern.)
- No IT ticket. Every step above is self-serve in a project you own.
