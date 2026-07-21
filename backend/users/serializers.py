# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
# users/serializers.py
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.exceptions import InvalidToken
from rest_framework_simplejwt.serializers import (
    TokenObtainPairSerializer,
    TokenRefreshSerializer,
)
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.tokens import RefreshToken as _RefreshToken

from core.utils.audit import record_audit_event
from core.utils.plan_enforcement import (
    build_plan_entitled_features,
    compute_effective_features,
    get_tenant_plan,
)

from .models import UserAccount
from .token_policy import role_token_lifetimes


def _resolved_tenant(user):
    try:
        tenant = getattr(user, "tenant", None)
    except Exception:
        tenant = None

    return tenant


def _ensure_valid_login_tenant(user) -> None:
    role = (getattr(user, "role", "") or "").strip().lower()
    if role in ("saas_admin", "saas_staff"):
        return

    if _resolved_tenant(user) is None:
        raise AuthenticationFailed(
            "Account tenant configuration is invalid. Please contact your administrator."
        )


def _safe_tenant_features(user) -> dict:
    """Return the *effective* feature dict (plan baseline merged with the
    tenant's per-school overrides) for use in JWT claims and /users/me.
    """
    tenant = _resolved_tenant(user)

    if not tenant:
        return {}

    overrides = getattr(tenant, "feature_overrides", None) or {}
    try:
        return compute_effective_features(get_tenant_plan(tenant), overrides)
    except Exception:
        return compute_effective_features(None, overrides)


def _tenant_claims(user) -> dict:
    tenant = _resolved_tenant(user)
    if not tenant:
        return {
            "tenant_schema": "public",
            "tenant_id": None,
        }
    return {
        "tenant_schema": getattr(tenant, "schema_name", "public"),
        "tenant_id": str(getattr(tenant, "id", "")) or None,
    }


class UserAccountSerializer(serializers.ModelSerializer):
    tenant_features = serializers.SerializerMethodField()

    class Meta:
        model = UserAccount
        fields = [
            "user_id",
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "staff_role",
            "tenant",
            "is_active",
            "tenant_features",
        ]
        read_only_fields = ["user_id", "email", "role", "tenant", "tenant_features"]

    def get_tenant_features(self, obj):
        return _safe_tenant_features(obj)


from django.contrib.auth.models import Group, Permission


class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = "__all__"


class GroupSerializer(serializers.ModelSerializer):
    permissions = PermissionSerializer(many=True, read_only=True)
    permission_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        write_only=True,
        queryset=Permission.objects.all(),
        source="permissions",
        required=False,
    )

    class Meta:
        model = Group
        fields = "__all__"


def _apply_role_token_lifetimes(data: dict, *, user) -> dict:
    role_lifetimes = role_token_lifetimes(getattr(user, "role", None))

    access_token = data.get("access")
    if access_token:
        access = AccessToken(access_token)
        access.set_exp(lifetime=role_lifetimes.access)
        data["access"] = str(access)

    refresh_token = data.get("refresh")
    if refresh_token:
        refresh = _RefreshToken(refresh_token)
        refresh.set_exp(lifetime=role_lifetimes.refresh)
        data["refresh"] = str(refresh)

    return data


def _get_client_ip(request) -> str:
    """Extract real client IP, respecting X-Forwarded-For from trusted proxies."""
    if request is None:
        return ""
    xff = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "")


def _check_saas_admin_ip(request) -> None:
    """Raise AuthenticationFailed if caller IP is not in the SaaS admin allowlist."""
    allowed = getattr(settings, "SAAS_ADMIN_ALLOWED_IPS", [])
    if not allowed:
        return  # empty list = no restriction (dev/staging)
    client_ip = _get_client_ip(request)
    if client_ip not in allowed:
        raise AuthenticationFailed(
            "Access denied: login from this IP is not permitted."
        )


def _verify_totp(user, totp_code: str) -> bool:
    import pyotp

    secret = getattr(user, "two_factor_secret", "") or ""
    if not secret:
        return False
    totp = pyotp.TOTP(secret)
    return totp.verify(totp_code, valid_window=1)


