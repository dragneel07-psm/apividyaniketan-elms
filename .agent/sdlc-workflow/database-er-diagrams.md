# Database ER Diagrams (Used in This Project)
## E-LearningWebApp - Model Relationships from Current Codebase

**Last verified:** March 4, 2026  
**Source:** `backend/*/models.py`

This document provides readable ER diagrams of the database design currently used by this project.

## 1) Core Identity + Tenancy + SaaS Billing
```mermaid
erDiagram
    TENANT {
        string schema_name
        string name
        string subdomain
        string type
        string status
        json features
    }

    DOMAIN {
        string domain
        bool is_primary
    }

    USER_ACCOUNT {
        uuid user_id PK
        string email
        string username
        string role
        uuid tenant_id FK
    }

    SUBSCRIPTION_PLAN {
        uuid plan_id PK
        string name
        decimal price_monthly
        decimal price_yearly
        int student_limit
        int teacher_limit
    }

    SUBSCRIPTION {
        uuid subscription_id PK
        uuid tenant_id FK
        uuid plan_id FK
        string status
        string billing_cycle
    }

    SUBSCRIPTION_PLAN_HISTORY {
        uuid history_id PK
        uuid tenant_id FK
        uuid subscription_id FK
        uuid previous_plan_id FK
        uuid new_plan_id FK
        uuid changed_by_id FK
    }

    INVOICE {
        uuid invoice_id PK
        uuid tenant_id FK
        uuid subscription_id FK
        decimal amount
        string status
    }

    AUDIT_LOG {
        uuid id PK
        uuid user_id FK
        string action
        datetime timestamp
    }

    GLOBAL_SETTINGS {
        int id PK
        string site_name
        bool maintenance_mode
        bool ai_enabled
    }

    TENANT ||--o{ DOMAIN : has
    TENANT ||--o{ USER_ACCOUNT : owns_users

    TENANT ||--|| SUBSCRIPTION : has_active_subscription
    SUBSCRIPTION_PLAN ||--o{ SUBSCRIPTION : selected_by

    TENANT ||--o{ SUBSCRIPTION_PLAN_HISTORY : plan_changes
    SUBSCRIPTION ||--o{ SUBSCRIPTION_PLAN_HISTORY : change_events
    USER_ACCOUNT ||--o{ SUBSCRIPTION_PLAN_HISTORY : changed_by

    TENANT ||--o{ INVOICE : billed
    SUBSCRIPTION ||--o{ INVOICE : generates

    USER_ACCOUNT ||--o{ AUDIT_LOG : actor
```

