#!/bin/bash

# Ensure we are authenticated
gh auth status || exit 1

# Milestone Title
MILESTONE="Sprint 3"

# Ensure Milestone Exists 
gh api repos/:owner/:repo/milestones -f title="$MILESTONE" -f state="open" -f description="Student Portal & Learning Management (Weeks 7-8)" > /dev/null 2>&1 || true

# Function to create issue
create_issue() {
    local title="$1"
    local body="$2"
    local labels="$3"
    
    echo "Creating issue: $title"
    gh issue create --title "$title" --body "$body" --label "$labels" --label "sprint-3" --milestone "$MILESTONE"
}

# S3-1: Student Management API
create_issue "Student Management API" \
"## User Story
As a School Admin
I want to create Student profiles and user accounts
So that students can access the platform

## Acceptance Criteria
- [ ] Backend: 'Student' model linked to 'UserAccount'.
- [ ] API: CRUD endpoints for Students.
- [ ] Logic: Create UserAccount (role='student') + Student Profile atomically.
- [ ] Linkage: Assign Student to a 'Section'.

## Story Points
3" \
"backend,P0"

# S3-2: Student Management UI
create_issue "Student Management UI" \
"## User Story
As a School Admin
I want a web interface to manage students
So that I can enroll them into classes

## Acceptance Criteria
- [ ] Frontend: Student List View (filterable by Class/Section).
- [ ] Frontend: Add/Edit Student Form.
- [ ] Frontend: View Student Profile.

## Story Points
5" \
"frontend,P0"

# S3-3: Bulk Import Service
create_issue "Bulk Import Service (Students)" \
"## User Story
As a School Admin
I want to upload a CSV of students
So that I can enroll hundreds of students quickly

## Acceptance Criteria
- [ ] Backend: CSV Parsing utility.
- [ ] API: Upload Endpoint for CSV.
- [ ] Logic: Validate rows, create Users/Profiles in bulk.
- [ ] Error Handling: Report which rows failed.

## Story Points
5" \
"backend,P1"

# S3-4: Teacher Dashboard
create_issue "Teacher Dashboard" \
"## User Story
As a Teacher
I want to see the list of Subjects I am assigned to
So that I can start managing my classes

## Acceptance Criteria
- [ ] API: 'My Subjects' endpoint (filtering Subjects by logged-in Teacher).
- [ ] Frontend: Dashboard view showing subject cards.

## Story Points
3" \
"frontend,P1"

# S3-5: Lesson Planning API
create_issue "Lesson Planning API" \
"## User Story
As a Teacher
I want to create Lessons for a Subject
So that I can share content with students

## Acceptance Criteria
- [ ] Backend: 'Lesson' model (title, content, subject, order).
- [ ] Backend: 'Material' model (file, link) linked to Lesson.
- [ ] API: CRUD for Lessons and Materials.

## Story Points
5" \
"backend,P0"

# S3-6: Lesson Management UI
create_issue "Lesson Management UI" \
"## User Story
As a Teacher
I want a rich-text editor to create lesson content
So that I can prepare my class materials

## Acceptance Criteria
- [ ] Frontend: Lesson List (by Subject).
- [ ] Frontend: Lesson Editor (Rich Text + Title).
- [ ] Frontend: File Upload for materials.

## Story Points
8" \
"frontend,P0"

# S3-7: Student Dashboard
create_issue "Student Dashboard" \
"## User Story
As a Student
I want to see my enrolled subjects upon login
So that I can see what I need to study

## Acceptance Criteria
- [ ] API: 'My Enrolled Subjects' endpoint.
- [ ] Frontend: Student Dashboard Home.

## Story Points
3" \
"frontend,P0"

# S3-8: Classroom View
create_issue "Classroom View (Student)" \
"## User Story
As a Student
I want to view the lessons for a specific subject
So that I can read the material

## Acceptance Criteria
- [ ] Frontend: Read-only view of Lessons for a Subject.
- [ ] Frontend: File download links.

## Story Points
5" \
"frontend,P0"

# S3-9: File Storage Integration
create_issue "File Storage Integration" \
"## User Story
As a User
I want my uploaded files (Lessons, Logos) to be safe
So that data isn't lost

## Acceptance Criteria
- [ ] Backend: Verified FileSystemStorage for Dev.
- [ ] Backend: Prepared interface for S3 (Production).
- [ ] Testing: Verify large file uploads work.

## Story Points
3" \
"backend,P1"

echo "Sprint 3 Issues Created!"
