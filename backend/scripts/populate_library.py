# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import os
import uuid
from datetime import timedelta

import django
from django.utils import timezone

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from core.models.tenant import Tenant
from library.models import Book


def populate_library():
    print("📚 Populating Library Data...")

    # 1. Get Tenant and manual DB config
    tenant = Tenant.objects.get(subdomain="demo")
    db_alias = "demo_school"
    db_name = "school_demo.sqlite3"

    from django.conf import settings

    # Register the database connection if it doesn't exist in settings
    if db_alias not in settings.DATABASES:
        new_db_config = settings.DATABASES["default"].copy()
        new_db_config["NAME"] = settings.BASE_DIR / db_name
        settings.DATABASES[db_alias] = new_db_config

    print(f"Using DB: {db_alias} ({db_name}) for tenant: {tenant.name}")

    books_to_create = [
        {
            "title": "Introduction to Algorithms",
            "author": "Thomas H. Cormen",
            "isbn": "9780262033848",
            "category": "technology",
            "publisher": "MIT Press",
            "published_year": 2009,
            "total_copies": 5,
            "available_copies": 5,
            "description": "The standard reference for algorithms and data structures.",
        },
        {
            "title": "Clean Code",
            "author": "Robert C. Martin",
            "isbn": "9780132350884",
            "category": "technology",
            "publisher": "Prentice Hall",
            "published_year": 2008,
            "total_copies": 3,
            "available_copies": 3,
            "description": "A handbook of agile software craftsmanship.",
        },
        {
            "title": "The Selfish Gene",
            "author": "Richard Dawkins",
            "isbn": "9780198788607",
            "category": "science",
            "publisher": "Oxford University Press",
            "published_year": 1976,
            "total_copies": 4,
            "available_copies": 4,
            "description": "A classic of modern evolutionary biology.",
        },
        {
            "title": "Calculus: Early Transcendentals",
            "author": "James Stewart",
            "isbn": "9781285741550",
            "category": "mathematics",
            "publisher": "Cengage Learning",
            "published_year": 2015,
            "total_copies": 10,
            "available_copies": 10,
            "description": "Widely used textbook for calculus courses.",
        },
        {
            "title": "A Brief History of Time",
            "author": "Stephen Hawking",
            "isbn": "9780553380163",
            "category": "science",
            "publisher": "Bantam Books",
            "published_year": 1988,
            "total_copies": 6,
            "available_copies": 6,
            "description": "Explains complex physics in simple terms for everyone.",
        },
        {
            "title": "To Kill a Mockingbird",
            "author": "Harper Lee",
            "isbn": "9780061120084",
            "category": "literature",
            "publisher": "J.B. Lippincott & Co.",
            "published_year": 1960,
            "total_copies": 8,
            "available_copies": 8,
            "description": "A masterpiece of American literature.",
        },
        {
            "title": "The Great Gatsby",
            "author": "F. Scott Fitzgerald",
            "isbn": "9780743273565",
            "category": "literature",
            "publisher": "Charles Scribner's Sons",
            "published_year": 1925,
            "total_copies": 5,
            "available_copies": 5,
            "description": "The quintessential novel of the Jazz Age.",
        },
    ]

    count = 0
    for book_data in books_to_create:
        book, created = Book.objects.using(db_alias).get_or_create(
            isbn=book_data["isbn"], defaults=book_data
        )
        if created:
            count += 1
            print(f"✅ Created: {book.title}")
        else:
            print(f"ℹ️ Exists: {book.title}")

    print(f"\n✨ Done! Added {count} new books to the library.")


if __name__ == "__main__":
    populate_library()