## 2) Academic Domain (LMS Core)
```mermaid
erDiagram
    ACADEMIC_YEAR {
        int id PK
        string name
        date start_date
        date end_date
        bool is_current
    }

    ACADEMIC_CLASS {
        int id PK
        string name
        int order
    }

    SECTION {
        int id PK
        string name
        int academic_class_id FK
        int capacity
    }

    TEACHER {
        uuid teacher_id PK
        uuid user_id FK
        string designation
    }

    STUDENT {
        uuid student_id PK
        uuid user_id FK
        int academic_class_id FK
        int section_id FK
    }

    PARENT {
        uuid parent_id PK
        uuid user_id FK
    }

    SUBJECT {
        int id PK
        string name
        int academic_class_id FK
        uuid teacher_id FK
    }

    CHAPTER {
        int id PK
        int subject_id FK
        string title
        int order
    }

    LESSON {
        int id PK
        int chapter_id FK
        uuid assessment_id FK
        string title
        string content_type
    }

    LESSON_MATERIAL {
        int id PK
        int lesson_id FK
        string title
        string material_type
    }

    LESSON_PROGRESS {
        int id PK
        uuid student_id FK
        int lesson_id FK
        bool completed
    }

    ASSESSMENT {
        uuid assessment_id PK
        int subject_id FK
        int section_id FK
        string type
        int total_marks
    }

    QUESTION {
        uuid question_id PK
        uuid assessment_id FK
        string type
        int points
    }

    SUBMISSION {
        uuid submission_id PK
        uuid assessment_id FK
        uuid student_id FK
        string status
    }

    RESULT {
        uuid result_id PK
        uuid assessment_id FK
        uuid student_id FK
        uuid graded_by_id FK
        int score
    }

    EXAM {
        uuid exam_id PK
        uuid assessment_id FK
        bool is_published
    }

    EXAM_SEATING {
        uuid seating_id PK
        uuid exam_id FK
        uuid student_id FK
        string hall_ticket_number
    }

    ATTENDANCE {
        int attendance_id PK
        uuid student_id FK
        int subject_id FK
        date date
        string status
    }

    TIMETABLE {
        int timetable_id PK
        int academic_class_id FK
        uuid teacher_id FK
        uuid created_by_id FK
        uuid approved_by_id FK
        string entry_type
        string status
    }

    NOTICE {
        int id PK
        uuid tenant_id FK
        int target_class_id FK
        uuid target_student_id FK
        string target_audience
    }

    USER_ACCOUNT ||--|| TEACHER : teacher_profile
    USER_ACCOUNT ||--|| STUDENT : student_profile
    USER_ACCOUNT ||--|| PARENT : parent_profile

    ACADEMIC_CLASS ||--o{ SECTION : has
    ACADEMIC_CLASS ||--o{ STUDENT : enrolls
    SECTION ||--o{ STUDENT : groups

    ACADEMIC_CLASS ||--o{ SUBJECT : offers
    TEACHER ||--o{ SUBJECT : lead_teacher

    SUBJECT ||--o{ CHAPTER : contains
    CHAPTER ||--o{ LESSON : contains
    LESSON ||--o{ LESSON_MATERIAL : has

    STUDENT ||--o{ LESSON_PROGRESS : tracks
    LESSON ||--o{ LESSON_PROGRESS : progress

    SUBJECT ||--o{ ASSESSMENT : has
    SECTION ||--o{ ASSESSMENT : targets

    ASSESSMENT ||--o{ QUESTION : defines
    ASSESSMENT ||--o{ SUBMISSION : receives
    STUDENT ||--o{ SUBMISSION : submits

    ASSESSMENT ||--o{ RESULT : produces
    STUDENT ||--o{ RESULT : receives
    USER_ACCOUNT ||--o{ RESULT : graded_by

    ASSESSMENT ||--|| EXAM : exam_details
    EXAM ||--o{ EXAM_SEATING : seating
    STUDENT ||--o{ EXAM_SEATING : assigned

    STUDENT ||--o{ ATTENDANCE : records
    SUBJECT ||--o{ ATTENDANCE : sessions

    ACADEMIC_CLASS ||--o{ TIMETABLE : schedule
    TEACHER ||--o{ TIMETABLE : assigned
    USER_ACCOUNT ||--o{ TIMETABLE : created_by
    USER_ACCOUNT ||--o{ TIMETABLE : approved_by

    ACADEMIC_CLASS ||--o{ NOTICE : class_notices
    STUDENT ||--o{ NOTICE : student_notices
```

## 3) School Finance (Tenant-Level)
```mermaid
erDiagram
    FEE_STRUCTURE {
        uuid fee_id PK
        uuid tenant_id FK
        int academic_class_id FK
        string name
        decimal amount
        string frequency
    }

    STUDENT_FEE {
        uuid student_fee_id PK
        uuid tenant_id FK
        uuid student_id FK
        uuid fee_id FK
        decimal amount_due
        decimal amount_paid
        string status
    }

    PAYMENT {
        uuid payment_id PK
        uuid tenant_id FK
        uuid student_id FK
        uuid student_fee_id FK
        uuid recorded_by_id FK
        decimal amount
        string method
    }

    EXPENSE {
        uuid expense_id PK
        uuid tenant_id FK
        uuid recorded_by_id FK
        string title
        decimal amount
        string category
    }

    TENANT ||--o{ FEE_STRUCTURE : defines
    ACADEMIC_CLASS ||--o{ FEE_STRUCTURE : optional_scope

    TENANT ||--o{ STUDENT_FEE : owns
    STUDENT ||--o{ STUDENT_FEE : charged
    FEE_STRUCTURE ||--o{ STUDENT_FEE : assigned

    TENANT ||--o{ PAYMENT : collects
    STUDENT ||--o{ PAYMENT : pays
    STUDENT_FEE ||--o{ PAYMENT : settles
    USER_ACCOUNT ||--o{ PAYMENT : recorded_by

    TENANT ||--o{ EXPENSE : tracks
    USER_ACCOUNT ||--o{ EXPENSE : recorded_by
```

