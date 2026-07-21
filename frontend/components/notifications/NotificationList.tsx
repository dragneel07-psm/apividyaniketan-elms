// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { notificationsAPI, Notification } from '@/lib/api';
import { Bell, CheckCircle2, Clock, Trash2, AlertCircle, Loader2, MailOpen, Mail } from 'lucide-react';
import { toast } from 'sonner';

export function NotificationList() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadNotifications();
    }, []);

    const loadNotifications = async () => {
        setLoading(true);
        try {
            const data = await notificationsAPI.getNotifications();
            setNotifications(data);
        } catch (error) {
            toast.error("Failed to load notifications");
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (id: number) => {
        try {
            await notificationsAPI.markAsRead(id);
            setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
        } catch (error) {
            toast.error("Action failed");
        }
    };

    const markAllRead = async () => {
        try {
            await notificationsAPI.markAllAsRead();
            setNotifications(notifications.map(n => ({ ...n, is_read: true })));
            toast.success("All marked as read");
        } catch (error) {
            toast.error("Action failed");
        }
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleString();
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
                <p className="text-slate-500 font-medium">Loading your notifications...</p>
            </div>
        );
    }

    return (
        <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50 border-b flex flex-row items-center justify-between py-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Bell className="h-5 w-5 text-indigo-600" /> Notifications
                </CardTitle>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={loadNotifications} className="h-8 text-xs">
                        Refresh
                    </Button>
                    <Button variant="ghost" size="sm" onClick={markAllRead} className="h-8 text-xs text-indigo-600">
                        Mark all as read
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                    {notifications.map((notif) => (
                        <div
                            key={notif.id}
                            className={`p-4 flex gap-4 transition-colors ${!notif.is_read ? 'bg-indigo-50/30' : 'hover:bg-slate-50/50'}`}
                            onClick={() => !notif.is_read && markAsRead(notif.id)}
                        >
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 
                                ${!notif.is_read ? 'bg-indigo-100' : 'bg-slate-100'}`}>
                                {!notif.is_read ? <Mail className="h-5 w-5 text-indigo-600" /> : <MailOpen className="h-5 w-5 text-slate-400" />}
                            </div>
                            <div className="flex-1 space-y-1">
                                <div className="flex items-center justify-between">
                                    <h4 className={`text-sm font-bold ${!notif.is_read ? 'text-slate-900' : 'text-slate-600'}`}>
                                        {notif.title}
                                    </h4>
                                    <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                                        <Clock className="h-3 w-3" /> {formatTime(notif.created_at)}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-500 leading-relaxed">
                                    {notif.message}
                                </p>
                                {notif.link && (
                                    <Button variant="link" className="p-0 h-auto text-xs text-indigo-600 font-bold" onClick={() => window.location.href = notif.link!}>
                                        View details
                                    </Button>
                                )}
                            </div>
                            {!notif.is_read && (
                                <div className="h-2 w-2 bg-indigo-600 rounded-full mt-2 self-start ring-4 ring-indigo-100" />
                            )}
                        </div>
                    ))}

                    {notifications.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                            <div className="p-4 bg-slate-50 rounded-full">
                                <AlertCircle className="h-8 w-8 text-slate-300" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-slate-900 font-bold">No notifications</p>
                                <p className="text-slate-500 text-sm">You&apos;re all caught up! New alerts will appear here.</p>
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
