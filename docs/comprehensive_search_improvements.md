# Comprehensive Search Improvements

This document describes the pagination and search depth improvements made to the `lever_advanced_search` tool, allowing it to search through more candidates while maintaining pagination and preventing timeouts.

## Changes Made

### 1. Increased Search Depth
- **Previous**: Searched up to 500 candidates (5x requested limit)
- **Current**: Searches up to 1,000 candidates (10x requested limit)
- **Benefit**: More comprehensive coverage, less likely to miss relevant candidates

### 2. Enhanced Statistics
Added detailed `search_stats` object to every response:
```json
"search_stats": {
  "candidates_scanned": 3300,    // Total candidates examined
  "candidates_matched": 3,       // Matches found
  "match_rate": 0,              // Percentage (0-100)
  "execution_time_seconds": 18   // Performance metric
}
```

### 3. Improved Defaults
- Changed default limit from 200 to 50 for better performance
- Maintains pagination support for accessing all results

## Technical Details

### Search Algorithm
1. Fetches candidates in batches of 100 from Lever API
2. Applies filters (companies, skills, locations, tags)
3. Continues until:
   - 1,000 candidates scanned (10x requested limit)
   - 60 seconds elapsed (increased from 25s)
   - No more candidates available

### Performance Characteristics
- **Timeout Protection**: Maintains 60-second timeout to prevent connection errors
- **Rate Limiting**: 300ms delay between API requests (3 requests/second)
- **Typical Performance**: 
  - Broad search: ~3,000-6,000 candidates in 30-60 seconds
  - Targeted search: ~500-1,000 candidates in 5-10 seconds

## Usage Examples

### Broad Search (Multiple Criteria)
```json
{
  "companies": "Mindshare, OMD, GroupM, Wavemaker, PHD",
  "skills": "programmatic, trading, DSP, DMP",
  "locations": "UK, London, Manchester",
  "limit": 50
}
```

**Typical Result**:
- Scans 3,000-6,000 candidates
- Takes 30-60 seconds
- Returns matches with detailed statistics

### Targeted Search (Specific Criteria)
```json
{
  "companies": "Google",
  "skills": "machine learning",
  "limit": 20
}
```

**Typical Result**:
- Scans 500-1,000 candidates
- Takes 5-10 seconds
- Higher match rate due to specific criteria

## Interpreting Results

### Success Indicators
```json
"search_stats": {
  "candidates_scanned": 5000,
  "candidates_matched": 25,
  "match_rate": 1,
  "execution_time_seconds": 45
}
```
- Good coverage (5,000 scanned)
- Reasonable matches found
- Low match rate expected for specific criteria

### Warning Indicators
```json
"warning": "Search stopped after scanning 6000 candidates (58s). Found 15 matches. More candidates may exist beyond this point.",
"recommendation": "To search deeper: 1) Use more specific criteria..."
```
- Search hit time or depth limit
- May have missed some candidates
- Consider refining search criteria

## Best Practices

1. **Start Broad, Then Narrow**
   - Initial search with multiple companies/skills
   - Refine based on initial results

2. **Use Pagination**
   - Default 50 results per page
   - Use `page` parameter to access more results

3. **Monitor Statistics**
   - Check `candidates_scanned` for coverage
   - Watch `execution_time_seconds` for performance
   - Review `match_rate` to gauge search effectiveness

4. **Handle Warnings**
   - If search times out, consider more specific criteria
   - Use recommendations provided in response

## Example Response Structure
```json
{
  "count": 3,
  "page": 1,
  "total_matches": 3,
  "total_pages": 1,
  "has_more": false,
  "next_page": null,
  "search_criteria": {
    "companies": "Mindshare, OMD",
    "skills": "programmatic",
    "locations": "UK"
  },
  "search_stats": {
    "candidates_scanned": 3300,
    "candidates_matched": 3,
    "match_rate": 0,
    "execution_time_seconds": 26
  },
  "candidates": [...],
  "warning": "Search stopped after scanning 3300 candidates (26s)...",
  "recommendation": "To search deeper..."
}
``` 