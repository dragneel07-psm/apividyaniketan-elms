# AI Exam Paper Generator

## Endpoints

- `POST /api/ai/exams/generate/`
- `GET /api/ai/artifacts/`

## Generate Exam Paper

### Request

`POST /api/ai/exams/generate/`

```json
{
  "class_id": "10",
  "subject_id": "5",
  "units": ["12", "13"],
  "marks": 100,
  "difficulty_mix": {
    "easy": 30,
    "medium": 50,
    "hard": 20
  }
}
```

### Response

```json
{
  "paper": {
    "title": "Grade 10 Science Terminal Exam",
    "total_marks": 100,
    "sections": [
      {
        "title": "Section A",
        "instructions": "Answer all questions",
        "marks": 40,
        "questions": [
          {
            "type": "mcq",
            "prompt": "What is velocity?",
            "marks": 10,
            "options": ["A", "B", "C", "D"]
          }
        ]
      }
    ]
  },
  "answer_key": {
    "1": "A"
  },
  "marking_scheme": {
    "guidelines": ["Award method marks"],
    "difficulty_mix": {
      "easy": 30,
      "medium": 50,
      "hard": 20
    }
  }
}
```

## Behavior

- Uses curriculum context from:
  - `Subject`
  - selected `Chapter` units
  - related `Lesson` data
- Uses tenant-scoped RAG chunks (`ContentChunk`) for additional grounding.
- LLM output is required to be strict JSON.
- Payload is validated server-side:
  - required top-level keys (`paper`, `answer_key`, `marking_scheme`)
  - section/question shape
  - section/question marks consistency
  - `paper.total_marks` must match requested `marks`
- If JSON is invalid, one automatic JSON-fix retry is attempted.
- Generated artifact is persisted to `AiGeneratedArtifact` with:
  - `artifact_type="exam_paper"`
  - `source_type="subject"`
  - `source_id=<subject_id>`

## Access Control

- Generate exam paper: `teacher` and `admin` only.
- Fetch generated artifacts: `teacher` and `admin` only.

## Fetch Saved Artifacts

`GET /api/ai/artifacts/?artifact_type=exam_paper&source_type=subject&source_id=<subject_id>&limit=20`

- Returns recent generated artifacts for the tenant.
- Supports filters:
  - `artifact_type`
  - `source_type`
  - `source_id`
  - `limit` (1-100)

## Frontend

- Teacher curriculum page now includes:
  - `AI Exam Paper` action button
  - inline preview for sections/questions
  - expandable Answer Key and Marking Scheme

## Tests

- Added `backend/ai_engine/tests_exam_generator_api.py`:
  - role guard (student blocked)
  - successful generation and artifact persistence
  - artifact fetch endpoint response
