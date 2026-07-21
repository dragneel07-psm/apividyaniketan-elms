# Quick Setup Guide
## GitHub Project Management & CI/CD

**Created**: January 19, 2026  
**Estimated Time**: 30 minutes

---

## 📋 What's Been Created

### 1. GitHub Issue Templates ✅
- `.github/ISSUE_TEMPLATE/user-story.md`
- `.github/ISSUE_TEMPLATE/bug-report.md`
- `.github/ISSUE_TEMPLATE/technical-task.md`
- `.github/PULL_REQUEST_TEMPLATE.md`

### 2. GitHub Actions Workflows ✅
- `.github/workflows/backend-ci.yml` - Backend CI/CD pipeline
- `.github/workflows/frontend-ci.yml` - Frontend CI/CD pipeline

### 3. Automation Scripts ✅
- `scripts/create-sprint1-issues.sh` - Create all Sprint 1 issues
- `scripts/generate-diagrams.sh` - Export architecture diagrams as PNG

---

## 🚀 Quick Start (30 minutes)

### Step 1: Install GitHub CLI (5 minutes)

```bash
# macOS
brew install gh

# Or download from: https://cli.github.com/

# Authenticate
gh auth login
```

### Step 2: Create Sprint 1 Issues (2 minutes)

```bash
# Run the script
./scripts/create-sprint1-issues.sh

# Verify issues created
gh issue list --milestone "Sprint 1"
```

**What this creates**:
- 8 issues for Sprint 1 (40 story points)
- All with proper labels, milestones, and dependencies
- Ready to assign to team members

### Step 3: Set Up GitHub Project Board (10 minutes)

1. Go to your GitHub repository
2. Click **Projects** tab → **New Project**
3. Choose **Board** template
4. Name it: "E-Learning Platform Development"

**Configure Columns**:
- 📋 Backlog
- 🎯 Sprint Ready
- 🏗️ In Progress
- 👀 In Review
- ✅ Done
- 🚀 Released

**Add Custom Fields**:
- Sprint (Single Select): Sprint 0, Sprint 1, ..., Sprint 11
- Priority (Single Select): P0, P1, P2, P3
- Story Points (Number)
- Epic (Single Select): Auth, School Admin, Students, etc.

**Link Issues**:
- Drag Sprint 1 issues to "Sprint Ready" column
- Assign to team members

### Step 4: Configure GitHub Secrets (10 minutes)

For CI/CD workflows to work, add these secrets:

**Go to**: Repository → Settings → Secrets and variables → Actions

**Backend Secrets**:
```
DOCKER_USERNAME=your-docker-username
DOCKER_PASSWORD=your-docker-password
DIGITALOCEAN_ACCESS_TOKEN=your-do-token
SNYK_TOKEN=your-snyk-token (optional)
SLACK_WEBHOOK=your-slack-webhook (optional)
```

**Frontend Secrets**:
```
VERCEL_TOKEN=your-vercel-token
VERCEL_ORG_ID=your-vercel-org-id
VERCEL_PROJECT_ID=your-vercel-project-id
NEXT_PUBLIC_API_URL=https://api.platform.com
```

### Step 5: Generate Architecture Diagrams (3 minutes)

```bash
# Install mermaid-cli
npm install -g @mermaid-js/mermaid-cli

# Generate PNG diagrams
./scripts/generate-diagrams.sh

# View generated diagrams
ls -lh .agent/architecture/diagrams/
```

**Alternative**: View diagrams on GitHub (no installation needed)
- Push `.agent/architecture/architecture-diagrams.md` to GitHub
- Diagrams render automatically!

---

## 📊 What Happens Next

### When You Push Code

**Backend** (`.github/workflows/backend-ci.yml`):
1. ✅ Lint check (Black, Flake8, isort)
2. ✅ Run tests with PostgreSQL
3. ✅ Generate coverage report
4. ✅ Security scan (Snyk)
5. ✅ Build Docker image
6. ✅ Deploy to staging/production

