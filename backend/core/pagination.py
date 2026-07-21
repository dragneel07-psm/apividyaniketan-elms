# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.conf import settings
from rest_framework.pagination import PageNumberPagination


class StandardResultsSetPagination(PageNumberPagination):
    """
    Global pagination policy:
    - default page size from settings.PAGE_SIZE
    - client-controlled page_size with hard max cap
    """

    page_size_query_param = "page_size"

    @property
    def page_size(self):
        return int(getattr(settings, "PAGE_SIZE", 20))

    @property
    def max_page_size(self):
        return int(getattr(settings, "MAX_PAGE_SIZE", 100))
