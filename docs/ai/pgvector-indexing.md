# PGVector Indexing and Similarity Search

## Overview

The backend supports tenant-scoped RAG storage using PostgreSQL + pgvector.

Implemented pieces:

- pgvector extension enable migration: `backend/core/migrations/0007_enable_pgvector_extension.py`
- Vector-capable field abstraction: `backend/core/vector.py`
- Tenant-scoped chunk model: `ai_engine.ContentChunk`
- Indexing command: `python manage.py ai_index_content --tenant=<schema|subdomain|domain>`
- Similarity search API: `POST /api/ai/chunks/search/`

## ContentChunk model

`backend/ai_engine/models.py`

Fields:

- `id` (UUID)
- `tenant` (FK to tenant, tenant-scoped data)
- `source_type` (`lesson|chapter|material`)
- `source_id` (string identifier)
- `text` (chunk text)
- `metadata` (JSON)
- `embedding` (`VectorField`, dimension from `AI_EMBEDDING_DIMENSIONS`)
- `created_at`

## Indexing command

```bash
cd backend
.venv/bin/python manage.py ai_index_content --tenant=demo
```

What it does:

1. Resolves tenant from schema/subdomain/domain.
2. Reads chapter/lesson/material content.
3. Chunks text based on configured word window/overlap.
4. Generates embeddings:
   - OpenAI embedding API when configured
   - deterministic stub vectors when provider/key is unavailable
5. Upserts per source by replacing existing chunks for the same `(tenant, source_type, source_id)`.

## Similarity search API

Endpoint:

- `POST /api/ai/chunks/search/`

Request body:

```json
{
  "query": "Explain Newton's first law",
  "top_k": 5,
  "min_similarity": 0.2,
  "context": {"lesson_id": 12},
  "source_type": "lesson",
  "source_id": "12"
}
```

Response:

```json
{
  "count": 1,
  "results": [
    {
      "chunk_id": "...",
      "source_type": "lesson",
      "source_id": "12",
      "text": "...",
      "metadata": {"lesson_id": 12, "chunk_index": 0},
      "similarity": 0.91
    }
  ]
}
```

Notes:

- Tenant isolation is enforced by request tenant context.
- If pgvector cosine lookup is unavailable, service falls back to Python cosine similarity.

## Config knobs

In `backend/config/settings/base.py`:

- `AI_EMBEDDING_DIMENSIONS`
- `AI_EMBEDDING_MODEL`
- `AI_CONTENT_CHUNK_WORDS`
- `AI_CONTENT_CHUNK_OVERLAP_WORDS`

## Tests

Added minimal tests:

- `backend/ai_engine/tests_indexing_command.py`
  - management command indexing with mocked embeddings
  - verifies idempotent upsert behavior for same source
- `backend/ai_engine/tests_chunk_search_api.py`
  - similarity endpoint response and filtering
  - mocked query embedding (no OpenAI key required)

Run:

```bash
cd backend
.venv/bin/python manage.py test ai_engine.tests_contentchunk ai_engine.tests_indexing_command ai_engine.tests_chunk_search_api
```
