// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
    BookOpen, Trophy, BrainCircuit, Calendar, GraduationCap,
    AlertCircle, TrendingUp, TrendingDown, ChevronRight, PlayCircle,
    Sparkles, Lightbulb, Megaphone, Clock, CheckCircle2,
    ArrowRight, Zap, Target, Star, Bell
} from 'lucide-react';
import { academicAPI, aiAPI, usersAPI, helpers, Subject, Timetable, Attendance } from '@/lib/api';
import { AITutorChat } from '@/components/ai-tutor-chat';
import { GamificationWidget } from '@/components/student/GamificationWidget';
import { SmartPathWidget } from '@/components/student/SmartPathWidget';
import { UpcomingExamsWidget } from '@/components/student/UpcomingExamsWidget';
import { useTranslation } from '@/lib/localization';
import { formatNumber, formatDate } from '@/lib/i18n/format';
import { MotionCard } from '@/components/interactive/motion-card';
import { AnimatedCounter } from '@/components/interactive/animated-counter';
import { ProgressRing } from '@/components/interactive/progress-ring';
import { Stagger } from '@/components/interactive/stagger';
import { Sparkline } from '@/components/interactive/sparkline';

type TimetableSlot = {
    time: string;
    subject: string;
    type: string;
    status: 'completed' | 'ongoing' | 'upcoming';
};

