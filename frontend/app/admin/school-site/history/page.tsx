// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { History } from 'lucide-react';
import { ContentCrudPage, type FieldSchema } from '@/components/admin/content-crud-page';
import { historyMilestonesAPI, type HistoryMilestone } from '@/lib/api';

const fields: FieldSchema<HistoryMilestone>[] = [
    { name: 'year', label: 'Year (e.g. "2058 B.S." or "Today")', type: 'text', required: true },
    { name: 'title', label: 'Title', type: 'text', required: true },
    { name: 'description', label: 'Description', type: 'textarea', required: true },
];

export default function HistoryAdminPage() {
    return (
        <ContentCrudPage
            title="School History"
            description="Manage the history timeline shown on the About Us page."
            icon={History}
            api={historyMilestonesAPI}
            fields={fields}
            columns={[{ key: 'year', label: 'Year' }, { key: 'title', label: 'Title' }]}
            emptyDefaults={{}}
            getRowTitle={(item) => item.title}
        />
    );
}
