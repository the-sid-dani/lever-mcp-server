# Advanced Search Optimization Guide

## Issue Fixed

The `lever_advanced_search` tool was experiencing connection timeouts when processing large, broad searches. This has been fixed with the following optimizations:

### Changes Made

1. **Reduced Maximum Fetch Limit**
   - Previously: `limit * 10` (up to 2000 candidates)
   - Now: `limit * 3` (max 500 candidates)
   - Prevents excessive data fetching that causes timeouts

2. **Added Timeout Protection**
   - 25-second execution limit to stay under Cloudflare Worker limits
   - Gracefully stops fetching before connection timeout
   - Returns partial results with warning message

3. **Increased Rate Limiting Delay**
   - Previously: 200ms between requests (5 req/s)
   - Now: 300ms between requests (3 req/s)
   - More conservative to ensure API stability

## Best Practices for Advanced Search

### 1. Be Specific with Search Criteria

Instead of:
```
companies: "Mindshare, OMD, OMG, GroupM, Wavemaker, MediaCom, Essence, PHD, Hearts & Science, Starcom, Zenith, Digitas, Spark Foundry, UM, Initiative, Mediabrands, Carat, iProspect, Vizeum, Havas Media"
```

Try smaller, focused searches:
```
companies: "Mindshare, OMD, GroupM, Wavemaker, MediaCom"
```

### 2. Use Staged Searches

Break large searches into smaller, manageable chunks:

1. **First Pass**: Search for top-priority companies
2. **Second Pass**: Search for additional companies
3. **Combine Results**: Merge results from multiple searches

### 3. Leverage Other Search Tools

For broad company searches, consider:
- `lever_find_by_company` - Optimized for company-specific searches
- `lever_search_candidates` - Better for simple name/email searches
- `lever_find_candidates_for_role` - When searching within specific postings

### 4. Use Filters Effectively

Combine filters to narrow results:
```json
{
  "companies": "Google, Meta",
  "skills": "Python, AWS",
  "locations": "London, Manchester",
  "limit": 50
}
```

### 5. Monitor Search Warnings

If you see warnings like:
- "Search stopped after 25s to prevent timeout"
- "Search limited to 500 candidates"

This means your search criteria are too broad. Narrow them down for complete results.

## Example: Optimal Search Strategy

```javascript
// Instead of one massive search
lever_advanced_search({
  companies: "20+ companies...",
  skills: "10+ skills...",
  limit: 200
})

// Use multiple focused searches
// Search 1: Top media agencies
lever_advanced_search({
  companies: "Mindshare, OMD, GroupM",
  skills: "programmatic, DSP",
  locations: "London",
  limit: 100
})

// Search 2: Digital agencies
lever_advanced_search({
  companies: "Digitas, iProspect, Carat",
  skills: "programmatic trading, DMP",
  locations: "London",
  limit: 100
})
```

## Performance Considerations

- **Execution Time**: Searches now limited to 25 seconds max
- **Data Volume**: Maximum 500 candidates per search
- **Rate Limiting**: ~3 requests/second to Lever API
- **Pagination**: Use `page` parameter for large result sets

## Troubleshooting

If searches still timeout:
1. Reduce the `limit` parameter (try 50-100)
2. Use fewer search criteria
3. Search for specific posting IDs when possible
4. Consider using `lever_find_by_company` for company-focused searches 