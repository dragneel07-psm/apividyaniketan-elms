#!/usr/bin/env bash
set -euo pipefail

CELERY_LOG_LEVEL="${CELERY_LOG_LEVEL:-info}"
CELERY_WORKER_CONCURRENCY="${CELERY_WORKER_CONCURRENCY:-2}"

resolve_celery_bin() {
  if [ -n "${CELERY_BIN:-}" ] && [ -x "${CELERY_BIN}" ]; then
    echo "${CELERY_BIN}"
    return 0
  fi
  if command -v celery >/dev/null 2>&1; then
    command -v celery
    return 0
  fi
  if [ -x "/usr/local/bin/celery" ]; then
    echo "/usr/local/bin/celery"
    return 0
  fi
  if [ -x "/opt/venv/bin/celery" ]; then
    echo "/opt/venv/bin/celery"
    return 0
  fi
  echo "Unable to locate celery binary. Set CELERY_BIN explicitly." >&2
  exit 1
}

CELERY_BIN="$(resolve_celery_bin)"

cd backend
exec "${CELERY_BIN}" -A config.celery:app worker --loglevel="${CELERY_LOG_LEVEL}" --concurrency="${CELERY_WORKER_CONCURRENCY}"
