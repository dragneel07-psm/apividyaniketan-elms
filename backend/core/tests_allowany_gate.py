# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
CI gate: every ``AllowAny`` endpoint must be a known, triaged exception.

Unauthenticated endpoints are the highest-leverage attack surface on a
platform serving minors, so new ones must not slip in unreviewed. This test
scans backend application code for ``AllowAny`` permission usages and asserts
the per-file count matches the approved manifest below. Adding ``AllowAny`` to
a new view fails this gate until the endpoint is triaged in
``ALLOWANY_TRIAGE.md`` and added here.

DB-free (SimpleTestCase) — pure source scan.
"""

from __future__ import annotations

from pathlib import Path

from django.test import SimpleTestCase

BACKEND_ROOT = Path(__file__).resolve().parent.parent

# file (relative to backend/) -> count of AllowAny permission usages.
# Each is justified in ALLOWANY_TRIAGE.md (all 16 reviewed 2026-06-14).
APPROVED_ALLOWANY: dict[str, int] = {
    "core/views.py": 4,  # Healthz, Readyz, Metrics (token-gated), TenantCheck (throttled)
    "config/urls.py": 1,  # OpenAPI schema — AllowAny only under DEBUG, else IsAdminUser
    "users/views.py": 6,  # register, password-reset(+confirm), email-verify, 2FA setup/activate
    "billing_saas/views.py": 2,  # public pricing-plan list
    "billing_school/views_payment_gateway.py": 2,  # Esewa + Khalti gateway callbacks (verified)
    "billing_school/views_nas.py": 1,  # ConnectIPS gateway callback (verified + amount-checked)
}

_EXCLUDE_DIRS = {
    ".venv",
    ".venv_py311_backup",
    "__pycache__",
    "migrations",
    "node_modules",
    ".git",
    "static",
    "media",
    "scripts",
}


def _is_permission_usage(line: str) -> bool:
    """True for a real AllowAny permission usage (not an import or comment)."""
    stripped = line.strip()
    if not stripped or stripped.startswith("#"):
        return False
    if "AllowAny" not in line:
        return False
    if stripped.startswith(("from ", "import ")):
        return False
    return True


def _scan_allowany() -> dict[str, int]:
    counts: dict[str, int] = {}
    for path in BACKEND_ROOT.rglob("*.py"):
        rel = path.relative_to(BACKEND_ROOT)
        if any(part in _EXCLUDE_DIRS for part in rel.parts):
            continue
        if rel.name.startswith("tests"):
            continue
        total = sum(
            line.count("AllowAny")
            for line in path.read_text(encoding="utf-8", errors="ignore").splitlines()
            if _is_permission_usage(line)
        )
        if total:
            counts[str(rel)] = total
    return counts


class AllowAnyGateTests(SimpleTestCase):
    def test_no_unreviewed_allowany_endpoints(self):
        found = _scan_allowany()

        new_or_changed = {
            f: n for f, n in found.items() if APPROVED_ALLOWANY.get(f) != n
        }
        removed = {f for f in APPROVED_ALLOWANY if f not in found}

        msg_parts = []
        if new_or_changed:
            msg_parts.append(
                "Unreviewed/changed AllowAny usage (triage in ALLOWANY_TRIAGE.md, "
                f"then update APPROVED_ALLOWANY): {new_or_changed}"
            )
        if removed:
            msg_parts.append(
                "AllowAny removed from these files — update APPROVED_ALLOWANY "
                f"to match (good news, just keep the manifest tight): {sorted(removed)}"
            )
        self.assertEqual(found, APPROVED_ALLOWANY, " ".join(msg_parts))
