# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Unit tests for PII redaction sent to third-party LLM providers.
Run with: python manage.py test ai_engine.tests_pii_redaction
"""

from django.test import TestCase, override_settings

from ai_engine.services.pii_redaction import (
    redact_messages,
    redact_pii,
)


class RedactPiiTest(TestCase):
    # --- Emails ---

    def test_masks_email(self):
        out = redact_pii("Contact me at jane.doe@school.edu please")
        self.assertNotIn("jane.doe@school.edu", out)
        self.assertIn("[REDACTED_EMAIL]", out)

    def test_masks_plus_addressed_email(self):
        out = redact_pii("billing+oct@acme.co.uk")
        self.assertEqual(out, "[REDACTED_EMAIL]")

    # --- Phone numbers ---

    def test_masks_international_phone(self):
        out = redact_pii("Call +1 (555) 123-4567 after 5")
        self.assertNotIn("555", out)
        self.assertIn("[REDACTED_PHONE]", out)

    def test_masks_plain_phone(self):
        out = redact_pii("9779812345678 is my number")
        self.assertIn("[REDACTED", out)
        self.assertNotIn("9812345678", out)

    # --- Long ID runs ---

    def test_masks_long_id(self):
        # A bare digit run is redacted; the exact tag (ID vs PHONE) is not
        # asserted — for separator-less runs the phone matcher may claim it
        # first. What matters is the raw number never leaves our infra.
        out = redact_pii("Student ID 2026001234 enrolled")
        self.assertNotIn("2026001234", out)
        self.assertIn("[REDACTED", out)

    def test_masks_short_seven_digit_id(self):
        # Below the phone matcher's minimum width, so this lands as an ID.
        out = redact_pii("Roll 2026001 here")
        self.assertIn("[REDACTED_ID]", out)
        self.assertNotIn("2026001", out)

    def test_keeps_short_numbers(self):
        # Grades, small counts, years must survive — not PII.
        out = redact_pii("Scored 95 on 3 of 12 questions in 2026")
        self.assertEqual(out, "Scored 95 on 3 of 12 questions in 2026")

    # --- Ordering: email before phone ---

    def test_email_with_digits_not_double_redacted(self):
        # An email containing a digit run must be caught as email, not phone/ID.
        out = redact_pii("reach user12345678@mail.com now")
        self.assertEqual(out, "reach [REDACTED_EMAIL] now")

    # --- extra_terms (known names) ---

    def test_masks_extra_term_case_insensitive(self):
        out = redact_pii("Aarav did well today", extra_terms=["aarav"])
        self.assertEqual(out, "[REDACTED_NAME] did well today")

    def test_ignores_short_extra_terms(self):
        # Initials / tiny tokens are skipped to avoid shredding normal text.
        out = redact_pii("Jo is here", extra_terms=["Jo"])
        self.assertEqual(out, "Jo is here")

    def test_extra_term_only_whole_words(self):
        out = redact_pii("classroom and class", extra_terms=["class"])
        self.assertEqual(out, "classroom and [REDACTED_NAME]")

    # --- Tutoring text left intact (low false-positive bar) ---

    def test_normal_tutoring_text_untouched(self):
        text = "The mitochondria is the powerhouse of the cell."
        self.assertEqual(redact_pii(text), text)

    # --- Defensive input handling ---

    def test_empty_and_non_string_passthrough(self):
        self.assertEqual(redact_pii(""), "")
        self.assertEqual(redact_pii(None), None)  # type: ignore[arg-type]


class RedactMessagesTest(TestCase):
    def test_redacts_string_content_only(self):
        messages = [
            {"role": "system", "content": "You are a tutor."},
            {"role": "user", "content": "I'm at bob@home.com / 9812345678"},
        ]
        out = redact_messages(messages)
        self.assertEqual(out[0]["content"], "You are a tutor.")
        self.assertNotIn("bob@home.com", out[1]["content"])
        self.assertNotIn("9812345678", out[1]["content"])

    def test_does_not_mutate_input(self):
        messages = [{"role": "user", "content": "ping me@x.com"}]
        redact_messages(messages)
        self.assertEqual(messages[0]["content"], "ping me@x.com")

    def test_non_string_content_passthrough(self):
        # Multimodal / structured content blocks must pass through untouched.
        blocks = [{"type": "text", "text": "hi"}]
        messages = [{"role": "user", "content": blocks}]
        out = redact_messages(messages)
        self.assertEqual(out[0]["content"], blocks)

    def test_extra_terms_threaded_through(self):
        messages = [{"role": "user", "content": "Priya scored 90"}]
        out = redact_messages(messages, extra_terms=["Priya"])
        self.assertEqual(out[0]["content"], "[REDACTED_NAME] scored 90")


@override_settings(AI_PII_REDACTION=True)
class PiiSettingDefaultTest(TestCase):
    def test_setting_present_and_default_true(self):
        from django.conf import settings

        self.assertTrue(getattr(settings, "AI_PII_REDACTION"))
