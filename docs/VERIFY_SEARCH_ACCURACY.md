# How to Verify Search Accuracy

## The Concern

You're right to be skeptical about whether the search is actually examining all candidates it claims to scan. Here's how to verify what's really happening.

## New Verification Tool

Use the `verify_api_response` tool in Claude Desktop to see exactly what the Lever API returns:

```
Ask Claude: "Use verify_api_response to check if we're really getting 100 candidates per API call"
```

This will show you:
- How many candidates were requested (100)
- How many were actually returned
- Sample IDs and names from each batch
- Whether all batches returned 100 candidates

## What the Enhanced Logs Show

When you run a search now, you'll see detailed logs like:

```
API call 1: Fetched 100 candidates, total fetched: 100
Sample from batch 1: First candidate ID: abc123, Name: John Smith
Last candidate in batch: ID: xyz789, Name: Jane Doe
Starting to filter batch 1 with 100 candidates
Batch 1: Filtered 100 candidates in 125ms, found 2 matches
Actually examined 100 candidates in this batch
Running totals - Fetched: 100, Processed: 100, Matches: 2
```

## Key Metrics Explained

The search results now show:

```json
"search_stats": {
  "candidates_fetched": 4500,     // Downloaded from API
  "candidates_processed": 3000,   // Actually examined
  "api_calls_made": 45,          // Number of API requests
  "candidates_matched": 3,        // Matches found
}
```

### What These Mean:

1. **candidates_fetched**: Total candidates retrieved from Lever API
2. **candidates_processed**: Candidates actually examined against your criteria
3. **api_calls_made**: Number of API requests made (should be fetched ÷ 100)

## Red Flags to Watch For

If you see any of these, something's wrong:

1. **Fetched ≠ API calls × 100**: API might not be returning full batches
2. **Processed < Fetched**: Timeout occurred before examining all candidates
3. **All logs have same timestamp**: Processing might be getting skipped
4. **No sample IDs/names**: API might be returning empty data

## How to Test

1. **Check API Response**:
   ```
   "Run verify_api_response with 3 batches"
   ```

2. **Run Small Search**:
   ```
   "Search for candidates with limit 10"
   ```
   Check logs to see if it fetches 100 and processes 100

3. **Monitor Logs**:
   Look for:
   - Different timestamps for each batch
   - Sample candidate names changing
   - Processing time for each batch

## What We Fixed

1. **Accurate Counting**: Now counts only candidates actually examined
2. **Early Exit Detection**: Warns when timeout prevents full processing
3. **Per-Batch Verification**: Tracks exactly how many examined in each batch
4. **Sample Logging**: Shows real candidate data to prove processing

## The Truth

- The API **does** return 100 candidates per call (when available)
- The search **does** examine each candidate against criteria
- But timeouts or limits can prevent examining all fetched candidates
- Now the tool honestly reports what was actually processed

## If You're Still Skeptical

Run this test:
1. Use `verify_api_response` to confirm API returns 100 per batch
2. Run a search with very specific criteria
3. Check the logs show processing of each batch
4. Verify the fetched/processed counts match

The tool now tells the truth about what it actually did! 