# Lever MCP Tools Complete Guide

This guide provides a comprehensive overview of all 23 Lever MCP tools, explaining what each tool does and how to use it effectively.

## Table of Contents
1. [Candidate Search Tools](#candidate-search-tools) (4 tools)
2. [Candidate Information Tools](#candidate-information-tools) (2 tools)
3. [Role Management Tools](#role-management-tools) (3 tools)
4. [Candidate Actions Tools](#candidate-actions-tools) (4 tools)
5. [Advanced Search Tools](#advanced-search-tools) (3 tools)
6. [File Management Tools](#file-management-tools) (1 tool)
7. [Application Management Tools](#application-management-tools) (2 tools)
8. [Dashboard & Analytics Tools](#dashboard--analytics-tools) (2 tools)
9. [Requisition Management Tools](#requisition-management-tools) (2 tools)

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
"Search for candidates in the Phone Screen stage with page 2"
```

**Features:**
- Supports pagination (page parameter)
- Email searches are exact match and more efficient
- Name searches check up to 500 candidates

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
- Can check up to 1000 candidates (vs 500 in general search)
- More targeted and efficient
- Supports partial name matching

---

### 4. lever_search_archived_candidates
**What it does:** Searches through archived/rejected candidates who are no longer in active pipeline. Useful for re-engaging past candidates.

**Use when:**
- Looking for candidates who were previously rejected
- Building talent pools from past applicants
- Re-engaging silver medalists for new roles

**How to use:**
```
"Search archived candidates for Python developers"
"Find archived candidates from Google"
"Search archived candidates with tag 'strong-technical'"
```

**Features:**
- Same search capabilities as active candidate search
- Can filter by archive reason
- Supports pagination

---

## Candidate Information Tools

### 5. lever_get_candidate
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

### 6. lever_add_note
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

### 7. lever_list_open_roles
**What it does:** Lists all currently published job postings with details like title, location, team, posting owner, and hiring manager.

**Use when:**
- Need overview of all open positions
- Starting recruiting workflow
- Finding posting owners and hiring managers
- Getting posting IDs for other tools

**How to use:**
```
"List all open roles with owner details"
"Show me all published job postings"
```

**Returns:** 
- Posting ID, title, state
- Location and team
- Owner and hiring manager info
- Direct application URL

---

### 8. lever_find_candidates_for_role
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

### 9. lever_find_postings_by_owner
**What it does:** Finds all job postings owned by a specific recruiter or hiring manager. Supports search by name or ID.

**Use when:**
- Getting all postings for a specific recruiter
- Building recruiter-specific dashboards
- Tracking ownership across roles

**How to use:**
```
"Find all postings owned by John Smith"
"Find postings by owner ID abc123-def456"
"Find published postings owned by Sarah Johnson"
```

**Features:**
- Searches up to 2000 postings
- Can filter by posting state
- Returns owner and hiring manager details

---

## Candidate Actions Tools

### 10. lever_archive_candidate
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

### 11. lever_get_stages
**What it does:** Lists all configured pipeline stages in your Lever account (e.g., "New Applicant", "Phone Screen", "Onsite").

**Use when:**
- Need to know exact stage names and IDs
- Setting up stage-based searches
- Understanding hiring workflow
- Before moving candidates between stages

**How to use:**
```
"Get all pipeline stages"
"List available stages in Lever"
```

---

### 12. lever_get_archive_reasons
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

### 13. lever_move_candidate_to_stage
**What it does:** Moves a candidate to a different stage in the hiring pipeline. Tracks who made the change.

**Use when:**
- Advancing candidates through pipeline
- Moving candidates backward in process
- Bulk stage updates needed

**How to use:**
```
"Move candidate ID abc123 to stage ID phone-screen-456"
"Move opportunity xyz789 to stage 'Onsite Interview' with stage_id def456"
```

**Features:**
- Records who performed the action
- Shows before/after stage names
- Validates stage IDs

---

## Advanced Search Tools

### 14. lever_advanced_search
**What it does:** Powerful multi-criteria search combining companies, skills, locations, and tags. Can search through up to 90,000 candidates with paid plan.

**Use when:**
- Need complex searches with multiple filters
- Looking for candidates with specific combinations
- Building talent pools from various sources

**How to use:**
```
"Advanced search for candidates from Google, Meta with Python, Java skills in NYC, SF"
"Find candidates with tags 'senior, architect' from companies 'Stripe, Square' page 2"
```

**Features:**
- AND logic between criteria types, OR within each type
- Searches up to 90,000 candidates (paid plan)
- Supports pagination
- Returns detailed search statistics

---

### 15. lever_find_by_company
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

### 16. lever_find_internal_referrals_for_role
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

## Application Management Tools

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

## Dashboard & Analytics Tools

### 20. lever_recruiter_dashboard
**What it does:** Comprehensive dashboard showing all postings, candidates, and upcoming interviews for a specific recruiter. Supports pagination and multiple view modes.

**Use when:**
- Need complete overview of recruiter's pipeline
- Tracking upcoming interviews across all roles
- Getting recruiting metrics and statistics
- Weekly/daily recruiting reviews

**How to use:**
```
"Show recruiter dashboard for John Smith"
"Get dashboard for owner_id abc123 with interviews for next 7 days"
"Dashboard for Sarah Johnson page 2 with full candidate details"
```

**Features:**
- Pagination for large datasets
- Summary mode (default) vs detailed mode
- Interview tracking with interviewer details
- Stage distribution analytics
- Can fetch ALL candidates per posting
- Performance metrics included

**Parameters:**
- `summary_mode`: true (default) for stats only
- `max_candidates_per_posting`: 100 (default), use -1 for ALL
- `focus_interviews_only`: Filter to only show candidates with interviews
- `page` and `postings_per_page`: For pagination

---

### 21. lever_find_postings_by_owner
**What it does:** Finds all postings owned by a specific recruiter/owner. Essential for recruiter-specific views.

**Use when:**
- Building recruiter dashboards
- Finding all roles a recruiter manages
- Ownership auditing

**How to use:**
```
"Find all postings owned by Ciarli Bolden"
"Find postings by owner_id 5783ab12-4e5e-47ea"
```

---

## Requisition Management Tools

### 22. lever_list_requisitions
**What it does:** Lists all requisitions including both filled and open positions, with HRIS integration data.

**Use when:**
- Tracking requisition status
- HRIS reporting and compliance
- Understanding hiring capacity
- Headcount planning

**How to use:**
```
"List all requisitions"
"Show open requisitions only"
"List requisitions for Engineering team"
```

**Returns:**
- Requisition codes (internal and HRIS)
- Status and headcount info
- Associated postings
- Creation and fill dates

---

### 23. lever_get_requisition_details
**What it does:** Gets detailed information about a specific requisition by ID or code.

**Use when:**
- Need full requisition details
- Checking HRIS sync status
- Understanding requisition history

**How to use:**
```
"Get requisition details for ID abc123"
"Get details for requisition code ENG-145"
```

**Features:**
- Supports both Lever ID and HRIS codes
- Shows all associated postings
- Includes approval workflow info

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

### Managing Recruiter Pipeline
1. Use `lever_recruiter_dashboard` for complete overview
2. Use `lever_find_postings_by_owner` for posting list
3. Track interviews and stage distribution
4. Use `lever_move_candidate_to_stage` to advance candidates

### Advanced Talent Search
1. Use `lever_advanced_search` for complex multi-criteria searches (up to 90,000 candidates)
2. Use `lever_find_by_company` for company-specific searches
3. Use `lever_search_archived_candidates` for past candidates
4. Combine with `lever_get_candidate` for full profiles

### Requisition Tracking
1. Use `lever_list_requisitions` for overview
2. Use `lever_get_requisition_details` for specific req info
3. Cross-reference with `lever_list_open_roles` for posting status

## Important Improvements (Paid Plan)

With Cloudflare Workers paid plan ($5/month), you get:
1. **20x more search capacity**: Search up to 90,000 candidates (was 4,500)
2. **Comprehensive dashboards**: Fetch ALL candidates per posting
3. **Better accuracy**: No sampling, get complete data
4. **Faster performance**: More parallel API calls allowed

## Important Limitations

1. **No Resume Content Search**: Cannot search within resume text
2. **No File Downloads**: Files must be accessed through Lever web interface
3. **Rate Limits**: Maximum 10 requests per second to Lever API
4. **Stage Modifications**: Can now move candidates between stages with `lever_move_candidate_to_stage`

## Tips for Recruiters

- Always use owner_id instead of owner_name when possible - it's more reliable
- Use the recruiter dashboard for daily/weekly reviews
- Set up saved searches using advanced search criteria
- Use pagination to manage large result sets
- Check archived candidates before posting new roles
- Track requisitions for headcount compliance

## 🎯 Interview Optimization Fix (January 2025)

### Problem Solved
Previously, the recruiter dashboard would miss many scheduled interviews because it only checked the first 20 candidates (usually "New applicant" stage) for interview data, hitting API limits before reaching candidates who actually have interviews scheduled.

### How the Fix Works
The `lever_recruiter_dashboard` tool now **prioritizes checking candidates in interview-relevant stages first**:

1. **Stage Prioritization**: Automatically identifies candidates in stages like:
   - TA Phone Screen
   - Hiring Manager Interview  
   - Loop Interview / Loop Interview 2
   - Executive Interview
   - Aptitude Assessment
   - Technical Interview
   - Panel Interview
   - Reference Check / Background Check

2. **Smart API Usage**: 
   - Checks up to 50 priority candidates (in interview stages) first
   - Then checks up to 20 additional candidates if API calls remain
   - Stays under the 900 API call limit

3. **Accurate Interview Counts**: Now correctly finds and reports interviews for candidates like Kavye and others who are progressing through the pipeline.

### New Parameters

```typescript
// Enable/disable interview stage prioritization (default: true)
prioritize_interview_stages: boolean

// Override default stages with custom list (optional)
interview_priority_stages: string // e.g., "TA Phone Screen,Loop Interview,Final Interview"
```

### Usage Examples

**Default (Optimized) Behavior:**
```json
{
  "owner_name": "ciarli bolden",
  "include_interviews": true,
  "prioritize_interview_stages": true  // Default: true
}
```

**Custom Priority Stages:**
```json
{
  "owner_name": "ciarli bolden", 
  "include_interviews": true,
  "interview_priority_stages": "Phone Screen,Technical Interview,Final Interview"
}
```

**Legacy Behavior (Not Recommended):**
```json
{
  "owner_name": "ciarli bolden",
  "include_interviews": true,
  "prioritize_interview_stages": false  // Uses old first-20-candidates logic
}
```

### Results
- ✅ **Accurate interview counts** - No more "0 interviews scheduled" when you know there are many
- ✅ **Better performance** - API calls focused on candidates most likely to have interviews  
- ✅ **Comprehensive coverage** - Finds interviews for candidates in all pipeline stages
- ✅ **Configurable** - Customize which stages to prioritize for your specific pipeline

### Performance Tracking
The response now includes optimization metrics:
```json
{
  "performance": {
    "interview_optimization_enabled": true,
    "custom_priority_stages": false,
    "api_calls_used": 157
  },
  "recommendations": {
    "interview_optimization": "Interview stage prioritization is ENABLED. This prioritizes checking candidates in interview stages first for more accurate interview counts."
  }
}
```

This fix ensures that when you ask "show me all candidates with interviews this week", you'll get **accurate, complete results** instead of missing critical interview data due to API limitations.