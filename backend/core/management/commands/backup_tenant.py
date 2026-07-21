# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import os
import shutil

from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone
from django_tenants.utils import get_tenant_model


class Command(BaseCommand):
    help = "Backs up a specific tenant database or all tenants."

    def add_arguments(self, parser):
        parser.add_argument(
            "--schema", type=str, help="Schema name of the tenant to backup"
        )
        parser.add_argument("--all", action="store_true", help="Backup all tenants")

    def handle(self, *args, **options):
        schema = options.get("schema")
        backup_all = options.get("all")

        backup_dir = os.path.join(settings.BASE_DIR, "backups")
        os.makedirs(backup_dir, exist_ok=True)

        Tenant = get_tenant_model()

        if backup_all:
            tenants = Tenant.objects.exclude(schema_name="public")
        elif schema:
            tenants = Tenant.objects.filter(schema_name=schema)
        else:
            self.stdout.write(self.style.ERROR("Please provide --schema or --all"))
            return

        for tenant in tenants:
            self.backup_tenant(tenant, backup_dir)

    def backup_tenant(self, tenant, backup_dir):
        timestamp = timezone.now().strftime("%Y%m%d_%H%M%S")

        # Determine DB Name (SQLite specific logic for this env)
        # In this project, tenants usually have dedicated sqlite files or share one.
        # Based on Tenant model: `db_name` field exists.

        db_name = getattr(tenant, "db_name", None)
        if not db_name:
            self.stdout.write(
                self.style.WARNING(f"Tenant {tenant.schema_name} has no db_name")
            )
            return

        source_path = os.path.join(settings.BASE_DIR, db_name)

        if not os.path.exists(source_path):
            # Fallback check: maybe it's just schema in postgres?
            # But for this sprint plan we focused on SQLite file copy.
            self.stdout.write(self.style.ERROR(f"DB file not found: {source_path}"))
            return

        filename = f"backup_{tenant.schema_name}_{timestamp}.sqlite3"
        dest_path = os.path.join(backup_dir, filename)

        try:
            shutil.copy2(source_path, dest_path)
            self.stdout.write(
                self.style.SUCCESS(
                    f"Successfully backed up {tenant.schema_name} to {filename}"
                )
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"Failed to backup {tenant.schema_name}: {e}")
            )
