# MCP Server Tracing Guide

## Overview
This guide explains how to use the tracing features in the Lever MCP Server to debug issues and monitor performance.

## Trace Format
All traces follow this format:
```
[TRACE {trace-id}] [{timestamp}] {event} {data}
```

## Trace Events

### Initialization Events
- `INIT_START` - Server initialization begins
- `INIT_SKIPPED` - Init skipped (tools already registered)
- `INIT_CLIENT` - Lever client initialized
- `REGISTER_TOOLS_START` - Tool registration begins
- `REGISTER_TOOLS` - Tool registration phase complete
- `INIT_COMPLETE` - Initialization successful
- `INIT_ERROR` - Initialization failed

### Tool Execution Events
- `TOOL_START` - Tool execution begins
- `TOOL_SUCCESS` - Tool executed successfully
- `TOOL_ERROR` - Tool execution failed

## Viewing Traces

### 1. Using Wrangler Tail
```bash
npx wrangler tail --format=pretty
```

### 2. Using Cloudflare Dashboard
1. Log in to Cloudflare Dashboard
2. Go to Workers & Pages > Your Worker
3. Click on "Logs" tab
4. Use the search to filter by trace ID

### 3. Using Cloudflare Trace Tool
1. Go to Account Home > Trace
2. Enter your worker URL: `https://lever-mcp-remote.sid-dani.workers.dev/sse`
3. Configure request properties
4. Send trace to see the execution path

## Trace Data Fields

### Common Fields
- `trace_id` - Unique identifier for the trace
- `timestamp` - ISO 8601 timestamp
- `duration_ms` - Execution time in milliseconds

### Tool-Specific Fields
- `tool` - Name of the tool being executed
- `args` - Tool arguments (truncated for security)
- `result_preview` - Preview of the result (truncated)
- `error` - Error message if failed
- `stack` - Stack trace if available

## Performance Monitoring

Look for these patterns in traces:
- High `duration_ms` values indicate slow operations
- Multiple `INIT_START` events indicate double initialization
- `TOOL_ERROR` events show failed operations

## Example Trace Analysis

```
[TRACE 1738089480123-1-abc123] [2025-07-28T20:58:00.123Z] TOOL_START {"tool":"lever_recruiter_dashboard","args":"{\"owner_name\":\"ciarli bolden\"}"}
[TRACE 1738089480123-1-abc123] [2025-07-28T20:58:02.456Z] TOOL_SUCCESS {"tool":"lever_recruiter_dashboard","duration_ms":2333,"result_preview":"{\"recruiter\":\"ciarli bolden\",\"total_postings\":8}"}
```

This shows:
- Tool: `lever_recruiter_dashboard`
- Duration: 2.3 seconds
- Success with 8 postings found

## Debugging Tips

1. **Ghost Tools**: Look for multiple `INIT_START` events
2. **Performance**: Check `duration_ms` for slow operations
3. **Errors**: Look for `TOOL_ERROR` events with stack traces
4. **Rate Limits**: Watch for 429 errors in traces 