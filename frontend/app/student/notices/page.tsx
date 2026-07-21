// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { academicAPI, Notice } from '@/lib/api';
import {
    Megaphone, Calendar, Info, AlertTriangle, Clock, Loader2,
    Paperclip, Bell, ChevronDown, ChevronUp, Filter
} from 'lucide-react';
import { useTranslation } from '@/lib/localization';
import { formatDate } from '@/lib/i18n/format';

export default function StudentNoticesPage() {
    const [notices, setNotices] = useState<Notice[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'high' | 'normal' | 'low'>('all');
    const [expanded, setExpanded] = useState<Set<string | number>>(new Set());
    const { t, locale } = useTranslation();

    useEffect(() => {
        (async () => {
            try {
                const data = await academicAPI.getNotices();
                setNotices(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const toggle = (notice: Notice) => {
        const id = notice.id ?? notice.notice_id;
        if (id == null) return;
        setExpanded((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
        // Mark as read on first open. Optimistic: flip locally, then sync.
        if (typeof id === 'number' && !notice.is_read) {
            setNotices((prev) =>
                prev.map((n) => ((n.id ?? n.notice_id) === id ? { ...n, is_read: true } : n)),
            );
            academicAPI.markNoticeRead(id).catch(() => {
                // Revert if the server rejected it.
                setNotices((prev) =>
                    prev.map((n) => ((n.id ?? n.notice_id) === id ? { ...n, is_read: false } : n)),
                );
            });
        }
    };

    const isNew = (d?: string) => d && (Date.now() - new Date(d).getTime()) < 3 * 86400000;

    const filtered = filter === 'all' ? notices : notices.filter((n) => n.priority === filter);
    const highCount = notices.filter((n) => n.priority === 'high').length;
    const newCount = notices.filter((n) => !n.is_read).length;

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
            <p className="text-slate-400 text-sm">{t('student.notices.loading')}</p>
        </div>
    );

    const priorityStyle: Record<string, { border: string; bg: string; badge: string; icon: React.ElementType }> = {
        high: { border: 'border-l-red-500', bg: 'bg-red-50/60', badge: 'bg-red-100 text-red-700', icon: AlertTriangle },
        normal: { border: 'border-l-indigo-400', bg: 'bg-white', badge: 'bg-indigo-100 text-indigo-700', icon: Info },
        low: { border: 'border-l-slate-300', bg: 'bg-slate-50/60', badge: 'bg-slate-100 text-slate-600', icon: Info },
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-indigo-600 font-bold mb-1">
                        <Megaphone className="h-4 w-4" />
                        <span className="text-[10px] uppercase tracking-[0.2em]">{t('student.notices.announcements')}</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">{t('student.notices.pageTitle')}</h1>
                    <p className="text-slate-500 mt-1 text-sm">{t('student.notices.subtitle')}</p>
                </div>

                {/* Quick stats */}
                <div className="flex items-center gap-3">
                    {newCount > 0 && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-xl">
                            <Bell className="h-4 w-4 text-blue-500" />
                            <span className="text-sm font-bold text-blue-700">{t('student.notices.unread', { count: newCount })}</span>
                        </div>
                    )}
                    {highCount > 0 && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-100 rounded-xl">
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                            <span className="text-sm font-bold text-red-700">{t('student.notices.urgent', { count: highCount })}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl">
                        <Megaphone className="h-4 w-4 text-slate-500" />
                        <span className="text-sm font-bold text-slate-700">{t('student.notices.total', { count: notices.length })}</span>
                    </div>
                </div>
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-2 flex-wrap">
                <Filter className="h-4 w-4 text-slate-400" />
                {(['all', 'high', 'normal', 'low'] as const).map((f) => (
                    <Button
                        key={f}
                        size="sm"
                        variant={filter === f ? 'default' : 'outline'}
                        onClick={() => setFilter(f)}
                        className={`rounded-full h-8 px-4 text-xs font-bold capitalize ${filter === f ? 'bg-indigo-600 hover:bg-indigo-700 border-0' : 'border-slate-200 text-slate-500 hover:border-indigo-200 hover:text-indigo-600'}`}
                    >
                        {f === 'all'
                            ? t('student.notices.filterAll', { count: notices.length })
                            : t(`student.notices.filter${f.charAt(0).toUpperCase() + f.slice(1)}` as `student.notices.filterHigh`)}
                    </Button>
                ))}
            </div>

            {/* Notices List */}
            <div className="space-y-4">
                {filtered.length > 0 ? filtered.map((notice) => {
                    const p = notice.priority ?? 'normal';
                    const style = priorityStyle[p] ?? priorityStyle.normal;
                    const PriorityIcon = style.icon;
                    const isExpanded = notice.id != null && expanded.has(notice.id);
                    const isUnread = !notice.is_read;

                    return (
                        <Card
                            key={notice.id}
                            className={`border-0 shadow-md overflow-hidden transition-all border-l-4 ${style.border} rounded-2xl`}
                        >
                            <CardContent className={`p-0 ${style.bg}`}>
                                {/* Main row — always visible */}
                                <button
                                    className="w-full text-left p-5 hover:bg-black/[0.02] transition-colors"
                                    onClick={() => toggle(notice)}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            {/* Meta row */}
                                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                <Badge className={`${style.badge} border-0 text-[10px] font-bold uppercase tracking-widest capitalize px-2 py-0`}>
                                                    {notice.category || p} {t('student.notices.prioritySuffix')}
                                                </Badge>
                                                {isUnread && (
                                                    <Badge className="bg-blue-500 text-white border-0 text-[9px] font-bold px-1.5 py-0">{t('student.notices.badgeUnread')}</Badge>
                                                )}
                                                <span className="flex items-center gap-1 text-[10px] text-slate-400 ml-auto">
                                                    <Calendar className="h-3 w-3" />
                                                    {notice.published_date ? formatDate(new Date(notice.published_date), locale) : t('student.notices.dateRecently')}
                                                </span>
                                            </div>
                                            <h3 className={`text-base font-bold line-clamp-1 ${p === 'high' ? 'text-red-900' : 'text-slate-900'}`}>
                                                {notice.title}
                                            </h3>
                                            <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                                                {notice.content}
                                            </p>
                                        </div>
                                        <div className="shrink-0 flex items-start gap-2 pt-0.5">
                                            <div className={`h-8 w-8 rounded-lg ${style.badge.split(' ')[0]} flex items-center justify-center`}>
                                                <PriorityIcon className={`h-4 w-4 ${style.badge.split(' ')[1]}`} />
                                            </div>
                                            {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400 mt-1" /> : <ChevronDown className="h-4 w-4 text-slate-400 mt-1" />}
                                        </div>
                                    </div>
                                </button>

                                {/* Expanded content */}
                                {isExpanded && (
                                    <div className="px-5 pb-5 border-t border-black/5">
                                        <p className="text-sm text-slate-600 leading-relaxed mt-4 whitespace-pre-wrap">{notice.content}</p>
                                        {notice.attachment && (
                                            <a
                                                href={notice.attachment}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 mt-4 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-2 rounded-lg border border-indigo-100 hover:border-indigo-200 transition-all"
                                            >
                                                <Paperclip className="h-3.5 w-3.5" /> {t('student.notices.viewAttachment')}
                                            </a>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                }) : (
                    <Card className="border-dashed border-2 border-slate-200 bg-transparent rounded-2xl">
                        <CardContent className="py-20 flex flex-col items-center text-center">
                            <div className="h-16 w-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                                <Clock className="h-8 w-8 text-slate-300" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-700">{t('student.notices.noNoticesTitle')}</h3>
                            <p className="text-sm text-slate-400 mt-1">
                                {filter !== 'all'
                                    ? t('student.notices.noNoticesFiltered', { priority: filter })
                                    : t('student.notices.noNoticesAll')}
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
