# Lesson Summarization & Exam Notes API

## Endpoints

- `POST /api/ai/lessons/{lesson_id}/summarize/`
- `POST /api/ai/lessons/{lesson_id}/exam_notes/`

Query params:

- `lang=en|ne` (default: `en`)

Response shape:

```json
{
  "summary": "string",
  "bullets": ["string"],
  "key_terms": ["string"],
  "practice_questions": ["string"]
}
```

## Backend implementation

- Added tenant-scoped cache model:
  - `ai_engine.AiGeneratedArtifact`
  - fields: `artifact_type`, `source_type`, `source_id`, `lang`, `content`, `created_by`, `created_at`
- Migration:
  - `backend/ai_engine/migrations/0005_aigeneratedartifact.py`
- Service:
  - `backend/ai_engine/services/lesson_summary_service.py`
  - Uses lesson-linked `ContentChunk` rows (`source_type=lesson/material`) as grounding context.
  - Builds LLM prompt for strict JSON output.
  - Stores generated artifact in DB and returns cached artifact on subsequent calls.
- API views:
  - `ai_lesson_summarize`
  - `ai_lesson_exam_notes`
  - implemented in `backend/ai_engine/views.py`

## Language mode

- `lang=en`: output in clear English.
- `lang=ne`: output in clear Nepali, with optional English technical terms.
- Invalid language returns HTTP `400`.

## Frontend (web)

- Student lesson detail page now includes:
  - language switch (`English`/`Nepali`)
  - `Generate Summary` button
  - `Generate Exam Notes` button
  - rendered sections for summary, bullets, key terms, and practice questions
- Files:
  - `frontend/lib/api.ts` (new API methods + types)
  - `frontend/app/student/courses/[courseId]/lessons/[lessonId]/page.tsx`

## Tests

- Added serializer + endpoint tests:
  - `backend/ai_engine/tests_lesson_artifacts.py`
- Endpoint test mocks LLM call and verifies response + artifact cache creation.
