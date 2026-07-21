# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AcademicClassViewSet,
    AcademicYearViewSet,
    AdmissionEnquiryViewSet,
    AssessmentViewSet,
    AssetViewSet,
    AttendanceViewSet,
    ChapterViewSet,
    ComplaintViewSet,
    ConsumableStockViewSet,
    DisciplinaryIncidentViewSet,
    ExamSeatingViewSet,
    ExamViewSet,
    LessonMaterialViewSet,
    LessonViewSet,
    LiveSessionViewSet,
    MaintenanceRequestViewSet,
    NoticeViewSet,
    ParentTeacherMeetingViewSet,
    ParentViewSet,
    QuestionViewSet,
    ReportViewSet,
    ResultViewSet,
    SchoolERPOverviewView,
    SchoolEventViewSet,
    SectionViewSet,
    SISDashboardViewSet,
    StudentDocumentViewSet,
    StudentHealthRecordViewSet,
    StudentLeaveViewSet,
    StudentViewSet,
    SubjectViewSet,
    SubmissionViewSet,
    TeacherViewSet,
    TimetableViewSet,
)
from .views.admin_actions import (
    GenerateAIReportsView,
    SeedAttendanceView,
    SeedDemoDataView,
    SeedResultsView,
    YearAlignmentCheckView,
)
from .views.analytics import SchoolAnalyticsDashboardView
from .views.stats import AcademicStatsView

router = DefaultRouter()
router.register(r"years", AcademicYearViewSet)  # /api/academic/years/
router.register(r"classes", AcademicClassViewSet)  # /api/academic/classes/
router.register(r"sections", SectionViewSet)  # /api/academic/sections/
router.register(r"subjects", SubjectViewSet)  # /api/academic/subjects/
router.register(r"teachers", TeacherViewSet)  # /api/academic/teachers/
router.register(r"students", StudentViewSet)  # /api/academic/students/
router.register(r"chapters", ChapterViewSet)  # /api/academic/chapters/
router.register(r"lessons", LessonViewSet)  # /api/academic/lessons/
router.register(r"materials", LessonMaterialViewSet)  # /api/academic/materials/
router.register(r"assessments", AssessmentViewSet)
router.register(r"questions", QuestionViewSet)
router.register(r"submissions", SubmissionViewSet)
router.register(r"results", ResultViewSet)
router.register(r"parents", ParentViewSet)
router.register(r"attendance", AttendanceViewSet)
router.register(r"timetable", TimetableViewSet)
router.register(r"exams", ExamViewSet)
router.register(r"exam-seating", ExamSeatingViewSet)
router.register(r"notices", NoticeViewSet)
router.register(r"reports", ReportViewSet, basename="reports")
router.register(r"admissions", AdmissionEnquiryViewSet, basename="admissions")
router.register(
    r"parent-meetings", ParentTeacherMeetingViewSet, basename="parent-meetings"
)
router.register(r"sis/health", StudentHealthRecordViewSet, basename="sis-health")
router.register(r"sis/incidents", DisciplinaryIncidentViewSet, basename="sis-incidents")
router.register(r"sis/documents", StudentDocumentViewSet, basename="sis-documents")
router.register(r"sis/dashboard", SISDashboardViewSet, basename="sis-dashboard")
router.register(r"events", SchoolEventViewSet, basename="events")
router.register(r"inventory/assets", AssetViewSet, basename="inventory-assets")
router.register(
    r"inventory/maintenance",
    MaintenanceRequestViewSet,
    basename="inventory-maintenance",
)
router.register(r"inventory/stock", ConsumableStockViewSet, basename="inventory-stock")
router.register(r"student-leaves", StudentLeaveViewSet, basename="student-leave")
router.register(r"complaints", ComplaintViewSet, basename="complaint")
router.register(r"live-sessions", LiveSessionViewSet, basename="live-session")

urlpatterns = [
    path("stats/", AcademicStatsView.as_view(), name="academic-stats"),
    path("erp/overview/", SchoolERPOverviewView.as_view(), name="school-erp-overview"),
    path(
        "analytics/dashboard/",
        SchoolAnalyticsDashboardView.as_view(),
        name="analytics-dashboard",
    ),
    path(
        "admin/actions/seed-attendance/",
        SeedAttendanceView.as_view(),
        name="admin-seed-attendance",
    ),
    path(
        "admin/actions/seed-results/",
        SeedResultsView.as_view(),
        name="admin-seed-results",
    ),
    path(
        "admin/actions/generate-ai-reports/",
        GenerateAIReportsView.as_view(),
        name="admin-generate-ai-reports",
    ),
    path(
        "admin/actions/check-year-alignment/",
        YearAlignmentCheckView.as_view(),
        name="admin-check-year-alignment",
    ),
    path(
        "admin/actions/seed-demo-data/",
        SeedDemoDataView.as_view(),
        name="admin-seed-demo-data",
    ),
    path("", include(router.urls)),
]
