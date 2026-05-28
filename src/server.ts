/**
 * Lever MCP Server - Cloud Run Entry Point
 *
 * This is the main entry point for the Cloud Run deployment.
 * Uses the MCP SDK's StreamableHTTP transport with OAuth 2.1 authentication.
 */

import express, { Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { mcpAuthRouter } from "@modelcontextprotocol/sdk/server/auth/router.js";
import { registerAllTools } from "./tools.js";
import {
	getProtectedResourceMetadata,
	OAUTH_CONFIG,
	validateOAuthConfig,
	isOAuthEnabled,
	GoogleOAuthBroker,
} from "./auth/index.js";
import { logger } from "./utils/logger.js";

const require = createRequire(import.meta.url);
const pkg = require("../package.json");
const SERVER_VERSION = pkg.version as string;

// Configuration
const PORT = parseInt(process.env.PORT || "8080", 10);
const LEVER_API_KEY = process.env.LEVER_API_KEY;

// MCP Protocol Version
const MCP_PROTOCOL_VERSION = "2025-06-18";

// Validate required environment variables
if (!LEVER_API_KEY) {
	console.error("ERROR: LEVER_API_KEY environment variable is required");
	process.exit(1);
}

// Validate OAuth config (warns if not set)
validateOAuthConfig();

// Create Express app
const app = express();
app.use(express.json());

// CORS middleware for Claude.ai
app.use((req: Request, res: Response, next: NextFunction) => {
	const origin = req.headers.origin;
	if (origin && OAUTH_CONFIG.corsOrigins.includes(origin)) {
		res.setHeader("Access-Control-Allow-Origin", origin);
		res.setHeader("Access-Control-Allow-Credentials", "true");
		res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, HEAD");
		res.setHeader(
			"Access-Control-Allow-Headers",
			"Content-Type, Authorization, MCP-Session-Id, MCP-Protocol-Version"
		);
	}

	// Handle preflight
	if (req.method === "OPTIONS") {
		res.status(204).end();
		return;
	}

	next();
});

// MCP Protocol Version header on all responses
app.use((_req: Request, res: Response, next: NextFunction) => {
	res.setHeader("MCP-Protocol-Version", MCP_PROTOCOL_VERSION);
	next();
});

// Google OAuth broker - self-enables ONLY when GOOGLE_OAUTH_CLIENT_ID + SECRET
// are set. Otherwise OAuth is disabled and the server falls back to Cloud Run
// IAM gating (LEVER_DEFAULT_USER_ID).
let broker: GoogleOAuthBroker | undefined;
if (isOAuthEnabled()) {
	const mcpPublicUrl = OAUTH_CONFIG.mcpPublicUrl;
	const googleRedirectUri = `${mcpPublicUrl.replace(/\/$/, "")}/oauth/google/callback`;
	broker = new GoogleOAuthBroker({
		googleClientId: OAUTH_CONFIG.googleClientId,
		googleClientSecret: OAUTH_CONFIG.googleClientSecret,
		googleRedirectUri,
		hostedDomain: OAUTH_CONFIG.hostedDomain,
		mcpPublicUrl,
	});

	// Serve standard MCP AS endpoints at the application root:
	//   /.well-known/oauth-authorization-server, /authorize, /token,
	//   /register, /revoke. MUST be mounted before the /mcp handler.
	app.use(
		mcpAuthRouter({
			provider: broker,
			issuerUrl: new URL(mcpPublicUrl),
			resourceServerUrl: new URL(mcpPublicUrl),
			scopesSupported: ["openid", "email"],
			// DCR (/register) and revocation (/revoke) are enabled by the
			// provider exposing clientsStore + revokeToken; no extra opts needed.
		}),
	);

	// Google OAuth callback - completes the broker round-trip and redirects
	// back to the MCP client with the minted authorization code.
	app.get("/oauth/google/callback", async (req: Request, res: Response) => {
		try {
			const url = await broker!.handleGoogleCallback(
				String(req.query.code),
				String(req.query.state),
			);
			res.redirect(url);
		} catch (e) {
			res.status(400).json({
				error: "invalid_request",
				error_description: String((e as Error).message),
			});
		}
	});
}

// Store active transports by session ID
const transports = new Map<string, StreamableHTTPServerTransport>();

// Health check endpoint (required for Cloud Run)
app.get("/health", (_req: Request, res: Response) => {
	res.status(200).json({
		status: "healthy",
		service: "lever-mcp-server",
		version: SERVER_VERSION,
		activeSessions: transports.size,
		oauthEnabled: isOAuthEnabled(),
	});
});

// Readiness check endpoint for dependency availability
app.get("/readyz", async (_req: Request, res: Response) => {
	const checks: { leverApiKey: string; googleJwks: string } = {
		leverApiKey: process.env.LEVER_API_KEY ? "ok" : "missing",
		googleJwks: "skipped",
	};

	if (isOAuthEnabled()) {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 2_000);

		try {
			const response = await fetch("https://www.googleapis.com/oauth2/v3/certs", {
				method: "HEAD",
				signal: controller.signal,
			});

			checks.googleJwks = response.ok ? "ok" : "degraded";
		} catch {
			checks.googleJwks = "degraded";
		} finally {
			clearTimeout(timeout);
		}
	}

	// Readiness gates on Lever API key only; Google JWKS is informational.
	const ready = checks.leverApiKey === "ok";
	res.status(ready ? 200 : 503).json({
		status: ready ? "ready" : "not_ready",
		checks,
	});
});

// RFC 9728 - OAuth 2.0 Protected Resource Metadata
app.get("/.well-known/oauth-protected-resource", (req: Request, res: Response) => {
	const protocol = req.headers["x-forwarded-proto"] || req.protocol;
	const host = req.headers["x-forwarded-host"] || req.get("host");
	const resourceUrl = `${protocol}://${host}`;
	res.json(getProtectedResourceMetadata(resourceUrl));
});

