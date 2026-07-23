# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AcademicClassViewSet,
    AcademicYearViewSet,
    AdmissionEnquiryViewSet,
    AdmissionFaqViewSet,
    AssessmentViewSet,
    AssetViewSet,
    AttendanceViewSet,
    ChapterViewSet,
    ComplaintViewSet,
    ConsumableStockViewSet,
    CoreValueViewSet,
    DisciplinaryIncidentViewSet,
    ExamSeatingViewSet,
    ExamSubjectViewSet,
    ExamTermViewSet,
    ExamViewSet,
    FieldTripViewSet,
    GalleryItemViewSet,
    GradingProfileViewSet,
    HistoryMilestoneViewSet,
    LessonMaterialViewSet,
    LessonViewSet,
    LiveSessionViewSet,
    MaintenanceRequestViewSet,
    NewsArticleViewSet,
    NoticeViewSet,
    PaperCodeViewSet,
    ParentTeacherMeetingViewSet,
    ParentViewSet,
    ProgramViewSet,
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
    StudentLifeActivityViewSet,
    StudentTermResultViewSet,
    StudentViewSet,
    SubjectViewSet,
    SubmissionViewSet,
    TeacherViewSet,
    TestimonialViewSet,
    TimetableViewSet,
    WellbeingSupportViewSet,
)
from .views.admin_actions import (
    GenerateAIReportsView,
    SeedAttendanceView,
    SeedDemoDataView,
    SeedResultsView,
    YearAlignmentCheckView,
)
from .views.analytics import SchoolAnalyticsDashboardView
from .views.public import (
    PublicAdmissionEnquiryView,
    PublicEventListView,
    PublicNoticeListView,
)
from .views.site_content_public import (
    PublicAdmissionFaqListView,
    PublicCoreValueListView,
    PublicFieldTripListView,
    PublicGalleryItemListView,
    PublicHistoryMilestoneListView,
    PublicNewsArticleListView,
    PublicProgramListView,
    PublicStudentLifeActivityListView,
    PublicTestimonialListView,
    PublicWellbeingSupportListView,
)
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
router.register(r"grading-profiles", GradingProfileViewSet, basename="grading-profile")
router.register(r"exam-terms", ExamTermViewSet, basename="exam-term")
router.register(r"exam-subjects", ExamSubjectViewSet, basename="exam-subject")
router.register(r"answer-papers", PaperCodeViewSet, basename="answer-paper")
router.register(r"term-results", StudentTermResultViewSet, basename="term-result")
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
router.register(r"news-articles", NewsArticleViewSet, basename="news-article")
router.register(r"gallery-items", GalleryItemViewSet, basename="gallery-item")
router.register(r"testimonials", TestimonialViewSet, basename="testimonial")
router.register(r"programs", ProgramViewSet, basename="program")
router.register(r"core-values", CoreValueViewSet, basename="core-value")
router.register(
    r"history-milestones", HistoryMilestoneViewSet, basename="history-milestone"
)
router.register(
    r"student-life-activities",
    StudentLifeActivityViewSet,
    basename="student-life-activity",
)
router.register(r"field-trips", FieldTripViewSet, basename="field-trip")
router.register(
    r"wellbeing-support", WellbeingSupportViewSet, basename="wellbeing-support"
)
router.register(r"admission-faqs", AdmissionFaqViewSet, basename="admission-faq")

urlpatterns = [
    path("stats/", AcademicStatsView.as_view(), name="academic-stats"),
    path(
        "public-admissions/",
        PublicAdmissionEnquiryView.as_view(),
        name="public-admissions",
    ),
    path("public-notices/", PublicNoticeListView.as_view(), name="public-notices"),
    path("public-events/", PublicEventListView.as_view(), name="public-events"),
    path(
        "public-news-articles/",
        PublicNewsArticleListView.as_view(),
        name="public-news-articles",
    ),
    path(
        "public-gallery-items/",
        PublicGalleryItemListView.as_view(),
        name="public-gallery-items",
    ),
    path(
        "public-testimonials/",
        PublicTestimonialListView.as_view(),
        name="public-testimonials",
    ),
    path("public-programs/", PublicProgramListView.as_view(), name="public-programs"),
    path(
        "public-core-values/",
        PublicCoreValueListView.as_view(),
        name="public-core-values",
    ),
    path(
        "public-history-milestones/",
        PublicHistoryMilestoneListView.as_view(),
        name="public-history-milestones",
    ),
    path(
        "public-student-life-activities/",
        PublicStudentLifeActivityListView.as_view(),
        name="public-student-life-activities",
    ),
    path(
        "public-field-trips/",
        PublicFieldTripListView.as_view(),
        name="public-field-trips",
    ),
    path(
        "public-wellbeing-support/",
        PublicWellbeingSupportListView.as_view(),
        name="public-wellbeing-support",
    ),
    path(
        "public-admission-faqs/",
        PublicAdmissionFaqListView.as_view(),
        name="public-admission-faqs",
    ),
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
