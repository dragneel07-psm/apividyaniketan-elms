# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import dj_database_url

from .base import *

DEBUG = False

# Use a faster password hasher for tests
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.MD5PasswordHasher",
]

# Ensure we're using a proper secret key for tests
SECRET_KEY = "test-secret-key-for-ci-"

# Test-specific settings.
# django-tenants requires its own DB backend (schema switching) and PostgreSQL —
# sqlite cannot run the tenant suite. Keep the tenant engine that base.py sets;
# omitting it here silently drops schema support and every FastTenantTestCase
# fails at test-DB creation with "'DatabaseWrapper' object has no attribute
# 'set_schema'".
DATABASES = {
    "default": dj_database_url.config(
        default="postgres://postgres:postgres@127.0.0.1:5432/elearning",
        conn_max_age=600,
        engine="django_tenants.postgresql_backend",
    )
}
