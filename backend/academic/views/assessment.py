# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Backwards-compatible re-exports.
Real implementation lives in the split modules:
  - assessment_core.py    → AssessmentViewSet
  - question.py           → QuestionViewSet
  - submission.py         → SubmissionViewSet
  - result.py             → ResultViewSet
"""

from .assessment_core import AssessmentViewSet
from .question import QuestionViewSet
from .result import ResultViewSet
from .submission import SubmissionViewSet

__all__ = ["AssessmentViewSet", "QuestionViewSet", "SubmissionViewSet", "ResultViewSet"]
