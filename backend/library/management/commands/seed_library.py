# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import connections

from core.middleware.tenant import _thread_locals
from core.models import Tenant
from library.models import Book


class Command(BaseCommand):
    help = "Seeds default library books for all tenants"

    def handle(self, *args, **options):
        self.stdout.write("Seeding library books...")

        tenants = Tenant.objects.all()

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

        if not tenants.exists():
            self.stdout.write(
                self.style.WARNING("No tenants found! run init_tenant first.")
            )
            return

        for tenant in tenants:
            self.stdout.write(f"Processing tenant: {tenant.name}")

            # Set thread local for routing
            _thread_locals.tenant = tenant
            _thread_locals.db_alias = tenant.db_alias

            # Dynamic Database Registration
            if tenant.db_alias not in settings.DATABASES:
                new_db_config = settings.DATABASES["default"].copy()
                new_db_config["NAME"] = settings.BASE_DIR / tenant.db_name
                settings.DATABASES[tenant.db_alias] = new_db_config
                connections.databases[tenant.db_alias] = new_db_config

            for b_data in books_data:
                book, created = Book.objects.using(tenant.db_alias).get_or_create(
                    title=b_data["title"], author=b_data["author"], defaults=b_data
                )
                if created:
                    self.stdout.write(
                        self.style.SUCCESS(f"  + Created book: {book.title}")
                    )
                else:
                    # Update existing book
                    for key, value in b_data.items():
                        setattr(book, key, value)
                    book.save(using=tenant.db_alias)
                    self.stdout.write(f"  . Updated/Verified book: {book.title}")

            # Reset context
            _thread_locals.tenant = None
            _thread_locals.db_alias = "default"

        self.stdout.write(self.style.SUCCESS("Library seeding complete!"))
