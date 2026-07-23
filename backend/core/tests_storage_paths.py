# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.test import SimpleTestCase

from core.utils.storage_paths import scoped_upload_path


class ScopedUploadPathTests(SimpleTestCase):
    def test_scoped_upload_path_contains_folder_and_filename(self):
        path = scoped_upload_path("notices", "Monthly Circular.pdf")
        self.assertTrue(path.startswith("notices/"))
        self.assertTrue(path.endswith("Monthly_Circular.pdf"))

    def test_scoped_upload_path_strips_slashes_from_folder(self):
        path = scoped_upload_path("/lesson_materials/", "chapter1.pdf")
        self.assertTrue(path.startswith("lesson_materials/"))
