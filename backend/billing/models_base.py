# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.core.exceptions import ValidationError
from django.db import connection, models


def _current_schema_name() -> str:
    return str(getattr(connection, "schema_name", "public") or "public").strip().lower()


class SchemaScopedBillingModel(models.Model):
    SCHEMA_SCOPE = "any"  # "public" | "tenant" | "any"

    class Meta:
        abstract = True

    def _validate_schema_scope(self):
        schema_name = _current_schema_name()
        if self.SCHEMA_SCOPE == "public" and schema_name != "public":
            raise ValidationError(
                f"{self.__class__.__name__} is public-schema only and cannot be saved in '{schema_name}' schema."
            )
        if self.SCHEMA_SCOPE == "tenant" and schema_name == "public":
            raise ValidationError(
                f"{self.__class__.__name__} is tenant-schema only and cannot be saved in public schema."
            )

    def save(self, *args, **kwargs):
        self._validate_schema_scope()
        return super().save(*args, **kwargs)
