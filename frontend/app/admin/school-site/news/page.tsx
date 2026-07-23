// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { Newspaper } from 'lucide-react';
import { ContentCrudPage, type FieldSchema } from '@/components/admin/content-crud-page';
import { newsArticlesAPI, type NewsArticle } from '@/lib/api';

const fields: FieldSchema<NewsArticle>[] = [
    { name: 'title', label: 'Title', type: 'text', required: true },
    { name: 'slug', label: 'URL slug (optional — auto-generated from title if left blank)', type: 'text' },
    { name: 'excerpt', label: 'Excerpt', type: 'textarea', required: true },
    { name: 'body', label: 'Full article body', type: 'textarea', required: true },
    {
        name: 'category', label: 'Category', type: 'select', required: true,
        options: [
            { value: 'academics', label: 'Academics' },
            { value: 'events', label: 'Events' },
            { value: 'achievements', label: 'Achievements' },
            { value: 'community', label: 'Community' },
        ],
    },
    { name: 'published_date', label: 'Published date', type: 'date', required: true },
    { name: 'image', label: 'Cover image', type: 'image' },
];

export default function NewsArticlesAdminPage() {
    return (
        <ContentCrudPage
            title="News Articles"
            description="Manage articles shown on the public News & Events page."
            icon={Newspaper}
            api={newsArticlesAPI}
            fields={fields}
            columns={[
                { key: 'title', label: 'Title' },
                { key: 'category', label: 'Category' },
                { key: 'published_date', label: 'Published' },
            ]}
            emptyDefaults={{ category: 'academics', published_date: new Date().toISOString().slice(0, 10) }}
            getRowTitle={(item) => item.title}
        />
    );
}
