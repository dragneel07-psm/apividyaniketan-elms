// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { HeartHandshake } from 'lucide-react';
import { ContentCrudPage, type FieldSchema } from '@/components/admin/content-crud-page';
import { wellbeingSupportAPI, type WellbeingSupport } from '@/lib/api';

const fields: FieldSchema<WellbeingSupport>[] = [
    { name: 'title', label: 'Title', type: 'text', required: true },
    { name: 'description', label: 'Description', type: 'textarea', required: true },
    { name: 'image', label: 'Photo', type: 'image' },
];

export default function WellbeingAdminPage() {
    return (
        <ContentCrudPage
            title="Counseling & Wellbeing"
            description="Manage the wellbeing support entries on the Student Life page."
            icon={HeartHandshake}
            api={wellbeingSupportAPI}
            fields={fields}
            columns={[{ key: 'title', label: 'Title' }, { key: 'description', label: 'Description' }]}
            emptyDefaults={{}}
            getRowTitle={(item) => item.title}
        />
    );
}
