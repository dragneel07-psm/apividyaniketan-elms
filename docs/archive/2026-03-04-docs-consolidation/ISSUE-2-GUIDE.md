# Issue #2: JWT Authentication - Development Guide

**Branch**: `feature/2-jwt-authentication`  
**Story Points**: 5  
**Estimated Time**: 2-4 hours

---

## 📋 Task Overview

Implement secure login functionality using JWT (JSON Web Tokens). This includes login endpoints, token refresh mechanisms, and token validation.

### User Story
**As a** registered user  
**I want** to login with my credentials  
**So that** I can access protected resources

---

## ✅ Acceptance Criteria

- [ ] POST /api/auth/login endpoint created (returns Access + Refresh tokens)
- [ ] POST /api/auth/refresh endpoint created (returns new Access token)
- [ ] Token expiration configured (15 min access, 7 days refresh)
- [ ] Token blacklist enabled (optional but recommended for logout)
- [ ] Unit tests written (>80% coverage)

---

## 🛠️ Implementation Steps

### Step 1: Verify Settings (Already done in Issue #1?)

Check `backend/config/settings/base.py`. Ensure `SIMPLE_JWT` settings match requirements:

```python
from datetime import timedelta

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'VERIFYING_KEY': None,
    'AUDIENCE': None,
    'ISSUER': None,
    
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'user_id',
    'USER_ID_CLAIM': 'user_id',
    
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
}
```

And ensure `rest_framework_simplejwt.token_blacklist` is in `INSTALLED_APPS` if we want blacklisting.

### Step 2: Configure URLs

**File**: `backend/users/urls.py`

We need to add the standard SimpleJWT views, but we can wrap them or use them directly.

```python
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView
)

urlpatterns = [
    # ... existing
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('verify/', TokenVerifyView.as_view(), name='token_verify'),
]
```

**Note**: In `backend/users/serializers.py`, we already saw a `MyTokenObtainPairSerializer` class. We should use that custom serializer for the Login view to include custom claims (role, username, etc.) in the token.

**Updated `urls.py` Strategy**:
Create a custom view inheriting from `TokenObtainPairView` that uses `MyTokenObtainPairSerializer`.

### Step 3: Create Custom Login View

**File**: `backend/users/views.py`

```python
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import MyTokenObtainPairSerializer

class CustomTokenObtainPairView(TokenObtainPairView):
    """Custom login view to use our custom serializer"""
    serializer_class = MyTokenObtainPairSerializer
```

### Step 4: Update Serializer (if needed)

Check `backend/users/serializers.py` to ensure `MyTokenObtainPairSerializer` is correctly adding claims.

```python
class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Add custom claims
        token['role'] = user.role
        token['username'] = user.username
        # token['tenant_id'] = str(user.tenant.id) if user.tenant else None
        
        return token
```

### Step 5: Write Unit Tests

**File**: `backend/users/tests_auth.py` (New file for cleanliness)

```python
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

User = get_user_model()

class JWTAuthenticationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='test@example.com',
            password='TestPass123!',
            role='student'
        )
        self.login_url = '/api/users/login/'
        self.refresh_url = '/api/users/refresh/'

    def test_login_success(self):
        """Test login with correct credentials"""
        response = self.client.post(self.login_url, {
            'email': 'test@example.com', # simplejwt uses 'username' field by default, check USER_NAME_FIELD settings
            'password': 'TestPass123!'
        })
        # Note: If USER_NAME_FIELD is 'email', simplejwt expects 'email' or 'username' depending on config.
        # usually simpler to just send the right field.
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        
    def test_login_failure(self):
        """Test login with incorrect password"""
        response = self.client.post(self.login_url, {
            'email': 'test@example.com',
            'password': 'WrongPassword'
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_token_refresh(self):
        """Test token refresh mechanism"""
        # 1. Login to get refresh token
        login_response = self.client.post(self.login_url, {
            'email': 'test@example.com',
            'password': 'TestPass123!'
        })
        refresh_token = login_response.data['refresh']
        
        # 2. Use refresh token to get new access token
        refresh_response = self.client.post(self.refresh_url, {
            'refresh': refresh_token
        })
        
        self.assertEqual(refresh_response.status_code, status.HTTP_200_OK)
        self.assertIn('access', refresh_response.data)
```

---

## 🎯 Important Check: USERNAME_FIELD

Since we want to login with **email**, we need to ensure the `UserAccount` model has `USERNAME_FIELD = 'email'`.
If `USERNAME_FIELD` is 'email', SimpleJWT will expect 'email' in the login payload.

---

## 🔄 Execution Plan

1.  Check `UserAccount` model for `USERNAME_FIELD`.
2.  Update `settings.py` (SimpleJWT config).
3.  Update `views.py` (Custom Login View).
4.  Update `urls.py` (Detailed routes).
5.  Create and Run Tests.
