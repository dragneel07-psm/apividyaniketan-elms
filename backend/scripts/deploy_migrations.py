# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import os
import sys

import django
from django.core.management import call_command

# Setup Django
sys.path.append(os.getcwd())
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()


def deploy_all_migrations():
    """
    Runs migrations against the default database. Used during CI/CD deployment phase.
    """
    print("Starting Migration Deployment...")

    try:
        call_command("migrate", database="default")
        print("Database migrated successfully.")
    except Exception as e:
        print(f"Database migration failed: {e}")
        sys.exit(1)

    print("Migration Deployment Finished.")


if __name__ == "__main__":
    deploy_all_migrations()
