# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
# pyright: reportMissingTypeStubs=false

from typing import Any, Protocol, cast
from unittest.mock import MagicMock, patch

from django.conf import settings
from django.test import override_settings
from django_tenants.test.cases import FastTenantTestCase
from django_tenants.utils import tenant_context
from rest_framework import status
from rest_framework.test import APIClient

from ai_engine.models import ContentChunk
from core.models.tenant import Domain, Tenant
from users.models import UserAccount


class ResponseLike(Protocol):
    status_code: int
    data: dict[str, Any]


class APIClientLike(Protocol):
    def force_authenticate(
        self, user: UserAccount | None = None, token: Any | None = None
    ) -> None: ...

    def post(
        self, path: str, data: Any = None, format: str | None = None, **kwargs: Any
    ) -> ResponseLike: ...


def _payload(response: ResponseLike) -> dict[str, Any]:
    return response.data


class TutorChatApiTests(FastTenantTestCase):
    @classmethod
    def setup_tenant(cls, tenant: Tenant) -> None:
        tenant.name = "Tutor API School"

    @classmethod
    def setup_domain(cls, domain: Domain) -> None:
        domain.is_primary = True

    def setUp(self) -> None:
        dimensions = max(1, int(getattr(settings, "AI_EMBEDDING_DIMENSIONS", 1536)))
        tenant = cast(Tenant, self.tenant)
        with tenant_context(tenant):
            self.user = cast(
                UserAccount,
                UserAccount.objects.create_user(
                    username="rag_student",
                    email="rag_student@example.com",
                    password="RagStudent@123",
                    role="student",
                    tenant=tenant,
                ),
            )
            ContentChunk.objects.create(
                tenant=tenant,
                source_type="lesson",
                source_id="lesson-1",
                text="Newton's first law states that an object remains at rest or in uniform motion unless acted upon by a net force.",
                metadata={"lesson_id": "lesson-1", "chapter_id": "chapter-1"},
                embedding=[0.01] * dimensions,
            )

        self.client = cast(
            APIClientLike, APIClient(HTTP_HOST=str(self.get_test_tenant_domain()))
        )
        self.client.force_authenticate(user=self.user)

    @override_settings(AI_TUTOR_MIN_SIMILARITY=-1.0)
    @patch("ai_engine.services.rag_tutor_service.RAGTutorService._call_chat_model")
    def test_tutor_chat_returns_answer_sources_and_usage(
        self, mock_call_chat_model: MagicMock
    ) -> None:
        mock_call_chat_model.return_value = (
            "Newton's first law means objects keep their current motion unless a force changes it.",
            {
                "model": "gpt-4o-mini",
                "prompt_tokens": 42,
                "completion_tokens": 18,
            },
        )

        dimensions = max(1, int(getattr(settings, "AI_EMBEDDING_DIMENSIONS", 1536)))
        with patch(
            "ai_engine.services.rag_tutor_service.RAGTutorService._embed_query",
            return_value=[0.01] * dimensions,
        ):
            response = self.client.post(
                "/api/ai/tutor/chat/",
                {
                    "message": "Explain Newton's first law.",
                    "context": {"lesson_id": "lesson-1", "chapter_id": "chapter-1"},
                },
                format="json",
            )
        payload = _payload(response)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("answer", payload)
        self.assertIn("sources", payload)
        self.assertIn("usage", payload)
        self.assertTrue(payload["answer"])
        sources = cast(list[dict[str, Any]], payload["sources"])
        usage = cast(dict[str, Any], payload["usage"])
        self.assertGreaterEqual(len(sources), 1)
        self.assertEqual(sources[0]["source_type"], "lesson")
        self.assertEqual(sources[0]["source_id"], "lesson-1")
        self.assertEqual(usage["model"], "gpt-4o-mini")
        self.assertEqual(usage["prompt_tokens"], 42)
        self.assertEqual(usage["completion_tokens"], 18)

    @patch(
        "ai_engine.services.rag_tutor_service.RAGTutorService.retrieve_relevant_chunks",
        return_value=[],
    )
    @patch("ai_engine.services.rag_tutor_service.RAGTutorService._call_chat_model")
    def test_tutor_chat_uses_general_answer_when_no_grounding_context_is_requested(
        self,
        mock_call_chat_model: MagicMock,
        _mock_retrieve_relevant_chunks: MagicMock,
    ) -> None:
        mock_call_chat_model.return_value = (
            "Here is a quick Grade 10 algebra quiz outline with five questions and an answer key.",
            {
                "model": "gpt-4o-mini",
                "prompt_tokens": 30,
                "completion_tokens": 20,
            },
        )

        response = self.client.post(
            "/api/ai/tutor/chat/",
            {
                "message": "Generate a 5-question multiple choice quiz on Algebra for Grade 10 with answers.",
                "conversation_history": [
                    {"role": "user", "content": "I need a classroom-ready quiz."},
                ],
            },
            format="json",
        )
        payload = _payload(response)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("answer", payload)
        self.assertNotIn(
            "I’m not sure from the available context.", cast(str, payload["answer"])
        )
        self.assertEqual(cast(dict[str, Any], payload["usage"])["model"], "gpt-4o-mini")
        self.assertEqual(cast(list[Any], payload["sources"]), [])
        self.assertFalse(cast(bool, payload["is_demo"]))
        self.assertEqual(payload["fallback_reason"], "general_llm")
