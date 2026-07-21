# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import logging

from django.conf import settings
from django.contrib.auth.models import Group, Permission
from django.db import connection, transaction
from django.shortcuts import get_object_or_404
from django_tenants.utils import schema_context
from rest_framework import permissions, status, views, viewsets
from rest_framework.decorators import action, throttle_classes
from rest_framework.response import Response

from core.mixins import TenantScopedQuerysetMixin
from core.models import Tenant
from core.utils.audit import record_audit_event

from .emailing import send_password_reset_email, send_saas_admin_registration_email
from .models import UserAccount
from .permissions import IsAdminOrSaaSAdmin
from .serializers import (
    EmailVerificationSerializer,
    GroupSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetSerializer,
    PermissionSerializer,
    RoleAwareTokenRefreshSerializer,
    UserAccountSerializer,
    UserManagementSerializer,
)
from .throttling import (
    EmailVerificationRateThrottle,
    LoginRateThrottle,
    PasswordResetConfirmRateThrottle,
    PasswordResetRateThrottle,
    RefreshRateThrottle,
    RegisterRateThrottle,
)

logger = logging.getLogger(__name__)


class UserAccountViewSet(TenantScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = UserAccount.objects.all()
    serializer_class = UserAccountSerializer

    def get_permissions(self):
        if self.action in ["me", "change_password"]:
            return [permissions.IsAuthenticated()]
        return [IsAdminOrSaaSAdmin()]

    def get_serializer_class(self):
        if self.action in ["create", "update", "partial_update"]:
            return UserManagementSerializer
        return UserAccountSerializer

    @action(
        detail=False,
        methods=["get", "patch"],
        permission_classes=[permissions.IsAuthenticated],
        throttle_classes=[],
    )
    def me(self, request):
        if request.method == "GET":
            serializer = self.get_serializer(request.user)
            return Response(serializer.data)
        elif request.method == "PATCH":
            serializer = self.get_serializer(
                request.user, data=request.data, partial=True
            )
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(
        detail=False,
        methods=["post"],
        permission_classes=[permissions.IsAuthenticated],
        url_path="change-password",
    )
    def change_password(self, request):
        user = request.user
        old_password = request.data.get("old_password")
        new_password = request.data.get("new_password")

        if not old_password or not new_password:
            return Response(
                {"error": "old_password and new_password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not user.check_password(old_password):
            return Response(
                {"error": "Invalid current password."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user.set_password(new_password)
            user.save()
            return Response({"message": "Password updated successfully."})
        except Exception as e:
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(
        detail=False, methods=["post"], permission_classes=[permissions.IsAuthenticated]
    )
    def push_token(self, request):
        """
        POST /api/users/users/push-token/
        Body: { "token": "ExponentPushToken[...]" }
        Registers or updates the Expo push token for the authenticated user.
        """
        token = (request.data.get("token") or "").strip()
        if not token:
            return Response(
                {"detail": "token is required."}, status=status.HTTP_400_BAD_REQUEST
            )
        request.user.expo_push_token = token
        request.user.save(update_fields=["expo_push_token"])
        return Response({"status": "registered"})


class GroupViewSet(viewsets.ModelViewSet):
    queryset = Group.objects.all()
    serializer_class = GroupSerializer
    permission_classes = [permissions.IsAdminUser]


class PermissionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Permission.objects.all()
    serializer_class = PermissionSerializer
    permission_classes = [permissions.IsAdminUser]


from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.views import APIView


class AdminPasswordResetView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        # 1. Check if requester is Admin/Staff
        if not (request.user.role in ["admin", "saas_admin"]):
            return Response(
                {"error": "You do not have permission to reset passwords."},
                status=status.HTTP_403_FORBIDDEN,
            )

        user_id = request.data.get("user_id")
        new_password = request.data.get("new_password")

        if not user_id or not new_password:
            return Response(
                {"error": "user_id and new_password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            target_user = get_object_or_404(UserAccount, pk=user_id)

            # Tenant Isolation Check
            # 1. SaaS Admin can reset anyone's password
            # 2. Tenant Admin can only reset users in their own tenant
            if request.user.role == "admin":
                if target_user.tenant != request.user.tenant:
                    return Response(
                        {"error": "User not found in your organization."},
                        status=status.HTTP_404_NOT_FOUND,
                    )
            elif request.user.role == "saas_admin":
                # SaaS Admin is global
                pass
            else:
                return Response(
                    {"error": "Unauthorized role"}, status=status.HTTP_403_FORBIDDEN
                )

            # Set password, activate, and audit atomically so a failure anywhere
            # rolls the whole change back — we never leave a new password in
            # place without an audit trail, or an audit record for a password
            # change that did not happen.
            with transaction.atomic():
                target_user.set_password(new_password)
                target_user.is_active = True
                target_user.failed_login_attempts = 0
                target_user.locked_until = None
                target_user.save(
                    update_fields=[
                        "password",
                        "is_active",
                        "failed_login_attempts",
                        "locked_until",
                    ]
                )
                record_audit_event(
                    action="users.admin_password_reset",
                    user=request.user,
                    request=request,
                    details={
                        "target_user_id": str(target_user.user_id),
                        "target_email": target_user.email,
                        "target_tenant_id": str(
                            getattr(target_user, "tenant_id", "") or ""
                        ),
                        "initiator_role": getattr(request.user, "role", None),
                    },
                )
            logger.info(
                "Admin password reset succeeded",
                extra={
                    "target_user_id": str(target_user.user_id),
                    "initiator_user_id": str(
                        getattr(request.user, "user_id", "") or ""
                    ),
                },
            )
            return Response({"message": "Password reset successfully."})
        except Exception:
            logger.exception("Admin password reset failed")
            return Response(
                {"error": "Password reset failed."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# User Registration View
from rest_framework.decorators import api_view, permission_classes

from .serializers import UserRegistrationSerializer


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
@throttle_classes([RegisterRateThrottle])
def register_user(request):
    """
    Register a new user

    POST /api/auth/register/
    """
    serializer = UserRegistrationSerializer(
        data=request.data, context={"request": request}
    )

    if serializer.is_valid():
        user = serializer.save()
        try:
            # Notify newly registered SaaS admin with login and recovery links.
            send_saas_admin_registration_email(user)
        except Exception as exc:
            # Account should remain created even if email provider is temporarily unavailable.
            logger.warning("Failed to send SaaS admin registration email: %s", exc)
        return Response(
            {
                "message": "Registration successful. Please verify your email before signing in.",
                "verification_required": True,
                "user": {
                    "id": user.user_id,
                    "email": user.email,
                    "username": user.username,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "role": user.role,
                },
            },
            status=status.HTTP_201_CREATED,
        )

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# Custom Login View
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .serializers import MyTokenObtainPairSerializer


class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Login view that returns JWT tokens with custom claims (role, etc.)
    POST /api/users/login/

    For saas_admin accounts this view adds a 2FA pre-flight check before
    invoking the full serializer, so the frontend can guide the user through
    the setup or TOTP entry flow without leaking sensitive error details.
    """

    serializer_class = MyTokenObtainPairSerializer
    throttle_classes = [LoginRateThrottle]

    # Max failed attempts before lockout; lockout duration in minutes.
    _MAX_ATTEMPTS = 5
    _LOCKOUT_MINUTES = 15

    def post(self, request, *args, **kwargs):
        from datetime import timedelta

        from django.utils import timezone

        email = (request.data.get("email") or "").strip().lower()
        password = request.data.get("password", "")
        totp_code = (request.data.get("totp_code") or "").strip()

        # ── Lockout & 2FA pre-flight (only when email is provided) ───────────
        if email:
            try:
                user = UserAccount.objects.get(email__iexact=email)

                # Enforce account lockout before attempting auth
                if user.locked_until and user.locked_until > timezone.now():
                    wait = (
                        int((user.locked_until - timezone.now()).total_seconds() / 60)
                        + 1
                    )
                    return Response(
                        {
                            "code": "account_locked",
                            "message": (
                                f"Account temporarily locked due to too many failed login attempts. "
                                f"Try again in {wait} minute(s)."
                            ),
                        },
                        status=status.HTTP_429_TOO_MANY_REQUESTS,
                    )

                # 2FA pre-flight for saas_admin only
                if user.role == "saas_admin" and user.check_password(password):
                    if not user.is_active:
                        pass  # Let serializer surface "not verified"
                    elif not user.is_2fa_enabled:
                        return Response(
                            {
                                "two_factor_required": True,
                                "action": "setup_2fa",
                                "message": (
                                    "Your account requires 2FA. "
                                    "Please set up your authenticator app."
                                ),
                            },
                            status=status.HTTP_200_OK,
                        )
                    elif not totp_code:
                        return Response(
                            {
                                "two_factor_required": True,
                                "action": "enter_totp",
                                "message": "Please enter your 6-digit authenticator code.",
                            },
                            status=status.HTTP_200_OK,
                        )
            except UserAccount.DoesNotExist:
                pass  # Unknown email — let serializer handle

        # ── Delegate to DRF SimpleJWT serializer ─────────────────────────────
        try:
            response = super().post(request, *args, **kwargs)
        except Exception:
            # Serializer raised an exception (e.g. AuthenticationFailed).
            # Increment failure counter on the account if it exists.
            self._record_failed_attempt(email)
            raise

        # On HTTP 4xx from serializer (auth failure), record attempt.
        if response.status_code in (400, 401):
            self._record_failed_attempt(email)
        else:
            # Successful login — reset failure counter.
            self._reset_attempts(email)

        return response

    def _record_failed_attempt(self, email: str) -> None:
        from datetime import timedelta

        from django.utils import timezone

        if not email:
            return
        try:
            user = UserAccount.objects.get(email__iexact=email)
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= self._MAX_ATTEMPTS:
                user.locked_until = timezone.now() + timedelta(
                    minutes=self._LOCKOUT_MINUTES
                )
                logger.warning(
                    "Account locked after repeated failed login attempts",
                    extra={"email": email, "attempts": user.failed_login_attempts},
                )
            user.save(update_fields=["failed_login_attempts", "locked_until"])
        except UserAccount.DoesNotExist:
            pass

    def _reset_attempts(self, email: str) -> None:
        if not email:
            return
        try:
            user = UserAccount.objects.get(email__iexact=email)
            if user.failed_login_attempts > 0 or user.locked_until:
                user.failed_login_attempts = 0
                user.locked_until = None
                user.save(update_fields=["failed_login_attempts", "locked_until"])
        except UserAccount.DoesNotExist:
            pass


class CustomTokenRefreshView(TokenRefreshView):
    throttle_classes = [RefreshRateThrottle]
    serializer_class = RoleAwareTokenRefreshSerializer


# Password Reset via Email (Views)
class PasswordResetView(views.APIView):
    # Public endpoint — skip authentication entirely so a stale/expired JWT
    # cookie left over from a previous session does not 401 the request
    # before the AllowAny permission is reached.
    authentication_classes: list = []
    permission_classes = [permissions.AllowAny]
    throttle_classes = [PasswordResetRateThrottle]

    def _tenant_targets_for_email(self, email: str, request):
        """
        Resolve reset targets in current schema and, when on public schema,
        across tenant schemas so forgot-password works for all registered accounts.
        """
        targets: list[tuple[UserAccount, object]] = []
        seen: set[str] = set()

        for user in UserAccount.objects.filter(email__iexact=email, is_active=True):
            key = f"{connection.schema_name}:{user.pk}"
            if key in seen:
                continue
            seen.add(key)
            targets.append((user, getattr(user, "tenant", None)))

        # If no user in current schema and we're on public, probe tenant schemas.
        if targets or connection.schema_name != "public":
            return targets

        for tenant in Tenant.objects.exclude(schema_name="public"):
            try:
                with schema_context(tenant.schema_name):
                    tenant_user = UserAccount.objects.filter(
                        email__iexact=email, is_active=True
                    ).first()
                    if not tenant_user:
                        continue
                    key = f"{tenant.schema_name}:{tenant_user.pk}"
                    if key in seen:
                        continue
                    seen.add(key)
                    targets.append((tenant_user, tenant))
            except Exception as exc:
                logger.warning(
                    "Password reset lookup failed for schema %s: %s",
                    tenant.schema_name,
                    exc,
                )
                continue

        return targets

    def post(self, request):
        serializer = PasswordResetSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data["email"]
            targets = self._tenant_targets_for_email(email, request)

            # Send only when an account exists, but always return the same
            # response. Distinguishing "does not exist" here would let an
            # anonymous caller enumerate registered emails platform-wide
            # (the lookup probes every tenant schema).
            for user, tenant in targets:
                send_password_reset_email(user, tenant=tenant, reason="forgot_password")

            return Response(
                {
                    "message": (
                        "If an account exists for that email, a password reset "
                        "link has been sent."
                    )
                },
                status=status.HTTP_200_OK,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetConfirmView(views.APIView):
    # Same reasoning as PasswordResetView — the user clicking a reset link in
    # email may still have a stale JWT cookie in the same browser session.
    authentication_classes: list = []
    permission_classes = [permissions.AllowAny]
    throttle_classes = [PasswordResetConfirmRateThrottle]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            record_audit_event(
                action="users.password_reset_completed",
                user=user,
                request=request,
                details={
                    "target_user_id": str(getattr(user, "user_id", "") or user.pk),
                    "target_email": user.email,
                    "target_role": getattr(user, "role", None),
                },
            )
            return Response(
                {
                    "message": "Password reset successful.",
                    "role": getattr(user, "role", None),
                },
                status=status.HTTP_200_OK,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class EmailVerificationView(views.APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [EmailVerificationRateThrottle]

    def post(self, request):
        serializer = EmailVerificationSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(
                {"message": "Email verified successfully. You can now sign in."},
                status=status.HTTP_200_OK,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ── SaaS Admin 2FA Views ──────────────────────────────────────────────────────


def _saas_admin_from_credentials(email: str, password: str):
    """
    Validate email + password for a saas_admin account.
    Returns the UserAccount or raises Response-ready error details.
    """
    _CRED_ERR = {"error": "Invalid credentials."}
    try:
        user = UserAccount.objects.get(
            email__iexact=email.strip().lower(), role="saas_admin"
        )
    except UserAccount.DoesNotExist:
        return None, _CRED_ERR
    if not user.check_password(password):
        return None, _CRED_ERR
    if not user.is_active:
        return None, {"error": "Account not yet verified. Check your email."}
    return user, None


class TwoFactorSetupView(views.APIView):
    """
    Generate a TOTP secret for a saas_admin who hasn't set up 2FA yet.
    Requires re-authentication (email + password in body — no JWT needed).
    Returns {secret, qr_uri} so the admin can scan with Google Authenticator / Authy.
    The secret is saved as *pending* (is_2fa_enabled stays False until /activate/).

    POST /api/users/2fa/setup/
    Body: { email, password }
    """

    permission_classes = [permissions.AllowAny]
    throttle_classes = [LoginRateThrottle]

    def post(self, request):
        import pyotp

        email = request.data.get("email", "")
        password = request.data.get("password", "")

        user, err = _saas_admin_from_credentials(email, password)
        if err:
            return Response(err, status=status.HTTP_403_FORBIDDEN)

        # Generate a new TOTP secret and store it (pending activation)
        secret = pyotp.random_base32()
        totp = pyotp.TOTP(secret)
        issuer = getattr(settings, "TOTP_ISSUER_NAME", "E-Learning Platform")
        qr_uri = totp.provisioning_uri(name=user.email, issuer_name=issuer)

        user.two_factor_secret = secret
        user.save(update_fields=["two_factor_secret"])

        return Response(
            {
                "secret": secret,
                "qr_uri": qr_uri,
                "instructions": (
                    "Scan the QR code (or enter the secret) in your authenticator app, "
                    "then call /api/users/2fa/activate/ with a valid TOTP code to complete setup."
                ),
            },
            status=status.HTTP_200_OK,
        )


class TwoFactorActivateView(views.APIView):
    """
    Activate TOTP 2FA for a saas_admin account.
    Verifies the TOTP code against the pending secret from /setup/.
    On success, enables 2FA and returns a full JWT pair.

    POST /api/users/2fa/activate/
    Body: { email, password, totp_code }
    """

    permission_classes = [permissions.AllowAny]
    throttle_classes = [LoginRateThrottle]

    def post(self, request):
        import pyotp
        from rest_framework_simplejwt.tokens import RefreshToken as _RT

        from .token_policy import role_token_lifetimes

        email = request.data.get("email", "")
        password = request.data.get("password", "")
        totp_code = (request.data.get("totp_code") or "").strip()

        user, err = _saas_admin_from_credentials(email, password)
        if err:
            return Response(err, status=status.HTTP_403_FORBIDDEN)

        if not user.two_factor_secret:
            return Response(
                {
                    "error": "No pending 2FA secret found. Call /api/users/2fa/setup/ first."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not totp_code:
            return Response(
                {"error": "totp_code is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        totp = pyotp.TOTP(user.two_factor_secret)
        if not totp.verify(totp_code, valid_window=1):
            return Response(
                {"error": "Invalid or expired TOTP code. Please try again."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Activate 2FA
        user.is_2fa_enabled = True
        user.save(update_fields=["is_2fa_enabled"])

        # Issue JWT tokens with role-scoped lifetimes
        refresh = _RT.for_user(user)
        lifetimes = role_token_lifetimes(user.role)
        refresh.set_exp(lifetime=lifetimes.refresh)
        access = refresh.access_token
        access.set_exp(lifetime=lifetimes.access)

        record_audit_event(
            action="users.2fa_activated",
            user=user,
            request=request,
            details={"email": user.email},
        )

        return Response(
            {
                "message": "2FA successfully activated.",
                "access": str(access),
                "refresh": str(refresh),
                "user": {
                    "user_id": str(user.user_id),
                    "email": user.email,
                    "role": user.role,
                },
            },
            status=status.HTTP_200_OK,
        )


# ── SaaS Staff Management (super admin only) ──────────────────────────────────

from .permissions import IsSaaSAdmin as _IsSaaSAdmin
from .serializers import SaasStaffCreateSerializer, SaasStaffSerializer


class SaasStaffViewSet(viewsets.ViewSet):
    """
    CRUD for saas_staff accounts.
    Only saas_admin (super admin) can access these endpoints.
    """

    permission_classes = [_IsSaaSAdmin]

    def _staff_qs(self):
        return UserAccount.objects.filter(role="saas_staff").order_by("-date_joined")

    def list(self, request):
        staff = self._staff_qs()
        return Response(SaasStaffSerializer(staff, many=True).data)

    def create(self, request):
        serializer = SaasStaffCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        record_audit_event(
            action="users.saas_staff_created",
            user=request.user,
            request=request,
            details={"staff_email": user.email, "staff_id": str(user.user_id)},
        )
        return Response(SaasStaffSerializer(user).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, pk=None):
        try:
            user = self._staff_qs().get(pk=pk)
        except UserAccount.DoesNotExist:
            return Response(
                {"error": "Staff member not found."}, status=status.HTTP_404_NOT_FOUND
            )

        # Only allow toggling is_active, updating name fields, and assigning saas sub-role
        allowed = {
            k: v
            for k, v in request.data.items()
            if k in ("is_active", "first_name", "last_name", "saas_staff_role")
        }
        for field, value in allowed.items():
            setattr(user, field, value)
        user.save(update_fields=list(allowed.keys()))
        record_audit_event(
            action="users.saas_staff_updated",
            user=request.user,
            request=request,
            details={"staff_email": user.email, "changes": allowed},
        )
        return Response(SaasStaffSerializer(user).data)

    def destroy(self, request, pk=None):
        try:
            user = self._staff_qs().get(pk=pk)
        except UserAccount.DoesNotExist:
            return Response(
                {"error": "Staff member not found."}, status=status.HTTP_404_NOT_FOUND
            )
        email = user.email
        user.is_active = False
        user.save(update_fields=["is_active"])
        record_audit_event(
            action="users.saas_staff_deactivated",
            user=request.user,
            request=request,
            details={"staff_email": email},
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class WebSocketTicketView(views.APIView):
    """
    POST /api/users/ws-ticket/

    Issues a short-lived JWT for authenticating WebSocket connections.
    Browsers cannot attach httpOnly cookies or Authorization headers to
    cross-origin WebSocket upgrades, so authenticated clients exchange
    their session for a ~60s token passed as ?token=<jwt>. The ticket is
    a regular simplejwt AccessToken, so core.ws_middleware.JWTAuthMiddleware
    accepts it unchanged.
    """

    permission_classes = [permissions.IsAuthenticated]

    # Claims JWTAuthMiddleware and WS consumers rely on.
    _COPIED_CLAIMS = ("tenant_schema", "tenant_id", "role", "username", "staff_role")

    def post(self, request):
        from datetime import timedelta

        from django.conf import settings as django_settings
        from rest_framework_simplejwt.tokens import AccessToken

        ttl_seconds = int(getattr(django_settings, "WS_TICKET_TTL_SECONDS", 60))
        ticket = AccessToken.for_user(request.user)
        ticket.set_exp(lifetime=timedelta(seconds=ttl_seconds))

        current_payload = getattr(getattr(request, "auth", None), "payload", None) or {}
        for claim in self._COPIED_CLAIMS:
            if claim in current_payload:
                ticket[claim] = current_payload[claim]

        return Response({"token": str(ticket), "expires_in": ttl_seconds})
