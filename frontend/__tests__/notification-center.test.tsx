// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { getNotifications } = vi.hoisted(() => ({
    getNotifications: vi.fn(async () => []),
}));

vi.mock('@/lib/api', () => ({
    notificationsAPI: {
        getNotifications,
        markAsRead: vi.fn(),
        markAllAsRead: vi.fn(),
    },
}));

import NotificationCenter from '@/components/notifications/NotificationCenter';

describe('NotificationCenter authentication gate', () => {
    afterEach(() => {
        vi.clearAllMocks();
        vi.useRealTimers();
    });

    it('does not request protected notifications before the session is verified', () => {
        vi.useFakeTimers();
        render(<NotificationCenter enabled={false} />);
        vi.runAllTimers();
        expect(getNotifications).not.toHaveBeenCalled();
    });
});
