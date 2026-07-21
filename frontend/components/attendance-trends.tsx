// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    XAxis, YAxis,
    CartesianGrid, Tooltip, AreaChart, Area
} from 'recharts';
import { SafeResponsiveContainer } from '@/components/ui/safe-responsive-container';
import { academicAPI } from '@/lib/api';
import { Loader2, TrendingUp, Info } from 'lucide-react';

interface AttendanceTrendData {
    date: string;
    rate: number;
}

type ListResponse<T> = T[] | { results?: T[] };

interface AttendanceRecord {
    student: string;
    status: string;
    date: string;
}

interface StudentRecord {
    id?: string;
    student_id?: string;
}

function asArray<T>(payload: ListResponse<T> | null | undefined): T[] {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.results)) return payload.results;
    return [];
}

function toDateKey(value: string): string {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function toDisplayDate(dateKey: string): string {
    const parsed = new Date(`${dateKey}T00:00:00`);
    return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function AttendanceTrends({ sectionId }: { sectionId?: number }) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<AttendanceTrendData[]>([]);
    const [summary, setSummary] = useState({
        avgRate: 0,
        insight: 'No attendance records available for the selected period.',
    });

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const attendancePayload = await academicAPI.getAttendance() as ListResponse<AttendanceRecord>;
                let records = asArray(attendancePayload);

                if (sectionId) {
                    const studentsPayload = await academicAPI.getStudents({ section_id: String(sectionId) }) as ListResponse<StudentRecord>;
                    const sectionStudentIds = new Set(
                        asArray(studentsPayload)
                            .map((student) => String(student.id || student.student_id || ''))
                            .filter(Boolean)
                    );
                    records = records.filter((item) => sectionStudentIds.has(String(item.student)));
                }

                const today = new Date();
                const dayBuckets: Record<string, { presentLike: number; total: number }> = {};

                for (let i = 14; i >= 0; i -= 1) {
                    const day = new Date(today);
                    day.setDate(today.getDate() - i);
                    const key = toDateKey(day.toISOString());
                    dayBuckets[key] = { presentLike: 0, total: 0 };
                }

                records.forEach((record) => {
                    const key = toDateKey(record.date);
                    if (!key || !dayBuckets[key]) return;
                    dayBuckets[key].total += 1;
                    if (record.status === 'present' || record.status === 'late') {
                        dayBuckets[key].presentLike += 1;
                    }
                });

                const computed = Object.keys(dayBuckets).map((key) => {
                    const bucket = dayBuckets[key];
                    const rate = bucket.total > 0 ? Number(((bucket.presentLike / bucket.total) * 100).toFixed(1)) : 0;
                    return {
                        date: toDisplayDate(key),
                        rate,
                    };
                });

                const validRates = computed.filter((item) => item.rate > 0).map((item) => item.rate);
                const avgRate = validRates.length > 0
                    ? Number((validRates.reduce((sum, value) => sum + value, 0) / validRates.length).toFixed(1))
                    : 0;

                const recent = computed.slice(-3);
                const recentAvg = recent.length > 0
                    ? recent.reduce((sum, item) => sum + item.rate, 0) / recent.length
                    : 0;
                const prior = computed.slice(-6, -3);
                const priorAvg = prior.length > 0
                    ? prior.reduce((sum, item) => sum + item.rate, 0) / prior.length
                    : 0;

                let insight = 'Attendance records are stable with no major swings in the last 15 days.';
                if (recentAvg > 0 && priorAvg > 0) {
                    const delta = recentAvg - priorAvg;
                    if (delta >= 3) {
                        insight = 'Attendance improved in the last 3 days compared to the previous period.';
                    } else if (delta <= -3) {
                        insight = 'Attendance dropped in the last 3 days; review absentee reasons for affected classes.';
                    }
                }
                if (avgRate >= 95) {
                    insight = 'Excellent consistency: attendance is maintaining above 95% overall.';
                } else if (avgRate > 0 && avgRate < 80) {
                    insight = 'Average attendance is below 80%; consider targeted follow-up for frequent absentees.';
                }

                setData(computed);
                setSummary({ avgRate, insight });
            } catch (error) {
                console.error('Failed to load attendance trends:', error);
                setData([]);
                setSummary({
                    avgRate: 0,
                    insight: 'Unable to load attendance trends right now.',
                });
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [sectionId]);

    const hasAnyData = useMemo(() => data.some((item) => item.rate > 0), [data]);

    if (loading) {
        return (
            <div className="h-[300px] flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
                <div className="space-y-1">
                    <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-indigo-600" />
                        Attendance Trends
                    </CardTitle>
                    <p className="text-xs text-slate-500 font-medium">Daily attendance rate for the last 15 days.</p>
                </div>
                <div className="flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded-lg">
                    <span className="text-[10px] font-black text-indigo-700 uppercase">Avg {summary.avgRate}%</span>
                </div>
            </CardHeader>
            <CardContent>
                <div className="h-[250px] w-full">
                    {hasAnyData ? (
                        <SafeResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data}>
                                <defs>
                                    <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="date"
                                    fontSize={10}
                                    fontWeight={700}
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8' }}
                                    dy={10}
                                />
                                <YAxis
                                    hide
                                    domain={[0, 100]}
                                />
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: '16px',
                                        border: 'none',
                                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                        padding: '12px'
                                    }}
                                    labelStyle={{ fontWeight: 800, color: '#1e293b', marginBottom: '4px' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="rate"
                                    stroke="#4f46e5"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorRate)"
                                    name="Attendance Rate %"
                                />
                            </AreaChart>
                        </SafeResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center rounded-2xl border border-dashed border-slate-200 text-slate-500 text-sm">
                            No attendance records found in the last 15 days.
                        </div>
                    )}
                </div>
                <div className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-3">
                    <Info className="h-4 w-4 text-slate-400 mt-0.5" />
                    <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
                        {summary.insight}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
