# Lever MCP Remote Server - Deployment Instructions

## Quick Deployment

1. **Deploy to Cloudflare**:
   ```bash
   ./deploy.sh
   ```
   
   This will:
   - Log you into Cloudflare (if needed)
   - Set your Lever API key as a secret
   - Deploy the server to Cloudflare Workers

2. **Note your server URL** (shown after deployment)
   - It will be something like: `https://lever-mcp-remote.YOUR-SUBDOMAIN.workers.dev`

## Client Setup Instructions

Share these instructions with your clients:

### 1. Install the MCP Remote Proxy
```bash
npm install -g @modelcontextprotocol/mcp-remote
```

### 2. Update Claude Desktop Configuration

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

Add this configuration:
```json
{
  "mcpServers": {
    "lever-ats": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://lever-mcp-remote.YOUR-SUBDOMAIN.workers.dev/sse"
      ]
    }
  }
}
```

### 3. Restart Claude Desktop

After restarting, the Lever tools will be available in Claude!

## Available Tools

Your clients can now use these commands in Claude:

- **Search candidates**: "Find programmatic traders in the UK from Mindshare or OMD"
- **Get candidate details**: "Show me details for candidate [ID]"
- **Add notes**: "Add a note to candidate [ID] saying they interviewed well"
- **List open roles**: "Show me all open positions"
- **Find candidates for role**: "Find candidates for posting [ID]"
- **Archive candidates**: "Archive candidate [ID] with reason [REASON_ID]"

## Testing Your Deployment

1. **Test with MCP Inspector**:
   ```bash
   npx @modelcontextprotocol/inspector@latest
   ```
   Connect to: `https://lever-mcp-remote.YOUR-SUBDOMAIN.workers.dev/sse`

2. **Check health endpoint**:
   ```bash
   curl https://lever-mcp-remote.YOUR-SUBDOMAIN.workers.dev/health
   ```

## Monitoring

View logs:
```bash
npx wrangler tail
```

## Updating

To update the server:
1. Make changes to the code
2. Run `npx wrangler deploy` again

## Troubleshooting

- **Rate Limits**: The server implements automatic rate limiting
- **API Key Issues**: Re-run `npx wrangler secret put LEVER_API_KEY`
- **Connection Issues**: Ensure the `/sse` endpoint is included in the URL