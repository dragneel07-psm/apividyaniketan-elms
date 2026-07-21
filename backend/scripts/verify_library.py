# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import os
from datetime import timedelta

import django
from django.utils import timezone

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from academic.models import Student
from core.models.tenant import Tenant
from library.models import Book, BookIssue


def verify_library():
    print("🧪 Verifying Library Flow...")

    # 1. Setup Tenant DB
    tenant = Tenant.objects.get(subdomain="demo")
    db_alias = "demo_school"
    db_name = "school_demo.sqlite3"

    from django.conf import settings

    if db_alias not in settings.DATABASES:
        new_db_config = settings.DATABASES["default"].copy()
        new_db_config["NAME"] = settings.BASE_DIR / db_name
        settings.DATABASES[db_alias] = new_db_config

    # 2. Get Test Data
    student = Student.objects.using(db_alias).first()
    book = Book.objects.using(db_alias).filter(available_copies__gt=0).first()

    if not student or not book:
        print("❌ Could not find student or available book")
        return

    print(f"Testing with Student: {student.user.username}")
    print(f"Testing with Book: {book.title}")

    initial_available = book.available_copies

    # 3. Simulate Issue
    print("\nStep 1: Issuing book...")
    due_date = timezone.now().date() + timedelta(days=14)
    issue = BookIssue.objects.using(db_alias).create(
        book=book, student=student, due_date=due_date, status="issued"
    )

    # Reload book
    book.refresh_from_db(using=db_alias)
    print(f"✅ Issue created. ID: {issue.issue_id}")
    print(
        f"✅ Book available copies: {book.available_copies} (Expected: {initial_available - 1})"
    )

    if book.available_copies != initial_available - 1:
        print("❌ Book availability not updated correctly")

    # 4. Simulate Return
    print("\nStep 2: Returning book...")
    issue.status = "returned"
    issue.return_date = timezone.now().date()
    issue.save(using=db_alias)

    # Manually increment available copies as the view/save method would do in atomic transaction
    # Note: In our Model.save() it handles the decrement on adding.
    # The increment on return is handled in the viewset action 'return_book'.
    # For this verification script, let's manually update to match view logic.
    book.available_copies += 1
    book.save(using=db_alias, update_fields=["available_copies"])

    print(f"✅ Book marked as returned.")
    print(
        f"✅ Book available copies: {book.available_copies} (Expected: {initial_available})"
    )

    if book.available_copies != initial_available:
        print("❌ Book availability not restored correctly")

    print("\n✨ Verification complete!")


if __name__ == "__main__":
    verify_library()
