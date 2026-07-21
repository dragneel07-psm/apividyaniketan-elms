# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import os
import sys

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from core.models.tenant import Domain, Tenant


def create_tenant(schema_name, domain_name, name, is_public=False):
    try:
        tenant, created = Tenant.objects.get_or_create(
            schema_name=schema_name, defaults={"name": name}
        )
        if created:
            print(f"✅ Created tenant '{name}' with schema '{schema_name}'")
        else:
            print(f"⚡ Tenant '{name}' already exists.")

        domain, domain_created = Domain.objects.get_or_create(
            domain=domain_name, tenant=tenant, defaults={"is_primary": True}
        )
        if domain_created:
            print(f"✅ Assigned domain '{domain_name}' to tenant '{name}'")
        else:
            print(f"⚡ Domain '{domain_name}' already exists.")

        return tenant
    except Exception as e:
        print(f"❌ Error creating tenant {name}: {e}")
        return None


if __name__ == "__main__":
    print("🚀 Provisioning Database Architecture...")

    # 1. Create the public tenant
    # This must be the very first tenant created and must have schema_name='public'
    public_tenant = create_tenant(
        schema_name="public",
        domain_name="demo.localhost",  # Adjust as needed
        name="Public App SaaS",
        is_public=True,
    )

    # 2. Create the demo school tenant
    if public_tenant:
        demo_school = create_tenant(
            schema_name="demo_school",
            domain_name="pramod.localhost",
            name="Demo High School",
        )
        if demo_school:
            print("\n🎉 All tenant structures configured perfectly!")
