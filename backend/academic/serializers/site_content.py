# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.utils.text import slugify
from rest_framework import serializers

from ..models.site_content import (
    AdmissionFaq,
    CoreValue,
    FieldTrip,
    GalleryItem,
    HistoryMilestone,
    NewsArticle,
    Program,
    StudentLifeActivity,
    Testimonial,
    WellbeingSupport,
)


class ImageURLMixin(serializers.Serializer):
    image_url = serializers.SerializerMethodField()

    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None


class NewsArticleSerializer(ImageURLMixin, serializers.ModelSerializer):
    class Meta:
        model = NewsArticle
        fields = [
            "id",
            "title",
            "slug",
            "excerpt",
            "body",
            "category",
            "published_date",
            "image",
            "image_url",
            "order",
            "is_active",
        ]
        extra_kwargs = {"slug": {"required": False}, "image": {"write_only": True}}

    def _unique_slug(self, base_slug, instance=None):
        candidate = base_slug
        suffix = 1
        qs = NewsArticle.objects.filter(slug=candidate)
        if instance is not None:
            qs = qs.exclude(pk=instance.pk)
        while qs.exists():
            suffix += 1
            candidate = f"{base_slug}-{suffix}"
            qs = NewsArticle.objects.filter(slug=candidate)
            if instance is not None:
                qs = qs.exclude(pk=instance.pk)
        return candidate

    def create(self, validated_data):
        base_slug = slugify(validated_data.get("slug") or validated_data["title"])
        validated_data["slug"] = self._unique_slug(base_slug)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if "slug" in validated_data:
            base_slug = slugify(validated_data["slug"] or instance.title)
            validated_data["slug"] = self._unique_slug(base_slug, instance=instance)
        return super().update(instance, validated_data)


class GalleryItemSerializer(ImageURLMixin, serializers.ModelSerializer):
    class Meta:
        model = GalleryItem
        fields = [
            "id",
            "caption",
            "category",
            "image",
            "image_url",
            "order",
            "is_active",
        ]
        extra_kwargs = {"image": {"write_only": True}}


class TestimonialSerializer(ImageURLMixin, serializers.ModelSerializer):
    class Meta:
        model = Testimonial
        fields = ["id", "quote", "name", "role", "image", "image_url", "order", "is_active"]
        extra_kwargs = {"image": {"write_only": True}}


class ProgramSerializer(ImageURLMixin, serializers.ModelSerializer):
    class Meta:
        model = Program
        fields = ["id", "title", "description", "icon", "image", "image_url", "order", "is_active"]
        extra_kwargs = {"image": {"write_only": True}}


class CoreValueSerializer(ImageURLMixin, serializers.ModelSerializer):
    class Meta:
        model = CoreValue
        fields = ["id", "title", "description", "image", "image_url", "order", "is_active"]
        extra_kwargs = {"image": {"write_only": True}}


class HistoryMilestoneSerializer(ImageURLMixin, serializers.ModelSerializer):
    class Meta:
        model = HistoryMilestone
        fields = ["id", "year", "title", "description", "image", "image_url", "order", "is_active"]
        extra_kwargs = {"image": {"write_only": True}}


class StudentLifeActivitySerializer(ImageURLMixin, serializers.ModelSerializer):
    class Meta:
        model = StudentLifeActivity
        fields = ["id", "name", "description", "category", "image", "image_url", "order", "is_active"]
        extra_kwargs = {"image": {"write_only": True}}


class FieldTripSerializer(ImageURLMixin, serializers.ModelSerializer):
    class Meta:
        model = FieldTrip
        fields = ["id", "title", "description", "grade_band", "image", "image_url", "order", "is_active"]
        extra_kwargs = {"image": {"write_only": True}}


class WellbeingSupportSerializer(ImageURLMixin, serializers.ModelSerializer):
    class Meta:
        model = WellbeingSupport
        fields = ["id", "title", "description", "image", "image_url", "order", "is_active"]
        extra_kwargs = {"image": {"write_only": True}}


class AdmissionFaqSerializer(ImageURLMixin, serializers.ModelSerializer):
    class Meta:
        model = AdmissionFaq
        fields = ["id", "question", "answer", "image", "image_url", "order", "is_active"]
        extra_kwargs = {"image": {"write_only": True}}
