# Changelog

All notable changes to the Lever MCP Server project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- **BREAKING**: Major tool consolidation - reduced from 29 to 14 tools
- **BREAKING**: `lever_search_candidates` now uses `stage_name` parameter instead of `stage`
- Enhanced `lever_advanced_search` with 8 new parameters for more flexible searching
- Enhanced `lever_find_candidates_for_role` with stage name filtering
- Updated system prompt to v2.0 with streamlined tool documentation
- All stage-related parameters now accept human-readable stage names instead of IDs

### Added
- New `lever_update_candidate` tool that consolidates stage updates, tag management, and owner assignment
- Stage name resolution utility (`src/utils/stage-helpers.ts`) with caching support
- `addCandidateTags` and `removeCandidateTags` methods in LeverClient
- Comprehensive testing verification documentation
- Pull request summary documentation

### Removed
- Debug tools: `debug_get_candidate`, `debug_postings`, `debug_opportunities_list`
- Test tools: `test_lever_connection`, `test_rate_limits`, `verify_api_response`
- Redundant tools: `lever_find_by_company`, `lever_quick_find_candidate`, `lever_find_candidate_in_posting`
- Niche tools: `lever_find_internal_referrals_for_role`, `lever_recruiter_dashboard`
- Superseded tools: `lever_move_candidate_to_stage`, `lever_get_application`

### Fixed
- Stage ID confusion by supporting human-readable stage names throughout the system
- Tool redundancy and overlap issues
- Overwhelming number of tools for users

## [Previous versions...]