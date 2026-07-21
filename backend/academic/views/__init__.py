# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from .academic import (
    AcademicClassViewSet,
    AcademicYearViewSet,
    SectionViewSet,
    SubjectViewSet,
)
from .admission import AdmissionEnquiryViewSet
from .assessment import (
    AssessmentViewSet,
    QuestionViewSet,
    ResultViewSet,
    SubmissionViewSet,
)
from .attendance import AttendanceViewSet
from .complaint import ComplaintViewSet
from .erp import SchoolERPOverviewView
from .events import SchoolEventViewSet
from .exam import ExamSeatingViewSet, ExamViewSet
from .inventory import AssetViewSet, ConsumableStockViewSet, MaintenanceRequestViewSet
from .lesson import ChapterViewSet, LessonMaterialViewSet, LessonViewSet
from .live_session import LiveSessionViewSet
from .notice import NoticeViewSet
from .profiles import (
    ParentTeacherMeetingViewSet,
    ParentViewSet,
    StudentViewSet,
    TeacherViewSet,
)
from .reports import ReportViewSet
from .sis import (
    DisciplinaryIncidentViewSet,
    SISDashboardViewSet,
    StudentDocumentViewSet,
    StudentHealthRecordViewSet,
)
from .student_leave import StudentLeaveViewSet
from .timetable import TimetableViewSet
