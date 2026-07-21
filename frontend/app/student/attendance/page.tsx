// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { CheckCircle2, XCircle, Clock, Loader2, TrendingUp, CalendarDays } from 'lucide-react';
import { academicAPI, Attendance } from '@/lib/api';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/localization';
import { formatNumber, formatDate } from '@/lib/i18n/format';

export default function AttendancePage() {
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [attendanceData, setAttendanceData] = useState<Attendance[]>([]);
    const [loading, setLoading] = useState(true);
    const { t, locale } = useTranslation();

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const data = await academicAPI.getMyAttendance();
                setAttendanceData(data);
            } catch {
                toast.error(t('student.attendance.errorLoad'));
            } finally {
                setLoading(false);
            }
        })();
    }, [t]);

    const total = attendanceData.length;
    const present = attendanceData.filter((a) => a.status === 'present').length;
    const absent = attendanceData.filter((a) => a.status === 'absent').length;
    const late = attendanceData.filter((a) => a.status === 'late').length;
    const excused = attendanceData.filter((a) => (a.status as string) === 'excused').length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 100;

    const selectedRecords = attendanceData.filter((r) => {
        if (!date) return false;
        return new Date(r.date).toDateString() === date.toDateString();
    });

    const circumference = 2 * Math.PI * 44;
    const dashOffset = circumference - (percentage / 100) * circumference;

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
            <p className="text-slate-400 text-sm">{t('student.attendance.loading')}</p>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">

            {/* Header */}
            <div>
                <div className="flex items-center gap-2 text-indigo-600 font-bold mb-1">
                    <CalendarDays className="h-4 w-4" />
                    <span className="text-[10px] uppercase tracking-[0.2em]">{t('student.attendance.record')}</span>
                </div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">{t('student.attendance.pageTitle')}</h1>
                <p className="text-slate-500 mt-1 text-sm">{t('student.attendance.subtitle')}</p>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                {/* Big Attendance Ring */}
                <Card className="border-0 shadow-lg overflow-hidden rounded-2xl md:col-span-1">
                    <CardContent className="p-6 flex flex-col items-center justify-center gap-3 h-full">
                        <div className="relative">
                            <svg width="120" height="120" viewBox="0 0 120 120" className="-rotate-90">
                                <circle cx="60" cy="60" r="44" fill="none" stroke="#e2e8f0" strokeWidth="10" />
                                <circle
                                    cx="60" cy="60" r="44"
                                    fill="none"
                                    stroke={percentage >= 75 ? '#10b981' : percentage >= 50 ? '#f59e0b' : '#ef4444'}
                                    strokeWidth="10"
                                    strokeLinecap="round"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={dashOffset}
                                    className="transition-all duration-1000"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-2xl font-black text-slate-900">{formatNumber(percentage, locale)}%</span>
                                <span className="text-[10px] text-slate-400 font-bold">{t('student.attendance.overall')}</span>
                            </div>
                        </div>
                        <p className="text-sm font-bold text-slate-700">{t('student.attendance.attendanceRate')}</p>
                        <Badge className={`${percentage >= 75 ? 'bg-emerald-100 text-emerald-700' : percentage >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'} border-0 font-bold`}>
                            {percentage >= 75 ? t('student.attendance.goodStanding') : percentage >= 50 ? t('student.attendance.needsImprovement') : t('student.attendance.critical')}
                        </Badge>
                    </CardContent>
                </Card>

                {/* Stat Cards */}
                <div className="md:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { labelKey: 'student.attendance.statPresent' as const, value: present, icon: CheckCircle2, bg: 'from-emerald-50 to-teal-50', icon_bg: 'bg-emerald-100', icon_color: 'text-emerald-600', text: 'text-emerald-700' },
                        { labelKey: 'student.attendance.statAbsent' as const, value: absent, icon: XCircle, bg: 'from-red-50 to-rose-50', icon_bg: 'bg-red-100', icon_color: 'text-red-600', text: 'text-red-700' },
                        { labelKey: 'student.attendance.statLate' as const, value: late, icon: Clock, bg: 'from-orange-50 to-amber-50', icon_bg: 'bg-orange-100', icon_color: 'text-orange-600', text: 'text-orange-700' },
                        { labelKey: 'student.attendance.statExcused' as const, value: excused, icon: TrendingUp, bg: 'from-blue-50 to-indigo-50', icon_bg: 'bg-blue-100', icon_color: 'text-blue-600', text: 'text-blue-700' },
                    ].map((s) => (
                        <Card key={s.labelKey} className="border-0 shadow-md rounded-2xl overflow-hidden">
                            <CardContent className="p-5 relative">
                                <div className={`absolute inset-0 bg-gradient-to-br ${s.bg}`} />
                                <div className="relative flex flex-col gap-3">
                                    <div className={`h-10 w-10 rounded-xl ${s.icon_bg} flex items-center justify-center`}>
                                        <s.icon className={`h-5 w-5 ${s.icon_color}`} />
                                    </div>
                                    <div>
                                        <p className={`text-3xl font-black ${s.text}`}>{formatNumber(s.value, locale)}</p>
                                        <p className={`text-xs font-bold ${s.text} opacity-70 uppercase tracking-wider mt-0.5`}>{t(s.labelKey)}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Calendar + Daily Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Calendar */}
                <Card className="border-0 shadow-md rounded-2xl overflow-hidden lg:col-span-1">
                    <CardHeader className="px-6 pt-6 pb-4 border-b border-slate-50">
                        <CardTitle className="text-base font-bold text-slate-900">{t('student.attendance.calendarView')}</CardTitle>
                        <div className="flex items-center gap-4 mt-2">
                            <span className="flex items-center gap-1.5 text-xs text-slate-500">
                                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" /> {t('student.attendance.legendPresent')}
                            </span>
                            <span className="flex items-center gap-1.5 text-xs text-slate-500">
                                <span className="h-2.5 w-2.5 rounded-full bg-red-500 inline-block" /> {t('student.attendance.legendAbsent')}
                            </span>
                            <span className="flex items-center gap-1.5 text-xs text-slate-500">
                                <span className="h-2.5 w-2.5 rounded-full bg-orange-400 inline-block" /> {t('student.attendance.legendLate')}
                            </span>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            className="rounded-xl w-full"
                            modifiers={{
                                present: (d) => attendanceData.some((a) => new Date(a.date).toDateString() === d.toDateString() && a.status === 'present'),
                                absent: (d) => attendanceData.some((a) => new Date(a.date).toDateString() === d.toDateString() && a.status === 'absent'),
                                late: (d) => attendanceData.some((a) => new Date(a.date).toDateString() === d.toDateString() && a.status === 'late'),
                            }}
                            modifiersStyles={{
                                present: { color: '#059669', fontWeight: 'bold', backgroundColor: '#d1fae5', borderRadius: '8px' },
                                absent: { color: '#dc2626', fontWeight: 'bold', backgroundColor: '#fee2e2', borderRadius: '8px' },
                                late: { color: '#d97706', fontWeight: 'bold', backgroundColor: '#fef3c7', borderRadius: '8px' },
                            }}
                        />
                    </CardContent>
                </Card>

                {/* Daily Breakdown */}
                <Card className="border-0 shadow-md rounded-2xl overflow-hidden lg:col-span-2">
                    <CardHeader className="px-6 pt-6 pb-4 border-b border-slate-50">
                        <CardTitle className="text-base font-bold text-slate-900">
                            {date ? formatDate(date, locale) : ''}
                        </CardTitle>
                        <p className="text-xs text-slate-400 mt-1">
                            {selectedRecords.length > 0
                                ? (selectedRecords.length > 1
                                    ? t('student.attendance.recordCountPlural', { count: formatNumber(selectedRecords.length, locale) })
                                    : t('student.attendance.recordCount', { count: formatNumber(selectedRecords.length, locale) }))
                                : t('student.attendance.clickToView')}
                        </p>
                    </CardHeader>
                    <CardContent className="p-6">
                        {selectedRecords.length > 0 ? (
                            <div className="space-y-3">
                                {selectedRecords.map((record) => (
                                    <div
                                        key={record.attendance_id}
                                        className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-indigo-100 hover:bg-indigo-50/30 transition-all"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="h-11 w-11 rounded-xl bg-indigo-100 flex items-center justify-center font-black text-indigo-600">
                                                {record.subject_name ? record.subject_name.charAt(0).toUpperCase() : 'S'}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900 text-sm">{record.subject_name || t('student.attendance.subject')}</h4>
                                                {record.remarks && (
                                                    <p className="text-xs text-slate-400 mt-0.5">{t('student.attendance.note', { remarks: record.remarks })}</p>
                                                )}
                                            </div>
                                        </div>
                                        <StatusBadge status={record.status} />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <div className="h-16 w-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                                    <CalendarDays className="h-8 w-8 text-slate-300" />
                                </div>
                                <p className="font-medium text-slate-500">{t('student.attendance.noRecordsTitle')}</p>
                                <p className="text-xs text-slate-400 mt-1 max-w-xs">{t('student.attendance.noRecordsHint')}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, string> = {
        present: 'bg-emerald-100 text-emerald-700',
        absent: 'bg-red-100 text-red-700',
        late: 'bg-orange-100 text-orange-700',
        excused: 'bg-blue-100 text-blue-700',
    };
    return (
        <Badge className={`${map[status] ?? 'bg-slate-100 text-slate-600'} border-0 font-bold capitalize text-xs`}>
            {status}
        </Badge>
    );
}