## 4) Library + AI + Notifications + Conversations + Gamification
```mermaid
erDiagram
    BOOK {
        uuid book_id PK
        string title
        string author
        string isbn
        int total_copies
        int available_copies
    }

    BOOK_ISSUE {
        uuid issue_id PK
        uuid book_id FK
        uuid student_id FK
        date due_date
        string status
    }

    AI_INTERACTION_LOG {
        uuid log_id PK
        uuid tenant_id FK
        uuid user_id FK
        string feature_used
        int total_tokens
    }

    STUDENT_AI_REPORT {
        uuid report_id PK
        uuid tenant_id FK
        uuid student_id FK
    }

    LEARNING_PATH {
        uuid id PK
        uuid tenant_id FK
        uuid student_id FK
        int subject_id FK
        string title
    }

    LEARNING_NODE {
        uuid id PK
        uuid learning_path_id FK
        int lesson_id FK
        string resource_type
        string status
    }

    STUDY_EVENT {
        uuid id PK
        uuid tenant_id FK
        uuid student_id FK
        int subject_id FK
        datetime start_time
        datetime end_time
    }

    NOTIFICATION {
        int id PK
        uuid tenant_id FK
        uuid recipient_id FK
        string title
        bool is_read
    }

    NOTIFICATION_TEMPLATE {
        int id PK
        uuid tenant_id FK
        string name
        string type
    }

    CONVERSATION {
        uuid conversation_id PK
        uuid tenant_id FK
        string type
    }

    CONVERSATION_PARTICIPANT {
        int id PK
        uuid conversation_id FK
        uuid user_id FK
    }

    MESSAGE {
        uuid message_id PK
        uuid conversation_id FK
        uuid sender_id FK
        string content
    }

    BADGE {
        uuid id PK
        uuid tenant_id FK
        string name
        string criteria_type
    }

    STUDENT_BADGE {
        uuid id PK
        uuid tenant_id FK
        uuid student_id FK
        uuid badge_id FK
    }

    POINT_TRANSACTION {
        uuid id PK
        uuid tenant_id FK
        uuid student_id FK
        int points
    }

    GAMIFICATION_PROFILE {
        uuid id PK
        uuid tenant_id FK
        uuid student_id FK
        int current_level
        int total_xp
    }

    BOOK ||--o{ BOOK_ISSUE : issued_as
    STUDENT ||--o{ BOOK_ISSUE : borrows

    TENANT ||--o{ AI_INTERACTION_LOG : tracks
    USER_ACCOUNT ||--o{ AI_INTERACTION_LOG : performs

    TENANT ||--o{ STUDENT_AI_REPORT : generates
    STUDENT ||--o{ STUDENT_AI_REPORT : owns

    TENANT ||--o{ LEARNING_PATH : owns
    STUDENT ||--o{ LEARNING_PATH : personalized_for
    SUBJECT ||--o{ LEARNING_PATH : context

    LEARNING_PATH ||--o{ LEARNING_NODE : has
    LESSON ||--o{ LEARNING_NODE : linked_lesson

    TENANT ||--o{ STUDY_EVENT : schedules
    STUDENT ||--o{ STUDY_EVENT : assigned
    SUBJECT ||--o{ STUDY_EVENT : related_subject

    TENANT ||--o{ NOTIFICATION : emits
    USER_ACCOUNT ||--o{ NOTIFICATION : receives

    TENANT ||--o{ NOTIFICATION_TEMPLATE : configures

    TENANT ||--o{ CONVERSATION : owns
    CONVERSATION ||--o{ CONVERSATION_PARTICIPANT : has
    USER_ACCOUNT ||--o{ CONVERSATION_PARTICIPANT : joins
    CONVERSATION ||--o{ MESSAGE : contains
    USER_ACCOUNT ||--o{ MESSAGE : sends

    TENANT ||--o{ BADGE : defines
    TENANT ||--o{ STUDENT_BADGE : awards
    STUDENT ||--o{ STUDENT_BADGE : earns
    BADGE ||--o{ STUDENT_BADGE : awarded_badge

    TENANT ||--o{ POINT_TRANSACTION : logs
    STUDENT ||--o{ POINT_TRANSACTION : earns_points

    TENANT ||--o{ GAMIFICATION_PROFILE : owns
    STUDENT ||--|| GAMIFICATION_PROFILE : profile
```

## Notes
- These diagrams reflect model-level relationships in code, not every database constraint/index.
- Some FKs use `db_constraint=False` intentionally for multi-tenant routing compatibility.
- For migrations and tenant schema operations, use commands documented in `database-design-used.md`.

