# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.core.management.base import BaseCommand

from library.models import Book


class Command(BaseCommand):
    help = "Seeds default library books"

    def handle(self, *args, **options):
        self.stdout.write("Seeding library books...")

        books_data = [
            {
                "title": "The Great Gatsby",
                "author": "F. Scott Fitzgerald",
                "isbn": "9780743273565",
                "category": "fiction",
                "total_copies": 5,
                "available_copies": 5,
                "description": "A classic novel about the American Dream in the 1920s.",
            },
            {
                "title": "A Brief History of Time",
                "author": "Stephen Hawking",
                "isbn": "9780553380163",
                "category": "science",
                "total_copies": 3,
                "available_copies": 3,
                "description": "A landmark volume in scientific writing by one of the great minds of our time.",
            },
            {
                "title": "Clean Code",
                "author": "Robert C. Martin",
                "isbn": "9780132350884",
                "category": "technology",
                "total_copies": 2,
                "available_copies": 2,
                "description": "A Handbook of Agile Software Craftsmanship.",
            },
            {
                "title": "Calculus Made Easy",
                "author": "Silvanus P. Thompson",
                "isbn": "9780312114107",
                "category": "mathematics",
                "total_copies": 4,
                "available_copies": 4,
                "description": "The most popular book on calculus ever published.",
            },
        ]

        for b_data in books_data:
            book, created = Book.objects.get_or_create(
                title=b_data["title"], author=b_data["author"], defaults=b_data
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f"  + Created book: {book.title}"))
            else:
                for key, value in b_data.items():
                    setattr(book, key, value)
                book.save()
                self.stdout.write(f"  . Updated/Verified book: {book.title}")

        self.stdout.write(self.style.SUCCESS("Library seeding complete!"))
