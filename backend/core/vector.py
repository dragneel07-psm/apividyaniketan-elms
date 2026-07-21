# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from __future__ import annotations

from django.db import models

try:
    from pgvector.django import VectorField as PGVectorField

    PGVECTOR_AVAILABLE = True
except Exception:
    PGVectorField = None
    PGVECTOR_AVAILABLE = False


class VectorField(models.JSONField if not PGVECTOR_AVAILABLE else PGVectorField):  # type: ignore[misc]
    """
    Compatibility wrapper:
    - Uses pgvector VectorField when dependency is installed.
    - Falls back to JSONField in environments without pgvector package.
    """

    def __init__(self, *args, dimensions: int | None = None, **kwargs):
        self.dimensions = dimensions
        if PGVECTOR_AVAILABLE:
            super().__init__(*args, dimensions=dimensions, **kwargs)  # type: ignore[misc]
        else:
            super().__init__(*args, **kwargs)
