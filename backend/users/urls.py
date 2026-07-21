# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AdminPasswordResetView,
    CustomTokenObtainPairView,
    CustomTokenRefreshView,
    EmailVerificationView,
    GroupViewSet,
    PasswordResetConfirmView,
    PasswordResetView,
    PermissionViewSet,
    SaasStaffViewSet,
    TwoFactorActivateView,
    TwoFactorSetupView,
    UserAccountViewSet,
    WebSocketTicketView,
    register_user,
)

router = DefaultRouter()
router.register(r"accounts", UserAccountViewSet)
router.register(r"groups", GroupViewSet)
router.register(r"permissions", PermissionViewSet)
router.register(r"saas-staff", SaasStaffViewSet, basename="saas-staff")

urlpatterns = [
    path("", include(router.urls)),
    path("register/", register_user, name="register"),
    path("login/", CustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("refresh/", CustomTokenRefreshView.as_view(), name="token_refresh"),
    path(
        "admin/reset-password/",
        AdminPasswordResetView.as_view(),
        name="admin-password-reset",
    ),
    path("password-reset/", PasswordResetView.as_view(), name="password_reset"),
    path(
        "password-reset-confirm/",
        PasswordResetConfirmView.as_view(),
        name="password_reset_confirm",
    ),
    path("verify-email/", EmailVerificationView.as_view(), name="verify_email"),
    # SaaS Admin 2FA — re-auth with email+password (no JWT required)
    path("2fa/setup/", TwoFactorSetupView.as_view(), name="2fa_setup"),
    path("2fa/activate/", TwoFactorActivateView.as_view(), name="2fa_activate"),
    # Short-lived WebSocket auth ticket (browsers can't send httpOnly cookies on WS upgrades)
    path("ws-ticket/", WebSocketTicketView.as_view(), name="ws_ticket"),
]
