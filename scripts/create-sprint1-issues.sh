#!/bin/bash

# Sprint 1 GitHub Issues Creation Script
# Creates all issues for Sprint 1: Authentication

set -e

echo "📝 Creating Sprint 1 Issues"
echo "============================"
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) not found."
    echo "📦 Install it: brew install gh (Mac) or see https://cli.github.com/"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated with GitHub CLI"
    echo "🔐 Run: gh auth login"
    exit 1
fi

echo "✅ GitHub CLI ready"
echo ""

# Issue 1: User Registration API
echo "[1/8] Creating: User Registration API"
gh issue create \
  --title "User Registration API" \
  --body "## User Story
**As a** new user  
**I want** to register with email and password  
**So that** I can access the platform

## Acceptance Criteria
- [ ] POST /api/auth/register endpoint created
- [ ] Email validation implemented
- [ ] Password hashing with bcrypt
- [ ] Returns JWT token on success
- [ ] Error handling for duplicate emails
- [ ] Unit tests written (>80% coverage)

## Technical Notes
- Use djangorestframework-simplejwt
- Validate email format (regex)
- Password minimum 8 characters
- Hash password with bcrypt

## Story Points
5

## Sprint
Sprint 1

## Dependencies
None" \
  --label "backend,P0,sprint-1,epic-auth" \
  --milestone "Sprint 1"

echo "  ✅ Created"
echo ""

# Issue 2: JWT Authentication
echo "[2/8] Creating: JWT Authentication"
gh issue create \
  --title "JWT Authentication Implementation" \
  --body "## User Story
**As a** registered user  
**I want** to login with my credentials  
**So that** I can access protected resources

## Acceptance Criteria
- [ ] POST /api/auth/login endpoint created
- [ ] JWT token generation on successful login
- [ ] Refresh token mechanism implemented
- [ ] Token expiration (15 min access, 7 day refresh)
- [ ] Middleware to validate tokens on protected routes
- [ ] Unit tests written (>80% coverage)

## Technical Notes
- Use djangorestframework-simplejwt
- Access token: 15 minutes
- Refresh token: 7 days
- Blacklist tokens on logout

## Story Points
5

## Sprint
Sprint 1

## Dependencies
- Depends on: User Registration API" \
  --label "backend,P0,sprint-1,epic-auth" \
  --milestone "Sprint 1"

echo "  ✅ Created"
echo ""

# Issue 3: RBAC Implementation
echo "[3/8] Creating: RBAC Implementation"
gh issue create \
  --title "Role-Based Access Control (RBAC)" \
  --body "## User Story
**As a** system administrator  
**I want** users to have specific roles  
**So that** access to features is properly controlled

## Acceptance Criteria
- [ ] User model has role field (Admin, Teacher, Student, Parent)
- [ ] Permission decorators created (@require_role)
- [ ] API endpoints enforce role checks
- [ ] Admin can assign/change roles
- [ ] Unit tests for all role scenarios

## Technical Notes
- Roles: Admin, Teacher, Student, Parent
- Use Django permissions framework
- Create custom permission classes
- Middleware to check roles

## Story Points
8

## Sprint
Sprint 1

## Dependencies
- Depends on: JWT Authentication" \
  --label "backend,P0,sprint-1,epic-auth" \
  --milestone "Sprint 1"

echo "  ✅ Created"
echo ""

# Issue 4: Password Reset
echo "[4/8] Creating: Password Reset Functionality"
gh issue create \
  --title "Password Reset Functionality" \
  --body "## User Story
**As a** user who forgot my password  
**I want** to reset it via email  
**So that** I can regain access to my account

## Acceptance Criteria
- [ ] POST /api/auth/password-reset/ endpoint
- [ ] Email sent with reset token
- [ ] Token expires after 1 hour
- [ ] POST /api/auth/password-reset-confirm/ endpoint
- [ ] Password successfully updated
- [ ] Unit tests written

## Technical Notes
- Generate secure random token
- Store token with expiration
- Send email via SendGrid/SES
- Validate token before reset

## Story Points
3

## Sprint
Sprint 1

## Dependencies
- Depends on: User Registration API" \
  --label "backend,P1,sprint-1,epic-auth" \
  --milestone "Sprint 1"

echo "  ✅ Created"
echo ""

