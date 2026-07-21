# Project Management Board Setup
## AI-Powered Multi-Tenant School Management Platform

**Version:** 1.0  
**Date:** January 19, 2026

---

## Board Structure

### Recommended Tool: GitHub Projects (Built-in)

**Why GitHub Projects?**
- ✅ Integrated with your repository
- ✅ Free for public/private repos
- ✅ Kanban and table views
- ✅ Automation capabilities
- ✅ Issue tracking built-in

**Alternative Options:**
- Jira (more features, paid)
- Trello (simple, visual)
- Linear (modern, fast)
- Asana (team collaboration)

---

## Board Setup Instructions

### Step 1: Create GitHub Project

1. Go to your repository: `https://github.com/[username]/E-LearningWebApp`
2. Click **Projects** tab
3. Click **New Project**
4. Choose **Board** template
5. Name it: "E-Learning Platform Development"

### Step 2: Configure Columns

Create the following columns:

1. **📋 Backlog** - All planned work
2. **🎯 Sprint Ready** - Ready for current sprint
3. **🏗️ In Progress** - Currently being worked on
4. **👀 In Review** - Code review / QA
5. **✅ Done** - Completed this sprint
6. **🚀 Released** - Deployed to production

### Step 3: Add Custom Fields

Add these fields to track additional information:

| Field Name | Type | Options |
|------------|------|---------|
| **Sprint** | Single Select | Sprint 0, Sprint 1, ..., Sprint 11 |
| **Priority** | Single Select | P0 (Critical), P1 (High), P2 (Medium), P3 (Low) |
| **Story Points** | Number | 1, 2, 3, 5, 8, 13, 21 |
| **Epic** | Single Select | Auth, School Admin, Students, Attendance, etc. |
| **Assignee** | Person | Team members |
| **Status** | Status | Backlog, In Progress, Done |

---

## Issue Templates

### Template 1: User Story

```markdown
## User Story
As a [persona]
I want [action/feature]
So that [benefit/value]

## Acceptance Criteria
- [ ] Given [context]
- [ ] When [action]
- [ ] Then [expected outcome]

## Technical Notes
[Any technical considerations]

## Story Points
[1, 2, 3, 5, 8, 13, 21]

## Sprint
Sprint [X]

## Dependencies
- Depends on: #[issue number]
- Blocks: #[issue number]
```

### Template 2: Bug Report

```markdown
## Bug Description
[Clear description of the bug]

## Steps to Reproduce
1. [First step]
2. [Second step]
3. [...]

## Expected Behavior
[What should happen]

## Actual Behavior
[What actually happens]

## Environment
- Browser: [e.g., Chrome 120]
- OS: [e.g., macOS 14]
- User Role: [e.g., Admin]

## Screenshots
[If applicable]

## Priority
[P0/P1/P2/P3]
```

### Template 3: Technical Task

```markdown
## Task Description
[What needs to be done]

## Technical Details
[Implementation approach]

## Acceptance Criteria
- [ ] [Criterion 1]
- [ ] [Criterion 2]

## Story Points
[1, 2, 3, 5, 8, 13]

## Sprint
Sprint [X]
```

---

## Sprint 1 Issues (Example)

### Issue #1: User Registration API
```
Title: Implement User Registration API
Labels: backend, P0, Sprint-1
Epic: Authentication
Story Points: 5

## User Story
As a new user
I want to register with email and password
So that I can access the platform

## Acceptance Criteria
- [ ] POST /api/auth/register endpoint created
- [ ] Email validation implemented
- [ ] Password hashing with bcrypt
- [ ] Returns JWT token on success
- [ ] Error handling for duplicate emails
- [ ] Unit tests written

## Technical Notes
- Use djangorestframework-simplejwt
- Validate email format
- Password min 8 characters

## Dependencies
- None

## Sprint
Sprint 1
```

### Issue #2: JWT Authentication
```
Title: Implement JWT Authentication
Labels: backend, P0, Sprint-1
Epic: Authentication
Story Points: 5

## User Story
As a registered user
I want to login with my credentials
So that I can access protected resources

## Acceptance Criteria
- [ ] POST /api/auth/login endpoint created
- [ ] JWT token generation on successful login
- [ ] Refresh token mechanism
- [ ] Token expiration (15 min access, 7 day refresh)
- [ ] Middleware to validate tokens
- [ ] Unit tests written

## Dependencies
- Depends on: #1 (User Registration)

## Sprint
Sprint 1
```

