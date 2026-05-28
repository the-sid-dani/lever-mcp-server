# Changelog

All notable changes to the Lever MCP Server project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] — 2026-05-27

### Added
- `lever_submit_feedback` for interview feedback submission.
- `lever_get_stage_history` for candidate stage-change visibility.
- `lever_get_users` on the live tool path.
- `lever_get_interview_insights` and consolidated `lever_manage_interview` interview workflows.
- GitHub Actions CI in `.github/workflows/ci.yml` with hard-gate type-check and test jobs, plus report-only lint/format checks until M3a.

### Changed
- Consolidated the tool surface from 26 to 17 live tools via the action-enum pattern.
- Replaced same-resource tool clusters with consolidated tools: `lever_notes` (3→1), `lever_feedback` (4→1), `lever_archive` (3→1), `lever_stages` (2→1), and `lever_requisitions` (2→1).
- Aligned documentation and runtime assumptions with the current Express + Cloud Run architecture.
- Hardened production runtime with a singleton `LeverClient` instead of per-session clients.

### Removed
- Purged unused dead code (`src/index.ts`) and stale tracing/config artifacts that were never imported by the live server.

### Fixed
- Preserved audit attribution in current single-tenant mode by injecting `LEVER_DEFAULT_USER_ID` through Secret Manager.
- Fixed container hardening by running the production Docker image as a non-root user.

### Security
- Moved `LEVER_DEFAULT_USER_ID` handling into managed secret injection for production deploys.

## [Unreleased]

## [Previous versions...]