# Issue 5: Login/Register UI
echo "[5/8] Creating: Login/Register UI Components"
gh issue create \
  --title "Login and Registration UI Components" \
  --body "## User Story
**As a** user  
**I want** an intuitive login and registration interface  
**So that** I can easily access the platform

## Acceptance Criteria
- [ ] Login page created (/login)
- [ ] Registration page created (/register)
- [ ] Form validation (client-side)
- [ ] Error messages displayed
- [ ] Success redirect to dashboard
- [ ] Responsive design (mobile-friendly)
- [ ] Loading states implemented

## Technical Notes
- Use shadcn/ui form components
- React Hook Form for validation
- Zod for schema validation
- Store JWT in localStorage
- Redirect based on user role

## Story Points
5

## Sprint
Sprint 1

## Dependencies
- Depends on: JWT Authentication" \
  --label "frontend,P0,sprint-1,epic-auth" \
  --milestone "Sprint 1"

echo "  ✅ Created"
echo ""

# Issue 6: Protected Route Middleware
echo "[6/8] Creating: Protected Route Middleware"
gh issue create \
  --title "Frontend Protected Route Middleware" \
  --body "## User Story
**As a** developer  
**I want** to protect routes that require authentication  
**So that** unauthorized users cannot access them

## Acceptance Criteria
- [ ] Middleware checks for valid JWT token
- [ ] Redirects to login if not authenticated
- [ ] Validates token expiration
- [ ] Refreshes token if needed
- [ ] Role-based route protection
- [ ] Works with Next.js App Router

## Technical Notes
- Use Next.js middleware
- Check localStorage for token
- Validate token with backend
- Auto-refresh expired tokens
- Redirect to login on failure

## Story Points
3

## Sprint
Sprint 1

## Dependencies
- Depends on: Login/Register UI" \
  --label "frontend,P0,sprint-1,epic-auth" \
  --milestone "Sprint 1"

echo "  ✅ Created"
echo ""

# Issue 7: Tenant Creation Workflow
echo "[7/8] Creating: Tenant Creation Workflow"
gh issue create \
  --title "SaaS Admin Tenant Creation Workflow" \
  --body "## User Story
**As a** SaaS administrator  
**I want** to create new school tenants  
**So that** schools can start using the platform

## Acceptance Criteria
- [ ] POST /api/core/tenants/ endpoint
- [ ] Subdomain validation (unique, valid format)
- [ ] Automatic database creation for tenant
- [ ] Admin user created for school
- [ ] Email sent with login credentials
- [ ] Tenant activation/deactivation
- [ ] Unit tests written

## Technical Notes
- Validate subdomain format (alphanumeric, hyphens)
- Create isolated database
- Run migrations on new database
- Generate random password for admin
- Send welcome email

## Story Points
8

## Sprint
Sprint 1

## Dependencies
- Depends on: RBAC Implementation" \
  --label "backend,P0,sprint-1,epic-auth" \
  --milestone "Sprint 1"

echo "  ✅ Created"
echo ""

# Issue 8: User Profile Page
echo "[8/8] Creating: User Profile Page"
gh issue create \
  --title "User Profile Page" \
  --body "## User Story
**As a** logged-in user  
**I want** to view and edit my profile  
**So that** I can keep my information up to date

## Acceptance Criteria
- [ ] Profile page created (/profile)
- [ ] Display user information
- [ ] Edit profile form
- [ ] Change password functionality
- [ ] Upload profile picture
- [ ] Save changes to backend
- [ ] Success/error notifications

## Technical Notes
- Use shadcn/ui components
- Form validation with Zod
- Image upload to S3
- Update user API endpoint
- Optimistic UI updates

## Story Points
3

## Sprint
Sprint 1

## Dependencies
- Depends on: JWT Authentication" \
  --label "frontend,P1,sprint-1,epic-auth" \
  --milestone "Sprint 1"

echo "  ✅ Created"
echo ""

echo "=============================="
echo "✅ All Sprint 1 issues created!"
echo ""
echo "📊 Summary:"
echo "  - Total issues: 8"
echo "  - Story points: 40"
echo "  - Backend: 5 issues (29 points)"
echo "  - Frontend: 3 issues (11 points)"
echo ""
echo "🔗 View issues:"
echo "  gh issue list --milestone \"Sprint 1\""
echo ""
echo "📋 View on GitHub:"
echo "  Open your repository → Issues tab"