class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    # Tell SimpleJWT to use 'email' as the login field
    # (matches UserAccount.USERNAME_FIELD = 'email')
    username_field = "email"

    # Optional TOTP field — required for saas_admin when 2FA is enabled
    totp_code = serializers.CharField(
        required=False, write_only=True, allow_blank=True, default=""
    )

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        role_lifetimes = role_token_lifetimes(getattr(user, "role", None))
        token.set_exp(lifetime=role_lifetimes.refresh)

        # Embed useful claims so the frontend can read role without a second API call
        token["role"] = user.role
        token["staff_role"] = getattr(user, "staff_role", "")
        token["email"] = user.email
        token["first_name"] = user.first_name
        token["last_name"] = user.last_name
        token["tenant_schema"] = _tenant_claims(user).get("tenant_schema")
        token["tenant_id"] = _tenant_claims(user).get("tenant_id")
        return token

    def validate(self, attrs):
        email = (attrs.get(self.username_field) or "").strip().lower()
        if email:
            existing_user = UserAccount.objects.filter(email__iexact=email).first()
            if existing_user and not existing_user.is_active:
                if (
                    getattr(existing_user, "role", "") == "saas_admin"
                    and getattr(existing_user, "tenant_id", None) is None
                ):
                    raise AuthenticationFailed(
                        "Email not verified. Please verify your email before signing in."
                    )
                raise AuthenticationFailed(
                    "Account is inactive. Please contact your administrator."
                )

        try:
            data = super().validate(attrs)
        except Exception as e:
            # Login failure (401) is handled by super()
            raise e

        _ensure_valid_login_tenant(self.user)

        # ── SaaS admin extra security ──────────────────────────────────────
        if getattr(self.user, "role", "") == "saas_admin":
            request = self.context.get("request")

            # 1. IP allowlist
            _check_saas_admin_ip(request)

            # 2. Enforce TOTP (must have 2FA enabled and supply a valid code)
            if not getattr(self.user, "is_2fa_enabled", False):
                raise AuthenticationFailed(
                    "2FA is not yet set up for this account. "
                    "Please set up your authenticator app before signing in."
                )
            totp_code = (attrs.get("totp_code") or "").strip()
            if not totp_code:
                raise AuthenticationFailed(
                    "TOTP code is required for SaaS admin login."
                )
            if not _verify_totp(self.user, totp_code):
                raise AuthenticationFailed("Invalid or expired TOTP code.")

            # 3. Async login alert email (fire-and-forget, never block login)
            try:
                import threading

                from .emailing import send_saas_admin_login_alert

                ip = _get_client_ip(request)
                ua = request.META.get("HTTP_USER_AGENT", "") if request else ""
                threading.Thread(
                    target=send_saas_admin_login_alert,
                    kwargs={"user": self.user, "ip_address": ip, "user_agent": ua},
                    daemon=True,
                ).start()
            except Exception:
                pass  # alert failure must never break login
        # ──────────────────────────────────────────────────────────────────

        data = _apply_role_token_lifetimes(data, user=self.user)

        # Attach the user profile to every login response
        try:
            user = self.user
            user_id_val = getattr(user, "user_id", None) or getattr(user, "pk", None)

            data["user"] = {
                "user_id": str(user_id_val) if user_id_val else "",
                "email": getattr(user, "email", ""),
                "first_name": getattr(user, "first_name", ""),
                "last_name": getattr(user, "last_name", ""),
                "role": getattr(user, "role", "student"),
                "staff_role": getattr(user, "staff_role", ""),
                "tenant": str(getattr(getattr(user, "tenant", None), "id", "") or ""),
                "tenant_schema": _tenant_claims(user).get("tenant_schema"),
                "tenant_features": _safe_tenant_features(user),
            }
        except Exception as e:
            import sys
            import traceback

            print(
                f"DEBUG: Login validation failed during profile attachment: {e}",
                file=sys.stderr,
            )
            traceback.print_exc(file=sys.stderr)
            # We don't want to crash the whole login if just plan features fail,
            # but here it's better to log the exact cause of 500.

        return data


