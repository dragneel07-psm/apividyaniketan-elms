// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useState, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { notificationsAPI, Notification } from '@/lib/api';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useNotificationWebSocket } from '@/hooks/useNotificationWebSocket';

export function NotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [mounted, setMounted] = useState(false);
    const pathname = usePathname();

    const role = pathname.split('/')[1] || 'admin';

    const loadNotifications = useCallback(async () => {
        try {
            const [notifs, countData] = await Promise.all([
                notificationsAPI.getNotifications(),
                notificationsAPI.getUnreadCount()
            ]);
            setNotifications(notifs.slice(0, 5));
            setUnreadCount(countData.count);
        } catch {
            setNotifications([]);
            setUnreadCount(0);
        }
    }, []);

    // Live WebSocket push — prepend new notification and bump count
    useNotificationWebSocket({
        onNotification: (live) => {
            setUnreadCount((c) => c + 1);
            setNotifications((prev) => {
                const newNotif: Notification = {
                    id: live.id as unknown as number,
                    recipient: '',
                    title: live.title,
                    message: live.message,
                    link: live.link,
                    is_read: false,
                    created_at: live.created_at,
                };
                return [newNotif, ...prev].slice(0, 5);
            });
        },
    });

    useEffect(() => {
        setMounted(true);
        loadNotifications();
        // Fallback polling every 5 minutes (WebSocket handles the real-time updates)
        const interval = setInterval(loadNotifications, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [loadNotifications]);

    if (!mounted) {
        return <Button variant="ghost" size="icon" className="relative"><Bell className="h-5 w-5 text-slate-600" /></Button>;
    }

    async function handleMarkAsRead(id: number) {
        // Optimistic: flip the row and decrement the badge immediately.
        const wasUnread = notifications.find((n) => n.id === id && !n.is_read);
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
        if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1));
        try {
            await notificationsAPI.markAsRead(id);
        } catch (error) {
            console.error('Failed to mark as read:', error);
            // Revert on failure.
            setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: false } : n)));
            if (wasUnread) setUnreadCount((c) => c + 1);
        }
    }

    async function handleMarkAllAsRead() {
        const previousNotifications = notifications;
        const previousCount = unreadCount;
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setUnreadCount(0);
        setLoading(true);
        try {
            await notificationsAPI.markAllAsRead();
        } catch (error) {
            console.error('Failed to mark all as read:', error);
            setNotifications(previousNotifications);
            setUnreadCount(previousCount);
        } finally {
            setLoading(false);
        }
    }

    function formatTimeAgo(dateString: string): string {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
        return date.toLocaleDateString();
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5 text-slate-600" />
                    {unreadCount > 0 && (
                        <Badge
                            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 hover:bg-red-600 text-white text-xs"
                        >
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </Badge>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex justify-between items-center">
                    <span>Notifications</span>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 text-xs text-indigo-600 hover:text-indigo-700"
                            onClick={handleMarkAllAsRead}
                            disabled={loading}
                        >
                            {loading ? 'Marking...' : 'Mark all as read'}
                        </Button>
                    )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {notifications.length === 0 ? (
                    <div className="py-8 text-center text-sm text-slate-500">
                        No notifications
                    </div>
                ) : (
                    <div className="max-h-96 overflow-y-auto">
                        {notifications.map((notif) => (
                            <DropdownMenuItem
                                key={notif.id}
                                className={`flex flex-col items-start p-3 cursor-pointer ${!notif.is_read ? 'bg-indigo-50/50' : ''}`}
                                onClick={() => !notif.is_read && handleMarkAsRead(notif.id)}
                            >
                                <div className="flex justify-between items-start w-full mb-1">
                                    <span className="font-medium text-sm">{notif.title}</span>
                                    {!notif.is_read && (
                                        <div className="h-2 w-2 bg-indigo-600 rounded-full mt-1 ml-2 flex-shrink-0" />
                                    )}
                                </div>
                                <p className="text-xs text-slate-600 line-clamp-2 mb-1">
                                    {notif.message}
                                </p>
                                <span className="text-xs text-slate-400">
                                    {formatTimeAgo(notif.created_at)}
                                </span>
                            </DropdownMenuItem>
                        ))}
                    </div>
                )}

                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link
                        href={`/${role}/notifications`}
                        className="w-full text-center text-sm text-indigo-600 hover:text-indigo-700 font-medium cursor-pointer"
                    >
                        View all notifications
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
