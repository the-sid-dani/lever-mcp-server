# Lever MCP Server

A MCP server that integrates Lever ATS with Claude Desktop and other MCP clients, enabling recruiters to manage their recruiting workflows through natural language commands. Built on Cloudflare Workers for global edge deployment.

## 🚀 Features

### 16 Recruiting Tools

**Search & Discovery**
- `lever_advanced_search` - Advanced candidate search with multiple filters
- `lever_find_by_company` - Find candidates from specific companies
- `lever_search_candidates` - Basic candidate search by name
- `lever_quick_find_candidate` - Quick candidate lookup (auto-limited to 100 results)
- `lever_find_candidates_for_role` - Find candidates for specific job postings
- `lever_find_candidate_in_posting` - Search within a specific job posting
- `lever_find_internal_referrals_for_role` - Find internal referrals

**Candidate Management**
- `lever_get_candidate` - Get detailed candidate information
- `lever_add_note` - Add notes to candidate profiles
- `lever_archive_candidate` - Archive candidates with reasons

**Application & File Management**
- `lever_list_applications` - List all applications for a candidate
- `lever_get_application` - Get specific application details
- `lever_list_files` - List candidate files and resumes

**Utility Tools**
- `lever_list_open_roles` - List all open job postings
- `lever_get_stages` - Get hiring pipeline stages
- `lever_get_archive_reasons` - Get available archive reasons

## 🏗️ Architecture

- **Cloudflare Workers**: Serverless edge deployment
- **TypeScript**: Full type safety with Lever API types
- **MCP Protocol**: Standard Model Context Protocol implementation
- **SSE Endpoint**: Server-sent events for real-time communication
- **Rate Limiting**: Built-in protection (respects Lever's 10 req/sec limit)

## 📋 Prerequisites

- [Cloudflare account](https://cloudflare.com)
- [Lever API key](https://hire.lever.co/settings/integrations)
- Node.js 18+ and npm
- [Wrangler CLI](https://developers.cloudflare.com/workers/cli-wrangler/install-update)

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/the-sid-dani/lever-mcp-server.git
   cd lever-mcp-server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Cloudflare**
   ```bash
   # Login to Cloudflare
   npx wrangler login
   
   # Set your Lever API key as a secret
   npx wrangler secret put LEVER_API_KEY
   # When prompted, paste your Lever API key
   ```

4. **Deploy to Cloudflare Workers**
   ```bash
   npm run deploy
   # or use the deployment script
   ./deploy.sh
   ```

   Your server will be deployed to: `https://lever-mcp-remote.<your-subdomain>.workers.dev`

## 🔌 Connecting to MCP Clients

### Claude Desktop

1. Install the MCP remote proxy:
   ```bash
   npm install -g mcp-remote
   ```

2. Open Claude Desktop and go to **Settings > Developer > Edit Config**

3. Add your server configuration:
   ```json
   {
     "mcpServers": {
       "lever-recruiting": {
         "command": "npx",
         "args": [
           "mcp-remote",
           "https://lever-mcp-remote.<your-subdomain>.workers.dev/sse"
         ]
       }
     }
   }
   ```

4. Restart Claude Desktop - you should see the Lever tools available!

### Cloudflare AI Playground

1. Go to [playground.ai.cloudflare.com](https://playground.ai.cloudflare.com/)
2. Enter your deployed MCP server URL: `https://lever-mcp-remote.<your-subdomain>.workers.dev/sse`
3. Start using your Lever tools directly from the playground!

## 💬 Usage Examples

Once connected to Claude Desktop, you can use natural language commands:

```
"Find all candidates from Google who applied for engineering roles"

"Show me candidates in the phone screen stage for the Senior Backend Engineer position"

"Add a note to John Doe's profile about our conversation today"

"List all open engineering positions"

"Archive this candidate with reason 'Position filled'"
```

## 🧑‍💻 Development

### Local Development
```bash
# Run local development server
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint:fix

# Code formatting
npm run format
```

### Testing with MCP Inspector
```bash
# Install MCP Inspector
npm install -g @modelcontextprotocol/inspector

# Connect to your local or deployed server
npx @modelcontextprotocol/inspector
# Enter: http://localhost:8787/sse (local)
# Or: https://lever-mcp-remote.<your-subdomain>.workers.dev/sse (deployed)
```

## 📁 Project Structure

```
├── src/
│   ├── index.ts              # Main server entry point
│   ├── lever/
│   │   └── client.ts         # Lever API client
│   ├── additional-tools.ts   # Extended tool implementations
│   └── types/
│       └── lever.ts          # TypeScript type definitions
├── wrangler.jsonc            # Cloudflare Workers configuration
├── deploy.sh                 # Deployment helper script
└── CLAUDE.md                 # Claude Code guidelines
```

## 🔒 Security

- API keys are stored as Cloudflare secrets (never in code)
- No authentication required for the MCP endpoint (add auth if needed for production)
- Rate limiting prevents API abuse
- All requests are logged for monitoring

## ⚠️ Known Limitations

1. **No Text Search on Opportunities**: Lever API limitation - name searches fetch candidates then filter client-side
2. **File Downloads**: Cannot download files through MCP - access through Lever web interface
3. **Limited Write Operations**: Can only add notes and archive candidates
4. **No Application Creation**: Cannot create new applications via API
5. **No Stage Changes**: Cannot move candidates between stages via API

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built with [Cloudflare Workers](https://workers.cloudflare.com/)
- Uses the [Model Context Protocol](https://modelcontextprotocol.io/)
- Integrates with [Lever ATS API](https://hire.lever.co/developer/documentation)