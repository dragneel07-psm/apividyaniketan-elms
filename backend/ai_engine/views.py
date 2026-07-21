# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
# Forced reload - V2
import logging

from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import (
    action,
    api_view,
    permission_classes,
    throttle_classes,
)
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from academic.models import Lesson, Student, Subject, Teacher
from academic.models.submission import Submission
from core.async_jobs import enqueue_job
from core.mixins import TenantScopedQuerysetMixin
from users.models import UserAccount

from .models import AIInteractionLog, LearningNode, LearningPath, StudentAIReport
from .serializers import (
    AdminAssistantQueryRequestSerializer,
    AdminAssistantQueryResponseSerializer,
    AiGeneratedArtifactSerializer,
    AIGradingDraftSerializer,
    AIInteractionLogSerializer,
    ApproveGradingDraftRequestSerializer,
    ContentChunkSearchRequestSerializer,
    ContentChunkSearchResponseSerializer,
    CreateGradingRubricSerializer,
    ExamPaperGenerateRequestSerializer,
    ExamPaperGenerateResponseSerializer,
    GradeSubmissionDraftResponseSerializer,
    GradeSubmissionRequestSerializer,
    GradingRubricSerializer,
    LearningNodeSerializer,
    LearningPathSerializer,
    LessonArtifactResponseSerializer,
    QuizGenerationRequestSerializer,
    QuizGenerationResponseSerializer,
    StudentAIReportSerializer,
)
from .services.admin_assistant_service import AdminAssistantService
from .services.assisted_grading_service import (
    AssistedGradingError,
    AssistedGradingService,
)
from .services.exam_generator_service import (
    ExamPaperGenerationError,
    ExamPaperGeneratorService,
)
from .services.lesson_summary_service import LessonSummaryService
from .services.quiz_generator_service import QuizGenerationError, QuizGeneratorService
from .services.rag_tutor_service import RAGTutorService
from .services.risk_analytics_service import RiskAnalyticsService

logger = logging.getLogger(__name__)
from .models import (
    AiGeneratedArtifact,
    AIGradingDraft,
    AITokenBudget,
    GradingRubric,
    SkillMastery,
    SkillPracticeEvent,
    SkillTag,
    StudyEvent,
    TutorConversation,
    TutorMessage,
)
from .serializers import (
    AITokenBudgetCreateSerializer,
    AITokenBudgetSerializer,
    SkillMasterySerializer,
    SkillPracticeEventSerializer,
    SkillPracticeUpdateSerializer,
    SkillTagSerializer,
    StudyEventSerializer,
    TutorConversationDetailSerializer,
    TutorConversationSerializer,
    TutorMessageSerializer,
)
from .services.bkt_service import BKTService
from .services.learning_path_service import LearningPathService
from .services.personalization_service import PersonalizationService
from .services.predictive_service import PredictiveAnalyticsService
from .services.reporting_service import ReportingService
from .services.schedule_service import ScheduleService
from .services.sm2_service import SM2Service
from .services.token_budget_service import TokenBudgetExceeded, TokenBudgetService
from .tasks import ai_index_content_task, generate_quiz_task, generate_summary_task
from .throttling import TutorChatRateThrottle


class StudyEventViewSet(TenantScopedQuerysetMixin, viewsets.ModelViewSet):
    """
    Manage student study schedule.

    Extra actions:
      POST  study-schedule/generate/      — AI-powered plan (creates DB events)
      GET   study-schedule/summary/       — Plan preview without creating events
      PATCH study-schedule/<id>/complete/ — Mark event completed
    """

    queryset = StudyEvent.objects.all()
    serializer_class = StudyEventSerializer
    permission_classes = [IsAuthenticated]
    tenant_field = "tenant"

    def get_queryset(self):
        qs = super().get_queryset()
        if hasattr(self.request.user, "student_profile"):
            qs = qs.filter(student=self.request.user.student_profile)
        # Optional date-range filters
        date_from = self.request.query_params.get("from")
        date_to = self.request.query_params.get("to")
        if date_from:
            qs = qs.filter(start_time__date__gte=date_from)
        if date_to:
            qs = qs.filter(start_time__date__lte=date_to)
        return qs.order_by("start_time")

    @action(detail=False, methods=["post"])
    def generate(self, request):
        """Generate an AI-powered personalised study plan for the next N days."""
        from ai_engine.services.study_planner_service import StudyPlannerService

        db_alias = getattr(request, "db_alias", "default")
        days = int(request.data.get("days", 7))
        days = max(1, min(days, 30))
        replace = request.data.get("replace_existing", True)
        try:
            student = Student.objects.using(db_alias).get(user=request.user)
            service = StudyPlannerService(db_alias=db_alias)
            events = service.generate_plan(student, days=days, replace_existing=replace)
            serializer = self.get_serializer(events, many=True)
            return Response(
                {
                    "count": len(events),
                    "days": days,
                    "events": serializer.data,
                }
            )
        except Student.DoesNotExist:
            return Response({"error": "Student profile not found"}, status=404)
        except Exception as e:
            logger.exception("study planner generate error")
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=["get"])
    def summary(self, request):
        """Return a preview of what the AI planner found — without creating events."""
        from ai_engine.services.study_planner_service import StudyPlannerService

        db_alias = getattr(request, "db_alias", "default")
        days = int(request.query_params.get("days", 7))
        try:
            student = Student.objects.using(db_alias).get(user=request.user)
            service = StudyPlannerService(db_alias=db_alias)
            return Response(service.get_plan_summary(student, days=days))
        except Student.DoesNotExist:
            return Response({"error": "Student profile not found"}, status=404)

    @action(detail=True, methods=["patch"])
    def complete(self, request, pk=None):
        """Mark a study event as completed."""
        event = self.get_object()
        event.is_completed = True
        event.save(update_fields=["is_completed"])
        return Response(self.get_serializer(event).data)


