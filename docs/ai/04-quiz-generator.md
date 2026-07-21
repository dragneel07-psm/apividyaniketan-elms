# AI Quiz Generator (RAG)

## Endpoint

- `POST /api/ai/quizzes/generate/`

Request body:

```json
{
  "source_type": "lesson",
  "source_id": "12",
  "difficulty": "medium",
  "count": 10
}
```

Response:

```json
{
  "quiz_id": "b1f0b0e8-....",
  "questions": [
    {
      "question_id": "f9c0....",
      "type": "mcq",
      "prompt": "string",
      "options": ["A", "B", "C", "D"],
      "correct_index": 0,
      "explanation": "string"
    }
  ]
}
```

## Behavior

- Uses tenant-scoped RAG chunks (`ContentChunk`) for the source (`lesson`/`chapter`).
- Sends strict JSON schema prompt to LLM for MCQ generation.
- Validates returned JSON:
  - must include `questions` array
  - each question requires `type=mcq`, `prompt`, `options`, `correct_index`, `explanation`
  - must match requested `count`
- If invalid JSON is returned, one automatic repair retry is executed with a JSON-fix prompt.
- On success:
  - creates `Assessment` record (`type=quiz`)
  - creates `Question` records
  - links generated assessment to lesson (`Lesson.assessment`) when source is a lesson.

## Authorization

- Allowed roles: `teacher`, `admin`.
- Other roles receive `403`.

## Frontend

- Added teacher controls:
  - Lesson editor page: `Generate Quiz Assessment` (lesson source)
  - Curriculum chapters page: `AI Quiz` button (chapter source)
- Files:
  - `frontend/app/teacher/courses/[courseId]/lessons/[lessonId]/page.tsx`
  - `frontend/app/teacher/courses/[courseId]/lessons/page.tsx`
  - `frontend/lib/api.ts` (`aiAPI.generateQuiz`)

## Tests

- `backend/ai_engine/tests_quiz_generator_api.py`
  - verifies role guard (student blocked)
  - verifies teacher generation creates quiz + questions
