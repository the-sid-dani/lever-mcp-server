# Test Comprehensive Search

## Test the Improved Advanced Search

The advanced search now searches more comprehensively to avoid missing candidates. Here are some test searches to try:

### Test 1: Broad Company Search
```
lever_advanced_search
{
  "companies": "OMD,GroupM,Mindshare",
  "skills": "programmatic",
  "locations": "UK",
  "limit": 50,
  "page": 1
}
```

**What to expect:**
- The search will scan up to 1000 candidates (previously only 500)
- You'll see `search_stats` showing how many candidates were scanned vs matched
- The default page size is now 50 (was 200) for better performance

### Test 2: Check Pagination
After running Test 1, if `has_more` is true, try page 2:
```
lever_advanced_search
{
  "companies": "OMD,GroupM,Mindshare",
  "skills": "programmatic", 
  "locations": "UK",
  "limit": 50,
  "page": 2
}
```

### Test 3: Smaller Page Size for Detailed Review
```
lever_advanced_search
{
  "companies": "OMD",
  "skills": "programmatic,trading",
  "limit": 20,
  "page": 1
}
```

### What's Different Now?

1. **Broader Search**: Searches up to 10x your limit (max 1000) instead of 3x (max 500)
2. **Better Stats**: Shows candidates_scanned, candidates_matched, and match_rate
3. **Smarter Defaults**: 50 results per page instead of 200
4. **Clearer Warnings**: If search is incomplete, tells you exactly how many were scanned

### Example Response Structure:
```json
{
  "count": 50,
  "page": 1,
  "total_matches": 127,
  "total_pages": 3,
  "has_more": true,
  "next_page": 2,
  "search_criteria": {...},
  "search_stats": {
    "candidates_scanned": 820,
    "candidates_matched": 127,
    "match_rate": 15,
    "execution_time_seconds": 18
  },
  "candidates": [...],
  "warning": "Reached maximum search depth after scanning 1000 candidates...",
  "recommendation": "To search deeper: 1) Use more specific criteria..."
}
```

The key improvement is that we're less likely to miss candidates because we search deeper into the database while still maintaining good performance through pagination. 