# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import dj_database_url

d = dj_database_url.parse(
    "postgresql://postgres:juKGWxVyqjOzePLtIlWsxWNsWdCAbBnr@e-learningwebapp.railway.internal:5432/"
)
d["NAME"] = ""
print(d)
