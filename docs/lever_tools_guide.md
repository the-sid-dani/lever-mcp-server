# Lever MCP Tools Complete Guide

This guide provides a comprehensive overview of all 16 Lever MCP tools, explaining what each tool does and how to use it effectively.

## Table of Contents
1. [Candidate Search Tools](#candidate-search-tools) (3 tools)
2. [Candidate Information Tools](#candidate-information-tools) (2 tools)
3. [Role Management Tools](#role-management-tools) (2 tools)
4. [Candidate Actions Tools](#candidate-actions-tools) (3 tools)
5. [Advanced Search Tools](#advanced-search-tools) (3 tools)
6. [File Management Tools](#file-management-tools) (1 tool)
7. [Application Management Tools](#application-management-tools) (2 tools)

---

## Candidate Search Tools

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

### 11. lever_advanced_search
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

### 12. lever_find_by_company
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

### 13. lever_find_internal_referrals_for_role
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

## File Management Tools

### 14. lever_list_files
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

## Application Management Tools

### 15. lever_list_applications
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

### 16. lever_get_application
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
2. **No Stage Modifications**: Cannot move candidates between stages (Lever API restriction)
3. **No File Downloads**: Files must be accessed through Lever web interface
4. **Search Limits**: Name searches limited to first 200-300 candidates
5. **Rate Limits**: Maximum 8 requests per second

## Tips for Non-Technical Recruiters

- Always use email search when possible - it's faster and more accurate
- Use posting-specific searches to reduce result sets
- Add descriptive notes for future reference
- Use tags effectively for better organization
- Check archive reasons before archiving candidates