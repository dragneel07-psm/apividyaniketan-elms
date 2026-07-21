# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from rest_framework import serializers

from ..models.notice import Notice


class NoticeSerializer(serializers.ModelSerializer):
    attachment_url = serializers.SerializerMethodField()
    published_date = serializers.DateTimeField(
        format="%Y-%m-%d %H:%M:%S", read_only=True
    )
    expiry_date = serializers.DateTimeField(format="%Y-%m-%d %H:%M:%S", required=False)
    notice_id = serializers.IntegerField(source="id", read_only=True)
    is_read = serializers.SerializerMethodField()

    class Meta:
        model = Notice
        fields = [
            "id",
            "notice_id",
            "title",
            "content",
            "category",
            "priority",
            "target_audience",
            "target_class",
            "target_student",
            "published_date",
            "expiry_date",
            "attachment",
            "attachment_url",
            "is_read",
        ]

    def get_attachment_url(self, obj):
        if obj.attachment:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.attachment.url)
            return obj.attachment.url
        return None

    def get_is_read(self, obj):
        # Annotated by NoticeViewSet.get_queryset() for the current user.
        return bool(getattr(obj, "_is_read", False))
