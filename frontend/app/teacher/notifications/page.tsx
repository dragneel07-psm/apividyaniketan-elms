// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { NotificationList } from '@/components/notifications/NotificationList';

export default function TeacherNotificationsPage() {
    return (
        <div className="container mx-auto py-8">
            <h1 className="text-2xl font-bold text-slate-900 mb-6">Staff Notifications</h1>
            <NotificationList />
        </div>
    );
}
