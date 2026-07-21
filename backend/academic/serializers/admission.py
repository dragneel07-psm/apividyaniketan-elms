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

    def validate(self, attrs):
        """Only the conversion action may mark an enquiry as converted.

        A plain create/update previously allowed ``status=converted`` without
        creating a UserAccount or Student profile. That produced admissions
        which looked converted in the pipeline but could never appear in the
        student directory.
        """
        attrs = super().validate(attrs)
        target_status = attrs.get(
            "status", getattr(self.instance, "status", None)
        )
        linked_student_id = (
            getattr(self.instance, "converted_student_id", None)
            if self.instance is not None
            else None
        )
        if target_status == "converted" and not linked_student_id:
            raise serializers.ValidationError(
                {
                    "status": (
                        "Use the Convert to Student action. It creates the student "
                        "account and links it to this admission."
                    )
                }
            )
        return attrs
