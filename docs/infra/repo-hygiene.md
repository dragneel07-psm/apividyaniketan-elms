# Repo Hygiene Cleanup

## Why
Keep generated artifacts and local environment files out of git history so production deploys and reviews stay clean.

## `.gitignore` coverage added
- Python cache and test artifacts: `__pycache__/`, `*.pyc`, `.pytest_cache/`, `.coverage`, `htmlcov/`
- Local env files: `.env`, `backend/.env`, `frontend/.env*`, `mobile/.env*` (while preserving `*.env.example`)
- SQLite artifacts: `*.sqlite3`, `*.sqlite3.*`
- Django generated files: `backend/media/`, `backend/staticfiles/`
- Frontend build artifacts: `frontend/.next/`, `frontend/out/`
- Node modules: `node_modules/`
- Logs: `*.log`
- OS files: `.DS_Store`
- Playwright artifacts: `playwright-report/`, `test-results/`

## Exact cleanup commands (remove from git index, keep local files)
Run these from repo root:

```bash
git rm -r --cached frontend/.next
git rm -r --cached backend/media backend/staticfiles
git rm -f --cached backend/config/*.sqlite3
git rm -f --cached backend/verify_*.sqlite3
git rm -f --cached "*.sqlite3"
git rm -f --cached "*.sqlite3.*"
git rm -r --cached playwright-report test-results
```

If a path is not currently tracked, git will print a pathspec warning. That is safe; continue.

## Verify before commit
```bash
git status --short
git ls-files | rg "frontend/.next|\\.sqlite3|backend/media|backend/staticfiles|playwright-report|test-results"
```

Current status at time of writing: no tracked files were found under `frontend/.next/`, `backend/config/*.sqlite3`, or `backend/verify_*.sqlite3`.
