# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import urllib.parse

from django.conf import settings

url = "postgresql://postgres:juKGWxVyqjOzePLtIlWsxWNsWdCAbBnr@e-learningwebapp.railway.internal:5432/"


def parse_db_url(url):
    import dj_database_url

    d = dj_database_url.parse(url, engine="django_tenants.postgresql_backend")

    # Robust fix
    if not d.get("NAME") or d.get("NAME") == "":
        d["NAME"] = "elearning"

    return d


print(parse_db_url(url))
