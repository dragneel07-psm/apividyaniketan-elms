// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { analyticsAPI, AnalyticsDashboard, api, downloadReport } from '@/lib/api';
import { toast } from 'sonner';

const downloadOrToast = (path: string, filename: string) =>
    downloadReport(path, filename).catch(() => toast.error('Failed to download report'));
import {
    Users, GraduationCap, BookOpen, School,
    TrendingUp, TrendingDown, BarChart3, Star,
    Download, RefreshCw, Loader2, AlertTriangle,
    Calendar, ClipboardList,
} from 'lucide-react';

// ── Tiny bar chart (CSS only) ────────────────────────────────────────────────
function MiniBar({ value, max, color = 'bg-indigo-500', height = 'h-32' }: {
    value: number; max: number; color?: string; height?: string;
}) {
    const pct = max > 0 ? (value / max) * 100 : 0;
    return (
        <div className={`w-full ${height} bg-slate-100 rounded-sm relative`}>
            <div className={`absolute bottom-0 left-0 right-0 ${color} rounded-sm transition-all`}
                style={{ height: `${pct}%` }} />
        </div>
    );
}

// ── Attendance trend spark line ───────────────────────────────────────────────
function AttendanceChart({ trend }: { trend: AnalyticsDashboard['attendance_trend'] }) {
    if (!trend.length) return <p className="text-xs text-slate-400 py-8 text-center">No attendance data.</p>;
    const last = trend.slice(-30);
    const maxTotal = Math.max(1, ...last.map(d => d.total));
    return (
        <div className="flex items-end gap-px h-32">
            {last.map(d => (
                <div key={d.date} className="flex-1 flex flex-col gap-px" title={`${d.date}: ${d.rate}% (${d.present}/${d.total})`}>
                    <div className="flex-1 bg-slate-100 rounded-t-sm relative">
                        <div className="absolute bottom-0 left-0 right-0 bg-emerald-500 rounded-t-sm"
                            style={{ height: `${d.total > 0 ? (d.present / d.total) * 100 : 0}%` }} />
                        {d.late > 0 && (
                            <div className="absolute bottom-0 left-0 right-0 bg-amber-400 rounded-t-sm"
                                style={{ height: `${d.total > 0 ? (d.late / d.total) * 100 : 0}%` }} />
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

const GRADE_COLORS: Record<string, string> = {
    'A (90-100)': 'bg-emerald-500',
    'B (75-89)': 'bg-blue-500',
    'C (60-74)': 'bg-indigo-400',
    'D (40-59)': 'bg-amber-400',
    'F (<40)': 'bg-red-500',
};

const WINDOW_OPTIONS = [
    { value: 14, label: '14 days' },
    { value: 30, label: '30 days' },
    { value: 60, label: '60 days' },
    { value: 90, label: '90 days' },
];

export default function AnalyticsPage() {
    const [data, setData] = useState<AnalyticsDashboard | null>(null);
    const [loading, setLoading] = useState(true);
    const [days, setDays] = useState(30);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async (days: number) => {
        setRefreshing(true);
        try {
            const d = await analyticsAPI.getDashboard({ days });
            setData(d);
        } catch { /* silent */ }
        finally { setLoading(false); setRefreshing(false); }
    }, []);

    useEffect(() => { load(days); }, [days]);

    const snap = data?.snapshot;
    const maxGrade = Math.max(1, ...(data?.grade_distribution ?? []).map(g => g.count));
    const maxSubject = Math.max(1, ...(data?.subject_performance ?? []).map(s => s.avg_pct));
    const maxClass = Math.max(1, ...(data?.class_performance ?? []).map(c => c.avg_pct));
    const maxActivity = Math.max(1, ...(data?.assessment_activity ?? []).map(a => a.count));

    if (loading) return (
        <div className="p-6 space-y-6 animate-pulse">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                {[1,2,3,4,5,6].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl" />)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {[1,2,3,4].map(i => <div key={i} className="h-48 bg-slate-100 rounded-2xl" />)}
            </div>
        </div>
    );

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900">Analytics Dashboard</h1>
                    <p className="text-sm text-slate-500 mt-1">School-wide performance, attendance, and academic insights</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Window selector */}
                    <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
                        {WINDOW_OPTIONS.map(o => (
                            <button key={o.value} onClick={() => setDays(o.value)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${days === o.value ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500'}`}>
                                {o.label}
                            </button>
                        ))}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => load(days)} disabled={refreshing}
                        className="rounded-xl text-xs font-bold gap-1.5 border-slate-200">
                        {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                        Refresh
                    </Button>
                    {/* Export links */}
                    <Button variant="outline" size="sm" className="rounded-xl text-xs font-bold gap-1.5 border-slate-200"
                        onClick={() => downloadOrToast(api.reports.getFeeCollectionExcel(), 'fee_collection.xlsx')}>
                        <Download className="h-3.5 w-3.5" /> Fee Report
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-xl text-xs font-bold gap-1.5 border-slate-200"
                        onClick={() => downloadOrToast(api.reports.getPendingFeesPDF(), 'pending_fees.pdf')}>
                        <Download className="h-3.5 w-3.5" /> Pending Fees
                    </Button>
                </div>
            </div>

            {/* Snapshot KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                    { icon: <Users className="h-4 w-4 text-indigo-600" />, label: 'Students', value: snap?.students ?? 0, color: 'bg-indigo-50' },
                    { icon: <GraduationCap className="h-4 w-4 text-violet-600" />, label: 'Teachers', value: snap?.teachers ?? 0, color: 'bg-violet-50' },
                    { icon: <School className="h-4 w-4 text-blue-600" />, label: 'Classes', value: snap?.classes ?? 0, color: 'bg-blue-50' },
                    { icon: <BookOpen className="h-4 w-4 text-teal-600" />, label: 'Subjects', value: snap?.subjects ?? 0, color: 'bg-teal-50' },
                    { icon: <TrendingUp className="h-4 w-4 text-emerald-600" />, label: 'Attendance Rate', value: `${snap?.overall_attendance_rate ?? 0}%`, color: 'bg-emerald-50' },
                    { icon: <ClipboardList className="h-4 w-4 text-amber-600" />, label: 'Pass Rate', value: `${snap?.pass_rate ?? 0}%`, color: 'bg-amber-50' },
                ].map((c, i) => (
                    <Card key={i} className="border-slate-200 shadow-sm">
                        <CardContent className="p-4">
                            <div className={`h-8 w-8 rounded-lg ${c.color} flex items-center justify-center mb-2`}>{c.icon}</div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">{c.label}</p>
                            <p className="text-xl font-black text-slate-900">{c.value}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Charts row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Attendance Trend */}
                <Card className="lg:col-span-2 border-slate-200 shadow-sm">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-bold text-slate-700">Attendance Trend (last {days} days)</CardTitle>
                            <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400">
                                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />Present</span>
                                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400 inline-block" />Late</span>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <AttendanceChart trend={data?.attendance_trend ?? []} />
                        {(data?.attendance_trend?.length ?? 0) > 0 && (
                            <div className="flex justify-between text-[9px] text-slate-400 mt-1">
                                <span>{data?.attendance_trend[0]?.date}</span>
                                <span>{data?.attendance_trend[data.attendance_trend.length - 1]?.date}</span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Grade Distribution */}
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold text-slate-700">Grade Distribution</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {(data?.grade_distribution ?? []).every(g => g.count === 0) ? (
                            <p className="text-xs text-slate-400 py-6 text-center">No published results yet.</p>
                        ) : (
                            (data?.grade_distribution ?? []).map(g => (
                                <div key={g.grade} className="space-y-1">
                                    <div className="flex justify-between text-xs font-bold">
                                        <span className="text-slate-600">{g.grade}</span>
                                        <span className="text-slate-800">{g.count}</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full ${GRADE_COLORS[g.grade] ?? 'bg-slate-400'}`}
                                            style={{ width: `${(g.count / maxGrade) * 100}%` }} />
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Charts row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Subject Performance */}
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold text-slate-700">Subject Performance (avg score %)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {(data?.subject_performance ?? []).length === 0 ? (
                            <p className="text-xs text-slate-400 py-6 text-center">No results data yet.</p>
                        ) : (
                            (data?.subject_performance ?? []).map(s => (
                                <div key={s.subject} className="space-y-1">
                                    <div className="flex justify-between text-xs font-bold">
                                        <span className="text-slate-600 truncate max-w-[60%]">{s.subject}</span>
                                        <span className={`${s.avg_pct >= 60 ? 'text-emerald-700' : s.avg_pct >= 40 ? 'text-amber-700' : 'text-red-600'}`}>
                                            {s.avg_pct}%
                                        </span>
                                    </div>
                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full ${s.avg_pct >= 60 ? 'bg-emerald-500' : s.avg_pct >= 40 ? 'bg-amber-400' : 'bg-red-500'}`}
                                            style={{ width: `${s.avg_pct}%` }} />
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

                {/* Class Performance */}
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold text-slate-700">Class Performance (avg score %)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {(data?.class_performance ?? []).length === 0 ? (
                            <p className="text-xs text-slate-400 py-6 text-center">No results data yet.</p>
                        ) : (
                            (data?.class_performance ?? []).map(c => (
                                <div key={c.class} className="space-y-1">
                                    <div className="flex justify-between text-xs font-bold">
                                        <span className="text-slate-600">{c.class}</span>
                                        <span className="text-slate-500 font-normal text-[10px]">{c.students} students · </span>
                                        <span className={`${c.avg_pct >= 60 ? 'text-emerald-700' : c.avg_pct >= 40 ? 'text-amber-700' : 'text-red-600'}`}>
                                            {c.avg_pct}%
                                        </span>
                                    </div>
                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full ${c.avg_pct >= 60 ? 'bg-blue-500' : c.avg_pct >= 40 ? 'bg-amber-400' : 'bg-red-500'}`}
                                            style={{ width: `${c.avg_pct}%` }} />
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Row 3: Assessment activity + Top students */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Assessment Activity */}
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold text-slate-700">Assessment Activity (monthly)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {(data?.assessment_activity ?? []).length === 0 ? (
                            <p className="text-xs text-slate-400 py-6 text-center">No assessment data yet.</p>
                        ) : (
                            <div className="flex items-end gap-2 h-32">
                                {(data?.assessment_activity ?? []).slice(-12).map(a => (
                                    <div key={a.month} className="flex-1 flex flex-col items-center gap-1">
                                        <span className="text-[9px] text-slate-500 font-bold">{a.count}</span>
                                        <MiniBar value={a.count} max={maxActivity} color="bg-violet-500" height="h-24" />
                                        <span className="text-[9px] text-slate-400 truncate w-full text-center">{a.label.split(' ')[0]}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Top Students */}
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                            <Star className="h-4 w-4 text-amber-500" />
                            <CardTitle className="text-sm font-bold text-slate-700">Top Performing Students</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {(data?.top_students ?? []).length === 0 ? (
                            <p className="text-xs text-slate-400 py-6 text-center">Not enough data yet.</p>
                        ) : (
                            (data?.top_students ?? []).map((s, i) => (
                                <div key={s.student_id} className="flex items-center gap-3">
                                    <span className={`text-sm font-black w-5 text-center ${i === 0 ? 'text-amber-500' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-amber-700' : 'text-slate-300'}`}>
                                        {i + 1}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-slate-700 truncate">{s.name}</p>
                                        <p className="text-[10px] text-slate-400">{s.assessments} assessments</p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-sm font-black ${s.avg_pct >= 90 ? 'text-emerald-600' : s.avg_pct >= 75 ? 'text-blue-600' : 'text-slate-600'}`}>
                                            {s.avg_pct}%
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Quick export links */}
            <Card className="border-slate-200 shadow-sm bg-slate-50">
                <CardContent className="p-4">
                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Quick Exports</p>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" className="rounded-xl text-xs font-bold gap-1.5 border-slate-200 bg-white"
                            onClick={() => downloadOrToast(api.reports.getFeeCollectionPDF(), 'fee_collection.pdf')}>
                            <Download className="h-3.5 w-3.5" /> Fee Collection PDF
                        </Button>
                        <Button variant="outline" size="sm" className="rounded-xl text-xs font-bold gap-1.5 border-slate-200 bg-white"
                            onClick={() => downloadOrToast(api.reports.getFeeCollectionExcel(), 'fee_collection.xlsx')}>
                            <Download className="h-3.5 w-3.5" /> Fee Collection Excel
                        </Button>
                        <Button variant="outline" size="sm" className="rounded-xl text-xs font-bold gap-1.5 border-slate-200 bg-white"
                            onClick={() => downloadOrToast(api.reports.getPendingFeesPDF(), 'pending_fees.pdf')}>
                            <Download className="h-3.5 w-3.5" /> Pending Fees PDF
                        </Button>
                        <Button variant="outline" size="sm" className="rounded-xl text-xs font-bold gap-1.5 border-slate-200 bg-white"
                            onClick={() => downloadOrToast(api.reports.getPendingFeesExcel(), 'pending_fees.xlsx')}>
                            <Download className="h-3.5 w-3.5" /> Pending Fees Excel
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
