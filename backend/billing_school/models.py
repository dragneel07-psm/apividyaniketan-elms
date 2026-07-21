# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Re-export the app's models so Django's app registry discovers them at
startup.

Without this, `makemigrations` doesn't see the NAS / ledger models that
live in models_nas.py and models_ledger.py and would emit catastrophic
DeleteModel migrations for them. Importing here registers the models
exactly once.
"""

from .models_ledger import LedgerAccount, LedgerEntry  # noqa: F401
from .models_nas import (  # noqa: F401
    ChartOfAccount,
    FundAccount,
    InventoryItem,
    JournalEntry,
    JournalLine,
    MerchantServiceFee,
    TDSEntry,
)
