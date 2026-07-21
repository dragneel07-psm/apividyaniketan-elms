# Issue #7: SaaS Admin Tenant Creation - Development Guide

**Branch**: `feature/7-saas-tenant-creation`  
**Story Points**: 8  
**Estimated Time**: 3-4 hours

---

## 📋 Task Overview

Implement the API for SaaS Administrators to create new Tenants (Schools). This automates provisioning: Database creation, Migration, and Admin User setup.

### User Story
**As a** SaaS administrator  
**I want** to create new school tenants  
**So that** schools can start using the platform

---

## ✅ Acceptance Criteria

- [ ] `POST /api/core/tenants/` endpoint implemented.
- [ ] Permission restricted to `IsSaaSAdmin` (or Superuser).
- [ ] Input: `name`, `subdomain`, `admin_email`, `admin_name`.
- [ ] Creates `Tenant` record.
- [ ] Calls `provision_tenant_db` to setup SQLite DB + Migrations.
- [ ] Creates `UserAccount` (Role: Admin) inside the new Tenant DB.
- [ ] Sends Welcome Email with credentials.

---

## 🛠️ Implementation Steps

### Step 1: Create Serializer

**File**: `backend/core/serializers.py`

`TenantCreateSerializer`:
- Validates subdomain uniqueness.
- Requires `admin_email`, `admin_password` (auto-gen?), `school_name`.

### Step 2: Implement User Creation Utility

**File**: `backend/core/utils/tenant_users.py` (New)

Function `create_tenant_admin(tenant, email, password, name)`:
- Uses `using(tenant.db_alias)` to create user.

### Step 3: Create View

**File**: `backend/core/views.py`

`TenantViewSet.create`:
- Transaction atomic (on default DB).
- Create Tenant.
- `provision_tenant_db(tenant)`.
- `create_tenant_admin(...)`.
- Send Email.

### Step 4: URL Configuration

**File**: `backend/core/urls.py`

---

## 🔄 Execution Plan

1.  Serializer.
2.  Utils (User Setup).
3.  Views.
4.  URLs.
5.  Test (Critical: This modifies File System).
