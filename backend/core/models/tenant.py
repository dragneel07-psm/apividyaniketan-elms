# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
The Tenant model was removed when this app became single-tenant (see
core.models.SchoolProfile). This module is kept only so historical
migrations (0006_alter_tenant_logo, 0012_alter_tenant_logo) that reference
`core.models.tenant.tenant_logo_upload_to` by dotted path can still import.
Do not add new code here.
"""


def tenant_scoped_upload_path(schema_name, subfolder, filename):
    prefix = str(schema_name or "public").strip().lower() or "public"
    return f"{prefix}/{subfolder}/{filename}"


def tenant_logo_upload_to(instance, filename):
    return tenant_scoped_upload_path(
        getattr(instance, "schema_name", None), "tenant_logos", filename
    )
