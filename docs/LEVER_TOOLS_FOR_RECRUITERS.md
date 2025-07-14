# Lever MCP Tools - Complete Guide for Recruiters

*Your comprehensive guide to finding, managing, and tracking candidates using AI-powered search through Claude Desktop*

---

## 🎯 How to Use This Guide

This guide explains all 20 Lever tools available through Claude Desktop. Each tool is organized by what you actually need to do as a recruiter, with real examples and practical tips.

**Quick Navigation:**
- [🔍 Finding Candidates](#finding-candidates) (6 tools)
- [📋 Getting Candidate Details](#getting-candidate-details) (2 tools)
- [💼 Managing Job Postings](#managing-job-postings) (2 tools)
- [📝 Taking Actions](#taking-actions) (4 tools) <!-- Updated count -->
- [🔎 Advanced Search](#advanced-search) (3 tools)
- [📋 Requisition Management](#requisition-management) (2 tools) <!-- New section -->
- [🚀 Pipeline Management](#pipeline-management) (1 tool) <!-- New section -->

---

## 🔍 Finding Candidates

### 1. **lever_search_candidates** - Your Main Search Tool
**What it does:** Searches your entire candidate database by name or email. Like using the search bar in Lever, but smarter.

**Best for:**
- Finding candidates by name: "Find candidates named Sarah Johnson"
- Looking up by email: "Search for john.doe@gmail.com"
- Filtering by stage: "Find candidates in Phone Screen stage"
- General searches: "Show me recent candidates"

**Recruiter tip:** Use this when you remember a candidate's name or email but need to find them quickly.

---

### 2. **lever_quick_find_candidate** - Fast Lookup
**What it does:** Quickly finds a specific person when you know their name or email. Returns top 5 matches only.

**Best for:**
- "Quick find Sarah from Microsoft"
- "Quick find candidate with email sarah@company.com"
- When you need fast results for one specific person

**Recruiter tip:** Use this instead of the main search when you know exactly who you're looking for.

---

### 3. **lever_find_candidate_in_posting** - Search Within a Job
**What it does:** Looks for candidates who applied to a specific job posting. More efficient than searching everything.

**Best for:**
- "Find John Smith in the Software Engineer posting"
- When you know someone applied to a specific role
- Avoiding overwhelming results from general searches

**Recruiter tip:** Much faster than searching everything - use when you know the job posting.

---

### 4. **lever_find_candidates_for_role** - See All Applicants
**What it does:** Shows everyone who applied to a specific job, organized by pipeline stage.

**Best for:**
- "Show me all candidates for the Marketing Manager role"
- "List everyone who applied to posting ID xyz789"
- Getting a complete view of your applicant pool

**Recruiter tip:** Perfect for weekly pipeline reviews or when planning interview schedules.

---

### 5. **lever_find_by_company** - Target Specific Companies
**What it does:** Finds candidates from specific companies, with option to filter for current employees.

**Best for:**
- "Find candidates from Google, Meta, Apple"
- "Show me current employees at Stripe and Square"
- Building talent pipeline from competitors

**Recruiter tip:** Great for sourcing from target companies or understanding your talent pool composition.

---

### 6. **lever_advanced_search** - Complex Multi-Criteria Search
**What it does:** Powerful search combining companies, skills, locations, and tags all at once.

**Best for:**
- "Find candidates from Google or Meta with Python skills in NYC or SF"
- "Search for senior engineers with React experience from startups"
- Complex searches with multiple requirements

**Recruiter tip:** Use this when you need candidates who meet several specific criteria simultaneously.

---

## 📋 Getting Candidate Details

### 7. **lever_get_candidate** - Full Candidate Profile
**What it does:** Gets complete information about one candidate including contact info, stage, tags, work history, and notes.

**Best for:**
- "Get full details for candidate ID abc123"
- "Show me everything about this candidate"
- Before interviews or important calls

**What you'll see:**
- Contact information (emails, phones, LinkedIn)
- Current pipeline stage and owner
- Tags and source information
- Work history and organizations
- All application details

**Recruiter tip:** Use this before every candidate conversation to refresh your memory with all available details.

---

### 8. **lever_list_files** - See Candidate Documents
**What it does:** Lists all files attached to a candidate (resume, cover letter, portfolio, etc.).

**Best for:**
- "List all files for candidate ID abc123"
- "What documents did this candidate submit?"
- Checking if resume was uploaded

**Recruiter tip:** Use this to verify candidates submitted required documents or to prepare for interviews.

---

## 💼 Managing Job Postings

### 9. **lever_list_open_roles** - See All Open Positions
**What it does:** Lists all currently published job postings with details like title, location, team, and application URL.

**Best for:**
- "List all open roles"
- "Show me all published job postings"
- Getting overview of hiring needs

**Recruiter tip:** Use this at the start of your week to remind yourself of all active searches.

---

### 10. **lever_find_internal_referrals_for_role** - Find Internal Connectors
**What it does:** Identifies internal employees who might refer candidates for a specific role based on their background.

**Best for:**
- "Find internal referrals for posting ID abc123"
- "Who internally could refer candidates for the Senior Engineer role?"
- Activating employee referral programs

**Recruiter tip:** Use this when external sourcing is challenging - leverage your internal network.

---

## 📝 Taking Actions

### 14. **lever_add_note** - Document Everything
**What it does:** Adds permanent, timestamped notes to a candidate's profile. All team members can see these notes.

**Best for:**
- "Add note to candidate abc123: Great cultural fit, technical skills solid"
- Documenting interview feedback
- Recording important decisions or next steps
- Keeping team updated on candidate status

**Recruiter tip:** Notes cannot be edited or deleted, so be thoughtful about what you write.

---

### 15. **lever_archive_candidate** - Clean Up Your Pipeline
**What it does:** Removes candidates from active consideration by archiving them with a specific reason.

**Best for:**
- "Archive candidate abc123 with reason 'Not a cultural fit'"
- Cleaning up your active pipeline
- Documenting why candidates were removed
- Maintaining organized candidate tracking

**Recruiter tip:** Always use lever_get_archive_reasons first to get valid reason IDs.

---

### 16. **lever_get_stages** - Know Your Pipeline
**What it does:** Shows all the stages configured in your Lever pipeline (like "Phone Screen", "Onsite", etc.).

**Best for:**
- Understanding your hiring process
- Finding stage IDs for filtering searches
- Confirming stage names for team communication

**Recruiter tip:** Use this to understand your pipeline structure and stage IDs.

---

### 17. **lever_get_archive_reasons** - Archive Properly
**What it does:** Lists all the pre-configured reasons you can use when archiving candidates.

**Best for:**
- Finding valid archive reason IDs
- Understanding your organization's archive categories
- Ensuring consistent archiving across team

**Recruiter tip:** Always check this before archiving to use the right reason ID.

---

## 🔎 Advanced Search

### 18. **lever_advanced_search** - Multi-Criteria Search
**What it does:** Combines multiple search criteria like companies, skills, locations, and tags for precise candidate targeting.

**Best for:**
- "Find candidates from Google or Meta with Python skills in NYC"
- Complex sourcing requirements
- Targeted candidate searches
- When simple searches return too many results

**Recruiter tip:** Uses AND logic between criteria types, OR within each type (e.g., (Google OR Meta) AND Python AND NYC).

---

### 19. **lever_find_by_company** - Target Specific Companies
**What it does:** Finds candidates who worked at specific companies, with option to filter for current employees only.

**Best for:**
- "Find all candidates from Amazon, current employees only"
- Competitive intelligence and sourcing
- Building target company lists
- Identifying potential poaches

**Recruiter tip:** Set current_only=true to focus on people still at target companies.

---

### 20. **lever_find_internal_referrals_for_role** - Leverage Your Network
**What it does:** Identifies existing candidates who could refer people for specific roles based on their background.

**Best for:**
- "Find internal referrals for Software Engineer role"
- Leveraging employee networks
- Finding warm introduction opportunities
- Expanding sourcing beyond direct applications

**Recruiter tip:** Look for candidates with related experience who might know good fits.

---

## 📋 Requisition Management

### 21. **lever_list_requisitions** - View All Job Requisitions
**What it does:** Lists all job requisitions with filtering options by status, requisition code, and creation date.

**Best for:**
- "Show all open requisitions"
- "Find requisition with code ENG-145"
- Getting overview of all hiring needs
- Filtering by status (open, closed, onHold, draft)
- Checking headcount and hiring progress

**Key Features:**
- Filter by status: open, closed, onHold, draft
- Search by external requisition code (e.g., "ENG-145")
- View headcount: total vs hired vs remaining
- See compensation bands and team assignments

**Recruiter tip:** Use this to get a bird's-eye view of all your hiring needs and track progress against headcount goals.

---

### 22. **lever_get_requisition_details** - Deep Dive on Specific Requisitions
**What it does:** Shows detailed information about a specific requisition using either the Lever ID or external requisition code.

**Best for:**
- "Get details for requisition ENG-145"
- "Show me requisition 52881d44-4f95-4fcb-bf28-2b344ea58889"
- Understanding full requisition context
- Checking approval status and custom fields
- Viewing associated job postings

**Smart Lookup:** Automatically detects whether you're using a Lever ID (UUID) or external code, tries both methods.

**Recruiter tip:** You can use either the external code (like "ENG-145") or the internal Lever ID - the tool figures out which one you're using.

---

## 🚀 Pipeline Management

### 23. **lever_move_candidate_to_stage** - Advance Candidates Through Pipeline
**What it does:** Moves candidates between pipeline stages (e.g., from "Phone Screen" to "Onsite Interview").

**Best for:**
- "Move candidate abc123 to stage def456"
- Advancing candidates after interviews
- Bulk stage updates
- Keeping pipeline current

**Important:** You need the stage ID (use lever_get_stages to find valid IDs).

**Recruiter tip:** Always use lever_get_stages first to find the correct stage ID for your target stage.

---

## 🎯 Common Recruiting Workflows

### 📞 Preparing for a Call
1. **lever_get_candidate** - Get full candidate details
2. **lever_list_files** - Check what documents they submitted
3. **lever_add_note** - Document the conversation afterward

### 📊 Weekly Pipeline Review
1. **lever_list_open_roles** - Remind yourself of all open positions
2. **lever_find_candidates_for_role** - Review each role's applicants
3. **lever_archive_candidate** - Clean up candidates no longer under consideration
4. **lever_move_candidate_to_stage** - Advance qualified candidates

### 🎯 Targeted Sourcing
1. **lever_find_by_company** - Start with target companies
2. **lever_advanced_search** - Add specific skills/location requirements
3. **lever_get_candidate** - Get full details on promising candidates

### 🔍 Following Up on Referrals
1. **lever_find_internal_referrals_for_role** - Identify potential referrers
2. **lever_search_candidates** - Check if referred person is already in system
3. **lever_add_note** - Document referral source

### 📋 Requisition Management
1. **lever_list_requisitions** - Review all open requisitions
2. **lever_get_requisition_details** - Get full context on specific hiring needs
3. **lever_find_candidates_for_role** - Match candidates to requisitions

---

## 💡 Pro Tips for Recruiters

### ✅ Best Practices
- **Use email searches first** - they're faster and more accurate
- **Add notes immediately** after conversations while details are fresh
- **Archive consistently** to keep your pipeline organized
- **Use posting-specific searches** to reduce overwhelming results
- **Check file lists** before interviews to see what candidates submitted
- **Track requisitions** to ensure you're meeting headcount goals
- **Move candidates through stages** to keep pipeline current

### ⚠️ Important Limitations
- **No resume content search** - you can't search inside resume text
- **No file downloads** - files must be accessed through Lever directly
- **Search limits** - name searches check first 200-300 candidates only
- **Stage moves require stage IDs** - use lever_get_stages to find them
- **Archive requires reason IDs** - use lever_get_archive_reasons first

### 🔄 New Workflow Improvements
With the new tools, you can now:
- **Manage the full recruiting lifecycle** from requisition to hire
- **Keep candidates moving** through your pipeline efficiently
- **Track progress** against headcount goals
- **Maintain organized archives** with proper documentation

---

## 🆘 When Things Don't Work

### "No results found"
- Try broader search terms
- Check spelling of names/companies
- Use email instead of name if available

### "Too many results"
- Add more specific criteria
- Use posting-specific searches
- Try advanced search with multiple filters

### "Can't find someone I know is there"
- Try different search terms
- Check if they're archived
- Search by email instead of name

### "System seems slow"
- Break large searches into smaller ones
- Search during off-peak hours
- Be more specific with criteria

---

## 📞 Need Help?

Remember: Claude Desktop is your AI recruiting assistant that knows your Lever database. Ask questions naturally, like you would ask a colleague:

- "Find me software engineers from Google in the Bay Area"
- "Show me everyone who applied to the marketing role this week"
- "Get me full details on the candidate we interviewed yesterday"

The more specific you are, the better results you'll get! 🎯 