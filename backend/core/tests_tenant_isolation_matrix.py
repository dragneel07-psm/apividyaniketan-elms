# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Cross-tenant isolation coverage map — INDEX (all surfaces implemented).

The platform is one PostgreSQL schema per school; cross-tenant data access is
the defining security risk. Every isolation surface below has a dedicated test
module subclassing ``core.tenant_isolation_base.TwoTenantAPITestCase`` (or, for
the real-time path, the Channels in-memory harness). This file is the map; it
holds no tests of its own.

Run the whole suite under Postgres (django-tenants needs it):
    python manage.py test \
      core.tests_tenant_isolation \
      core.tests_tenant_isolation_writes \
      ai_engine.tests_tenant_isolation \
      academic.tests_tenant_isolation \
      billing_school.tests_tenant_isolation \
      conversations.tests_tenant_isolation \
      library.tests_tenant_isolation \
      gamification.tests_tenant_isolation \
      projects.tests_tenant_isolation \
      notifications.tests_tenant_isolation \
      users.tests_tenant_isolation

Surface → module:
  Token/tenant binding + reads ...... core/tests_tenant_isolation.py (pre-existing)
  Cross-tenant writes ............... core/tests_tenant_isolation_writes.py
  AI / pgvector RAG retrieval ....... ai_engine/tests_tenant_isolation.py
  Academic (students/results/
    submissions/attendance) ......... academic/tests_tenant_isolation.py
  Billing finance (FeeStructure) .... billing_school/tests_tenant_isolation.py
  Private conversations ............. conversations/tests_tenant_isolation.py
  Library catalog ................... library/tests_tenant_isolation.py
  Gamification badges ............... gamification/tests_tenant_isolation.py
  Projects (+ feature gate) ......... projects/tests_tenant_isolation.py
  Celery tenant context ............. notifications/tests_tenant_isolation.py
                                        ::CeleryTenantContextIsolationTests
  WebSocket notification groups ..... notifications/tests_tenant_isolation.py
                                        ::WebSocketNotificationIsolationTests
  WebSocket ticket tenant binding ... users/tests_tenant_isolation.py

Note: WebSocket notification groups are keyed by UserAccount.user_id (a UUID),
so groups are globally unique across schemas — verified, not a leak.
"""
