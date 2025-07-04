# Search Tool Consolidation Plan

## Keep These Individual Tools:

### 1. lever_search_candidates (Basic Search)
- **Why**: Fastest for email searches (direct API)
- **Use cases**: 
  - Find specific person by email
  - Quick name searches
  - Filter by stage only

### 2. lever_quick_find_candidate
- **Why**: Prevents context overflow for name searches
- **Use cases**: Finding specific individuals quickly

### 3. lever_advanced_search (Power Search)
- **Why**: Complex multi-criteria searches
- **Use cases**: 
  - "Engineers from Google in NYC with Python"
  - Boolean logic between criteria types

## Consider Merging These:

### Merge into lever_advanced_search:
1. **lever_search_by_skills** → Add `score_by_skills: bool` parameter
2. **lever_search_by_location** → Already supported in advanced search
3. **lever_fuzzy_search** → Add `fuzzy_match: bool` parameter

### Benefits of merging:
- Less code duplication
- One powerful search tool instead of many
- Easier to maintain

### Enhanced lever_advanced_search would have:
```python
lever_advanced_search(
    # Existing parameters
    companies="Google,Meta",
    skills="Python,Java", 
    locations="NYC,SF",
    
    # New parameters
    score_by_skills=True,  # Enable skill scoring
    fuzzy_match=True,      # Enable fuzzy matching
    search_mode="OR"       # OR within all criteria (not just within types)
)
```

## Tools to Definitely Keep Separate:

1. **lever_find_candidates_for_role** - Specific to job postings
2. **lever_find_by_company** - Specialized company search
3. **lever_find_internal_referrals_for_role** - Unique referral logic
4. **lever_filter_by_companies_efficient** - Optimized for large datasets

## Implementation Priority:

1. **High Priority**: Enhance lever_advanced_search with scoring and fuzzy options
2. **Medium Priority**: Deprecate redundant tools gradually
3. **Low Priority**: Extract common utilities for code reuse

This gives users both simple tools for common tasks and one powerful tool for complex searches.