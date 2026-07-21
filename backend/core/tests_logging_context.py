# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import logging

from django.test import SimpleTestCase

from core.logging_context import (
    RequestContextLogFilter,
    reset_request_context,
    set_request_context,
)


class RequestContextLogFilterTests(SimpleTestCase):
    def tearDown(self):
        reset_request_context()
        super().tearDown()

    def test_filter_adds_request_and_tenant_fields(self):
        set_request_context(
            request_id="trace-123",
            tenant_schema="demo_school",
            tenant_id="tenant-1",
        )
        record = logging.LogRecord(
            name="test.logger",
            level=logging.INFO,
            pathname=__file__,
            lineno=1,
            msg="hello",
            args=(),
            exc_info=None,
        )

        allowed = RequestContextLogFilter().filter(record)

        self.assertTrue(allowed)
        self.assertEqual(record.request_id, "trace-123")
        self.assertEqual(record.tenant_schema, "demo_school")
        self.assertEqual(record.tenant_id, "tenant-1")

    def test_filter_uses_safe_defaults_after_reset(self):
        set_request_context(
            request_id="trace-1", tenant_schema="demo", tenant_id="id-1"
        )
        reset_request_context()
        record = logging.LogRecord(
            name="test.logger",
            level=logging.INFO,
            pathname=__file__,
            lineno=1,
            msg="hello",
            args=(),
            exc_info=None,
        )

        RequestContextLogFilter().filter(record)

        self.assertEqual(record.request_id, "-")
        self.assertEqual(record.tenant_schema, "-")
        self.assertEqual(record.tenant_id, "-")
