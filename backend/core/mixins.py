# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
class TenantScopedQuerysetMixin:
    """
    No-op: this app is single-tenant now, so there's nothing left to scope by.
    Kept as a mixin (rather than removed from every ViewSet) so subclasses that
    override get_queryset() and call super().get_queryset() keep working
    unchanged.
    """

    def get_queryset(self):
        return super().get_queryset()
