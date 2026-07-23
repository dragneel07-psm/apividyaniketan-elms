# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from __future__ import annotations

from django.core.management.base import BaseCommand, CommandError

from ai_engine.services.indexing_service import index_all_content


class Command(BaseCommand):
    help = "Index lesson/chapter/material content into RAG chunks."

    def handle(self, *args, **options):
        try:
            summary = index_all_content()
        except Exception as exc:
            raise CommandError(f"Indexing failed: {exc}") from exc

        self.stdout.write(
            self.style.SUCCESS(
                (
                    "Indexed content successfully | "
                    f"sources={summary.source_documents} "
                    f"chunks={summary.chunks_indexed} "
                    f"provider={summary.provider}"
                )
            )
        )
