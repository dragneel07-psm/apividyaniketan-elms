# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import logging

from django.contrib.auth.models import Group, Permission
from django.db import transaction
from rest_framework import permissions, status, views, viewsets
from rest_framework.decorators import action, throttle_classes
from rest_framework.response import Response

from core.utils.audit import record_audit_event

from .emailing import send_password_reset_email
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


class UserAccountViewSet(viewsets.ModelViewSet):
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
        if request.user.role != "admin":
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
    """

    serializer_class = MyTokenObtainPairSerializer
    throttle_classes = [LoginRateThrottle]

    # Max failed attempts before lockout; lockout duration in minutes.
    _MAX_ATTEMPTS = 5
    _LOCKOUT_MINUTES = 15

    def post(self, request, *args, **kwargs):
        email = (request.data.get("email") or "").strip().lower()

        # Enforce account lockout before attempting auth
        if email:
            try:
                from django.utils import timezone

                user = UserAccount.objects.get(email__iexact=email)
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
            except UserAccount.DoesNotExist:
                pass  # Unknown email — let serializer handle

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

    def post(self, request):
        serializer = PasswordResetSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data["email"]

            # Send only when an account exists, but always return the same
            # response. Distinguishing "does not exist" here would let an
            # anonymous caller enumerate registered emails.
            for user in UserAccount.objects.filter(email__iexact=email, is_active=True):
                send_password_reset_email(user, reason="forgot_password")

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
    _COPIED_CLAIMS = ("role", "username", "staff_role")

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
