# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import os
from urllib.parse import urlsplit

from django.core.management.base import BaseCommand, CommandError
from django.db import connection

from billing.models_saas import Subscription, SubscriptionPlan
from billing.plan_defaults import upsert_default_plans
from core.models.tenant import Domain, Tenant


def _normalize_host(value: str) -> str:
    host = (value or "").strip().lower()
    if not host:
        return ""
    if "://" in host:
        parsed = urlsplit(host)
        host = parsed.netloc or parsed.path
    return host.split("/", 1)[0].split(":", 1)[0].strip(".")


def _build_tenant_domain(schema_name: str, base_domain: str) -> str:
    normalized = _normalize_host(base_domain) or "localhost"
    if normalized in {"localhost", "127.0.0.1"}:
        return f"{schema_name}.localhost"
    return f"{schema_name}.{normalized}"


class Command(BaseCommand):
    help = (
        "Idempotently provisions a single school tenant, its domain, and a "
        "trial subscription. Purely additive — never touches other tenants."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--schema", default="apividyaniketan", help="Tenant schema/subdomain."
        )
        parser.add_argument(
            "--name", default="Api Vidya Niketan", help="Tenant display name."
        )
        parser.add_argument(
            "--base-domain",
            default=os.environ.get("BASE_DOMAIN", "localhost"),
            help="Base domain used to build the tenant's primary domain mapping.",
        )
        parser.add_argument(
            "--contact-email",
            default="",
            help="Tenant contact email (defaults to admin@{schema}.local).",
        )

    def handle(self, *args, **options):
        if connection.vendor != "postgresql":
            raise CommandError(
                "This command requires PostgreSQL (django-tenants schemas)."
            )

        schema = str(options["schema"]).strip().lower()
        name = str(options["name"]).strip() or "Api Vidya Niketan"
        base_domain = str(options["base_domain"]).strip()
        contact_email = (
            str(options.get("contact_email") or "").strip().lower()
            or f"admin@{schema}.local"
        )

        if not schema or schema == "public":
            raise CommandError("--schema must be a non-public schema name.")

        tenant, created = Tenant.objects.update_or_create(
            schema_name=schema,
            defaults={
                "name": name,
                "subdomain": schema,
                "type": "standard",
                "status": "active",
                "contact_email": contact_email,
                "current_academic_year": "2025-2026",
            },
        )

        if created:
            self.stdout.write(self.style.SUCCESS(f"Created tenant {tenant.schema_name}."))
        else:
            self.stdout.write(
                self.style.WARNING(
                    f"Tenant {tenant.schema_name} already existed; updated metadata."
                )
            )
            # Ensure schema exists in case of metadata-only row restore.
            tenant.create_schema(check_if_exists=True, verbosity=0)

        domain = _build_tenant_domain(schema, base_domain)
        Domain.objects.update_or_create(
            domain=domain,
            defaults={"tenant": tenant, "is_primary": True},
        )
        self.stdout.write(self.style.SUCCESS(f"Mapped domain: {domain}"))

        upsert_default_plans()
        self._ensure_trial_subscription(tenant)

        self.stdout.write(self.style.SUCCESS("Tenant provisioning complete."))
        self.stdout.write(
            f"Tenant: {tenant.name} | schema={tenant.schema_name} | domain={domain}"
        )

    def _ensure_trial_subscription(self, tenant: Tenant) -> None:
        plan = (
            SubscriptionPlan.objects.filter(is_active=True)
            .order_by("price_monthly", "name")
            .first()
        )
        if not plan:
            self.stdout.write(
                self.style.WARNING(
                    "No active subscription plan found; skipping subscription seed."
                )
            )
            return

        Subscription.objects.update_or_create(
            tenant=tenant,
            defaults={
                "plan": plan,
                "status": "trial",
                "billing_cycle": "monthly",
                "student_limit": max(plan.student_limit, 200),
                "storage_limit_gb": plan.storage_limit_gb,
                "ai_token_limit": plan.ai_token_limit,
            },
        )
        self.stdout.write(
            self.style.SUCCESS(f"Assigned trial subscription plan: {plan.name}")
        )
