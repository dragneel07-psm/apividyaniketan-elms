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
DATABASES = {
    "default": dj_database_url.config(
        default="postgres://postgres:postgres@127.0.0.1:5432/elearning",
        conn_max_age=600,
        engine="django.db.backends.postgresql",
    )
}
