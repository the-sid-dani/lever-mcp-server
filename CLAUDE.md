# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Cloudflare Workers-based MCP (Model Context Protocol) server that provides remote access to Lever ATS functionality. It exposes 16 recruiting tools through an SSE endpoint that can be accessed by Claude Desktop or other MCP clients via the mcp-remote proxy.

## Development Commands

```bash
# Install dependencies
npm install

# Run local development server
npm run dev
# or
npx wrangler dev

# Type checking
npm run type-check

# Code formatting
npm run format

# Linting
npm run lint:fix

# Deploy to Cloudflare
npm run deploy
# or use the deployment script
./deploy.sh
```

## Architecture

### Core Components

1. **src/index.ts** - Main entry point defining the LeverMCP class
   - Extends McpAgent from the agents library
   - Implements SSE/MCP endpoints for remote access
   - Handles routing: `/sse`, `/mcp`, `/health`
   - Initializes tools in `init()` method

2. **src/lever/client.ts** - HTTP client for Lever API
   - Handles authentication, rate limiting, and pagination
   - All API calls go through this client

3. **src/additional-tools.ts** - Extended tool definitions
   - Implements 7 additional tools to complete the 16-tool set
   - Includes quick search, file listing, and application management

4. **src/types/lever.ts** - TypeScript type definitions for Lever API responses

### Tool Organization

Tools are grouped into three categories in index.ts:
- **Search Tools**: `lever_advanced_search`, `lever_find_by_company`
- **Candidate Tools**: `lever_get_candidate`, `lever_add_note`, `lever_archive_candidate`
- **Utility Tools**: `lever_list_open_roles`, `lever_get_stages`, `lever_get_archive_reasons`, `lever_find_candidates_for_role`

Additional tools in additional-tools.ts:
- **Basic Search**: `lever_search_candidates`, `lever_quick_find_candidate`
- **Posting-specific**: `lever_find_candidate_in_posting`, `lever_find_internal_referrals_for_role`
- **File/Application Management**: `lever_list_files`, `lever_list_applications`, `lever_get_application`

### Key Implementation Details

1. **Rate Limiting**: Built into the Lever client (not visible in current code, likely in client.ts)
2. **Error Handling**: Each tool wraps responses in try-catch blocks
3. **Data Formatting**: `formatOpportunity()` standardizes candidate data for consistent output
4. **Pagination**: Handled automatically by the client with 100-item page limits
5. **Authentication**: Uses LEVER_API_KEY from Cloudflare secrets

### Deployment Configuration

- **wrangler.jsonc**: Cloudflare Workers configuration
  - Uses Durable Objects for stateful MCP connections
  - Node.js compatibility enabled
  - Observability enabled for monitoring

- **Environment**: Requires `LEVER_API_KEY` secret set via Wrangler

### Known Limitations

1. **No Text Search**: Lever API doesn't support query parameters on `/opportunities` endpoint
   - Name searches fetch candidates then filter client-side
   - Limited to 100-1000 candidates for performance

2. **File Access**: Files cannot be downloaded through MCP
   - Tools only list file metadata
   - Users must access files through Lever web interface

3. **No Write Operations for Applications**: 
   - Cannot create applications or change stages via API
   - Only notes and archiving are supported write operations

## Testing

Currently no automated tests. Manual testing process:
1. Deploy to Cloudflare Workers
2. Use MCP Inspector: `npx @modelcontextprotocol/inspector@latest`
3. Connect to: `https://lever-mcp-remote.YOUR-SUBDOMAIN.workers.dev/sse`
4. Test each tool with valid/invalid inputs

## Adding New Tools

To add a new tool:
1. Define it in the appropriate `register*Tools()` method in index.ts
2. Use `this.server.tool()` with Zod schema for parameters
3. Call the Lever API through `this.client`
4. Format responses consistently using `formatOpportunity()` or similar
5. Handle errors gracefully with informative messages