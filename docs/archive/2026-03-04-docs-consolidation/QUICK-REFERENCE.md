# 🚀 Quick Reference Card
## E-Learning Platform - Essential Commands

---

## 📁 **Key Files**

```
README.md                    ← Start here!
SETUP.md                     ← 30-min quick setup
PROJECT-SUMMARY.md           ← Complete overview
MANUAL-SETUP.md              ← Alternative setup methods

.agent/
├── product-discovery/       ← Vision & requirements
├── planning/                ← Sprint planning & roadmap
├── project-management/      ← GitHub Projects guide
└── architecture/            ← System diagrams

scripts/
├── setup-all.sh            ← Automated setup (run this!)
├── create-sprint1-issues.sh ← Create GitHub issues
└── generate-diagrams.sh     ← Export diagrams as PNG
```

---

## ⚡ **Quick Start (Choose One)**

### Option A: Automated Setup (Recommended)
```bash
./scripts/setup-all.sh
```
**What it does**: Installs tools, creates issues, generates diagrams

### Option B: View on GitHub (Easiest!)
```bash
git add .
git commit -m "docs: Add project documentation"
git push
```
**Then**: View diagrams on GitHub (auto-renders!)

### Option C: Manual Setup
See `MANUAL-SETUP.md` for step-by-step instructions

---

## 🛠️ **Essential Commands**

### GitHub Issues
```bash
# List all Sprint 1 issues
gh issue list --milestone "Sprint 1"

# List your assigned issues
gh issue list --assignee @me

# Create an issue
gh issue create --title "Title" --label "backend,P0"

# View issue details
gh issue view 123
```

### Development Workflow
```bash
# Start working on an issue
git checkout -b feature/123-description

# Commit with issue reference
git commit -m "[#123] feat: Add feature"

# Create pull request
gh pr create --title "Title" --body "Closes #123"

# Review PR
gh pr review 123 --approve
```

### Architecture Diagrams
```bash
# Generate PNG exports
./scripts/generate-diagrams.sh

# View generated diagrams
open .agent/architecture/diagrams/

# Or view in VS Code (install Mermaid extension)
code .agent/architecture/architecture-diagrams.md
# Press Cmd+Shift+V
```

### Backend
```bash
cd backend
source .venv/bin/activate
python manage.py runserver      # Start server
python manage.py test            # Run tests
python manage.py migrate         # Run migrations
python manage.py createsuperuser # Create admin
```

### Frontend
```bash
cd frontend
npm run dev          # Start dev server
npm run build        # Build for production
npm run test         # Run tests
npm run lint         # Lint code
```

---

## 📊 **Sprint 1 Overview**

**Goal**: Users can register, login, and access platform with proper roles

**Duration**: Week 3-4  
**Story Points**: 40  
**Issues**: 8

### Backend (29 points)
1. User Registration API (5 pts)
2. JWT Authentication (5 pts)
3. RBAC Implementation (8 pts)
4. Password Reset (3 pts)
5. Tenant Creation (8 pts)

### Frontend (11 points)
6. Login/Register UI (5 pts)
7. Protected Routes (3 pts)
8. User Profile Page (3 pts)

---

## 🎯 **Daily Workflow**

### Morning
```bash
# Check assigned issues
gh issue list --assignee @me

# Pull latest changes
git pull origin develop

# Start working
git checkout -b feature/123-description
```

### During Day
```bash
# Make changes
git add .
git commit -m "[#123] feat: Description"

# Push changes
git push origin feature/123-description

# Create PR
gh pr create
```

### End of Day
```bash
# Update issue with progress
gh issue comment 123 --body "Progress update..."

# Review PRs
gh pr list --search "review-requested:@me"
```

---

## 📈 **Metrics & Monitoring**

### Sprint Progress
```bash
# View burndown
gh issue list --milestone "Sprint 1" --state all

# Count completed
gh issue list --milestone "Sprint 1" --state closed | wc -l
```

### CI/CD Status
```bash
# Check workflow runs
gh run list --limit 10

# View specific run
gh run view [run-id]

# Re-run failed workflow
gh run rerun [run-id]
```

---

## 🔧 **Troubleshooting**

### GitHub CLI Not Working
```bash
# Install
brew install gh

# Authenticate
gh auth login

# Check status
gh auth status
```

### Scripts Not Executable
```bash
# Make executable
chmod +x scripts/*.sh

# Or run with bash
bash scripts/setup-all.sh
```

### Diagrams Not Rendering
```bash
# Option 1: Push to GitHub (auto-renders)
git push

# Option 2: Use VS Code extension
# Install "Markdown Preview Mermaid Support"

# Option 3: Use online editor
# https://mermaid.live
```

---

## 📚 **Documentation Quick Links**

| Document | Purpose |
|----------|---------|
| [README.md](README.md) | Project overview |
| [SETUP.md](SETUP.md) | Quick setup guide |
| [PROJECT-SUMMARY.md](PROJECT-SUMMARY.md) | Complete summary |
| [MANUAL-SETUP.md](MANUAL-SETUP.md) | Alternative setup |
| [Product Vision](.agent/product-discovery/01-product-vision.md) | Vision & goals |
| [Sprint Planning](.agent/planning/01-sprint-planning-backlog.md) | Detailed sprints |
| [Architecture](.agent/architecture/architecture-diagrams.md) | System design |
| [Project Board](.agent/project-management/project-board-setup.md) | GitHub Projects |

---

## 🎓 **Key Concepts**

### Multi-Tenancy
- **Approach**: Database-per-tenant
- **Routing**: Subdomain-based (school1.platform.com)
- **Isolation**: Complete data separation

### Technology Stack
- **Backend**: Django 5.1 + PostgreSQL
- **Frontend**: Next.js 14 + TypeScript
- **AI**: OpenAI GPT-4 + Gemini fallback
- **Hosting**: Vercel (FE) + DigitalOcean (BE)

### Development Process
- **Sprints**: 2 weeks each
- **Velocity**: 40 story points/sprint
- **Timeline**: 24 weeks to MVP
- **Launch**: June 30, 2026

---

## ✅ **Checklist**

### Initial Setup
- [ ] GitHub CLI installed (`brew install gh`)
- [ ] Authenticated (`gh auth login`)
- [ ] Sprint 1 issues created
- [ ] Architecture diagrams viewed
- [ ] GitHub Project board set up

### Development Ready
- [ ] Backend running (localhost:8000)
- [ ] Frontend running (localhost:3000)
- [ ] Git configured
- [ ] Issue assigned to you
- [ ] Feature branch created

### Before Commit
- [ ] Code linted (no errors)
- [ ] Tests passing
- [ ] Commit message follows convention
- [ ] Issue referenced in commit

### Before Merge
- [ ] PR created and linked to issue
- [ ] CI/CD checks passing
- [ ] Code reviewed and approved
- [ ] No merge conflicts

---

## 🆘 **Need Help?**

1. **Check Documentation**: Start with README.md
2. **Search Issues**: `gh issue list --search "keyword"`
3. **Ask Team**: Slack #elearning-dev
4. **Create Discussion**: GitHub Discussions tab

---

## 🎉 **You're Ready!**

Everything is set up. Time to build! 🚀

**Next Action**: `./scripts/setup-all.sh` or `git push`

---

**Quick Tip**: Bookmark this file for daily reference!

**Last Updated**: January 19, 2026
