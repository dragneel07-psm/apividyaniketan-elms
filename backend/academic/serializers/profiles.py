# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import serializers

from ..models import AcademicClass, Parent, Section, Student, Subject, Teacher
from ..services.academic_year_service import ensure_current_academic_year

User = get_user_model()


class TeacherSerializer(serializers.ModelSerializer):
    # UUID PK
    id = serializers.UUIDField(source="teacher_id", read_only=True)

    # Read-only fields from User
    user_id = serializers.UUIDField(source="user.user_id", read_only=True)
    email = serializers.EmailField(source="user.email")
    username = serializers.CharField(source="user.username", required=False)
    first_name = serializers.CharField(source="user.first_name")
    last_name = serializers.CharField(source="user.last_name")
    is_active = serializers.BooleanField(source="user.is_active", read_only=True)

    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = Teacher
        fields = [
            "id",
            "user_id",
            "email",
            "username",
            "first_name",
            "last_name",
            "password",
            "assigned_classes",
            "is_active",
            "designation",
        ]

    def create(self, validated_data):
        user_data = validated_data.pop("user", {})
        email = user_data.get("email")
        username = user_data.get("username", email.split("@")[0])
        first_name = user_data.get("first_name", "")
        last_name = user_data.get("last_name", "")
        password = validated_data.pop("password", "Teacher@123")

        assigned_classes = validated_data.pop("assigned_classes", [])

        request = self.context.get("request")
        tenant = getattr(request, "tenant", None) if request else None

        with transaction.atomic():
            user = User.objects.create_user(
                email=email,
                username=username,
                password=password,
                first_name=first_name,
                last_name=last_name,
                role="teacher",
                tenant=tenant,
            )

            teacher = Teacher.objects.create(user=user, **validated_data)
            if assigned_classes:
                teacher.assigned_classes.set(assigned_classes)

            return teacher

    def update(self, instance, validated_data):
        user_data = validated_data.pop("user", {})
        user = instance.user

        if "email" in user_data:
            user.email = user_data["email"]
        if "first_name" in user_data:
            user.first_name = user_data["first_name"]
        if "last_name" in user_data:
            user.last_name = user_data["last_name"]
        if user_data:
            user.save()

        if "assigned_classes" in validated_data:
            instance.assigned_classes.set(validated_data["assigned_classes"])

        return super().update(instance, validated_data)


# --- Student Serializers ---


class StudentUserSerializer(serializers.ModelSerializer):
    """Serializer for the User part of a Student"""

    class Meta:
        model = User
        fields = [
            "user_id",
            "username",
            "email",
            "first_name",
            "last_name",
            "phone_number",
            "date_of_birth",
        ]
        read_only_fields = ["user_id"]


class StudentAccountFieldsMixin(serializers.Serializer):
    """Shared flattened account fields for student payloads.

    Uses SerializerMethodFields for all user-sourced data so that orphaned
    Student records (user deleted but Student row still exists, possible when
    db_constraint=False) never cause a 500 — they simply return None.
    """

    id = serializers.UUIDField(source="student_id", read_only=True)
    user = StudentUserSerializer(read_only=True)
    class_name = serializers.CharField(source="academic_class.name", read_only=True)
    section_name = serializers.CharField(source="section.name", read_only=True)

    # Safe user-field accessors ------------------------------------------------
    user_id = serializers.SerializerMethodField()
    username = serializers.SerializerMethodField()
    email = serializers.SerializerMethodField()
    first_name = serializers.SerializerMethodField()
    last_name = serializers.SerializerMethodField()
    is_active = serializers.SerializerMethodField()

    def _user(self, obj):
        try:
            return obj.user
        except Exception:
            return None

    def get_user_id(self, obj):
        u = self._user(obj)
        return str(u.user_id) if u else None

    def get_username(self, obj):
        u = self._user(obj)
        return u.username if u else None

    def get_email(self, obj):
        u = self._user(obj)
        return u.email if u else None

    def get_first_name(self, obj):
        u = self._user(obj)
        return u.first_name if u else None

    def get_last_name(self, obj):
        u = self._user(obj)
        return u.last_name if u else None

    def get_is_active(self, obj):
        u = self._user(obj)
        return u.is_active if u else False


