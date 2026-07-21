# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import os
from dataclasses import dataclass
from urllib.parse import urlsplit

from django.core.management.base import BaseCommand, CommandError
from django.db import connection, transaction
from django_tenants.utils import schema_context

from academic.models import AcademicClass, Section, Student, Teacher
from billing.models_saas import Subscription, SubscriptionPlan
from core.models.tenant import Domain, Tenant
from users.models import UserAccount


@dataclass(frozen=True)
class SeedConfig:
    schema_name: str
    school_name: str
    students: int
    teachers: int
    staff: int
    admin_email: str
    admin_password: str
    teacher_password: str
    staff_password: str
    student_password: str
    base_domain: str


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
        "Deletes all non-public tenants and reseeds a single demo tenant "
        "with requested user counts."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--schema", default="demo", help="Demo tenant schema/subdomain."
        )
        parser.add_argument(
            "--name", default="Demo School", help="Demo tenant display name."
        )
        parser.add_argument("--students", type=int, default=200)
        parser.add_argument("--teachers", type=int, default=30)
        parser.add_argument("--staff", type=int, default=5)
        parser.add_argument("--admin-email", default="admin@demo.school")
        parser.add_argument("--admin-password", default="Admin@12345")
        parser.add_argument("--teacher-password", default="Teacher@12345")
        parser.add_argument("--staff-password", default="Staff@12345")
        parser.add_argument("--student-password", default="Student@12345")
        parser.add_argument(
            "--base-domain",
            default=os.environ.get("BASE_DOMAIN", "localhost"),
            help="Base domain used for demo tenant primary domain mapping.",
        )
        parser.add_argument(
            "--confirm",
            action="store_true",
            help="Required flag. Confirms destructive reset of all non-public tenants.",
        )

    def handle(self, *args, **options):
        if not options["confirm"]:
            raise CommandError("Destructive command blocked. Re-run with --confirm.")

        if connection.vendor != "postgresql":
            raise CommandError(
                "This command requires PostgreSQL (django-tenants schemas)."
            )

        config = SeedConfig(
            schema_name=str(options["schema"]).strip().lower(),
            school_name=str(options["name"]).strip() or "Demo School",
            students=max(int(options["students"]), 0),
            teachers=max(int(options["teachers"]), 0),
            staff=max(int(options["staff"]), 0),
            admin_email=str(options["admin_email"]).strip().lower(),
            admin_password=str(options["admin_password"]),
            teacher_password=str(options["teacher_password"]),
            staff_password=str(options["staff_password"]),
            student_password=str(options["student_password"]),
            base_domain=str(options["base_domain"]).strip(),
        )

        if not config.schema_name or config.schema_name == "public":
            raise CommandError("--schema must be a non-public schema name.")
        if not config.admin_email:
            raise CommandError("--admin-email is required.")

        self.stdout.write(self.style.WARNING("Resetting all non-public tenants..."))
        removed = self._delete_non_public_tenants()
        self.stdout.write(
            self.style.SUCCESS(f"Removed {removed} non-public tenant(s).")
        )

        demo_tenant = self._create_or_update_demo_tenant(config)
        self._seed_demo_users(demo_tenant, config)
        self._ensure_trial_subscription(demo_tenant)

        self.stdout.write(self.style.SUCCESS("Demo tenant setup complete."))
        self.stdout.write(
            f"Tenant: {demo_tenant.name} | schema={demo_tenant.schema_name} | domain={_build_tenant_domain(config.schema_name, config.base_domain)}"
        )
        self.stdout.write("Credentials:")
        self.stdout.write(f"  Admin:   {config.admin_email} / {config.admin_password}")
        self.stdout.write(
            f"  Teachers: teacher1@demo.school .. teacher{config.teachers}@demo.school / {config.teacher_password}"
        )
        self.stdout.write(
            f"  Staff:   staff1@demo.school .. staff{config.staff}@demo.school / {config.staff_password}"
        )
        self.stdout.write(
            f"  Students: student1@demo.school .. student{config.students}@demo.school / {config.student_password}"
        )

    def _delete_non_public_tenants(self) -> int:
        tenants = list(
            Tenant.objects.exclude(schema_name="public").order_by("schema_name")
        )
        removed = 0
        connection.set_schema_to_public()

        for tenant in tenants:
            schema_name = str(tenant.schema_name or "").strip()
            tenant_label = f"{tenant.name} ({schema_name})"
            self.stdout.write(f" - removing {tenant_label}")

            with transaction.atomic():
                Domain.objects.filter(tenant=tenant).delete()

                # Drop schema first so tenant-scoped data cannot remain orphaned.
                if schema_name and schema_name != "public":
                    quoted_schema = connection.ops.quote_name(schema_name)
                    with connection.cursor() as cursor:
                        cursor.execute(f"DROP SCHEMA IF EXISTS {quoted_schema} CASCADE")

                tenant.delete()
                removed += 1

        return removed

    def _create_or_update_demo_tenant(self, config: SeedConfig) -> Tenant:
        tenant, created = Tenant.objects.update_or_create(
            schema_name=config.schema_name,
            defaults={
                "name": config.school_name,
                "subdomain": config.schema_name,
                "type": "standard",
                "status": "active",
                "contact_email": config.admin_email,
                "current_academic_year": "2025-2026",
            },
        )

        if created:
            self.stdout.write(
                self.style.SUCCESS(f"Created tenant {tenant.schema_name}.")
            )
        else:
            self.stdout.write(
                self.style.WARNING(
                    f"Tenant {tenant.schema_name} already existed; updated metadata."
                )
            )
            # Ensure schema exists in case of metadata-only row restore.
            tenant.create_schema(check_if_exists=True, verbosity=0)

        domain = _build_tenant_domain(config.schema_name, config.base_domain)
        Domain.objects.update_or_create(
            domain=domain,
            defaults={"tenant": tenant, "is_primary": True},
        )
        self.stdout.write(self.style.SUCCESS(f"Mapped domain: {domain}"))
        return tenant

    def _seed_demo_users(self, tenant: Tenant, config: SeedConfig) -> None:
        with schema_context(tenant.schema_name):
            # Enforce exact role counts by clearing the tenant user table first.
            UserAccount.objects.all().delete()

            grade_10, _ = AcademicClass.objects.get_or_create(
                name="Grade 10",
                defaults={"order": 10},
            )
            section_a, _ = Section.objects.get_or_create(
                name="A",
                academic_class=grade_10,
                defaults={"capacity": max(config.students, 40)},
            )

            admin_user = self._upsert_user(
                tenant=tenant,
                email=config.admin_email,
                username="demo_admin",
                first_name="Demo",
                last_name="Admin",
                role="admin",
                password=config.admin_password,
                is_staff=True,
            )

            for idx in range(1, config.staff + 1):
                self._upsert_user(
                    tenant=tenant,
                    email=f"staff{idx}@demo.school",
                    username=f"demo_staff_{idx}",
                    first_name=f"Staff{idx}",
                    last_name="User",
                    role="staff",
                    password=config.staff_password,
                    is_staff=True,
                )

            for idx in range(1, config.teachers + 1):
                user = self._upsert_user(
                    tenant=tenant,
                    email=f"teacher{idx}@demo.school",
                    username=f"demo_teacher_{idx}",
                    first_name=f"Teacher{idx}",
                    last_name="User",
                    role="teacher",
                    password=config.teacher_password,
                    is_staff=False,
                )
                Teacher.objects.update_or_create(
                    user=user,
                    defaults={"designation": "subject_teacher"},
                )

            for idx in range(1, config.students + 1):
                user = self._upsert_user(
                    tenant=tenant,
                    email=f"student{idx}@demo.school",
                    username=f"demo_student_{idx}",
                    first_name=f"Student{idx}",
                    last_name="User",
                    role="student",
                    password=config.student_password,
                    is_staff=False,
                )
                Student.objects.update_or_create(
                    user=user,
                    defaults={
                        "academic_class": grade_10,
                        "section": section_a,
                    },
                )

            self.stdout.write(
                self.style.SUCCESS(
                    "Seeded tenant users "
                    f"(admin=1, staff={config.staff}, teachers={config.teachers}, students={config.students})."
                )
            )
            self.stdout.write(f"Tenant admin user id: {admin_user.pk}")

    def _upsert_user(
        self,
        tenant: Tenant,
        email: str,
        username: str,
        first_name: str,
        last_name: str,
        role: str,
        password: str,
        is_staff: bool,
    ) -> UserAccount:
        user = UserAccount.objects.filter(email=email).first()
        if user is None:
            user = UserAccount(email=email)

        user.username = username
        user.email = email
        user.first_name = first_name
        user.last_name = last_name
        user.role = role
        user.tenant = tenant
        user.is_active = True
        user.is_staff = bool(is_staff)
        user.is_superuser = False
        user.set_password(password)
        user.save()
        return user

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
