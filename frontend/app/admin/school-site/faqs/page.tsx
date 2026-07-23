// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { HelpCircle } from 'lucide-react';
import { ContentCrudPage, type FieldSchema } from '@/components/admin/content-crud-page';
import { admissionFaqsAPI, type AdmissionFaq } from '@/lib/api';

const fields: FieldSchema<AdmissionFaq>[] = [
    { name: 'question', label: 'Question', type: 'text', required: true },
    { name: 'answer', label: 'Answer', type: 'textarea', required: true },
    { name: 'image', label: 'Photo (optional)', type: 'image' },
];

export default function AdmissionFaqsAdminPage() {
    return (
        <ContentCrudPage
            title="Admissions FAQs"
            description="Manage the FAQ accordion on the Admissions page."
            icon={HelpCircle}
            api={admissionFaqsAPI}
            fields={fields}
            columns={[{ key: 'question', label: 'Question' }]}
            emptyDefaults={{}}
            getRowTitle={(item) => item.question}
        />
    );
}
