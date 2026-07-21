# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from __future__ import annotations

from dataclasses import dataclass

from django.core.management.base import BaseCommand
from django.db import IntegrityError
from django_tenants.utils import schema_context

from academic.models import Parent, Student, Teacher
from core.models import Tenant
from users.models import UserAccount

TENANT_ROLES = {"student", "teacher", "parent", "admin", "staff"}


@dataclass(frozen=True)
class ReconcileItem:
    source_user_id: str
    email: str
    role: str
    tenant_schema: str
    reason: str


def _email_domain(email: str) -> str:
    value = (email or "").strip().lower()
    if "@" not in value:
        return ""
    return value.split("@", 1)[1].strip()


def _subdomain_from_email(email: str) -> str:
    domain = _email_domain(email)
    if not domain:
        return ""
    return domain.split(".", 1)[0].strip().lower()


def _looks_like_tenant_email(email: str) -> bool:
    return bool(_subdomain_from_email(email))


def _ensure_role_profile(role: str, user: UserAccount) -> None:
    if role == "student":
        Student.objects.get_or_create(user=user)
    elif role == "teacher":
        Teacher.objects.get_or_create(user=user)
    elif role == "parent":
        Parent.objects.get_or_create(user=user)


class Command(BaseCommand):
    help = (
        "Reconciles tenant-role users accidentally created in public schema "
        "into tenant schemas. Dry-run by default."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--tenant-schema",
            type=str,
            default="",
            help="Limit reconciliation to a single tenant schema (e.g. demo).",
        )
        parser.add_argument(
            "--email",
            type=str,
            default="",
            help="Limit reconciliation to a single email address.",
        )
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Apply changes. Without this flag the command only performs a dry-run.",
        )
        parser.add_argument(
            "--update-existing",
            action="store_true",
            help="If target user already exists in tenant schema, update profile/password fields.",
        )
        parser.add_argument(
            "--deactivate-source",
            action="store_true",
            help="After successful migrate/update, deactivate the source public user.",
        )

    def handle(self, *args, **options):
        apply_changes = bool(options["apply"])
        only_tenant = str(options.get("tenant_schema") or "").strip().lower()
        only_email = str(options.get("email") or "").strip().lower()
        update_existing = bool(options["update_existing"])
        deactivate_source = bool(options["deactivate_source"])

        tenants = list(
            Tenant.objects.exclude(schema_name="public").only(
                "id", "schema_name", "subdomain"
            )
        )
        tenants_by_id = {str(t.id): t for t in tenants}
        tenants_by_schema = {str(t.schema_name).strip().lower(): t for t in tenants}
        for t in tenants:
            sub = str(getattr(t, "subdomain", "") or "").strip().lower()
            if sub and sub not in tenants_by_schema:
                tenants_by_schema[sub] = t

        source_users = self._source_users(only_email=only_email)
        candidates = self._build_candidates(
            source_users, tenants_by_id, tenants_by_schema, only_tenant
        )

        if not candidates:
            self.stdout.write(
                self.style.WARNING("No candidate users found in public schema.")
            )
            return

        self.stdout.write(
            self.style.WARNING(
                f"{'Applying' if apply_changes else 'Dry-run'} reconciliation for {len(candidates)} user(s)."
            )
        )

        moved = 0
        updated = 0
        skipped = 0
        errors = 0

        for item in candidates:
            source_user = source_users.get(item.source_user_id)
            if source_user is None:
                skipped += 1
                continue

            tenant = tenants_by_schema.get(item.tenant_schema)
            if tenant is None:
                self.stdout.write(
                    self.style.WARNING(
                        f"SKIP {item.email}: tenant '{item.tenant_schema}' not found."
                    )
                )
                skipped += 1
                continue

            try:
                result = self._reconcile_user(
                    source_user=source_user,
                    tenant=tenant,
                    apply_changes=apply_changes,
                    update_existing=update_existing,
                    deactivate_source=deactivate_source,
                    reason=item.reason,
                )
                if result == "moved":
                    moved += 1
                elif result == "updated":
                    updated += 1
                else:
                    skipped += 1
            except (
                Exception
            ) as exc:  # pragma: no cover - defensive for operational command
                self.stdout.write(self.style.ERROR(f"ERROR {item.email}: {exc}"))
                errors += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Done. moved={moved} updated={updated} skipped={skipped} errors={errors}"
            )
        )

    def _source_users(self, *, only_email: str) -> dict[str, UserAccount]:
        with schema_context("public"):
            queryset = UserAccount.objects.exclude(role="saas_admin")
            if only_email:
                queryset = queryset.filter(email__iexact=only_email)

            users = list(queryset.order_by("date_joined", "email"))
            return {str(user.user_id): user for user in users}

    def _build_candidates(
        self,
        source_users: dict[str, UserAccount],
        tenants_by_id: dict[str, Tenant],
        tenants_by_schema: dict[str, Tenant],
        only_tenant: str,
    ) -> list[ReconcileItem]:
        items: list[ReconcileItem] = []
        for user in source_users.values():
            role = str(user.role or "").strip().lower()
            if role not in TENANT_ROLES:
                continue

            tenant_schema = ""
            reason = ""

            if user.tenant_id:
                tenant = tenants_by_id.get(str(user.tenant_id))
                if tenant:
                    tenant_schema = str(tenant.schema_name).strip().lower()
                    reason = "tenant_fk"

            if not tenant_schema and _looks_like_tenant_email(user.email):
                inferred = _subdomain_from_email(user.email)
                tenant = tenants_by_schema.get(inferred)
                if tenant:
                    tenant_schema = str(tenant.schema_name).strip().lower()
                    reason = "email_domain"

            if not tenant_schema:
                continue

            if only_tenant and tenant_schema != only_tenant:
                continue

            items.append(
                ReconcileItem(
                    source_user_id=str(user.user_id),
                    email=user.email,
                    role=role,
                    tenant_schema=tenant_schema,
                    reason=reason,
                )
            )

        return items

    def _reconcile_user(
        self,
        *,
        source_user: UserAccount,
        tenant: Tenant,
        apply_changes: bool,
        update_existing: bool,
        deactivate_source: bool,
        reason: str,
    ) -> str:
        with schema_context(tenant.schema_name):
            existing_by_email = UserAccount.objects.filter(
                email__iexact=source_user.email
            ).first()

            if existing_by_email:
                if not update_existing:
                    self.stdout.write(
                        f"SKIP {source_user.email} -> {tenant.schema_name} (already exists, reason={reason})"
                    )
                    return "skipped"

                if apply_changes:
                    self._copy_mutable_fields(
                        source_user, existing_by_email, tenant=tenant
                    )
                    existing_by_email.save()
                    _ensure_role_profile(existing_by_email.role, existing_by_email)
                    self._deactivate_source_if_needed(
                        source_user=source_user,
                        apply_changes=apply_changes,
                        deactivate_source=deactivate_source,
                    )
                self.stdout.write(
                    f"UPDATE {source_user.email} -> {tenant.schema_name} (reason={reason})"
                )
                return "updated"

            username = source_user.username
            if UserAccount.objects.filter(username=username).exists():
                username = self._unique_username(base=username, email=source_user.email)

            if apply_changes:
                migrated_user = UserAccount(
                    user_id=source_user.user_id,
                    password=source_user.password,
                    last_login=source_user.last_login,
                    is_superuser=source_user.is_superuser,
                    username=username,
                    first_name=source_user.first_name,
                    last_name=source_user.last_name,
                    email=source_user.email,
                    is_staff=source_user.is_staff,
                    is_active=source_user.is_active,
                    date_joined=source_user.date_joined,
                    tenant_id=tenant.id,
                    role=source_user.role,
                    phone_number=source_user.phone_number,
                    address=source_user.address,
                    bio=source_user.bio,
                    date_of_birth=source_user.date_of_birth,
                    is_2fa_enabled=source_user.is_2fa_enabled,
                    two_factor_secret=source_user.two_factor_secret,
                )
                try:
                    migrated_user.save(force_insert=True)
                except IntegrityError:
                    # Fallback for rare UUID collision or stale partial migrate.
                    migrated_user = UserAccount.objects.filter(
                        email__iexact=source_user.email
                    ).first()
                    if migrated_user is None:
                        raise
                    self._copy_mutable_fields(source_user, migrated_user, tenant=tenant)
                    migrated_user.save()
                _ensure_role_profile(migrated_user.role, migrated_user)
                self._deactivate_source_if_needed(
                    source_user=source_user,
                    apply_changes=apply_changes,
                    deactivate_source=deactivate_source,
                )

            self.stdout.write(
                f"MOVE {source_user.email} -> {tenant.schema_name} (reason={reason})"
            )
            return "moved"

    def _copy_mutable_fields(
        self, source: UserAccount, target: UserAccount, *, tenant: Tenant
    ) -> None:
        target.password = source.password
        target.last_login = source.last_login
        target.first_name = source.first_name
        target.last_name = source.last_name
        target.is_staff = source.is_staff
        target.is_active = source.is_active
        target.role = source.role
        target.phone_number = source.phone_number
        target.address = source.address
        target.bio = source.bio
        target.date_of_birth = source.date_of_birth
        target.is_2fa_enabled = source.is_2fa_enabled
        target.two_factor_secret = source.two_factor_secret
        target.tenant_id = tenant.id

    def _deactivate_source_if_needed(
        self,
        *,
        source_user: UserAccount,
        apply_changes: bool,
        deactivate_source: bool,
    ) -> None:
        if not (apply_changes and deactivate_source):
            return
        with schema_context("public"):
            source = UserAccount.objects.filter(user_id=source_user.user_id).first()
            if source:
                source.is_active = False
                source.save(update_fields=["is_active"])

    def _unique_username(self, *, base: str, email: str) -> str:
        candidate = (base or "").strip()
        if not candidate:
            candidate = (
                email.split("@", 1)[0] if "@" in email else "user"
            ).strip() or "user"

        candidate = candidate[:140]
        if not UserAccount.objects.filter(username=candidate).exists():
            return candidate

        suffix = 1
        while suffix < 10000:
            next_candidate = f"{candidate[:130]}_{suffix}"
            if not UserAccount.objects.filter(username=next_candidate).exists():
                return next_candidate
            suffix += 1
        return f"{candidate[:120]}_migrated"
