# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from __future__ import annotations

import re

from rest_framework.schemas import openapi as openapi_module
from rest_framework.schemas.openapi import AutoSchema

from core.vendor import inflection_fallback, uritemplate_fallback

if openapi_module.inflection is None:
    openapi_module.inflection = inflection_fallback
if openapi_module.uritemplate is None:
    openapi_module.uritemplate = uritemplate_fallback


class UniqueOperationIdAutoSchema(AutoSchema):
    """
    Avoid duplicate operation IDs when legacy and versioned aliases are exposed.
    """

    _NON_ALNUM = re.compile(r"[^a-zA-Z0-9_]+")

    def get_operation_id(self, path: str, method: str) -> str:
        normalized_path = (path or "/").strip("/")
        if not normalized_path:
            normalized_path = "root"

        path_token = normalized_path.replace("/", "_").replace("{", "").replace("}", "")
        path_token = self._NON_ALNUM.sub("_", path_token).strip("_").lower() or "root"
        method_token = str(method or "get").lower()
        return f"{method_token}_{path_token}"
