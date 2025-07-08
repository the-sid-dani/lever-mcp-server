# lever_find_by_company Default Behavior Change

## Summary

Changed the default value of `current_only` parameter from `true` to `false` in the `lever_find_by_company` tool.

## Why This Change?

When using the MCP server through Claude Desktop with natural language queries, users shouldn't need to specify technical parameters. The previous default behavior was too restrictive:

### Before (current_only: true by default)
- Only searched for **current employees** of specified companies
- Most candidates aren't marked as current employees
- Resulted in 0 results for most searches

### After (current_only: false by default)
- Searches **all candidates** who have worked at specified companies
- Includes both current and past employees
- Matches the expected behavior when asking "find people who worked at Mindshare"

## Usage Examples

### Natural Language Query (Claude Desktop)
```
"Find me programmatic traders who worked at Mindshare, OMD, or GroupM"
```

### What Happens Behind the Scenes

**Before the change:**
```javascript
lever_find_by_company({
  companies: "Mindshare, OMD, GroupM",
  current_only: true,  // Default - too restrictive!
  limit: 200
})
// Result: 0 candidates (unless they're marked as current employees)
```

**After the change:**
```javascript
lever_find_by_company({
  companies: "Mindshare, OMD, GroupM",
  current_only: false,  // New default - searches all work history
  limit: 200
})
// Result: All candidates who have these companies in their work history
```

## If You Need Current Employees Only

You can still search for only current employees by explicitly asking:
```
"Find me CURRENT employees at Mindshare"
```

This will set `current_only: true` when Claude Desktop interprets your request.

## Technical Details

- File changed: `src/index.ts`
- Line modified: ~374
- Deployed: Yes
- Backward compatibility: Maintained (parameter can still be explicitly set) 