# Issue #4: Password Reset Functionality - Development Guide

**Branch**: `feature/4-password-reset`  
**Story Points**: 3  
**Estimated Time**: 2 hours

---

## 📋 Task Overview

Implement secure password reset functionality via email for users who have forgotten their credentials.

### User Story
**As a** user who forgot my password  
**I want** to reset it via email  
**So that** I can regain access to my account

---

## ✅ Acceptance Criteria

- [ ] `POST /api/users/password-reset/` endpoint implemented
- [ ] Logic generates secure token using `default_token_generator`
- [ ] Email sent with reset link (Console Backend for Dev)
- [ ] `POST /api/users/password-reset-confirm/` endpoint implemented
- [ ] Password update validates complexity
- [ ] Unit tests for request, token validation, and password change

---

## 🛠️ Implementation Steps

### Step 1: Create Serializers

**File**: `backend/users/serializers.py`

- `PasswordResetSerializer`: Validates email exists.
- `PasswordResetConfirmSerializer`: Validates token, uid, and new password matching.

### Step 2: Create Views

**File**: `backend/users/views.py`

- `PasswordResetView`:
  - Find user by email.
  - Generate `uid` (base64 ID) and `token`.
  - Construct reset link (Frontend URL).
  - Send email (using `send_mail`).

- `PasswordResetConfirmView`:
  - Decode `uid`.
  - Check `default_token_generator.check_token(user, token)`.
  - `user.set_password()`.
  - `user.save()`.

### Step 3: Configure URLs

**File**: `backend/users/urls.py`

- `path('password-reset/', ...)`
- `path('password-reset-confirm/<uidb64>/<token>/', ...)` -> Actually better to use POST body for confirm.

### Step 4: Configure Email Backend

**File**: `backend/config/settings/base.py`

Ensure `EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'` for development.

### Step 5: Frontend Integration (Optional for this backend task)
Frontend usually handles the page `app/reset-password/[uid]/[token]`.

---

## 🔄 Execution Plan

1.  Add serializers.
2.  Add views.
3.  Add URLs.
4.  Write Tests `backend/users/tests_reset.py`.
