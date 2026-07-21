# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import os
import sys

import django

# Add the project directory to Python path
sys.path.insert(0, "/Users/pramodsinghmanyal/Desktop/E-LearningWebApp/backend")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from core.models import Tenant
from library.models import Book

tenant = Tenant.objects.get(domain_url="localhost")

import copy
import os

# Manually add the tenant database to settings
from django.conf import settings

# Get the backend directory (parent of this script)
backend_dir = os.path.dirname(os.path.abspath(__file__))
# Database is in backend/config/school_demo.sqlite3
# tenant.db_name is 'school_demo' (without extension based on observations)
db_name = tenant.db_name
if not db_name.endswith(".sqlite3"):
    db_name = f"{db_name}.sqlite3"

db_path = os.path.join(backend_dir, "config", db_name)

# Copy default settings to ensure we get all defaults (TIME_ZONE, etc)
tenant_db_config = copy.deepcopy(settings.DATABASES["default"])
tenant_db_config["NAME"] = db_path
settings.DATABASES[tenant.db_alias] = tenant_db_config

print(f"🔌 Connected to tenant DB: {tenant.db_alias}")
print(f"📂 DB Path: {db_path}")

books = [
    {
        "title": "Introduction to Algorithms",
        "author": "Cormen, Leiserson, Rivest, Stein",
        "isbn": "9780262033848",
        "category": "technology",
        "publisher": "MIT Press",
        "published_year": 2009,
        "total_copies": 3,
        "available_copies": 3,
    },
    {
        "title": "Clean Code",
        "author": "Robert C. Martin",
        "isbn": "9780132350884",
        "category": "technology",
        "publisher": "Prentice Hall",
        "published_year": 2008,
        "total_copies": 2,
        "available_copies": 2,
    },
    {
        "title": "Design Patterns",
        "author": "Gamma, Helm, Johnson, Vlissides",
        "isbn": "9780201633612",
        "category": "technology",
        "publisher": "Addison-Wesley",
        "published_year": 1994,
        "total_copies": 2,
        "available_copies": 2,
    },
    {
        "title": "A Brief History of Time",
        "author": "Stephen Hawking",
        "isbn": "9780553380163",
        "category": "science",
        "publisher": "Bantam",
        "published_year": 1988,
        "total_copies": 3,
        "available_copies": 3,
    },
    {
        "title": "Sapiens",
        "author": "Yuval Noah Harari",
        "isbn": "9780062316110",
        "category": "history",
        "publisher": "Harper",
        "published_year": 2015,
        "total_copies": 3,
        "available_copies": 3,
    },
    {
        "title": "Calculus",
        "author": "James Stewart",
        "isbn": "9781285740621",
        "category": "mathematics",
        "publisher": "Cengage",
        "published_year": 2015,
        "total_copies": 4,
        "available_copies": 4,
    },
    {
        "title": "To Kill a Mockingbird",
        "author": "Harper Lee",
        "isbn": "9780061120084",
        "category": "fiction",
        "publisher": "Harper Perennial",
        "published_year": 1960,
        "total_copies": 3,
        "available_copies": 3,
    },
    {
        "title": "1984",
        "author": "George Orwell",
        "isbn": "9780451524935",
        "category": "fiction",
        "publisher": "Signet Classic",
        "published_year": 1949,
        "total_copies": 3,
        "available_copies": 3,
    },
    {
        "title": "Atomic Habits",
        "author": "James Clear",
        "isbn": "9780735211292",
        "category": "selfhelp",
        "publisher": "Avery",
        "published_year": 2018,
        "total_copies": 3,
        "available_copies": 3,
    },
]

print(f"\n📚 Adding books to {tenant.name}...\n")

count = 0
for bd in books:
    # tenant field removed from model - handled by DB router
    book, created = Book.objects.using(tenant.db_alias).get_or_create(
        isbn=bd["isbn"], defaults=bd
    )
    if created:
        print(f"✅ Created: {book.title}")
        count += 1
    else:
        print(f"ℹ️  Exists: {book.title}")

print(f"\n🎉 Library catalog complete!")
print(f"📊 Total books: {Book.objects.using(tenant.db_alias).count()}")
