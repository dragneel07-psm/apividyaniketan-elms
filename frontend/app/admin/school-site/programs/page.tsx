// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { Sparkles } from 'lucide-react';
import { ContentCrudPage, type FieldSchema } from '@/components/admin/content-crud-page';
import { programsAPI, type Program } from '@/lib/api';

const fields: FieldSchema<Program>[] = [
    { name: 'title', label: 'Title', type: 'text', required: true },
    { name: 'description', label: 'Description', type: 'textarea', required: true },
    {
        name: 'icon', label: 'Icon', type: 'select', required: true,
        options: [
            { value: 'book', label: 'Book' },
            { value: 'flask', label: 'Flask' },
            { value: 'palette', label: 'Palette' },
            { value: 'trophy', label: 'Trophy' },
        ],
    },
];

export default function ProgramsAdminPage() {
    return (
        <ContentCrudPage
            title="Programs & Facilities"
            description="Manage the featured programs shown on the Home page."
            icon={Sparkles}
            api={programsAPI}
            fields={fields}
            columns={[
                { key: 'title', label: 'Title' },
                { key: 'icon', label: 'Icon' },
            ]}
            emptyDefaults={{ icon: 'book' }}
            getRowTitle={(item) => item.title}
        />
    );
}
