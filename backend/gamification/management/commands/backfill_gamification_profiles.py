# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import connections

from academic.models import Student
from core.middleware.tenant import _thread_locals
from core.models.tenant import Tenant
from gamification.services.gamification_service import GamificationService


class Command(BaseCommand):
    help = "Ensures all students have a GamificationProfile"

    def handle(self, *args, **options):
        tenants = Tenant.objects.all()
        self.stdout.write(f"Found {tenants.count()} tenants.")

        for tenant in tenants:
            self.stdout.write(f"Processing tenant: {tenant.name} ({tenant.subdomain})")

            # 1. Set Context
            _thread_locals.tenant = tenant
            _thread_locals.db_alias = tenant.db_alias

            # 2. Register DB if needed
            if tenant.db_alias not in settings.DATABASES:
                new_db_config = settings.DATABASES["default"].copy()
                new_db_config["NAME"] = settings.BASE_DIR / tenant.db_name
                settings.DATABASES[tenant.db_alias] = new_db_config
                connections.databases[tenant.db_alias] = new_db_config

            try:
                # Queries now route to tenant DB
                students = Student.objects.all()
                count = 0
                for student in students:
                    try:
                        GamificationService.get_or_create_profile(student)
                        count += 1
                    except Exception as e:
                        self.stdout.write(
                            self.style.ERROR(
                                f"Error for student {student.pk}: {str(e)}"
                            )
                        )

                self.stdout.write(
                    self.style.SUCCESS(f"Processed {count} students for {tenant.name}")
                )

            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(
                        f"Failed to process tenant {tenant.name}: {str(e)}"
                    )
                )

            finally:
                # Cleanup
                if hasattr(_thread_locals, "tenant"):
                    del _thread_locals.tenant
                if hasattr(_thread_locals, "db_alias"):
                    del _thread_locals.db_alias
