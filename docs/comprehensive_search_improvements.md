# Comprehensive Search Improvements

## Overview
The advanced search has been improved to search more comprehensively through the candidate database, ensuring fewer candidates are accidentally missed while still maintaining pagination and preventing timeouts.

## Key Improvements

### 1. Increased Search Depth
- **Previous**: Searched up to 3x the requested limit (max 500 candidates)
- **Now**: Searches up to 10x the requested limit (max 1000 candidates)
- This ensures we cast a wider net and don't miss qualified candidates

### 2. Better Search Statistics
The response now includes detailed `search_stats`:
```json
"search_stats": {
    "candidates_scanned": 820,
    "candidates_matched": 73,
    "match_rate": 9,
    "execution_time_seconds": 18
}
```

### 3. Improved Default Settings
- **Default limit**: Reduced from 200 to 50 results per page
- This allows for deeper searching while keeping response sizes manageable
- Recommended range: 20-50 for broad searches

### 4. Enhanced Warnings and Recommendations
When search limits are reached, you'll see:
- How many candidates were scanned
- How many matches were found
- Specific recommendations for deeper searching

Example warning:
```
"warning": "Reached maximum search depth after scanning 1000 candidates. Found 127 matches. There may be more candidates beyond this search depth.",
"recommendation": "To search deeper: 1) Use more specific criteria to narrow the search, 2) Try searching by specific companies or skills separately, or 3) Use email search if you have candidate emails."
```

## Usage Examples

### Broad Company Search with Pagination
```
lever_advanced_search
{
  "companies": "OMD,GroupM,Mindshare,Publicis,WPP",
  "skills": "programmatic",
  "locations": "UK",
  "limit": 50,
  "page": 1
}
```

### Deep Skill Search
```
lever_advanced_search
{
  "skills": "programmatic,trading,dsp,dv360",
  "locations": "UK,London",
  "limit": 30,
  "page": 1
}
```

### Understanding Search Depth
The `match_rate` in `search_stats` helps you understand search effectiveness:
- **High match rate (>20%)**: Your criteria are very broad, consider being more specific
- **Low match rate (<5%)**: Your criteria might be too specific, or you need to search deeper
- **Moderate match rate (5-20%)**: Good balance between specificity and coverage

## Best Practices

1. **Start with smaller page sizes** (30-50) for broad searches
2. **Use the match_rate** to gauge if your criteria are too broad or narrow
3. **Check multiple pages** - with deeper searching, relevant candidates might be on later pages
4. **Combine search strategies**:
   - First: Broad search to understand the landscape
   - Then: Specific searches by individual companies or skills
   - Finally: Email search for known candidates

## Technical Details

- **Timeout Protection**: Still maintains 25-second timeout to prevent connection errors
- **Rate Limiting**: 300ms delay between API requests (3 requests/second)
- **Memory Efficient**: Only keeps matched candidates in memory
- **Progressive Loading**: Stops when enough candidates are found for pagination

## Example Response with Stats

```json
{
  "count": 50,
  "page": 1,
  "total_matches": 127,
  "total_pages": 3,
  "has_more": true,
  "next_page": 2,
  "search_stats": {
    "candidates_scanned": 820,
    "candidates_matched": 127,
    "match_rate": 15,
    "execution_time_seconds": 18
  },
  "candidates": [...]
}
```

This comprehensive approach ensures you get a thorough view of available candidates while maintaining good performance and usability. 