# Search Transparency Update

## The Issue

Previously, the search results showed "candidates_scanned: 4500" which was misleading because:
- It counted candidates **fetched** from the API
- NOT candidates actually **examined/processed**
- If a timeout occurred, it still showed the full count

## What's Fixed

### New Tracking Metrics

The search now provides detailed statistics:

```json
"search_stats": {
  "candidates_scanned": 3000,      // Actually processed
  "candidates_fetched": 4500,      // Retrieved from API  
  "candidates_processed": 3000,    // Examined for matches
  "api_calls_made": 45,           // Number of API requests
  "candidates_matched": 3,         // Matches found
  "match_rate": 0,                // Match percentage
  "execution_time_seconds": 34    // Total time taken
}
```

### What This Means

- **candidates_fetched**: Total retrieved from Lever API
- **candidates_processed**: Actually examined against your criteria
- **candidates_scanned**: Same as processed (for clarity)

If these numbers differ, it means:
- The search timed out before processing all fetched candidates
- Or hit the API call limit

### Enhanced Logging

The system now logs:
```
API call 1: Fetched 100 candidates, total fetched: 100
Batch 1: Processed 100 candidates, found 0 matches
API call 2: Fetched 100 candidates, total fetched: 200
Batch 2: Processed 100 candidates, found 1 matches
...
```

## Why This Matters

1. **Transparency**: You know exactly what was searched
2. **Accuracy**: No more inflated "scanned" numbers
3. **Debugging**: Clear indication when searches are incomplete
4. **Trust**: Honest reporting of what the tool actually did

## Example

Before:
```
"candidates_scanned": 4500  // Misleading!
```

After:
```
"candidates_fetched": 4500,     // What we got from API
"candidates_processed": 3000,   // What we actually examined
"api_calls_made": 45,          // Transparency on API usage
```

This shows that while 4,500 candidates were fetched, only 3,000 were processed before a timeout or limit was reached. 