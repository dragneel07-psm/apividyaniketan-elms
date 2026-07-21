# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import io

from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase, override_settings

from core.upload_validation import (
    IMAGE_EXTENSIONS,
    NOTICE_EXTENSIONS,
    MaxFileSizeValidator,
    SafeFileContentValidator,
    validate_image_upload,
    validate_uploaded_file,
)

PDF_BYTES = b"%PDF-1.4 fake but plausible pdf content"


def upload(name: str, content: bytes) -> SimpleUploadedFile:
    return SimpleUploadedFile(name, content)


class MaxFileSizeValidatorTests(SimpleTestCase):
    @override_settings(UPLOAD_MAX_SIZE_MB=1)
    def test_rejects_oversized_file(self):
        big = upload("big.pdf", b"x" * (1024 * 1024 + 1))
        with self.assertRaises(ValidationError):
            MaxFileSizeValidator()(big)

    @override_settings(UPLOAD_MAX_SIZE_MB=1)
    def test_accepts_file_within_limit(self):
        MaxFileSizeValidator()(upload("ok.pdf", PDF_BYTES))

    def test_explicit_limit_overrides_setting(self):
        with self.assertRaises(ValidationError):
            MaxFileSizeValidator(max_mb=0)(upload("any.pdf", PDF_BYTES))


class SafeFileContentValidatorTests(SimpleTestCase):
    def test_accepts_pdf(self):
        SafeFileContentValidator()(upload("syllabus.pdf", PDF_BYTES))

    def test_rejects_disallowed_extension(self):
        with self.assertRaises(ValidationError):
            SafeFileContentValidator()(upload("payload.exe", b"MZ\x90\x00"))

    def test_rejects_svg_extension(self):
        # SVG can carry scripts; it is excluded from every allowlist.
        with self.assertRaises(ValidationError):
            SafeFileContentValidator()(upload("image.svg", b"<svg></svg>"))

    def test_rejects_html_masquerading_as_txt(self):
        with self.assertRaises(ValidationError):
            SafeFileContentValidator()(
                upload("notes.txt", b"<!DOCTYPE html><script>alert(1)</script>")
            )

    def test_rejects_executable_masquerading_as_pdf(self):
        with self.assertRaises(ValidationError):
            SafeFileContentValidator()(upload("report.pdf", b"MZ\x90\x00binary"))

    def test_rejects_script_masquerading_as_csv(self):
        with self.assertRaises(ValidationError):
            SafeFileContentValidator({"csv"})(
                upload("data.csv", b"#!/bin/sh\nrm -rf /")
            )

    def test_plain_csv_accepted(self):
        SafeFileContentValidator({"csv"})(
            upload("students.csv", b"first_name,last_name\nA,B")
        )

    def test_notice_allowlist_rejects_zip(self):
        with self.assertRaises(ValidationError):
            SafeFileContentValidator(NOTICE_EXTENSIONS)(upload("a.zip", b"PK\x03\x04"))


class ImageUploadTests(SimpleTestCase):
    def _png_bytes(self) -> bytes:
        from PIL import Image

        buffer = io.BytesIO()
        Image.new("RGB", (4, 4), color=(10, 20, 30)).save(buffer, format="PNG")
        return buffer.getvalue()

    def test_valid_png_accepted(self):
        validate_image_upload(upload("logo.png", self._png_bytes()))

    def test_non_image_bytes_rejected(self):
        with self.assertRaises(ValidationError):
            validate_image_upload(upload("logo.png", b"definitely not an image"))

    def test_extension_must_be_image(self):
        with self.assertRaises(ValidationError):
            validate_image_upload(upload("logo.pdf", PDF_BYTES))

    def test_image_extensions_exclude_svg(self):
        self.assertNotIn("svg", IMAGE_EXTENSIONS)


class ValidateUploadedFileTests(SimpleTestCase):
    def test_happy_path_document(self):
        validate_uploaded_file(upload("essay.docx", b"PK\x03\x04 docx zip container"))

    @override_settings(UPLOAD_MAX_SIZE_MB=1)
    def test_combines_size_and_content_checks(self):
        with self.assertRaises(ValidationError):
            validate_uploaded_file(upload("big.pdf", b"x" * (1024 * 1024 + 1)))
