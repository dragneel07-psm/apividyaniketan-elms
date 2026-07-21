# Multi-Tenancy Architecture Upgrade Plan

Based on the architectural review, we mapped out a plan to upgrade from the current SQLite-based dynamic database switcher to a scalable, thread-safe, and production-ready PostgreSQL `django-tenants` implementation.

Here is an outline of the plan that needs to be executed to safely migrate `core.models.Tenant` and its associated `core.middleware.TenantMiddleware` over to `django-tenants`.

## Phase 1: Models & Apps Reconfiguration
1. Update `config.settings.base.py`:
   * Set `SHARED_APPS` and `TENANT_APPS` using `django_tenants` standard conventions.
   * Register `django_tenants.routers.TenantSyncRouter` instead of the custom `core.routers.TenantDatabaseRouter`.
   * Add `django_tenants.middleware.main.TenantMainMiddleware` to replace our custom loaders.
2. Update `core/models/tenant.py`:
   * Inherit `Tenant` from `django_tenants.models.TenantMixin` instead of `TimeStampedModel`.
   * Inherit a new model `Domain` from `django_tenants.models.DomainMixin`.
   * Remove manual `db_alias` and `db_name` fields (as schema-based routing ignores this).
   * Update the migrations to apply this change.

## Phase 2: PostgreSQL Switcher
1. Update `backend/config/settings/base.py`:
   * Update `DATABASES['default']['ENGINE']` to point to `django_tenants.postgresql_backend`.
   * Require Docker-compose or a local PostgreSQL instance for local development.

## Phase 3: Script Cleanup
1. Rewrite `setup_tenant_db.py` to use `django-tenants` commands (`create_tenant`, `create_public_tenant`).
2. Delete the custom scripts & routers:
   * `backend/core/middleware/tenant.py`
   * `backend/core/middleware/tenant_enforcement.py`
   * `backend/core/routers.py`
   * `backend/setup_tenant_db.py`

## Phase 4: Frontend DNS Hardening 
1. Since we now route by strict subdomain headers matching the `Domain` model, we need to ensure local testing updates `frontend/package.json` configurations or `/etc/hosts` to point subdomains correctly to `localhost`, OR use the HTTP `.localhost` trick to easily pass through `TenantMainMiddleware`.
