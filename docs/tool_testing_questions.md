# Lever MCP Tools Testing Guide

This document provides specific test questions for each Lever MCP tool. Each question is designed to test only the specific tool mentioned and verify it's working correctly.

## Core Candidate Management Tools (8 tools)

### 1. lever_search_candidates
**What it does:** Primary search tool that queries candidates across your entire ATS database. It searches through names, emails, and tags but has limitations - it cannot search by text/keywords in resumes. This is the go-to tool for finding candidates when you know their name or email.
**Test question:** "Use lever_search_candidates to search for candidates with limit of 25 (no stage filter)"
**If empty results:** Try "Use lever_search_candidates to find candidate by name 'Svetlana'"

### 2. lever_get_candidate
**What it does:** Retrieves comprehensive details about a single candidate including their contact info, current stage, application history, tags, and all associated metadata. Essential for deep-diving into a specific candidate's profile.
**Test question:** "Use lever_get_candidate to get full details for opportunity ID [use an ID from previous search]"
*Note: First run a search to get an opportunity ID*

### 3. [REMOVED - lever_advance_stage]
**Note:** This tool has been permanently removed. Lever API does not allow stage modifications (POST operations) even with full API access. This is a Lever platform restriction, not a permission issue. Stage changes must be done manually through the Lever web interface.

### 4. lever_add_note
**What it does:** Appends timestamped notes to a candidate's profile. These notes are visible to all team members and create an audit trail of interactions, feedback, and decisions. Notes cannot be edited or deleted once added.
**Test question:** "Use lever_add_note to add 'Reviewed portfolio - extensive experience with office moves and vendor management. Priority candidate for Workplace Experience Manager role.' to Sophie Kisnorbo"

### 5. lever_list_open_roles
**What it does:** Fetches all currently published job postings across your entire organization. Returns posting IDs, titles, departments, locations, and URLs. This is your starting point to understand what roles are actively recruiting.
**Test question:** "Use lever_list_open_roles to show all published job postings in the company"

### 6. lever_find_candidates_for_role
**What it does:** Returns all candidates who have specifically applied to a given job posting. Unlike general search, this filters by application to a specific role and is useful for focusing on candidates interested in particular positions. Default limit is now 100 candidates.
**Test question:** "Use lever_find_candidates_for_role to find all candidates who applied to posting ID for 'Workplace Experience Manager' role"
**Note:** Default is 100 results. You can specify a different limit if needed (e.g., limit=200, limit=500)

### 7. lever_archive_candidate
**What it does:** Removes a candidate from active consideration by archiving them with a specific reason (e.g., "Not a fit", "Withdrew", "Hired elsewhere"). Archived candidates can be unarchived later but won't appear in active searches.
**Test question:** "Use lever_archive_candidate to archive a test candidate with reason 'Position filled' (only if you have a test candidate)"

### 8. lever_get_stages
**What it does:** Lists all configured pipeline stages in your Lever account (e.g., "New Applicant", "Phone Screen", "Onsite", "Offer"). Useful for understanding your hiring workflow and ensuring correct stage names for other operations.
**Test question:** "Use lever_get_stages to list all pipeline stages in our Lever configuration"

### 9. lever_get_archive_reasons
**What it does:** Returns all pre-configured archive reasons in your Lever instance. These are standardized reasons for removing candidates from consideration and are required when archiving.
**Test question:** "Use lever_get_archive_reasons to show all available archive reasons in our system"

## Advanced Search & Sourcing Tools (3 tools)

### 10. lever_advanced_search
**What it does:** Combines multiple search criteria in a single query - companies, skills, locations, and tags. This is your power tool for complex searches. Returns up to 100 results by default. Uses OR logic within each criteria type and AND logic between different types.
**Why it's different from fuzzy_search:** Advanced search uses exact criteria matching across multiple fields, while fuzzy search uses approximate string matching on names/terms.
**How it works:** 
- Within each criteria: OR logic (any company match OR any skill match)
- Between criteria: AND logic (must match company AND skill AND location)
- Company search now checks the 'headline' field where your data is stored
**Test question:** "Use lever_advanced_search to find candidates who worked at 'CBRE' OR 'Shard' AND are located in 'London' with skills in 'operations' OR 'workplace'"
**Simpler test:** "Use lever_advanced_search to find candidates in 'London' who worked at 'CBRE'"

### 11. [REMOVED - lever_search_by_skills]
**Note:** This functionality is now available in lever_advanced_search using the 'skills' parameter.

### 12. [REMOVED - lever_search_by_location]
**Note:** This functionality is now available in lever_advanced_search using the 'locations' parameter.

### 13. [REMOVED - lever_fuzzy_search]
**Note:** For finding similar candidates, use lever_advanced_search with multiple search criteria.

