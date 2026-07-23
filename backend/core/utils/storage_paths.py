# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import os
import uuid

from django.utils.text import get_valid_filename


def scoped_upload_path(folder: str, filename: str) -> str:
    safe_filename = get_valid_filename(os.path.basename(filename or "file"))
    file_id = uuid.uuid4().hex
    folder_name = folder.strip("/ ")
    return f"{folder_name}/{file_id}-{safe_filename}"
