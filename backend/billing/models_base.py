# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.db import models


class SchemaScopedBillingModel(models.Model):
    """
    Historical no-op base (used to enforce public-vs-tenant schema scoping
    under the removed multi-tenancy setup). Kept only so existing model
    classes that inherit it don't all need touching; carries no behavior.
    """

    class Meta:
        abstract = True
