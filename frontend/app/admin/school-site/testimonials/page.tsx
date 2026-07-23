// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { Quote } from 'lucide-react';
import { ContentCrudPage, type FieldSchema } from '@/components/admin/content-crud-page';
import { testimonialsAPI, type Testimonial } from '@/lib/api';

const fields: FieldSchema<Testimonial>[] = [
    { name: 'quote', label: 'Quote', type: 'textarea', required: true },
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'role', label: 'Role (e.g. "Parent, Grade 4")', type: 'text', required: true },
];

export default function TestimonialsAdminPage() {
    return (
        <ContentCrudPage
            title="Testimonials"
            description="Manage parent/student testimonials shown on the Home page."
            icon={Quote}
            api={testimonialsAPI}
            fields={fields}
            columns={[
                { key: 'name', label: 'Name' },
                { key: 'role', label: 'Role' },
                { key: 'quote', label: 'Quote' },
            ]}
            emptyDefaults={{}}
            getRowTitle={(item) => item.name}
        />
    );
}
