# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.utils.cache_keys import tenant_cache_key

from ..models import AcademicClass, Student, Subject, Teacher


class AcademicStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        using_db = getattr(request, "db_alias", "default")
        cache_key = tenant_cache_key("academic_stats", using_db, request=request)

        from django.core.cache import cache

        cached_stats = cache.get(cache_key)
        if cached_stats:
            return Response(cached_stats)

        stats = {
            "total_teachers": Teacher.objects.using(using_db).count(),
            "total_students": Student.objects.using(using_db).count(),
            "total_classes": AcademicClass.objects.using(using_db).count(),
            "total_subjects": Subject.objects.using(using_db).count(),
        }

        cache.set(cache_key, stats, 300)  # Cache for 5 minutes
        return Response(stats)
