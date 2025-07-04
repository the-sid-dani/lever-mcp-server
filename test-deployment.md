# Testing Your Lever MCP Deployment

Your server is successfully deployed at:
**https://lever-mcp-remote.sid-dani.workers.dev**

## Quick Tests

### 1. Health Check
```bash
curl https://lever-mcp-remote.sid-dani.workers.dev/health
```
Should return: `OK`

### 2. Test with MCP Inspector
```bash
npx @modelcontextprotocol/inspector@latest
```
Then:
1. Open http://localhost:5173
2. Enter URL: `https://lever-mcp-remote.sid-dani.workers.dev/sse`
3. Click "Connect"
4. Click "List Tools" - you should see all Lever tools
5. Try a tool like "lever_list_open_roles"

### 3. Test with Claude Desktop

Add to your Claude config:
```json
{
  "mcpServers": {
    "lever-ats": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://lever-mcp-remote.sid-dani.workers.dev/sse"
      ]
    }
  }
}
```

Restart Claude and ask: "Can you list the open roles using Lever?"

## Monitoring Your Server

Watch live logs:
```bash
npx wrangler tail
```

## Your Server Details
- **URL**: https://lever-mcp-remote.sid-dani.workers.dev
- **SSE Endpoint**: https://lever-mcp-remote.sid-dani.workers.dev/sse
- **Health**: https://lever-mcp-remote.sid-dani.workers.dev/health

## Client Instructions
Share this with your clients:

1. Install proxy: `npm install -g @modelcontextprotocol/mcp-remote`
2. Add to Claude config:
   ```json
   {
     "mcpServers": {
       "lever-ats": {
         "command": "npx",
         "args": ["mcp-remote", "https://lever-mcp-remote.sid-dani.workers.dev/sse"]
       }
     }
   }
   ```
3. Restart Claude Desktop