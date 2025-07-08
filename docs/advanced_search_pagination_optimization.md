# Advanced Search Pagination Optimization

## Current Issue
The advanced search tool times out after 25 seconds when searching with broad criteria because it tries to fetch and filter up to 500 candidates before returning results.

From the logs:
```
(warn) Advanced search timeout after 25749ms
```

## Current Implementation Analysis

The tool already supports pagination:
- **`limit`**: Results per page (default: 200)
- **`page`**: Page number (1-based)

However, it fetches ALL matching candidates first (up to 500), then paginates in memory.

## Optimization Strategy

### Option 1: Early Termination (Quick Fix)
Stop fetching once we have enough results for the requested page:

```typescript
// Calculate how many we need for current page
const neededForPage = args.page * args.limit;

// Stop fetching once we have enough
while (allCandidates.length < neededForPage && allCandidates.length < maxFetch) {
    // ... fetch and filter ...
    
    // Early exit if we have enough for current page
    if (allCandidates.length >= neededForPage) {
        break;
    }
}
```

### Option 2: Reduce Default Limit
Change the default limit from 200 to 50 for better performance:
```typescript
limit: z.number().default(50), // Reduced from 200
```

### Option 3: Progressive Loading
Only fetch what's needed for the current page plus a small buffer:
```typescript
const targetFetch = args.limit * (args.page + 1); // Current page + 1 for "hasMore"
const maxFetch = Math.min(targetFetch * 2, 500); // Buffer but cap at 500
```

## Recommended Implementation

1. **Immediate Fix**: Implement Option 1 - Early termination
2. **Better UX**: Reduce default limit to 50
3. **Add guidance**: Show warning when broad searches are used

## Usage Examples

### Recommended Usage (Fast)
```
lever_advanced_search
{
  "companies": "OMD",
  "skills": "programmatic",
  "limit": 50,
  "page": 1
}
```

### Pagination Example
```
// Page 1
lever_advanced_search
{
  "companies": "OMD,GroupM,Mindshare",
  "limit": 50,
  "page": 1
}

// Page 2
lever_advanced_search
{
  "companies": "OMD,GroupM,Mindshare",
  "limit": 50,
  "page": 2
}
```

### Best Practices
1. Use smaller `limit` values (20-50) for broad searches
2. Add more specific filters to reduce candidate pool
3. Use `posting_id` when searching within a specific role
4. Monitor the `warning` field for timeout indicators 