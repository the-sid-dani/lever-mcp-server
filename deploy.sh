#!/bin/bash

echo "🚀 Deploying Lever MCP Server to Cloudflare..."

# Check if logged in
echo "🔐 Checking Cloudflare authentication..."
if ! npx wrangler whoami &> /dev/null; then
    echo "Please log in to Cloudflare:"
    npx wrangler login
fi

# Set Lever API key
echo "🔑 Setting Lever API key..."
echo "Enter your Lever API key:"
read -s LEVER_API_KEY
npx wrangler secret put LEVER_API_KEY <<< "$LEVER_API_KEY"

# Deploy
echo "🌐 Deploying to Cloudflare Workers..."
npx wrangler deploy

echo "✅ Deployment complete!"
echo ""
echo "Your Lever MCP server is now live!"
echo "Share the URL shown above with your clients."
echo ""
echo "Client setup instructions:"
echo "1. Install: npm install -g @modelcontextprotocol/mcp-remote"
echo "2. Add to Claude config:"
echo '   {
     "mcpServers": {
       "lever-ats": {
         "command": "npx",
         "args": ["mcp-remote", "https://YOUR-URL/sse"]
       }
     }
   }'