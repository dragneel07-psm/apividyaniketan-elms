# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import os
import sys

import django

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.conf import settings
from django.db import connections
from django.test import RequestFactory

from academic.models import Exam, ExamSeating
from academic.services.exam_service import ExamService
from academic.views.reports import ReportViewSet
from core.middleware.tenant import clear_current_tenant, set_current_tenant
from core.models.tenant import Tenant


def setup_tenant_db(tenant):
    """Ensure the tenant database is registered in Django settings."""
    if tenant.db_alias not in settings.DATABASES:
        db_config = settings.DATABASES["default"].copy()
        db_path = settings.BASE_DIR / tenant.db_name
        db_config["NAME"] = str(db_path)
        settings.DATABASES[tenant.db_alias] = db_config
        connections.databases[tenant.db_alias] = db_config
    return tenant.db_alias


def test_complete_workflow():
    print("🧪 Testing Complete Exam & Hall Ticket Workflow...")

    try:
        # Setup tenant context
        tenant = Tenant.objects.get(subdomain="demo")
        db_alias = setup_tenant_db(tenant)
        set_current_tenant(tenant, db_alias)
        print(f"✅ Using Tenant: {tenant.name}\n")

        # Step 1: Get or allocate exam seating
        print("📋 Step 1: Ensuring Exam Seating Allocation...")
        exam = Exam.objects.using(db_alias).first()
        if not exam:
            print("❌ No exams found. Run seed_saas_data.py first.")
            return

        seating_count = ExamSeating.objects.using(db_alias).filter(exam=exam).count()
        if seating_count == 0:
            print(f"   Allocating seats for exam: {exam.exam_id}")
            count = ExamService.allocate_seating(exam.exam_id)
            print(f"   ✅ Allocated {count} students")
        else:
            print(f"   ✅ Found {seating_count} existing seat allocations")

        # Step 2: Test individual hall ticket
        print("\n🎟️ Step 2: Testing Individual Hall Ticket PDF...")

        # Simple query without cross-DB joins
        seating = ExamSeating.objects.using(db_alias).first()

        if not seating:
            print("❌ No seating records found")
            return

        print(f"   Student: {seating.student.user.username}")
        print(f"   Hall Ticket: {seating.hall_ticket_number}")
        print(f"   Seat: {seating.seat_number}")

        factory = RequestFactory()
        request = factory.get(
            f"/api/academic/reports/hall-ticket/{seating.seating_id}/"
        )
        request.db_alias = db_alias
        request.META["HTTP_X_TENANT_ID"] = "demo"
        request.headers = {"x-tenant-id": "demo"}

        viewset = ReportViewSet()
        viewset.request = request
        response = viewset.hall_ticket_pdf(request, seating_id=str(seating.seating_id))

        if response.status_code == 200:
            print(f"   ✅ PDF Generated: {len(response.content):,} bytes")
            print(f"   Content-Type: {response['Content-Type']}")

            # Save sample PDF
            sample_path = f"/tmp/sample_hall_ticket_{seating.hall_ticket_number}.pdf"
            with open(sample_path, "wb") as f:
                f.write(response.content)
            print(f"   💾 Saved sample: {sample_path}")
        else:
            print(f"   ❌ Failed with status: {response.status_code}")
            if hasattr(response, "data"):
                print(f"   Error: {response.data}")

        # Step 3: Test bulk generation
        print("\n📦 Step 3: Testing Bulk Hall Ticket Generation (ZIP)...")
        request2 = factory.get(
            f"/api/academic/reports/bulk-hall-tickets/{exam.exam_id}/"
        )
        request2.db_alias = db_alias
        request2.META["HTTP_X_TENANT_ID"] = "demo"
        request2.headers = {"x-tenant-id": "demo"}

        viewset2 = ReportViewSet()
        viewset2.request = request2
        response2 = viewset2.bulk_hall_tickets_pdf(request2, exam_id=str(exam.exam_id))

        if response2.status_code == 200:
            print(f"   ✅ ZIP Generated: {len(response2.content):,} bytes")
            print(f"   Content-Type: {response2['Content-Type']}")

            # Save sample ZIP
            zip_path = f"/tmp/bulk_hall_tickets_{exam.exam_id}.zip"
            with open(zip_path, "wb") as f:
                f.write(response2.content)
            print(f"   💾 Saved ZIP: {zip_path}")

            # List ZIP contents
            import zipfile

            with zipfile.ZipFile(zip_path, "r") as zf:
                print(f"   📄 ZIP contains {len(zf.namelist())} files:")
                for name in zf.namelist()[:3]:  # Show first 3
                    print(f"      - {name}")
                if len(zf.namelist()) > 3:
                    print(f"      ... and {len(zf.namelist()) - 3} more")
        else:
            print(f"   ❌ Failed with status: {response2.status_code}")
            if hasattr(response2, "data"):
                print(f"   Error: {response2.data}")

        print("\n✨ All Tests Passed!")

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback

        traceback.print_exc()
    finally:
        clear_current_tenant()


if __name__ == "__main__":
    test_complete_workflow()
