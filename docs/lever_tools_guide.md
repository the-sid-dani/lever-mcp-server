# Lever MCP Tools Complete Guide - v3.0

This guide provides a comprehensive overview of all 16 Lever MCP tools. Version 3.0 adds interview management capabilities with 2 new tools, expanding from the 14 tools in v2.0.

## Table of Contents
1. [Primary Search Tools](#primary-search-tools) (2 tools)
2. [Candidate Information Tools](#candidate-information-tools) (2 tools)
3. [Role & Posting Management Tools](#role--posting-management-tools) (3 tools)
4. [Pipeline Management Tools](#pipeline-management-tools) (3 tools)
5. [File & Application Management Tools](#file--application-management-tools) (2 tools)
6. [Candidate Update Tools](#candidate-update-tools) (1 tool)
7. [Archived Candidate Tools](#archived-candidate-tools) (1 tool)
8. [Interview Management Tools](#interview-management-tools) (2 tools) 🆕

---

## Primary Search Tools

### 1. lever_advanced_search ⭐ Enhanced
**What it does:** Your Swiss Army knife for 90% of queries. Powerful multi-criteria search with comprehensive filtering capabilities.

**New Capabilities:**
- **Stage Name Support**: Use `stages: ["Interview", "Phone Screen"]` instead of IDs
- **Partial Stage Match**: Use `stage_contains: "interview"` to match any interview stage
- **Name Search**: Use `name: "John"` for candidate name filtering
- **Email Search**: Use `email: "john@example.com"` for exact email matching
- **Current Company Only**: Use `current_company_only: true` to filter for current employees
- **Include Archived**: Use `archived: true` to include archived candidates
- **Date Filtering**: Use `created_after: "2024-01-01"` for date-based filtering
- **Search Modes**: Use `mode: "quick"` for faster results (limits to 500 candidates)

**Use when:**
- Need complex searches with multiple filters
- Looking for candidates from specific companies
- Want to filter by stage names
- Need date-based filtering
- Replacing old tools like lever_find_by_company

**How to use:**
```
"Find engineers in interviews" → 
lever_advanced_search({ stage_contains: "interview" })

"Google employees in technical stage for role ABC" → 
lever_advanced_search({ 
  companies: ["Google"], 
  stages: ["Technical Interview"],
  posting_id: "ABC",
  current_company_only: true
})

"Recent candidates from FAANG companies" →
lever_advanced_search({
  companies: ["Google", "Meta", "Apple", "Netflix", "Amazon"],
  created_after: "2024-01-01",
  mode: "quick"
})
```

**Logic:** (company1 OR company2) AND (skill1 OR skill2) AND (location1 OR location2) AND stages AND other filters

---

### 2. lever_search_candidates ⭐ Enhanced
**What it does:** Simple candidate search with basic filtering. Now supports stage names and posting filtering.

**New Capabilities:**
- **Stage Name Support**: Use `stage_name: "Phone Screen"` instead of stage ID
- **Posting Filter**: Use `posting_id: "abc123"` to search within a specific posting

**Use when:**
- Basic name or email lookups
- Need simple stage filtering
- Want to search within a specific posting
- Don't need the advanced features of lever_advanced_search

**How to use:**
```
"Search for candidates named John in Phone Screen"
lever_search_candidates({ 
  query: "John",
  stage_name: "Phone Screen"
})

"Find engineers in posting ABC"
lever_search_candidates({
  query: "engineer",
  posting_id: "ABC"
})
```

**Limitations:** 
- Limited to 200 results by default
- Email searches are exact match
- For complex searches, use lever_advanced_search

---

## Candidate Information Tools

### 3. lever_get_candidate
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

### 4. lever_add_note
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

### 5. lever_list_open_roles
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

### 6. lever_find_candidates_for_role ⭐ Enhanced
**What it does:** Returns all candidates who have applied to a specific job posting, with optional stage filtering.

**New Capabilities:**
- **Stage Name Filtering**: Use `stage_names: ["Phone Screen", "Interview"]` to filter by stages

**Use when:**
- Reviewing applicants for a role in specific stages
- Understanding pipeline distribution
- Need posting-specific candidate list with stage filtering

**How to use:**
```
"Find all candidates for posting ABC in interview stages"
lever_find_candidates_for_role({ 
  posting_id: "ABC",
  stage_names: ["Phone Screen", "Technical Interview", "Onsite Interview"]
})

"Show everyone who applied to Senior Engineer role"
lever_find_candidates_for_role({ 
  posting_id: "xyz789",
  limit: 200
})
```

---

### 7. lever_find_postings_by_owner
**What it does:** Finds job postings owned by a specific recruiter or hiring manager, with option to filter by posting state.

**Use when:**
- Checking a specific recruiter's workload
- Finding all postings for a hiring manager
- Auditing posting ownership

**How to use:**
```
"Find all postings owned by John Smith"
"Show me published postings for owner name 'Jane Doe'"
```

**Note:** Searches by owner name (not ID)

---

## Pipeline Management Tools

### 8. lever_get_stages
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

**Important:** Stage names are now supported throughout the system - no need to use IDs!

---

### 9. lever_get_archive_reasons
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

### 10. lever_archive_candidate
**What it does:** Removes a candidate from active consideration by archiving them with a specific reason.

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

### 11. lever_list_files
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

### 12. lever_list_applications
**What it does:** Lists ALL job applications for a single candidate across different roles they've applied to.

**Use when:**
- Candidate applied to multiple positions
- Need overview of all their applications
- Checking application history

**How to use:**
```
"List all applications for opportunity ID abc123"
"Show me all jobs candidate xyz789 has applied to"
```

---

## Candidate Update Tools

### 13. lever_update_candidate 🆕 New Tool
**What it does:** Consolidated tool for updating candidate stage, owner, or tags in one call.

**Capabilities:**
- **Stage Updates**: Use `stage_name: "Phone Screen"` or `stage_id: "abc123"`
- **Tag Management**: Use `add_tags: ["priority", "technical"]` and `remove_tags: ["old-tag"]`
- **Owner Assignment**: Use `owner_id: "user123"` (Note: API limitation - not fully implemented)

**Use when:**
- Moving candidates between stages
- Managing candidate tags
- Need to make multiple updates at once

**How to use:**
```
"Move candidate to Phone Screen and add priority tag"
lever_update_candidate({
  opportunity_id: "xyz789",
  stage_name: "Phone Screen",
  add_tags: ["priority", "needs-review"]
})

"Update candidate tags"
lever_update_candidate({
  opportunity_id: "xyz789",
  add_tags: ["technical", "senior"],
  remove_tags: ["junior"]
})
```

**Note:** This tool replaces the old lever_move_candidate_to_stage tool

---

## Archived Candidate Tools

### 14. lever_search_archived_candidates
**What it does:** Advanced search through archived candidates with filtering by date ranges, archive reasons, and posting IDs.

**Use when:**
- Historical analysis
- Compliance reporting
- Re-engaging previous candidates
- Finding candidates archived for specific reasons

**How to use:**
```
"Find archived candidates from last month"
lever_search_archived_candidates({
  archived_at_start: "2024-01-01",
  archived_at_end: "2024-01-31"
})

"Search archived candidates for Software Engineer roles"
lever_search_archived_candidates({
  posting_id: "abc123",
  fetch_all_pages: true
})
```

**Features:** Full pagination support, interview history, reason tracking

---

## Interview Management Tools

### 15. lever_get_interview_insights 🆕 New Tool
**What it does:** Provides comprehensive interview data and insights with flexible filtering options for WHO, WHEN, and WHAT you want to see.

**Capabilities:**
- **WHO Filtering**: Filter by owner_email, posting_id, opportunity_id, or interviewer_email
- **WHEN Filtering**: Use time_scope (past_week, this_week, next_week, this_month, custom)
- **WHAT Views**: Choose view_type (dashboard, detailed, analytics, preparation)
- **Smart Filters**: Filter by status, stage, priority, and feedback submission
- **Bulk Analysis**: Aggregate data across multiple opportunities

**Use when:**
- Need interview dashboard for upcoming week
- Analyzing interviewer workload
- Tracking feedback completion rates
- Preparing for interviews
- Generating interview analytics

**How to use:**
```
"Show me all interviews for this week"
lever_get_interview_insights({ 
  time_scope: "this_week",
  view_type: "dashboard"
})

"Get detailed interview schedule for opportunity ABC"
lever_get_interview_insights({
  opportunity_id: "ABC",
  view_type: "detailed",
  include_candidate_context: true
})

"Analytics for all technical interviews this month"
lever_get_interview_insights({
  time_scope: "this_month",
  stage_filter: "Technical Interview",
  view_type: "analytics"
})
```

**View Types:**
- **dashboard**: Summary statistics, upcoming/recent interviews
- **detailed**: Full interview details with all metadata
- **analytics**: Interviewer performance, scheduling patterns
- **preparation**: Next interview details and prep notes

**Limitations:**
- Currently requires opportunity_id for specific data
- Broader searches (by posting/owner) show placeholder message
- No real-time availability checking

---

### 16. lever_manage_interview 🆕 New Tool
**What it does:** Manages the complete interview lifecycle - schedule, reschedule, cancel, and track outcomes.

**Actions:**
- **schedule**: Create new interview (within a panel)
- **reschedule**: Change interview date/time
- **cancel**: Cancel an interview
- **update_outcome**: Record interview results (use notes)
- **bulk_schedule**: Schedule multiple interviews
- **check_availability**: Not supported (API limitation)

**Use when:**
- Scheduling any type of interview
- Need to reschedule due to conflicts
- Canceling interviews
- Recording interview outcomes
- Setting up interview panels

**How to use:**
```
"Schedule a technical interview for tomorrow at 2pm"
lever_manage_interview({
  action: "schedule",
  opportunity_id: "opp123",
  perform_as: "user123",
  interview_details: {
    type: "technical",
    date: "2024-01-16T14:00:00Z",
    duration_minutes: 60,
    location: "Zoom link",
    subject: "Technical Interview",
    timezone: "America/Los_Angeles",
    interviewers: [{ id: "int123" }]
  }
})

"Reschedule interview ABC to next Monday"
lever_manage_interview({
  action: "reschedule",
  opportunity_id: "opp123",
  interview_id: "int456",
  perform_as: "user123",
  reschedule_data: {
    new_date: "2024-01-22T14:00:00Z",
    reason: "Candidate conflict"
  }
})
```

**Critical Requirements:**
- **perform_as**: Required for all create/update/delete operations
- **Panel Creation**: Interviews must be created within panels
- **externallyManaged**: Only API-created interviews can be modified

**Limitations:**
- Cannot modify interviews created in Lever UI
- No calendar/availability integration
- Bulk operations create individual panels per opportunity

---

## Migration Guide: What Changed

### Tools Removed (Your Old Workflows)
1. **lever_quick_find_candidate** → Use `lever_search_candidates`
2. **lever_find_candidate_in_posting** → Use `lever_search_candidates` with `posting_id`
3. **lever_find_by_company** → Use `lever_advanced_search` with `companies` parameter
4. **lever_find_internal_referrals_for_role** → Removed (too niche)
5. **lever_recruiter_dashboard** → Removed (complex with limited utility)
6. **lever_move_candidate_to_stage** → Use `lever_update_candidate`
7. **lever_get_application** → Use `lever_list_applications`
8. All debug tools → Removed (not needed for production)

### Key Improvements
- **Stage Names Everywhere**: No more confusing stage IDs!
- **Better Search**: lever_advanced_search now handles company searches, date filtering, and more
- **Consolidated Updates**: lever_update_candidate handles stages and tags in one call
- **Cleaner Toolset**: From 29 to 14 tools with no loss of essential functionality

---

## Quick Reference: Common Workflows

### Finding a Specific Person
1. Use `lever_search_candidates` with email (most accurate)
2. If no email, use name search
3. For complex criteria, use `lever_advanced_search`

### Finding Candidates from Specific Companies
```
lever_advanced_search({
  companies: ["Google", "Meta"],
  current_company_only: true
})
```

### Reviewing Applicants for a Role in Specific Stages
```
lever_find_candidates_for_role({
  posting_id: "abc123",
  stage_names: ["Application Review", "Phone Screen"]
})
```

### Moving Candidates Through Pipeline
```
lever_update_candidate({
  opportunity_id: "xyz789",
  stage_name: "Technical Interview"
})
```

### Advanced Talent Search
```
lever_advanced_search({
  companies: ["Apple", "Google"],
  skills: ["Python", "AWS"],
  stages: ["Interview"],
  created_after: "2024-01-01",
  mode: "comprehensive"
})
```

## Important Limitations

1. **No Resume Content Search**: Cannot search within resume text
2. **No File Downloads**: Files must be accessed through Lever web interface  
3. **Search Limits**: Results limited based on tool and mode
4. **Rate Limits**: Maximum 8 requests per second
5. **Owner Updates**: Cannot update candidate owner (API limitation)
6. **Interview Restrictions**: 
   - Cannot modify interviews created in Lever UI (only API-created)
   - No calendar/availability checking
   - Interviews must be created within panels
   - `perform_as` parameter required for all modifications
7. **No Real-time Data**: Interview insights require specific opportunity_id

## Best Practices

- **Always use stage names** instead of IDs - the system handles conversion
- **Start with lever_advanced_search** - it covers most use cases
- **Use email search when possible** - it's faster and more accurate
- **Use specific filters** to reduce result sets
- **Add descriptive notes** for future reference
- **Check archive reasons** before archiving candidates
- **Use perform_as parameter** for interview modifications
- **Create interviews within panels** as required by API

---

## Version History

### v3.0 (January 2025)
- Added 2 new interview management tools:
  - `lever_get_interview_insights` - Comprehensive interview data and analytics
  - `lever_manage_interview` - Complete interview lifecycle management
- Enhanced documentation with interview-specific limitations
- Added support for panel-based interview creation
- Total tools increased from 14 to 16

### v2.0 (Previous)
- Consolidated tools from 29 to 14
- Enhanced stage name support across all tools
- Improved search capabilities
- Streamlined tool interfaces