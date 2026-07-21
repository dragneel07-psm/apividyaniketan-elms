# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from .academic import (
    AcademicClassSerializer,
    AcademicYearSerializer,
    SectionSerializer,
    SubjectSerializer,
)
from .admission import AdmissionEnquirySerializer
from .notice import NoticeSerializer
from .profiles import (
    ParentSerializer,
    StudentCreateSerializer,
    StudentDetailSerializer,
    StudentListSerializer,
    StudentUpdateSerializer,
    TeacherSerializer,
)
