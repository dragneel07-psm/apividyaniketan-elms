# pgvector + RAG Indexing (Django Tenant Backend)

## What was added

### 1) pgvector enablement
- Local Docker DB image switched to pgvector-enabled Postgres:
  - `docker-compose.yml`: `db.image = pgvector/pgvector:pg15`
- DB extension migration added:
  - `backend/core/migrations/0007_enable_pgvector_extension.py`
  - Runs: `CREATE EXTENSION IF NOT EXISTS vector;`

### 2) Tenant-scoped RAG storage model
- New model in tenant app:
  - `backend/ai_engine/models.py` -> `ContentChunk`
- Fields:
  - `id` (UUID primary key)
  - `tenant` (FK to tenant, db_constraint=False)
  - `source_type` (`lesson|chapter|material`)
  - `source_id` (string for int/uuid compatibility)
  - `text`
  - `metadata` (JSON)
  - `embedding` (VectorField, dimensions from settings)
  - `created_at`
- Migration:
  - `backend/ai_engine/migrations/0004_contentchunk.py`

### 3) Indexing command
- New management command:
  - `backend/ai_engine/management/commands/ai_index_content.py`
- Usage:
```bash
cd backend
python manage.py ai_index_content --tenant=<schema_or_subdomain_or_domain>
```
- Behavior:
  - Resolves tenant by schema/subdomain/domain from public schema
  - Reads tenant `Chapter`, `Lesson`, and `LessonMaterial`
  - Chunks text content
  - Generates embeddings:
    - OpenAI embeddings if provider is configured
    - deterministic stub vectors for dev fallback
  - Upserts by deleting old chunks for each source and inserting fresh chunk rows

### 4) Service layer
- Added:
  - `backend/ai_engine/services/indexing_service.py`
- Provides:
  - tenant resolution
  - chunking
  - embedding generation
  - per-tenant indexing upsert logic

## Settings

In `backend/config/settings/base.py`:

- `AI_EMBEDDING_DIMENSIONS` (default `1536`)
- `AI_EMBEDDING_MODEL` (default `text-embedding-3-small`)
- `AI_CONTENT_CHUNK_WORDS` (default `180`)
- `AI_CONTENT_CHUNK_OVERLAP_WORDS` (default `30`)

In `backend/.env.example`, matching env keys were added.

## Dependency

Added Python dependency:
- `backend/requirements.txt` -> `pgvector==0.3.6`

## Safety for environments without pgvector package

- Added compatibility wrapper:
  - `backend/core/vector.py`
- Uses real `pgvector.django.VectorField` when installed.
- Falls back to JSON-backed field when package is missing (dev/sandbox safety).

## Test

- Minimal model/query test:
  - `backend/ai_engine/tests_contentchunk.py`
  - verifies create + query on `ContentChunk` in tenant schema.

## Notes for production

- If your managed Postgres does not allow `CREATE EXTENSION` from app role, run as a privileged user:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```
- Then run normal Django migrations.
