# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import os
import sys

import django

# Add the project directory to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from core.models import SchoolProfile
from library.models import Book

school = SchoolProfile.get_solo()

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

print(f"\n📚 Adding books to {school.name}...\n")

count = 0
for bd in books:
    book, created = Book.objects.get_or_create(isbn=bd["isbn"], defaults=bd)
    if created:
        print(f"✅ Created: {book.title}")
        count += 1
    else:
        print(f"ℹ️  Exists: {book.title}")

print(f"\n🎉 Library catalog complete!")
print(f"📊 Total books: {Book.objects.count()}")
