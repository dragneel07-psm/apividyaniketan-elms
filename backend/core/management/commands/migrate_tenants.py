# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import os

from django.conf import settings
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import connections

from core.models.tenant import Tenant


class Command(BaseCommand):
    help = "Runs migrations for all registered tenants"

    def add_arguments(self, parser):
        parser.add_argument(
            "--tenant_id", type=str, help="Specific tenant ID to migrate"
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("Starting tenant migrations..."))

        if options["tenant_id"]:
            tenants = Tenant.objects.filter(tenant_id=options["tenant_id"])
        else:
            tenants = Tenant.objects.all()

        for tenant in tenants:
            self.stdout.write(f"Migrating tenant: {tenant.name} ({tenant.db_alias})")

            # Skip default if it's somehow in there and points to default db to avoid double migration
            # But usually tenants have specific aliases.

            # 1. Register Database Connection dynamically
            db_config = settings.DATABASES["default"].copy()
            # Assuming sqlite for now as per middleware
            db_path = settings.BASE_DIR / tenant.db_name
            db_config["NAME"] = db_path

            settings.DATABASES[tenant.db_alias] = db_config
            connections.databases[tenant.db_alias] = db_config

            # 2. Run Migration
            try:
                # Ensure the database file exists or let django create it
                # SQLite creates file on connection if not exists.

                call_command("migrate", database=tenant.db_alias, interactive=False)
                self.stdout.write(
                    self.style.SUCCESS(f"Successfully migrated {tenant.db_alias}")
                )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f"Failed to migrate {tenant.db_alias}: {str(e)}")
                )

        self.stdout.write(self.style.SUCCESS("All tenant migrations completed."))
