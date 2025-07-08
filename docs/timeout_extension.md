# Timeout Extension for Advanced Search

## Background

The 25-second timeout was a self-imposed limit, not a platform restriction:
- **Lever API**: No time limits documented, only rate limits (10 req/s)
- **Cloudflare Workers**: Supports up to 5 minutes (300s) of CPU time
- **Our previous limit**: 25 seconds (artificial constraint)

## Changes Made

Increased `maxExecutionTime` from 25,000ms to 60,000ms (60 seconds) in `lever_advanced_search`.

## Benefits

1. **More comprehensive searches**: Can now scan ~6,000 candidates vs ~3,300
2. **Better match coverage**: Less likely to miss relevant candidates
3. **Still safe**: 60s is well within Cloudflare's 5-minute limit
4. **Rate limit compliant**: Still respects 300ms delays (3.3 req/s)

## Search Capacity

With 60-second timeout:
- **API calls**: ~200 requests possible
- **Candidates scanned**: ~20,000 theoretical max
- **Practical limit**: 1,000-6,000 depending on filtering

## Usage Recommendations

1. For broad searches: Use the full 60 seconds
2. For targeted searches: Results usually found within 10-20 seconds
3. Monitor `execution_time_seconds` in results
4. Watch for timeout warnings in response

## Future Considerations

Could extend further to 120s or more if needed, but 60s provides good balance of:
- Comprehensive coverage
- Reasonable response time
- Platform safety margin 