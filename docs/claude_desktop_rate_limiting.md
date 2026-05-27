# Rate Limiting

## How It Works

The rate limiting is implemented entirely within the MCP server, making it completely transparent to Claude Desktop. Here's what happens:

### Architecture

```
Claude Desktop → MCP Protocol → Cloud Run (Lever MCP Server with Rate Limiting) → Lever API
```

### What Claude Desktop Sees

1. **Normal Operation**: Tools work exactly as before, just more reliably
2. **Under Heavy Load**: Requests automatically queue and wait for available rate limit tokens
3. **Rate Limit Hit**: Automatic retry with exponential backoff (invisible to user)

### Implementation Details

#### Token Bucket Algorithm
- **Capacity**: 15 tokens (allows burst requests)
- **Refill Rate**: 8 tokens/second (80% of Lever's limit for safety)
- **Automatic Queueing**: Requests wait for tokens automatically

#### 429 Error Handling
- **Automatic Retry**: Up to 3 retries with exponential backoff
- **Respect Retry-After**: Uses Lever's suggested wait time if provided
- **Max Wait**: 30 seconds before failing

### Benefits for Claude Desktop Users

1. **No Connection Errors**: Instead of "Connection closed", requests queue properly
2. **Reliable Searches**: Can search 1000 candidates without rate limit issues
3. **Concurrent Safety**: Multiple tools can run without overwhelming the API
4. **Transparent Operation**: No changes needed to how you use Claude Desktop

### Testing the Rate Limits

You can verify the rate limiting is working using the new test tool:

```
# Test sequential requests (should stay under 8 req/s)
test_rate_limits(requests=20, concurrent=false)

# Test concurrent requests (token bucket should manage the rate)
test_rate_limits(requests=20, concurrent=true)
```

Expected results:
- Sequential: ~2.5 seconds for 20 requests (8 req/s)
- Concurrent: Similar timing due to rate limiting
- Status: "✅ Within safe limits"

### Advanced Search with 1000 Candidates

With the new rate limiting:
- **10 API calls** (100 candidates each) = ~1.25 seconds
- **Additional processing time** for filtering
- **Total**: 3-5 seconds for comprehensive search
- **No rate limit errors** even with other operations running

### Example Usage in Claude Desktop

```
# This works exactly as before, but more reliably
lever_advanced_search(
  companies="Mindshare, OMD, GroupM",
  skills="programmatic, digital",
  locations="UK",
  limit=50
)
```

The rate limiting happens automatically behind the scenes!

### Monitoring

Watch the logs to see rate limiting in action:
```bash
gcloud logging read 'resource.type=cloud_run_revision AND resource.labels.service_name=lever-mcp' \
  --project=ai-workflows-459123 --limit=50 --format=json
```

You can also use Cloud Logging in the GCP console: https://console.cloud.google.com/logs with a service filter on `lever-mcp`.

You'll see:
- Token bucket managing request flow
- Automatic retries on 429 errors
- Consistent request spacing

### Configuration

Current settings (conservative for reliability):
- **8 requests/second** (vs Lever's 10 limit)
- **15 token burst capacity** (vs Lever's 20)
- **300ms min delay** for advanced search (extra safety)

These can be adjusted in `src/lever/client.ts` if needed. 
