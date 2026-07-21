#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OPENAPI_TS_VERSION="${OPENAPI_TYPESCRIPT_VERSION:-7.10.1}"
SCHEMA_URL="${SCHEMA_URL:-http://127.0.0.1:8000/api/schema/?format=openapi-json}"

SCHEMA_OUT="${SCHEMA_OUT:-$ROOT_DIR/api/schema/openapi.json}"
FRONTEND_TYPES_OUT="${FRONTEND_TYPES_OUT:-$ROOT_DIR/frontend/types/api-schema.ts}"
MOBILE_TYPES_OUT="${MOBILE_TYPES_OUT:-$ROOT_DIR/mobile/types/api-schema.ts}"

mkdir -p "$(dirname "$SCHEMA_OUT")" "$(dirname "$FRONTEND_TYPES_OUT")" "$(dirname "$MOBILE_TYPES_OUT")"

curl -fsSL "$SCHEMA_URL" -o "$SCHEMA_OUT"

npx --yes "openapi-typescript@${OPENAPI_TS_VERSION}" "$SCHEMA_OUT" -o "$FRONTEND_TYPES_OUT"
npx --yes "openapi-typescript@${OPENAPI_TS_VERSION}" "$SCHEMA_OUT" -o "$MOBILE_TYPES_OUT"

echo "OpenAPI schema generated at $SCHEMA_OUT"
echo "Frontend types generated at $FRONTEND_TYPES_OUT"
echo "Mobile types generated at $MOBILE_TYPES_OUT"
