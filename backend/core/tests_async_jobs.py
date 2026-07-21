# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import SimpleTestCase, override_settings
from django_tenants.test.cases import FastTenantTestCase
from django_tenants.utils import tenant_context
from rest_framework.test import APIClient

from core.async_jobs import background_task, enqueue, enqueue_job, get_job_status
from core.models import Job


@background_task(name="test.add")
def add_numbers(a: int, b: int) -> int:
    return a + b


class AsyncJobsFallbackTests(SimpleTestCase):
    @override_settings(ASYNC_TASK_BACKEND="sync")
    def test_enqueue_executes_task_synchronously_in_sync_mode(self):
        result = enqueue(add_numbers, 2, 3)
        self.assertEqual(result, 5)

    @override_settings(ASYNC_TASK_BACKEND="celery")
    def test_enqueue_falls_back_to_sync_when_celery_unavailable(self):
        # In current local test environment celery may be unavailable; fallback must still work.
        result = enqueue(add_numbers, 10, 5)
        self.assertEqual(result, 15)

    @override_settings(
        ASYNC_TASK_BACKEND="celery",
        CELERY_TASK_ALWAYS_EAGER=True,
        CELERY_TASK_EAGER_PROPAGATES=True,
        CELERY_TASK_STORE_EAGER_RESULT=True,
    )
    def test_enqueue_job_runs_in_eager_mode_and_tracks_status(self):
        job = enqueue_job(
            add_numbers, 4, 6, job_name="test.add", job_tenant_schema="demo"
        )
        self.assertTrue(job.get("job_id"))
        payload = get_job_status(job["job_id"])
        self.assertIsNotNone(payload)
        self.assertEqual(payload.get("status"), "success")
        self.assertEqual(payload.get("result"), 10)


User = get_user_model()


class JobStatusApiTests(FastTenantTestCase):
    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Async Job School"

    @classmethod
    def setup_domain(cls, domain):
        domain.is_primary = True

    def setUp(self):
        with tenant_context(self.tenant):
            self.user = User.objects.create_user(
                username="job_admin",
                email="job_admin@example.com",
                password="Job@12345",
                role="admin",
                tenant=self.tenant,
            )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    @override_settings(ASYNC_TASK_BACKEND="sync")
    def test_job_status_endpoint_returns_queued_job(self):
        job = enqueue_job(
            add_numbers,
            7,
            8,
            job_name="test.add",
            job_tenant_schema=self.tenant.schema_name,
        )
        response = self.client.get(
            f"/api/core/jobs/{job['job_id']}/",
            HTTP_HOST=self.get_test_tenant_domain(),
            HTTP_X_TENANT_ID=self.tenant.schema_name,
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data.get("status"), "success")
        self.assertEqual(response.data.get("result"), 15)

        persisted = Job.objects.filter(job_id=job["job_id"]).first()
        self.assertIsNotNone(persisted)
        self.assertEqual(persisted.tenant_schema, self.tenant.schema_name)
        self.assertEqual(persisted.status, "success")
        self.assertEqual(persisted.result, 15)

        cache.delete(f"async_job:v1:{job['job_id']}")
        cached_miss_response = self.client.get(
            f"/api/core/jobs/{job['job_id']}/",
            HTTP_HOST=self.get_test_tenant_domain(),
            HTTP_X_TENANT_ID=self.tenant.schema_name,
        )
        self.assertEqual(cached_miss_response.status_code, 200)
        self.assertEqual(cached_miss_response.data.get("status"), "success")
