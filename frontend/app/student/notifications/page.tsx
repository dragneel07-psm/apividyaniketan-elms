// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { NotificationList } from '@/components/notifications/NotificationList';
import { useTranslation } from '@/lib/localization';

export default function StudentNotificationsPage() {
    const { t } = useTranslation();
    return (
        <div className="container mx-auto py-8">
            <h1 className="text-2xl font-bold text-slate-900 mb-6">{t('student.notifications.pageTitle')}</h1>
            <NotificationList />
        </div>
    );
}
