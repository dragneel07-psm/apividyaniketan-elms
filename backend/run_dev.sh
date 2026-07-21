#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# run_dev.sh  –  Start the Django backend with Python 3.13 venv
# Usage: ./run_dev.sh
# ─────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
VENV_DIR="$SCRIPT_DIR/.venv"

# ── 1. Ensure the venv exists ────────────────────────────────
if [ ! -d "$VENV_DIR" ]; then
  echo "⚙️  Python 3.13 venv not found. Creating it..."
  python3.13 -m venv "$VENV_DIR"
  "$VENV_DIR/bin/pip" install --upgrade pip setuptools wheel
  "$VENV_DIR/bin/pip" install -r "$SCRIPT_DIR/requirements.txt"
  echo "✅ Venv created and packages installed."
fi

PYTHON="$VENV_DIR/bin/python"
PY_VER=$("$PYTHON" --version)
echo "🐍 Using: $PY_VER  ($PYTHON)"

# ── 2. Check Python 3.13 ─────────────────────────────────────
if ! "$PYTHON" -c "import sys; assert sys.version_info >= (3,13), 'Need Python 3.13+'" 2>/dev/null; then
  echo "❌ Venv is not Python 3.13+. Remove .venv313 and re-run."
  exit 1
fi

# ── 3. Load .env ─────────────────────────────────────────────
if [ -f "$SCRIPT_DIR/.env" ]; then
  export $(grep -v '^#' "$SCRIPT_DIR/.env" | xargs)
  echo "🔐 Loaded .env"
fi

# ── 4. Run migrations ─────────────────────────────────────────
echo "🛠️  Running migrations..."
"$PYTHON" "$SCRIPT_DIR/manage.py" migrate_schemas --shared 2>&1 | tail -5
"$PYTHON" "$SCRIPT_DIR/manage.py" migrate 2>&1 | tail -5

# ── 5. Start dev server ───────────────────────────────────────
echo ""
echo "🚀 Starting Django dev server on http://0.0.0.0:8000"
echo "   (accessible from mobile at http://YOUR_LOCAL_IP:8000)"
echo ""
"$PYTHON" "$SCRIPT_DIR/manage.py" runserver 0.0.0.0:8000
