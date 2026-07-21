# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import uuid as uuid_lib

from django.conf import settings
from django.db import models

from core.models.tenant import Tenant


class RubricTemplate(models.Model):
    """A reusable grading rubric a teacher can pick from on the grade page.

    Templates are tenant-scoped. An `owner` FK identifies the teacher who
    created it; templates with `owner=NULL` are tenant-shared (visible to
    every teacher in the tenant). Admins can manage any template; teachers
    can manage their own.
    """

    template_id = models.UUIDField(
        primary_key=True, default=uuid_lib.uuid4, editable=False
    )
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, db_constraint=False)

    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="rubric_templates",
        db_constraint=False,
        help_text="Teacher who created the template. NULL = tenant-shared.",
    )
    subject = models.ForeignKey(
        "academic.Subject",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="rubric_templates",
        db_constraint=False,
    )

    # criteria_json is a list of {criterion: str, max: int} entries — no
    # scores stored. The grade page seeds the rubric editor from this.
    criteria_json = models.JSONField(default=list)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        indexes = [
            models.Index(fields=["tenant", "owner"], name="proj_rubric_owner_idx"),
        ]

    def __str__(self):
        return self.name

    @property
    def is_shared(self) -> bool:
        return self.owner_id is None
