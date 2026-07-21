# 🚀 Sprint 1 Kickoff Guide
## E-Learning Platform Development

**Date**: January 19, 2026  
**Sprint**: Sprint 1 - Authentication & Core Setup  
**Duration**: 2 weeks (Week 3-4)  
**Goal**: Users can register, login, and access platform with proper roles

---

## 📋 Step 1: Set Up GitHub Project Board (5 minutes)

### Option A: Using GitHub Web Interface (Recommended)

#### 1. Go to Your Repository
```
https://github.com/manyal12345/E-LearningWebApp
```

#### 2. Create New Project
1. Click **Projects** tab at the top
2. Click **New project** (green button)
3. Choose **Board** template
4. Click **Create**

#### 3. Name Your Project
- **Name**: E-Learning Platform Development
- **Description**: Sprint planning and tracking for AI-powered school management platform

#### 4. Configure Columns
The board comes with default columns. Customize them:

**Rename columns**:
- Todo → **📋 Backlog**
- In Progress → **🏗️ In Progress**
- Done → **✅ Done**

**Add new columns** (click + at the right):
- **🎯 Sprint Ready** (between Backlog and In Progress)
- **👀 In Review** (between In Progress and Done)
- **🚀 Released** (after Done)

**Final column order**:
1. 📋 Backlog
2. 🎯 Sprint Ready
3. 🏗️ In Progress
4. 👀 In Review
5. ✅ Done
6. 🚀 Released

