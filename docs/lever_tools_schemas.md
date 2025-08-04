# Lever MCP Tools - Complete Schema Documentation

This document provides the complete tool schema documentation for all 29 Lever MCP tools, including tool names, descriptions, and input schemas.

---

## Basic Search Tools

### 1. lever_search_candidates

**Name:** lever_search_candidates

**Description:** Primary search tool for finding candidates across your entire ATS database. Searches through names and emails, with optional stage filtering.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "Search query for candidate name or email"
    },
    "stage": {
      "type": "string",
      "description": "Optional pipeline stage to filter by"
    },
    "limit": {
      "type": "number",
      "description": "Maximum number of results to return (default: 100, max: 200)"
    }
  },
  "required": []
}
```

---

### 2. lever_quick_find_candidate

**Name:** lever_quick_find_candidate

**Description:** Optimized tool for finding a specific individual candidate quickly by name or email. Returns first 5 matches.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "Candidate name or email address to search for"
    }
  },
  "required": ["query"]
}
```

---

### 3. lever_find_candidate_in_posting

**Name:** lever_find_candidate_in_posting

**Description:** Searches for candidates within a specific job posting. More efficient than general search when you know which role to search in.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "posting_id": {
      "type": "string",
      "description": "The job posting ID to search within"
    },
    "query": {
      "type": "string",
      "description": "Candidate name or email to search for"
    },
    "stage": {
      "type": "string",
      "description": "Optional pipeline stage to filter by"
    }
  },
  "required": ["posting_id", "query"]
}
```

---

## Candidate Information Tools

### 4. lever_get_candidate

**Name:** lever_get_candidate

**Description:** Retrieves comprehensive details about a single candidate including contact info, current stage, tags, work history, and all metadata.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "opportunity_id": {
      "type": "string",
      "description": "The unique opportunity ID for the candidate"
    }
  },
  "required": ["opportunity_id"]
}
```

---

### 5. lever_add_note

**Name:** lever_add_note

**Description:** Adds timestamped notes to a candidate's profile. Notes are permanent and visible to all team members.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "opportunity_id": {
      "type": "string",
      "description": "The opportunity ID to add the note to"
    },
    "note": {
      "type": "string",
      "description": "The note content to add to the candidate's profile"
    }
  },
  "required": ["opportunity_id", "note"]
}
```

---

## Role & Posting Management Tools

### 6. lever_list_open_roles

**Name:** lever_list_open_roles

**Description:** Lists all currently published job postings across your organization with details like title, location, team, and posting URL.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {},
  "required": []
}
```

---

### 7. lever_find_candidates_for_role

**Name:** lever_find_candidates_for_role

**Description:** Returns all candidates who have applied to a specific job posting, organized by pipeline stage.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "posting_id": {
      "type": "string",
      "description": "The job posting ID to find candidates for"
    },
    "limit": {
      "type": "number",
      "description": "Maximum number of candidates to return (default: 100)"
    }
  },
  "required": ["posting_id"]
}
```

---

### 8. lever_find_postings_by_owner

**Name:** lever_find_postings_by_owner

**Description:** Finds job postings owned by a specific recruiter or hiring manager, with option to filter by posting state.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "owner": {
      "type": "string",
      "description": "Owner name or ID to search for"
    },
    "state": {
      "type": "string",
      "description": "Optional posting state filter (e.g., 'published', 'draft')"
    }
  },
  "required": ["owner"]
}
```

---

## Pipeline Management Tools

### 9. lever_get_stages

**Name:** lever_get_stages

**Description:** Lists all configured pipeline stages in your Lever account (e.g., 'New Applicant', 'Phone Screen', 'Onsite').

**Input Schema:**
```json
{
  "type": "object",
  "properties": {},
  "required": []
}
```

---

### 10. lever_get_archive_reasons

**Name:** lever_get_archive_reasons

