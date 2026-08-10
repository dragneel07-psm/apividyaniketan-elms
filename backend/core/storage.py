# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Django Storage backend that pushes FileField/ImageField uploads to ImageKit's
media library and serves them from ImageKit's CDN, instead of the local
filesystem. Wired in as STORAGES["default"] (see config/settings/base.py)
when IMAGEKIT_ENABLED is true, so every existing FileField/ImageField (school
logo, notices, lesson materials, site content images, project attachments)
gets ImageKit-backed storage automatically — no model or serializer changes.

Names are already unique (core.utils.storage_paths.scoped_upload_path prefixes
every filename with a uuid4), so this backend never needs to dedupe: exists()
always reports False and uploads always overwrite rather than collide.
"""

from __future__ import annotations

import logging
import os

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import Storage
from django.utils.deconstruct import deconstructible

logger = logging.getLogger(__name__)


def _client():
    from imagekitio import ImageKit

    return ImageKit(private_key=settings.IMAGEKIT_PRIVATE_KEY)


@deconstructible
class ImageKitStorage(Storage):
    def _remote_path(self, name: str) -> str:
        """Absolute ImageKit path for a Django-relative storage name."""
        name = (name or "").lstrip("/")
        root = getattr(settings, "IMAGEKIT_ROOT_FOLDER", "").strip("/ ")
        return f"/{root}/{name}" if root else f"/{name}"

    def _open(self, name, mode="rb"):
        import httpx

        response = httpx.get(self.url(name), timeout=30)
        response.raise_for_status()
        return ContentFile(response.content, name=name)

    def _save(self, name, content):
        remote_path = self._remote_path(name)
        folder, file_name = os.path.split(remote_path)
        content.seek(0)
        _client().files.upload(
            file=content.read(),
            file_name=file_name,
            folder=folder or "/",
            use_unique_file_name=False,
            overwrite_file=True,
        )
        return name

    def exists(self, name) -> bool:
        # Names are uuid-prefixed and unique by construction (see module
        # docstring), so there is never a real collision to check for — and
        # skipping the lookup avoids an ImageKit API round trip on every save.
        return False

    def url(self, name) -> str:
        endpoint = settings.IMAGEKIT_URL_ENDPOINT
        return f"{endpoint}{self._remote_path(name)}"

    def _lookup(self, name):
        """Resolve a stored name to its ImageKit file record, or None."""
        remote_path = self._remote_path(name)
        folder, file_name = os.path.split(remote_path)
        try:
            results = _client().assets.list(
                path=folder or "/",
                search_query=f'name="{file_name}"',
                limit=1,
            )
        except Exception:
            logger.warning("ImageKit lookup failed for %s", name, exc_info=True)
            return None
        for item in results:
            if getattr(item, "name", None) == file_name:
                return item
        return None

    def size(self, name) -> int:
        info = self._lookup(name)
        return int(info.size) if info and info.size else 0

    def delete(self, name) -> None:
        info = self._lookup(name)
        if not info or not getattr(info, "file_id", None):
            return
        try:
            _client().files.delete(info.file_id)
        except Exception:
            # Mirrors FileSystemStorage.delete(), which is also best-effort.
            logger.warning("ImageKit delete failed for %s", name, exc_info=True)
