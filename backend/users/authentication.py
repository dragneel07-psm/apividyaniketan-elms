# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication

ACTIVE_TENANT_STATUSES = {"active", "trial"}


class TenantAwareJWTAuthentication(JWTAuthentication):
    """
    Enforces tenant isolation at token level:
    - token tenant claim must match authenticated user tenant
    - token tenant claim must match request-resolved tenant
    - tenant must be active
    """

    def authenticate(self, request):
        authenticated = super().authenticate(request)
        if authenticated is None:
            return None

        user, validated_token = authenticated
        token_tenant_claim = validated_token.get("tenant_schema")
        if token_tenant_claim in (None, ""):
            raise AuthenticationFailed(
                "Token is missing tenant claim.",
                code="token_tenant_missing",
            )
        token_tenant = str(token_tenant_claim).strip().lower()
        if not token_tenant:
            raise AuthenticationFailed(
                "Token tenant claim is invalid.",
                code="token_tenant_invalid",
            )

        user_tenant = getattr(user, "tenant", None)
        user_tenant_schema = (
            str(getattr(user_tenant, "schema_name", "public") or "public")
            .strip()
            .lower()
            if user_tenant
            else "public"
        )

        if token_tenant != user_tenant_schema:
            raise AuthenticationFailed(
                "Token tenant claim mismatch with user tenant.",
                code="token_tenant_user_mismatch",
            )

        request_tenant = getattr(request, "tenant", None)
        request_tenant_schema = (
            str(getattr(request_tenant, "schema_name", "public") or "public")
            .strip()
            .lower()
            if request_tenant
            else "public"
        )

        role = str(getattr(user, "role", "") or "").strip().lower()
        is_saas_admin = role == "saas_admin"

        if is_saas_admin:
            if (
                user_tenant is not None
                or token_tenant != "public"
                or request_tenant_schema != "public"
            ):
                raise AuthenticationFailed(
                    "SaaS admin token must be scoped to public schema only.",
                    code="saas_admin_scope_invalid",
                )
        else:
            if user_tenant is None:
                raise AuthenticationFailed(
                    "Tenant user is missing tenant assignment.",
                    code="tenant_user_missing_tenant",
                )
            if token_tenant == "public" or request_tenant_schema == "public":
                raise AuthenticationFailed(
                    "Tenant user token cannot be used against public schema.",
                    code="tenant_user_public_scope_invalid",
                )

        if token_tenant != request_tenant_schema:
            raise AuthenticationFailed(
                "Token tenant claim does not match request tenant.",
                code="token_tenant_mismatch",
            )

        if user_tenant:
            tenant_status = (
                str(getattr(user_tenant, "status", "active") or "active")
                .strip()
                .lower()
            )
            if tenant_status not in ACTIVE_TENANT_STATUSES:
                raise AuthenticationFailed(
                    "Tenant is not active.", code="tenant_inactive"
                )

        return user, validated_token
