# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"logs", views.AIInteractionLogViewSet)
router.register(r"reports", views.StudentAIReportViewSet, basename="student-reports")
router.register(r"learning-paths", views.LearningPathViewSet, basename="learning-paths")
router.register(r"learning-nodes", views.LearningNodeViewSet, basename="learning-nodes")
router.register(r"study-schedule", views.StudyEventViewSet, basename="study-schedule")
router.register(
    r"conversations", views.TutorConversationViewSet, basename="tutor-conversations"
)
router.register(r"skill-tags", views.SkillTagViewSet, basename="skill-tags")
router.register(r"skill-mastery", views.SkillMasteryViewSet, basename="skill-mastery")
router.register(r"token-budgets", views.AITokenBudgetViewSet, basename="token-budgets")

urlpatterns = [
    path("", include(router.urls)),
    path("artifacts/", views.ai_generated_artifacts, name="ai_generated_artifacts"),
    path("grading/rubrics/", views.ai_grading_rubrics, name="ai_grading_rubrics"),
    path("grading/drafts/", views.ai_grading_drafts, name="ai_grading_drafts"),
    path(
        "grading/grade_submission/",
        views.ai_grade_submission,
        name="ai_grade_submission",
    ),
    path(
        "grading/approve_draft/",
        views.ai_approve_grading_draft,
        name="ai_approve_grading_draft",
    ),
    path("exams/generate/", views.ai_exam_generate, name="ai_exam_generate"),
    path("quizzes/generate/", views.ai_quiz_generate, name="ai_quiz_generate"),
    path(
        "lessons/<int:lesson_id>/summarize/",
        views.ai_lesson_summarize,
        name="ai_lesson_summarize",
    ),
    path(
        "lessons/<int:lesson_id>/exam_notes/",
        views.ai_lesson_exam_notes,
        name="ai_lesson_exam_notes",
    ),
    path(
        "lessons/<int:lesson_id>/transcribe/",
        views.ai_transcribe_lesson,
        name="ai_transcribe_lesson",
    ),
    path(
        "jobs/index-content/",
        views.enqueue_ai_index_content,
        name="ai_enqueue_index_content",
    ),
    path("jobs/summaries/", views.enqueue_ai_summary, name="ai_enqueue_summary"),
    path("jobs/quizzes/", views.enqueue_ai_quiz, name="ai_enqueue_quiz"),
    path("chunks/search/", views.ai_chunk_search, name="ai_chunk_search"),
    path(
        "admin_assistant/query/",
        views.admin_assistant_query,
        name="admin_assistant_query",
    ),
    path("tutor/chat/", views.ai_tutor_chat, name="ai_tutor_chat"),
    path("analytics/teacher/", views.teacher_analytics, name="teacher_analytics"),
    path(
        "analytics/at_risk_students/", views.at_risk_students, name="at_risk_students"
    ),
    path(
        "personalization/recommendations/",
        views.student_recommendations,
        name="student_recommendations",
    ),
    # Phase 13 — Collaborative Filtering
    path(
        "personalization/collaborative-recommendations/",
        views.collaborative_recommendations,
        name="collaborative_recommendations",
    ),
    path(
        "reports/student/<uuid:student_id>/",
        views.student_report,
        name="student_report_generate",
    ),
    path(
        "reports/student/<uuid:student_id>/history/",
        views.student_past_reports,
        name="student_report_history",
    ),
    # Phase 9 – AI Progress Reports
    path("reports/me/", views.my_progress_report, name="my_progress_report"),
    path(
        "reports/me/generate/",
        views.generate_my_progress_report,
        name="generate_my_progress_report",
    ),
    path("reports/me/history/", views.my_report_history, name="my_report_history"),
    path(
        "reports/class/<int:class_id>/",
        views.class_progress_report,
        name="class_progress_report",
    ),
    # Phase 12 — Knowledge Graph / Concept Prerequisites
    path(
        "knowledge-graph/subject/<int:subject_id>/",
        views.knowledge_graph_subject,
        name="kg_subject",
    ),
    path(
        "knowledge-graph/subject/<int:subject_id>/auto-generate/",
        views.knowledge_graph_auto_generate,
        name="kg_auto_generate",
    ),
    path("knowledge-graph/gaps/", views.knowledge_graph_gaps, name="kg_gaps_me"),
    path(
        "knowledge-graph/gaps/student/<uuid:student_id>/",
        views.knowledge_graph_gaps_student,
        name="kg_gaps_student",
    ),
    path(
        "knowledge-graph/prerequisites/",
        views.knowledge_graph_add_prerequisite,
        name="kg_add_prerequisite",
    ),
    # Phase 11 — Misconception Detection
    path(
        "analytics/misconceptions/me/", views.misconception_me, name="misconception_me"
    ),
    path(
        "analytics/misconceptions/student/<uuid:student_id>/",
        views.misconception_student,
        name="misconception_student",
    ),
    # Phase 10 — Predictive Grade Forecasting
    path(
        "analytics/grade_forecast/me/",
        views.grade_forecast_me,
        name="grade_forecast_me",
    ),
    path(
        "analytics/grade_forecast/student/<uuid:student_id>/",
        views.grade_forecast_student,
        name="grade_forecast_student",
    ),
    path(
        "analytics/grade_forecast/class/<int:class_id>/",
        views.grade_forecast_class,
        name="grade_forecast_class",
    ),
]
