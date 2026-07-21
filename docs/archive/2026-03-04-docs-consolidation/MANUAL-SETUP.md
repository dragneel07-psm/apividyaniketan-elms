# Manual Setup Guide (Alternative)
## If Automated Script Doesn't Work

**Estimated Time**: 15 minutes

---

## Option 1: View Diagrams on GitHub (Easiest - No Installation!)

### Step 1: Push to GitHub
```bash
git add .
git commit -m "docs: Add complete project documentation and setup"
git push origin main
```

### Step 2: View on GitHub
1. Go to your repository on GitHub
2. Navigate to `.agent/architecture/architecture-diagrams.md`
3. **All 12 diagrams will render automatically!** ✨

**That's it!** No need to install anything.

---

## Option 2: Manual Installation

### Install GitHub CLI

**macOS**:
```bash
brew install gh
gh auth login
```

**Windows**:
```bash
winget install --id GitHub.cli
gh auth login
```

**Linux**:
```bash
# Debian/Ubuntu
sudo apt install gh

# Fedora/RHEL
sudo dnf install gh

gh auth login
```

### Install Mermaid CLI (Optional - for PNG exports)

```bash
npm install -g @mermaid-js/mermaid-cli
```

---

## Option 3: Create Issues Manually

If you prefer not to use scripts, create issues manually on GitHub:

### Go to Your Repository
1. Click **Issues** tab
2. Click **New Issue**
3. Choose **User Story** template

### Sprint 1 Issues to Create

**Issue 1: User Registration API**
- Title: `User Registration API`
- Labels: `backend`, `P0`, `sprint-1`, `epic-auth`
- Milestone: `Sprint 1`
- Story Points: 5
- Copy content from `.agent/planning/01-sprint-planning-backlog.md`

**Issue 2: JWT Authentication**
- Title: `JWT Authentication Implementation`
- Labels: `backend`, `P0`, `sprint-1`, `epic-auth`
- Milestone: `Sprint 1`
- Story Points: 5

**Issue 3: RBAC Implementation**
- Title: `Role-Based Access Control (RBAC)`
- Labels: `backend`, `P0`, `sprint-1`, `epic-auth`
- Milestone: `Sprint 1`
- Story Points: 8

**Issue 4: Password Reset**
- Title: `Password Reset Functionality`
- Labels: `backend`, `P1`, `sprint-1`, `epic-auth`
- Milestone: `Sprint 1`
- Story Points: 3

**Issue 5: Login/Register UI**
- Title: `Login and Registration UI Components`
- Labels: `frontend`, `P0`, `sprint-1`, `epic-auth`
- Milestone: `Sprint 1`
- Story Points: 5

**Issue 6: Protected Route Middleware**
- Title: `Frontend Protected Route Middleware`
- Labels: `frontend`, `P0`, `sprint-1`, `epic-auth`
- Milestone: `Sprint 1`
- Story Points: 3

**Issue 7: Tenant Creation**
- Title: `SaaS Admin Tenant Creation Workflow`
- Labels: `backend`, `P0`, `sprint-1`, `epic-auth`
- Milestone: `Sprint 1`
- Story Points: 8

**Issue 8: User Profile Page**
- Title: `User Profile Page`
- Labels: `frontend`, `P1`, `sprint-1`, `epic-auth`
- Milestone: `Sprint 1`
- Story Points: 3

---

## Option 4: Use VS Code for Diagrams

### Install Extension
1. Open VS Code
2. Go to Extensions (Cmd+Shift+X)
3. Search for "Markdown Preview Mermaid Support"
4. Install it

### View Diagrams
1. Open `.agent/architecture/architecture-diagrams.md`
2. Press `Cmd+Shift+V` (Mac) or `Ctrl+Shift+V` (Windows)
3. All diagrams will render in preview!

---

## Option 5: Use Mermaid Live Editor

### For Each Diagram
1. Go to https://mermaid.live
2. Open `.agent/architecture/architecture-diagrams.md`
3. Copy a diagram's code (between \`\`\`mermaid and \`\`\`)
4. Paste into Mermaid Live Editor
5. View, edit, or export as PNG/SVG

---

## What If Scripts Fail?

### GitHub CLI Issues
```bash
# Check if installed
which gh

# If not found, install manually
brew install gh  # macOS
# Or download from: https://cli.github.com/

# Authenticate
gh auth login
```

### Mermaid CLI Issues
```bash
# Check if installed
which mmdc

# If not found, install manually
npm install -g @mermaid-js/mermaid-cli

# If permission error
sudo npm install -g @mermaid-js/mermaid-cli
```

### Permission Errors
```bash
# Make scripts executable
chmod +x scripts/*.sh

# If still failing, run with bash
bash scripts/create-sprint1-issues.sh
bash scripts/generate-diagrams.sh
```

---

## Recommended Approach

**For Viewing Diagrams**: Just push to GitHub (easiest!)

**For Creating Issues**: Use the automated script or create manually

**For Local Diagram Viewing**: Use VS Code extension (no CLI needed)

---

## Next Steps After Setup

### 1. Review Documentation
```bash
# Read these in order
cat README.md
cat SETUP.md
cat PROJECT-SUMMARY.md
```

### 2. Set Up GitHub Project Board
- Go to your repository
- Click Projects → New Project
- Follow `.agent/project-management/project-board-setup.md`

### 3. Configure CI/CD
- Add secrets to GitHub repository
- See `SETUP.md` for required secrets

### 4. Start Development
```bash
# View your issues
gh issue list --milestone "Sprint 1"

# Pick an issue and start
git checkout -b feature/1-user-registration-api
```

---

## Still Having Issues?

### Check Prerequisites
```bash
# Check versions
node --version  # Should be 20+
npm --version   # Should be 10+
python --version  # Should be 3.11+
git --version   # Any recent version
```

### Get Help
- Check documentation in `.agent/` folders
- Create a GitHub discussion
- Review error messages carefully

---

**Remember**: The automated script is just a convenience. Everything can be done manually if needed!

---

**Last Updated**: January 19, 2026
