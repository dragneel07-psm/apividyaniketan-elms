# AI-Assisted Grading for Subjective Answers

## Overview

This feature adds rubric-based AI draft grading for subjective submissions.

- AI generates a **draft** score + feedback.
- Teacher/Admin must explicitly **approve** the draft to finalize the grade.
- Students cannot access AI draft data.

## Data Models

### `GradingRubric` (tenant scoped)

- `id` (uuid)
- `tenant`
- `title`
- `criteria` (json)
- `total_points`
- `created_by`
- `created_at`
- `updated_at`

### `AIGradingDraft` (tenant scoped)

- `id` (uuid)
- `tenant`
- `submission` (FK to `academic.Submission`)
- `rubric` (FK to `GradingRubric`)
- `score`
- `feedback`
- `criteria_breakdown` (json array)
- `status` (`draft|approved|rejected`)
- `approved_by` (nullable)
- `approved_at` (nullable)
- `created_by`
- `created_at`
- `updated_at`

## API Endpoints

### Rubrics

- `GET /api/ai/grading/rubrics/`
- `POST /api/ai/grading/rubrics/`

Create request example:

```json
{
  "title": "Subjective Rubric",
  "criteria": [
    { "name": "Accuracy", "max_points": 50 },
    { "name": "Clarity", "max_points": 25 },
    { "name": "Completeness", "max_points": 25 }
  ],
  "total_points": 100
}
```

### Generate Draft Grade

- `POST /api/ai/grading/grade_submission/`

Request:

```json
{
  "submission_id": "uuid",
  "rubric_id": "uuid"
}
```

Response:

```json
{
  "draft_id": "uuid",
  "score": 78.0,
  "feedback": "Good conceptual understanding...",
  "criteria_breakdown": [
    {
      "criterion": "Accuracy",
      "points_awarded": 38,
      "max_points": 50,
      "feedback": "Mostly correct"
    }
  ],
  "status": "draft"
}
```

### List Drafts

- `GET /api/ai/grading/drafts/?submission_id=<uuid>`

### Approve Draft

- `POST /api/ai/grading/approve_draft/`

Request:

```json
{
  "draft_id": "uuid"
}
```

Approval finalizes grading by:

- updating/creating `academic.Result`
- setting `submission.status = "graded"`
- setting `submission.is_graded = true`
- marking draft as `approved` with `approved_by` and `approved_at`

## Permissions

- Allowed: `teacher`, `admin`
- Denied: `student`, `parent`, others
- Teacher scope checks apply to assigned class/subject submissions.

## Frontend

Teacher grading screen (`/teacher/grading/[submissionId]`) now supports:

1. Select/create rubric
2. Run `AI Grade`
3. Review draft score + criteria breakdown
4. Approve draft to finalize result

## Tests

Added tests in:

- `backend/ai_engine/tests_assisted_grading_api.py`

Coverage:

- permission guard (student blocked)
- rubric create
- draft generation
- approve flow (result/submission update)
- student cannot view draft endpoints
