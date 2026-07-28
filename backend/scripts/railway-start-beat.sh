#!/usr/bin/env bash
set -euo pipefail

CELERY_LOG_LEVEL="${CELERY_LOG_LEVEL:-info}"

if [ -f manage.py ]; then
  APP_DIR="."
elif [ -f backend/manage.py ]; then
  APP_DIR="backend"
else
  echo "manage.py not found from $(pwd)" >&2
  exit 1
fi

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

cd "${APP_DIR}"
exec "${CELERY_BIN}" -A config.celery:app beat \
  --loglevel="${CELERY_LOG_LEVEL}"
