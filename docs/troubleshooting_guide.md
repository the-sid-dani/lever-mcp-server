# Lever MCP Troubleshooting Guide

## Common Issues and Solutions

### 1. `lever_get_candidate` Returns Empty/Unknown Data

**Symptoms:**
- All fields show "Unknown" or empty values
- No error message is displayed
- The tool appears to run but returns no meaningful data

**Diagnosis Steps:**

1. **Test API Connection**
   Run the `test_lever_connection` tool first:
   ```
   test_lever_connection
   ```
   
   This will verify:
   - Your API key is valid
   - The Lever API is accessible
   - You have candidates in your system

2. **Verify Candidate ID**
   The opportunity_id might be invalid. To get valid IDs:
   ```
   lever_search_candidates
   limit: 10
   ```
   
   Or search by name/email:
   ```
   lever_quick_find_candidate
   name_or_email: "John Smith"
   ```

3. **Check Logs**
   Monitor the worker logs:
   ```bash
   npx wrangler tail --format pretty
   ```
   Then try the failing command again to see detailed error messages.

**Common Causes:**

1. **Invalid Opportunity ID**
   - The ID doesn't exist in your Lever account
   - The ID format is incorrect
   - The candidate was deleted/archived

2. **API Permissions**
   - Your API key doesn't have read permissions
   - The API key is for a different Lever environment

3. **Data Structure Issues**
   - The candidate has unusual data that's not being parsed correctly

### 2. Connection Closed Errors

**Symptoms:**
- "MCP error -32000: Connection closed"
- Timeout errors
- Search tools failing after 20-30 seconds

**Solutions:**

1. **Use Smaller Search Criteria**
   Instead of searching 20 companies at once, break it into smaller searches:
   ```
   lever_advanced_search
   companies: "Google, Meta, Apple"
   skills: "Python"
   locations: "London"
   limit: 50
   ```

2. **Use Specialized Tools**
   - For company searches: `lever_find_by_company`
   - For simple searches: `lever_search_candidates`
   - For role-specific: `lever_find_candidates_for_role`

3. **Reduce Result Limits**
   Start with smaller limits (50-100) and paginate if needed.

### 3. API Key Issues

**Symptoms:**
- 401 Unauthorized errors
- "Invalid API key" messages

**Solutions:**

1. **Verify API Key**
   ```bash
   npx wrangler secret list
   ```
   
2. **Re-set API Key**
   ```bash
   npx wrangler secret put LEVER_API_KEY
   ```
   Then paste your API key when prompted.

3. **Check API Key Permissions**
   In Lever, go to Settings > Integrations > API
   Ensure your key has:
   - Read access to opportunities
   - Read access to postings
   - Read access to archive reasons

### 4. No Results Found

**Symptoms:**
- Searches return 0 candidates
- Known candidates not appearing

**Solutions:**

1. **Check Search Syntax**
   - Companies: Use exact names or partial matches
   - Locations: Try variations (UK, United Kingdom, London)
   - Skills: Use common terms

2. **Verify Data Location**
   - Company data is stored in the `headline` field
   - Check where your data is actually stored in Lever

3. **Use Broader Searches**
   Start broad and narrow down:
   ```
   lever_search_candidates
   limit: 50
   ```

## Debug Checklist

When encountering issues:

1. ✅ Run `test_lever_connection` to verify API access
2. ✅ Check worker logs with `npx wrangler tail`
3. ✅ Try a simple search to get valid IDs
4. ✅ Verify the specific ID exists
5. ✅ Check API key permissions in Lever
6. ✅ Try with smaller data sets
7. ✅ Use appropriate tool for the task

## Getting Help

If issues persist:

1. **Check Logs**
   ```bash
   npx wrangler tail --format pretty
   ```

2. **Test with Known Data**
   Use IDs from successful searches to isolate the issue

3. **Verify Lever Setup**
   - API key is active
   - No IP restrictions
   - Correct permissions set

4. **Report Issues**
   Include:
   - The exact command that failed
   - Error messages from logs
   - Your Lever account type/plan 