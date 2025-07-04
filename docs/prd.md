# MCP Server for Lever ATS - Product Requirements Document

## 1. Executive Summary

### What We're Building
An MCP (Model Context Protocol) server that integrates Lever ATS (Applicant Tracking System) with Claude Desktop, enabling recruiters to manage their hiring pipeline through natural language conversations.

### Why We're Building It
Recruiters currently need to navigate complex ATS interfaces, remember specific workflows, and perform repetitive tasks manually. This integration allows them to simply tell Claude what they need in plain English, dramatically reducing time-to-action and improving recruiter productivity.

### Who Will Use It and How
Non-technical recruiters will interact with Claude Desktop using natural language to:
- Search for candidates
- Manage hiring pipelines
- Schedule interviews
- Submit feedback
- Generate reports

Example: Instead of clicking through multiple screens, a recruiter can simply say "Find me all senior engineers from Google who applied this month."

## 2. Problem Statement

### Current Pain Points
- **Complex Navigation**: Recruiters spend significant time clicking through multiple screens to perform simple tasks
- **Manual Repetitive Work**: Common actions like moving candidates through stages or adding notes require multiple steps
- **Limited Search Capabilities**: Finding the right candidates requires remembering exact filter combinations
- **Context Switching**: Recruiters constantly switch between email, calendar, ATS, and other tools
- **Reporting Complexity**: Getting insights requires technical knowledge or help from analysts

### Limitations of Existing Solutions
- Traditional ATS interfaces are designed for data entry, not productivity
- Existing integrations focus on data sync rather than workflow automation
- No conversational interface exists for Lever ATS
- Current tools don't understand context or natural language requests

### Opportunity for Improvement
Create a conversational layer that understands recruiting workflows and translates natural language into ATS actions, making expert recruiters more efficient and helping new recruiters ramp up faster.

## 3. Product Goals & Objectives

### Primary Objectives
- **Reduce Time-to-Action**: Cut the time to perform common recruiting tasks by 70%
- **Improve Accessibility**: Enable any recruiter to perform advanced searches without training
- **Increase Productivity**: Allow recruiters to manage 2x more candidates effectively
- **Enhance Decision Making**: Surface insights and patterns through natural conversation

### Success Metrics
- Average time to complete common tasks (target: <30 seconds)
- Number of daily active recruiter users
- Reduction in ATS training time for new hires
- Increase in recruiter satisfaction scores
- Number of candidates processed per recruiter per week

### Expected Outcomes
- Recruiters spend more time on high-value activities (candidate engagement)
- Faster time-to-fill for open positions
- Better candidate experience through quicker responses
- Improved quality of hire through better data utilization

## 4. Key Features & Capabilities

### Core Functionality
- **Natural Language Search**: Find candidates using conversational queries
- **Pipeline Management**: Move candidates through stages with simple commands
- **Smart Scheduling**: Schedule interviews considering availability and preferences
- **Automated Communications**: Send personalized emails to candidate groups
- **Intelligent Reporting**: Get insights through questions, not complex report builders

### User-Facing Features
- **Candidate Discovery**: "Find engineers from top tech companies with Python experience"
- **Quick Actions**: "Move Sarah to the offer stage"
- **Bulk Operations**: "Email all candidates waiting for feedback"
- **Context-Aware Responses**: Claude remembers previous queries and context
- **Proactive Suggestions**: "You have 5 candidates waiting for feedback"

### Integration Points
- Seamless integration with Claude Desktop
- Direct connection to Lever ATS API
- Calendar integration for interview scheduling
- Email integration for candidate communications

## 5. Use Cases & User Stories

### Primary Use Cases

**Use Case 1: Sourcing Candidates**
- **User Story**: As a recruiter, I want to find qualified candidates using natural language so I can quickly build a pipeline
- **Example**: "Show me all backend engineers from FAANG companies who applied in the last month"
- **Value**: Reduces search time from 10 minutes to 30 seconds

**Use Case 2: Managing Pipeline**
- **User Story**: As a recruiter, I want to update candidate statuses conversationally so I can focus on candidate relationships
- **Example**: "Move all phone screen candidates who haven't been contacted in a week to archived"
- **Value**: Bulk actions that would take an hour now take minutes

**Use Case 3: Interview Coordination**
- **User Story**: As a recruiter, I want to schedule interviews without leaving my conversation so I can maintain context
- **Example**: "Schedule a technical interview for John next week"
- **Value**: Eliminates context switching between calendar and ATS

**Use Case 4: Feedback Collection**
- **User Story**: As a hiring manager, I want to submit feedback quickly so candidates don't wait
- **Example**: "Submit feedback: Strong technical skills, great culture fit, recommend for offer"
- **Value**: Reduces feedback submission from a form-filling exercise to a simple statement

**Use Case 5: Reporting & Insights**
- **User Story**: As a recruiting manager, I want to understand pipeline health through conversation
- **Example**: "Which sources are bringing us the best engineers?"
- **Value**: Instant insights without building complex reports

## 6. Scope & Constraints

### What's Included in Version 1.0
- 20 essential recruiting tools covering daily workflows
- Natural language interface through Claude Desktop
- Support for core recruiting activities (search, pipeline management, communications)
- Basic reporting and analytics capabilities
- Single Lever account integration

### What's Explicitly Out of Scope
- Multi-ATS support (Lever only for v1)
- Advanced AI features (candidate scoring, predictive analytics)
- Custom workflow automation
- Integration with other HR systems
- Mobile application
- Team collaboration features

### Known Limitations
- Rate limiting constraints from Lever API (10 requests/second)
- Pagination limits (100 records per request)
- No bulk operations beyond what Lever supports
- Limited to text-based interactions (no voice)
- Requires Claude Desktop installation

## 7. Success Criteria

### How We'll Measure Success
- **Adoption Rate**: 80% of recruiters using the tool daily within 3 months
- **Efficiency Gains**: 50% reduction in time spent on administrative tasks
- **User Satisfaction**: Net Promoter Score (NPS) of 40+
- **Business Impact**: 20% improvement in time-to-fill metrics

### Expected Benefits
- **For Recruiters**: 
  - Spend 70% less time on repetitive tasks
  - Handle 2x more requisitions effectively
  - Reduce training time from weeks to days

- **For Candidates**: 
  - Faster response times
  - More consistent communication
  - Better overall experience

- **For the Organization**:
  - Faster hiring cycles
  - Better quality of hire
  - Reduced recruiting costs per hire
  - Competitive advantage in talent acquisition