// HEAD endpoint for Claude.ai discovery
app.head("/", (_req: Request, res: Response) => {
	res.status(200).end();
});

// Root endpoint with service info
app.get("/", (_req: Request, res: Response) => {
	res.status(200).json({
		service: "Lever MCP Server",
		version: SERVER_VERSION,
		endpoints: {
			health: "/health",
			mcp: "/mcp",
			"oauth-metadata": "/.well-known/oauth-protected-resource",
		},
		documentation: "https://github.com/the-sid-dani/lever-mcp-server",
	});
});

// Create a new MCP server instance
function createMcpServer(): McpServer {
	const server = new McpServer({
		name: "Lever ATS",
		version: SERVER_VERSION,
	});

	// Register all Lever tools
	registerAllTools(server, LEVER_API_KEY!);

	return server;
}

// Helper to build resource metadata URL for WWW-Authenticate header
function getResourceMetadataUrl(req: Request): string {
	const protocol = req.headers["x-forwarded-proto"] || req.protocol;
	const host = req.headers["x-forwarded-host"] || req.get("host");
	return `${protocol}://${host}/.well-known/oauth-protected-resource`;
}

// MCP endpoint - handles all MCP protocol messages
app.all("/mcp", async (req: Request, res: Response) => {
	// OAuth authentication check (when enabled) - via the Google OAuth broker.
	if (isOAuthEnabled() && broker) {
		const authHeader = req.headers.authorization;
		const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
		if (!token) {
			const resourceMetadataUrl = getResourceMetadataUrl(req);
			res
				.status(401)
				.header("WWW-Authenticate", `Bearer resource_metadata="${resourceMetadataUrl}"`)
				.json({ error: "unauthorized", message: "Bearer token required" });
			return;
		}
		try {
			const authInfo = await broker.verifyAccessToken(token);
			// Audit trail: emit a non-PII line at info; the raw email (PII) is
			// gated behind debug so it is suppressed at the default level.
			logger.info("[MCP] authenticated request");
			logger.debug(`[MCP] authenticated user: ${authInfo.extra?.email}`);
		} catch (e) {
			const resourceMetadataUrl = getResourceMetadataUrl(req);
			res
				.status(401)
				.header("WWW-Authenticate", `Bearer resource_metadata="${resourceMetadataUrl}"`)
				.json({ error: "invalid_token", message: String((e as Error).message) });
			return;
		}
	}

	// Check for existing session
	const sessionId = req.headers["mcp-session-id"] as string | undefined;
	let transport: StreamableHTTPServerTransport;
	let isNewSession = false;

	if (sessionId && transports.has(sessionId)) {
		// Reuse existing transport
		transport = transports.get(sessionId)!;
	} else if (!sessionId && req.method === "POST") {
		// New session - create transport and server.
		// NOTE: In MCP SDK 1.29+, transport.sessionId is a lazy getter and
		// returns undefined until handleRequest() has run. So we cannot capture
		// the session ID immediately after construction — we capture it AFTER
		// handleRequest() resolves, in the try block below. (Pre-1.29 behavior
		// was synchronous; this is a v3-refactor regression fix.)
		isNewSession = true;
		transport = new StreamableHTTPServerTransport({
			sessionIdGenerator: () => randomUUID(),
		});

		// Create and connect MCP server
		const server = createMcpServer();
		await server.connect(transport);
	} else {
		// Invalid request
		res.status(400).json({ error: "Invalid session or request" });
		return;
	}

	// Handle the request
	try {
		await transport.handleRequest(req, res, req.body);

		// AFTER handleRequest, transport.sessionId is populated (lazy getter
		// resolves during handling). Capture + store for session reuse.
		if (isNewSession) {
			const newSessionId = transport.sessionId;
			if (newSessionId && !transports.has(newSessionId)) {
				transports.set(newSessionId, transport);

				// Clean up on close
				transport.onclose = () => {
					transports.delete(newSessionId);
					logger.debug(`[MCP] Session closed: ${newSessionId}`);
				};

				logger.debug(`[MCP] New session: ${newSessionId}`);
			}
		}
	} catch (error) {
		logger.error(`[MCP] Error handling request: ${(error as Error)?.message ?? "unknown"}`);
		if (!res.headersSent) {
			res.status(500).json({ error: "Internal server error" });
		}
	}
});

// Legacy SSE endpoint for compatibility
app.get("/sse", (_req: Request, res: Response) => {
	res.status(410).json({
		error: "SSE endpoint deprecated",
		message: "Use /mcp endpoint with Streamable HTTP transport",
		documentation: "https://spec.modelcontextprotocol.io/specification/basic/transports/#streamable-http",
	});
});

// Start server
app.listen(PORT, () => {
	console.log(
		JSON.stringify({
			event: "server_started",
			service: "lever-mcp-server",
			version: SERVER_VERSION,
			port: PORT,
			authMode: isOAuthEnabled() ? "OAuth 2.1 (Google broker)" : "Cloud Run IAM",
			endpoints: ["/health", "/.well-known/oauth-protected-resource", "/mcp"],
			mcpProtocolVersion: MCP_PROTOCOL_VERSION,
		}),
	);
});

// Graceful shutdown
process.on("SIGTERM", () => {
	console.log("SIGTERM received, shutting down gracefully...");
	// Close all active transports
	for (const [sessionId, transport] of transports) {
		console.log(`Closing session: ${sessionId}`);
		transport.close?.();
	}
	transports.clear();
	process.exit(0);
});

process.on("SIGINT", () => {
	console.log("SIGINT received, shutting down gracefully...");
	process.exit(0);
});
