# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.db import models


class GlobalSettings(models.Model):
    """
    Singleton model to store global system settings for the SaaS platform.
    Examples: Maintenance mode, site name, support email.
    """

    site_name = models.CharField(max_length=255, default="E-Learning SaaS")
    maintenance_mode = models.BooleanField(
        default=False, help_text="If active, only admins can access the site."
    )
    allow_registration = models.BooleanField(
        default=True, help_text="Allow new tenants/schools to register."
    )
    support_email = models.EmailField(default="support@example.com")
    default_language = models.CharField(
        max_length=10,
        default="en",
        choices=[("en", "English"), ("es", "Spanish"), ("fr", "French")],
    )
    ai_enabled = models.BooleanField(
        default=True, help_text="Enable or disable AI features globally."
    )
    ai_provider_name = models.CharField(
        max_length=100,
        default="OpenAI",
        help_text="Display name of the configured AI provider.",
    )
    ai_base_url = models.URLField(
        default="https://api.openai.com/v1",
        help_text="Base URL for OpenAI-compatible API provider.",
    )
    ai_model = models.CharField(
        max_length=100,
        default="gpt-3.5-turbo",
        help_text="Default AI model used across services.",
    )
    ai_api_key = models.TextField(
        blank=True, default="", help_text="Secret API key for AI provider."
    )

    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        # Ensure only one instance exists
        if not self.pk and GlobalSettings.objects.exists():
            # If you try to save a new instance but one exists, update the existing one instead
            existing = GlobalSettings.objects.first()
            self.pk = existing.pk
        return super(GlobalSettings, self).save(*args, **kwargs)

    def __str__(self):
        return "Global Settings"

    class Meta:
        verbose_name = "Global Settings"
        verbose_name_plural = "Global Settings"
