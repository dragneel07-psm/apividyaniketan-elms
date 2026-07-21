# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from rest_framework import serializers

from academic.models import AdmissionEnquiry


class AdmissionEnquirySerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="enquiry_id", read_only=True)
    desired_class_name = serializers.CharField(
        source="desired_class.name", read_only=True
    )
    converted_student_name = serializers.CharField(
        source="converted_student.user.get_full_name", read_only=True
    )
    handled_by_name = serializers.CharField(
        source="handled_by.get_full_name", read_only=True
    )

    class Meta:
        model = AdmissionEnquiry
        fields = [
            "id",
            "enquiry_id",
            "tenant",
            "first_name",
            "last_name",
            "guardian_name",
            "email",
            "phone_number",
            "desired_class",
            "desired_class_name",
            "desired_section_name",
            "status",
            "source",
            "notes",
            "follow_up_date",
            "converted_student",
            "converted_student_name",
            "handled_by",
            "handled_by_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "tenant",
            "converted_student",
            "handled_by",
            "created_at",
            "updated_at",
        ]
