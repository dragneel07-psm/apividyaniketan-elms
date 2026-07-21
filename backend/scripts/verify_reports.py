# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import os
import sys

import requests

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))


def verify_reports():
    base_url = "http://localhost:8000/api/academic/reports"
    tenant_id = "demo"  # Use 'demo' tenant for school_demo.sqlite3

    headers = {
        "x-tenant-id": tenant_id,
    }

    token = os.environ.get("AUTH_TOKEN")
    if token and token != "None":
        headers["Authorization"] = f"Bearer {token}"

    # If no token is provided, this script might fail if auth is enforced
    # For dev, we might have allowed AllowAny in settings.py (which we did in base.py for demo)

    print("🚀 Verifying Attendance Reports...")

    # 1. Test Attendance Summary PDF
    # We need a valid section_id. In demo school, let's assume section 1 exists.
    section_id = 1
    pdf_url = f"{base_url}/attendance-summary/{section_id}/"
    print(f"📥 Fetching PDF: {pdf_url}")

    response = requests.get(pdf_url, headers=headers)
    if response.status_code == 200:
        print("✅ Attendance PDF generated successfully")
        print(f"   Content-Type: {response.headers.get('Content-Type')}")
        print(f"   Content-Length: {len(response.content)} bytes")

        # Save for inspection
        with open("attendance_test.pdf", "wb") as f:
            f.write(response.content)
        print("   Saved to attendance_test.pdf")
    else:
        print(f"❌ PDF generation failed: {response.status_code}")
        print(response.text)

    # 2. Test Attendance Summary Excel
    excel_url = f"{base_url}/attendance-summary-excel/{section_id}/"
    print(f"📥 Fetching Excel: {excel_url}")

    response = requests.get(excel_url, headers=headers)
    if response.status_code == 200:
        print("✅ Attendance Excel generated successfully")
        print(f"   Content-Type: {response.headers.get('Content-Type')}")

        # Save for inspection
        with open("attendance_test.xlsx", "wb") as f:
            f.write(response.content)
        print("   Saved to attendance_test.xlsx")
    else:
        print(f"❌ Excel generation failed: {response.status_code}")

    # 3. Test Student Performance PDF
    # Assuming student_id exists
    # If not, this might return 404
    print("\n🔍 Verifying Student Performance Report...")
    # Replace with a real student UUID if possible, or skip if unknown
    # student_id = "some-uuid"
    # performance_url = f"{base_url}/student-performance/{student_id}/"
    # ...


if __name__ == "__main__":
    if len(sys.argv) > 1:
        os.environ["AUTH_TOKEN"] = sys.argv[1]
    verify_reports()