### Issue #3: Role-Based Access Control
```
Title: Implement RBAC System
Labels: backend, P0, Sprint-1
Epic: Authentication
Story Points: 8

## User Story
As a system administrator
I want users to have specific roles
So that access to features is properly controlled

## Acceptance Criteria
- [ ] User model has role field (Admin, Teacher, Student, Parent)
- [ ] Permission decorators created
- [ ] API endpoints enforce role checks
- [ ] Admin can assign roles
- [ ] Unit tests for all roles

## Dependencies
- Depends on: #2 (JWT Authentication)

## Sprint
Sprint 1
```

---

## Automation Rules

### Rule 1: Auto-move to In Progress
**Trigger**: Issue assigned to someone  
**Action**: Move to "In Progress" column

### Rule 2: Auto-move to In Review
**Trigger**: Pull request created and linked  
**Action**: Move to "In Review" column

### Rule 3: Auto-move to Done
**Trigger**: Pull request merged  
**Action**: Move to "Done" column

### Rule 4: Auto-close
**Trigger**: Moved to "Released" column  
**Action**: Close issue

---

## Labels to Create

### Priority Labels
- `P0-critical` (red) - Must fix immediately
- `P1-high` (orange) - High priority
- `P2-medium` (yellow) - Medium priority
- `P3-low` (green) - Low priority

### Type Labels
- `feature` (blue) - New feature
- `bug` (red) - Bug fix
- `enhancement` (purple) - Improvement
- `documentation` (gray) - Documentation
- `technical-debt` (brown) - Technical debt

### Component Labels
- `backend` (dark blue)
- `frontend` (light blue)
- `database` (green)
- `ai` (purple)
- `devops` (orange)

### Sprint Labels
- `sprint-0` through `sprint-11`

### Epic Labels
- `epic-auth`
- `epic-school-admin`
- `epic-students`
- `epic-attendance`
- `epic-courses`
- `epic-assessments`
- `epic-ai`
- `epic-communication`
- `epic-fees`
- `epic-reporting`

---

## Milestones

Create milestones for each sprint:

1. **Sprint 0: Infrastructure** (Week 1-2) ✅ Complete
2. **Sprint 1: Authentication** (Week 3-4) - In Progress
3. **Sprint 2: School Admin** (Week 5-6)
4. **Sprint 3: Students** (Week 7-8)
5. **Sprint 4: Attendance** (Week 9-10)
6. **Sprint 5: Courses** (Week 11-12)
7. **Sprint 6: Assessments 1** (Week 13-14)
8. **Sprint 7: AI + Grading** (Week 15-16)
9. **Sprint 8: Communication + Fees** (Week 17-18)
10. **Sprint 9: Reporting** (Week 19-20)
11. **Sprint 10: Testing** (Week 21-22)
12. **Sprint 11: Deployment** (Week 23-24)
13. **MVP Launch** (June 30, 2026)

---

## Board Views

### View 1: Sprint Board (Default)
- **Filter**: Current sprint only
- **Group by**: Status (column)
- **Sort by**: Priority

### View 2: Backlog
- **Filter**: All unstarted issues
- **Group by**: Epic
- **Sort by**: Priority, then Story Points

### View 3: Team View
- **Filter**: Current sprint
- **Group by**: Assignee
- **Sort by**: Status

### View 4: Epic View
- **Filter**: All issues
- **Group by**: Epic
- **Sort by**: Sprint

---

## Metrics to Track

### Sprint Metrics
- **Velocity**: Story points completed per sprint
- **Burndown**: Remaining work over time
- **Cycle Time**: Time from "In Progress" to "Done"
- **Throughput**: Issues completed per sprint

### Quality Metrics
- **Bug Rate**: Bugs per sprint
- **Escaped Defects**: Bugs found in production
- **Code Review Time**: Time in "In Review"
- **Rework Rate**: Issues reopened

### Team Metrics
- **Capacity**: Available story points per sprint
- **Utilization**: Actual vs. planned capacity
- **WIP Limit**: Max issues in progress per person

---

