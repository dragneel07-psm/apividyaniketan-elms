# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import csv
import os
import sys
import threading
from io import BytesIO, StringIO

import django

# Setup Django
sys.path.append("/Users/pramodsinghmanyal/Desktop/E-LearningWebApp/backend")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
django.setup()

from academic.models import Student
from academic.services.bulk_import import BulkImportService


def test_import():
    print("Starting Import Test...")

    # 3. Create Dummy Data (CSV format)
    # We use standard CSV writing instead of pandas
    csv_file = StringIO()
    writer = csv.writer(csv_file)
    writer.writerow(["first_name", "last_name", "email", "class", "section"])
    writer.writerow(["TestImport1", "Student1", "import1@test.com", "Grade 10", "A"])
    writer.writerow(["TestImport2", "Student2", "import2@test.com", "Grade 10", "A"])

    csv_bytes = BytesIO(csv_file.getvalue().encode("utf-8"))
    csv_bytes.name = "test_import.csv"

    # 4. Run Import
    service = BulkImportService()
    print("Processing file...")
    result = service.process_file(csv_bytes)

    print("Import Result:", result)

    # 5. Verify creation
    if result["success"]:
        # We need to query using the correct DB alias!
        # TenantDatabaseRouter should handle it if our thread local is set.

        s1 = Student.objects.filter(user__email="import1@test.com").first()
        if s1:
            print(
                f"SUCCESS: Found student {s1.user.email} in class {s1.academic_class.name}"
            )
            # Clean up
            print("Cleaning up created students...")
            Student.objects.filter(
                user__email__in=["import1@test.com", "import2@test.com"]
            ).delete()
            from django.contrib.auth import get_user_model

            User = get_user_model()
            User.objects.filter(
                email__in=["import1@test.com", "import2@test.com"]
            ).delete()
        else:
            print("FAILURE: Student 1 not found in DB")
    else:
        print("Import failed.")


if __name__ == "__main__":
    test_import()
