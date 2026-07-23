# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import os
import subprocess
from datetime import datetime

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = "Backs up the application database via pg_dump."

    def handle(self, *args, **options):
        backup_dir = os.path.join(settings.BASE_DIR, "backups")
        os.makedirs(backup_dir, exist_ok=True)

        db = connection.settings_dict
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"backup_{timestamp}.sqlite3"
        file_path = os.path.join(backup_dir, filename)

        env = os.environ.copy()
        if db.get("PASSWORD"):
            env["PGPASSWORD"] = db["PASSWORD"]

        cmd = [
            "pg_dump",
            "-h", db.get("HOST") or "127.0.0.1",
            "-p", str(db.get("PORT") or "5432"),
            "-U", db.get("USER") or "postgres",
            "-Fc",
            "-f", file_path,
            db["NAME"],
        ]

        try:
            subprocess.run(cmd, env=env, check=True, capture_output=True)
            self.stdout.write(self.style.SUCCESS(f"Backup created: {filename}"))
        except subprocess.CalledProcessError as exc:
            self.stderr.write(
                self.style.ERROR(f"Backup failed: {exc.stderr.decode(errors='ignore')}")
            )
            raise
