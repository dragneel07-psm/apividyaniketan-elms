# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import os
from urllib.parse import urlsplit

from django.core.management.base import BaseCommand

from core.models.tenant import Domain, Tenant


def _csv_env_list(key: str) -> list[str]:
    raw = os.environ.get(key, "")
    return [item.strip() for item in raw.split(",") if item.strip()]


def _normalize_domain(value: str) -> str:
    host = (value or "").strip().lower()
    if not host:
        return ""
    if "://" in host:
        parsed = urlsplit(host)
        host = parsed.netloc or parsed.path
    host = host.split("/", 1)[0].split(":", 1)[0].strip(".")
    return host


class Command(BaseCommand):
    help = "Initializes the production public tenant and domain"

    def handle(self, *args, **options):
        self.stdout.write("Checking for public tenant...")

        # 1. Ensure Public Tenant exists
        tenant, created = Tenant.objects.get_or_create(
            schema_name="public",
            defaults={
                "name": "Global Admin App",
                "type": "premium",
                "status": "active",
            },
        )

        if created:
            self.stdout.write(self.style.SUCCESS("✅ Created public tenant."))
        else:
            self.stdout.write(self.style.NOTICE("ℹ️ Public tenant already exists."))

        # 2. Ensure public domains exist (dynamic from env + legacy fallback + localhost).
        candidates = [
            os.environ.get("PRIMARY_PUBLIC_DOMAIN", ""),
            os.environ.get("RAILWAY_PUBLIC_DOMAIN", ""),
            os.environ.get("RAILWAY_SERVICE_E_LEARNINGWEBAPP_URL", ""),
            "e-learningwebapp-production-1112.up.railway.app",  # legacy fallback
        ]
        candidates.extend(_csv_env_list("PUBLIC_DOMAINS"))
        candidates.extend(["localhost", "127.0.0.1"])

        domains: list[str] = []
        seen: set[str] = set()
        for candidate in candidates:
            domain = _normalize_domain(candidate)
            if not domain or domain in seen:
                continue
            domains.append(domain)
            seen.add(domain)

        primary_domain = next(
            (d for d in domains if d not in {"localhost", "127.0.0.1"}), "localhost"
        )

        for d in domains:
            domain, d_created = Domain.objects.update_or_create(
                domain=d,
                defaults={"tenant": tenant, "is_primary": (d == primary_domain)},
            )
            if d_created:
                self.stdout.write(self.style.SUCCESS(f"✅ Created domain: {d}"))
            else:
                self.stdout.write(
                    self.style.SUCCESS(f"✅ Verified/Updated domain: {d}")
                )

        # 3. Backfill default subdomain domains for existing non-public tenants.
        # This keeps historical tenants reachable even if they were created before BASE_DOMAIN was set.
        base_domain = _normalize_domain(os.environ.get("BASE_DOMAIN", ""))
        if base_domain:
            tenant_defaults_created = 0
            tenant_defaults_verified = 0
            tenant_defaults_skipped = 0
            tenant_defaults_errors = 0

            for school_tenant in Tenant.objects.exclude(schema_name="public").all():
                subdomain = (
                    str(getattr(school_tenant, "subdomain", "") or "").strip().lower()
                )
                if not subdomain:
                    tenant_defaults_skipped += 1
                    continue
                expected_domain = f"{subdomain}.{base_domain}"

                # Keep existing custom primary domain unchanged; default subdomain domain can be secondary.
                has_primary = Domain.objects.filter(
                    tenant=school_tenant, is_primary=True
                ).exists()
                try:
                    _, created = Domain.objects.update_or_create(
                        domain=expected_domain,
                        defaults={
                            "tenant": school_tenant,
                            "is_primary": not has_primary,
                        },
                    )
                    if created:
                        tenant_defaults_created += 1
                        self.stdout.write(
                            self.style.SUCCESS(
                                f"✅ Created default tenant domain: {expected_domain} -> {school_tenant.schema_name}"
                            )
                        )
                    else:
                        tenant_defaults_verified += 1
                except Exception as exc:
                    tenant_defaults_errors += 1
                    self.stdout.write(
                        self.style.WARNING(
                            f"⚠️ Could not upsert tenant domain {expected_domain}: {exc}"
                        )
                    )

            self.stdout.write(
                self.style.NOTICE(
                    "ℹ️ Tenant domain backfill summary: "
                    f"created={tenant_defaults_created}, "
                    f"verified={tenant_defaults_verified}, "
                    f"skipped_no_subdomain={tenant_defaults_skipped}, "
                    f"errors={tenant_defaults_errors}"
                )
            )
        else:
            self.stdout.write(
                self.style.WARNING(
                    "⚠️ BASE_DOMAIN is not set; skipped tenant default-domain backfill."
                )
            )

        self.stdout.write(self.style.SUCCESS("🚀 Production initialization complete."))
