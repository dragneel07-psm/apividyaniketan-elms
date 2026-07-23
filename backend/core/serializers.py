# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
# core/serializers.py
from rest_framework import serializers

from .models import AuditLog, GlobalSettings


class AuditLogSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField()  # Display username

    class Meta:
        model = AuditLog
        fields = "__all__"


class GlobalSettingsSerializer(serializers.ModelSerializer):
    ai_provider_name = serializers.CharField(
        required=False, allow_blank=True, trim_whitespace=True
    )
    ai_base_url = serializers.URLField(required=False, allow_blank=True)
    ai_model = serializers.CharField(
        required=False, allow_blank=True, trim_whitespace=True
    )
    auto_detect_model = serializers.BooleanField(
        write_only=True, required=False, default=True
    )
    ai_api_key = serializers.CharField(
        write_only=True, required=False, allow_blank=True, trim_whitespace=True
    )
    ai_api_key_masked = serializers.SerializerMethodField(read_only=True)
    ai_api_key_configured = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = GlobalSettings
        fields = [
            "id",
            "site_name",
            "maintenance_mode",
            "support_email",
            "default_language",
            "ai_enabled",
            "ai_provider_name",
            "ai_base_url",
            "ai_model",
            "auto_detect_model",
            "ai_api_key",
            "ai_api_key_masked",
            "ai_api_key_configured",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "updated_at",
            "ai_api_key_masked",
            "ai_api_key_configured",
        ]

    def get_ai_api_key_masked(self, obj):
        key = (obj.ai_api_key or "").strip()
        if not key:
            return ""
        if len(key) <= 8:
            return "*" * len(key)
        return f"{key[:4]}...{key[-4:]}"

    def get_ai_api_key_configured(self, obj):
        return bool((obj.ai_api_key or "").strip())

    def validate_ai_base_url(self, value):
        cleaned_value = (value or "").strip()
        if not cleaned_value:
            return "https://api.openai.com/v1"
        return cleaned_value.rstrip("/")

    def validate(self, attrs):
        provider_name = attrs.get("ai_provider_name")
        model_name = attrs.get("ai_model")

        if provider_name is not None and not str(provider_name).strip():
            attrs["ai_provider_name"] = "OpenAI"

        if model_name is not None and not str(model_name).strip():
            attrs["ai_model"] = "gpt-3.5-turbo"

        return attrs

    def update(self, instance, validated_data):
        auto_detect_model = bool(validated_data.pop("auto_detect_model", True))
        incoming_key = validated_data.pop("ai_api_key", None)
        base_url_changed = "ai_base_url" in validated_data

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        key_updated = False
        # Preserve existing key when empty/blank payload is sent.
        if incoming_key is not None:
            cleaned_key = incoming_key.strip()
            if cleaned_key:
                instance.ai_api_key = cleaned_key
                key_updated = True

        # Auto-detect provider/model when a new key is set or base_url changes with existing key.
        if (
            auto_detect_model
            and instance.ai_api_key
            and (key_updated or base_url_changed)
        ):
            try:
                from ai_engine.services.model_discovery import detect_provider_and_model

                detected = detect_provider_and_model(
                    api_key=instance.ai_api_key,
                    base_url=instance.ai_base_url,
                )

                detected_provider = (detected.get("provider_name") or "").strip()
                detected_base_url = (detected.get("base_url") or "").strip().rstrip("/")
                detected_model = (detected.get("model") or "").strip()

                if detected_provider:
                    instance.ai_provider_name = detected_provider
                if detected_base_url:
                    instance.ai_base_url = detected_base_url
                if detected_model:
                    instance.ai_model = detected_model
            except Exception:
                # Never fail settings save because model discovery failed.
                pass

        instance.save()
        return instance
