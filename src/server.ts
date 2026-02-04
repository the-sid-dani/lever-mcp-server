/**
 * Lever MCP Server - Cloud Run Entry Point
 *
 * This is the main entry point for the Cloud Run deployment.
 * Uses the MCP SDK's StreamableHTTP transport with OAuth 2.1 authentication.
 */

import express, { Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { registerAllTools } from "./tools.js";
import {
	validateRequestAuth,
	getProtectedResourceMetadata,
	OAUTH_CONFIG,
	validateOAuthConfig,
	isOAuthEnabled,
} from "./auth/index.js";

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

// Store active transports by session ID
const transports = new Map<string, StreamableHTTPServerTransport>();

// Health check endpoint (required for Cloud Run)
app.get("/health", (_req: Request, res: Response) => {
	res.status(200).json({
		status: "healthy",
		service: "lever-mcp-server",
		version: "2.0.0",
		activeSessions: transports.size,
		oauthEnabled: isOAuthEnabled(),
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
		version: "2.0.0",
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
		version: "2.0.0",
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
	// OAuth authentication check (when enabled)
	if (isOAuthEnabled()) {
		const authResult = await validateRequestAuth(req);
		if (!authResult.valid) {
			const resourceMetadataUrl = getResourceMetadataUrl(req);
			res
				.status(401)
				.header("WWW-Authenticate", `Bearer resource_metadata="${resourceMetadataUrl}"`)
				.json({ error: "unauthorized", message: authResult.error });
			return;
		}
		// Log authenticated user for audit trail
		console.log(`[MCP] Authenticated user: ${authResult.user.email || authResult.user.sub}`);
	}

	// Check for existing session
	const sessionId = req.headers["mcp-session-id"] as string | undefined;
	let transport: StreamableHTTPServerTransport;

	if (sessionId && transports.has(sessionId)) {
		// Reuse existing transport
		transport = transports.get(sessionId)!;
	} else if (!sessionId && req.method === "POST") {
		// New session - create transport and server
		transport = new StreamableHTTPServerTransport({
			sessionIdGenerator: () => randomUUID(),
		});

		// Create and connect MCP server
		const server = createMcpServer();
		await server.connect(transport);

		// Store transport for session reuse
		const newSessionId = transport.sessionId;
		if (newSessionId) {
			transports.set(newSessionId, transport);

			// Clean up on close
			transport.onclose = () => {
				transports.delete(newSessionId);
				console.log(`[MCP] Session closed: ${newSessionId}`);
			};

			console.log(`[MCP] New session: ${newSessionId}`);
		}
	} else {
		// Invalid request
		res.status(400).json({ error: "Invalid session or request" });
		return;
	}

	// Handle the request
	try {
		await transport.handleRequest(req, res, req.body);
	} catch (error) {
		console.error("[MCP] Error handling request:", error);
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
	const authMode = isOAuthEnabled() ? "OAuth 2.1 (Auth0)" : "Cloud Run IAM";
	console.log(`
╔════════════════════════════════════════════════════════════╗
║             LEVER MCP SERVER v2.0.0                        ║
╠════════════════════════════════════════════════════════════╣
║  Status:    Running                                        ║
║  Port:      ${PORT.toString().padEnd(45)}║
║  Auth:      ${authMode.padEnd(44)}║
╠════════════════════════════════════════════════════════════╣
║  Endpoints:                                                ║
║    GET  /health                  - Health check            ║
║    GET  /.well-known/oauth-...   - OAuth metadata          ║
║    ALL  /mcp                     - MCP Streamable HTTP     ║
╚════════════════════════════════════════════════════════════╝
	`);
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
