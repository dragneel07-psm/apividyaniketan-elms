#!/usr/bin/env python3
"""
Stamps copyright headers onto all project source files.
Run from the repository root: python scripts/stamp_copyright.py
"""
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

PY_HEADER = """\
# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""

TS_HEADER = """\
// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
"""

# Directories to completely skip
SKIP_DIRS = {
    "node_modules", ".venv", ".venv_py311_backup", "venv", "__pycache__",
    "migrations", "staticfiles", "wheels", ".git", "dist", ".next",
    "playwright-report", "test-results", ".expo",
}

# File extensions and their headers
EXT_MAP = {
    ".py": PY_HEADER,
    ".ts": TS_HEADER,
    ".tsx": TS_HEADER,
}

# Top-level dirs to process
SOURCE_DIRS = [
    ROOT / "backend",
    ROOT / "frontend",
    ROOT / "mobile",
]


def should_skip_dir(path: Path) -> bool:
    return any(part in SKIP_DIRS for part in path.parts)


def stamp_file(path: Path, header: str) -> bool:
    """Returns True if the file was modified."""
    try:
        content = path.read_text(encoding="utf-8")
    except (UnicodeDecodeError, PermissionError):
        return False

    # Already stamped
    if "Pramod Singh Manyal" in content[:300]:
        return False

    # Preserve shebang or encoding declaration on first line
    lines = content.splitlines(keepends=True)
    insert_at = 0
    if lines and (lines[0].startswith("#!") or lines[0].startswith("# -*-")):
        insert_at = 1

    new_content = (
        "".join(lines[:insert_at])
        + header
        + ("" if insert_at == 0 else "\n")
        + "".join(lines[insert_at:])
    )
    path.write_text(new_content, encoding="utf-8")
    return True


def main():
    stamped = 0
    skipped = 0

    for source_dir in SOURCE_DIRS:
        if not source_dir.exists():
            continue
        for path in source_dir.rglob("*"):
            if not path.is_file():
                continue
            if should_skip_dir(path):
                continue
            header = EXT_MAP.get(path.suffix)
            if not header:
                continue
            if stamp_file(path, header):
                print(f"  stamped  {path.relative_to(ROOT)}")
                stamped += 1
            else:
                skipped += 1

    print(f"\nDone — {stamped} files stamped, {skipped} already had header or skipped.")


if __name__ == "__main__":
    main()