class StudentListSerializer(StudentAccountFieldsMixin, serializers.ModelSerializer):
    """Lightweight serializer for listing students"""

    student_id = serializers.UUIDField(read_only=True)  # Explicitly include student_id

    attendance_percentage = serializers.SerializerMethodField()
    recent_grades = serializers.SerializerMethodField()
    upcoming_assessments = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = [
            "id",
            "student_id",
            "user",
            "user_id",
            "username",
            "email",
            "first_name",
            "last_name",
            "is_active",
            "academic_class",
            "class_name",
            "section",
            "section_name",
            "learning_style",
            "daily_study_goal",
            "ai_explanation_level",
            "language_preference",
            "current_streak",
            "total_minutes_learned",
            "focus_score",
            "attendance_percentage",
            "recent_grades",
            "upcoming_assessments",
        ]

    def get_attendance_percentage(self, obj):
        try:
            from datetime import timedelta

            from django.utils import timezone

            from academic.models import Attendance

            thirty_days_ago = timezone.now() - timedelta(days=30)
            records = Attendance.objects.filter(student=obj, date__gte=thirty_days_ago)
            if not records.exists():
                return 100
            present = records.filter(status="present").count()
            total = records.count()
            return round((present / total) * 100) if total else 100
        except Exception:
            return 100

    def get_recent_grades(self, obj):
        try:
            from academic.models import Result

            results_qs = Result.objects.filter(student=obj).select_related(
                "assessment", "assessment__subject"
            )
            current_year = ensure_current_academic_year()
            if current_year:
                results_qs = results_qs.filter(assessment__academic_year=current_year)
            results = results_qs.order_by("-submitted_at")[:3]
            return [
                {
                    "assessment_title": r.assessment.title,
                    "subject": r.assessment.subject.name,
                    "score": r.score,
                    "total_marks": r.assessment.total_marks,
                    "percentage": (
                        round((r.score / r.assessment.total_marks) * 100, 1)
                        if r.assessment.total_marks
                        else 0
                    ),
                    "date": r.submitted_at.date() if r.submitted_at else None,
                }
                for r in results
            ]
        except Exception:
            return []

    def get_upcoming_assessments(self, obj):
        try:
            from django.db.models import Q
            from django.utils import timezone

            from academic.models import Assessment

            now = timezone.now()
            upcoming = Assessment.objects.filter(
                subject__academic_class=obj.academic_class,
            ).filter(Q(scheduled_at__gte=now) | Q(due_date__gte=now))
            current_year = ensure_current_academic_year()
            if current_year:
                upcoming = upcoming.filter(academic_year=current_year)
            upcoming = upcoming.order_by("scheduled_at", "due_date")[:3]
            return [
                {
                    "title": a.title,
                    "subject": a.subject.name,
                    "date": a.scheduled_at or a.due_date,
                    "type": a.type,
                }
                for a in upcoming
            ]
        except Exception:
            return []


class StudentDetailSerializer(StudentAccountFieldsMixin, serializers.ModelSerializer):
    """Detailed serializer for student profile"""

    class Meta:
        model = Student
        fields = [
            "id",
            "student_id",
            "user",
            "user_id",
            "username",
            "email",
            "first_name",
            "last_name",
            "is_active",
            "academic_class",
            "class_name",
            "section",
            "section_name",
            "learning_style",
            "daily_study_goal",
            "ai_explanation_level",
            "language_preference",
            "current_streak",
            "total_minutes_learned",
            "focus_score",
        ]


class StudentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a new student with user account"""

    # User fields
    email = serializers.EmailField(write_only=True)
    password = serializers.CharField(write_only=True, min_length=6)
    first_name = serializers.CharField(write_only=True)
    last_name = serializers.CharField(write_only=True)
    phone_number = serializers.CharField(
        write_only=True, required=False, allow_blank=True
    )
    date_of_birth = serializers.DateField(
        write_only=True, required=False, allow_null=True
    )

    # Include user in response
    user = StudentUserSerializer(read_only=True)

    id = serializers.UUIDField(source="student_id", read_only=True)

    class Meta:
        model = Student
        fields = [
            "id",
            "student_id",
            "email",
            "password",
            "first_name",
            "last_name",
            "phone_number",
            "date_of_birth",
            "academic_class",
            "section",
            "learning_style",
            "daily_study_goal",
            "ai_explanation_level",
            "language_preference",
            "user",
        ]
        read_only_fields = ["id", "student_id"]

    def validate_email(self, value):
        """
        Validate email with tenant/role-aware messaging.
        Allows reusing an existing same-tenant student user if profile does not yet exist.
        """
        normalized_email = (value or "").strip().lower()
        existing_user = (
            User.objects.filter(email__iexact=normalized_email)
            .select_related("tenant")
            .first()
        )
        if not existing_user:
            return normalized_email

        request = self.context.get("request")
        current_tenant = None
        if request:
            current_tenant = getattr(request, "tenant", None) or getattr(
                getattr(request, "user", None), "tenant", None
            )

        if (
            current_tenant
            and existing_user.tenant_id
            and existing_user.tenant_id != current_tenant.pk
        ):
            raise serializers.ValidationError(
                "This email already belongs to a user in another school tenant."
            )

        if existing_user.role != "student":
            role_label = (existing_user.role or "user").replace("_", " ")
            raise serializers.ValidationError(
                f"This email is already used by a {role_label} account."
            )

        existing_student = (
            Student.objects.select_related("academic_class", "section")
            .filter(user=existing_user)
            .first()
        )
        if existing_student:
            class_name = (
                existing_student.academic_class.name
                if existing_student.academic_class
                else None
            )
            section_name = (
                existing_student.section.name if existing_student.section else None
            )
            location_bits = [bit for bit in [class_name, section_name] if bit]
            location = f" ({' / '.join(location_bits)})" if location_bits else ""
            raise serializers.ValidationError(
                f"A student with this email already exists in this school{location}."
            )

        # Existing student user without profile is allowed and will be linked in create().
        return normalized_email

    def validate(self, data):
        """Ensure section belongs to the selected class"""
        if data.get("section") and data.get("academic_class"):
            if data["section"].academic_class != data["academic_class"]:
                raise serializers.ValidationError(
                    {"section": "This section does not belong to the selected class."}
                )
        return data

    def create(self, validated_data):
        """Create both User and Student in a transaction"""

        # Extract user fields
        email = validated_data.pop("email")
        password = validated_data.pop("password")
        first_name = validated_data.pop("first_name")
        last_name = validated_data.pop("last_name")
        phone_number = validated_data.pop("phone_number", "")
        date_of_birth = validated_data.pop("date_of_birth", None)

        with transaction.atomic():
            # Get tenant from request context
            request = self.context.get("request")
            tenant = getattr(request, "tenant", None) if request else None
            user = User.objects.filter(email__iexact=email).first()
            if user:
                if tenant and user.tenant_id and user.tenant_id != tenant.pk:
                    raise serializers.ValidationError(
                        {
                            "email": "This email already belongs to another school tenant."
                        }
                    )
                if user.role != "student":
                    raise serializers.ValidationError(
                        {
                            "email": f"This email is already used by a {user.role.replace('_', ' ')} account."
                        }
                    )
                if Student.objects.filter(user=user).exists():
                    raise serializers.ValidationError(
                        {
                            "email": "A student with this email already exists in this school."
                        }
                    )

                # Reuse the existing student user and sync profile fields.
                user.first_name = first_name
                user.last_name = last_name
                user.phone_number = phone_number
                user.date_of_birth = date_of_birth
                if tenant and not user.tenant_id:
                    user.tenant = tenant
                if password:
                    user.set_password(password)
                user.save()
            else:
                # Generate username from email
                username = email.split("@")[0]
                base_username = username
                counter = 1
                while User.objects.filter(username=username).exists():
                    username = f"{base_username}{counter}"
                    counter += 1

                # Create user account
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    password=password,
                    first_name=first_name,
                    last_name=last_name,
                    phone_number=phone_number,
                    date_of_birth=date_of_birth,
                    role="student",
                    tenant=tenant,
                )

            # Create student profile
            student = Student.objects.create(user=user, **validated_data)

        return student


class StudentUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating student profile (excluding user creation)"""

    class Meta:
        model = Student
        fields = [
            "academic_class",
            "section",
            "learning_style",
            "daily_study_goal",
            "ai_explanation_level",
            "language_preference",
            "current_streak",
            "total_minutes_learned",
            "focus_score",
        ]

    def validate(self, data):
        """Ensure section belongs to the selected class"""
        instance = self.instance
        academic_class = data.get("academic_class", instance.academic_class)
        section = data.get("section", instance.section)

        if section and academic_class:
            if section.academic_class != academic_class:
                raise serializers.ValidationError(
                    {"section": "This section does not belong to the selected class."}
                )
        return data


class ParentSerializer(serializers.ModelSerializer):
    user = StudentUserSerializer(read_only=True)
    students = StudentListSerializer(many=True, read_only=True)
    id = serializers.UUIDField(source="parent_id", read_only=True)

    class Meta:
        model = Parent
        fields = ["id", "parent_id", "user", "students"]
