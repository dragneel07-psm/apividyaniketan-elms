# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.db import transaction
from django.db.models import Count, Q
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from core.mixins import TenantScopedQuerysetMixin
from users.models import UserAccount

from ..models import AcademicClass, AdmissionEnquiry, Section, Student
from ..serializers.admission import AdmissionEnquirySerializer


class AdmissionEnquiryViewSet(TenantScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = AdmissionEnquiry.objects.select_related(
        "desired_class",
        "converted_student__user",
        "handled_by",
        "tenant",
    ).all()
    serializer_class = AdmissionEnquirySerializer
    permission_classes = [permissions.IsAuthenticated]

    def _is_admission_manager(self, user):
        return bool(
            user
            and user.is_authenticated
            and (
                user.is_superuser
                or getattr(user, "role", None)
                in ["admin", "staff", "saas_admin", "management"]
            )
        )

    def get_queryset(self):
        queryset = super().get_queryset()
        status_param = self.request.query_params.get("status")
        source_param = self.request.query_params.get("source")
        class_param = self.request.query_params.get("desired_class")
        query = self.request.query_params.get("q")

        if status_param:
            queryset = queryset.filter(status=status_param)
        if source_param:
            queryset = queryset.filter(source=source_param)
        if class_param:
            queryset = queryset.filter(desired_class_id=class_param)
        if query:
            queryset = queryset.filter(
                Q(first_name__icontains=query)
                | Q(last_name__icontains=query)
                | Q(guardian_name__icontains=query)
                | Q(email__icontains=query)
                | Q(phone_number__icontains=query)
            )
        return queryset

    def perform_create(self, serializer):
        tenant = self.get_tenant()
        if tenant is None:
            raise ValidationError(
                {"tenant": "Tenant context is required to create admissions."}
            )
        serializer.save(tenant=tenant, handled_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(handled_by=self.request.user)

    @action(detail=False, methods=["get"])
    def pipeline(self, request):
        queryset = self.get_queryset()
        counts = {
            row["status"]: row["total"]
            for row in queryset.values("status").annotate(total=Count("enquiry_id"))
        }

        payload = {}
        for key, label in AdmissionEnquiry.STATUS_CHOICES:
            payload[key] = {
                "label": label,
                "count": int(counts.get(key, 0)),
            }
        payload["total"] = int(queryset.count())
        return Response(payload)

    @action(detail=True, methods=["post"])
    def convert_to_student(self, request, pk=None):
        if not self._is_admission_manager(request.user):
            raise PermissionDenied(
                "Only admin/staff can convert enquiries into students."
            )

        enquiry = self.get_object()
        if enquiry.converted_student_id:
            return Response(
                {
                    "detail": "Enquiry already converted.",
                    "student_id": str(enquiry.converted_student_id),
                },
                status=status.HTTP_200_OK,
            )

        tenant = self.get_tenant()
        if tenant is None:
            raise ValidationError(
                {"tenant": "Tenant context is required for conversion."}
            )

        email = (request.data.get("email") or enquiry.email or "").strip().lower()
        password = request.data.get("password") or "Student@123"
        first_name = request.data.get("first_name") or enquiry.first_name
        last_name = request.data.get("last_name") or enquiry.last_name
        phone_number = request.data.get("phone_number") or enquiry.phone_number

        class_id = (
            request.data.get("academic_class")
            or request.data.get("desired_class")
            or enquiry.desired_class_id
        )
        if not class_id:
            raise ValidationError(
                {"academic_class": "academic_class is required for conversion."}
            )
        academic_class = AcademicClass.objects.filter(pk=class_id).first()
        if not academic_class:
            raise ValidationError({"academic_class": "Selected class does not exist."})

        section = None
        section_id = request.data.get("section")
        if section_id:
            section = Section.objects.filter(
                pk=section_id, academic_class=academic_class
            ).first()
            if section is None:
                raise ValidationError(
                    {"section": "Section does not belong to selected class."}
                )
        elif enquiry.desired_section_name:
            section = Section.objects.filter(
                academic_class=academic_class,
                name__iexact=enquiry.desired_section_name,
            ).first()

        if not email:
            raise ValidationError(
                {"email": "email is required for student account creation."}
            )

        def _build_username(base_text):
            base = (base_text or "student").split("@")[0].strip().lower() or "student"
            candidate = base
            suffix = 1
            while UserAccount.objects.filter(username=candidate).exists():
                candidate = f"{base}{suffix}"
                suffix += 1
            return candidate

        with transaction.atomic():
            user = UserAccount.objects.filter(email__iexact=email).first()

            if user:
                if user.tenant_id and user.tenant_id != tenant.pk:
                    raise ValidationError(
                        {"email": "Email belongs to a different school tenant."}
                    )
                if user.role != "student":
                    raise ValidationError(
                        {"email": f"Email already belongs to a {user.role} account."}
                    )

                user.first_name = first_name
                user.last_name = last_name
                user.phone_number = phone_number
                if not user.tenant_id:
                    user.tenant = tenant
                if request.data.get("password"):
                    user.set_password(password)
                user.save()
            else:
                username = request.data.get("username") or _build_username(email)
                if UserAccount.objects.filter(username=username).exists():
                    username = _build_username(username)
                user = UserAccount.objects.create_user(
                    username=username,
                    email=email,
                    password=password,
                    first_name=first_name,
                    last_name=last_name,
                    phone_number=phone_number,
                    role="student",
                    tenant=tenant,
                )

            student = Student.objects.filter(user=user).first()
            if student is None:
                student = Student.objects.create(
                    user=user,
                    academic_class=academic_class,
                    section=section,
                )
            else:
                student.academic_class = academic_class
                student.section = section
                student.save(update_fields=["academic_class", "section"])

            enquiry.status = "converted"
            enquiry.email = email
            enquiry.phone_number = phone_number
            enquiry.desired_class = academic_class
            enquiry.converted_student = student
            enquiry.handled_by = request.user
            enquiry.save(
                update_fields=[
                    "status",
                    "email",
                    "phone_number",
                    "desired_class",
                    "converted_student",
                    "handled_by",
                    "updated_at",
                ]
            )

        return Response(
            {
                "detail": "Enquiry converted to student successfully.",
                "student_id": str(student.student_id),
                "enquiry": self.get_serializer(enquiry).data,
            },
            status=status.HTTP_200_OK,
        )