## Daily Workflow

### Morning (9:00 AM)
1. Check board for your assigned issues
2. Move current work to "In Progress"
3. Update issue comments with progress

### During Day
1. Work on assigned issues
2. Create pull requests when ready
3. Move to "In Review" when PR created
4. Review others' PRs

### End of Day (5:00 PM)
1. Update issue comments with status
2. Note any blockers
3. Plan tomorrow's work

---

## Sprint Workflow

### Sprint Planning (Day 1)
1. Review backlog
2. Estimate story points
3. Commit to sprint goal
4. Move issues to "Sprint Ready"
5. Assign issues to team members

### Daily Standup (Every Day)
1. What did I do yesterday?
2. What will I do today?
3. Any blockers?
4. Update board accordingly

### Sprint Review (Last Day)
1. Demo completed features
2. Move completed issues to "Done"
3. Gather feedback
4. Update product backlog

### Sprint Retrospective (Last Day)
1. What went well?
2. What didn't go well?
3. Action items for improvement
4. Update process documentation

---

## Quick Start Commands

### Create Issue from Template
```bash
# Using GitHub CLI
gh issue create --title "Feature: User Login" \
  --body-file .github/ISSUE_TEMPLATE/user-story.md \
  --label "feature,backend,P0,sprint-1" \
  --milestone "Sprint 1"
```

### Bulk Create Issues
```bash
# Create all Sprint 1 issues
gh issue create --title "User Registration API" --label "backend,P0,sprint-1" --milestone "Sprint 1"
gh issue create --title "JWT Authentication" --label "backend,P0,sprint-1" --milestone "Sprint 1"
gh issue create --title "RBAC Implementation" --label "backend,P0,sprint-1" --milestone "Sprint 1"
# ... etc
```

### View Sprint Progress
```bash
# List all issues in current sprint
gh issue list --milestone "Sprint 1" --state all

# View burndown
gh issue list --milestone "Sprint 1" --state open --json number,title,labels
```

---

## Integration with Development

### Branch Naming Convention
```
feature/[issue-number]-short-description
bugfix/[issue-number]-short-description
hotfix/[issue-number]-short-description
```

**Examples:**
- `feature/1-user-registration-api`
- `bugfix/42-fix-login-error`
- `hotfix/99-security-patch`

### Commit Message Convention
```
[#issue-number] Type: Short description

Longer description if needed

- Detail 1
- Detail 2
```

**Examples:**
```
[#1] feat: Add user registration API

Implemented POST /api/auth/register endpoint with:
- Email validation
- Password hashing
- JWT token generation
```

### Pull Request Template
```markdown
## Related Issue
Closes #[issue-number]

## Changes Made
- [Change 1]
- [Change 2]

## Testing Done
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Screenshots
[If applicable]

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings
```

---

## Reporting

### Weekly Sprint Report
```markdown
# Sprint [X] - Week [Y] Report

## Completed (Story Points: [X])
- #1 User Registration API (5 pts)
- #2 JWT Authentication (5 pts)

## In Progress (Story Points: [X])
- #3 RBAC Implementation (8 pts)

## Blocked
- None

## Velocity
- Planned: 40 pts
- Completed: 10 pts
- Remaining: 30 pts

## Risks
- [Any risks identified]

## Next Week
- Complete RBAC
- Start tenant creation
```

---

## Best Practices

### Do's ✅
- Keep issues small and focused
- Update issues daily
- Link PRs to issues
- Use labels consistently
- Estimate story points as a team
- Review board in standup

### Don'ts ❌
- Don't create vague issues
- Don't skip acceptance criteria
- Don't work on unassigned issues
- Don't bypass code review
- Don't move issues manually (use automation)
- Don't ignore blockers

---

## Troubleshooting

### Issue: Too many issues in "In Progress"
**Solution**: Implement WIP limits (max 2 per person)

### Issue: Issues stuck in "In Review"
**Solution**: Set SLA for code reviews (24 hours)

### Issue: Velocity inconsistent
**Solution**: Review estimation process, adjust story points

### Issue: Scope creep
**Solution**: Strict sprint commitment, defer new work to backlog

---

**Document Owner**: Project Manager  
**Last Updated**: January 19, 2026  
**Review Cycle**: After each sprint
