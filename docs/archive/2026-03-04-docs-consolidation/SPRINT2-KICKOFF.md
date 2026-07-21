# Sprint 2 Kickoff: School Administration

**Status**: 🚀 In Progress
**Focus**: Setting up the "School" structure (Profiles, Classes, Subjects, Teachers).
**Goal**: By the end of this sprint, a School Admin should be able to log in and configure their entire academic structure.

## 📋 Sprint Backlog

All issues have been created in GitHub Project Board.

| Issue ID | Feature | Points | Priority |
|---|---|---|---|
| **S2-1** | School Profile Setup & Configuration | 5 | P0 |
| **S2-2** | Academic Year Management | 2 | P0 |
| **S2-3** | Class and Section Management API | 5 | P0 |
| **S2-4** | Class Management UI | 5 | P0 |
| **S2-5** | Subject Management API | 3 | P0 |
| **S2-6** | Subject Management UI | 3 | P0 |
| **S2-7** | Teacher Account Creation | 5 | P0 |
| **S2-8** | Teacher Assignment API | 3 | P0 |
| **S2-9** | Admin Dashboard Metrics | 8 | P0 |
| **S2-10** | File Upload Service (Logo) | 2 | P0 |

**Total Points**: 41

## 🛠️ Key Technical Considerations

1.  **Tenant Models**:
    - `AcademicClass`, `Section`, `Subject` belong in the `academic` app.
    - Ensure these models are listed in `TENANT_APPS` in `settings/base.py`.
    - Migrations for these must interact with the **Tenant DB**, not Default DB.

2.  **Teacher Management**:
    - Creating a Teacher involves creating a `UserAccount` with role='teacher' in the **Tenant DB**.
    - Ensure `Teacher` users can only log in to their specific Tenant.

3.  **Frontend**:
    - Create a dedicated section in the Dashboard for `Administration` and `Academics`.

## 🚀 Getting Started
Recommended Phase 1:
1.  **S2-2**: Setup `AcademicYear` model (simplest).
2.  **S2-3**: Setup `AcademicClass` & `Section` models/API.
3.  **S2-4**: Build the UI for Classes.
