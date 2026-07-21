# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Shared upload validation for user-supplied files.

Storage paths are already randomized and tenant-scoped
(core.utils.storage_paths), so these validators close the remaining gaps:
unbounded sizes and dangerous content types (HTML/SVG served same-origin can
run scripts; executables should never be distributable through a school LMS).

Model-field validators only run through ModelForm/ModelSerializer validation,
NOT on Model.save() — views that assign request.FILES directly must call
validate_uploaded_file() / validate_image_upload() themselves.
"""

from __future__ import annotations

import os

from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils.deconstruct import deconstructible

DEFAULT_MAX_UPLOAD_MB = 25

# Broad set for teaching materials and project work.
DOCUMENT_EXTENSIONS = frozenset(
    {
        "pdf",
        "doc",
        "docx",
        "xls",
        "xlsx",
        "ppt",
        "pptx",
        "odt",
        "ods",
        "odp",
        "csv",
        "txt",
        "md",
        "zip",
        "png",
        "jpg",
        "jpeg",
        "gif",
        "webp",
        "mp3",
        "m4a",
        "wav",
        "mp4",
        "webm",
    }
)
IMAGE_EXTENSIONS = frozenset({"png", "jpg", "jpeg", "gif", "webp"})
NOTICE_EXTENSIONS = frozenset({"pdf"}) | IMAGE_EXTENSIONS
SPREADSHEET_EXTENSIONS = frozenset({"csv", "xlsx", "xls"})

# Binary signatures that must never be accepted regardless of extension.
_FORBIDDEN_PREFIXES = (
    b"MZ",  # Windows PE executables
    b"\x7fELF",  # Linux executables
    b"#!",  # shell/interpreter scripts
    b"\xca\xfe\xba\xbe",  # Mach-O universal / Java class
)
_HTML_MARKERS = (b"<!doctype", b"<html", b"<script", b"<svg")


def max_upload_bytes() -> int:
    max_mb = int(getattr(settings, "UPLOAD_MAX_SIZE_MB", DEFAULT_MAX_UPLOAD_MB))
    return max_mb * 1024 * 1024


def _extension(name: str) -> str:
    return os.path.splitext(name or "")[1].lstrip(".").lower()


def _looks_dangerous(head: bytes) -> bool:
    stripped = head.lstrip(b"\xef\xbb\xbf \t\r\n")
    if stripped.startswith(_FORBIDDEN_PREFIXES):
        return True
    lowered = stripped[:1024].lower()
    return any(marker in lowered for marker in _HTML_MARKERS)


@deconstructible
class MaxFileSizeValidator:
    """Rejects files larger than UPLOAD_MAX_SIZE_MB (or an explicit cap)."""

    def __init__(self, max_mb: int | None = None):
        self.max_mb = max_mb

    def _limit_bytes(self) -> int:
        if self.max_mb is not None:
            return self.max_mb * 1024 * 1024
        return max_upload_bytes()

    def __call__(self, value):
        size = getattr(value, "size", None)
        limit = self._limit_bytes()
        if size is not None and size > limit:
            raise ValidationError(
                f"File is too large ({size // (1024 * 1024)} MB). "
                f"Maximum allowed size is {limit // (1024 * 1024)} MB."
            )

    def __eq__(self, other):
        return isinstance(other, MaxFileSizeValidator) and self.max_mb == other.max_mb


@deconstructible
class SafeFileContentValidator:
    """
    Allowlists file extensions and sniffs leading bytes to reject content
    that would be dangerous if a browser ever renders it same-origin
    (HTML/SVG) or that has no business on the platform (executables).
    """

    def __init__(
        self, allowed_extensions: frozenset[str] | set[str] = DOCUMENT_EXTENSIONS
    ):
        self.allowed_extensions = frozenset(ext.lower() for ext in allowed_extensions)

    def __call__(self, value):
        ext = _extension(getattr(value, "name", ""))
        if ext not in self.allowed_extensions:
            allowed = ", ".join(sorted(self.allowed_extensions))
            raise ValidationError(
                f"File type '.{ext or '?'}' is not allowed. Allowed types: {allowed}."
            )

        file_obj = getattr(value, "file", value)
        try:
            position = file_obj.tell()
            head = file_obj.read(2048) or b""
            file_obj.seek(position)
        except (OSError, AttributeError, ValueError):
            # Unreadable stream — let storage/serializer layers surface it.
            return
        if isinstance(head, str):
            head = head.encode("utf-8", errors="ignore")

        if _looks_dangerous(head):
            raise ValidationError("File content is not allowed.")

    def __eq__(self, other):
        return (
            isinstance(other, SafeFileContentValidator)
            and self.allowed_extensions == other.allowed_extensions
        )


# Ready-made validator lists for model fields.
def document_upload_validators() -> list:
    return [MaxFileSizeValidator(), SafeFileContentValidator(DOCUMENT_EXTENSIONS)]


def notice_upload_validators() -> list:
    return [MaxFileSizeValidator(), SafeFileContentValidator(NOTICE_EXTENSIONS)]


def image_upload_validators() -> list:
    return [MaxFileSizeValidator(), SafeFileContentValidator(IMAGE_EXTENSIONS)]


def validate_uploaded_file(
    file_obj, allowed_extensions=DOCUMENT_EXTENSIONS, max_mb: int | None = None
):
    """Imperative entry point for views that handle request.FILES directly."""
    MaxFileSizeValidator(max_mb)(file_obj)
    SafeFileContentValidator(allowed_extensions)(file_obj)


def validate_image_upload(file_obj, max_mb: int | None = None):
    """
    For raw image assignments (e.g. tenant logo set outside a serializer):
    size + extension + content sniff, then Pillow verification.
    """
    validate_uploaded_file(file_obj, IMAGE_EXTENSIONS, max_mb)
    try:
        from PIL import Image

        position = file_obj.tell() if hasattr(file_obj, "tell") else None
        image = Image.open(file_obj)
        image.verify()
        if position is not None:
            file_obj.seek(position)
    except ValidationError:
        raise
    except Exception as exc:
        raise ValidationError("Upload a valid image file.") from exc
