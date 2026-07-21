# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from __future__ import annotations

from django.core.management.base import BaseCommand, CommandError
from django_tenants.utils import schema_context

from academic.models import Parent, Student, Teacher
from core.models import Tenant
from users.models import UserAccount

ROLE_CHOICES = {"student", "teacher", "parent", "admin", "staff", "saas_admin"}


def _ensure_role_profile(role: str, user: UserAccount) -> None:
    if role == "student":
        Student.objects.get_or_create(user=user)
    elif role == "teacher":
        Teacher.objects.get_or_create(user=user)
    elif role == "parent":
        Parent.objects.get_or_create(user=user)


class Command(BaseCommand):
    help = "Create or update a tenant user directly in a tenant schema."

    def add_arguments(self, parser):
        parser.add_argument(
            "--schema", required=True, help="Tenant schema name (e.g. demo)."
        )
        parser.add_argument("--email", required=True, help="User email.")
        parser.add_argument("--password", required=True, help="User password.")
        parser.add_argument(
            "--role",
            default="student",
            help="Role (student/teacher/parent/admin/staff/saas_admin).",
        )
        parser.add_argument("--first-name", default="Demo", help="First name.")
        parser.add_argument("--last-name", default="User", help="Last name.")
        parser.add_argument(
            "--username", default="", help="Optional username. Defaults from email."
        )
        parser.add_argument(
            "--inactive",
            action="store_true",
            help="Mark account inactive (default is active).",
        )

    def handle(self, *args, **options):
        schema = str(options["schema"]).strip().lower()
        email = str(options["email"]).strip().lower()
        password = str(options["password"])
        role = str(options.get("role") or "student").strip().lower()
        first_name = str(options.get("first_name") or "Demo").strip() or "Demo"
        last_name = str(options.get("last_name") or "User").strip() or "User"
        username = str(options.get("username") or "").strip()
        is_active = not bool(options.get("inactive"))

        if role not in ROLE_CHOICES:
            raise CommandError(f"Invalid role '{role}'.")
        if not schema or schema == "public":
            raise CommandError("--schema must be a non-public tenant schema.")

        tenant = Tenant.objects.filter(schema_name=schema).first()
        if not tenant:
            raise CommandError(f"Tenant schema '{schema}' not found.")

        if not username:
            username = email.split("@", 1)[0]

        with schema_context(schema):
            user = UserAccount.objects.filter(email__iexact=email).first()
            created = False

            if user is None:
                if UserAccount.objects.filter(username=username).exists():
                    base = username[:120]
                    suffix = 1
                    while suffix < 10000:
                        candidate = f"{base}_{suffix}"
                        if not UserAccount.objects.filter(username=candidate).exists():
                            username = candidate
                            break
                        suffix += 1
                user = UserAccount(
                    email=email,
                    username=username,
                )
                created = True

            user.first_name = first_name
            user.last_name = last_name
            user.role = role
            user.is_staff = role in {"admin", "staff", "saas_admin"}
            user.is_active = is_active
            user.tenant_id = tenant.id
            user.set_password(password)
            user.save()
            _ensure_role_profile(role, user)

        action = "CREATED" if created else "UPDATED"
        self.stdout.write(
            self.style.SUCCESS(
                f"{action} user {email} in schema={schema} role={role} active={is_active}"
            )
        )
