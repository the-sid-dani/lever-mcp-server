# Unknown Values Investigation

## Problem
The `lever_quick_find_candidate` tool is returning "Unknown" for multiple fields (name, location, posting, etc.) even though:
1. The Lever API documentation shows these fields should be populated
2. The `lever_get_candidate` tool was fixed and now works correctly for individual candidates

## Example Issue
When searching for "Michael Cox":
```json
{
  "count": 5,
  "candidates": [
    {
      "name": "Unknown",
      "email": "N/A", 
      "location": "Unknown",
      "posting": "Unknown",
      ...
    }
  ]
}
```

## Investigation Steps

### 1. API Response Structure (✓ Completed)
- Fixed the double-wrapping issue in `getOpportunity` method
- This resolved the `lever_get_candidate` tool issue
- But `lever_quick_find_candidate` still shows "Unknown" values

### 2. Opportunities List Response (In Progress)
- Added `debug_opportunities_list` tool to see raw API response
- Added logging to `getOpportunities` method
- Added specific debugging for "Michael Cox" search

### 3. Possible Causes
1. **API Permissions**: The API key might not have permission to view candidate names/details in list views
2. **Empty Data**: The candidates might genuinely not have names in the system
3. **Different Response Format**: The `/opportunities` endpoint might return data differently than `/opportunities/:id`
4. **API Filtering**: When using certain filters, the API might return limited data

## Debug Tools Added

### debug_opportunities_list
- Shows raw API response for opportunities list
- Checks if `name` field exists and its type
- Shows first 3 opportunities with detailed field inspection

### Enhanced Logging
- `getOpportunities`: Logs first candidate name
- `lever_quick_find_candidate`: Logs first candidate structure
- Special logging for "Michael Cox" searches

## Next Steps
1. Run `debug_opportunities_list` to see actual API response
2. Check if names are present in raw API data
3. If names are missing, investigate API permissions or contact Lever support
4. If names are present, fix the data access pattern

## Related Files
- `src/index.ts` - Contains debug tools
- `src/lever/client.ts` - Contains API client with logging
- `src/additional-tools.ts` - Contains quick find implementation 