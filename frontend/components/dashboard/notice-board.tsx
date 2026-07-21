// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, Calendar, ChevronRight } from 'lucide-react';
import { academicAPI, Notice } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function NoticeBoard() {
    const [notices, setNotices] = useState<Notice[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadNotices = async () => {
            try {
                const data = await academicAPI.getNotices();
                setNotices(data.slice(0, 5)); // Show top 5
            } catch (error) {
                console.error('Failed to load notices', error);
            } finally {
                setLoading(false);
            }
        };
        loadNotices();
    }, []);

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Notice Board</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-indigo-500" /> Notice Board
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-xs">View All</Button>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {notices.length === 0 ? (
                        <p className="text-sm text-slate-500 text-center py-4">No new notices</p>
                    ) : (
                        notices.map((notice) => (
                            <div key={notice.notice_id} className="flex gap-4 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                                <div className="flex-shrink-0 flex flex-col items-center justify-center rounded-lg bg-indigo-50 px-3 py-1 text-indigo-700">
                                    <span className="text-xs font-bold uppercase">{new Date(notice.published_date || '').toLocaleString('default', { month: 'short' })}</span>
                                    <span className="text-lg font-bold">{new Date(notice.published_date || '').getDate()}</span>
                                </div>
                                <div className="flex-1 space-y-1">
                                    <div className="flex items-start justify-between">
                                        <p className="font-medium text-slate-900 line-clamp-1">{notice.title}</p>
                                        {notice.priority === 'high' && (
                                            <Badge variant="destructive" className="text-[10px] h-5 px-1.5">High</Badge>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 line-clamp-2">{notice.content}</p>
                                    <div className="flex items-center gap-2 pt-1">
                                        <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 uppercase">{notice.category}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