**Description:** Returns all pre-configured archive reasons with their IDs.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {},
  "required": []
}
```

---

### 11. lever_move_candidate_to_stage

**Name:** lever_move_candidate_to_stage

**Description:** Moves a candidate to a different pipeline stage with proper validation.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "opportunity_id": {
      "type": "string",
      "description": "The opportunity ID of the candidate to move"
    },
    "stage_id": {
      "type": "string",
      "description": "The target stage ID to move the candidate to"
    }
  },
  "required": ["opportunity_id", "stage_id"]
}
```

---

### 12. lever_archive_candidate

**Name:** lever_archive_candidate

**Description:** Removes a candidate from active consideration by archiving them with a specific reason (e.g., 'Not a fit', 'Withdrew').

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "opportunity_id": {
      "type": "string",
      "description": "The opportunity ID of the candidate to archive"
    },
    "reason_id": {
      "type": "string",
      "description": "The archive reason ID (use lever_get_archive_reasons to get valid IDs)"
    }
  },
  "required": ["opportunity_id", "reason_id"]
}
```

---

## Advanced Search Tools

### 13. lever_advanced_search

**Name:** lever_advanced_search

**Description:** Powerful multi-criteria search combining companies, skills, locations, and tags. Uses AND logic between criteria types, OR within each type.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "companies": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "List of company names to search for"
    },
    "skills": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "List of skills to search for"
    },
    "locations": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "List of locations to search for"
    },
    "tags": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "List of candidate tags to search for"
    }
  },
  "required": []
}
```

---

### 14. lever_find_by_company

**Name:** lever_find_by_company

**Description:** Specialized search for finding candidates from specific companies, with option to filter for current employees only.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "companies": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "List of company names to search for"
    },
    "current_only": {
      "type": "boolean",
      "description": "Filter for current employees only (default: false)"
    }
  },
  "required": ["companies"]
}
```

---

### 15. lever_find_internal_referrals_for_role

**Name:** lever_find_internal_referrals_for_role

**Description:** Identifies internal employees who might refer candidates for a specific role based on their experience and connections.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "posting_id": {
      "type": "string",
      "description": "The job posting ID to find internal referrals for"
    }
  },
  "required": ["posting_id"]
}
```

---

## File & Application Management Tools

### 16. lever_list_files

**Name:** lever_list_files

**Description:** Lists all files attached to a candidate, including resumes and other documents.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "opportunity_id": {
      "type": "string",
      "description": "The opportunity ID to list files for"
    }
  },
  "required": ["opportunity_id"]
}
```

---

### 17. lever_list_applications

**Name:** lever_list_applications

**Description:** Lists ALL job applications for a single candidate across different roles they've applied to.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "opportunity_id": {
      "type": "string",
      "description": "The opportunity ID to list applications for"
    }
  },
  "required": ["opportunity_id"]
}
```

---

### 18. lever_get_application

**Name:** lever_get_application

**Description:** Provides detailed information about a SPECIFIC application to one job.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "opportunity_id": {
      "type": "string",
      "description": "The opportunity ID"
    },
    "application_id": {
      "type": "string",
      "description": "The specific application ID"
    }
  },
  "required": ["opportunity_id", "application_id"]
}
```

---

## Enterprise & Requisition Tools

### 19. lever_list_requisitions

**Name:** lever_list_requisitions

**Description:** Lists all requisitions in your Lever account with filtering options for status, requisition codes, and dates.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "status": {
      "type": "string",
      "description": "Filter by requisition status (e.g., 'open', 'closed')"
    },
    "requisition_code": {
      "type": "string",
      "description": "Filter by specific requisition code"
    },
    "created_after": {
      "type": "string",
      "description": "Filter by creation date (ISO format)"
    },
    "created_before": {
      "type": "string",
      "description": "Filter by creation date (ISO format)"
    }
  },
  "required": []
}
```

---

### 20. lever_get_requisition_details

**Name:** lever_get_requisition_details

