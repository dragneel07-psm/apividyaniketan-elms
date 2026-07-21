# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.test import SimpleTestCase, override_settings
from rest_framework.request import Request
from rest_framework.test import APIRequestFactory

from core.pagination import StandardResultsSetPagination


class StandardPaginationPolicyTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

    @override_settings(PAGE_SIZE=20, MAX_PAGE_SIZE=100)
    def test_page_size_query_param_is_capped_by_max_page_size(self):
        request = Request(self.factory.get("/api/test/?page_size=1000"))
        paginator = StandardResultsSetPagination()

        page = paginator.paginate_queryset(list(range(500)), request)

        self.assertEqual(len(page), 100)

    @override_settings(PAGE_SIZE=15, MAX_PAGE_SIZE=100)
    def test_default_page_size_comes_from_settings(self):
        request = Request(self.factory.get("/api/test/"))
        paginator = StandardResultsSetPagination()

        page = paginator.paginate_queryset(list(range(500)), request)

        self.assertEqual(len(page), 15)