### 14. lever_find_by_company
**What it does:** Sources candidates based on their employment history. Searches through current and past companies listed on candidate profiles. Excellent for competitive recruiting or finding candidates with specific industry experience.
**Test question:** "Use lever_find_by_company to find all candidates who have 'CBRE' or 'Cushman & Wakefield' or 'JLL' in their work history"

### 15. lever_find_internal_referrals_for_role
**What it does:** Identifies existing candidates in your database who might have connections to help fill a specific role. Looks at company overlaps, shared backgrounds, and network indicators to suggest who might provide referrals.
**Test question:** "Use lever_find_internal_referrals_for_role to find candidates who might refer people for the Workplace Experience Manager posting based on their CBRE or similar company connections"

## File Management Tools

### 16. lever_list_files
**What it does:** Enumerates all files attached to a candidate's profile including resumes, cover letters, portfolios, and other documents. Returns file names, types, sizes, and upload timestamps. Note: Files cannot be downloaded directly through Claude Desktop - recruiters should access them through the Lever web interface.
**Test question:** "Use lever_list_files to list all attached files for Svetlana Krockova including file sizes and types"

## Application Management Tools

### 17. lever_list_applications
**What it does:** Shows all job applications a candidate has submitted across all roles in your company. Useful for identifying internal candidates who have applied to multiple positions or understanding a candidate's interests.
**Test question:** "Use lever_list_applications to show all job applications submitted by Svetlana Krockova with application dates and statuses"

### 18. lever_get_application
**What it does:** Retrieves detailed information about a specific application including submission date, source, referrer, and any custom application questions answered. More detailed than the summary in list_applications.
**Test question:** "Use lever_get_application to get full application details for [get application ID from list_applications] for Sophie Kisnorbo"

### 19. lever_create_application
**What it does:** Programmatically applies an existing candidate to a new job posting. Useful for cross-posting strong candidates to relevant roles they haven't applied to yet.
**Test question:** "Use lever_create_application to apply existing candidate [ID] to a different relevant posting ID (only test with permission)"

## Utility Tools

### 20. lever_quick_find_candidate
**What it does:** Rapid candidate name search limited to 100 results to prevent context window overflow. Designed for when you need to quickly find a specific person without loading thousands of records.
**When to use:** When searching for a specific individual by name in a large ATS database.
**Test question:** "Use lever_quick_find_candidate to quickly find 'Svetlana Krockova' limiting results to prevent overload"

### 21. lever_find_candidate_in_posting
**What it does:** Searches for a specific candidate within the applicant pool of a particular job posting. Useful for checking if someone has already applied to a role before creating a new application.
**Test question:** "Use lever_find_candidate_in_posting to check if 'Sophie Kisnorbo' already applied to the Workplace Experience Manager posting ID"


## Testing Strategy

1. **Start with discovery:** Use tools #5 and #8 to understand available jobs and stages
2. **Find candidates:** Use tool #1 or #24 to get candidate IDs for testing
3. **Test searches:** Try different search tools (#10-15) to understand their differences
4. **Verify filters:** Test company filters (#21-23) with your actual company names
5. **Debug issues:** Use tool #26 if any searches return unexpected results

## Tool Selection Guide

- **For finding a specific person:** Use lever_quick_find_candidate (#24)
- **For complex multi-criteria searches:** Use lever_advanced_search (#10)
- **For company-based sourcing:** Use lever_find_by_company (#14) or lever_filter_by_companies_efficient (#21) for large datasets
- **For skill-based searches:** Use lever_search_by_skills (#11)
- **For location-based filtering:** Use lever_search_by_location (#12)
- **For approximate name matching:** Use lever_fuzzy_search (#13)
- **For debugging search issues:** Use lever_debug_search (#26)

## Troubleshooting Empty Results

If you're getting empty results when you know candidates exist:

1. **Stage filtering requires stage IDs, not names** - The Lever API expects stage IDs (UUIDs) not display names:
   - First: "Use lever_get_stages to list all pipeline stages" (tool #8)
   - This will show you the actual stage IDs like "lead-new" or a UUID
   - Then use that ID in your search, not "New Applicant"

2. **Start simple - search without any filters**:
   - "Use lever_search_candidates with limit 10"
   - This confirms the API connection is working

3. **Search by name works differently**:
   - "Use lever_search_candidates to find 'Svetlana' with limit 10"
   - This fetches candidates and filters locally by name

4. **Try the quick find tool instead**:
   - "Use lever_quick_find_candidate to find 'Svetlana'"
   - This is optimized for name searches

5. **Use the debug tool to see what's happening**:
   - "Use lever_debug_search to see raw API response for stage 'New Applicant'"
   - This shows exactly what parameters are being sent

6. **Known limitations**:
   - The Lever API doesn't support text search in the query parameter
   - Stage filtering requires exact stage IDs, not display names
   - Some candidates might be archived (not in active searches)
   - API permissions might restrict certain data access