**Description:** Retrieves detailed information about a specific requisition using either Lever ID or external requisition code.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "requisition_id": {
      "type": "string",
      "description": "The Lever requisition ID or external HRIS code"
    }
  },
  "required": ["requisition_id"]
}
```

---

## Dashboard & Analytics Tools

### 21. lever_recruiter_dashboard

**Name:** lever_recruiter_dashboard

**Description:** Comprehensive dashboard showing all recruiting activities for a specific recruiter, including pipeline status, upcoming interviews, and workload distribution.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "owner": {
      "type": "string",
      "description": "Recruiter name or ID to show dashboard for"
    },
    "include_interviews": {
      "type": "boolean",
      "description": "Include upcoming interview data (default: true)"
    },
    "page": {
      "type": "number",
      "description": "Page number for pagination (default: 1)"
    }
  },
  "required": ["owner"]
}
```

---

### 22. lever_search_archived_candidates

**Name:** lever_search_archived_candidates

**Description:** Advanced search through archived candidates with filtering by date ranges, archive reasons, and posting IDs.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "posting_id": {
      "type": "string",
      "description": "Filter by specific job posting"
    },
    "archive_reason": {
      "type": "string",
      "description": "Filter by archive reason"
    },
    "archived_after": {
      "type": "string",
      "description": "Filter by archive date (ISO format)"
    },
    "archived_before": {
      "type": "string",
      "description": "Filter by archive date (ISO format)"
    },
    "limit": {
      "type": "number",
      "description": "Maximum number of results to return"
    }
  },
  "required": []
}
```

---

## Debug & Testing Tools

### 23. test_lever_connection

**Name:** test_lever_connection

**Description:** Validates the connection to Lever API and tests basic functionality.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {},
  "required": []
}
```

---

### 24. test_rate_limits

**Name:** test_rate_limits

**Description:** Tests rate limiting implementation with configurable request patterns.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "requests": {
      "type": "number",
      "description": "Number of test requests to make (default: 10)"
    },
    "delay": {
      "type": "number",
      "description": "Delay between requests in milliseconds (default: 100)"
    }
  },
  "required": []
}
```

---

### 25. verify_api_response

**Name:** verify_api_response

**Description:** Examines raw API responses to verify data structure and consistency.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "endpoint": {
      "type": "string",
      "description": "API endpoint to test (e.g., 'opportunities', 'postings')"
    },
    "sample_size": {
      "type": "number",
      "description": "Number of samples to verify (default: 5)"
    }
  },
  "required": ["endpoint"]
}
```

---

### 26. debug_get_candidate

**Name:** debug_get_candidate

**Description:** Returns raw candidate data for debugging format or data issues.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "opportunity_id": {
      "type": "string",
      "description": "The opportunity ID to debug"
    }
  },
  "required": ["opportunity_id"]
}
```

---

### 27. debug_postings

**Name:** debug_postings

**Description:** Provides raw posting data structure for debugging purposes.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "posting_id": {
      "type": "string",
      "description": "Optional specific posting ID to debug"
    }
  },
  "required": []
}
```

---

### 28. debug_opportunities_list

**Name:** debug_opportunities_list

**Description:** Debugging tool for examining opportunity list responses and data consistency.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "limit": {
      "type": "number",
      "description": "Number of opportunities to examine (default: 10)"
    },
    "offset": {
      "type": "number",
      "description": "Offset for pagination testing (default: 0)"
    }
  },
  "required": []
}
```

---

## Summary

This document covers all 29 Lever MCP tools:
- **23 Core Recruiting Tools** (1-22): Primary tools for recruiting workflows
- **6 Debug & Testing Tools** (23-28): Development and troubleshooting tools

Each tool includes:
- **Name**: The exact tool identifier
- **Description**: What the tool does and when to use it
- **Input Schema**: Complete JSON schema with required and optional parameters

For detailed usage examples and workflow guidance, refer to the [Lever Tools Complete Guide](lever_tools_guide.md).