const COURSE_COLORS = [
    { bg: 'from-indigo-500 to-indigo-600', light: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-100' },
    { bg: 'from-violet-500 to-purple-600', light: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-100' },
    { bg: 'from-emerald-500 to-teal-600', light: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
    { bg: 'from-rose-500 to-pink-600', light: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100' },
    { bg: 'from-amber-500 to-orange-500', light: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100' },
    { bg: 'from-sky-500 to-blue-600', light: 'bg-sky-50', text: 'text-sky-600', border: 'border-sky-100' },
];

export default function StudentDashboard() {
    const router = useRouter();
    const { t, locale } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [studentId, setStudentId] = useState<string>('');
    const [courses, setCourses] = useState<Subject[]>([]);
    const [showAITutor, setShowAITutor] = useState(false);
    const [recommendations, setRecommendations] = useState<any>(null);
    const [user, setUser] = useState<any>(null);
    const [upcomingExamsCount, setUpcomingExamsCount] = useState(0);
    const [pendingAssignmentsCount, setPendingAssignmentsCount] = useState(0);
    const [notices, setNotices] = useState<any[]>([]);
    const [allAssessmentsState, setAllAssessmentsState] = useState<any[]>([]);
    const [attendanceRate, setAttendanceRate] = useState(0);
    const [attendanceTrend, setAttendanceTrend] = useState(0);
    const [todayTimetable, setTodayTimetable] = useState<TimetableSlot[]>([]);
    const [gradeTrend, setGradeTrend] = useState<{ date: string; value: number }[]>([]);

    useEffect(() => { loadData(); }, []);

    const getWeekdayName = () => new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const toMinutes = (time: string) => { const [h, m] = time.split(':').map(Number); return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : 0; };
    const formatClock = (time: string) => {
        const [h, m] = time.split(':').map(Number);
        if (!Number.isFinite(h) || !Number.isFinite(m)) return time;
        return new Date(0, 0, 0, h, m).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const buildTodayTimetable = (entries: Timetable[]): TimetableSlot[] => {
        const now = new Date();
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        const weekday = getWeekdayName();
        return entries
            .filter((e) => String(e.day_of_week || '').toLowerCase() === weekday)
            .sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time))
            .map((e) => {
                const start = toMinutes(e.start_time), end = toMinutes(e.end_time);
                const status: TimetableSlot['status'] = nowMinutes > end ? 'completed' : nowMinutes >= start ? 'ongoing' : 'upcoming';
                return { time: `${formatClock(e.start_time)} – ${formatClock(e.end_time)}`, subject: e.subject_name || 'Subject', type: String(e.room_number || e.academic_class || 'Class'), status };
            });
    };

    const computeAttendance = (records: Attendance[]) => {
        if (!records.length) return { rate: 0, trend: 0 };
        const presentLike = records.filter((r) => r.status === 'present' || r.status === 'late').length;
        const rate = Math.round((presentLike / records.length) * 100);
        const now = new Date(); const cm = now.getMonth(); const cy = now.getFullYear();
        const prev = new Date(cy, cm - 1, 1);
        const curr = records.filter((r) => { const d = new Date(r.date); return d.getFullYear() === cy && d.getMonth() === cm; });
        const prevR = records.filter((r) => { const d = new Date(r.date); return d.getFullYear() === prev.getFullYear() && d.getMonth() === prev.getMonth(); });
        const cRate = curr.length ? (curr.filter((r) => r.status === 'present' || r.status === 'late').length / curr.length) * 100 : rate;
        const pRate = prevR.length ? (prevR.filter((r) => r.status === 'present' || r.status === 'late').length / prevR.length) * 100 : cRate;
        return { rate, trend: Math.round(cRate - pRate) };
    };

    const loadData = async () => {
        try {
            setError(null); setLoading(true);
            const [student, currentUser] = await Promise.all([academicAPI.getMyStudent(), usersAPI.getMe().catch(() => null)]);
            setStudentId(student.id); setUser(currentUser);
            const subjects = await helpers.getStudentSubjects(student.id);
            setCourses(Array.isArray(subjects) ? subjects : []);
            const [allAssessments, mySubmissions, myAttendance, myTimetable] = await Promise.all([
                academicAPI.getAssessments(),
                academicAPI.getSubmissions(),
                academicAPI.getMyAttendance().catch(() => []),
                academicAPI.getMyTimetable().catch(() => []),
            ]);
            const safeAssessments = Array.isArray(allAssessments) ? allAssessments : [];
            const safeSubmissions = Array.isArray(mySubmissions) ? mySubmissions : [];
            setAllAssessmentsState(safeAssessments);
            const now = new Date();
            setUpcomingExamsCount(safeAssessments.filter((a) => (a.type === 'exam' || a.type === 'quiz') && a.due_date && new Date(a.due_date) > now).length);
            const submittedIds = new Set(safeSubmissions.filter((s) => s.status !== 'draft').map((s) => s.assessment));
            setPendingAssignmentsCount(safeAssessments.filter((a) => !submittedIds.has(a.assessment_id)).length);
            const assessTotals = new Map(safeAssessments.map((a) => [String(a.assessment_id), Number(a.total_marks)]));
            const gradedPoints = safeSubmissions
                .filter((s) => s.result && Number.isFinite(Number(s.result.score)) && s.submitted_at)
                .map((s) => {
                    const total = assessTotals.get(String(s.assessment)) || 0;
                    if (total <= 0) return null;
                    const pct = Math.min(100, Math.max(0, (Number(s.result!.score) / total) * 100));
                    return { date: s.submitted_at, value: Math.round(pct) };
                })
                .filter((point): point is { date: string; value: number } => point !== null)
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .slice(-8);
            setGradeTrend(gradedPoints);
            const att = computeAttendance(Array.isArray(myAttendance) ? myAttendance : []);
            setAttendanceRate(att.rate); setAttendanceTrend(att.trend);
            setTodayTimetable(buildTodayTimetable(Array.isArray(myTimetable) ? myTimetable : []));
            try { const recs = await aiAPI.getRecommendations(); setRecommendations(recs); } catch { /* optional */ }
            try { const nd = await academicAPI.getNotices(); setNotices((Array.isArray(nd) ? nd : []).slice(0, 3)); } catch { /* optional */ }
        } catch (e: any) {
            if (e.status === 404 || e.message?.includes('404') || e.message?.includes('No Student')) {
                setError(t('student.dashboard.errorProfileNotFound'));
            } else { setError(t('student.dashboard.errorLoadFailed')); }
        } finally { setLoading(false); }
    };

    if (loading) return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
            <div className="relative">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200 animate-pulse">
                    <GraduationCap className="h-8 w-8 text-white" />
                </div>
            </div>
            <p className="text-slate-500 font-medium animate-pulse">{t('student.dashboard.loadingDashboard')}</p>
        </div>
    );

    if (error) return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
            <div className="h-16 w-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 border border-red-100">
                <AlertCircle className="h-8 w-8" />
            </div>
            <div className="text-center">
                <h3 className="text-xl font-bold text-slate-900">{t('student.dashboard.errorTitle')}</h3>
                <p className="text-slate-500 mt-1 max-w-sm">{error}</p>
            </div>
            <Button onClick={() => window.location.href = '/login'} variant="outline" className="rounded-xl">{t('student.dashboard.backToLogin')}</Button>
        </div>
    );

    const recommendationItems = Array.isArray(recommendations?.recommendations) ? recommendations.recommendations : [];
    const completedCourses = courses.filter((c) => (c.progress_percentage ?? 0) >= 100).length;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            {/* ── Hero Welcome Banner ─────────────────────────────────── */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 px-6 py-5 md:px-8 md:py-6 text-white shadow-xl shadow-indigo-200/50">
                <div className="pointer-events-none absolute -top-10 -right-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-8 left-1/3 h-32 w-32 rounded-full bg-purple-400/20 blur-2xl" />

                <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <Badge className="bg-white/20 text-white border-0 text-[10px] font-bold uppercase tracking-widest backdrop-blur-sm mb-2">
                            <Star className="h-2.5 w-2.5 mr-1" /> {t('student.dashboard.badge')}
                        </Badge>
                        <h1 className="text-2xl md:text-3xl font-black leading-tight">
                            {user?.first_name
                                ? t('student.dashboard.greetingNamed', { name: user.first_name })
                                : t('student.dashboard.greetingGeneric')}
                        </h1>
                        <p className="text-indigo-200 mt-0.5 text-sm">
                            {formatDate(new Date(), locale)}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 mt-3">
                            <div className="flex items-center gap-1.5 text-xs text-indigo-100 bg-white/10 rounded-lg px-2.5 py-1">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
                                <span>{t('student.dashboard.statCoursesProgress', { completed: formatNumber(completedCourses, locale), total: formatNumber(courses.length, locale) })}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-indigo-100 bg-white/10 rounded-lg px-2.5 py-1">
                                <Target className="h-3.5 w-3.5 text-amber-300" />
                                <span>{t('student.dashboard.statAttendance', { rate: formatNumber(attendanceRate, locale) })}</span>
                            </div>
                            {pendingAssignmentsCount > 0 && (
                                <div className="flex items-center gap-1.5 text-xs text-indigo-100 bg-white/10 rounded-lg px-2.5 py-1">
                                    <Bell className="h-3.5 w-3.5 text-rose-300" />
                                    <span>{t('student.dashboard.statPending', { count: formatNumber(pendingAssignmentsCount, locale) })}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    {user?.tenant_features?.student_ai_chatbot !== false && (
                        <Button
                            onClick={() => setShowAITutor(true)}
                            className="shrink-0 bg-white text-indigo-700 hover:bg-indigo-50 font-bold shadow-lg px-5 rounded-xl gap-2 text-sm"
                        >
                            <BrainCircuit className="h-4 w-4" /> {t('student.dashboard.askAiTutor')}
                        </Button>
                    )}
                </div>
            </div>

            {/* ── Stats Row ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Attendance */}
                <MotionCard
                    index={0}
                    className="border-0 shadow-lg cursor-pointer overflow-hidden rounded-2xl"
                    onClick={() => router.push('/student/attendance')}
                >
                    <CardContent className="p-5 bg-gradient-to-br from-emerald-500 to-teal-600">
                        <div className="flex items-start justify-between mb-4">
                            <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                <Calendar className="h-5 w-5 text-white" />
                            </div>
                            <span className="text-xs font-bold flex items-center gap-0.5 text-white/80">
                                {attendanceTrend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                {attendanceTrend >= 0 ? '+' : ''}{attendanceTrend}%
                            </span>
                        </div>
                        <div className="flex items-end justify-between">
                            <div>
                                <p className="text-3xl font-black text-white">
                                    <AnimatedCounter value={attendanceRate} locale={locale} suffix="%" />
                                </p>
                                <p className="text-xs font-medium text-white/70 mt-1">{t('student.dashboard.attendanceRate')}</p>
                            </div>
                            <ProgressRing value={attendanceRate} size={44} strokeWidth={5} ringClassName="text-white" />
                        </div>
                    </CardContent>
                </MotionCard>

                {/* Pending Assignments */}
                <MotionCard
                    index={1}
                    className="border-0 shadow-lg cursor-pointer overflow-hidden rounded-2xl"
                    onClick={() => router.push('/student/assignments')}
                >
                    <CardContent className="p-5 bg-gradient-to-br from-orange-500 to-amber-500">
                        <div className="flex items-start justify-between mb-4">
                            <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                <BookOpen className="h-5 w-5 text-white" />
                            </div>
                            {pendingAssignmentsCount > 0 && (
                                <span className="h-6 min-w-6 px-1.5 rounded-full bg-white text-orange-600 text-[10px] font-black flex items-center justify-center animate-pulse">
                                    {pendingAssignmentsCount > 9 ? '9+' : pendingAssignmentsCount}
                                </span>
                            )}
                        </div>
                        <p className="text-3xl font-black text-white">
                            <AnimatedCounter value={pendingAssignmentsCount} locale={locale} />
                        </p>
                        <p className="text-xs font-medium text-white/70 mt-1">{t('student.dashboard.pendingTasks')}</p>
                        <p className="text-[10px] text-white/80 font-bold mt-3 uppercase tracking-wider">
                            {pendingAssignmentsCount === 0 ? t('student.dashboard.allDone') : t('student.dashboard.actionNeeded')}
                        </p>
                    </CardContent>
                </MotionCard>

                {/* Upcoming Exams */}
                <MotionCard
                    index={2}
                    className="border-0 shadow-lg cursor-pointer overflow-hidden rounded-2xl"
                    onClick={() => router.push('/student/assessments')}
                >
                    <CardContent className="p-5 bg-gradient-to-br from-blue-500 to-indigo-600">
                        <div className="flex items-start justify-between mb-4">
                            <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                <Trophy className="h-5 w-5 text-white" />
                            </div>
                            {upcomingExamsCount > 0 && (
                                <span className="h-6 min-w-6 px-1.5 rounded-full bg-white/30 text-white text-[10px] font-black flex items-center justify-center">
                                    {upcomingExamsCount}
                                </span>
                            )}
                        </div>
                        <p className="text-3xl font-black text-white">
                            <AnimatedCounter value={upcomingExamsCount} locale={locale} />
                        </p>
                        <p className="text-xs font-medium text-white/70 mt-1">{t('student.dashboard.upcomingExams')}</p>
                        <p className="text-[10px] text-white/80 font-bold mt-3 uppercase tracking-wider">{t('student.dashboard.quizzesAndTests')}</p>
                        {gradeTrend.length > 1 && (
                            <Sparkline
                                data={gradeTrend.map((g) => ({ label: formatDate(new Date(g.date), locale), value: g.value }))}
                                height={28}
                                color="#ffffff"
                                className="mt-2"
                                valueFormatter={(v) => `${formatNumber(v, locale)}%`}
                            />
                        )}
                    </CardContent>
                </MotionCard>

                {/* My Courses */}
                <MotionCard
                    index={3}
                    className="border-0 shadow-lg cursor-pointer overflow-hidden rounded-2xl"
                    onClick={() => router.push('/student/courses')}
                >
                    <CardContent className="p-5 bg-gradient-to-br from-violet-500 to-purple-600">
                        <div className="flex items-start justify-between mb-4">
                            <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                <Zap className="h-5 w-5 text-white" />
                            </div>
                            <span className="text-xs font-bold text-white/70">{t('student.dashboard.doneCount', { count: formatNumber(completedCourses, locale) })}</span>
                        </div>
                        <p className="text-3xl font-black text-white">
                            <AnimatedCounter value={courses.length} locale={locale} />
                        </p>
                        <p className="text-xs font-medium text-white/70 mt-1">{t('student.dashboard.enrolledCourses')}</p>
                        <p className="text-[10px] text-white/80 font-bold mt-3 uppercase tracking-wider">{t('student.dashboard.completedCount', { count: formatNumber(completedCourses, locale) })}</p>
                    </CardContent>
                </MotionCard>
            </div>

            {/* ── Smart Path Banner ─────────────────────────────────────── */}
            {user?.tenant_features?.student_ai_chatbot !== false && recommendationItems.length > 0 && (
                <SmartPathWidget recommendation={recommendationItems[0]} />
            )}

            {/* ── Main Two-Column Grid ───────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* LEFT: 2/3 */}
                <div className="lg:col-span-2 space-y-6">

                    {/* My Courses */}
                    <Card className="border-0 shadow-md overflow-hidden rounded-2xl bg-white">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 px-6 pt-5 border-b border-slate-50">
                            <div>
                                <CardTitle className="text-base font-bold text-slate-900">{t('student.dashboard.myCourses')}</CardTitle>
                                <p className="text-xs text-slate-400 mt-0.5">{t('student.dashboard.subjectsEnrolled', { count: formatNumber(courses.length, locale) })}</p>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-indigo-600 hover:bg-indigo-50 rounded-lg gap-1 text-xs font-bold"
                                onClick={() => router.push('/student/courses')}
                            >
                                {t('student.dashboard.seeAll')} <ArrowRight className="h-3.5 w-3.5" />
                            </Button>
                        </CardHeader>
                        <CardContent className="px-6 pb-6">
                            <Stagger className="space-y-3">
                            {courses.slice(0, 4).map((course, idx) => {
                                const color = COURSE_COLORS[idx % COURSE_COLORS.length];
                                const progress = course.progress_percentage ?? 0;
                                return (
                                    <div
                                        key={course.id}
                                        className={`group flex items-center gap-4 p-4 rounded-xl border ${color.border} hover:shadow-md transition-all cursor-pointer bg-white`}
                                        onClick={() => router.push(`/student/courses/${course.id}/lessons`)}
                                    >
                                        <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${color.bg} flex items-center justify-center shrink-0 shadow-sm`}>
                                            <BookOpen className="h-5 w-5 text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1.5">
                                                <h4 className="font-bold text-slate-900 text-sm truncate">{course.name}</h4>
                                                <span className={`text-xs font-black ${color.text} shrink-0 ml-2`}>{Math.round(progress)}%</span>
                                            </div>
                                            <Progress value={progress} className="h-1.5 bg-slate-100" />
                                            <p className="text-[10px] text-slate-400 mt-1.5 font-medium">
                                                {formatNumber(course.completed_lessons ?? 0, locale)}/{formatNumber(course.total_lessons ?? 0, locale)} lessons
                                                {course.teacher_name && ` · ${course.teacher_name}`}
                                            </p>
                                        </div>
                                        <ChevronRight className={`h-4 w-4 ${color.text} opacity-0 group-hover:opacity-100 transition-opacity shrink-0`} />
                                    </div>
                                );
                            })}
                            </Stagger>
                            {courses.length === 0 && (
                                <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-xl">
                                    <BookOpen className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                                    <p className="text-slate-400 font-medium text-sm">{t('student.dashboard.noCoursesAssigned')}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Today's Schedule */}
                    <Card className="border-0 shadow-md overflow-hidden rounded-2xl bg-white">
                        <CardHeader className="px-6 pt-5 pb-2 border-b border-slate-50 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-base font-bold text-slate-900">{t('student.dashboard.todaysSchedule')}</CardTitle>
                                <p className="text-xs text-slate-400 mt-0.5">{formatDate(new Date(), locale)}</p>
                            </div>
                            <Button variant="ghost" size="sm" className="text-indigo-600 hover:bg-indigo-50 rounded-lg gap-1 text-xs font-bold" onClick={() => router.push('/student/timetable')}>
                                {t('student.dashboard.fullSchedule')} <ArrowRight className="h-3.5 w-3.5" />
                            </Button>
                        </CardHeader>
                        <CardContent className="px-6 pb-6">
                            {todayTimetable.length === 0 ? (
                                <div className="py-10 text-center border-2 border-dashed border-slate-200 rounded-xl">
                                    <Clock className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                                    <p className="text-slate-400 text-sm">{t('student.dashboard.noClassesToday')}</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {todayTimetable.map((slot, idx) => (
                                        <div key={idx} className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                                            slot.status === 'ongoing' ? 'bg-indigo-50 border-indigo-200 shadow-sm' :
                                            slot.status === 'completed' ? 'bg-slate-50 border-slate-100 opacity-60' :
                                            'bg-white border-slate-100 hover:border-indigo-100 hover:shadow-sm'
                                        }`}>
                                            <div className={`relative h-10 w-10 rounded-xl flex items-center justify-center shrink-0 font-black text-sm ${
                                                slot.status === 'ongoing' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' :
                                                slot.status === 'completed' ? 'bg-slate-200 text-slate-500' :
                                                'bg-slate-100 text-slate-600'
                                            }`}>
                                                {slot.status === 'ongoing' && (
                                                    <span className="absolute inline-flex h-full w-full rounded-xl bg-indigo-400 opacity-40 animate-ping motion-reduce:animate-none" />
                                                )}
                                                <span className="relative">{idx + 1}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-bold text-slate-900 text-sm truncate">{slot.subject}</h4>
                                                    {slot.status === 'ongoing' && (
                                                        <Badge className="bg-indigo-600 text-white text-[9px] font-bold px-1.5 py-0 animate-pulse">LIVE</Badge>
                                                    )}
                                                    {slot.status === 'completed' && (
                                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-400 mt-0.5">{slot.time} · {slot.type}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* RIGHT: 1/3 */}
                <div className="space-y-6">

                    {/* Upcoming Exams */}
                    <UpcomingExamsWidget assessments={allAssessmentsState} />

                    {/* Gamification */}
                    {user?.tenant_features?.student_gamification !== false && (
                        <GamificationWidget />
                    )}

                    {/* AI Recommendations */}
                    {user?.tenant_features?.student_ai_chatbot !== false && recommendationItems.length > 0 && (
                        <Card className="border-0 shadow-md overflow-hidden rounded-2xl bg-white">
                            <CardHeader className="pb-3 px-5 pt-5 border-b border-slate-50">
                                <div className="flex items-center gap-2">
                                    <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                                        <Sparkles className="h-4 w-4 text-indigo-600" />
                                    </div>
                                    <CardTitle className="text-base font-bold text-slate-900">{t('student.dashboard.aiStudyPicks')}</CardTitle>
                                </div>
                                {recommendations?.learning_style_advice && (
                                    <div className="mt-3 p-3 bg-indigo-50 rounded-xl border border-indigo-100 flex gap-2">
                                        <Lightbulb className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
                                        <p className="text-xs text-indigo-700 leading-relaxed italic">
                                            &ldquo;{recommendations.learning_style_advice}&rdquo;
                                        </p>
                                    </div>
                                )}
                            </CardHeader>
                            <CardContent className="px-5 pb-5 space-y-2">
                                {recommendationItems.slice(0, 3).map((rec: any) => (
                                    <div
                                        key={rec.id}
                                        className="group p-3 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all cursor-pointer"
                                        onClick={() => router.push(`/student/courses/${rec.subject_id}/lessons`)}
                                    >
                                        <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-1">{rec.subject}</p>
                                        <h4 className="text-sm font-bold text-slate-800 group-hover:text-indigo-700 line-clamp-1 transition-colors">{rec.title}</h4>
                                        <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{rec.reason}</p>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    {/* AI Tutor CTA */}
                    {user?.tenant_features?.student_ai_chatbot !== false && (
                        <div
                            className="relative overflow-hidden rounded-2xl p-5 text-white cursor-pointer group shadow-xl"
                            style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #9333ea 100%)' }}
                            onClick={() => setShowAITutor(true)}
                        >
                            <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/10 blur-2xl group-hover:scale-125 transition-transform duration-500" />
                            <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-purple-400/20 blur-xl" />
                            <div className="relative flex flex-col items-center text-center gap-3">
                                <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner">
                                    <BrainCircuit className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-base">{t('student.dashboard.needHelp')}</h3>
                                    <p className="text-indigo-200 text-xs mt-1">{t('student.dashboard.aiTutorTagline')}</p>
                                </div>
                                <Button className="w-full bg-white text-indigo-700 hover:bg-white/95 font-bold rounded-xl gap-2 shadow-md">
                                    <PlayCircle className="h-4 w-4" /> {t('student.dashboard.startChat')}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Notice Board */}
                    <Card className="border-0 shadow-md overflow-hidden rounded-2xl bg-white">
                        <CardHeader className="px-5 pt-5 pb-3 border-b border-slate-50 flex flex-row items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center">
                                    <Megaphone className="h-4 w-4 text-amber-600" />
                                </div>
                                <CardTitle className="text-base font-bold text-slate-900">{t('student.dashboard.noticeBoard')}</CardTitle>
                            </div>
                            <Button variant="ghost" size="sm" className="text-xs text-slate-400 hover:text-indigo-600 h-auto py-1 px-2" onClick={() => router.push('/student/notices')}>
                                {t('student.dashboard.allNotices')} <ArrowRight className="h-3 w-3 ml-1" />
                            </Button>
                        </CardHeader>
                        <CardContent className="px-5 pb-5 space-y-3">
                            {notices.length > 0 ? notices.map((notice, idx) => {
                                const isNew = notice.published_date && (new Date().getTime() - new Date(notice.published_date).getTime()) < 3 * 86400000;
                                return (
                                    <div key={idx} className={`p-3 rounded-xl border ${notice.priority === 'high' ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
                                        <div className="flex items-start justify-between gap-2 mb-1">
                                            <h4 className={`text-xs font-bold line-clamp-1 ${notice.priority === 'high' ? 'text-red-800' : 'text-slate-800'}`}>{notice.title}</h4>
                                            {isNew && <Badge className="bg-blue-500 text-white text-[9px] px-1.5 py-0 h-4 shrink-0">NEW</Badge>}
                                        </div>
                                        <p className="text-[10px] text-slate-500 line-clamp-2">{notice.content}</p>
                                    </div>
                                );
                            }) : (
                                <div className="py-6 text-center text-xs text-slate-400">{t('student.dashboard.noActiveNotices')}</div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {user?.tenant_features?.student_ai_chatbot !== false && (
                <AITutorChat open={showAITutor} onOpenChange={setShowAITutor} studentId={studentId} />
            )}
        </div>
    );
}