#### 5. Add Sprint 1 Issues to Board
1. Click **+ Add item** in the "Sprint Ready" column
2. Search for your issues (#1-#8)
3. Add all 8 Sprint 1 issues
4. They should all go into "Sprint Ready" column

#### 6. Configure Custom Fields (Optional but Recommended)
1. Click **⚙️** (settings) in top right
2. Click **+ New field**
3. Add these fields:

**Field 1: Story Points**
- Type: Number
- Description: Effort estimation

**Field 2: Sprint**
- Type: Single select
- Options: Sprint 0, Sprint 1, Sprint 2, etc.

**Field 3: Epic**
- Type: Single select
- Options: Authentication, School Admin, Students, Attendance, etc.

**Field 4: Priority**
- Type: Single select
- Options: P0 (Critical), P1 (High), P2 (Medium), P3 (Low)

#### 7. Fill in Custom Fields for Sprint 1 Issues
For each issue, click on it and fill in:
- Story Points: (see table below)
- Sprint: Sprint 1
- Epic: Authentication
- Priority: (see table below)

---

### Option B: Quick Setup Without Custom Fields

If you want to start quickly:
1. Create project with Board template
2. Add all Sprint 1 issues to "Sprint Ready" column
3. Start working!

You can add custom fields later.

---

## 📊 Sprint 1 Issues Reference

| # | Title | Story Points | Priority | Assignee |
|---|-------|--------------|----------|----------|
| #1 | User Registration API | 5 | P0 | (assign) |
| #2 | JWT Authentication | 5 | P0 | (assign) |
| #3 | RBAC Implementation | 8 | P0 | (assign) |
| #4 | Password Reset | 3 | P1 | (assign) |
| #5 | Login/Register UI | 5 | P0 | (assign) |
| #6 | Protected Route Middleware | 3 | P0 | (assign) |
| #7 | Tenant Creation Workflow | 8 | P0 | (assign) |
| #8 | User Profile Page | 3 | P1 | (assign) |

**Total**: 40 story points  
**Backend**: 29 points (5 issues)  
**Frontend**: 11 points (3 issues)

---

## 🎯 Step 2: Assign Issues to Team Members

### If Working Solo
```bash
# Assign all issues to yourself
gh issue edit 1 --add-assignee @me
gh issue edit 2 --add-assignee @me
gh issue edit 3 --add-assignee @me
gh issue edit 4 --add-assignee @me
gh issue edit 5 --add-assignee @me
gh issue edit 6 --add-assignee @me
gh issue edit 7 --add-assignee @me
gh issue edit 8 --add-assignee @me
```

### If Working with Team
1. Go to each issue on GitHub
2. Click **Assignees** on the right
3. Select team member(s)

**Recommended distribution**:
- **Backend Developer 1**: #1, #2 (10 points)
- **Backend Developer 2**: #3, #7 (16 points)
- **Frontend Developer 1**: #5, #6 (8 points)
- **Frontend Developer 2**: #8 (3 points)
- **Full Stack**: #4 (3 points)

---

## 📅 Step 3: Sprint Planning Meeting

### Agenda (2 hours)

#### 1. Sprint Goal Review (15 min)
**Goal**: Users can register, login, and access platform with proper roles

**Success Criteria**:
- ✅ Users can register with email/password
- ✅ Users can login and receive JWT token
- ✅ Role-based access control works (Admin, Teacher, Student, Parent)
- ✅ Password reset functionality works
- ✅ Login/Register UI is complete and responsive
- ✅ Protected routes prevent unauthorized access
- ✅ SaaS admin can create new school tenants
- ✅ Users can view and edit their profile

#### 2. Review Each Issue (60 min)
For each issue:
- Read user story and acceptance criteria
- Discuss technical approach
- Confirm story point estimate
- Identify dependencies
- Ask questions

#### 3. Commitment (15 min)
- Team commits to delivering all 40 points
- Identify any risks or concerns
- Agree on daily standup time

#### 4. Sprint Ceremonies Schedule (15 min)
- **Daily Standup**: Every day, 9:00 AM, 15 minutes
- **Sprint Review**: End of Week 4, 2 hours
- **Sprint Retrospective**: End of Week 4, 1.5 hours
- **Sprint Planning (Sprint 2)**: Start of Week 5, 2 hours

#### 5. Definition of Done Review (15 min)
An issue is "Done" when:
- ✅ Code written and follows style guidelines
- ✅ Unit tests written (>80% coverage)
- ✅ Integration tests pass
- ✅ Code reviewed and approved
- ✅ Acceptance criteria met
- ✅ Documentation updated
- ✅ Deployed to staging
- ✅ Product owner approval

---

## 🏃 Step 4: Start Sprint 1!

### Day 1: Setup and First Issue

#### 1. Pick Your First Issue
```bash
# View your assigned issues
gh issue list --assignee @me

# View specific issue
gh issue view 1
```

**Recommended starting order**:
1. Start with #1 (User Registration API) or #5 (Login/Register UI)
2. These are foundational and don't have dependencies

#### 2. Create Feature Branch
```bash
# For issue #1
git checkout -b feature/1-user-registration-api

# Or for issue #5
git checkout -b feature/5-login-register-ui
```

#### 3. Move Issue to "In Progress"
- On GitHub Project board
- Drag issue from "Sprint Ready" to "In Progress"

#### 4. Start Coding!
Follow the acceptance criteria in the issue.

**For #1 (User Registration API)**:
- Create POST /api/auth/register endpoint
- Implement email validation
- Hash password with bcrypt
- Return JWT token
- Add error handling
- Write unit tests

**For #5 (Login/Register UI)**:
- Create login page (/login)
- Create registration page (/register)
- Add form validation
- Handle errors
- Add loading states
- Make responsive

---

## 📝 Step 5: Daily Workflow

### Every Morning (9:00 AM - Daily Standup)

**Format** (15 minutes max):
- **What did I do yesterday?**
- **What will I do today?**
- **Any blockers?**

**Update Project Board**:
- Move completed issues to "In Review" or "Done"
- Update issue comments with progress

### During the Day

#### When You Complete Work
```bash
# Commit with issue reference
git add .
git commit -m "[#1] feat: Add user registration API

- Implemented POST /api/auth/register endpoint
- Added email validation
- Password hashing with bcrypt
- JWT token generation
- Error handling for duplicate emails
- Unit tests with 85% coverage"

# Push to GitHub
git push -u origin feature/1-user-registration-api
```

#### Create Pull Request
```bash
# Create PR
gh pr create --title "User Registration API" --body "Closes #1

## Changes
- Implemented user registration endpoint
- Email validation
- Password hashing
- JWT token generation

## Testing
- Unit tests: 85% coverage
- Manual testing: ✅ Passed

## Screenshots
(if applicable)
"

# Or use GitHub web interface
```

#### Move to "In Review"
- On Project board, drag issue to "In Review" column

### End of Day

#### Update Progress
```bash
# Add comment to issue
gh issue comment 1 --body "Progress update:
- ✅ Implemented registration endpoint
- ✅ Added email validation
- ✅ Password hashing working
- ⏳ Writing unit tests (80% done)
- 📅 Tomorrow: Complete tests and create PR"
```

---

## 🔄 Step 6: Code Review Process

### When Your PR is Ready

#### 1. Request Review
```bash
# Request review from team member
gh pr review 1 --request @teammate

# Or on GitHub: Click "Reviewers" and select
```

#### 2. Wait for Review
- Reviewer has 24 hours to review
- Address any comments
- Make requested changes

#### 3. After Approval
```bash
# Merge PR
gh pr merge 1 --squash

# Delete branch
git branch -d feature/1-user-registration-api
```

#### 4. Move to "Done"
- On Project board, drag issue to "Done" column
- Issue automatically closes when PR merges

---

## 📊 Step 7: Track Progress

### Daily
```bash
# View sprint progress
gh issue list --milestone "Sprint 1" --state all

# Count completed
gh issue list --milestone "Sprint 1" --state closed | wc -l
```

### Weekly
- Review burndown chart on Project board
- Check velocity (story points completed)
- Adjust if needed

### Sprint Metrics to Track
- **Velocity**: Story points completed per sprint
- **Burndown**: Remaining work over time
- **Cycle Time**: Time from "In Progress" to "Done"
- **Lead Time**: Time from issue creation to "Done"

---

## 🎯 Sprint 1 Success Criteria

### Technical
- ✅ All 8 issues completed
- ✅ All acceptance criteria met
- ✅ Code coverage >80%
- ✅ All tests passing
- ✅ No P0 bugs

### Functional
- ✅ Users can register
- ✅ Users can login
- ✅ RBAC works correctly
- ✅ Password reset works
- ✅ UI is responsive
- ✅ Protected routes work
- ✅ Tenant creation works
- ✅ Profile page works

### Process
- ✅ Daily standups conducted
- ✅ All PRs reviewed
- ✅ Project board updated daily
- ✅ Sprint review completed
- ✅ Sprint retrospective completed

---

## 🆘 Troubleshooting

### Issue: Can't Create Project Board
**Solution**: Use GitHub web interface (easier than CLI)

### Issue: Don't Know Where to Start
**Solution**: Start with #1 (User Registration API) - it's foundational

### Issue: Stuck on an Issue
**Solution**:
1. Add comment on issue describing the problem
2. Ask in daily standup
3. Pair program with teammate
4. Review documentation

### Issue: Behind Schedule
**Solution**:
1. Identify blockers
2. Reduce scope (defer P1 issues)
3. Ask for help
4. Extend sprint if necessary

---

## 📚 Resources

### Documentation
- **Sprint Planning**: `.agent/planning/01-sprint-planning-backlog.md`
- **User Stories**: `.agent/product-discovery/04-user-stories.md`
- **Architecture**: `.agent/architecture/architecture-diagrams.md`
- **Quick Reference**: `QUICK-REFERENCE.md`

### Commands
```bash
# View issues
gh issue list --milestone "Sprint 1"

# View specific issue
gh issue view 1

# Create branch
git checkout -b feature/1-description

# Commit
git commit -m "[#1] feat: Description"

# Create PR
gh pr create

# View PRs
gh pr list
```

---

## 🎉 Let's Go!

You're ready to start Sprint 1! Here's your immediate action plan:

### Right Now (Next 30 minutes)
1. ✅ Set up GitHub Project board (5 min)
2. ✅ Add all Sprint 1 issues to board (2 min)
3. ✅ Assign issues to yourself/team (3 min)
4. ✅ Pick first issue (#1 or #5) (1 min)
5. ✅ Create feature branch (1 min)
6. ✅ Start coding! (rest of the day)

### Tomorrow
1. ✅ Daily standup (15 min)
2. ✅ Continue working on first issue
3. ✅ Create PR when done
4. ✅ Start second issue

### This Week
1. ✅ Complete 3-4 issues
2. ✅ Daily standups
3. ✅ Code reviews
4. ✅ Update project board

---

**Sprint Goal**: Users can register, login, and access platform with proper roles

**Let's build something amazing! 🚀**

---

**Created**: January 19, 2026, 21:18 NPT  
**Sprint Start**: Now!  
**Sprint End**: February 14, 2026