class RoleAwareTokenRefreshSerializer(TokenRefreshSerializer):
    def _ensure_rotation_policy(self) -> None:
        if not bool(getattr(settings, "JWT_STRICT_REFRESH_ROTATION", True)):
            return

        if (
            not api_settings.ROTATE_REFRESH_TOKENS
            or not api_settings.BLACKLIST_AFTER_ROTATION
        ):
            raise InvalidToken("Strict refresh token rotation policy is required.")

    def _user_for_refresh(self, token: _RefreshToken):
        user_model = get_user_model()
        user_id_field = api_settings.USER_ID_FIELD
        user_id_claim = api_settings.USER_ID_CLAIM
        user_id = token.get(user_id_claim)
        if not user_id:
            raise InvalidToken("Refresh token is missing user identity.")

        try:
            user = user_model.objects.select_related("tenant").get(
                **{user_id_field: user_id}
            )
        except user_model.DoesNotExist as exc:
            raise InvalidToken("User not found for refresh token.") from exc

        if not user.is_active:
            raise InvalidToken("User account is inactive.")

        return user

    def validate(self, attrs):
        self._ensure_rotation_policy()
        original_refresh = _RefreshToken(attrs["refresh"])
        user = self._user_for_refresh(original_refresh)
        data = super().validate(attrs)
        return _apply_role_token_lifetimes(data, user=user)


import re

