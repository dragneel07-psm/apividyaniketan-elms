# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Run the golden-set evaluations against the live AI provider.

    python manage.py run_ai_evals
    python manage.py run_ai_evals --min-pass-rate 0.9 --json

Exits non-zero when the pass rate falls below --min-pass-rate, so this can
gate model/prompt changes in CI (requires OPENAI_API_KEY / provider config).
"""

import json

from django.core.management.base import BaseCommand

from ai_engine.evals.runner import load_cases, run_eval


class Command(BaseCommand):
    help = "Run golden-set AI evaluations (grading) against the configured provider."

    def add_arguments(self, parser):
        parser.add_argument(
            "--min-pass-rate",
            type=float,
            default=0.8,
            help="Fail (exit 1) when pass rate is below this fraction. Default: 0.8",
        )
        parser.add_argument(
            "--json",
            action="store_true",
            help="Emit machine-readable JSON instead of a table.",
        )

    def handle(self, *args, **options):
        from ai_engine.services.ai_client import provider_ready
        from ai_engine.services.grading_service import grading_service

        if not provider_ready():
            self.stdout.write(
                self.style.WARNING(
                    "AI provider is not configured/enabled — evals skipped. "
                    "Set OPENAI_API_KEY (or SaaS provider settings) to run."
                )
            )
            return

        cases = load_cases()
        summary = run_eval(cases, grading_service.grade_submission)

        if options["json"]:
            self.stdout.write(json.dumps(summary, indent=2))
        else:
            for item in summary["results"]:
                status = (
                    self.style.SUCCESS("PASS")
                    if item["passed"]
                    else self.style.ERROR("FAIL")
                )
                line = f"{status}  {item['id']}  score={item['score']}"
                if item["reasons"]:
                    line += "  — " + "; ".join(item["reasons"])
                self.stdout.write(line)
            self.stdout.write(
                f"\n{summary['passed']}/{summary['total']} passed "
                f"(pass rate {summary['pass_rate']:.0%})"
            )

        if summary["pass_rate"] < options["min_pass_rate"]:
            raise SystemExit(1)
