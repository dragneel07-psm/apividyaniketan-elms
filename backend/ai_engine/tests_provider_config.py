# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from types import SimpleNamespace
from unittest.mock import patch

from django.test import SimpleTestCase

from ai_engine.services.provider_config import (
    OPENROUTER_BASE_URL,
    OPENROUTER_FALLBACK_MODEL,
    build_provider_headers,
    get_ai_provider_config,
    resolve_provider_and_base_url,
)


class ProviderConfigTests(SimpleTestCase):
    def test_openrouter_key_rewrites_openai_default_base_url(self):
        provider, base_url = resolve_provider_and_base_url(
            provider_name="",
            base_url="https://api.openai.com/v1",
            api_key="sk-or-demo-key",
        )
        self.assertEqual(provider, "OpenRouter")
        self.assertEqual(base_url, OPENROUTER_BASE_URL)

    def test_openai_key_rewrites_openrouter_base_url(self):
        provider, base_url = resolve_provider_and_base_url(
            provider_name="",
            base_url="https://openrouter.ai/api/v1",
            api_key="sk-demo-key",
        )
        self.assertEqual(provider, "OpenAI")
        self.assertEqual(base_url, "https://api.openai.com/v1")

    @patch.dict("os.environ", {}, clear=True)
    @patch("ai_engine.services.provider_config.GlobalSettings.objects.first")
    def test_get_ai_provider_config_applies_openrouter_fallback_model(self, mock_first):
        mock_first.return_value = SimpleNamespace(
            ai_provider_name="",
            ai_base_url="https://api.openai.com/v1",
            ai_model="gpt-3.5-turbo",
            ai_api_key="sk-or-demo-key",
            ai_enabled=True,
        )

        config = get_ai_provider_config()

        self.assertEqual(config["provider_name"], "OpenRouter")
        self.assertEqual(config["base_url"], OPENROUTER_BASE_URL)
        self.assertEqual(config["model"], OPENROUTER_FALLBACK_MODEL)
        self.assertTrue(config["configured"])
        self.assertIn("HTTP-Referer", config["request_headers"])
        self.assertIn("X-Title", config["request_headers"])

    def test_build_provider_headers_empty_for_non_openrouter(self):
        self.assertEqual(build_provider_headers("OpenAI"), {})
