// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import MessagingPage from '@/components/messaging/MessagingPage';
import { useTranslation } from '@/lib/localization';

export default function ParentMessagesPage() {
    const { t } = useTranslation();
    return (
        <MessagingPage emptyStateMessage={t('parent.messages.emptyState')} />
    );
}
