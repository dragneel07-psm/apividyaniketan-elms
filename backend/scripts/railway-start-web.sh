#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-8000}"
MIGRATION_VERBOSITY="${MIGRATION_VERBOSITY:-1}"
RUN_STARTUP_MIGRATIONS="${RUN_STARTUP_MIGRATIONS:-true}"
RUN_STARTUP_INIT_PROD="${RUN_STARTUP_INIT_PROD:-false}"

log() {
  printf '[railway-web-start] %s\n' "$1"
}

log "Booting web service (pwd=$(pwd), PORT=${PORT})"

ensure_allowed_host() {
  local host="$1"
  if [ -z "$host" ]; then
    return 0
  fi
  case ",${ALLOWED_HOSTS:-}," in
    *,"$host",*) ;;
    *)
      if [ -n "${ALLOWED_HOSTS:-}" ]; then
        ALLOWED_HOSTS="${ALLOWED_HOSTS},${host}"
      else
        ALLOWED_HOSTS="${host}"
      fi
      ;;
  esac
}

ensure_allowed_host "healthcheck.railway.app"
ensure_allowed_host "${RAILWAY_PUBLIC_DOMAIN:-}"
ensure_allowed_host "${RAILWAY_PRIVATE_DOMAIN:-}"
export ALLOWED_HOSTS

if [ -f manage.py ]; then
  APP_DIR="."
elif [ -f backend/manage.py ]; then
  APP_DIR="backend"
else
  echo "manage.py not found from $(pwd)" >&2
  exit 1
fi

resolve_python_bin() {
  if [ -n "${PY_BIN:-}" ] && [ -x "${PY_BIN}" ]; then
    echo "${PY_BIN}"
    return 0
  fi
  if command -v python >/dev/null 2>&1; then
    command -v python
    return 0
  fi
  if [ -x "/usr/local/bin/python" ]; then
    echo "/usr/local/bin/python"
    return 0
  fi
  if [ -x "/opt/venv/bin/python" ]; then
    echo "/opt/venv/bin/python"
    return 0
  fi
  echo "Unable to locate python binary. Set PY_BIN explicitly." >&2
  exit 1
}

resolve_server_bin() {
  # Prefer daphne (ASGI — required for Django Channels WebSockets)
  if [ -n "${DAPHNE_BIN:-}" ] && [ -x "${DAPHNE_BIN}" ]; then
    echo "${DAPHNE_BIN}"; return 0
  fi
  if command -v daphne >/dev/null 2>&1; then
    command -v daphne; return 0
  fi
  for candidate in /usr/local/bin/daphne /opt/venv/bin/daphne; do
    [ -x "$candidate" ] && echo "$candidate" && return 0
  done
  # daphne missing. WebSockets won't work under gunicorn — refuse to start
  # silently. Set ALLOW_GUNICORN_FALLBACK=true to opt back into the old behavior.
  if [ "${ALLOW_GUNICORN_FALLBACK:-false}" = "true" ]; then
    log "WARNING: daphne not found, falling back to gunicorn (WebSockets will not work)"
    if command -v gunicorn >/dev/null 2>&1; then
      command -v gunicorn; return 0
    fi
    for candidate in /usr/local/bin/gunicorn /opt/venv/bin/gunicorn; do
      [ -x "$candidate" ] && echo "$candidate" && return 0
    done
    echo "Unable to locate daphne or gunicorn. Install daphne." >&2
    exit 1
  fi
  echo "FATAL: daphne not found. Install daphne (it's in requirements.txt) or set ALLOW_GUNICORN_FALLBACK=true to start without WebSocket support." >&2
  exit 1
}

PY_BIN="$(resolve_python_bin)"
SERVER_BIN="$(resolve_server_bin)"
# Derive server type from binary name for conditional startup logic
SERVER_TYPE="$(basename "${SERVER_BIN}")"

# Default worker count: 2 * CPUs + 1 (capped at 8 for Railway free tier)
WORKERS="${WEB_WORKERS:-$(python -c "import os; print(min(2*os.cpu_count()+1, 8))" 2>/dev/null || echo 3)}"

cd "${APP_DIR}"

log "Using APP_DIR=${APP_DIR}, PY_BIN=${PY_BIN}, SERVER=${SERVER_BIN} (workers=${WORKERS})"
log "Startup tasks: RUN_STARTUP_MIGRATIONS=${RUN_STARTUP_MIGRATIONS}, RUN_STARTUP_INIT_PROD=${RUN_STARTUP_INIT_PROD}"

if [ "${RUN_STARTUP_MIGRATIONS}" = "true" ]; then
  # --shared already migrates the public schema; no need to run --schema=public again.
  log "Running shared migrations"
  "${PY_BIN}" manage.py migrate_schemas --shared --noinput --verbosity="${MIGRATION_VERBOSITY}"
  log "Running tenant migrations"
  "${PY_BIN}" manage.py migrate_schemas --tenant --noinput --verbosity="${MIGRATION_VERBOSITY}"
else
  log "Skipping migrations (RUN_STARTUP_MIGRATIONS=${RUN_STARTUP_MIGRATIONS})"
fi

if [ "${RUN_STARTUP_INIT_PROD}" = "true" ]; then
  log "Running init_prod bootstrap"
  "${PY_BIN}" manage.py init_prod
else
  log "Skipping init_prod (RUN_STARTUP_INIT_PROD=${RUN_STARTUP_INIT_PROD})"
fi

# Ensure staticfiles directory exists so WhiteNoise doesn't warn/error.
# collectstatic is idempotent and fast when files haven't changed.
log "Collecting static files"
"${PY_BIN}" manage.py collectstatic --noinput --clear 2>&1 | tail -3 || log "WARNING: collectstatic failed (non-fatal)"

if [ "${SERVER_TYPE}" = "daphne" ]; then
  log "Starting daphne (ASGI — HTTP + WebSockets)"
  exec "${SERVER_BIN}" \
    -b 0.0.0.0 \
    -p "${PORT}" \
    --access-log - \
    --proxy-headers \
    config.asgi:application
else
  log "Starting gunicorn (WSGI — HTTP only)"
  exec "${SERVER_BIN}" config.wsgi \
    --bind "0.0.0.0:${PORT}" \
    --workers "${WORKERS}" \
    --worker-class gthread \
    --threads 4 \
    --timeout 120 \
    --keep-alive 5 \
    --access-logfile -
fi
