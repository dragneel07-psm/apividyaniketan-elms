# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import glob
import os
import sys

import django

# Setup Django Environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.conf import settings
from django.core.management import call_command


def verify_backup():
    print("📦 Testing Backup System...")

    # 1. Trigger Backup (for demo tenant)
    print("   Running backup command for 'demo'...")
    try:
        call_command("backup_tenant", schema="demo")
    except Exception as e:
        print(f"❌ Backup Command Failed: {e}")
        return

    # 2. Verify File Exists
    backup_dir = os.path.join(settings.BASE_DIR, "backups")
    files = glob.glob(os.path.join(backup_dir, "*.sqlite3"))

    if files:
        latest = max(files, key=os.path.getctime)
        print(
            f"✅ Backup created: {os.path.basename(latest)} ({os.path.getsize(latest) / 1024:.2f} KB)"
        )
    else:
        print("❌ No backup file found in backend/backups/")
        return

    # 3. Verify Verification Complete
    print("🎉 Infrastructure Verification Passed!")


if __name__ == "__main__":
    verify_backup()
