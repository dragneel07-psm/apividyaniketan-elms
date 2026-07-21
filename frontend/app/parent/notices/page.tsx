// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { academicAPI, Notice } from '@/lib/api';
import { BookOpen, Loader2 } from 'lucide-react';
import { useTranslation } from '@/lib/localization';
import { formatDate } from '@/lib/i18n/format';

const PRIORITY_COLOR: Record<string, string> = {
    high: 'bg-red-100 text-red-700 border-red-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    low: 'bg-slate-100 text-slate-600 border-slate-200',
    normal: 'bg-blue-100 text-blue-700 border-blue-200',
};

export default function ParentNoticesPage() {
    const [notices, setNotices] = useState<Notice[]>([]);
    const [loading, setLoading] = useState(true);
    const { t, locale } = useTranslation();

    useEffect(() => {
        academicAPI.getNotices()
            .then(data => setNotices(Array.isArray(data) ? data : []))
            .catch(() => setNotices([]))
            .finally(() => setLoading(false));
    }, []);

    const markRead = (notice: Notice) => {
        const id = notice.id ?? notice.notice_id;
        if (typeof id !== 'number' || notice.is_read) return;
        setNotices(prev =>
            prev.map(n => ((n.id ?? n.notice_id) === id ? { ...n, is_read: true } : n)),
        );
        academicAPI.markNoticeRead(id).catch(() => {
            setNotices(prev =>
                prev.map(n => ((n.id ?? n.notice_id) === id ? { ...n, is_read: false } : n)),
            );
        });
    };

    return (
        <div className="p-6 md:p-8 space-y-6 max-w-3xl">
            <div>
                <h1 className="text-2xl font-black text-slate-900">{t('parent.notices.pageTitle')}</h1>
                <p className="text-slate-500 text-sm">{t('parent.notices.subtitle')}</p>
            </div>

            {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-violet-400" /></div>
            ) : notices.length === 0 ? (
                <Card className="border-dashed border-2 border-slate-200">
                    <CardContent className="py-16 text-center">
                        <BookOpen className="h-8 w-8 text-slate-200 mx-auto mb-3" />
                        <p className="text-slate-400 font-medium">{t('parent.notices.empty')}</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {notices.map(notice => (
                        <Card
                            key={notice.notice_id ?? notice.id}
                            className={`shadow-sm cursor-pointer transition-colors ${!notice.is_read ? 'border-violet-200 bg-violet-50/40' : 'border-slate-200'}`}
                            onClick={() => markRead(notice)}
                        >
                            <CardContent className="p-5">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            <h3 className="font-bold text-slate-900 text-sm">{notice.title}</h3>
                                            {!notice.is_read && (
                                                <Badge className="bg-violet-500 text-white border-0 text-[9px] font-bold px-1.5 py-0">{t('parent.notices.badgeUnread')}</Badge>
                                            )}
                                            {notice.priority && (
                                                <Badge className={`text-[10px] font-bold px-2 py-0.5 ${PRIORITY_COLOR[notice.priority] ?? PRIORITY_COLOR.normal}`}>
                                                    {notice.priority}
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500 leading-relaxed">{notice.content}</p>
                                    </div>
                                    <p className="text-[10px] text-slate-400 whitespace-nowrap flex-shrink-0">
                                        {notice.published_date ? formatDate(new Date(notice.published_date), locale) : ''}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
