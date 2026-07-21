// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, CheckCircle2, Clock } from 'lucide-react';
import { notificationsAPI, Notification } from '@/lib/api';
import Link from 'next/link';

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadNotifications();
    }, []);

    async function loadNotifications() {
        setLoading(true);
        try {
            const notifs = await notificationsAPI.getNotifications();
            setNotifications(notifs);
        } catch (error) {
            console.error('Failed to load notifications:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleMarkAsRead(id: number) {
        try {
            await notificationsAPI.markAsRead(id);
            loadNotifications();
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    }

    async function handleMarkAllAsRead() {
        try {
            await notificationsAPI.markAllAsRead();
            loadNotifications();
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    }

    function formatDate(dateString: string): string {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString();
    }

    function groupNotificationsByDate(notifs: Notification[]) {
        const groups: { [key: string]: Notification[] } = {
            'Today': [],
            'Yesterday': [],
            'This Week': [],
            'Older': []
        };

        notifs.forEach(notif => {
            const date = new Date(notif.created_at);
            const now = new Date();
            const diffTime = now.getTime() - date.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 0) groups['Today'].push(notif);
            else if (diffDays === 1) groups['Yesterday'].push(notif);
            else if (diffDays < 7) groups['This Week'].push(notif);
            else groups['Older'].push(notif);
        });

        return groups;
    }

    const filteredNotifications = notifications.filter(n => {
        if (filter === 'unread') return !n.is_read;
        if (filter === 'read') return n.is_read;
        return true;
    });

    const groupedNotifications = groupNotificationsByDate(filteredNotifications);
    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
                    <p className="text-slate-500">Stay updated with your latest activities</p>
                </div>
                {unreadCount > 0 && (
                    <Button onClick={handleMarkAllAsRead} variant="outline">
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Mark all as read
                    </Button>
                )}
            </div>

            <Tabs
                value={filter}
                onValueChange={(v) => setFilter(v as 'all' | 'unread' | 'read')}
                className="space-y-6"
            >
                <TabsList className="bg-white border">
                    <TabsTrigger value="all">
                        All ({notifications.length})
                    </TabsTrigger>
                    <TabsTrigger value="unread">
                        Unread ({unreadCount})
                    </TabsTrigger>
                    <TabsTrigger value="read">
                        Read ({notifications.length - unreadCount})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value={filter} className="space-y-4">
                    {loading ? (
                        <Card>
                            <CardContent className="py-12 text-center text-slate-500">
                                Loading notifications...
                            </CardContent>
                        </Card>
                    ) : filteredNotifications.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <Bell className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                                <p className="text-slate-500">No notifications found</p>
                            </CardContent>
                        </Card>
                    ) : (
                        Object.entries(groupedNotifications).map(([group, notifs]) => {
                            if (notifs.length === 0) return null;
                            return (
                                <div key={group} className="space-y-3">
                                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                                        {group}
                                    </h3>
                                    <div className="space-y-2">
                                        {notifs.map((notif) => (
                                            <Card
                                                key={notif.id}
                                                className={`border-none shadow-sm transition-all hover:shadow-md ${!notif.is_read ? 'bg-indigo-50/50 border-l-4 border-l-indigo-600' : ''
                                                    }`}
                                            >
                                                <CardContent className="p-4">
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="flex-1 space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="font-semibold text-slate-900">
                                                                    {notif.title}
                                                                </h4>
                                                                {!notif.is_read && (
                                                                    <div className="h-2 w-2 bg-indigo-600 rounded-full" />
                                                                )}
                                                            </div>
                                                            <p className="text-sm text-slate-600">
                                                                {notif.message}
                                                            </p>
                                                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                                                <Clock className="h-3 w-3" />
                                                                {formatDate(notif.created_at)}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {!notif.is_read && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() => handleMarkAsRead(notif.id)}
                                                                    className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                                                >
                                                                    <CheckCircle2 className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {notif.link && (
                                                        <Link href={notif.link}>
                                                            <Button variant="link" size="sm" className="mt-2 p-0 h-auto text-indigo-600">
                                                                View Details →
                                                            </Button>
                                                        </Link>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
