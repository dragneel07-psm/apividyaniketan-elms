// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { Heart } from 'lucide-react';
import { ContentCrudPage, type FieldSchema } from '@/components/admin/content-crud-page';
import { coreValuesAPI, type CoreValue } from '@/lib/api';

const fields: FieldSchema<CoreValue>[] = [
    { name: 'title', label: 'Title', type: 'text', required: true },
    { name: 'description', label: 'Description', type: 'textarea', required: true },
];

export default function CoreValuesAdminPage() {
    return (
        <ContentCrudPage
            title="Core Values"
            description="Manage the values listed on the About Us page."
            icon={Heart}
            api={coreValuesAPI}
            fields={fields}
            columns={[{ key: 'title', label: 'Title' }, { key: 'description', label: 'Description' }]}
            emptyDefaults={{}}
            getRowTitle={(item) => item.title}
        />
    );
}
