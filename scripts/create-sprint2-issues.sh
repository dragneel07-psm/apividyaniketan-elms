#!/bin/bash

# Ensure we are authenticated
gh auth status || exit 1

# Milestone Title
MILESTONE="Sprint 2"

# Ensure Milestone Exists (Try to create, ignore error if exists)
# Note: Using 'gh api' might error if duplicate title, so we suppress error slightly or just proceed.
# A cleaner check would be to list milestones first, but 'gh api -f' usually handles or errors idempotently depending on API.
# We'll assume if it fails, it's likely because it exists.
gh api repos/:owner/:repo/milestones -f title="$MILESTONE" -f state="open" -f description="School Administration (Weeks 5-6)" > /dev/null 2>&1 || true

# Function to create issue
create_issue() {
    local title="$1"
    local body="$2"
    local labels="$3"
    local points="$4"
    
    echo "Creating issue: $title"
    gh issue create --title "$title" --body "$body" --label "$labels" --label "sprint-2" --milestone "$MILESTONE"
}

# S2-1: School Profile Setup
create_issue "School Profile Setup & Configuration" \
"## User Story
As a School Admin
I want to configure my school's profile (name, address, logo, academic settings)
So that the platform reflects my school's identity and rules

## Acceptance Criteria
- [ ] Backend: Model updates for Tenant/School profile (logo, address, established_year).
- [ ] API: GET/PATCH endpoints for school settings.
- [ ] Frontend: School Settings page in Admin Dashboard.
- [ ] File Upload: Logo upload functionality.

## Technical Notes
- Extend 'Tenant' model or create 'SchoolProfile' related model.
- Use FileSystemStorage or S3 for logo.

## Story Points
5" \
"backend,frontend,P0" 5

# S2-2: Academic Year Configuration
create_issue "Academic Year Management" \
"## User Story
As a School Admin
I want to define academic years (e.g., 2025-2026) and set the current active year
So that all classes and records are organized by year

## Acceptance Criteria
- [ ] Backend: 'AcademicYear' model (name, start_date, end_date, is_current).
- [ ] API: CRUD endpoints for Academic Years.
- [ ] Logic: Only one year can be 'is_current=True'.

## Story Points
2" \
"backend,P0" 2

# S2-3: Class and Section Management API
create_issue "Class and Section Management API" \
"## User Story
As a School Admin
I want to create Classes (Grade 1, Grade 2) and Sections (A, B)
So that I can enroll students into them

## Acceptance Criteria
- [ ] Backend: 'AcademicClass' and 'Section' models.
- [ ] API: CRUD for Classes.
- [ ] API: CRUD for Sections (nested under Class).
- [ ] Validation: Section names unique per class.

## Story Points
5" \
"backend,P0" 5

# S2-4: Class Management UI
create_issue "Class Management UI" \
"## User Story
As a School Admin
I want a web interface to manage classes and sections
So that I can easily set up the school structure

## Acceptance Criteria
- [ ] Frontend: Page to list all Classes.
- [ ] Frontend: Modal/Page to add/edit Class.
- [ ] Frontend: UI to manage Sections for a Class.

## Story Points
5" \
"frontend,P0" 5

# S2-5: Subject Management API
create_issue "Subject Management API" \
"## User Story
As a School Admin
I want to define Subjects (Math, Science) and assign them to Classes
So that I can assign teachers and schedule lessons

## Acceptance Criteria
- [ ] Backend: 'Subject' model.
- [ ] Relation: Subject linked to Class (Grade 10 Math vs Grade 9 Math).
- [ ] API: CRUD for Subjects.

## Story Points
3" \
"backend,P0" 3

# S2-6: Subject Management UI
create_issue "Subject Management UI" \
"## User Story
As a School Admin
I want to a web interface to manage subjects
So that I can configure the curriculum

## Acceptance Criteria
- [ ] Frontend: List subjects by Class.
- [ ] Frontend: Add/Edit Subject form.

## Story Points
3" \
"frontend,P0" 3

# S2-7: Teacher Account Creation
create_issue "Teacher Account Creation & Management" \
"## User Story
As a School Admin
I want to create user accounts for Teachers
So that they can access the platform

## Acceptance Criteria
- [ ] Backend: API to create User with 'Teacher' role (in Tenant DB).
- [ ] Frontend: Teacher List View.
- [ ] Frontend: Add Teacher Form (Email, Name, Password).
- [ ] Email: Send credentials (Mock/Real).
- [ ] RBAC: Ensure 'Teacher' role has correct permissions.

## Story Points
5" \
"fullstack,P0" 5

# S2-8: Teacher Assignment API
create_issue "Teacher Subject Assignment API" \
"## User Story
As a School Admin
I want to assign a Teacher to a Subject in a specific Section
So that they have access to managing that class

## Acceptance Criteria
- [ ] Backend: 'TeacherAllocation' or 'SubjectTeacher' model.
- [ ] API: Assign Teacher to (Class, Section, Subject).
- [ ] Validation: Avoid conflicts (Same teacher, same time? - Scheduling later).

## Story Points
3" \
"backend,P0" 3

# S2-9: Admin Dashboard Metrics
create_issue "School Admin Dashboard Metrics" \
"## User Story
As a School Admin
I want to see key metrics on my dashboard (Total Students, Teachers, Classes)
So that I have an overview of the school

## Acceptance Criteria
- [ ] API: Aggregate stats (Counts of users, classes).
- [ ] Frontend: Display stats cards on Dashboard Home.
- [ ] Charts: Basic distribution charts (if time permits).

## Story Points
8" \
"fullstack,frontend,P0" 8

# S2-10: File Upload (School Logo)
create_issue "File Upload Service (School Logo)" \
"## User Story
As a School Admin
I want to upload a school logo
So that the portal is branded

## Acceptance Criteria
- [ ] Backend: File Upload API (or presigned URLs).
- [ ] Frontend: File Input Component.
- [ ] Storage: Local (Dev) or S3 (Prod).

## Story Points
2" \
"backend,P0" 2

echo "Sprint 2 Issues Created!"
