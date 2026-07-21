# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.db.models import QuerySet


class TenantScopedQuerysetMixin:
    """Apply tenant scoping to queryset based on request user or tenant context."""

    tenant_field = "tenant"
    require_tenant = True
    allow_unscoped_for_saas = True

    def get_tenant(self):
        user = getattr(self.request, "user", None)
        if user and user.is_authenticated:
            user_tenant = getattr(user, "tenant", None)
            if user_tenant:
                return user_tenant
        return getattr(self.request, "tenant", None)

    def should_bypass_tenant_filter(self):
        user = getattr(self.request, "user", None)
        return (
            self.allow_unscoped_for_saas
            and user
            and user.is_authenticated
            and (user.is_superuser or user.is_staff)
            and not getattr(user, "tenant", None)
        )

    def filter_queryset_by_tenant(self, queryset: QuerySet):
        if self.should_bypass_tenant_filter():
            return queryset
        tenant = self.get_tenant()
        if not tenant:
            return queryset.none() if self.require_tenant else queryset
        return queryset.filter(**{self.tenant_field: tenant})

    def get_queryset(self):
        queryset = super().get_queryset()
        return self.filter_queryset_by_tenant(queryset)
