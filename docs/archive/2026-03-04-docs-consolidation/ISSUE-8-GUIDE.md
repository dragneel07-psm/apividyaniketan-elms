# Issue #8: User Profile Management - Development Guide

**Branch**: `feature/8-user-profile`  
**Story Points**: 3  
**Estimated Time**: 2-3 hours

---

## 📋 Task Overview

Enable users to view and update their profile information and change their password.

### User Story
**As a** logged-in user  
**I want** to view and edit my profile  
**So that** I can keep my information up to date

---

## ✅ Acceptance Criteria

- [ ] Backend: `PATCH /api/users/accounts/me/` supported.
- [ ] Frontend: Profile Page UI (`frontend/app/student/profile/page.tsx`).
- [ ] Frontend: Display User Info (Name, Email, Role).
- [ ] Frontend: Edit Form (First Name, Last Name).
- [ ] Frontend: Change Password Form (Old, New, Confirm).
- [ ] Success/Error Notifications.

---

## 🛠️ Implementation Steps

### Step 1: Update Backend

**File**: `backend/users/views.py`

Update `me` action:
```python
    @action(detail=False, methods=['get', 'patch'], permission_classes=[permissions.IsAuthenticated])
    def me(self, request):
        if request.method == 'GET':
            serializer = self.get_serializer(request.user)
            return Response(serializer.data)
        elif request.method == 'PATCH':
            serializer = self.get_serializer(request.user, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
```

### Step 2: Update Frontend Services

**File**: `frontend/services/auth.ts`

Add:
- `updateProfile(data: Partial<UserProfile>)`
- `changePassword(oldPass, newPass)`

### Step 3: Create Profile Component

**File**: `frontend/components/student/profile-form.tsx` (or shared `components/profile/`)

Create a form using `react-hook-form` and `zod`.

### Step 4: Create Page

**File**: `frontend/app/student/profile/page.tsx`

Import `ProfileForm` and `ChangePasswordForm`.

---

## 🔄 Execution Plan

1.  Backend Update.
2.  Frontend Services.
3.  Frontend Components/Page.
4.  Verification.
