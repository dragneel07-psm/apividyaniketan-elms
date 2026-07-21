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

resolve_gunicorn_bin() {
  if [ -n "${GUNICORN_BIN:-}" ] && [ -x "${GUNICORN_BIN}" ]; then
    echo "${GUNICORN_BIN}"
    return 0
  fi
  if command -v gunicorn >/dev/null 2>&1; then
    command -v gunicorn
    return 0
  fi
  if [ -x "/usr/local/bin/gunicorn" ]; then
    echo "/usr/local/bin/gunicorn"
    return 0
  fi
  if [ -x "/opt/venv/bin/gunicorn" ]; then
    echo "/opt/venv/bin/gunicorn"
    return 0
  fi
  echo "Unable to locate gunicorn binary. Set GUNICORN_BIN explicitly." >&2
  exit 1
}

PY_BIN="$(resolve_python_bin)"
GUNICORN_BIN="$(resolve_gunicorn_bin)"

if [ -f manage.py ]; then
  APP_DIR="."
elif [ -f backend/manage.py ]; then
  APP_DIR="backend"
else
  echo "manage.py not found from $(pwd)" >&2
  exit 1
fi

cd "${APP_DIR}"

log "Using APP_DIR=${APP_DIR}, PY_BIN=${PY_BIN}, GUNICORN_BIN=${GUNICORN_BIN}"
log "Startup tasks: RUN_STARTUP_MIGRATIONS=${RUN_STARTUP_MIGRATIONS}, RUN_STARTUP_INIT_PROD=${RUN_STARTUP_INIT_PROD}"

# Keep schema migrations + bootstrap idempotent for zero-touch deployments.
# --shared already migrates the public schema; no need to run --schema=public again.
if [ "${RUN_STARTUP_MIGRATIONS}" = "true" ]; then
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

log "Starting gunicorn"
exec "${GUNICORN_BIN}" config.wsgi --bind "0.0.0.0:${PORT}"