**Frontend** (`.github/workflows/frontend-ci.yml`):
1. ✅ Lint check (ESLint, Prettier)
2. ✅ TypeScript type check
3. ✅ Run tests (Jest)
4. ✅ Generate coverage report
5. ✅ Build Next.js app
6. ✅ Security scan (Snyk)
7. ✅ Deploy to Vercel
8. ✅ Run Lighthouse CI

### When You Create a PR

1. ✅ All CI checks run automatically
2. ✅ Preview deployment created (Vercel)
3. ✅ Comment added with preview URL
4. ✅ Status checks must pass before merge

### When You Merge to Main

1. ✅ Production deployment triggered
2. ✅ Slack notification sent (if configured)
3. ✅ Lighthouse CI runs on production URL

---

## 🎯 Daily Workflow

### Morning Routine
```bash
# Check your assigned issues
gh issue list --assignee @me --state open

# Pull latest changes
git pull origin develop

# Start working on an issue
git checkout -b feature/1-user-registration-api
```

### During Development
```bash
# Make changes, commit frequently
git add .
git commit -m "[#1] feat: Add user registration API"

# Push to GitHub
git push origin feature/1-user-registration-api

# Create PR
gh pr create --title "User Registration API" --body "Closes #1"
```

### Code Review
```bash
# Review PRs assigned to you
gh pr list --search "review-requested:@me"

# Checkout PR locally to test
gh pr checkout 123

# Approve PR
gh pr review 123 --approve

# Merge PR
gh pr merge 123 --squash
```

---

## 📈 Metrics Dashboard

### View Sprint Progress
```bash
# List all Sprint 1 issues
gh issue list --milestone "Sprint 1" --state all

# Count completed issues
gh issue list --milestone "Sprint 1" --state closed | wc -l

# View burndown
gh issue list --milestone "Sprint 1" --json number,title,state,labels
```

### View CI/CD Status
```bash
# Check workflow runs
gh run list --limit 10

# View specific run
gh run view [run-id]

# Re-run failed workflow
gh run rerun [run-id]
```

---

## 🔧 Troubleshooting

### Issue: GitHub CLI not authenticated
```bash
# Solution
gh auth login
# Follow the prompts
```

### Issue: Mermaid diagrams not generating
```bash
# Solution: Reinstall mermaid-cli
npm uninstall -g @mermaid-js/mermaid-cli
npm install -g @mermaid-js/mermaid-cli
```

### Issue: CI/CD workflow failing
```bash
# Check workflow logs
gh run view [run-id] --log

# Common fixes:
# 1. Check secrets are set correctly
# 2. Verify branch names match workflow triggers
# 3. Ensure tests pass locally first
```

### Issue: Can't create issues
```bash
# Check if milestone exists
gh api repos/:owner/:repo/milestones

# Create milestone if missing
gh api repos/:owner/:repo/milestones -f title="Sprint 1"
```

---

## 📚 Additional Resources

### Documentation
- [GitHub CLI Manual](https://cli.github.com/manual/)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Mermaid Docs](https://mermaid.js.org/)
- [Vercel Deployment](https://vercel.com/docs)

### Project Docs
- [Project Board Setup](../.agent/project-management/project-board-setup.md)
- [Architecture Diagrams](../.agent/architecture/architecture-diagrams.md)
- [Sprint Planning](../.agent/planning/01-sprint-planning-backlog.md)

---

## ✅ Checklist

### Initial Setup
- [ ] GitHub CLI installed and authenticated
- [ ] Sprint 1 issues created
- [ ] GitHub Project board configured
- [ ] GitHub secrets added
- [ ] Architecture diagrams generated

### Team Onboarding
- [ ] Team members have GitHub access
- [ ] Team members assigned to issues
- [ ] Sprint planning meeting scheduled
- [ ] Daily standup time set

### CI/CD
- [ ] Backend workflow tested
- [ ] Frontend workflow tested
- [ ] Deployment secrets configured
- [ ] Slack notifications working (optional)

---

## 🎉 You're Ready!

Everything is set up for efficient project management and automated CI/CD. 

**Next Steps**:
1. Assign Sprint 1 issues to team members
2. Start Sprint 1 planning meeting
3. Begin development!

**Questions?** Check the documentation or create a GitHub discussion.

---

**Last Updated**: January 19, 2026  
**Maintainer**: Project Team
