# Lever MCP Server - Technical Blueprint for AI Implementation

## 1. Project Overview
Build an MCP server that integrates Lever ATS with Claude Desktop, enabling recruiters to use natural language commands.

## 2. Core Architecture

### Required Dependencies
```bash
pip install "mcp[cli]" aiohttp python-dotenv
```

### Project Structure
```
lever_mcp_server/
├── server.py       # Main MCP server with tool definitions
├── client.py       # Async Lever API client with rate limiting
├── .env           # LEVER_API_KEY=your_key_here
└── requirements.txt
```

## 3. Lever API Reference
- **Base URL**: `https://api.lever.co/v1`
- **Auth**: Bearer token in header: `Authorization: Bearer {API_KEY}`
- **Rate Limit**: 10 req/sec (implement 8 req/sec to be safe)
- **Pagination**: Use `offset` parameter, check `hasNext` in response
- **Docs**: https://hire.lever.co/developer/documentation

### Key Endpoints Needed
```
GET /opportunities           # Search candidates
GET /opportunities/{id}      # Get candidate details
POST /opportunities/{id}/stage     # Move candidate stage
POST /opportunities/{id}/notes     # Add notes
POST /opportunities/{id}/interviews # Schedule interviews
POST /opportunities/{id}/feedback  # Submit feedback
GET /postings               # List job postings
GET /stages                 # Get available stages
GET /archive_reasons        # Get archive reasons
```

## 4. Essential Tools to Implement

### Must-Have Tools (Priority 1)
1. **lever_search_candidates** - Search with query parameter
2. **lever_get_candidate** - Get by opportunity ID
3. **lever_add_note** - Add note to candidate
4. **lever_schedule_interview** - Create interview
5. **lever_submit_feedback** - Add interview feedback
6. **lever_list_open_roles** - Get published postings
7. **lever_archive_candidate** - Archive with reason

### High-Value Tools (Priority 2)
9. **lever_find_candidates_for_role** - Search by posting ID
10. **lever_apply_to_role** - Create application
11. **lever_bulk_add_note** - Add notes to multiple candidates
12. **lever_get_pipeline_status** - Group candidates by stage

## 5. Implementation Pattern

### Basic Tool Structure
```python
from mcp.server.fastmcp import FastMCP
import aiohttp
import asyncio
import os
import json

mcp = FastMCP("Lever ATS")

@mcp.tool()
async def lever_search_candidates(
    query: str,
    stage: str = None,
    limit: int = 25
) -> dict:
    """Search for candidates - implements GET /opportunities"""
    # 1. Build params dict with query, stage, limit
    # 2. Make API call with rate limiting
    # 3. Format response with candidate name, stage, location
    # 4. Return MCP response format
```

### Rate Limiter Pattern
```python
class AsyncLeverClient:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.lever.co/v1"
        self.rate_limiter = asyncio.Semaphore(8)  # 8 req/sec
```

### Error Handling Pattern
```python
try:
    # API call
    return {"content": [{"type": "text", "text": json.dumps(result)}]}
except Exception as e:
    return {"isError": True, "content": [{"type": "text", "text": str(e)}]}
```

## 6. Claude Desktop Integration

### Config Location
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

### Config Format
```json
{
  "mcpServers": {
    "lever-ats": {
      "command": "python",
      "args": ["/absolute/path/to/server.py"],
      "env": {
        "LEVER_API_KEY": "your_lever_api_key"
      }
    }
  }
}
```

## 7. Key Implementation Notes

### Pagination Handling
- Lever returns max 100 records per request
- Check `hasNext` boolean in response
- Use `offset` from response for next page
- Implement auto-pagination for "get all" operations

### Natural Language Processing
- Parse company names from queries (e.g., "from Google" → add to search)
- Extract time ranges (e.g., "last week" → calculate timestamp)
- Map common terms to API fields (e.g., "phone screen" → stage ID)

### Response Formatting
- Always return JSON with proper formatting
- Include count and hasMore indicators
- Format dates as readable strings
- Limit arrays to reasonable size (10-25 items)

## 8. Testing Checklist
1. API connection with valid key
2. Search returns results
3. Rate limiting prevents 429 errors
4. Pagination works for large result sets
5. Error messages are user-friendly
6. All tools show in Claude Desktop

## 9. Example User Interactions
```
"Find senior engineers from Google or Meta"
→ lever_search_candidates(query="Google OR Meta senior engineer")

"Show pipeline for Product Manager role"
→ lever_find_candidates_for_role(role_name="Product Manager")
```

## 10. Build Instructions for AI

1. **Start with** basic server.py implementing lever_search_candidates
2. **Add** rate-limited API client
3. **Implement** one tool at a time, testing each
4. **Use** Lever API docs for exact field names and formats
5. **Follow** MCP response format: `{"content": [{"type": "text", "text": "..."}]}`
6. **Test** with Claude Desktop after implementing 3-4 tools
7. **Add** remaining tools based on priority list

The AI should refer to:
- Lever API docs: https://hire.lever.co/developer/documentation
- MCP docs: https://github.com/modelcontextprotocol/servers
- This blueprint for architecture and patterns

This gives the AI everything needed to build a working MCP server without overwhelming detail.