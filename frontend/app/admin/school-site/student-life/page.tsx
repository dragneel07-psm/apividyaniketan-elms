// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { Users } from 'lucide-react';
import { ContentCrudPage, type FieldSchema } from '@/components/admin/content-crud-page';
import { studentLifeActivitiesAPI, type StudentLifeActivity } from '@/lib/api';

const fields: FieldSchema<StudentLifeActivity>[] = [
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'description', label: 'Description', type: 'textarea', required: true },
    {
        name: 'category', label: 'Category', type: 'select', required: true,
        options: [
            { value: 'clubs', label: 'Clubs' },
            { value: 'sports', label: 'Sports' },
            { value: 'arts', label: 'Arts' },
            { value: 'leadership', label: 'Leadership' },
        ],
    },
    { name: 'image', label: 'Photo', type: 'image' },
];

export default function StudentLifeAdminPage() {
    return (
        <ContentCrudPage
            title="Student Life Activities"
            description="Manage clubs, sports, arts, and leadership activities on the Student Life page."
            icon={Users}
            api={studentLifeActivitiesAPI}
            fields={fields}
            columns={[{ key: 'name', label: 'Name' }, { key: 'category', label: 'Category' }]}
            emptyDefaults={{ category: 'clubs' }}
            getRowTitle={(item) => item.name}
        />
    );
}
