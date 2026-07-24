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

from .models import AdminPasswordResetRequest, UserAccount
from .token_policy import role_token_lifetimes


def _school_features() -> dict:
    """Feature flags for optional modules — used in JWT claims and /users/me."""
    from core.models import SchoolProfile

    return dict(SchoolProfile.get_solo().features or {})


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
            "is_active",
            "tenant_features",
        ]
        read_only_fields = ["user_id", "email", "role", "tenant_features"]

    def get_tenant_features(self, obj):
        return _school_features()


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


class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    # Tell SimpleJWT to use 'email' as the login field
    # (matches UserAccount.USERNAME_FIELD = 'email')
    username_field = "email"

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
        return token

    def validate(self, attrs):
        email = (attrs.get(self.username_field) or "").strip().lower()
        if email:
            existing_user = UserAccount.objects.filter(email__iexact=email).first()
            if existing_user and not existing_user.is_active:
                raise AuthenticationFailed(
                    "Account is inactive. Please contact your administrator."
                )

        data = super().validate(attrs)
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
                "tenant_features": _school_features(),
            }
        except Exception as e:
            import sys
            import traceback

            print(
                f"DEBUG: Login validation failed during profile attachment: {e}",
                file=sys.stderr,
            )
            traceback.print_exc(file=sys.stderr)
            # We don't want to crash the whole login if just feature lookup fails,
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
            user = user_model.objects.get(**{user_id_field: user_id})
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
        """Blocked — accounts must be provisioned by a school administrator."""
        raise serializers.ValidationError(
            "Public registration is disabled. Contact your school administrator "
            "to have an account created."
        )


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

        if role_changed:
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


class SaasStaffSerializer(serializers.ModelSerializer):
    """Create/manage role='saas_staff' platform staff accounts."""

    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = UserAccount
        fields = [
            "user_id",
            "email",
            "first_name",
            "last_name",
            "password",
            "saas_staff_role",
            "is_active",
            "date_joined",
            "last_login",
        ]
        read_only_fields = ["user_id", "date_joined", "last_login"]

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        validated_data["role"] = "saas_staff"
        validated_data.setdefault("username", validated_data["email"])
        user = UserAccount(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        if password:
            instance.set_password(password)
        return super().update(instance, validated_data)


class AdminPasswordResetRequestSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email", read_only=True)
    first_name = serializers.CharField(source="user.first_name", read_only=True)
    last_name = serializers.CharField(source="user.last_name", read_only=True)

    class Meta:
        model = AdminPasswordResetRequest
        fields = [
            "request_id",
            "email",
            "first_name",
            "last_name",
            "status",
            "requested_at",
            "resolved_at",
        ]
        read_only_fields = fields


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
