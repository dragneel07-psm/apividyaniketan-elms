// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, GraduationCap, School, TrendingUp, ArrowUpRight, ArrowDownRight, UserPlus, FilePlus, Calendar, MoreVertical, CreditCard, BookOpen, UserRoundPlus, BarChart3 } from 'lucide-react';
import { academicAPI, analyticsAPI, billingAPI } from '@/lib/api';
import { XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area, PieChart, Pie, Cell, Legend } from 'recharts';
import { SafeResponsiveContainer } from '@/components/ui/safe-responsive-container';
import { MotionCard } from '@/components/interactive/motion-card';
import { AnimatedCounter } from '@/components/interactive/animated-counter';
import { Sparkline } from '@/components/interactive/sparkline';
import type { ChartPoint } from '@/components/interactive/trend-chart';

// Dialog Imports
import { AddStudentDialog } from '@/components/add-student-dialog';
import { AddTeacherDialog } from '@/components/add-teacher-dialog';
import { CreateNoticeDialog } from '@/components/create-notice-dialog';
import { ManageScheduleDialog } from '@/components/manage-schedule-dialog';

type ActivityItem = { id: number; type: string; message: string; time: string };

export default function SchoolAdminDashboard() {
    const router = useRouter();
    const [stats, setStats] = useState({
        totalStudents: 0,
        totalTeachers: 0,
        totalClasses: 0,
        attendanceRate: 0,
        revenue: 0,
        pendingFees: 0,
        loading: true
    });

    const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
    const [classDistribution, setClassDistribution] = useState<Array<{ name: string; students: number }>>([]);
    const [revenueTrend, setRevenueTrend] = useState<ChartPoint[]>([]);
    const [attendanceTrendSeries, setAttendanceTrendSeries] = useState<ChartPoint[]>([]);

    // Dialog States
    const [showAddStudent, setShowAddStudent] = useState(false);
    const [showAddTeacher, setShowAddTeacher] = useState(false);
    const [showCreateNotice, setShowCreateNotice] = useState(false);
    const [showManageSchedule, setShowManageSchedule] = useState(false);

    const toList = <T,>(payload: unknown): T[] => {
        if (Array.isArray(payload)) return payload as T[];
        if (payload && typeof payload === 'object' && Array.isArray((payload as any).results)) {
            return (payload as any).results as T[];
        }
        return [];
    };

    // Aggregate endpoints (analytics dashboard + finance dashboard/analytics)
    // compute counts, sums, and monthly buckets with a handful of grouped SQL
    // queries. Previously this page fetched every page of students/accounts/
    // payments client-side (100+ requests once real data volume existed) just
    // to recompute the same totals in JS — see analyticsAPI.getDashboard and
    // billingAPI.getFinance{Dashboard,Analytics} for where each number below
    // actually gets computed now.
    const loadData = useCallback(async () => {
        try {
            setStats((prev) => ({ ...prev, loading: true }));
            const [analytics, finance, financeAnalytics, noticesRaw] = await Promise.all([
                analyticsAPI.getDashboard({ days: 180 }).catch((e) => {
                    console.error("Analytics fetch failed:", e);
                    return {
                        snapshot: { students: 0, teachers: 0, classes: 0, subjects: 0, overall_attendance_rate: 0, pass_rate: 0, total_results: 0 },
                        attendance_trend: [],
                        grade_distribution: [],
                        subject_performance: [],
                        class_performance: [],
                        class_distribution: [],
                        assessment_activity: [],
                        top_students: [],
                    };
                }),
                billingAPI.getFinanceDashboard().catch((e) => {
                    console.error("Finance fetch failed:", e);
                    return { total_revenue: 0, total_pending: 0, total_expenses: 0, net_balance: 0, recent_payments: [], recent_expenses: [] };
                }),
                billingAPI.getFinancialAnalytics().catch((e) => {
                    console.error("Finance analytics fetch failed:", e);
                    return { monthly_collections: [], expense_by_category: [], fee_status_breakdown: [], collection_rate: 0, top_defaulters: [] };
                }),
                academicAPI.getNotices().catch((e) => { console.error("Notices fetch failed:", e); return []; }),
            ]);

            const notices = toList<any>(noticesRaw);
            const attendanceRate = Math.round(analytics.snapshot.overall_attendance_rate);

            setStats({
                totalStudents: analytics.snapshot.students,
                totalTeachers: analytics.snapshot.teachers,
                totalClasses: analytics.snapshot.classes,
                attendanceRate,
                revenue: finance.total_revenue || 0,
                pendingFees: finance.total_pending || 0,
                loading: false
            });

            const distribution = analytics.class_distribution.map((row) => ({ name: row.class, students: row.students }));
            const activeDistribution = distribution.filter((item) => item.students > 0);
            setClassDistribution(activeDistribution.length > 0 ? activeDistribution : distribution.slice(0, 8));

            const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const monthLabel = (d: Date) => d.toLocaleDateString('en-US', { month: 'short' });
            const lastMonths = (n: number) => {
                const now = new Date();
                return Array.from({ length: n }, (_, i) => new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1));
            };

            const collectionsByMonth: Record<string, number> = {};
            for (const row of financeAnalytics.monthly_collections) {
                collectionsByMonth[row.month] = row.total;
            }
            setRevenueTrend(lastMonths(6).map((d) => ({ label: monthLabel(d), value: Math.round(collectionsByMonth[monthKey(d)] || 0) })));

            const attByMonth: Record<string, { present: number; total: number }> = {};
            for (const day of analytics.attendance_trend) {
                const d = new Date(day.date);
                if (Number.isNaN(d.getTime())) continue;
                const key = monthKey(d);
                attByMonth[key] = attByMonth[key] || { present: 0, total: 0 };
                attByMonth[key].total += day.total;
                attByMonth[key].present += day.present + day.late;
            }
            setAttendanceTrendSeries(lastMonths(6).map((d) => {
                const bucket = attByMonth[monthKey(d)];
                return { label: monthLabel(d), value: bucket && bucket.total > 0 ? Math.round((bucket.present / bucket.total) * 100) : 0 };
            }));

            const formatDate = (dateString?: string) => {
                if (!dateString) return 'Recently';
                const parsed = new Date(dateString);
                if (Number.isNaN(parsed.getTime())) return 'Recently';
                return parsed.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            };

            const paymentActivity: ActivityItem[] = finance.recent_payments
                .slice(0, 2)
                .map((payment, idx) => ({
                    id: idx + 1,
                    type: 'payment',
                    message: `Payment received${payment.student_name ? ` from ${payment.student_name}` : ''} (${Number(payment.amount || 0).toLocaleString()}).`,
                    time: formatDate(payment.payment_date),
                }));

            const noticeActivity: ActivityItem[] = notices
                .sort((a, b) => new Date(b.published_date || '').getTime() - new Date(a.published_date || '').getTime())
                .slice(0, 2)
                .map((notice, idx) => ({
                    id: idx + 10,
                    type: 'announcement',
                    message: `Notice published: ${notice.title}`,
                    time: formatDate(notice.published_date),
                }));

            const latestDay = analytics.attendance_trend[analytics.attendance_trend.length - 1];
            const attendanceActivity: ActivityItem[] = latestDay ? [{
                id: 50,
                type: 'attendance',
                message: `${latestDay.present + latestDay.late} attendance entries marked present/late out of ${latestDay.total} on ${latestDay.date}.`,
                time: 'Recently',
            }] : [];

            const merged = [...paymentActivity, ...noticeActivity, ...attendanceActivity].slice(0, 6);
            setRecentActivity(merged.length > 0 ? merged : [{
                id: 999,
                type: 'system',
                message: 'No recent operational events found.',
                time: 'Now',
            }]);
        } catch (error) {
            console.error("Dashboard Load Error", error);
            setStats(prev => ({ ...prev, loading: false }));
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const feeCollectionData = [
        { name: 'Collected', value: stats.revenue || 0, fill: '#6366f1' },
        { name: 'Pending', value: stats.pendingFees || 0, fill: '#10b981' },
    ];

    const KPI_CARDS = [
        {
            title: 'Total Students',
            value: stats.totalStudents,
            prefix: '',
            suffix: '',
            spark: [] as ChartPoint[],
            trend: `${stats.totalClasses} active classes`,
            trendUp: null as boolean | null,
            icon: GraduationCap,
            color: 'text-indigo-600',
            bg: 'bg-indigo-50'
        },
        {
            title: 'Teachers',
            value: stats.totalTeachers,
            prefix: '',
            suffix: '',
            spark: [] as ChartPoint[],
            trend: stats.totalTeachers > 0 ? `${Math.round((stats.totalStudents / Math.max(1, stats.totalTeachers)))} students / teacher` : 'No teacher assigned',
            trendUp: null as boolean | null,
            icon: Users,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50'
        },
        {
            title: 'Attendance',
            value: stats.attendanceRate,
            prefix: '',
            suffix: '%',
            spark: attendanceTrendSeries,
            trend: stats.attendanceRate >= 90 ? 'Healthy attendance' : 'Needs attention',
            trendUp: (stats.attendanceRate >= 90) as boolean | null,
            icon: School,
            color: 'text-blue-600',
            bg: 'bg-blue-50'
        },
        {
            title: 'Revenue',
            value: stats.revenue,
            prefix: 'Rs. ',
            suffix: '',
            spark: revenueTrend,
            trend: stats.pendingFees > 0 ? `Rs. ${stats.pendingFees.toLocaleString()} pending` : 'All collected',
            trendUp: (stats.pendingFees === 0) as boolean | null,
            icon: TrendingUp,
            color: 'text-orange-600',
            bg: 'bg-orange-50'
        },
    ];

    return (
        <div className="space-y-6">

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {KPI_CARDS.map((card, idx) => (
                    <MotionCard key={idx} index={idx} className="border-none shadow-sm">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium text-slate-500">{card.title}</p>
                                    <h3 className="text-2xl font-bold text-slate-900 mt-2">
                                        <AnimatedCounter value={card.value} locale="en" prefix={card.prefix} suffix={card.suffix} />
                                    </h3>
                                </div>
                                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${card.bg}`}>
                                    <card.icon className={`h-5 w-5 ${card.color}`} />
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mt-4 text-xs font-medium">
                                {card.trendUp === true && <ArrowUpRight className="h-3 w-3 text-green-600" />}
                                {card.trendUp === false && <ArrowDownRight className="h-3 w-3 text-red-600" />}
                                <span className={card.trendUp === true ? 'text-green-600' : card.trendUp === false ? 'text-red-600' : 'text-slate-500'}>
                                    {card.trend}
                                </span>
                            </div>
                            {card.spark.some((point) => point.value > 0) && (
                                <Sparkline data={card.spark} height={32} className="mt-3" />
                            )}
                        </CardContent>
                    </MotionCard>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Line Chart */}
                <Card className="lg:col-span-2 border-none shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base font-semibold text-slate-800">Students by Class</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        {classDistribution.length > 0 ? (
                            <SafeResponsiveContainer width="100%" height="100%">
                                <AreaChart data={classDistribution}>
                                    <defs>
                                        <linearGradient id="colorStudents" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Area type="monotone" dataKey="students" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorStudents)" />
                                </AreaChart>
                            </SafeResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center rounded-lg border border-dashed border-slate-200 text-sm text-slate-500">
                                Class distribution data is not available.
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Pie Chart */}
                <Card className="border-none shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base font-semibold text-slate-800">Fee Collection</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px] relative">
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center">
                                <span className="text-3xl font-bold text-slate-900 block">
                                    {stats.revenue > 0 ? Math.round((stats.revenue / (stats.revenue + stats.pendingFees)) * 100) : 0}%
                                </span>
                                <span className="text-xs text-slate-500">Collected</span>
                            </div>
                        </div>
                        <SafeResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={feeCollectionData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={90}
                                    paddingAngle={5}
                                    dataKey="value"
                                    cornerRadius={5}
                                >
                                    {feeCollectionData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </PieChart>
                        </SafeResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Bottom Row: Recent Activity & Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Recent Activity */}
                <Card className="lg:col-span-2 border-none shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-base font-semibold text-slate-800">Recent Activity</CardTitle>
                        <Button variant="ghost" size="sm" className="text-indigo-600" onClick={() => router.push('/admin/notifications')}>View All</Button>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {recentActivity.map((activity) => (
                                <div key={activity.id} className="flex items-start gap-4 p-3 hover:bg-slate-50 rounded-lg transition-colors group">
                                    <div className={`mt-1 h-2 w-2 rounded-full ring-2 ring-white
                                            ${activity.type === 'enrollment' ? 'bg-blue-500' :
                                            activity.type === 'payment' ? 'bg-emerald-500' :
                                                activity.type === 'announcement' ? 'bg-orange-500' : 'bg-slate-400'
                                        }`}
                                    />
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-slate-900">{activity.message}</p>
                                        <p className="text-xs text-slate-500 mt-1">{activity.time}</p>
                                    </div>
                                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <MoreVertical className="h-4 w-4 text-slate-400" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card className="border-none shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base font-semibold text-slate-800">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-3">
                        <Button
                            className="h-24 flex flex-col gap-2 bg-indigo-600 hover:bg-indigo-700 text-white border-0 shadow-lg shadow-indigo-200"
                            onClick={() => setShowAddStudent(true)}
                        >
                            <UserPlus className="h-6 w-6" />
                            Add Student
                        </Button>
                        <Button
                            variant="outline"
                            className="h-24 flex flex-col gap-2 border-slate-200 bg-white hover:bg-slate-50 hover:text-indigo-600"
                            onClick={() => setShowAddTeacher(true)}
                        >
                            <UserPlus className="h-6 w-6" />
                            Add Staff
                        </Button>
                        <Button
                            variant="outline"
                            className="h-24 flex flex-col gap-2 border-slate-200 bg-white hover:bg-slate-50 hover:text-indigo-600"
                            onClick={() => router.push('/admin/finance')}
                        >
                            <CreditCard className="h-6 w-6" />
                            Finance
                        </Button>
                        <Button
                            variant="outline"
                            className="h-24 flex flex-col gap-2 border-slate-200 bg-white hover:bg-slate-50 hover:text-indigo-600"
                            onClick={() => router.push('/admin/library')}
                        >
                            <BookOpen className="h-6 w-6" />
                            Library
                        </Button>
                        <Button
                            variant="outline"
                            className="h-24 flex flex-col gap-2 border-slate-200 bg-white hover:bg-slate-50 hover:text-indigo-600"
                            onClick={() => setShowCreateNotice(true)}
                        >
                            <FilePlus className="h-6 w-6" />
                            Post Notice
                        </Button>
                        <Button
                            variant="outline"
                            className="h-24 flex flex-col gap-2 border-slate-200 bg-white hover:bg-slate-50 hover:text-indigo-600"
                            onClick={() => setShowManageSchedule(true)}
                        >
                            <Calendar className="h-6 w-6" />
                            Schedule
                        </Button>
                        <Button
                            variant="outline"
                            className="h-24 flex flex-col gap-2 border-slate-200 bg-white hover:bg-slate-50 hover:text-indigo-600"
                            onClick={() => router.push('/admin/admissions')}
                        >
                            <UserRoundPlus className="h-6 w-6" />
                            Admissions
                        </Button>
                        <Button
                            variant="outline"
                            className="h-24 flex flex-col gap-2 border-slate-200 bg-white hover:bg-slate-50 hover:text-indigo-600"
                            onClick={() => router.push('/admin/erp')}
                        >
                            <BarChart3 className="h-6 w-6" />
                            ERP Overview
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Dialogs */}
            <AddStudentDialog open={showAddStudent} onOpenChange={setShowAddStudent} onSuccess={() => { setShowAddStudent(false); loadData(); }} />
            <AddTeacherDialog open={showAddTeacher} onOpenChange={setShowAddTeacher} onSuccess={() => { setShowAddTeacher(false); loadData(); }} />
            <CreateNoticeDialog open={showCreateNotice} onOpenChange={setShowCreateNotice} onSuccess={() => { setShowCreateNotice(false); loadData(); }} />
            <ManageScheduleDialog open={showManageSchedule} onOpenChange={setShowManageSchedule} />
        </div>
    );
}
