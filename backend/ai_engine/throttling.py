# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from rest_framework.throttling import ScopedRateThrottle


class TutorChatRateThrottle(ScopedRateThrottle):
    scope = "ai_tutor_chat"
