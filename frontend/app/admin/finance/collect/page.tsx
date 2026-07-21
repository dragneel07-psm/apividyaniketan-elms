// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import FeeCollector from '@/components/finance/FeeCollector';

export default function AdminCollectDataPage() {
    return (
        <div className="max-w-6xl mx-auto py-6">
            <h1 className="text-2xl font-bold tracking-tight mb-6">Collect Payments</h1>
            <FeeCollector />
        </div>
    );
}
