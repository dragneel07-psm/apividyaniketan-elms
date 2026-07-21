# AI-Assisted Early Warning System

## Goal

Identify students who are likely to fall behind and surface actionable interventions for teachers early.

## Risk Model (Deterministic Rules)

Risk score is computed per student on a 0-100 scale from four signals:

1. Attendance trend
- Recent attendance % in lookback window
- Drop between previous vs recent attendance windows

2. Recent grades trend
- Recent average assessment %
- Decline between previous vs recent results

3. Missing assignments
- Overdue assignments not submitted

4. Lesson inactivity
- Low lesson completion %
- No lesson access for configured inactivity days

Scores are capped to 100. Students above configured min score are returned as at-risk.

## Optional LLM Explanations

If enabled, deterministic reasons/actions are refined by LLM into clearer teacher-facing explanations:

- `AI_RISK_USE_LLM_EXPLANATIONS=true`

If unavailable, deterministic reasons are used as-is.

## API Endpoint

### `GET /api/ai/analytics/at_risk_students/?class_id=...`

Response shape:

```json
[
  {
    "student_id": "uuid",
    "student_name": "string",
    "risk_score": 82,
    "reasons": ["..."],
    "suggested_actions": ["..."],
    "metrics": {
      "attendance": {},
      "grades": {},
      "assignments": {},
      "activity": {}
    }
  }
]
```

Permissions:
- Teacher/Admin only
- Teacher scope limited to assigned classes

## Notifications

If `risk_score >= threshold`, in-app notifications are created for:

- class teacher (assigned class teacher, or assigned teachers fallback)
- parent(s) linked to the student

Duplicate protection:
- same alert title/recipient is not re-sent within 24 hours.

## Frontend

### Teacher Dashboard Widget
- Added “At Risk Students” panel with top students, score, reason, and quick action text.

### Student Profile (Teacher View)
- Added “Risk Insights (Teacher)” section showing:
  - risk score
  - reasons
  - suggested actions

## Configuration

Optional settings:

- `AI_RISK_LOOKBACK_DAYS` (default `30`)
- `AI_RISK_INACTIVITY_DAYS` (default `14`)
- `AI_AT_RISK_NOTIFICATION_THRESHOLD` (default `75`)
- `AI_AT_RISK_MIN_SCORE` (default `40`)
- `AI_RISK_USE_LLM_EXPLANATIONS` (default `False`)

## Tests

Added deterministic risk computation tests:

- `backend/ai_engine/tests_risk_analytics.py`
  - high-risk student scoring and reason checks
  - notification creation for teacher + parent when threshold is crossed
