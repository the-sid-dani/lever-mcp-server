# Double-Wrapping Fix for getOpportunity

## Problem
The `lever_get_candidate` function was returning "Candidate not found" errors even though the API was successfully returning data. The logs showed:

```
Successfully fetched opportunity 9401830d-f822-4401-9b9b-2b99334db3d3, has data: false
Opportunity data: {"data":{"id":"9401830d-f822-4401-9b9b-2b99334db3d3","name":"Michael Cox"...
```

## Root Cause
The Lever API returns opportunities in this format:
```json
{
  "data": {
    "id": "...",
    "name": "...",
    // ... other fields
  }
}
```

However, our `getOpportunity` method in the client was:
1. Expecting the API to return just the opportunity object directly
2. Then wrapping it in `{ data: opportunity }`
3. This created a double-nested structure: `{ data: { data: { ... } } }`

## Solution
Updated the `getOpportunity` method to:
1. Expect the correct API response structure: `{ data: LeverOpportunity }`
2. Return the response as-is without additional wrapping
3. Check for `response.data` instead of just `response`

## Code Changes
**Before:**
```typescript
const opportunity = await this.makeRequest<LeverOpportunity>(
  "GET",
  `/opportunities/${id}`,
);
return { data: opportunity };
```

**After:**
```typescript
const response = await this.makeRequest<{ data: LeverOpportunity }>(
  "GET",
  `/opportunities/${id}`,
);
return response;
```

## Impact
This fix resolves the issue where `lever_get_candidate` was failing to retrieve candidate data that was actually present in the API response. The function now correctly processes the API response structure and returns candidate details as expected.

## Related Files
- `src/lever/client.ts` - Contains the fixed `getOpportunity` method
- `src/index.ts` - Contains the `lever_get_candidate` tool that uses this method 