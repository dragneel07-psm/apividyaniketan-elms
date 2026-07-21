# Sprint 3 Kickoff: Student Portal & Learning

**Status**: 🚀 Ready to Start
**Focus**: Onboarding Students and delivering Content (Lessons).
**Goal**: By the end of this sprint, Admins can enroll Students, Teachers can post Lessons, and Students can log in to view them.

## 📋 Sprint Backlog

| Issue ID | Feature | Points | Priority | Description |
|---|---|---|---|---|
| **S3-1** | Student Management API | 3 | P0 | CRUD endpoints for Student profiles linked to UserAccounts. |
| **S3-2** | Student Management UI | 5 | P0 | Admin page to add/edit students and assign them to Classes/Sections. |
| **S3-3** | Bulk Import Service | 5 | P1 | Utility to import Students via CSV/Excel (Critical for initial setup). |
| **S3-4** | Teacher Dashboard | 3 | P1 | A specific dashboard view for Teachers to see their assigned Subjects. |
| **S3-5** | Lesson Planning API | 5 | P0 | Models for `Lesson`, `Topic`, `Material` (Files/Links). |
| **S3-6** | Lesson Management UI | 8 | P0 | Interface for Teachers to create course content and upload materials. |
| **S3-7** | Student Dashboard | 3 | P0 | The initial landing page for Students (My Subjects). |
| **S3-8** | Classroom View | 5 | P0 | The student view of a Subject, listing all lessons and materials. |
| **S3-9** | File Storage Integration | 3 | P1 | Ensure uploaded lesson materials are securely stored and served. |

**Total Points**: 40

## 🛠️ Key Technical Considerations

1.  **Student Enrollment**:
    *   Students are assigned to a `Section` (which belongs to a `Class`).
    *   They inherit access to all `Subjects` assigned to that `Class`.

2.  **Role-Based Access**:
    *   **Admins**: Can manage everything.
    *   **Teachers**: Can only edit content for *their* assigned Subjects.
    *   **Students**: Read-only access to *their* enrolled Subjects.

3.  **Content Polyerarchy**:
    *   `Subject` -> `Chapter/Unit` (Optional) -> `Lesson` -> `Material`
    *   Start simple: `Subject` -> `Lesson` (Rich Text + Attachments).

## 🚀 Getting Started
Recommended Phase 1:
1.  **S3-1 & S3-2**: Build the Student Management foundation so we have users to test with.
