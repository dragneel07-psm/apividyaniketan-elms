#!/usr/bin/env bash
# =============================================================================
# QA Test Runner
# =============================================================================
# Sets up the QA tenant with dummy data, then runs the full Playwright QA suite.
#
# Usage:
#   ./scripts/run-qa.sh                        # local, default URLs
#   ./scripts/run-qa.sh --prod                 # against deployed environment
#   ./scripts/run-qa.sh --setup-only           # only seed data, skip tests
#   ./scripts/run-qa.sh --tests-only           # skip setup, run tests only
#   ./scripts/run-qa.sh --clear                # wipe & recreate QA tenant first
#
# Environment overrides:
#   E2E_API_URL    — backend URL   (default: http://127.0.0.1:8000)
#   E2E_BASE_URL   — frontend URL  (default: http://127.0.0.1:3000)
#   E2E_QA_TENANT  — tenant slug   (default: qa)
# =============================================================================

set -euo pipefail

# ── Defaults ──────────────────────────────────────────────────────────────────
API_URL="${E2E_API_URL:-http://127.0.0.1:8000}"
BASE_URL="${E2E_BASE_URL:-http://127.0.0.1:3000}"
QA_TENANT="${E2E_QA_TENANT:-qa}"
BACKEND_DIR="$(cd "$(dirname "$0")/../backend" && pwd)"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CREDS_FILE="/tmp/qa_creds_${QA_TENANT}.json"

SETUP_ONLY=false
TESTS_ONLY=false
CLEAR_FLAG=""
PROD_MODE=false

# Auto-load .env.local from repo root if it exists (gitignored credentials file)
ENV_LOCAL="$(cd "$(dirname "$0")/.." && pwd)/.env.local"
if [ -f "$ENV_LOCAL" ]; then
  # shellcheck disable=SC1090
  set -a; source "$ENV_LOCAL"; set +a
  # Re-apply overrides in case .env.local changes them
  API_URL="${E2E_API_URL:-$API_URL}"
  BASE_URL="${E2E_BASE_URL:-$BASE_URL}"
  QA_TENANT="${E2E_QA_TENANT:-$QA_TENANT}"
fi

# ── Parse args ────────────────────────────────────────────────────────────────
for arg in "$@"; do
  case $arg in
    --prod)        PROD_MODE=true ;;
    --setup-only)  SETUP_ONLY=true ;;
    --tests-only)  TESTS_ONLY=true ;;
    --clear)       CLEAR_FLAG="--clear" ;;
  esac
done

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║           E-Learning LMS — QA Test Runner            ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "  API URL  : $API_URL"
echo "  Front URL: $BASE_URL"
echo "  Tenant   : $QA_TENANT"
echo "  Prod Mode: $PROD_MODE"
echo ""

# ── Step 1: Setup QA tenant ───────────────────────────────────────────────────
if [ "$TESTS_ONLY" = false ]; then
  echo "▶ [1/2] Setting up QA tenant..."

  if [ "$PROD_MODE" = true ]; then
    # Run via Railway CLI against deployed DB
    echo "  Running via Railway CLI..."
    railway run --service backend python manage.py setup_qa_tenant \
      --schema "$QA_TENANT" \
      --output "$CREDS_FILE" \
      $CLEAR_FLAG
  else
    # Run locally
    cd "$BACKEND_DIR"

    # Activate venv if present
    if [ -f ".venv/bin/activate" ]; then
      source ".venv/bin/activate"
    fi

    python manage.py setup_qa_tenant \
      --schema "$QA_TENANT" \
      --output "$CREDS_FILE" \
      $CLEAR_FLAG

    cd "$ROOT_DIR"
  fi

  echo "  ✓ QA tenant ready"
  echo ""
fi

# ── Step 2: Run Playwright tests ──────────────────────────────────────────────
if [ "$SETUP_ONLY" = false ]; then
  echo "▶ [2/2] Running QA tests..."
  echo ""

  cd "$ROOT_DIR"

  export E2E_API_URL="$API_URL"
  export E2E_BASE_URL="$BASE_URL"
  export E2E_QA_TENANT="$QA_TENANT"

  # Run tests with QA config
  npx playwright test \
    --config=tests/qa.config.ts \
    --project=chromium \
    "$@" 2>&1 || {
      EXIT_CODE=$?
      echo ""
      echo "╔══════════════════════════════════════════════════════╗"
      echo "║  ✗ Some QA tests FAILED — check the report above     ║"
      echo "║  HTML report: playwright-report/qa/index.html        ║"
      echo "╚══════════════════════════════════════════════════════╝"
      exit $EXIT_CODE
    }

  echo ""
  echo "╔══════════════════════════════════════════════════════╗"
  echo "║  ✓ All QA tests PASSED                               ║"
  echo "║  HTML report: playwright-report/qa/index.html        ║"
  echo "╚══════════════════════════════════════════════════════╝"
fi
