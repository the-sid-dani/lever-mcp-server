# Lever MCP Tools Complete Guide

This guide provides a comprehensive overview of all 29 Lever MCP tools (23 core recruiting tools + 6 debug/testing tools), explaining what each tool does and how to use it effectively.

## Table of Contents
1. [Basic Search Tools](#basic-search-tools) (3 tools)
2. [Advanced Search Tools](#advanced-search-tools) (4 tools)
3. [Candidate Information Tools](#candidate-information-tools) (2 tools)
4. [Role & Posting Management Tools](#role--posting-management-tools) (3 tools)
5. [Pipeline Management Tools](#pipeline-management-tools) (4 tools)
6. [File & Application Management Tools](#file--application-management-tools) (3 tools)
7. [Enterprise & Requisition Tools](#enterprise--requisition-tools) (2 tools)
8. [Dashboard & Analytics Tools](#dashboard--analytics-tools) (2 tools)
9. [Debug & Testing Tools](#debug--testing-tools) (6 tools)

---

## Basic Search Tools

### 1. lever_search_candidates
**What it does:** Primary search tool for finding candidates across your entire ATS database. Searches through names and emails, with optional stage filtering.

**Use when:**
- Looking for candidates by name or email
- Need to filter by specific pipeline stage
- Want a general search with flexible criteria

**How to use:**
```
"Search for candidates named John"
"Find candidates with email john@example.com"
"Search for candidates in the Phone Screen stage"
"Find any candidates with limit 50"
```

**Limitations:** 
- Cannot search resume content or skills directly
- Name searches limited to first 200 candidates for performance
- Email searches are exact match and more efficient

---

### 2. lever_quick_find_candidate
**What it does:** Optimized tool for finding a specific individual candidate quickly by name or email. Returns first 5 matches.

**Use when:**
- You know the exact name or email
- Need fast results for a specific person
- Don't need comprehensive search results

**How to use:**
```
"Quick find candidate Sarah Johnson"
"Quick find candidate sarah@company.com"
```

**Limitations:** 
- Only checks first 300 candidates
- Returns maximum 5 matches
- Best with email addresses for accuracy

---

### 3. lever_find_candidate_in_posting
**What it does:** Searches for candidates within a specific job posting. More efficient than general search when you know which role to search in.

**Use when:**
- Looking for a candidate who applied to a specific role
- Need to find someone within a job's applicant pool
- Want to filter by both posting and stage

**How to use:**
```
"Find John Smith in posting ID abc123"
"Find Sarah in the Software Engineer posting (posting_id: xyz789) at the Phone Screen stage"
```

**Benefits:** 
- Can check up to 1000 candidates (vs 200 in general search)
- More targeted and efficient
- Supports partial name matching

---

## Candidate Information Tools

### 4. lever_get_candidate
**What it does:** Retrieves comprehensive details about a single candidate including contact info, current stage, tags, work history, and all metadata.

**Use when:**
- Need full candidate profile information
- Want to see all details before making decisions
- Checking candidate's application history

**How to use:**
```
"Get full details for opportunity ID abc123-def456"
"Show me everything about candidate with ID xyz789"
```

**Returns:**
- Basic info (name, email, location)
- Contact details (emails, phones, links)
- Current stage and owner
- Tags and sources
- Organizations/work history
- Application count

---

### 5. lever_add_note
**What it does:** Adds timestamped notes to a candidate's profile. Notes are permanent and visible to all team members.

**Use when:**
- Recording interview feedback
- Documenting conversations or decisions
- Adding important candidate information
- Creating audit trail

**How to use:**
```
"Add note 'Strong technical skills, great culture fit' to candidate ID abc123"
"Add note 'Discussed salary expectations: $120-130k' to opportunity xyz789"
```

**Important:** Notes cannot be edited or deleted once added

---

## Role Management Tools

### 6. lever_list_open_roles
**What it does:** Lists all currently published job postings across your organization with details like title, location, team, and posting URL.

**Use when:**
- Need overview of all open positions
- Starting recruiting workflow
- Checking which roles are actively hiring

**How to use:**
```
"List all open roles"
"Show me all published job postings"
```

**Returns:** 
- Posting ID, title, state
- Location and team
- Direct application URL

---

### 7. lever_find_candidates_for_role
**What it does:** Returns all candidates who have applied to a specific job posting, organized by pipeline stage.

**Use when:**
- Reviewing all applicants for a role
- Understanding pipeline distribution
- Need posting-specific candidate list

**How to use:**
```
"Find all candidates for posting ID abc123"
"Show me everyone who applied to the Senior Engineer role (posting_id: xyz789) with limit 200"
```

**Default limit:** 100 candidates (can be increased)

---

## Candidate Actions Tools

### 8. lever_archive_candidate
**What it does:** Removes a candidate from active consideration by archiving them with a specific reason (e.g., "Not a fit", "Withdrew").

**Use when:**
- Candidate is no longer under consideration
- Need to clean up active pipeline
- Documenting why candidate was removed

**How to use:**
```
"Archive candidate ID abc123 with reason ID def456"
```

**Note:** Must use lever_get_archive_reasons first to get valid reason IDs

---

### 9. lever_get_stages
**What it does:** Lists all configured pipeline stages in your Lever account (e.g., "New Applicant", "Phone Screen", "Onsite").

**Use when:**
- Need to know exact stage names
- Setting up stage-based searches
- Understanding hiring workflow

**How to use:**
```
"Get all pipeline stages"
"List available stages in Lever"
```

---

### 10. lever_get_archive_reasons
**What it does:** Returns all pre-configured archive reasons with their IDs.

**Use when:**
- Before archiving a candidate
- Need to know valid archive reasons
- Setting up consistent archiving process

**How to use:**
```
"Get all archive reasons"
"List available archive reason IDs"
```

---

## Advanced Search Tools

### 4. lever_advanced_search
**What it does:** Powerful multi-criteria search combining companies, skills, locations, and tags. Uses AND logic between criteria types, OR within each type.

**Use when:**
- Need complex searches with multiple filters
- Looking for candidates with specific combinations
- Want flexible matching across criteria

**How to use:**
```
"Advanced search for candidates from Google, Meta with Python, Java skills in NYC, SF"
"Find candidates with tags 'senior, architect' from companies 'Stripe, Square'"
```

**Logic:** (company1 OR company2) AND (skill1 OR skill2) AND (location1 OR location2)

---

### 5. lever_find_by_company
**What it does:** Specialized search for finding candidates from specific companies, with option to filter for current employees only.

**Use when:**
- Targeting candidates from specific companies
- Building talent pipeline from competitors
- Need company-specific candidate lists

**How to use:**
```
"Find candidates from Google, Meta, Apple (current employees only)"
"Find anyone who worked at Stripe, Square (including past employees)"
```

---

### 6. lever_find_internal_referrals_for_role
**What it does:** Identifies internal employees who might refer candidates for a specific role based on their experience and connections.

**Use when:**
- Activating employee referral programs
- Finding internal connectors for hard-to-fill roles
- Leveraging internal networks

**How to use:**
```
"Find internal referrals for posting ID abc123"
"Who internally could refer candidates for the Senior Engineer role (posting_id: xyz789)"
```

---

### 7. lever_find_candidate_in_posting
**What it does:** Searches for candidates within a specific job posting. More efficient than general search when you know which role to search in.

**Use when:**
- Looking for a candidate who applied to a specific role
- Need to find someone within a job's applicant pool
- Want to filter by both posting and stage

**How to use:**
```
"Find John Smith in posting ID abc123"
"Find Sarah in the Software Engineer posting (posting_id: xyz789) at the Phone Screen stage"
```

**Benefits:** 
- Can check up to 1000 candidates (vs 200 in general search)
- More targeted and efficient
- Supports partial name matching

---

## Candidate Information Tools

### 8. lever_get_candidate
**What it does:** Retrieves comprehensive details about a single candidate including contact info, current stage, tags, work history, and all metadata.

**Use when:**
- Need full candidate profile information
- Want to see all details before making decisions
- Checking candidate's application history

**How to use:**
```
"Get full details for opportunity ID abc123-def456"
"Show me everything about candidate with ID xyz789"
```

**Returns:**
- Basic info (name, email, location)
- Contact details (emails, phones, links)
- Current stage and owner
- Tags and sources
- Organizations/work history
- Application count

---

### 9. lever_add_note
**What it does:** Adds timestamped notes to a candidate's profile. Notes are permanent and visible to all team members.

**Use when:**
- Recording interview feedback
- Documenting conversations or decisions
- Adding important candidate information
- Creating audit trail

**How to use:**
```
"Add note 'Strong technical skills, great culture fit' to candidate ID abc123"
"Add note 'Discussed salary expectations: $120-130k' to opportunity xyz789"
```

**Important:** Notes cannot be edited or deleted once added

---

## Role & Posting Management Tools

### 10. lever_list_open_roles
**What it does:** Lists all currently published job postings across your organization with details like title, location, team, and posting URL.

**Use when:**
- Need overview of all open positions
- Starting recruiting workflow
- Checking which roles are actively hiring

**How to use:**
```
"List all open roles"
"Show me all published job postings"
```

**Returns:** 
- Posting ID, title, state
- Location and team
- Direct application URL

---

### 11. lever_find_candidates_for_role
**What it does:** Returns all candidates who have applied to a specific job posting, organized by pipeline stage.

**Use when:**
- Reviewing all applicants for a role
- Understanding pipeline distribution
- Need posting-specific candidate list

**How to use:**
```
"Find all candidates for posting ID abc123"
"Show me everyone who applied to the Senior Engineer role (posting_id: xyz789) with limit 200"
```

**Default limit:** 100 candidates (can be increased)

---

### 12. lever_find_postings_by_owner
**What it does:** Finds job postings owned by a specific recruiter or hiring manager, with option to filter by posting state.

**Use when:**
- Checking a specific recruiter's workload
- Finding all postings for a hiring manager
- Auditing posting ownership

**How to use:**
```
"Find all postings owned by John Smith"
"Show me published postings for owner ID abc123"
```

**Note:** Can search by owner name or ID

---

## Pipeline Management Tools

### 13. lever_get_stages
**What it does:** Lists all configured pipeline stages in your Lever account (e.g., "New Applicant", "Phone Screen", "Onsite").

**Use when:**
- Need to know exact stage names
- Setting up stage-based searches
- Understanding hiring workflow

**How to use:**
```
"Get all pipeline stages"
"List available stages in Lever"
```

---

### 14. lever_get_archive_reasons
**What it does:** Returns all pre-configured archive reasons with their IDs.

**Use when:**
- Before archiving a candidate
- Need to know valid archive reasons
- Setting up consistent archiving process

**How to use:**
```
"Get all archive reasons"
"List available archive reason IDs"
```

---

### 15. lever_move_candidate_to_stage
**What it does:** Moves a candidate to a different pipeline stage with proper validation.

**Use when:**
- Progressing candidates through the hiring process
- Updating candidate status after interviews
- Bulk stage updates

**How to use:**
```
"Move candidate abc123 to Phone Screen stage"
"Update opportunity xyz789 to Offer stage"
```

**Note:** Requires valid stage IDs from lever_get_stages

---

### 16. lever_archive_candidate
**What it does:** Removes a candidate from active consideration by archiving them with a specific reason (e.g., "Not a fit", "Withdrew").

**Use when:**
- Candidate is no longer under consideration
- Need to clean up active pipeline
- Documenting why candidate was removed

**How to use:**
```
"Archive candidate ID abc123 with reason ID def456"
```

**Note:** Must use lever_get_archive_reasons first to get valid reason IDs

---

## File & Application Management Tools

### 17. lever_list_files
**What it does:** Lists all files attached to a candidate, including resumes and other documents.

**Use when:**
- Checking what documents candidate submitted
- Verifying resume upload
- Getting file metadata

**How to use:**
```
"List all files for candidate ID abc123"
"Show me what documents opportunity xyz789 has attached"
```

**Note:** Files must be accessed through Lever web interface for download

---

### 18. lever_list_applications
**What it does:** Lists ALL job applications for a single candidate across different roles they've applied to.

**Use when:**
- Candidate applied to multiple positions
- Need overview of all their applications
- Getting application IDs for detailed view

**How to use:**
```
"List all applications for opportunity ID abc123"
"Show me all jobs candidate xyz789 has applied to"
```

**Returns:** Application IDs needed for lever_get_application

---

### 19. lever_get_application
**What it does:** Provides detailed information about a SPECIFIC application to one job.

**Use when:**
- Need details about one particular application
- Checking who added the application
- Understanding application timeline

**How to use:**
```
"Get application details for opportunity_id: abc123 and application_id: def456"
```

**Important:** Requires BOTH opportunity_id AND application_id (not the same ID)

---

## Enterprise & Requisition Tools

### 20. lever_list_requisitions
**What it does:** Lists all requisitions in your Lever account with filtering options for status, requisition codes, and dates.

**Use when:**
- Managing requisition approvals
- Tracking headcount against HRIS systems
- Auditing requisition status

**How to use:**
```
"List all open requisitions"
"Show requisitions with code ENG-145"
"Find requisitions created this month"
```

**Returns:** Lever IDs, requisition codes, headcount, status, team info

---

### 21. lever_get_requisition_details
**What it does:** Retrieves detailed information about a specific requisition using either Lever ID or external requisition code.

**Use when:**
- Need complete requisition information
- Checking requisition approval status
- Verifying headcount allocation

**How to use:**
```
"Get details for requisition ENG-145"
"Show full info for requisition ID abc123-def456"
```

**Note:** Smart lookup supports both Lever IDs and external HRIS codes

---

## Dashboard & Analytics Tools

### 22. lever_recruiter_dashboard
**What it does:** Comprehensive dashboard showing all recruiting activities for a specific recruiter, including pipeline status, upcoming interviews, and workload distribution.

**Use when:**
- Daily pipeline reviews
- Performance monitoring
- Workload planning and optimization

**How to use:**
```
"Show dashboard for John Smith"
"Display my recruiting metrics with interviews"
"Get pipeline summary for owner ID abc123"
```

**Features:** Pagination, interview tracking, stage analytics, performance metrics

---

### 23. lever_search_archived_candidates
**What it does:** Advanced search through archived candidates with filtering by date ranges, archive reasons, and posting IDs.

**Use when:**
- Historical analysis
- Compliance reporting
- Re-engaging previous candidates

**How to use:**
```
"Find archived candidates from last month"
"Search archived candidates for Software Engineer roles"
"Show candidates archived with reason 'Position filled'"
```

**Benefits:** Full pagination support, interview history, reason tracking

---

## Debug & Testing Tools

### 24. test_lever_connection
**What it does:** Validates the connection to Lever API and tests basic functionality.

**Use when:**
- Troubleshooting API issues
- Verifying credentials
- System health checks

---

### 25. test_rate_limits
**What it does:** Tests rate limiting implementation with configurable request patterns.

**Use when:**
- Performance testing
- Validating rate limit handling
- Debugging API throttling

---

### 26. verify_api_response
**What it does:** Examines raw API responses to verify data structure and consistency.

**Use when:**
- Debugging data issues
- Validating API changes
- Performance analysis

---

### 27. debug_get_candidate
**What it does:** Returns raw candidate data for debugging format or data issues.

**Use when:**
- Troubleshooting candidate display issues
- Debugging data parsing problems

---

### 28. debug_postings
**What it does:** Provides raw posting data structure for debugging purposes.

**Use when:**
- Troubleshooting posting display issues
- Verifying API data structure

---

### 29. debug_opportunities_list
**What it does:** Debugging tool for examining opportunity list responses and data consistency.

**Use when:**
- Investigating search result issues
- Debugging pagination problems

---

## Quick Reference: Common Workflows

### Finding a Specific Person
1. Try `lever_quick_find_candidate` with email first (most accurate)
2. If no email, use name
3. If not found, use `lever_search_candidates` with broader search

### Reviewing Applicants for a Role
1. Use `lever_list_open_roles` to find posting ID
2. Use `lever_find_candidates_for_role` with that posting ID
3. Use `lever_get_candidate` for detailed views of interesting candidates

### Managing Applications
1. Use `lever_list_applications` to see all applications for a candidate
2. Use `lever_get_application` with specific IDs for details
3. Applications to new roles must be done through Lever web interface

### Advanced Talent Search
1. Use `lever_advanced_search` for complex multi-criteria searches
2. Use `lever_find_by_company` for company-specific searches
3. Combine with `lever_get_candidate` for full profiles

## Important Limitations

1. **No Resume Content Search**: Cannot search within resume text
2. **No File Downloads**: Files must be accessed through Lever web interface  
3. **Search Limits**: Name searches limited to first 200-300 candidates for performance
4. **Rate Limits**: Maximum 8 requests per second to respect Lever API limits
5. **No Bulk File Operations**: Individual file access only
6. **Debug Tools**: Testing tools (24-29) are for troubleshooting only

## Tips for Non-Technical Recruiters

- Always use email search when possible - it's faster and more accurate
- Use posting-specific searches to reduce result sets
- Add descriptive notes for future reference
- Use tags effectively for better organization
- Check archive reasons before archiving candidates