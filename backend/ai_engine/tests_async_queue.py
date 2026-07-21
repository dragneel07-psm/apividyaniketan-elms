# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import override_settings
from django_tenants.test.cases import FastTenantTestCase
from django_tenants.utils import tenant_context
from rest_framework.test import APIClient

User = get_user_model()


class AsyncAiQueueApiTests(FastTenantTestCase):
    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "AI Queue School"

    @classmethod
    def setup_domain(cls, domain):
        domain.is_primary = True

    def setUp(self):
        with tenant_context(self.tenant):
            self.user = User.objects.create_user(
                username="ai_queue_user",
                email="ai_queue_user@example.com",
                password="AIQueue@123",
                role="student",
                tenant=self.tenant,
            )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    @override_settings(ASYNC_TASK_BACKEND="sync")
    @patch(
        "ai_engine.tasks.AITutorService.generate_response",
        return_value='{"summary":"Newton overview","bullet_points":["Law 1","Law 2","Law 3"]}',
    )
    def test_summary_job_enqueue_and_status(self, _mock_generate_response):
        response = self.client.post(
            "/api/ai/jobs/summaries/",
            {
                "content": "Newton's three laws of motion with simple examples.",
                "max_points": 4,
            },
            format="json",
            HTTP_HOST=self.get_test_tenant_domain(),
            HTTP_X_TENANT_ID=self.tenant.schema_name,
        )
        self.assertEqual(response.status_code, 202)
        job_id = response.data.get("job_id")
        self.assertTrue(job_id)

        status_response = self.client.get(
            f"/api/core/jobs/{job_id}/",
            HTTP_HOST=self.get_test_tenant_domain(),
            HTTP_X_TENANT_ID=self.tenant.schema_name,
        )
        self.assertEqual(status_response.status_code, 200)
        self.assertEqual(status_response.data.get("status"), "success")
