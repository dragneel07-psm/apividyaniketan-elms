// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { Image as ImageIcon } from 'lucide-react';
import { ContentCrudPage, type FieldSchema } from '@/components/admin/content-crud-page';
import { galleryItemsAPI, type GalleryItem } from '@/lib/api';

const fields: FieldSchema<GalleryItem>[] = [
    { name: 'caption', label: 'Caption', type: 'text', required: true },
    {
        name: 'category', label: 'Category', type: 'select', required: true,
        options: [
            { value: 'campus', label: 'Campus' },
            { value: 'academics', label: 'Academics' },
            { value: 'sports', label: 'Sports' },
            { value: 'culture', label: 'Culture' },
            { value: 'events', label: 'Events' },
        ],
    },
    { name: 'image', label: 'Photo', type: 'image', required: true },
];

export default function GalleryAdminPage() {
    return (
        <ContentCrudPage
            title="Gallery Photos"
            description="Manage photos shown on the public Gallery page."
            icon={ImageIcon}
            api={galleryItemsAPI}
            fields={fields}
            columns={[
                { key: 'caption', label: 'Caption' },
                { key: 'category', label: 'Category' },
            ]}
            emptyDefaults={{ category: 'campus' }}
            getRowTitle={(item) => item.caption}
        />
    );
}
