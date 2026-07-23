// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { MapPinned } from 'lucide-react';
import { ContentCrudPage, type FieldSchema } from '@/components/admin/content-crud-page';
import { fieldTripsAPI, type FieldTrip } from '@/lib/api';

const fields: FieldSchema<FieldTrip>[] = [
    { name: 'title', label: 'Title', type: 'text', required: true },
    { name: 'description', label: 'Description', type: 'textarea', required: true },
    { name: 'grade_band', label: 'Grade band (e.g. "Grade 3 – 5")', type: 'text', required: true },
];

export default function FieldTripsAdminPage() {
    return (
        <ContentCrudPage
            title="Field Trips"
            description="Manage field trips shown on the Student Life page."
            icon={MapPinned}
            api={fieldTripsAPI}
            fields={fields}
            columns={[{ key: 'title', label: 'Title' }, { key: 'grade_band', label: 'Grade band' }]}
            emptyDefaults={{}}
            getRowTitle={(item) => item.title}
        />
    );
}
