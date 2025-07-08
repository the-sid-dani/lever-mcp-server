# Lever API Structure Fixes

## Overview
After reviewing the official Lever developer documentation, we identified and fixed several issues with how we were parsing API responses. The main problem was that our code expected different data structures than what the Lever API actually returns.

## Key Fixes Applied

### 1. Opportunity Location Field
**Issue**: Code expected location to be an object with a `name` property  
**Reality**: Location is a simple string  
**Fix**: Changed from `location.name` to just `location`

```typescript
// Before (incorrect)
const location = typeof opp.location === "object" && opp.location 
  ? opp.location.name 
  : String(opp.location || "Unknown");

// After (correct)
const location = opp.location || "Unknown";
```

### 2. Posting Categories Structure
**Issue**: Code expected `team` and `location` at the root level of posting objects  
**Reality**: These fields are inside a `categories` object  
**Fix**: Access fields from `posting.categories`

```typescript
// Before (incorrect)
location: posting.location?.name || "Unknown",
team: posting.team?.text || "Unknown",

// After (correct)  
location: posting.categories?.location || "Unknown",
team: posting.categories?.team || "Unknown",
```

### 3. Type Definitions Updated
Updated TypeScript interfaces to match actual API structure:

```typescript
// LeverOpportunity
location?: string; // Changed from string | { name: string }

// LeverPosting
categories?: {
  team?: string;
  department?: string;
  location?: string;
  allLocations?: string[];
  commitment?: string;
  level?: string;
};
```

## API Response Examples from Documentation

### Opportunity Object
```json
{
  "id": "250d8f03-738a-4bba-a671-8a3d73477145",
  "name": "Shane Smith",
  "location": "Oakland",  // Simple string
  "stage": "00922a60-7c15-422b-b086-f62000824fd7",
  // ... other fields
}
```

### Posting Object
```json
{
  "id": "f2f01e16-27f8-4711-a728-7d49499795a0",
  "text": "Infrastructure Engineer",
  "categories": {
    "team": "Platform",           // Inside categories
    "department": "Engineering",  // Inside categories
    "location": "San Francisco",  // Inside categories
    "commitment": "Full-time"
  },
  // ... other fields
}
```

## Impact
These fixes resolve the "Unknown" values that were appearing for location and team fields in:
- `lever_get_candidate`
- `lever_list_open_roles`
- All other tools that format opportunities or postings

## Testing
After deployment, the API should now return proper values for:
- Candidate locations
- Job posting teams
- Job posting locations

Instead of "Unknown" placeholders. 