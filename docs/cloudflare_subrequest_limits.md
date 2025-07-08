# Cloudflare Workers Subrequest Limits

## The Issue

When running advanced searches, you may encounter a "Too many subrequests" error. This is a **Cloudflare Workers platform limitation**, not a Lever API rate limit.

### Cloudflare Workers Limits

| Plan | Subrequests per Request | Cost |
|------|------------------------|------|
| Free | 50 | $0/month |
| Paid | 1,000 | $5/month |

Each API call to Lever counts as a subrequest. When searching broadly:
- Each API call fetches 100 candidates
- Free plan: Maximum 50 API calls = 5,000 candidates
- Paid plan: Maximum 1,000 API calls = 100,000 candidates

## Current Implementation

To stay within the free plan limit, we've implemented:
- **Maximum 45 API calls** per search (leaving 5 for other operations)
- **Maximum 4,500 candidates** scanned per search
- Clear warning when hitting the limit

## Solutions

### Option 1: Upgrade to Workers Paid Plan (Recommended)

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select your account
3. Go to Workers & Pages
4. Upgrade to Paid plan ($5/month)

Benefits:
- 20x more subrequests (1,000 vs 50)
- Can scan up to 100,000 candidates per search
- No code changes needed

### Option 2: Work Within Free Plan Limits

Use more specific search criteria to reduce the candidate pool:

```javascript
// Instead of broad search:
lever_advanced_search({
  companies: "Mindshare, OMD, GroupM, ...", // 17 companies
  skills: "programmatic, trading, DSP, ...", // 12 skills
  locations: "UK, London, Manchester, ...", // 10 locations
})

// Try targeted searches:
// Search 1: Specific companies
lever_advanced_search({
  companies: "Mindshare, OMD",
  skills: "programmatic trading",
  locations: "London"
})

// Search 2: Different companies
lever_advanced_search({
  companies: "GroupM, Zenith",  
  skills: "programmatic trading",
  locations: "UK"
})
```

### Option 3: Use Email Search

Email searches are much more efficient:

```javascript
// If you have candidate emails
lever_quick_find_candidate({
  name_or_email: "candidate@example.com"
})
```

## Technical Details

### Why This Happens

1. Your search requests 50 results with broad criteria
2. Tool searches up to 10x that amount (500) for comprehensive coverage
3. Each API call gets 100 candidates
4. 500 ÷ 100 = 5 API calls expected
5. But broad criteria means many candidates don't match
6. Tool keeps searching until it finds matches or hits limits
7. Free plan limit (50 calls) is hit before finding enough matches

### How We Handle It

```typescript
// Limit API calls to stay within free plan
const maxFetch = Math.min(args.limit * 10, 1000, 4500); // Max 4500 candidates
let apiCallCount = 0;

while (allCandidates.length < maxFetch && apiCallCount < 45) {
  // Make API call
  apiCallCount++;
  
  // Process candidates...
}

// Warn user when hitting limit
if (apiCallCount >= 45) {
  searchResult.warning = "Search limited by Cloudflare Workers free plan...";
}
```

## Monitoring Usage

Check your Worker analytics:
1. Go to Cloudflare Dashboard
2. Select Workers & Pages
3. Click on your Worker
4. View Analytics tab

Look for:
- Request count
- Subrequest usage
- Error rates

## Best Practices

1. **Start Specific**: Use targeted criteria first
2. **Broaden Gradually**: Add more criteria if needed
3. **Use Pagination**: Search in smaller chunks
4. **Cache Results**: Store results locally when possible
5. **Consider Upgrading**: $5/month removes most limitations

## Comparison with Direct API Access

If you were calling Lever API directly (not through Cloudflare Workers):
- No subrequest limits
- Only Lever's rate limits apply (10 req/s)
- But you lose MCP integration benefits

The MCP server architecture trades some API call capacity for:
- Claude Desktop integration
- Automatic rate limiting
- Error handling
- Response formatting
- Tool orchestration 