#!/bin/bash

# Complete Project Setup Script
# Sets up GitHub CLI, Mermaid CLI, and creates issues

set -e

echo "🚀 E-Learning Platform - Complete Setup"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    print_error "This script is designed for macOS. Please install tools manually."
    exit 1
fi

echo "Step 1: Checking Prerequisites"
echo "==============================="
echo ""

# Check Homebrew
if ! command -v brew &> /dev/null; then
    print_error "Homebrew not found. Please install from https://brew.sh/"
    exit 1
else
    print_success "Homebrew installed"
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js not found. Please install from https://nodejs.org/"
    exit 1
else
    NODE_VERSION=$(node --version)
    print_success "Node.js installed ($NODE_VERSION)"
fi

# Check npm
if ! command -v npm &> /dev/null; then
    print_error "npm not found. Please install Node.js"
    exit 1
else
    NPM_VERSION=$(npm --version)
    print_success "npm installed ($NPM_VERSION)"
fi

echo ""
echo "Step 2: Installing GitHub CLI"
echo "=============================="
echo ""

if command -v gh &> /dev/null; then
    GH_VERSION=$(gh --version | head -n 1)
    print_success "GitHub CLI already installed ($GH_VERSION)"
else
    print_info "Installing GitHub CLI..."
    brew install gh
    print_success "GitHub CLI installed"
fi

echo ""
echo "Step 3: Authenticating with GitHub"
echo "==================================="
echo ""

if gh auth status &> /dev/null; then
    print_success "Already authenticated with GitHub"
else
    print_warning "Not authenticated with GitHub"
    echo ""
    echo "Please authenticate now..."
    gh auth login
    
    if gh auth status &> /dev/null; then
        print_success "Successfully authenticated"
    else
        print_error "Authentication failed. Please try again."
        exit 1
    fi
fi

echo ""
echo "Step 4: Installing Mermaid CLI"
echo "==============================="
echo ""

if command -v mmdc &> /dev/null; then
    print_success "Mermaid CLI already installed"
else
    print_info "Installing Mermaid CLI (this may take a minute)..."
    npm install -g @mermaid-js/mermaid-cli
    print_success "Mermaid CLI installed"
fi

echo ""
echo "Step 5: Checking Repository"
echo "============================"
echo ""

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    print_error "Not in a git repository. Please run from project root."
    exit 1
else
    print_success "Git repository detected"
fi

# Check if remote exists
if ! git remote get-url origin &> /dev/null; then
    print_warning "No remote repository configured"
    echo ""
    echo "To create issues, you need to:"
    echo "1. Create a GitHub repository"
    echo "2. Add it as remote: git remote add origin <url>"
    echo "3. Push your code: git push -u origin main"
    echo ""
    read -p "Do you want to continue without creating issues? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
    SKIP_ISSUES=true
else
    REPO_URL=$(git remote get-url origin)
    print_success "Remote repository: $REPO_URL"
    SKIP_ISSUES=false
fi

echo ""
echo "Step 6: Creating Sprint 1 Milestone"
echo "===================================="
echo ""

if [ "$SKIP_ISSUES" = false ]; then
    # Check if milestone exists
    if gh api repos/:owner/:repo/milestones --jq '.[] | select(.title=="Sprint 1")' | grep -q "Sprint 1"; then
        print_success "Sprint 1 milestone already exists"
    else
        print_info "Creating Sprint 1 milestone..."
        gh api repos/:owner/:repo/milestones -f title="Sprint 1" -f description="Authentication & Core Setup (Week 3-4)" -f due_on="2026-02-14T00:00:00Z"
        print_success "Sprint 1 milestone created"
    fi
fi

echo ""
echo "Step 7: Creating Sprint 1 Issues"
echo "================================="
echo ""

if [ "$SKIP_ISSUES" = false ]; then
    print_info "Running create-sprint1-issues.sh..."
    ./scripts/create-sprint1-issues.sh
else
    print_warning "Skipping issue creation (no remote repository)"
fi

echo ""
echo "Step 8: Generating Architecture Diagrams"
echo "========================================="
echo ""

print_info "Running generate-diagrams.sh..."
./scripts/generate-diagrams.sh

echo ""
echo "========================================="
echo "🎉 Setup Complete!"
echo "========================================="
echo ""

print_success "All tools installed and configured!"
echo ""
echo "📊 What's been set up:"
echo "  ✅ GitHub CLI installed and authenticated"
echo "  ✅ Mermaid CLI installed"
if [ "$SKIP_ISSUES" = false ]; then
    echo "  ✅ Sprint 1 milestone created"
    echo "  ✅ Sprint 1 issues created (8 issues, 40 points)"
fi
echo "  ✅ Architecture diagrams generated"
echo ""
echo "🚀 Next Steps:"
echo ""
echo "1. View your issues:"
echo "   gh issue list --milestone \"Sprint 1\""
echo ""
echo "2. View architecture diagrams:"
echo "   open .agent/architecture/diagrams/"
echo ""
echo "3. Set up GitHub Project board:"
echo "   - Go to your repository on GitHub"
echo "   - Click 'Projects' → 'New Project'"
echo "   - Follow: .agent/project-management/project-board-setup.md"
echo ""
echo "4. Configure CI/CD secrets:"
echo "   - Go to Settings → Secrets → Actions"
echo "   - See: SETUP.md for required secrets"
echo ""
echo "5. Start development:"
echo "   gh issue list --assignee @me"
echo "   git checkout -b feature/1-user-registration-api"
echo ""
echo "📚 Documentation:"
echo "  - Quick Start: SETUP.md"
echo "  - Full Summary: PROJECT-SUMMARY.md"
echo "  - Architecture: .agent/architecture/architecture-diagrams.md"
echo ""
echo "Happy coding! 🎉"
