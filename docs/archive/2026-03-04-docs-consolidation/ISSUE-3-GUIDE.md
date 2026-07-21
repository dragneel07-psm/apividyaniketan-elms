# Issue #3: RBAC Implementation - Development Guide

**Branch**: `feature/3-rbac-implementation`  
**Story Points**: 8  
**Estimated Time**: 2-3 hours

---

## 📋 Task Overview

Implement Role-Based Access Control (RBAC) to ensure users can only access resources appropriate for their role (Student, Teacher, Parent, Admin).

### User Story
**As a** system administrator  
**I want** users to have specific roles  
**So that** access to features is properly controlled

---

## ✅ Acceptance Criteria

- [ ] Custom Permission Classes created (`IsStudent`, `IsTeacher`, `IsAdmin`, `IsParent`)
- [ ] Role check logic implemented in `users/permissions.py`
- [ ] API endpoints secured with permissions (Example integration)
- [ ] Unit tests covering Access Allowed and Access Denied scenarios
- [ ] Signals created to assign Django Groups based on Role (Optional but recommended)

---

## 🛠️ Implementation Steps

### Step 1: Create Permission Classes

**File**: `backend/users/permissions.py`

Implement standard DRF permissions:

```python
from rest_framework import permissions

class IsSaaSAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'saas_admin'

class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'admin'

class IsTeacher(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'teacher'

class IsStudent(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'student'

# Composite Permissions
class IsTeacherOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['teacher', 'admin', 'saas_admin']
```

### Step 2: Implement Group Auto-Assignment (Optional)

**File**: `backend/users/signals.py`

When a user is created/updated, add them to the corresponding Django Group (Admin/Auth system interaction).

### Step 3: Secure an Endpoint (Demonstration)

Secure the `UserAccountViewSet` or create a dummy protected view to test the permissions.

### Step 4: Write Unit Tests

**File**: `backend/users/tests_rbac.py`

- Test that Student CANNOT access Teacher-only view.
- Test that Teacher CAN access Teacher view.
- Test that Admin CAN access almost everything.

---

## 🔄 Execution Plan

1.  Create `backend/users/permissions.py`.
2.  Update `backend/users/views.py` to use these permissions (or create test views).
3.  Write Tests `backend/users/tests_rbac.py`.
4.  Run Tests.
