# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from users.models import UserAccount


def create_tenant_admin(tenant, email, password, first_name, last_name):
    """
    Creates the first admin user for a tenant.
    Should be called within a schema_context(tenant.schema_name).
    """
    print(f"Creating admin user for tenant {tenant.name} ({tenant.schema_name})...")
    try:
        user = UserAccount.objects.create_user(
            email=email,
            username=email,  # Use email as username
            password=password,
            first_name=first_name,
            last_name=last_name,
            role="admin",
            tenant=tenant,
            is_staff=True,  # Tenant admins should have staff access within their tenant
            is_active=True,
        )
        print(f"Created admin user: {user.email} (ID: {user.pk})")
        return user
    except Exception as e:
        print(f"Failed to create admin user: {e}")
        raise e
