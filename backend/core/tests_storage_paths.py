# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.test import SimpleTestCase

from core.utils.storage_paths import tenant_scoped_upload_path


class TenantStoragePathTests(SimpleTestCase):
    def test_tenant_scoped_upload_path_contains_schema_and_folder(self):
        path = tenant_scoped_upload_path(
            "demo_school", "notices", "Monthly Circular.pdf"
        )
        self.assertTrue(path.startswith("tenant/demo_school/notices/"))
        self.assertTrue(path.endswith("Monthly_Circular.pdf"))

    def test_tenant_scoped_upload_path_falls_back_to_public_schema(self):
        path = tenant_scoped_upload_path(None, "lesson_materials", "chapter1.pdf")
        self.assertTrue(path.startswith("tenant/public/lesson_materials/"))
