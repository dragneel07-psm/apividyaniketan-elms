# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import os
import uuid

from django.db import connection
from django.utils.text import get_valid_filename


def _normalize_schema_name(schema_name: str | None) -> str:
    value = (schema_name or "").strip().lower()
    return value or "public"


def tenant_scoped_upload_path(
    schema_name: str | None, folder: str, filename: str
) -> str:
    safe_filename = get_valid_filename(os.path.basename(filename or "file"))
    file_id = uuid.uuid4().hex
    schema = _normalize_schema_name(schema_name)
    folder_name = folder.strip("/ ")
    return f"tenant/{schema}/{folder_name}/{file_id}-{safe_filename}"


def schema_from_current_connection() -> str:
    return _normalize_schema_name(getattr(connection, "schema_name", None))
