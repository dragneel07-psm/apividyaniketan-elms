// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { academicAPI, Parent, Student } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import {
    CalendarDays, CheckCircle2, XCircle, Clock,
    MinusCircle, Loader2, ChevronLeft, ChevronRight,
    AlertCircle,
} from 'lucide-react';
import { useTranslation } from '@/lib/localization';
import { formatNumber, formatDate } from '@/lib/i18n/format';

function getMonthDays(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
}

export default function ParentAttendancePage() {
    const { toast } = useToast();
    const { t, locale } = useTranslation();
    const [parent, setParent] = useState<Parent | null>(null);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [attendance, setAttendance] = useState<{ records: any[]; summary: any } | null>(null);
    const [loading, setLoading] = useState(true);
    const [attLoading, setAttLoading] = useState(false);

    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth() + 1); // 1-based

    const STATUS_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string; bg: string }> = {
        present: { icon: <CheckCircle2 className="h-4 w-4" />, label: t('parent.attendance.statusPresent'), color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
        absent:  { icon: <XCircle className="h-4 w-4" />,      label: t('parent.attendance.statusAbsent'),  color: 'text-red-500',     bg: 'bg-red-50 border-red-200' },
        late:    { icon: <Clock className="h-4 w-4" />,         label: t('parent.attendance.statusLate'),    color: 'text-amber-500',   bg: 'bg-amber-50 border-amber-200' },
        excused: { icon: <MinusCircle className="h-4 w-4" />,   label: t('parent.attendance.statusExcused'), color: 'text-slate-400',   bg: 'bg-slate-50 border-slate-200' },
    };

    useEffect(() => {
        academicAPI.getMyParent()
            .then((p) => {
                setParent(p);
                if (p.students.length > 0) setSelectedStudent(p.students[0]);
            })
            .catch(() => toast({ title: 'Error', description: t('parent.attendance.errorLoadProfile'), variant: 'destructive' }))
            .finally(() => setLoading(false));
    }, [toast, t]);

    useEffect(() => {
        if (!selectedStudent) return;
        setAttLoading(true);
        academicAPI.getChildAttendance(selectedStudent.student_id, month, year)
            .then(setAttendance)
            .catch(() => toast({ title: 'Error', description: t('parent.attendance.errorLoad'), variant: 'destructive' }))
            .finally(() => setAttLoading(false));
    }, [selectedStudent, month, year, toast, t]);

    const prevMonth = () => {
        if (month === 1) { setMonth(12); setYear(y => y - 1); }
        else setMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (month === 12) { setMonth(1); setYear(y => y + 1); }
        else setMonth(m => m + 1);
    };

    const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' });

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
        </div>
    );

    if (!parent || parent.students.length === 0) return (
        <div className="p-8 text-center">
            <AlertCircle className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">{t('parent.attendance.noChildren')}</p>
        </div>
    );

    // Build a map of date → record
    const recordMap: Record<string, any> = {};
    (attendance?.records || []).forEach((r: any) => {
        const d = r.date ? new Date(r.date).getDate() : null;
        if (d) recordMap[d] = r;
    });

    const daysInMonth = getMonthDays(year, month - 1);
    const firstDayOfWeek = new Date(year, month - 1, 1).getDay(); // 0=Sun
    const summary = attendance?.summary || {};

    return (
        <div className="p-6 md:p-8 space-y-6 max-w-5xl">
            {/* Header */}
            <div>
                <div className="flex items-center gap-2 text-violet-600 font-bold mb-1">
                    <CalendarDays className="h-4 w-4" />
                    <span className="text-[10px] uppercase tracking-[0.2em]">{t('parent.attendance.sectionLabel')}</span>
                </div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">{t('parent.attendance.pageTitle')}</h1>
                <p className="text-slate-500 font-medium">{t('parent.attendance.subtitle')}</p>
            </div>

            {/* Child selector */}
            {parent.students.length > 1 && (
                <div className="flex gap-2 flex-wrap">
                    {parent.students.map((s) => (
                        <Button
                            key={s.student_id}
                            size="sm"
                            variant={selectedStudent?.student_id === s.student_id ? 'default' : 'outline'}
                            className="rounded-xl h-9 text-xs font-bold"
                            onClick={() => setSelectedStudent(s)}
                        >
                            {s.first_name} {s.last_name}
                        </Button>
                    ))}
                </div>
            )}

            {/* Summary cards */}
            {attendance && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                        { label: t('parent.attendance.statusPresent'), value: formatNumber(summary.present ?? 0, locale), color: 'text-emerald-600', bg: 'bg-emerald-50' },
                        { label: t('parent.attendance.statusAbsent'),  value: formatNumber(summary.absent ?? 0, locale),  color: 'text-red-500',     bg: 'bg-red-50' },
                        { label: t('parent.attendance.statusLate'),    value: formatNumber(summary.late ?? 0, locale),    color: 'text-amber-500',   bg: 'bg-amber-50' },
                        { label: t('parent.attendance.statPct'),       value: `${formatNumber(summary.percentage ?? 0, locale)}%`, color: 'text-violet-600', bg: 'bg-violet-50' },
                    ].map(({ label, value, color, bg }) => (
                        <Card key={label} className="border-slate-200">
                            <CardContent className={`p-4 ${bg} rounded-xl`}>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</p>
                                <p className={`text-2xl font-black mt-1 ${color}`}>{value}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Attendance rate bar */}
            {attendance && (
                <Card className="border-slate-200">
                    <CardContent className="p-4 space-y-2">
                        <div className="flex justify-between text-sm font-bold text-slate-700">
                            <span>{t('parent.attendance.monthlyRate')}</span>
                            <span className={summary.percentage >= 75 ? 'text-emerald-600' : 'text-red-500'}>
                                {formatNumber(summary.percentage ?? 0, locale)}%
                            </span>
                        </div>
                        <Progress value={summary.percentage ?? 0} className="h-3" />
                        {(summary.percentage ?? 0) < 75 && (
                            <p className="text-xs text-red-500 font-medium flex items-center gap-1">
                                <AlertCircle className="h-3.5 w-3.5" /> {t('parent.attendance.belowThreshold')}
                            </p>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Calendar */}
            <Card className="border-slate-200">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-black">{monthName}</CardTitle>
                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={prevMonth}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={nextMonth}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                    <CardDescription>{selectedStudent?.first_name} {selectedStudent?.last_name}</CardDescription>
                </CardHeader>
                <CardContent>
                    {attLoading ? (
                        <div className="flex justify-center py-10">
                            <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
                        </div>
                    ) : (
                        <>
                            {/* Day headers */}
                            <div className="grid grid-cols-7 mb-2">
                                {[t('parent.attendance.daySun'), t('parent.attendance.dayMon'), t('parent.attendance.dayTue'), t('parent.attendance.dayWed'), t('parent.attendance.dayThu'), t('parent.attendance.dayFri'), t('parent.attendance.daySat')].map((d) => (
                                    <div key={d} className="text-center text-[10px] font-bold text-slate-400 uppercase py-1">{d}</div>
                                ))}
                            </div>
                            {/* Calendar grid */}
                            <div className="grid grid-cols-7 gap-1">
                                {/* Empty cells before first day */}
                                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                                    <div key={`empty-${i}`} />
                                ))}
                                {Array.from({ length: daysInMonth }).map((_, i) => {
                                    const day = i + 1;
                                    const record = recordMap[day];
                                    const status = record?.status;
                                    const cfg = status ? STATUS_CONFIG[status] : null;
                                    const isToday = day === now.getDate() && month === now.getMonth() + 1 && year === now.getFullYear();
                                    return (
                                        <div
                                            key={day}
                                            title={cfg?.label}
                                            className={`aspect-square rounded-xl flex flex-col items-center justify-center text-xs font-bold border transition-all
                                                ${cfg ? `${cfg.bg} ${cfg.color}` : 'border-transparent text-slate-400'}
                                                ${isToday ? 'ring-2 ring-violet-400 ring-offset-1' : ''}
                                            `}
                                        >
                                            <span>{day}</span>
                                            {cfg && <span className="mt-0.5">{cfg.icon}</span>}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Legend */}
                            <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-100">
                                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                                    <div key={key} className="flex items-center gap-1.5 text-xs">
                                        <span className={cfg.color}>{cfg.icon}</span>
                                        <span className="text-slate-500 font-medium">{cfg.label}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
