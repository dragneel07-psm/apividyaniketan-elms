# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import os
import sys

import django
from django.conf import settings
from django.test import RequestFactory
from django.utils import timezone

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.base")
django.setup()

from academic.views.reports import ReportViewSet
from core.models.tenant import Tenant


def debug_report():
    print("🛠️ Starting Manual Report Debug...")

    # 1. Setup Request
    factory = RequestFactory()
    request = factory.get("/api/academic/reports/attendance-summary/1/")

    # 2. Simulate Middleware
    try:
        tenant = Tenant.objects.get(subdomain="demo")
        request.tenant = tenant
        request.db_alias = tenant.db_alias

        # Registration logic from middleware
        from django.db import connections

        if tenant.db_alias not in settings.DATABASES:
            new_db_config = settings.DATABASES["default"].copy()
            new_db_config["NAME"] = settings.BASE_DIR / tenant.db_name
            settings.DATABASES[tenant.db_alias] = new_db_config
            connections.databases[tenant.db_alias] = new_db_config

        print(f"✅ Tenant: {tenant.subdomain}, DB: {tenant.db_alias}")
    except Exception as e:
        print(f"❌ Failed to find tenant 'demo': {e}")
        return

    # 3. Call ViewSet
    from rest_framework.request import Request

    drf_request = Request(request)

    viewset = ReportViewSet()
    try:
        print("\n📄 Testing PDF Report...")
        response = viewset.attendance_summary_pdf(drf_request, section_id=1)
        print(f"📋 PDF Status: {response.status_code}")

        print("\n📊 Testing Excel Report...")
        response = viewset.attendance_summary_excel(drf_request, section_id=1)
        print(f"📋 Excel Status: {response.status_code}")

        if response.status_code != 200:
            print(f"❌ Error Detail: {response.data}")
    except Exception as e:
        import traceback

        print("💥 CRASH DETECTED:")
        traceback.print_exc()


if __name__ == "__main__":
    debug_report()
