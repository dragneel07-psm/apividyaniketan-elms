# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from __future__ import annotations

from django.core.management.base import BaseCommand, CommandError

from ai_engine.services.indexing_service import index_content_for_tenant


class Command(BaseCommand):
    help = "Index lesson/chapter/material content into RAG chunks for a tenant."

    def add_arguments(self, parser):
        parser.add_argument(
            "--tenant",
            type=str,
            required=True,
            help="Tenant schema, subdomain, or domain (e.g. demo, demo.localhost).",
        )

    def handle(self, *args, **options):
        tenant_identifier = str(options.get("tenant") or "").strip()
        if not tenant_identifier:
            raise CommandError("--tenant is required")

        try:
            summary = index_content_for_tenant(tenant_identifier)
        except ValueError as exc:
            raise CommandError(str(exc)) from exc
        except Exception as exc:
            raise CommandError(f"Indexing failed: {exc}") from exc

        self.stdout.write(
            self.style.SUCCESS(
                (
                    "Indexed content successfully | "
                    f"tenant={summary.tenant_schema} "
                    f"sources={summary.source_documents} "
                    f"chunks={summary.chunks_indexed} "
                    f"provider={summary.provider}"
                )
            )
        )