# User Registration Serializer
from django.contrib.auth.password_validation import validate_password


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration"""

    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={"input_type": "password"},
    )
    password_confirm = serializers.CharField(
        write_only=True, required=True, style={"input_type": "password"}
    )

    class Meta:
        model = UserAccount
        fields = [
            "user_id",
            "email",
            "username",
            "password",
            "password_confirm",
            "first_name",
            "last_name",
        ]
        extra_kwargs = {
            "first_name": {"required": True},
            "last_name": {"required": True},
            "username": {"required": False},
            "email": {"required": True},
        }

    def validate_email(self, value):
        """Validate email format and uniqueness"""
        # Email format validation
        email_regex = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
        if not re.match(email_regex, value):
            raise serializers.ValidationError("Invalid email format")

        # Check if email already exists
        if UserAccount.objects.filter(email=value).exists():
            raise serializers.ValidationError("User with this email already exists")

        return value.lower()

    def validate(self, attrs):
        """Validate that passwords match"""
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError(
                {"password": "Password fields didn't match."}
            )
        return attrs

    def create(self, validated_data):
        """Blocked — SaaS admin accounts must be provisioned via the CLI."""
        raise serializers.ValidationError(
            "Public registration is disabled. "
            "SaaS admin accounts must be created by a platform operator "
            "using the 'create_saas_admin' management command."
        )

    def _create_blocked(self, validated_data):
        """Kept for reference only — not called."""
        validated_data.pop("password_confirm")

        # PUBLIC REGISTRATION IS FOR SAAS ADMINS ONLY
        role = "saas_admin"

        from django.db import transaction

        with transaction.atomic():
            user = UserAccount.objects.create_user(
                email=validated_data["email"],
                username=validated_data.get("username", validated_data["email"]),
                password=validated_data["password"],
                first_name=validated_data.get("first_name", ""),
                last_name=validated_data.get("last_name", ""),
                role=role,
                tenant=None,  # SaaS Admin is global
                is_staff=True,
                is_superuser=True,
                is_active=False,
            )
        return user


class UserManagementSerializer(serializers.ModelSerializer):
    """Serializer used by admins to create/update users with roles and profiles"""

    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = UserAccount
        fields = [
            "user_id",
            "username",
            "email",
            "password",
            "first_name",
            "last_name",
            "role",
            "staff_role",
            "tenant",
            "is_active",
        ]

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        role = validated_data.get("role", "student")

        from django.db import transaction

        with transaction.atomic():
            user = UserAccount(**validated_data)
            if password:
                user.set_password(password)
            else:
                user.set_unusable_password()
            user.save()

            # Create corresponding profile if it's a tenant-scoped role
            tenant = validated_data.get("tenant")
            if tenant:
                if role == "student":
                    from academic.models import Student

                    Student.objects.get_or_create(user=user)
                elif role == "teacher":
                    from academic.models import Teacher

                    Teacher.objects.get_or_create(user=user)
                elif role == "parent":
                    from academic.models import Parent

                    Parent.objects.get_or_create(user=user)
        return user

    def update(self, instance, validated_data):
        previous_role = instance.role
        password = validated_data.pop("password", None)
        if password:
            instance.set_password(password)

        role_changed = (
            "role" in validated_data and validated_data["role"] != instance.role
        )
        new_role = validated_data.get("role", instance.role)

        instance = super().update(instance, validated_data)

        if role_changed and instance.tenant:
            # Handle profile creation if role changed
            if new_role == "student":
                from academic.models import Student

                Student.objects.get_or_create(user=instance)
            elif new_role == "teacher":
                from academic.models import Teacher

                Teacher.objects.get_or_create(user=instance)
            elif new_role == "parent":
                from academic.models import Parent

                Parent.objects.get_or_create(user=instance)

        if role_changed:
            request = self.context.get("request")
            record_audit_event(
                action="users.role_changed",
                user=getattr(request, "user", None),
                request=request,
                details={
                    "target_user_id": str(instance.user_id),
                    "target_email": instance.email,
                    "previous_role": previous_role,
                    "new_role": new_role,
                },
            )

        return instance


# Password Reset Serializers
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode


class PasswordResetSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        return (value or "").strip().lower()


class EmailVerificationSerializer(serializers.Serializer):
    uid = serializers.CharField(required=False, allow_blank=True)
    uidb64 = serializers.CharField(required=False, allow_blank=True)
    token = serializers.CharField()

    def validate(self, attrs):
        uid_value = attrs.get("uid") or attrs.get("uidb64")
        if not uid_value:
            raise serializers.ValidationError({"uid": "uid (or uidb64) is required."})

        try:
            uid = force_str(urlsafe_base64_decode(uid_value))
            user = UserAccount.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, UserAccount.DoesNotExist):
            raise serializers.ValidationError({"uid": "Invalid user ID."})

        if not default_token_generator.check_token(user, attrs["token"]):
            raise serializers.ValidationError({"token": "Invalid or expired token."})

        attrs["user"] = user
        return attrs

    def save(self):
        user = self.validated_data["user"]
        if not user.is_active:
            user.is_active = True
            user.save(update_fields=["is_active"])
        return user


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField(required=False, allow_blank=True)
    uidb64 = serializers.CharField(required=False, allow_blank=True)
    token = serializers.CharField()
    new_password = serializers.CharField(
        write_only=True, required=False, min_length=8, validators=[validate_password]
    )
    password = serializers.CharField(write_only=True, required=False, min_length=8)
    confirm_password = serializers.CharField(write_only=True, required=False)

    def validate(self, attrs):
        uid_value = attrs.get("uid") or attrs.get("uidb64")
        if not uid_value:
            raise serializers.ValidationError({"uid": "uid (or uidb64) is required."})

        password_value = attrs.get("new_password") or attrs.get("password")
        if not password_value:
            raise serializers.ValidationError(
                {"new_password": "new_password (or password) is required."}
            )

        confirm_password = attrs.get("confirm_password")
        if confirm_password and password_value != confirm_password:
            raise serializers.ValidationError(
                {"new_password": "Passwords do not match."}
            )

        validate_password(password_value)

        try:
            uid = force_str(urlsafe_base64_decode(uid_value))
            self.user = UserAccount.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, UserAccount.DoesNotExist):
            raise serializers.ValidationError({"uid": "Invalid user ID."})

        if not default_token_generator.check_token(self.user, attrs["token"]):
            raise serializers.ValidationError({"token": "Invalid or expired token."})

        attrs["uid"] = uid_value
        attrs["new_password"] = password_value
        return attrs

    def save(self):
        self.user.set_password(self.validated_data["new_password"])
        self.user.save()
        return self.user


class SaasStaffSerializer(serializers.ModelSerializer):
    """Read serializer for saas_staff accounts (used by the super admin)."""

    class Meta:
        model = UserAccount
        fields = [
            "user_id",
            "email",
            "first_name",
            "last_name",
            "saas_staff_role",
            "is_active",
            "date_joined",
            "last_login",
        ]
        read_only_fields = ["user_id", "email", "date_joined", "last_login"]


class SaasStaffCreateSerializer(serializers.Serializer):
    """Write serializer — super admin creates a saas_staff account via the API."""

    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, min_length=8)
    saas_staff_role = serializers.ChoiceField(
        choices=["", "support", "billing", "schools_manager", "reports"],
        default="",
        required=False,
    )

    def validate_email(self, value):
        value = value.strip().lower()
        if UserAccount.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def create(self, validated_data):
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError as DjangoValidationError

        password = validated_data["password"]
        try:
            validate_password(password)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": list(exc.messages)})

        email = validated_data["email"]
        user = UserAccount.objects.create_user(
            email=email,
            username=email,
            password=password,
            first_name=validated_data["first_name"],
            last_name=validated_data["last_name"],
            role="saas_staff",
            saas_staff_role=validated_data.get("saas_staff_role", ""),
            tenant=None,
            is_staff=False,
            is_superuser=False,
            is_active=True,
        )
        return user
