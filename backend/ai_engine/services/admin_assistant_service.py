# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from __future__ import annotations

import json
import re
from datetime import timedelta
from decimal import Decimal
from typing import Any, Callable

from django.conf import settings
from django.db.models import Avg, Count, ExpressionWrapper, F, FloatField, Q, Sum
from django.db.models.functions import Coalesce
from django.utils import timezone

from academic.models import Attendance, Result, Student
from billing.models_school import Expense, Payment, StudentFee

from .rag_tutor_service import RAGTutorService


class AdminAssistantService:
    ALLOWED_QUERY_TYPES = {"attendance", "fees", "students", "performance", "overview"}

    def __init__(self, *, tenant, user=None):
        self.tenant = tenant
        self.user = user
        self.lookback_days = int(
            getattr(settings, "AI_ADMIN_ASSISTANT_LOOKBACK_DAYS", 30)
        )
        self.use_llm_classifier = self._as_bool(
            getattr(settings, "AI_ADMIN_ASSISTANT_USE_LLM_CLASSIFIER", False)
        )
        self.use_llm_response = self._as_bool(
            getattr(settings, "AI_ADMIN_ASSISTANT_USE_LLM_RESPONSE", False)
        )
        self.rag = RAGTutorService(tenant=tenant)

    @staticmethod
    def _as_amount(value: Any) -> float:
        try:
            return round(float(value or 0), 2)
        except Exception:
            return 0.0

    @staticmethod
    def _as_bool(value: Any) -> bool:
        if isinstance(value, bool):
            return value
        text = str(value or "").strip().lower()
        return text in {"1", "true", "yes", "on"}

    @staticmethod
    def _extract_json(raw: str) -> dict[str, Any] | None:
        if not isinstance(raw, str):
            return None
        candidate = raw.strip()
        if not candidate:
            return None
        fenced = re.search(
            r"```(?:json)?\s*(\{.*\}|\[.*\])\s*```",
            candidate,
            re.DOTALL | re.IGNORECASE,
        )
        if fenced:
            candidate = fenced.group(1).strip()
        try:
            payload = json.loads(candidate)
        except Exception:
            return None
        return payload if isinstance(payload, dict) else None

    def _normalize_query_type(self, value: Any) -> str:
        candidate = str(value or "").strip().lower()
        alias_map = {
            "student": "students",
            "enrollment": "students",
            "enrolment": "students",
            "admissions": "students",
            "billing": "fees",
            "fee": "fees",
            "payment": "fees",
            "finance": "fees",
            "grades": "performance",
            "grade": "performance",
            "results": "performance",
            "result": "performance",
        }
        candidate = alias_map.get(candidate, candidate)
        return candidate if candidate in self.ALLOWED_QUERY_TYPES else "overview"

    def _rule_classify(self, question: str) -> str:
        q = str(question or "").strip().lower()
        if not q:
            return "overview"

        if any(
            token in q
            for token in (
                "fee",
                "fees",
                "payment",
                "collection",
                "invoice",
                "dues",
                "outstanding",
                "revenue",
                "expense",
            )
        ):
            return "fees"
        if any(
            token in q
            for token in (
                "attendance",
                "absent",
                "present",
                "late",
                "leave",
                "attendance rate",
            )
        ):
            return "attendance"
        if any(
            token in q
            for token in (
                "student",
                "students",
                "enrollment",
                "enrolment",
                "admission",
                "class strength",
            )
        ):
            return "students"
        if any(
            token in q
            for token in (
                "grade",
                "grades",
                "result",
                "results",
                "performance",
                "pass rate",
                "fail",
            )
        ):
            return "performance"
        return "overview"

    def _llm_classify_intent(self, question: str) -> str | None:
        if not self.use_llm_classifier:
            return None

        messages = [
            {
                "role": "system",
                "content": (
                    "Classify school ERP query intent. Return strict JSON only with key query_type. "
                    "Allowed values: attendance, fees, students, performance, overview."
                ),
            },
            {"role": "user", "content": f"Question: {question}"},
        ]
        text, _usage = self.rag._call_chat_model(messages)
        parsed = self._extract_json(text)
        if not parsed:
            return None
        return self._normalize_query_type(parsed.get("query_type"))

    def _classify_intent(self, question: str) -> str:
        llm_value = self._llm_classify_intent(question)
        if llm_value:
            return llm_value
        return self._rule_classify(question)

    def _tool_students(self) -> dict[str, Any]:
        base_qs = Student.objects.filter(user__tenant=self.tenant).select_related(
            "academic_class"
        )
        total_students = base_qs.count()
        students_without_class = base_qs.filter(academic_class__isnull=True).count()
        new_students_last_30_days = base_qs.filter(
            user__date_joined__gte=timezone.now() - timedelta(days=30)
        ).count()

        class_rows = (
            base_qs.filter(academic_class__isnull=False)
            .values("academic_class_id", "academic_class__name")
            .annotate(student_count=Count("student_id"))
            .order_by("-student_count", "academic_class__name")[:10]
        )
        class_distribution = [
            {
                "class_id": row["academic_class_id"],
                "class_name": row["academic_class__name"],
                "student_count": int(row["student_count"]),
            }
            for row in class_rows
        ]

        return {
            "total_students": int(total_students),
            "students_without_class": int(students_without_class),
            "new_students_last_30_days": int(new_students_last_30_days),
            "class_distribution": class_distribution,
        }

    def _tool_attendance(self) -> dict[str, Any]:
        end_date = timezone.localdate()
        start_date = end_date - timedelta(days=self.lookback_days)
        present_like_statuses = ["present", "late", "excused"]

        attendance_qs = Attendance.objects.filter(
            date__gte=start_date,
            date__lte=end_date,
            student__user__tenant=self.tenant,
        )
        total_records = attendance_qs.count()
        present_like = attendance_qs.filter(status__in=present_like_statuses).count()
        absent_count = attendance_qs.filter(status="absent").count()
        late_count = attendance_qs.filter(status="late").count()
        attendance_rate = (
            round((present_like / total_records) * 100.0, 2) if total_records else 0.0
        )

        low_rows = (
            attendance_qs.values(
                "student_id",
                "student__user__first_name",
                "student__user__last_name",
            )
            .annotate(
                total=Count("attendance_id"),
                present_like=Count(
                    "attendance_id", filter=Q(status__in=present_like_statuses)
                ),
            )
            .annotate(
                attendance_pct=ExpressionWrapper(
                    100.0 * F("present_like") / F("total"),
                    output_field=FloatField(),
                )
            )
            .filter(total__gte=5, attendance_pct__lt=75.0)
            .order_by("attendance_pct")[:5]
        )
        low_attendance_students = [
            {
                "student_id": str(row["student_id"]),
                "student_name": f"{row['student__user__first_name']} {row['student__user__last_name']}".strip()
                or str(row["student_id"]),
                "attendance_pct": round(float(row["attendance_pct"] or 0.0), 2),
                "records": int(row["total"]),
            }
            for row in low_rows
        ]

        return {
            "window_days": int(self.lookback_days),
            "total_records": int(total_records),
            "present_like_count": int(present_like),
            "absent_count": int(absent_count),
            "late_count": int(late_count),
            "attendance_rate_pct": float(attendance_rate),
            "low_attendance_students": low_attendance_students,
        }

    def _tool_fees(self) -> dict[str, Any]:
        today = timezone.localdate()
        now = timezone.now()
        base_fees = StudentFee.objects.filter(tenant=self.tenant)
        due_agg = base_fees.aggregate(
            total_due=Coalesce(Sum("amount_due"), Decimal("0.00")),
            total_paid=Coalesce(Sum("amount_paid"), Decimal("0.00")),
        )
        total_due = due_agg.get("total_due") or Decimal("0.00")
        total_paid = due_agg.get("total_paid") or Decimal("0.00")
        outstanding_amount = max(Decimal("0.00"), total_due - total_paid)

        overdue_count = base_fees.filter(
            Q(status="overdue")
            | (Q(due_date__lt=today) & ~Q(status__in=["paid", "waived"]))
        ).count()
        pending_count = base_fees.filter(
            status__in=["pending", "partial", "overdue"]
        ).count()
        paid_count = base_fees.filter(status="paid").count()

        payments_30d = Payment.objects.filter(
            tenant=self.tenant, payment_date__gte=now - timedelta(days=30)
        ).aggregate(total_collected=Coalesce(Sum("amount"), Decimal("0.00"))).get(
            "total_collected"
        ) or Decimal(
            "0.00"
        )
        expenses_30d = Expense.objects.filter(
            tenant=self.tenant, date__gte=today - timedelta(days=30)
        ).aggregate(total_expense=Coalesce(Sum("amount"), Decimal("0.00"))).get(
            "total_expense"
        ) or Decimal(
            "0.00"
        )

        return {
            "currency": "NPR",
            "total_due": self._as_amount(total_due),
            "total_paid_against_due": self._as_amount(total_paid),
            "outstanding_amount": self._as_amount(outstanding_amount),
            "collected_last_30_days": self._as_amount(payments_30d),
            "expenses_last_30_days": self._as_amount(expenses_30d),
            "net_cash_last_30_days": self._as_amount(payments_30d - expenses_30d),
            "overdue_fee_records": int(overdue_count),
            "pending_fee_records": int(pending_count),
            "paid_fee_records": int(paid_count),
        }

    def _tool_performance(self) -> dict[str, Any]:
        since = timezone.now() - timedelta(days=self.lookback_days)
        results_qs = Result.objects.filter(
            student__user__tenant=self.tenant,
            submitted_at__gte=since,
        ).select_related("assessment", "student__user")

        total_results = results_qs.count()
        pass_count = results_qs.filter(
            score__gte=F("assessment__passing_marks")
        ).count()
        pass_rate = (
            round((pass_count / total_results) * 100.0, 2) if total_results else 0.0
        )

        normalized_scores: list[float] = []
        for row in results_qs[:5000]:
            total_marks = float(getattr(row.assessment, "total_marks", 0) or 0)
            if total_marks <= 0:
                continue
            normalized_scores.append(
                max(0.0, min(100.0, (float(row.score or 0) / total_marks) * 100.0))
            )
        average_score_pct = (
            round(sum(normalized_scores) / len(normalized_scores), 2)
            if normalized_scores
            else 0.0
        )

        low_rows = (
            results_qs.values(
                "student_id",
                "student__user__first_name",
                "student__user__last_name",
            )
            .annotate(assessments=Count("result_id"), avg_score=Avg("score"))
            .filter(assessments__gte=3, avg_score__lt=45.0)
            .order_by("avg_score")[:5]
        )
        low_performers = [
            {
                "student_id": str(row["student_id"]),
                "student_name": f"{row['student__user__first_name']} {row['student__user__last_name']}".strip()
                or str(row["student_id"]),
                "avg_score": round(float(row["avg_score"] or 0.0), 2),
                "assessments": int(row["assessments"]),
            }
            for row in low_rows
        ]

        return {
            "window_days": int(self.lookback_days),
            "results_count": int(total_results),
            "pass_count": int(pass_count),
            "pass_rate_pct": float(pass_rate),
            "average_score_pct": float(average_score_pct),
            "low_performers": low_performers,
        }

    def _tool_overview(self) -> dict[str, Any]:
        return {
            "students": self._tool_students(),
            "attendance": self._tool_attendance(),
            "fees": self._tool_fees(),
            "performance": self._tool_performance(),
        }

    def _tool_map(self) -> dict[str, Callable[[], dict[str, Any]]]:
        return {
            "students": self._tool_students,
            "attendance": self._tool_attendance,
            "fees": self._tool_fees,
            "performance": self._tool_performance,
            "overview": self._tool_overview,
        }

    def _deterministic_answer(self, *, query_type: str, data: dict[str, Any]) -> str:
        if query_type == "students":
            return (
                f"Total students are {data.get('total_students', 0)}. "
                f"New admissions in the last 30 days are {data.get('new_students_last_30_days', 0)}."
            )
        if query_type == "attendance":
            return (
                f"Attendance rate for the last {data.get('window_days', self.lookback_days)} days is "
                f"{data.get('attendance_rate_pct', 0)}%. "
                f"Absent records: {data.get('absent_count', 0)}."
            )
        if query_type == "fees":
            return (
                f"Outstanding fees are {data.get('outstanding_amount', 0)} {data.get('currency', 'NPR')}. "
                f"Collection in the last 30 days is {data.get('collected_last_30_days', 0)}."
            )
        if query_type == "performance":
            return (
                f"Pass rate for the last {data.get('window_days', self.lookback_days)} days is {data.get('pass_rate_pct', 0)}%. "
                f"Average score is {data.get('average_score_pct', 0)}%."
            )
        students = data.get("students", {})
        attendance = data.get("attendance", {})
        fees = data.get("fees", {})
        performance = data.get("performance", {})
        return (
            "School overview: "
            f"{students.get('total_students', 0)} students, "
            f"attendance {attendance.get('attendance_rate_pct', 0)}%, "
            f"outstanding fees {fees.get('outstanding_amount', 0)} {fees.get('currency', 'NPR')}, "
            f"pass rate {performance.get('pass_rate_pct', 0)}%."
        )

    def _llm_answer(
        self, *, question: str, query_type: str, data: dict[str, Any]
    ) -> str | None:
        if not self.use_llm_response:
            return None

        messages = [
            {
                "role": "system",
                "content": (
                    "You are an ERP admin assistant. Use only provided structured data. "
                    "Do not invent numbers, records, or identifiers. "
                    "If data is missing, clearly say it is not available."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Question: {question}\n"
                    f"Query type: {query_type}\n"
                    f"Data JSON: {json.dumps(data, ensure_ascii=True)}\n"
                    "Write a concise answer in 3-5 sentences."
                ),
            },
        ]
        text, _usage = self.rag._call_chat_model(messages)
        cleaned = str(text or "").strip()
        return cleaned or None

    def answer_question(self, question: str) -> dict[str, Any]:
        requested_query_type = self._classify_intent(question)
        query_type = self._normalize_query_type(requested_query_type)
        tool = self._tool_map().get(query_type, self._tool_overview)
        data = tool()
        answer = self._llm_answer(
            question=question, query_type=query_type, data=data
        ) or self._deterministic_answer(
            query_type=query_type,
            data=data,
        )

        return {
            "answer": answer,
            "data": data if isinstance(data, dict) else {},
            "query_type": query_type,
        }
