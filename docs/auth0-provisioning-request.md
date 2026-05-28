# IT Request — Provision Auth0 Tenant + Application for Lever MCP Server

**Requestor:** Sid Dani (Lead AI Product Engineer, AI Task Force)
**Jira:** ATF-478 (M0b — Auth0 IT gate, under Epic ATF-476)
**Priority:** Blocks multi-user rollout of the Lever MCP Server (currently single-tenant)

---

## What this is for

The Lever MCP Server lets Samba employees drive Lever ATS workflows from Claude (search candidates, read/leave feedback, manage interviews). It runs on GCP Cloud Run. To let any @samba.tv employee connect it through Claude's MCP connector — instead of every write being attributed to one shared service account — the server needs to authenticate each user via OAuth 2.1.

Claude's MCP connector flow has two hard requirements that **plain Google OAuth cannot satisfy**: RFC 8707 resource indicators and Dynamic Client Registration. Auth0 supports both, fronting Google Workspace as the identity provider. Hence this request.

```
Claude  →  Auth0 (OAuth 2.1 Authorization Server)  →  Google Workspace SSO (@samba.tv)  →  Lever MCP Server
```

## What I'm asking IT to do

Provision an **Auth0 tenant** (or an Application within Samba's existing Auth0 org, if one exists) configured exactly as below, and return the **issuer URL** and **API audience identifier** so I can wire them into the Cloud Run service.

### API (Resource Server)

| Setting | Value |
|---|---|
| API Identifier (audience) | `https://lever-mcp-201626763325.us-central1.run.app` |
| Signing algorithm | RS256 |
| Access-token lifetime | 12 hours |

### Application (Client)

| Setting | Value |
|---|---|
| Application type | Regular Web Application — public client (PKCE) |
| Grant types | Authorization Code, Refresh Token |
| PKCE method | S256 (mandatory) |
| **Dynamic Client Registration (DCR)** | **Enabled** — allows Claude.ai to self-register as a client without manual setup |
| Database (username/password) connection | **Disabled** for this app |

### Identity provider

| Setting | Value |
|---|---|
| Google Workspace Enterprise Connection | **Sole IdP**, domain-restricted to `samba.tv` |
| Post-Login Action | Reject any login where the email domain is not `@samba.tv` (defense in depth) |
| Token claims to include | `email`, `email_verified`, `hd`, `name`, `sub` |

### ⚠️ Two tenant-level toggles that are OFF by default and WILL silently break Claude

These are the most common failure points — please confirm both are set:

1. **Resource Parameter Compatibility Profile — ENABLED**
   (RFC 8707 resource indicators. Off by default in Auth0. Without it, Claude's audience-bound token request is ignored and tokens fail validation.)

2. **`authorization_response_iss_parameter_supported` = `true`**
   (RFC 9207 issuer parameter. Off by default; set via the Auth0 Management API on the tenant settings. Without it, Claude's connector cannot verify the issuer and rejects the response.)

## What I need back from IT

1. **Issuer URL** — e.g. `https://samba.us.auth0.com/` (becomes `AUTH0_ISSUER_URL`)
2. **API audience** — confirmation it is set to the Cloud Run URL above (becomes `AUTH0_AUDIENCE`)
3. Confirmation the Google Workspace connection is the sole, domain-restricted IdP
4. Confirmation the two ⚠️ toggles above are enabled

## What I'll do once delivered (no further IT involvement)

1. Store `AUTH0_ISSUER_URL` + `AUTH0_AUDIENCE` in GCP Secret Manager (project `ai-workflows-459123`).
2. Redeploy the Cloud Run service — the server auto-enables OAuth when both are present.
3. Run the OAuth smoke test (M0b), then add the connector in Claude and log in with my @samba.tv Google account to verify end to end.

## Acceptance criteria

- [ ] A user with an @samba.tv Google account can complete the OAuth login through Claude's connector.
- [ ] A user without an @samba.tv account is rejected at the Google Workspace / Post-Login Action layer.
- [ ] Tokens issued carry the `email` claim (used to attribute each Lever write to the correct user).
- [ ] Both RFC 8707 and RFC 9207 toggles confirmed enabled.

---

*Open question for IT: does Samba already have an Auth0 org/contract? If our SSO stack is Okta or Google-direct and Auth0 would be a net-new vendor, flag it — we'll discuss whether to procure Auth0 or pivot the auth broker.*