class AIInteractionLogViewSet(TenantScopedQuerysetMixin, viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing AI interaction logs.
    """

    queryset = AIInteractionLog.objects.all()
    serializer_class = AIInteractionLogSerializer
    permission_classes = [IsAuthenticated]
    tenant_field = "tenant"


class StudentAIReportViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = StudentAIReport.objects.all()
    serializer_class = StudentAIReportSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Allow simple filtering if needed (though TenantScoped handles tenant isolation ideally)
        # Assuming we might want to ensure tenant isolation manually if mixin not used here
        queryset = super().get_queryset()
        student_id = self.request.query_params.get("student")
        if student_id:
            queryset = queryset.filter(student_id=student_id)
        return queryset


class LearningPathViewSet(TenantScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = LearningPath.objects.all()
    serializer_class = LearningPathSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        # If student logs in, show their paths
        try:
            student = Student.objects.get(user=self.request.user)
            queryset = queryset.filter(student=student)
        except Student.DoesNotExist:
            pass  # Admin sees all (filtered by tenant)

        return queryset

    @action(detail=False, methods=["post"])
    def generate(self, request):
        """
        Generate a learning path for a student based on recent performance.
        """
        student_id = request.data.get("student_id")
        subject_id = request.data.get("subject_id")

        db_alias = getattr(request, "db_alias", "default")

        try:
            if student_id:
                student = Student.objects.using(db_alias).get(pk=student_id)
            else:
                student = Student.objects.using(db_alias).get(user=request.user)
        except Student.DoesNotExist:
            return Response({"error": "Student not found"}, status=404)

        subject = None
        if subject_id:
            try:
                subject = Subject.objects.using(db_alias).get(pk=subject_id)
            except Subject.DoesNotExist:
                pass

        try:
            service = LearningPathService()
            path = service.generate_path(student, subject)

            serializer = self.get_serializer(path)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            import traceback

            traceback.print_exc()
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=["get"])
    def active(self, request):
        """
        Get the current active learning path for the student.
        """
        db_alias = getattr(request, "db_alias", "default")
        try:
            student = Student.objects.using(db_alias).get(user=request.user)
            service = LearningPathService()
            path = service.get_active_path(student)

            if not path:
                return Response(
                    {"detail": "No active path found"}, status=status.HTTP_404_NOT_FOUND
                )

            serializer = self.get_serializer(path)
            return Response(serializer.data)
        except Student.DoesNotExist:
            return Response({"error": "Student not found"}, status=404)
        except Exception as e:
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        except Exception as e:
            import traceback

            traceback.print_exc()
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class LearningNodeViewSet(TenantScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = LearningNode.objects.all()
    serializer_class = LearningNodeSerializer
    permission_classes = [permissions.IsAuthenticated]
    tenant_field = "learning_path__tenant"

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        """
        Mark a node as completed and apply SM-2 spaced repetition scheduling.

        Body (optional):
          quality (int 0-5): recall quality rating.
            5 = perfect, 4 = minor hesitation, 3 = correct with difficulty,
            2 = incorrect but remembered, 1 = close, 0 = blackout
            Default: 4 (correct with minor hesitation)

        Returns updated node data including next_review_at.
        """
        node = self.get_object()
        quality = int(request.data.get("quality", 4))
        quality = max(0, min(5, quality))

        sm2 = SM2Service()
        result = sm2.calculate(
            quality=quality,
            ease_factor=node.ease_factor,
            interval_days=node.interval_days,
            repetitions=node.repetitions,
        )

        node.status = "completed"
        node.completed_at = timezone.now()
        node.ease_factor = result.ease_factor
        node.interval_days = result.interval_days
        node.repetitions = result.repetitions
        node.next_review_at = result.next_review_at
        node.last_quality = quality
        node.save()

        # Unlock next node (only if not a review — first completion)
        next_node = None
        if node.repetitions == 1:  # first successful pass
            next_node = (
                LearningNode.objects.filter(
                    learning_path=node.learning_path,
                    order__gt=node.order,
                    status="locked",
                )
                .order_by("order")
                .first()
            )
            if next_node:
                next_node.status = "unlocked"
                next_node.save()

        return Response(
            {
                "status": "completed",
                "passed": result.passed,
                "next_review_at": result.next_review_at,
                "interval_days": result.interval_days,
                "ease_factor": result.ease_factor,
                "repetitions": result.repetitions,
                "next_node_unlocked": next_node is not None,
            }
        )

    @action(detail=False, methods=["get"])
    def due(self, request):
        """
        Return all completed learning nodes that are due for review today.

        Optional query param:
          learning_path (UUID): filter to a specific path.
        """
        now = timezone.now()
        qs = self.get_queryset().filter(
            status="completed",
            next_review_at__lte=now,
        )
        path_id = request.query_params.get("learning_path")
        if path_id:
            qs = qs.filter(learning_path_id=path_id)

        serializer = self.get_serializer(qs, many=True)
        return Response(
            {
                "count": qs.count(),
                "results": serializer.data,
            }
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def teacher_analytics(request):
    """
    Teacher-facing predictive analytics.
    """
    try:
        # Get tenant and DB alias from request
        db_alias = getattr(request, "db_alias", "default")

        # 1. Try Lookup by PK (Direct FK)
        teacher = (
            Teacher.objects.using(db_alias).filter(user_id=request.user.pk).first()
        )

        # 2. Fallback to Email lookup in Local DB
        if not teacher:
            try:
                local_user = UserAccount.objects.using(db_alias).get(
                    email=request.user.email
                )
                teacher = (
                    Teacher.objects.using(db_alias).filter(user=local_user).first()
                )
            except UserAccount.DoesNotExist:
                pass

        if not teacher:
            return Response(
                {
                    "error": "Teacher profile not found in this tenant",
                    "debug": {
                        "user_id": str(request.user.pk),
                        "email": request.user.email,
                        "db_alias": db_alias,
                    },
                },
                status=404,
            )

        class_ids = teacher.assigned_classes.using(db_alias).values_list(
            "id", flat=True
        )

        service = PredictiveAnalyticsService()
        data = service.get_teacher_dashboard_data(list(class_ids), using=db_alias)
        return Response(data)
    except Teacher.DoesNotExist:
        return Response({"error": "Teacher profile not found"}, status=404)
    except Exception as e:
        import traceback

        traceback.print_exc()
        return Response({"error": str(e)}, status=500)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def at_risk_students(request):
    role = str(getattr(request.user, "role", "") or "").strip().lower()
    if role not in {"teacher", "admin"}:
        return Response(
            {"detail": "Only Teacher/Admin can access at-risk analytics."},
            status=status.HTTP_403_FORBIDDEN,
        )

    tenant = getattr(request, "tenant", None) or getattr(request.user, "tenant", None)
    if tenant is None:
        return Response(
            {"error": "tenant context is required"}, status=status.HTTP_400_BAD_REQUEST
        )

    class_id_raw = request.query_params.get("class_id")
    if class_id_raw in (None, ""):
        return Response(
            {"error": "class_id is required"}, status=status.HTTP_400_BAD_REQUEST
        )
    try:
        class_id = int(str(class_id_raw).strip())
    except (TypeError, ValueError):
        return Response(
            {"error": "class_id must be a numeric id"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if role == "teacher":
        teacher = (
            Teacher.objects.prefetch_related("assigned_classes")
            .filter(user=request.user)
            .first()
        )
        if not teacher or not teacher.assigned_classes.filter(id=class_id).exists():
            return Response(
                {"detail": "You do not have access to this class risk analytics."},
                status=status.HTTP_403_FORBIDDEN,
            )

    send_notifications = str(
        request.query_params.get("notify", "1")
    ).strip().lower() not in {"0", "false", "no"}
    try:
        service = RiskAnalyticsService(tenant=tenant, user=request.user)
        payload = service.get_at_risk_students(
            class_id=class_id, send_notifications=send_notifications
        )
        return Response(payload, status=status.HTTP_200_OK)
    except Exception as exc:
        import traceback

        traceback.print_exc()
        return Response(
            {"error": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def student_report(request, student_id):
    """
    Generate a detailed AI report for a student. POST persists a new report;
    GET re-runs the generator without persistence is also accepted for callers
    that want a fresh snapshot.
    """
    try:
        service = ReportingService()
        save = request.method == "POST"
        data = service.generate_student_report(student_id, save=save)
        return Response(data)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def student_past_reports(request, student_id):
    """
    Get past AI reports for a student.
    """
    try:
        reports = StudentAIReport.objects.filter(student_id=student_id).order_by(
            "-generated_at"
        )
        data = [
            {
                "report_id": r.report_id,
                "report_data": r.report_data,
                "generated_at": r.generated_at,
                "is_automated": r.is_automated,
            }
            for r in reports
        ]
        return Response(data)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ── Phase 9: AI Progress Reports ──────────────────────────────────────────────


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_progress_report(request):
    """
    GET /api/ai/reports/me/?type=student|parent|teacher
    Returns cached report (≤7 days) or triggers fresh generation.
    """
    tenant = getattr(request, "tenant", None) or getattr(request.user, "tenant", None)
    if tenant is None:
        return Response(
            {"error": "tenant context is required"}, status=status.HTTP_400_BAD_REQUEST
        )

    db = getattr(request, "db_alias", "default")
    try:
        student = Student.objects.using(db).get(user=request.user)
    except Student.DoesNotExist:
        return Response(
            {"error": "Student profile not found"}, status=status.HTTP_404_NOT_FOUND
        )

    report_type = str(request.query_params.get("type") or "student").strip().lower()
    if report_type not in ("student", "parent", "teacher"):
        return Response(
            {"error": "type must be student, parent, or teacher"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    from .services.progress_report_service import ProgressReportService

    service = ProgressReportService(tenant=tenant, db_alias=db)
    try:
        report = service.get_or_generate(student, report_type=report_type, force=False)
        return Response(report, status=status.HTTP_200_OK)
    except Exception as exc:
        import traceback

        traceback.print_exc()
        return Response(
            {"error": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_my_progress_report(request):
    """
    POST /api/ai/reports/me/generate/
    Body (optional): {"type": "student"}
    Force-generates a fresh AI progress report (ignores cache).
    """
    tenant = getattr(request, "tenant", None) or getattr(request.user, "tenant", None)
    if tenant is None:
        return Response(
            {"error": "tenant context is required"}, status=status.HTTP_400_BAD_REQUEST
        )

    db = getattr(request, "db_alias", "default")
    try:
        student = Student.objects.using(db).get(user=request.user)
    except Student.DoesNotExist:
        return Response(
            {"error": "Student profile not found"}, status=status.HTTP_404_NOT_FOUND
        )

    report_type = str(request.data.get("type") or "student").strip().lower()
    if report_type not in ("student", "parent", "teacher"):
        return Response(
            {"error": "type must be student, parent, or teacher"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    from .services.progress_report_service import ProgressReportService

    service = ProgressReportService(tenant=tenant, db_alias=db)
    try:
        report = service.get_or_generate(student, report_type=report_type, force=True)
        return Response(report, status=status.HTTP_200_OK)
    except Exception as exc:
        import traceback

        traceback.print_exc()
        return Response(
            {"error": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_report_history(request):
    """
    GET /api/ai/reports/me/history/?type=student&limit=10
    List the student's past reports of the given type.
    """
    tenant = getattr(request, "tenant", None) or getattr(request.user, "tenant", None)
    if tenant is None:
        return Response(
            {"error": "tenant context is required"}, status=status.HTTP_400_BAD_REQUEST
        )

    db = getattr(request, "db_alias", "default")
    try:
        student = Student.objects.using(db).get(user=request.user)
    except Student.DoesNotExist:
        return Response(
            {"error": "Student profile not found"}, status=status.HTTP_404_NOT_FOUND
        )

    report_type = str(request.query_params.get("type") or "student").strip().lower()
    try:
        limit = max(1, min(50, int(request.query_params.get("limit", 10))))
    except (TypeError, ValueError):
        return Response(
            {"error": "limit must be an integer"}, status=status.HTTP_400_BAD_REQUEST
        )

    from .services.progress_report_service import ProgressReportService

    service = ProgressReportService(tenant=tenant, db_alias=db)
    try:
        history = service.list_history(student, report_type=report_type, limit=limit)
        return Response(history, status=status.HTTP_200_OK)
    except Exception as exc:
        return Response(
            {"error": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def class_progress_report(request, class_id):
    """
    GET /api/ai/reports/class/<class_id>/
    Teacher/admin view: list latest student reports for a class.
    """
    if not _is_teacher_or_admin(request.user):
        return Response(
            {"detail": "Only Teacher/Admin can view class reports."},
            status=status.HTTP_403_FORBIDDEN,
        )

    tenant = getattr(request, "tenant", None) or getattr(request.user, "tenant", None)
    if tenant is None:
        return Response(
            {"error": "tenant context is required"}, status=status.HTTP_400_BAD_REQUEST
        )

    db = getattr(request, "db_alias", "default")
    from academic.models import ClassSection

    try:
        cls = ClassSection.objects.using(db).get(pk=class_id, tenant=tenant)
    except ClassSection.DoesNotExist:
        return Response({"error": "Class not found"}, status=status.HTTP_404_NOT_FOUND)

    # Teachers may only view their own classes
    role = str(getattr(request.user, "role", "") or "").strip().lower()
    if role == "teacher":
        try:
            teacher = Teacher.objects.using(db).get(user=request.user)
        except Teacher.DoesNotExist:
            return Response(
                {"detail": "Teacher profile not found"},
                status=status.HTTP_403_FORBIDDEN,
            )
        if not cls.teachers.filter(pk=teacher.pk).exists():
            return Response(
                {"detail": "You are not assigned to this class."},
                status=status.HTTP_403_FORBIDDEN,
            )

    from .services.progress_report_service import ProgressReportService

    service = ProgressReportService(tenant=tenant, db_alias=db)

    students = Student.objects.using(db).filter(academic_class=cls, tenant=tenant)
    report_type = str(request.query_params.get("type") or "teacher").strip().lower()
    if report_type not in ("student", "parent", "teacher"):
        report_type = "teacher"

    results = []
    for student in students:
        try:
            report = service.get_or_generate(
                student, report_type=report_type, force=False
            )
            results.append(report)
        except Exception as exc:
            results.append(
                {
                    "student_id": str(getattr(student, "student_id", student.pk)),
                    "error": str(exc),
                }
            )

    return Response(
        {"class_id": class_id, "report_type": report_type, "reports": results},
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def student_recommendations(request):
    """
    Get personalized study recommendations for the current student.
    """
    try:
        student = Student.objects.get(user=request.user)
        service = PersonalizationService()
        data = service.get_student_recommendations(student.student_id)
        return Response(data)
    except Student.DoesNotExist:
        return Response(
            {"error": "Student profile not found"}, status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def enqueue_ai_index_content(request):
    content = str(request.data.get("content") or "").strip()
    if not content:
        return Response(
            {"detail": "content is required"}, status=status.HTTP_400_BAD_REQUEST
        )

    metadata = request.data.get("metadata") or {}
    if not isinstance(metadata, dict):
        return Response(
            {"detail": "metadata must be an object"}, status=status.HTTP_400_BAD_REQUEST
        )

    tenant_schema = str(
        getattr(getattr(request, "tenant", None), "schema_name", "public")
    )
    job = enqueue_job(
        ai_index_content_task,
        tenant_schema=tenant_schema,
        content=content,
        metadata=metadata,
        user_id=str(getattr(request.user, "pk", "")),
        job_name="ai.index_content",
        job_tenant_schema=tenant_schema,
    )
    return Response(job, status=status.HTTP_202_ACCEPTED)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def enqueue_ai_summary(request):
    content = str(request.data.get("content") or "").strip()
    if not content:
        return Response(
            {"detail": "content is required"}, status=status.HTTP_400_BAD_REQUEST
        )

    try:
        max_points = int(request.data.get("max_points", 5))
    except (TypeError, ValueError):
        return Response(
            {"detail": "max_points must be an integer"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    tenant_schema = str(
        getattr(getattr(request, "tenant", None), "schema_name", "public")
    )
    job = enqueue_job(
        generate_summary_task,
        tenant_schema=tenant_schema,
        content=content,
        max_points=max_points,
        user_id=str(getattr(request.user, "pk", "")),
        job_name="ai.generate_summary",
        job_tenant_schema=tenant_schema,
    )
    return Response(job, status=status.HTTP_202_ACCEPTED)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def enqueue_ai_quiz(request):
    content = str(request.data.get("content") or "").strip()
    if not content:
        return Response(
            {"detail": "content is required"}, status=status.HTTP_400_BAD_REQUEST
        )

    try:
        question_count = int(request.data.get("question_count", 5))
    except (TypeError, ValueError):
        return Response(
            {"detail": "question_count must be an integer"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    tenant_schema = str(
        getattr(getattr(request, "tenant", None), "schema_name", "public")
    )
    job = enqueue_job(
        generate_quiz_task,
        tenant_schema=tenant_schema,
        content=content,
        question_count=question_count,
        user_id=str(getattr(request.user, "pk", "")),
        job_name="ai.generate_quiz",
        job_tenant_schema=tenant_schema,
    )
    return Response(job, status=status.HTTP_202_ACCEPTED)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def admin_assistant_query(request):
    role = str(getattr(request.user, "role", "") or "").strip().lower()
    allowed_roles = {"admin", "staff", "school_admin", "accountant", "principal"}
    if role not in allowed_roles:
        return Response(
            {
                "detail": "Only SchoolAdmin/Accountant/Principal can access Admin AI Assistant."
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    tenant = getattr(request, "tenant", None) or getattr(request.user, "tenant", None)
    if (
        tenant is None
        or str(getattr(tenant, "schema_name", "public")).strip().lower() == "public"
    ):
        return Response(
            {"error": "tenant context is required"}, status=status.HTTP_400_BAD_REQUEST
        )

    serializer = AdminAssistantQueryRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    question = serializer.validated_data["question"]

    try:
        service = AdminAssistantService(tenant=tenant, user=request.user)
        payload = service.answer_question(question)
        response_serializer = AdminAssistantQueryResponseSerializer(data=payload)
        response_serializer.is_valid(raise_exception=True)
        return Response(response_serializer.validated_data, status=status.HTTP_200_OK)
    except Exception as e:
        import traceback

        traceback.print_exc()
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@throttle_classes([TutorChatRateThrottle])
def ai_chunk_search(request):
    tenant = getattr(request, "tenant", None) or getattr(request.user, "tenant", None)
    if tenant is None:
        return Response(
            {"error": "tenant context is required"}, status=status.HTTP_400_BAD_REQUEST
        )

    serializer = ContentChunkSearchRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    payload = serializer.validated_data

    query = str(payload["query"]).strip()
    if not query:
        return Response(
            {"error": "query is required"}, status=status.HTTP_400_BAD_REQUEST
        )

    context_payload = dict(payload.get("context") or {})
    if payload.get("source_type"):
        context_payload["source_type"] = payload["source_type"]
    if payload.get("source_id"):
        context_payload["source_id"] = payload["source_id"]

    service = RAGTutorService(tenant=tenant)
    service.top_k = int(payload.get("top_k", service.top_k))
    retrieved = service.retrieve_relevant_chunks(query, context=context_payload)

    min_similarity = payload.get("min_similarity", None)
    results = []
    for item in retrieved:
        chunk = item.get("chunk")
        if chunk is None:
            continue
        similarity = float(item.get("similarity") or 0.0)
        if min_similarity is not None and similarity < float(min_similarity):
            continue
        results.append(
            {
                "chunk_id": chunk.id,
                "source_type": chunk.source_type,
                "source_id": str(chunk.source_id),
                "text": chunk.text,
                "metadata": chunk.metadata or {},
                "similarity": round(similarity, 6),
            }
        )

    response_payload = {"count": len(results), "results": results}
    output = ContentChunkSearchResponseSerializer(data=response_payload)
    output.is_valid(raise_exception=True)
    return Response(output.validated_data, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@throttle_classes([TutorChatRateThrottle])
def ai_tutor_chat(request):
    """
    Tenant-aware AI tutor endpoint with RAG grounding and persistent conversation storage.

    Body:
      message (str): Student question.
      context (dict, optional): lesson_id, chapter_id, user_role, etc.
      conversation_id (UUID, optional): Resume an existing conversation.
        If omitted, a new conversation is created automatically.
      conversation_history (list, optional): Legacy client-side history.
        Ignored when conversation_id is provided (DB history is used instead).
    """
    message = str(request.data.get("message") or "").strip()
    if not message:
        return Response(
            {"error": "message is required"}, status=status.HTTP_400_BAD_REQUEST
        )

    context_payload = request.data.get("context") or {}
    if context_payload and not isinstance(context_payload, dict):
        return Response(
            {"error": "context must be an object"}, status=status.HTTP_400_BAD_REQUEST
        )
    context_payload = dict(context_payload)

    tenant = getattr(request, "tenant", None) or getattr(request.user, "tenant", None)
    if tenant is None:
        return Response(
            {"error": "tenant context is required"}, status=status.HTTP_400_BAD_REQUEST
        )

    try:
        db_alias = getattr(request, "db_alias", "default")
        context_payload.setdefault(
            "user_role", str(getattr(request.user, "role", "") or "").strip().lower()
        )

        # --- Resolve or create conversation ---
        conversation_id = request.data.get("conversation_id")
        conversation = None
        if conversation_id:
            try:
                conversation = TutorConversation.objects.using(db_alias).get(
                    id=conversation_id, user=request.user, tenant=tenant
                )
            except TutorConversation.DoesNotExist:
                pass

        if conversation is None:
            # Auto-title from first message (truncated)
            auto_title = message[:80] + ("…" if len(message) > 80 else "")
            lesson_id = context_payload.get("lesson_id")
            subject_id = context_payload.get("subject_id")
            student = getattr(request.user, "student_profile", None)
            conversation = TutorConversation.objects.using(db_alias).create(
                tenant=tenant,
                user=request.user,
                student=student,
                lesson_id=lesson_id or None,
                subject_id=subject_id or None,
                title=auto_title,
            )

        # --- Build conversation history from DB ---
        db_messages = list(
            TutorMessage.objects.using(db_alias)
            .filter(conversation=conversation)
            .order_by("created_at")
            .values("role", "content")
        )
        # Keep last 6 turns for context window efficiency
        history_payload = db_messages[-6:]

        # --- Token budget pre-flight check ---
        student = getattr(request.user, "student_profile", None)
        budget_service = TokenBudgetService()
        try:
            budget_service.check(tenant=tenant, student=student, db_alias=db_alias)
        except TokenBudgetExceeded as exc:
            return Response(
                {
                    "error": "daily_budget_exceeded",
                    "detail": str(exc),
                    "used_today": exc.used,
                    "daily_limit": exc.limit,
                    "resets_at": exc.resets_at.isoformat(),
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        # --- Persist the student's message ---
        TutorMessage.objects.using(db_alias).create(
            conversation=conversation,
            role="user",
            content=message,
        )

        # --- Call the AI service ---
        service = RAGTutorService(tenant=tenant)
        response_data = service.answer_question(
            message,
            context=context_payload,
            conversation_history=history_payload,
        )

        answer = str(response_data.get("answer") or "")
        sources = (
            response_data.get("sources")
            if isinstance(response_data.get("sources"), list)
            else []
        )
        usage = (
            response_data.get("usage")
            if isinstance(response_data.get("usage"), dict)
            else {}
        )
        is_demo = bool(response_data.get("is_demo"))
        fallback_reason = response_data.get("fallback_reason")
        error = response_data.get("error")
        prompt_tokens = int(usage.get("prompt_tokens") or 0)
        completion_tokens = int(usage.get("completion_tokens") or 0)
        confidence = float(response_data.get("confidence") or 0.0)
        confidence_label = str(response_data.get("confidence_label") or "low")
        response_mode = str(
            response_data.get("mode") or context_payload.get("mode") or "direct"
        )

        # --- Persist the assistant's response ---
        TutorMessage.objects.using(db_alias).create(
            conversation=conversation,
            role="assistant",
            content=answer,
            sources=sources,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            is_demo=is_demo,
            confidence=confidence,
            confidence_label=confidence_label,
            mode=response_mode,
        )

        # --- Deduct tokens from budget ---
        total_tokens = prompt_tokens + completion_tokens
        budget_status = budget_service.deduct(
            tenant=tenant, student=student, tokens_used=total_tokens, db_alias=db_alias
        )

        # --- Log AI interaction ---
        try:
            AIInteractionLog.objects.using(db_alias).create(
                tenant=tenant,
                user=request.user,
                feature_used="tutor_rag",
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=total_tokens,
            )
        except Exception as log_err:
            logger.warning("Tutor interaction logging failed: %s", log_err)

        return Response(
            {
                "conversation_id": str(conversation.id),
                "answer": answer,
                "sources": sources,
                "confidence": confidence,
                "confidence_label": confidence_label,
                "mode": response_mode,
                "usage": {
                    "model": str(usage.get("model") or "fallback"),
                    "prompt_tokens": prompt_tokens,
                    "completion_tokens": completion_tokens,
                },
                "is_demo": is_demo,
                "fallback_reason": fallback_reason,
                "error": error,
                "budget": budget_status,
            },
            status=status.HTTP_200_OK,
        )
    except Exception as e:
        import traceback

        traceback.print_exc()
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TutorConversationViewSet(
    TenantScopedQuerysetMixin, viewsets.ReadOnlyModelViewSet
):
    """
    List and retrieve persistent tutor conversations for the current user.
    Each student sees only their own conversations (tenant-scoped).
    """

    queryset = TutorConversation.objects.all()
    serializer_class = TutorConversationSerializer
    permission_classes = [IsAuthenticated]
    tenant_field = "tenant"

    def get_queryset(self):
        return super().get_queryset().filter(user=self.request.user)

    def get_serializer_class(self):
        if self.action == "retrieve":
            return TutorConversationDetailSerializer
        return TutorConversationSerializer

    @action(detail=True, methods=["get"])
    def messages(self, request, pk=None):
        """Return all messages in a conversation (paginated, oldest first)."""
        conversation = self.get_object()
        msgs = TutorMessage.objects.filter(conversation=conversation).order_by(
            "created_at"
        )
        serializer = TutorMessageSerializer(msgs, many=True)
        return Response({"count": msgs.count(), "results": serializer.data})


class SkillTagViewSet(TenantScopedQuerysetMixin, viewsets.ModelViewSet):
    """
    Manage skill tags (teacher/admin only for write; students can read).
    Teachers create skill tags and link them to lessons/assessments.
    """

    queryset = SkillTag.objects.all()
    serializer_class = SkillTagSerializer
    permission_classes = [IsAuthenticated]
    tenant_field = "tenant"

    def get_queryset(self):
        qs = super().get_queryset()
        subject_id = self.request.query_params.get("subject")
        if subject_id:
            qs = qs.filter(subject_id=subject_id)
        return qs.order_by("name")

    def perform_create(self, serializer):
        tenant = getattr(self.request, "tenant", None) or getattr(
            self.request.user, "tenant", None
        )
        serializer.save(tenant=tenant, created_by=self.request.user)


class SkillMasteryViewSet(TenantScopedQuerysetMixin, viewsets.ReadOnlyModelViewSet):
    """
    Read-only view of a student's skill mastery estimates.
    Students see their own; teachers/admins can filter by student.
    """

    queryset = SkillMastery.objects.select_related(
        "skill_tag", "skill_tag__subject"
    ).all()
    serializer_class = SkillMasterySerializer
    permission_classes = [IsAuthenticated]
    tenant_field = "skill_tag__tenant"

    def get_queryset(self):
        qs = super().get_queryset()
        role = str(getattr(self.request.user, "role", "") or "").lower()
        if role == "student":
            student = getattr(self.request.user, "student_profile", None)
            if student is None:
                return qs.none()
            qs = qs.filter(student=student)
        else:
            student_id = self.request.query_params.get("student_id")
            if student_id:
                qs = qs.filter(student_id=student_id)
        subject_id = self.request.query_params.get("subject_id")
        if subject_id:
            qs = qs.filter(skill_tag__subject_id=subject_id)
        return qs.order_by("p_mastery")

    @action(detail=False, methods=["get"])
    def gaps(self, request):
        """
        Return the student's lowest-mastery skills (top skill gaps).
        Students only; optionally filter by ?limit=N (default 5).
        """
        role = str(getattr(request.user, "role", "") or "").lower()
        if role != "student":
            return Response(
                {"detail": "Only students can access skill gaps."},
                status=status.HTTP_403_FORBIDDEN,
            )
        student = getattr(request.user, "student_profile", None)
        if student is None:
            return Response(
                {"detail": "Student profile not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        try:
            limit = min(int(request.query_params.get("limit", 5)), 20)
        except ValueError:
            limit = 5
        db_alias = getattr(request, "db_alias", "default")
        bkt = BKTService()
        gaps = bkt.get_skill_gaps(student, db_alias=db_alias, limit=limit)
        serializer = SkillMasterySerializer(gaps, many=True)
        return Response({"count": len(gaps), "results": serializer.data})

    @action(detail=False, methods=["post"])
    def update_mastery(self, request):
        """
        Record a practice event and update the student's BKT mastery.

        Body:
          skill_tag_id (UUID): the skill being practiced.
          correct (bool): whether the student answered correctly.
          score_pct (float 0-100): raw score percentage.
          source_type (str): 'assessment' | 'lesson' | 'tutor'
          source_id (str): ID of the source object (optional).
        """
        role = str(getattr(request.user, "role", "") or "").lower()
        if role != "student":
            return Response(
                {"detail": "Only students can update mastery."},
                status=status.HTTP_403_FORBIDDEN,
            )
        student = getattr(request.user, "student_profile", None)
        if student is None:
            return Response(
                {"detail": "Student profile not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = SkillPracticeUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        db_alias = getattr(request, "db_alias", "default")
        try:
            skill = SkillTag.objects.using(db_alias).get(id=data["skill_tag_id"])
        except SkillTag.DoesNotExist:
            return Response(
                {"detail": "Skill tag not found."}, status=status.HTTP_404_NOT_FOUND
            )

        bkt = BKTService()
        result = bkt.observe(
            student=student,
            skill_tag=skill,
            correct=data["correct"],
            score_pct=data.get("score_pct", 0.0),
            source_type=data.get("source_type", "assessment"),
            source_id=str(data.get("source_id", "")),
            db_alias=db_alias,
        )

        return Response(
            {
                "skill_tag": str(skill.id),
                "skill_name": skill.name,
                "correct": result.correct,
                "mastery_before": round(result.mastery_before, 4),
                "mastery_after": round(result.mastery_after, 4),
                "observations": result.observations,
                "is_mastered": bkt.is_mastered(result.mastery_after),
            },
            status=status.HTTP_200_OK,
        )


class AITokenBudgetViewSet(TenantScopedQuerysetMixin, viewsets.ModelViewSet):
    """
    Admin/SaaS: manage per-tenant and per-student daily token budgets.
    Students: read-only access to their own budget status via GET /my-usage/.
    """

    queryset = AITokenBudget.objects.all()
    serializer_class = AITokenBudgetSerializer
    permission_classes = [IsAuthenticated]
    tenant_field = "tenant"
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        qs = super().get_queryset()
        role = str(getattr(self.request.user, "role", "") or "").lower()
        if role == "student":
            # Students only see their own budget via /my-usage/ — block list view
            return qs.none()
        student_id = self.request.query_params.get("student_id")
        if student_id:
            qs = qs.filter(student_id=student_id)
        return qs.order_by("-created_at")

    def create(self, request, *args, **kwargs):
        """
        Create or update a token budget.
        Admin/SaaS only.

        Body:
          daily_limit_tokens (int): Max tokens per day. 0 = unlimited.
          student_id (UUID, optional): Per-student override. Omit for tenant-wide.
          is_active (bool): Whether to enforce this budget.
        """
        role = str(getattr(request.user, "role", "") or "").lower()
        if role not in ("admin", "saas_admin", "staff"):
            return Response(
                {"detail": "Only admins can manage token budgets."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = AITokenBudgetCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        tenant = getattr(request, "tenant", None) or getattr(
            request.user, "tenant", None
        )
        db_alias = getattr(request, "db_alias", "default")

        student = None
        if data.get("student_id"):
            try:
                from academic.models import Student

                student = Student.objects.using(db_alias).get(pk=data["student_id"])
            except Student.DoesNotExist:
                return Response(
                    {"detail": "Student not found."}, status=status.HTTP_404_NOT_FOUND
                )

        budget_service = TokenBudgetService()
        budget = budget_service.create_budget(
            tenant=tenant,
            daily_limit_tokens=data["daily_limit_tokens"],
            student=student,
            created_by=request.user,
            db_alias=db_alias,
        )
        budget.is_active = data.get("is_active", True)
        budget.save(using=db_alias, update_fields=["is_active", "updated_at"])

        return Response(
            AITokenBudgetSerializer(budget).data, status=status.HTTP_201_CREATED
        )

    @action(detail=False, methods=["get"])
    def my_usage(self, request):
        """
        Return the current budget status for the requesting student.
        Works for all roles — shows their effective budget.
        """
        tenant = getattr(request, "tenant", None) or getattr(
            request.user, "tenant", None
        )
        db_alias = getattr(request, "db_alias", "default")
        student = getattr(request.user, "student_profile", None)

        budget_service = TokenBudgetService()
        status_data = budget_service.get_status(
            tenant=tenant, student=student, db_alias=db_alias
        )
        return Response(status_data)


def _validate_lesson_artifact_lang(request):
    lang = LessonSummaryService.normalize_lang(request.query_params.get("lang", "en"))
    requested = str(request.query_params.get("lang", "en")).strip().lower()
    if requested not in {"", "en", "ne"}:
        return None, Response(
            {"error": "lang must be 'en' or 'ne'."}, status=status.HTTP_400_BAD_REQUEST
        )
    return lang, None


def _lesson_artifact_response(request, lesson_id: int, artifact_type: str):
    lang, lang_error = _validate_lesson_artifact_lang(request)
    if lang_error:
        return lang_error

    tenant = getattr(request, "tenant", None) or getattr(request.user, "tenant", None)
    if tenant is None:
        return Response(
            {"error": "tenant context is required"}, status=status.HTTP_400_BAD_REQUEST
        )

    if not Lesson.objects.filter(pk=lesson_id).exists():
        return Response({"error": "lesson not found"}, status=status.HTTP_404_NOT_FOUND)

    try:
        service = LessonSummaryService(tenant=tenant, user=request.user)
        payload = service.generate(
            lesson_id=int(lesson_id),
            artifact_type=artifact_type,
            lang=lang,
        )
        serializer = LessonArtifactResponseSerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)
    except Exception as e:
        import traceback

        traceback.print_exc()
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@throttle_classes([TutorChatRateThrottle])
def ai_lesson_summarize(request, lesson_id: int):
    return _lesson_artifact_response(
        request, lesson_id=lesson_id, artifact_type="summary"
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@throttle_classes([TutorChatRateThrottle])
def ai_lesson_exam_notes(request, lesson_id: int):
    return _lesson_artifact_response(
        request, lesson_id=lesson_id, artifact_type="exam_notes"
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@throttle_classes([TutorChatRateThrottle])
def ai_quiz_generate(request):
    role = str(getattr(request.user, "role", "") or "").strip().lower()
    if role not in {"teacher", "admin"}:
        return Response(
            {"detail": "Only Teacher/Admin can generate quizzes."},
            status=status.HTTP_403_FORBIDDEN,
        )

    tenant = getattr(request, "tenant", None) or getattr(request.user, "tenant", None)
    if tenant is None:
        return Response(
            {"error": "tenant context is required"}, status=status.HTTP_400_BAD_REQUEST
        )

    serializer = QuizGenerationRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    payload = serializer.validated_data

    try:
        service = QuizGeneratorService(tenant=tenant, user=request.user)
        result = service.generate(
            source_type=payload["source_type"],
            source_id=str(payload["source_id"]),
            difficulty=payload["difficulty"],
            count=int(payload["count"]),
        )
        output = QuizGenerationResponseSerializer(data=result)
        output.is_valid(raise_exception=True)
        return Response(output.validated_data, status=status.HTTP_200_OK)
    except QuizGenerationError as exc:
        return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as exc:
        import traceback

        traceback.print_exc()
        return Response(
            {"error": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


def _is_teacher_or_admin(user) -> bool:
    role = str(getattr(user, "role", "") or "").strip().lower()
    return role in {"teacher", "admin"}


# ---------------------------------------------------------------------------
# Phase 13 — Collaborative Filtering Recommendations
# ---------------------------------------------------------------------------


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def collaborative_recommendations(request):
    """
    GET /api/ai/personalization/collaborative-recommendations/
    Returns peer-based lesson recommendations for the authenticated student.
    """
    role = str(getattr(request.user, "role", "") or "").strip().lower()
    if role != "student":
        return Response(
            {"detail": "Only students can view peer recommendations."},
            status=status.HTTP_403_FORBIDDEN,
        )

    tenant = getattr(request, "tenant", None) or getattr(request.user, "tenant", None)
    db_alias = getattr(getattr(tenant, "_state", None), "db", None) or "default"

    try:
        student = request.user.student_profile
    except Exception:
        return Response(
            {"detail": "Student profile not found."}, status=status.HTTP_404_NOT_FOUND
        )

    from .services.collaborative_filter_service import CollaborativeFilterService

    service = CollaborativeFilterService(tenant=tenant)
    recommendations = service.recommend_lessons(student, using=db_alias)
    return Response({"recommendations": recommendations})


# ---------------------------------------------------------------------------
# Phase 11 — Misconception Detection from Wrong Answers
# ---------------------------------------------------------------------------


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def misconception_me(request):
    """
    GET /api/ai/analytics/misconceptions/me/?force=true
    Returns misconception report for the authenticated student.
    """
    role = str(getattr(request.user, "role", "") or "").strip().lower()
    if role != "student":
        return Response(
            {"detail": "Only students can view their own misconception report."},
            status=status.HTTP_403_FORBIDDEN,
        )

    tenant = getattr(request, "tenant", None) or getattr(request.user, "tenant", None)
    if tenant is None:
        return Response(
            {"error": "tenant context required"}, status=status.HTTP_400_BAD_REQUEST
        )
    db_alias = getattr(getattr(tenant, "_state", None), "db", None) or "default"

    try:
        student = request.user.student_profile
    except Exception:
        return Response(
            {"detail": "Student profile not found."}, status=status.HTTP_404_NOT_FOUND
        )

    force = request.query_params.get("force", "").lower() in ("1", "true")
    from .services.misconception_service import MisconceptionDetectionService

    service = MisconceptionDetectionService(tenant=tenant, user=request.user)
    report = service.analyse_student(student, using=db_alias, force=force)
    return Response(report)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def misconception_student(request, student_id):
    """
    GET /api/ai/analytics/misconceptions/student/<student_id>/
    Teacher/admin view of a student's misconception report.
    """
    if not _is_teacher_or_admin(request.user):
        return Response(
            {"detail": "Only teachers and admins can view misconception reports."},
            status=status.HTTP_403_FORBIDDEN,
        )

    tenant = getattr(request, "tenant", None) or getattr(request.user, "tenant", None)
    if tenant is None:
        return Response(
            {"error": "tenant context required"}, status=status.HTTP_400_BAD_REQUEST
        )
    db_alias = getattr(getattr(tenant, "_state", None), "db", None) or "default"

    student = (
        Student.objects.using(db_alias)
        .filter(student_id=student_id)
        .select_related("user")
        .first()
    )
    if student is None:
        return Response(
            {"detail": "Student not found."}, status=status.HTTP_404_NOT_FOUND
        )

    force = request.query_params.get("force", "").lower() in ("1", "true")
    from .services.misconception_service import MisconceptionDetectionService

    service = MisconceptionDetectionService(tenant=tenant, user=request.user)
    report = service.analyse_student(student, using=db_alias, force=force)
    return Response(report)


# ---------------------------------------------------------------------------
# Phase 10 — Predictive Grade Forecasting
# ---------------------------------------------------------------------------


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def grade_forecast_me(request):
    """
    GET /api/ai/analytics/grade_forecast/me/
    Returns per-subject grade forecasts for the authenticated student using
    exponential weighted moving average on past assessment results.
    """
    role = str(getattr(request.user, "role", "") or "").strip().lower()
    if role != "student":
        return Response(
            {"detail": "Only students can view their own forecast."},
            status=status.HTTP_403_FORBIDDEN,
        )

    tenant = getattr(request, "tenant", None) or getattr(request.user, "tenant", None)
    db_alias = getattr(tenant, "_state", None)
    db_alias = (db_alias.db if db_alias else None) or "default"

    try:
        student = request.user.student_profile
    except Exception:
        return Response(
            {"detail": "Student profile not found."}, status=status.HTTP_404_NOT_FOUND
        )

    from .services.grade_forecast_service import grade_forecast_service

    forecasts = grade_forecast_service.forecast_for_student(student, using=db_alias)
    return Response({"forecasts": forecasts})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def grade_forecast_student(request, student_id):
    """
    GET /api/ai/analytics/grade_forecast/student/<student_id>/
    Returns per-subject grade forecasts for a specific student (teacher/admin only).
    """
    if not _is_teacher_or_admin(request.user):
        return Response(
            {"detail": "Only teachers and admins can view student forecasts."},
            status=status.HTTP_403_FORBIDDEN,
        )

    tenant = getattr(request, "tenant", None) or getattr(request.user, "tenant", None)
    db_alias = getattr(tenant, "_state", None)
    db_alias = (db_alias.db if db_alias else None) or "default"

    student = (
        Student.objects.using(db_alias)
        .filter(student_id=student_id)
        .select_related("user")
        .first()
    )
    if student is None:
        return Response(
            {"detail": "Student not found."}, status=status.HTTP_404_NOT_FOUND
        )

    from .services.grade_forecast_service import grade_forecast_service

    forecasts = grade_forecast_service.forecast_for_student(student, using=db_alias)
    return Response(
        {
            "student_id": str(student.student_id),
            "student_name": student.user.get_full_name() if student.user else "",
            "forecasts": forecasts,
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def grade_forecast_class(request, class_id):
    """
    GET /api/ai/analytics/grade_forecast/class/<class_id>/
    Returns aggregate grade forecasts for all students in a class (teacher/admin only).
    """
    if not _is_teacher_or_admin(request.user):
        return Response(
            {"detail": "Only teachers and admins can view class forecasts."},
            status=status.HTTP_403_FORBIDDEN,
        )

    tenant = getattr(request, "tenant", None) or getattr(request.user, "tenant", None)
    db_alias = getattr(tenant, "_state", None)
    db_alias = (db_alias.db if db_alias else None) or "default"

    from .services.grade_forecast_service import grade_forecast_service

    data = grade_forecast_service.forecast_for_class(class_id, using=db_alias)
    return Response(data)


def _teacher_can_manage_submission(user, submission: Submission) -> bool:
    role = str(getattr(user, "role", "") or "").strip().lower()
    if role == "admin":
        return True
    if role != "teacher":
        return False

    teacher = (
        Teacher.objects.prefetch_related("assigned_classes").filter(user=user).first()
    )
    if not teacher:
        return False

    assessment = getattr(submission, "assessment", None)
    subject = getattr(assessment, "subject", None)
    if not subject:
        return False

    if getattr(subject, "teacher_id", None) == teacher.teacher_id:
        return True
    if subject.additional_teachers.filter(teacher_id=teacher.teacher_id).exists():
        return True

    class_id = getattr(subject, "academic_class_id", None)
    return bool(class_id and teacher.assigned_classes.filter(id=class_id).exists())


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@throttle_classes([TutorChatRateThrottle])
def ai_exam_generate(request):
    if not _is_teacher_or_admin(request.user):
        return Response(
            {"detail": "Only Teacher/Admin can generate exam papers."},
            status=status.HTTP_403_FORBIDDEN,
        )

    tenant = getattr(request, "tenant", None) or getattr(request.user, "tenant", None)
    if tenant is None:
        return Response(
            {"error": "tenant context is required"}, status=status.HTTP_400_BAD_REQUEST
        )

    serializer = ExamPaperGenerateRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    payload = serializer.validated_data

    try:
        service = ExamPaperGeneratorService(tenant=tenant, user=request.user)
        result = service.generate(
            class_id=payload["class_id"],
            subject_id=payload["subject_id"],
            units=payload.get("units") or [],
            marks=int(payload["marks"]),
            difficulty_mix=payload["difficulty_mix"],
        )
        output = ExamPaperGenerateResponseSerializer(data=result)
        output.is_valid(raise_exception=True)
        return Response(output.validated_data, status=status.HTTP_200_OK)
    except ExamPaperGenerationError as exc:
        return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as exc:
        import traceback

        traceback.print_exc()
        return Response(
            {"error": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def ai_generated_artifacts(request):
    if not _is_teacher_or_admin(request.user):
        return Response(
            {"detail": "Only Teacher/Admin can access generated artifacts."},
            status=status.HTTP_403_FORBIDDEN,
        )

    tenant = getattr(request, "tenant", None) or getattr(request.user, "tenant", None)
    if tenant is None:
        return Response(
            {"error": "tenant context is required"}, status=status.HTTP_400_BAD_REQUEST
        )

    queryset = AiGeneratedArtifact.objects.filter(tenant=tenant).order_by("-created_at")

    artifact_type = str(request.query_params.get("artifact_type") or "").strip()
    source_type = str(request.query_params.get("source_type") or "").strip()
    source_id = str(request.query_params.get("source_id") or "").strip()

    if artifact_type:
        queryset = queryset.filter(artifact_type=artifact_type)
    if source_type:
        queryset = queryset.filter(source_type=source_type)
    if source_id:
        queryset = queryset.filter(source_id=source_id)

    try:
        limit = int(request.query_params.get("limit", 20))
    except (TypeError, ValueError):
        return Response(
            {"error": "limit must be an integer."}, status=status.HTTP_400_BAD_REQUEST
        )
    limit = max(1, min(100, limit))

    serializer = AiGeneratedArtifactSerializer(queryset[:limit], many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
@throttle_classes([TutorChatRateThrottle])
def ai_grading_rubrics(request):
    if not _is_teacher_or_admin(request.user):
        return Response(
            {"detail": "Only Teacher/Admin can manage grading rubrics."},
            status=status.HTTP_403_FORBIDDEN,
        )

    tenant = getattr(request, "tenant", None) or getattr(request.user, "tenant", None)
    if tenant is None:
        return Response(
            {"error": "tenant context is required"}, status=status.HTTP_400_BAD_REQUEST
        )

    if request.method == "GET":
        rubrics = GradingRubric.objects.filter(tenant=tenant).order_by("-created_at")
        serializer = GradingRubricSerializer(rubrics, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    serializer = CreateGradingRubricSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    payload = serializer.validated_data
    rubric = GradingRubric.objects.create(
        tenant=tenant,
        title=payload["title"],
        criteria=payload.get("criteria") or [],
        total_points=int(payload["total_points"]),
        created_by=(
            request.user if getattr(request.user, "is_authenticated", False) else None
        ),
    )
    output = GradingRubricSerializer(rubric)
    return Response(output.data, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
@throttle_classes([TutorChatRateThrottle])
def ai_grading_drafts(request):
    if not _is_teacher_or_admin(request.user):
        return Response(
            {"detail": "Only Teacher/Admin can access grading drafts."},
            status=status.HTTP_403_FORBIDDEN,
        )

    tenant = getattr(request, "tenant", None) or getattr(request.user, "tenant", None)
    if tenant is None:
        return Response(
            {"error": "tenant context is required"}, status=status.HTTP_400_BAD_REQUEST
        )

    queryset = AIGradingDraft.objects.filter(tenant=tenant).select_related(
        "submission", "submission__assessment", "submission__assessment__subject"
    )
    submission_id = str(request.query_params.get("submission_id") or "").strip()
    if submission_id:
        queryset = queryset.filter(submission__submission_id=submission_id)

    role = str(getattr(request.user, "role", "") or "").strip().lower()
    if role == "teacher":
        allowed_ids: list[str] = []
        for draft in queryset:
            if _teacher_can_manage_submission(request.user, draft.submission):
                allowed_ids.append(str(draft.id))
        queryset = queryset.filter(id__in=allowed_ids)

    serializer = AIGradingDraftSerializer(
        queryset.order_by("-created_at")[:50], many=True
    )
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@throttle_classes([TutorChatRateThrottle])
def ai_grade_submission(request):
    if not _is_teacher_or_admin(request.user):
        return Response(
            {"detail": "Only Teacher/Admin can generate AI grading drafts."},
            status=status.HTTP_403_FORBIDDEN,
        )

    tenant = getattr(request, "tenant", None) or getattr(request.user, "tenant", None)
    if tenant is None:
        return Response(
            {"error": "tenant context is required"}, status=status.HTTP_400_BAD_REQUEST
        )

    serializer = GradeSubmissionRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    payload = serializer.validated_data

    submission = (
        Submission.objects.select_related("assessment", "assessment__subject")
        .filter(submission_id=payload["submission_id"])
        .first()
    )
    if submission is None:
        return Response(
            {"error": "submission not found"}, status=status.HTTP_404_NOT_FOUND
        )
    if str(
        getattr(request.user, "role", "") or ""
    ).strip().lower() == "teacher" and not _teacher_can_manage_submission(
        request.user, submission
    ):
        return Response(
            {
                "detail": "You can grade only submissions in your assigned classes/subjects."
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    try:
        service = AssistedGradingService(tenant=tenant, user=request.user)
        draft = service.generate_draft(
            submission_id=str(payload["submission_id"]),
            rubric_id=str(payload["rubric_id"]),
            request=request,
        )
        output = GradeSubmissionDraftResponseSerializer(
            data={
                "draft_id": str(draft.id),
                "score": float(draft.score),
                "feedback": draft.feedback,
                "criteria_breakdown": (
                    draft.criteria_breakdown
                    if isinstance(draft.criteria_breakdown, list)
                    else []
                ),
                "status": draft.status,
            }
        )
        output.is_valid(raise_exception=True)
        return Response(output.validated_data, status=status.HTTP_200_OK)
    except AssistedGradingError as exc:
        return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as exc:
        import traceback

        traceback.print_exc()
        return Response(
            {"error": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@throttle_classes([TutorChatRateThrottle])
def ai_approve_grading_draft(request):
    if not _is_teacher_or_admin(request.user):
        return Response(
            {"detail": "Only Teacher/Admin can approve AI grading drafts."},
            status=status.HTTP_403_FORBIDDEN,
        )

    tenant = getattr(request, "tenant", None) or getattr(request.user, "tenant", None)
    if tenant is None:
        return Response(
            {"error": "tenant context is required"}, status=status.HTTP_400_BAD_REQUEST
        )

    serializer = ApproveGradingDraftRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    payload = serializer.validated_data

    draft = (
        AIGradingDraft.objects.select_related(
            "submission", "submission__assessment", "submission__assessment__subject"
        )
        .filter(
            id=payload["draft_id"],
            tenant=tenant,
        )
        .first()
    )
    if draft is None:
        return Response({"error": "draft not found"}, status=status.HTTP_404_NOT_FOUND)
    if str(
        getattr(request.user, "role", "") or ""
    ).strip().lower() == "teacher" and not _teacher_can_manage_submission(
        request.user, draft.submission
    ):
        return Response(
            {
                "detail": "You can approve only submissions in your assigned classes/subjects."
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    try:
        service = AssistedGradingService(tenant=tenant, user=request.user)
        approved = service.approve_draft(
            draft_id=str(payload["draft_id"]), request=request
        )
        return Response(
            {
                "status": approved.status,
                "draft_id": str(approved.id),
                "score": float(approved.score),
                "approved_at": approved.approved_at,
            },
            status=status.HTTP_200_OK,
        )
    except AssistedGradingError as exc:
        return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as exc:
        import traceback

        traceback.print_exc()
        return Response(
            {"error": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# ---------------------------------------------------------------------------
# Phase 12 — Knowledge Graph / Concept Prerequisites
# ---------------------------------------------------------------------------


def _get_kg_service(request):
    tenant = getattr(request, "tenant", None) or getattr(request.user, "tenant", None)
    db_alias = getattr(getattr(tenant, "_state", None), "db", None) or "default"
    from .services.knowledge_graph_service import KnowledgeGraphService

    return KnowledgeGraphService(tenant=tenant, user=request.user), db_alias


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def knowledge_graph_subject(request, subject_id):
    """
    GET /api/ai/knowledge-graph/subject/<subject_id>/
    Returns prerequisite graph (nodes + edges) for a subject.
    """
    service, db_alias = _get_kg_service(request)
    data = service.get_graph_for_subject(subject_id, using=db_alias)
    return Response(data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def knowledge_graph_gaps(request):
    """
    GET /api/ai/knowledge-graph/gaps/
    Returns root-cause prerequisite gaps for the authenticated student.
    """
    role = str(getattr(request.user, "role", "") or "").strip().lower()
    if role != "student":
        return Response(
            {"detail": "Only students can view their own gaps."},
            status=status.HTTP_403_FORBIDDEN,
        )

    try:
        student = request.user.student_profile
    except Exception:
        return Response(
            {"detail": "Student profile not found."}, status=status.HTTP_404_NOT_FOUND
        )

    service, db_alias = _get_kg_service(request)
    gaps = service.find_root_cause_gaps(student, using=db_alias)
    return Response({"root_cause_gaps": gaps})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def knowledge_graph_gaps_student(request, student_id):
    """
    GET /api/ai/knowledge-graph/gaps/student/<student_id>/
    Teacher/admin view of root-cause prerequisite gaps for a student.
    """
    if not _is_teacher_or_admin(request.user):
        return Response(
            {"detail": "Only teachers and admins can view student gaps."},
            status=status.HTTP_403_FORBIDDEN,
        )

    service, db_alias = _get_kg_service(request)
    student = Student.objects.using(db_alias).filter(student_id=student_id).first()
    if student is None:
        return Response(
            {"detail": "Student not found."}, status=status.HTTP_404_NOT_FOUND
        )

    gaps = service.find_root_cause_gaps(student, using=db_alias)
    return Response({"root_cause_gaps": gaps})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def knowledge_graph_add_prerequisite(request):
    """
    POST /api/ai/knowledge-graph/prerequisites/
    Body: { skill_id, prerequisite_id }
    Add a prerequisite edge (teacher/admin only).
    """
    if not _is_teacher_or_admin(request.user):
        return Response(
            {"detail": "Only teachers and admins can manage prerequisites."},
            status=status.HTTP_403_FORBIDDEN,
        )

    skill_id = request.data.get("skill_id")
    prerequisite_id = request.data.get("prerequisite_id")
    if not skill_id or not prerequisite_id:
        return Response(
            {"error": "skill_id and prerequisite_id are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    service, db_alias = _get_kg_service(request)
    try:
        edge = service.add_prerequisite(
            skill_id=skill_id, prerequisite_id=prerequisite_id, using=db_alias
        )
        return Response(
            {
                "id": str(edge.id),
                "skill_id": str(edge.skill_id),
                "prerequisite_id": str(edge.prerequisite_id),
            },
            status=status.HTTP_201_CREATED,
        )
    except ValueError as exc:
        return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def knowledge_graph_remove_prerequisite(request):
    """
    DELETE /api/ai/knowledge-graph/prerequisites/
    Body: { skill_id, prerequisite_id }
    Remove a prerequisite edge (teacher/admin only).
    """
    if not _is_teacher_or_admin(request.user):
        return Response(
            {"detail": "Only teachers and admins can manage prerequisites."},
            status=status.HTTP_403_FORBIDDEN,
        )

    skill_id = request.data.get("skill_id")
    prerequisite_id = request.data.get("prerequisite_id")
    service, db_alias = _get_kg_service(request)
    deleted = service.remove_prerequisite(
        skill_id=skill_id, prerequisite_id=prerequisite_id, using=db_alias
    )
    if deleted:
        return Response(status=status.HTTP_204_NO_CONTENT)
    return Response({"error": "Edge not found."}, status=status.HTTP_404_NOT_FOUND)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def knowledge_graph_auto_generate(request, subject_id):
    """
    POST /api/ai/knowledge-graph/subject/<subject_id>/auto-generate/
    Use LLM to auto-generate prerequisite edges for a subject (admin only).
    """
    role = str(getattr(request.user, "role", "") or "").strip().lower()
    if role != "admin":
        return Response(
            {"detail": "Only admins can auto-generate the prerequisite graph."},
            status=status.HTTP_403_FORBIDDEN,
        )

    service, db_alias = _get_kg_service(request)
    results = service.generate_prerequisites_for_subject(subject_id, using=db_alias)
    return Response(
        {"generated": results, "count": sum(1 for r in results if r.get("created"))}
    )


# ── Phase 11: Video Transcript Indexing ──────────────────────────────────────


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def ai_transcribe_lesson(request, lesson_id):
    """
    POST /api/ai/lessons/<lesson_id>/transcribe/

    Trigger Whisper transcription for a video lesson.
    Runs async via Celery (or sync fallback).
    Returns the transcript immediately if the lesson already has one,
    otherwise enqueues transcription and returns 202 Accepted.

    Teacher/admin only.
    """
    role = str(getattr(request.user, "role", "") or "").strip().lower()
    if role not in ("teacher", "admin", "staff"):
        return Response(
            {"detail": "Only teachers and admins can trigger transcription."},
            status=status.HTTP_403_FORBIDDEN,
        )

    db_alias = getattr(request, "db_alias", "default")
    lesson = Lesson.objects.using(db_alias).filter(pk=lesson_id).first()
    if lesson is None:
        return Response(
            {"detail": "Lesson not found."}, status=status.HTTP_404_NOT_FOUND
        )

    # If transcript already exists and force=false, return it
    existing = getattr(lesson, "video_transcript", None) or ""
    force = request.data.get("force", False)
    if existing and not force:
        return Response(
            {"lesson_id": lesson_id, "transcript": existing, "status": "cached"}
        )

    if not getattr(lesson, "video_url", None):
        return Response(
            {"detail": "Lesson has no video URL."}, status=status.HTTP_400_BAD_REQUEST
        )

    tenant = getattr(request, "tenant", None)
    schema_name = getattr(tenant, "schema_name", "public") if tenant else "public"

    from .tasks import transcribe_lesson_task

    enqueue_job(
        transcribe_lesson_task,
        tenant_schema=schema_name,
        lesson_id=lesson_id,
    )
    return Response(
        {
            "lesson_id": lesson_id,
            "status": "queued",
            "message": "Transcription started. Check back shortly.",
        },
        status=status.HTTP_202_ACCEPTED,
    )
