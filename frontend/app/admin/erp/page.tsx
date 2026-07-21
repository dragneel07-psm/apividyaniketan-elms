// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen, Coins, GraduationCap, Loader2, School, TrendingUp, UserPlus, Users } from 'lucide-react';

import { academicAPI, SchoolERPOverview } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

function formatNumber(value: number | undefined): string {
    return Number(value || 0).toLocaleString();
}

function formatCurrency(value: number | undefined): string {
    return `$${Number(value || 0).toLocaleString()}`;
}

export default function SchoolERPOverviewPage() {
    const [data, setData] = useState<SchoolERPOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadOverview = useCallback(async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }
            const response = await academicAPI.getERPOverview();
            setData(response);
        } catch (error) {
            console.error('Failed to load ERP overview:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadOverview();
    }, [loadOverview]);

    const attendanceRate = useMemo(() => {
        if (!data?.attendance_today?.total_marked) return 0;
        const presentLike = (data.attendance_today.present || 0) + (data.attendance_today.late || 0);
        return Math.round((presentLike / Math.max(1, data.attendance_today.total_marked)) * 100);
    }, [data]);

    const admissionConversionRate = useMemo(() => {
        if (!data?.admissions?.total_enquiries) return 0;
        return Math.round((data.admissions.converted / Math.max(1, data.admissions.total_enquiries)) * 100);
    }, [data]);

    if (loading) {
        return (
            <div className="p-6 space-y-6">
                <div className="h-10 w-64 rounded bg-slate-100 animate-pulse" />
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {Array.from({ length: 8 }).map((_, index) => (
                        <div key={index} className="h-28 rounded-xl bg-slate-100 animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen dark:bg-slate-900">
            <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b pb-6">
                <div className="flex items-center gap-4">
                    <Link href="/admin">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">ERP Overview</h1>
                        <p className="text-sm text-slate-500">
                            Unified school operations snapshot for academic year{' '}
                            <span className="font-semibold">{data?.academic_year || 'N/A'}</span>.
                        </p>
                    </div>
                </div>
                <Button variant="outline" onClick={() => loadOverview(true)} disabled={refreshing}>
                    {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Refresh
                </Button>
            </header>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Card>
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs uppercase tracking-widest text-slate-500">Students</p>
                                <h3 className="mt-1 text-3xl font-bold text-slate-900">{formatNumber(data?.summary.total_students)}</h3>
                            </div>
                            <GraduationCap className="h-7 w-7 text-indigo-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs uppercase tracking-widest text-slate-500">Teachers</p>
                                <h3 className="mt-1 text-3xl font-bold text-slate-900">{formatNumber(data?.summary.total_teachers)}</h3>
                            </div>
                            <Users className="h-7 w-7 text-emerald-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs uppercase tracking-widest text-slate-500">Classes</p>
                                <h3 className="mt-1 text-3xl font-bold text-slate-900">{formatNumber(data?.summary.total_classes)}</h3>
                            </div>
                            <School className="h-7 w-7 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs uppercase tracking-widest text-slate-500">Subjects</p>
                                <h3 className="mt-1 text-3xl font-bold text-slate-900">{formatNumber(data?.summary.total_subjects)}</h3>
                            </div>
                            <BookOpen className="h-7 w-7 text-violet-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">Attendance Today</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <p className="text-3xl font-bold text-slate-900">{attendanceRate}%</p>
                        <Progress value={attendanceRate} className="h-2" />
                        <div className="text-xs text-slate-500">
                            {data?.attendance_today.present || 0} present, {data?.attendance_today.late || 0} late, {data?.attendance_today.absent || 0} absent
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">Admissions Conversion</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <p className="text-3xl font-bold text-slate-900">{admissionConversionRate}%</p>
                        <Progress value={admissionConversionRate} className="h-2" />
                        <div className="text-xs text-slate-500">
                            {data?.admissions.converted || 0} converted out of {data?.admissions.total_enquiries || 0}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">Revenue</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-2xl font-bold text-slate-900">{formatCurrency(data?.finance.total_revenue)}</p>
                            <Coins className="h-5 w-5 text-emerald-600" />
                        </div>
                        <p className="text-xs text-slate-500">Pending: {formatCurrency(data?.finance.total_pending)}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">Net Balance</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-2xl font-bold text-slate-900">{formatCurrency(data?.finance.net_balance)}</p>
                            <TrendingUp className="h-5 w-5 text-indigo-600" />
                        </div>
                        <p className="text-xs text-slate-500">Expenses: {formatCurrency(data?.finance.total_expenses)}</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Assessment Snapshot</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600">Upcoming assessments</span>
                            <Badge variant="secondary">{formatNumber(data?.summary.upcoming_assessments)}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600">Published results</span>
                            <Badge variant="secondary">{formatNumber(data?.summary.published_results)}</Badge>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Admissions Snapshot</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg border p-3">
                            <p className="text-xs text-slate-500">New</p>
                            <p className="text-xl font-semibold">{formatNumber(data?.admissions.new)}</p>
                        </div>
                        <div className="rounded-lg border p-3">
                            <p className="text-xs text-slate-500">Contacted</p>
                            <p className="text-xl font-semibold">{formatNumber(data?.admissions.contacted)}</p>
                        </div>
                        <div className="rounded-lg border p-3">
                            <p className="text-xs text-slate-500">Interested</p>
                            <p className="text-xl font-semibold">{formatNumber(data?.admissions.interested)}</p>
                        </div>
                        <div className="rounded-lg border p-3">
                            <p className="text-xs text-slate-500">Application Started</p>
                            <p className="text-xl font-semibold">{formatNumber(data?.admissions.application_started)}</p>
                        </div>
                        <div className="rounded-lg border p-3">
                            <p className="text-xs text-slate-500">Converted</p>
                            <p className="text-xl font-semibold">{formatNumber(data?.admissions.converted)}</p>
                        </div>
                        <div className="rounded-lg border p-3">
                            <p className="text-xs text-slate-500">Closed</p>
                            <p className="text-xl font-semibold">{formatNumber(data?.admissions.closed)}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardContent className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-sm font-medium text-slate-700">Next recommended actions</p>
                        <p className="text-xs text-slate-500">Use admissions board for daily follow-ups and convert eligible enquiries to students.</p>
                    </div>
                    <Link href="/admin/admissions">
                        <Button>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Open Admissions Board
                        </Button>
                    </Link>
                </CardContent>
            </Card>
        </div>
    );
}
