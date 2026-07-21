#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

DATE_STR="$(date +"%Y-%m-%d")"
TIMESTAMP_STR="$(date +"%Y-%m-%d %H:%M:%S %z")"

REPORT_DIR="${REPO_ROOT}/docs/reports"
REPORT_FILE="${REPORT_DIR}/arch-report-${DATE_STR}.md"

SETTINGS_FILE="${REPO_ROOT}/backend/config/settings/base.py"
COMPOSE_FILE="${REPO_ROOT}/docker-compose.yml"
TREE_DEPTH="${ARCH_REPORT_TREE_DEPTH:-4}"
TREE_EXCLUDE_EXPR="${ARCH_REPORT_TREE_EXCLUDE:-node_modules|.git|.venv|.venv_*|__pycache__}"

mkdir -p "${REPORT_DIR}"

extract_app_list() {
  local list_name="$1"
  local file_path="$2"

  awk -v key="${list_name}" '
    $0 ~ ("^" key "[[:space:]]*=[[:space:]]*\\[") {in_list=1; next}
    in_list && /^[[:space:]]*]/ {in_list=0}
    in_list {print}
  ' "${file_path}" | sed -n "s/.*['\"]\\([^'\"]*\\)['\"].*/- \`\\1\`/p"
}

print_repo_tree() {
  if command -v tree >/dev/null 2>&1; then
    (
      cd "${REPO_ROOT}" && \
      tree -a -L "${TREE_DEPTH}" -I "${TREE_EXCLUDE_EXPR}"
    )
    return
  fi

  (
    cd "${REPO_ROOT}" && \
    find . \
      \( -name "node_modules" -o -name ".git" -o -name ".venv" -o -name ".venv_*" -o -name "__pycache__" \) -prune -o \
      -print | sed 's#^\./##'
  ) | awk '
    {
      if ($0 == ".") next
      depth = gsub(/\//, "/", $0)
      indent = ""
      for (i = 0; i < depth; i++) indent = indent "  "
      print indent "- " $0
    }
  '
}

print_api_routes() {
  if command -v rg >/dev/null 2>&1; then
    (
      cd "${REPO_ROOT}" && \
      rg -n --no-heading "^[[:space:]]*(path|re_path)\(" backend -g "*urls.py" || true
    )
    return
  fi

  (
    cd "${REPO_ROOT}" && \
    find backend -name "*urls.py" -type f -print0 | xargs -0 grep -nE "^[[:space:]]*(path|re_path)\(" || true
  )
}

print_router_routes() {
  if command -v rg >/dev/null 2>&1; then
    (
      cd "${REPO_ROOT}" && \
      rg -n --no-heading "router\\.register\(" backend -g "*urls.py" || true
    )
    return
  fi

  (
    cd "${REPO_ROOT}" && \
    find backend -name "*urls.py" -type f -print0 | xargs -0 grep -nE "router\\.register\(" || true
  )
}

print_celery_tasks() {
  if command -v rg >/dev/null 2>&1; then
    (
      cd "${REPO_ROOT}" && \
      rg -n --no-heading "@(shared_task|app\\.task|celery_app\\.task)" backend || true
    )
    return
  fi

  (
    cd "${REPO_ROOT}" && \
    grep -RnsE "@(shared_task|app\\.task|celery_app\\.task)" backend || true
  )
}

print_task_functions() {
  if command -v rg >/dev/null 2>&1; then
    (
      cd "${REPO_ROOT}" && \
      rg -n --no-heading "^def [A-Za-z_][A-Za-z0-9_]*\\(" backend -g "*tasks.py" || true
    )
    return
  fi

  (
    cd "${REPO_ROOT}" && \
    find backend -name "*tasks.py" -type f -print0 | xargs -0 grep -nE "^def [A-Za-z_][A-Za-z0-9_]*\\(" || true
  )
}

compose_service_names() {
  local compose_path="$1"
  awk '
    /^services:[[:space:]]*$/ {in_services=1; next}
    in_services && /^[[:alnum:]_.-]+:[[:space:]]*$/ {in_services=0}
    in_services && /^  [[:alnum:]_.-]+:[[:space:]]*$/ {
      svc=$1
      sub(":", "", svc)
      print svc
    }
  ' "${compose_path}"
}

compose_service_block() {
  local compose_path="$1"
  local service_name="$2"
  awk -v svc="${service_name}" '
    /^services:[[:space:]]*$/ {in_services=1; next}
    in_services && /^[[:alnum:]_.-]+:[[:space:]]*$/ {in_services=0}
    in_services && $0 ~ ("^  " svc ":[[:space:]]*$") {in_svc=1; print; next}
    in_svc && /^  [[:alnum:]_.-]+:[[:space:]]*$/ {in_svc=0}
    in_svc {print}
  ' "${compose_path}"
}

compose_field() {
  local block="$1"
  local prefix="$2"
  printf "%s\n" "${block}" | awk -v key="${prefix}" '
    index($0, key) == 1 {
      line = $0
      sub("^" key "[[:space:]]*", "", line)
      print line
      exit
    }
  '
}

compose_ports() {
  local block="$1"
  printf "%s\n" "${block}" | awk '
    /^    ports:[[:space:]]*$/ {in_ports=1; next}
    in_ports && /^      -[[:space:]]*/ {
      line = $0
      sub(/^      -[[:space:]]*/, "", line)
      if (ports == "") ports = line
      else ports = ports ", " line
      next
    }
    in_ports && !/^      -[[:space:]]*/ {in_ports=0}
    END {if (ports != "") print ports}
  '
}

compose_depends_on() {
  local block="$1"
  printf "%s\n" "${block}" | awk '
    /^    depends_on:[[:space:]]*$/ {in_dep=1; next}
    in_dep && /^      [[:alnum:]_.-]+:[[:space:]]*$/ {
      dep=$1
      sub(":", "", dep)
      if (deps == "") deps = dep
      else deps = deps ", " dep
      next
    }
    in_dep && !/^      [[:alnum:]_.-]+:[[:space:]]*$/ {in_dep=0}
    END {if (deps != "") print deps}
  '
}

{
  echo "# Architecture Snapshot"
  echo
  echo "- Generated at: \`${TIMESTAMP_STR}\`"
  echo "- Repo root: \`${REPO_ROOT}\`"
  echo "- Tree depth: \`${TREE_DEPTH}\` (override with \`ARCH_REPORT_TREE_DEPTH\`)"
  echo

  echo "## Repo Tree (excluding node_modules)"
  echo
  echo '```text'
  print_repo_tree
  echo '```'
  echo

  echo "## Django Settings Highlights"
  echo
  echo "- Source: \`backend/config/settings/base.py\`"
  echo

  if [[ -f "${SETTINGS_FILE}" ]]; then
    SHARED_APPS_LIST="$(extract_app_list "SHARED_APPS" "${SETTINGS_FILE}")"
    TENANT_APPS_LIST="$(extract_app_list "TENANT_APPS" "${SETTINGS_FILE}")"
    SHARED_COUNT="$(printf "%s\n" "${SHARED_APPS_LIST}" | sed '/^[[:space:]]*$/d' | wc -l | tr -d '[:space:]')"
    TENANT_COUNT="$(printf "%s\n" "${TENANT_APPS_LIST}" | sed '/^[[:space:]]*$/d' | wc -l | tr -d '[:space:]')"

    echo "### SHARED_APPS (${SHARED_COUNT})"
    echo
    printf "%s\n" "${SHARED_APPS_LIST}"
    echo
    echo "### TENANT_APPS (${TENANT_COUNT})"
    echo
    printf "%s\n" "${TENANT_APPS_LIST}"
  else
    echo "_Settings file not found._"
  fi
  echo
  echo

  echo "## API Routes"
  echo
  echo "### \`path(...)\` / \`re_path(...)\` entries"
  echo
  echo '```text'
  print_api_routes
  echo '```'
  echo
  echo "### DRF router registrations"
  echo
  echo '```text'
  print_router_routes
  echo '```'
  echo

  echo "## Celery Task Discovery"
  echo
  echo "### Decorated Celery task definitions"
  echo
  echo '```text'
  print_celery_tasks
  echo '```'
  echo
  echo "### Task-like functions in \`*tasks.py\`"
  echo
  echo '```text'
  print_task_functions
  echo '```'
  echo

  echo "## Docker Compose Services Summary"
  echo

  if [[ -f "${COMPOSE_FILE}" ]]; then
    SERVICES="$(compose_service_names "${COMPOSE_FILE}")"
    if [[ -z "${SERVICES}" ]]; then
      echo "_No services found in \`docker-compose.yml\`._"
    else
      while IFS= read -r svc; do
        [[ -z "${svc}" ]] && continue
        block="$(compose_service_block "${COMPOSE_FILE}" "${svc}")"
        image="$(compose_field "${block}" "    image:")"
        command="$(compose_field "${block}" "    command:")"
        build_context="$(compose_field "${block}" "      context:")"
        ports="$(compose_ports "${block}")"
        depends_on="$(compose_depends_on "${block}")"

        echo "- **${svc}**"
        if [[ -n "${image}" ]]; then
          echo "  - image: \`${image}\`"
        fi
        if [[ -n "${build_context}" ]]; then
          echo "  - build_context: \`${build_context}\`"
        fi
        if [[ -n "${command}" ]]; then
          echo "  - command: \`${command}\`"
        fi
        if [[ -n "${ports}" ]]; then
          echo "  - ports: \`${ports}\`"
        fi
        if [[ -n "${depends_on}" ]]; then
          echo "  - depends_on: \`${depends_on}\`"
        fi
      done <<< "${SERVICES}"
    fi
  else
    echo "_docker-compose.yml not found._"
  fi
} > "${REPORT_FILE}"

echo "Architecture report generated: ${REPORT_FILE}"
