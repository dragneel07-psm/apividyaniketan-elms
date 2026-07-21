// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
    BookOpen, Users, FileText, Calendar, MapPin, AlertTriangle,
    ChevronRight, ClipboardList, CheckCircle, TrendingUp, Video
} from 'lucide-react';
import { CreateLessonDialog } from '@/components/create-lesson-dialog';
import { academicAPI, AtRiskStudent, User, usersAPI, aiAPI } from '@/lib/api';
import { AITeachingAssistant } from '@/components/ai-teaching-assistant';
import { MyProfileDialog } from '@/components/my-profile-dialog';
import { AttendanceTrends } from '@/components/attendance-trends';
import { StartInstantLiveClassDialog } from '@/components/start-instant-live-class-dialog';
import Link from 'next/link';
import { MotionCard } from '@/components/interactive/motion-card';
import { AnimatedCounter } from '@/components/interactive/animated-counter';
import { Stagger } from '@/components/interactive/stagger';
import { TrendChart } from '@/components/interactive/trend-chart';

type ScheduleSlot = {
    time: string;
    className: string;
    subject: string;
    room: string;
    status: 'completed' | 'ongoing' | 'upcoming';
};

function formatTenantLabel(raw: string | null | undefined): string {
    const value = String(raw || '').trim();
    if (!value) return 'School';
    if (/^\d+$/.test(value)) return 'School';
    return value
        .split(/[-_\s]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

export default function TeacherDashboard() {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);
    const [showProfileEdit, setShowProfileEdit] = useState(false);
    const [stats, setStats] = useState({
        totalStudents: 0,
        classesAssigned: 0,
        pendingReviews: 0,
        aiEvaluations: 0,
        todaysClasses: 0,
        nextClassInMins: null as number | null,
    });
    const [schoolName, setSchoolName] = useState("Teacher");
    const [schedule, setSchedule] = useState<ScheduleSlot[]>([]);
    const [performanceTrends, setPerformanceTrends] = useState<Array<{ name: string; score: number }>>([]);
    const [atRiskStudents, setAtRiskStudents] = useState<AtRiskStudent[]>([]);

    const [alerts, setAlerts] = useState<any[]>([]);

    const toList = <T,>(payload: unknown): T[] => {
        if (Array.isArray(payload)) return payload as T[];
        if (payload && typeof payload === 'object' && Array.isArray((payload as any).results)) {
            return (payload as any).results as T[];
        }
        return [];
    };

    const toMinutes = (time: string) => {
        const [h, m] = String(time || '').split(':').map(Number);
        if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
        return (h * 60) + m;
    };

    const formatClock = (time: string) => {
        const [h, m] = String(time || '').split(':').map(Number);
        if (!Number.isFinite(h) || !Number.isFinite(m)) return time;
        const d = new Date();
        d.setHours(h, m, 0, 0);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    useEffect(() => {
        async function loadData() {
            try {
                const me = await usersAPI.getMe();
                setUser(me);
                const tenantFromStorage = typeof window !== 'undefined'
                    ? localStorage.getItem('tenant_id')
                    : null;
                setSchoolName(formatTenantLabel(tenantFromStorage || me.tenant));

                const [
                    studentsRaw,
                    subjectsRaw,
                    submissionsRaw,
                    aiLogs,
                    timetableRaw,
                    teacherProfile,
                    analyticsData,
                ] = await Promise.all([
                    academicAPI.getStudents().catch(() => []),
                    academicAPI.getSubjects().catch(() => []),
                    academicAPI.getSubmissions().catch(() => []),
                    aiAPI.getAILogs().catch(() => []),
                    academicAPI.getTimetable().catch(() => []),
                    academicAPI.getMyTeacherProfile().catch(() => null),
                    aiAPI.getTeacherAnalytics().catch(() => null),
                ]);

                const students = toList<any>(studentsRaw);
                const subjects = toList<any>(subjectsRaw);
                const submissions = toList<any>(submissionsRaw);
                const timetable = toList<any>(timetableRaw);
                const logs = Array.isArray(aiLogs) ? aiLogs : [];
                const teacherName = `${me.first_name || ''} ${me.last_name || ''}`.trim().toLowerCase();
                const weekday = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
                const nowMinutes = (new Date().getHours() * 60) + new Date().getMinutes();

                const todaySchedule: ScheduleSlot[] = timetable
                    .filter((entry) => String(entry.day_of_week || '').toLowerCase() === weekday)
                    .filter((entry) => {
                        if (teacherProfile?.id && entry.teacher) return String(entry.teacher) === String(teacherProfile.id);
                        const entryName = String(entry.teacher_name || '').toLowerCase();
                        return teacherName ? entryName.includes(teacherName) : true;
                    })
                    .sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time))
                    .map((entry) => {
                        const start = toMinutes(entry.start_time);
                        const end = toMinutes(entry.end_time);
                        let status: ScheduleSlot['status'] = 'upcoming';
                        if (nowMinutes > end) status = 'completed';
                        else if (nowMinutes >= start && nowMinutes <= end) status = 'ongoing';

                        return {
                            time: `${formatClock(entry.start_time)} - ${formatClock(entry.end_time)}`,
                            className: entry.academic_class_name || entry.academic_class || 'Class',
                            subject: entry.subject_name || 'Subject',
                            room: entry.room_number || 'Room not set',
                            status,
                        };
                    });

                setSchedule(todaySchedule);

                const nextClass = todaySchedule.find((slot) => slot.status === 'upcoming');
                const nextClassInMins = nextClass ? Math.max(0, toMinutes(nextClass.time.split(' - ')[0]) - nowMinutes) : null;

                const pendingReviews = submissions.filter((submission) => !submission.is_graded && submission.status !== 'draft').length;
                const aiEvaluations = logs.filter((log: any) => {
                    const feature = String(log.feature_used || '').toLowerCase();
                    return feature.includes('grading') || feature.includes('evaluation') || feature.includes('eval');
                }).length;

                const classIds = Array.from(
                    new Set(
                        subjects
                            .map((subject) => Number(subject.academic_class))
                            .filter((value) => Number.isFinite(value) && value > 0)
                    )
                );
                if (classIds.length > 0) {
                    const riskByClass = await Promise.all(
                        classIds.map((classId) => aiAPI.getAtRiskStudents(classId, true).catch(() => []))
                    );
                    const merged: Record<string, AtRiskStudent> = {};
                    for (const rows of riskByClass) {
                        for (const row of rows) {
                            const key = String(row.student_id);
                            if (!merged[key] || Number(row.risk_score) > Number(merged[key].risk_score)) {
                                merged[key] = row;
                            }
                        }
                    }
                    const topRisk = Object.values(merged)
                        .sort((a, b) => Number(b.risk_score) - Number(a.risk_score))
                        .slice(0, 5);
                    setAtRiskStudents(topRisk);
                } else {
                    setAtRiskStudents([]);
                }

                setStats({
                    totalStudents: students.length,
                    classesAssigned: subjects.length,
                    pendingReviews,
                    aiEvaluations,
                    todaysClasses: todaySchedule.length,
                    nextClassInMins,
                });

                if (analyticsData) {
                    const trend = Array.isArray(analyticsData.performance_trends)
                        ? analyticsData.performance_trends.map((row: any) => ({
                            name: row.week || 'Week',
                            score: Number(row.avgScore || 0),
                        }))
                        : [];
                    setPerformanceTrends(trend);

                    const newAlerts = [];
                    if (analyticsData.at_risk_count > 0) {
                        newAlerts.push({
                            id: 1,
                            type: 'alert',
                            title: `${analyticsData.at_risk_count} Students At-Risk`,
                            desc: analyticsData.at_risk_students?.[0]
                                ? `Critical: ${analyticsData.at_risk_students[0].name} and others show declining trends.`
                                : 'Students show declining performance trends.',
                            action: 'View Analytics',
                            link: '/teacher/analytics'
                        });
                    }
                    (analyticsData.ai_insights || []).forEach((insight: string, i: number) => {
                        if (newAlerts.length < 3) {
                            newAlerts.push({
                                id: i + 2,
                                type: 'warning',
                                title: 'Curriculum Insight',
                                desc: insight,
                                action: 'Manage Lessons',
                                link: '/teacher/courses'
                            });
                        }
                    });
                    if (newAlerts.length === 0) {
                        newAlerts.push({
                            id: 99,
                            type: 'info',
                            title: 'No critical alerts',
                            desc: 'Current class and assessment indicators are stable.',
                            action: 'View Analytics',
                            link: '/teacher/analytics'
                        });
                    }
                    setAlerts(newAlerts);
                } else {
                    setPerformanceTrends([]);
                    setAlerts([
                        {
                            id: 1,
                            type: 'warning',
                            title: 'Analytics unavailable',
                            desc: 'AI analytics service is not returning data right now.',
                            action: 'Retry Later',
                            link: '/teacher/analytics'
                        }
                    ]);
                }
            } catch (error) {
                console.error('Dashboard load failed:', error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    if (loading) return <div className="p-8 flex justify-center text-slate-400">Loading dashboard...</div>;

    const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* 1. Welcome Section */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Good Morning, {user?.first_name || 'Teacher'} 👋</h1>
                <p className="text-slate-500">{currentDate} • {schoolName}</p>
            </div>

            {/* 2. KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <MotionCard index={0} className="shadow-sm border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Today&apos;s Classes</CardTitle>
                        <BookOpen className="h-4 w-4 text-indigo-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900"><AnimatedCounter value={stats.todaysClasses} locale="en" /></div>
                        <p className="text-xs text-slate-500 mt-1">
                            {stats.nextClassInMins !== null ? `Next class in ${stats.nextClassInMins} mins` : 'No upcoming classes today'}
                        </p>
                    </CardContent>
                </MotionCard>
                <MotionCard index={1} className="shadow-sm border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Total Students</CardTitle>
                        <Users className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900"><AnimatedCounter value={stats.totalStudents} locale="en" /></div>
                        <p className="text-xs text-emerald-600 flex items-center mt-1">
                            <TrendingUp className="h-3 w-3 mr-1" /> +2% this month
                        </p>
                    </CardContent>
                </MotionCard>
                <MotionCard index={2} className="shadow-sm border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Pending Reviews</CardTitle>
                        <FileText className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900"><AnimatedCounter value={stats.pendingReviews} locale="en" /></div>
                        <p className="text-xs text-amber-600 font-medium mt-1">Requires attention</p>
                    </CardContent>
                </MotionCard>
                <MotionCard index={3} className="shadow-sm border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">AI Evaluations</CardTitle>
                        <CheckCircle className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900"><AnimatedCounter value={stats.aiEvaluations} locale="en" /></div>
                        <Progress value={Math.min(100, stats.aiEvaluations)} className="h-1.5 mt-2 bg-purple-100" />
                    </CardContent>
                </MotionCard>
            </div>

            {/* 3. Main Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Left Column: Schedule (2 cols wide on large screens) */}
                <div className="xl:col-span-2 space-y-6">
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-50">
                            <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-indigo-500" /> Today&apos;s Schedule
                            </CardTitle>
                            <Link href="/teacher/timetable">
                                <Button variant="ghost" size="sm" className="text-xs text-indigo-600 h-8">View Full Timetable</Button>
                            </Link>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="space-y-6 relative before:absolute before:inset-y-0 before:left-4 before:w-0.5 before:bg-slate-200">
                                {schedule.length === 0 && (
                                    <div className="text-center py-6 text-sm text-slate-500 border border-dashed border-slate-200 rounded-lg">
                                        No classes assigned for today.
                                    </div>
                                )}
                                {schedule.map((slot, i) => (
                                    <div key={i} className="relative pl-10 group">
                                        <span className={`absolute left-[11px] top-1 h-3 w-3 rounded-full border-2 border-white ring-2 ${slot.status === 'completed' ? 'ring-emerald-100 bg-emerald-500' : slot.status === 'ongoing' ? 'ring-indigo-100 bg-indigo-500' : 'ring-slate-200 bg-slate-400'}`}></span>
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50/50 rounded-lg border border-slate-100 group-hover:bg-indigo-50/30 transition-colors">
                                            <div className="space-y-1">
                                                <div className="text-sm font-medium text-slate-500 font-mono flex items-center gap-2">
                                                    {slot.time}
                                                    {slot.room === 'Online' && <Badge variant="secondary" className="bg-green-100 text-green-700 text-[10px] h-5">Online</Badge>}
                                                </div>
                                                <div className="font-bold text-slate-900 text-lg">{slot.subject}</div>
                                                <div className="text-sm text-slate-600 flex items-center gap-2">
                                                    <Users className="h-3 w-3" /> {slot.className}
                                                    <span className="text-slate-300">|</span>
                                                    <MapPin className="h-3 w-3" /> {slot.room}
                                                </div>
                                            </div>
                                            <div className="mt-4 sm:mt-0 flex gap-2">
                                                <Button size="sm" variant="outline" className="bg-white">View Materials</Button>
                                                <Link href="/teacher/timetable">
                                                    <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">Manage Live Class</Button>
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Charts Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card className="border-slate-200 shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-bold text-slate-700">Performance Trends</CardTitle>
                            </CardHeader>
                            <CardContent className="h-[200px] w-full">
                                {performanceTrends.length > 0 ? (
                                    <TrendChart
                                        data={performanceTrends.map((row) => ({ label: row.name, value: row.score }))}
                                        type="bar"
                                        height={200}
                                    />
                                ) : (
                                    <div className="h-full flex items-center justify-center text-sm text-slate-500 border border-dashed border-slate-200 rounded-lg">
                                        Performance trend data is unavailable.
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                        <AttendanceTrends />
                    </div>
                </div>

                {/* Right Column: Actions & Alerts */}
                <div className="space-y-6">
                    {/* Quick Actions */}
                    <Card className="border-none bg-indigo-50/50 shadow-none">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold uppercase tracking-wider text-indigo-900">Quick Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <StartInstantLiveClassDialog trigger={
                                <Button className="w-full justify-start text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-100 shadow-sm h-12 text-base">
                                    <Video className="mr-3 h-5 w-5 text-indigo-500" /> Start Live Class
                                </Button>
                            } />
                            <Link href="/teacher/attendance" className="block">
                                <Button className="w-full justify-start text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-100 shadow-sm h-12 text-base">
                                    <CheckCircle className="mr-3 h-5 w-5 text-indigo-500" /> Take Attendance
                                </Button>
                            </Link>
                            <CreateLessonDialog trigger={
                                <Button className="w-full justify-start text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-100 shadow-sm h-12 text-base">
                                    <ClipboardList className="mr-3 h-5 w-5 text-indigo-500" /> Create Lesson
                                </Button>
                            } />
                            <Link href="/teacher/grading" className="block">
                                <Button className="w-full justify-start text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-100 shadow-sm h-12 text-base">
                                    <FileText className="mr-3 h-5 w-5 text-indigo-500" /> Grade Assignments
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>

                    {/* Priority Alerts */}
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-amber-500" /> Needs Attention
                            </CardTitle>
                            <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-100">{alerts.length}</Badge>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-slate-50">
                                {alerts.map(alert => (
                                    <div key={alert.id} className="p-4 hover:bg-slate-50 transition-colors">
                                        <h4 className="text-sm font-semibold text-slate-900">{alert.title}</h4>
                                        <p className="text-xs text-slate-500 mt-1 mb-2 leading-relaxed">{alert.desc}</p>
                                        <Link href={alert.link || '#'}>
                                            <Button variant="link" size="sm" className="h-auto p-0 text-indigo-600 text-xs">
                                                {alert.action} <ChevronRight className="h-3 w-3 ml-1" />
                                            </Button>
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-rose-500" /> At Risk Students
                            </CardTitle>
                            <Badge variant="outline" className="bg-rose-50 text-rose-600 border-rose-100">
                                {atRiskStudents.length}
                            </Badge>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {atRiskStudents.length === 0 ? (
                                <p className="text-sm text-slate-500">No high-risk students detected in assigned classes.</p>
                            ) : (
                                <Stagger className="space-y-3">
                                    {atRiskStudents.map((row) => (
                                        <div key={row.student_id} className="rounded-lg border border-slate-200 p-3">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="font-semibold text-slate-900 text-sm truncate">
                                                    {row.student_name || row.student_id}
                                                </p>
                                                <Badge className={`bg-rose-100 text-rose-700 hover:bg-rose-100 ${Number(row.risk_score) >= 70 ? 'animate-pulse motion-reduce:animate-none' : ''}`}>
                                                    {row.risk_score}/100
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                                                {row.reasons?.[0] || 'Multiple risk indicators detected.'}
                                            </p>
                                            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                                                Action: {row.suggested_actions?.[0] || 'Schedule mentor follow-up.'}
                                            </p>
                                        </div>
                                    ))}
                                </Stagger>
                            )}
                            <Link href="/teacher/students" className="inline-block">
                                <Button variant="link" size="sm" className="h-auto p-0 text-indigo-600 text-xs">
                                    View Student Profiles <ChevronRight className="h-3 w-3 ml-1" />
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* AI Assistant Overlay */}
            <AITeachingAssistant />

            {/* Profile Edit Dialog */}
            <MyProfileDialog
                open={showProfileEdit}
                onOpenChange={setShowProfileEdit}
                user={user}
                onSuccess={() => { /* Handled by reload potentially */ }}
            />
        </div>
    );
}
