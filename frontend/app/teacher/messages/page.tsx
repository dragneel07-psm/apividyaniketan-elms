// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import MessagingPage from '@/components/messaging/MessagingPage';

export default function TeacherMessagesPage() {
    return (
        <MessagingPage emptyStateMessage="Choose a conversation to message students, parents, or colleagues." />
    );
}
