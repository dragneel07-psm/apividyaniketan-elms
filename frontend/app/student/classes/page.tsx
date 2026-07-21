// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Clock, User, Calendar, TrendingUp } from 'lucide-react';
import { academicAPI, helpers, Subject, Teacher, AcademicClass, Timetable } from '@/lib/api';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/localization';
import { formatNumber } from '@/lib/i18n/format';

type CourseWithMeta = Subject & { teacher_details?: Teacher; academic_class_details?: AcademicClass };

function toList<T>(payload: unknown): T[] {
    if (Array.isArray(payload)) return payload as T[];
    if (
        payload &&
        typeof payload === 'object' &&
        Array.isArray((payload as { results?: unknown[] }).results)
    ) {
        return (payload as { results: T[] }).results;
    }
    return [];
}

function formatSchedule(entries: Timetable[], noScheduleLabel: string): string {
    if (entries.length === 0) return noScheduleLabel;
    const sorted = [...entries].sort((a, b) => `${a.day_of_week}${a.start_time}`.localeCompare(`${b.day_of_week}${b.start_time}`));
    const first = sorted[0];
    const start = new Date(`1970-01-01T${first.start_time}`);
    const end = new Date(`1970-01-01T${first.end_time}`);
    return `${first.day_of_week} • ${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

export default function MyClassesPage() {
    const router = useRouter();
    const { t, locale } = useTranslation();
    const [courses, setCourses] = useState<CourseWithMeta[]>([]);
    const [courseProgress, setCourseProgress] = useState<Record<number, number>>({});
    const [courseSchedule, setCourseSchedule] = useState<Record<number, string>>({});
    const [activeThisWeek, setActiveThisWeek] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadCourses();
    }, []);

    const loadCourses = async () => {
        try {
            setLoading(true);
            const studentCourses = await helpers.getStudentSubjects();

            const [teachersRaw, classesRaw, timetableRaw] = await Promise.all([
                academicAPI.getTeachers().catch(() => []),
                academicAPI.getClasses().catch(() => []),
                academicAPI.getMyTimetable().catch(() => []),
            ]);

            const teachers = toList<Teacher>(teachersRaw);
            const classes = toList<AcademicClass>(classesRaw);
            const timetable = toList<Timetable>(timetableRaw);

            const enrichedCourses = studentCourses.map((course) => ({
                ...course,
                teacher_details: teachers.find((teacher) => teacher.assigned_classes?.includes(course.academic_class)),
                academic_class_details: classes.find((cls) => cls.id === course.academic_class),
            }));

            const progressPairs = await Promise.all(
                enrichedCourses.map(async (course) => {
                    try {
                        const lessons = await academicAPI.getLessons(undefined, course.id);
                        const totalLessons = lessons.length;
                        const totalProgress = lessons.reduce((sum, lesson) => {
                            if (lesson.completed === true || lesson.user_progress?.completed === true) return sum + 100;
                            const partial = Number(lesson.progress_percent ?? lesson.user_progress?.progress_percent ?? 0);
                            return sum + Math.max(0, Math.min(100, partial));
                        }, 0);
                        const computedProgress = totalLessons > 0
                            ? Math.round(totalProgress / totalLessons)
                            : Number(course.progress_percentage || 0);
                        return [course.id, computedProgress] as const;
                    } catch {
                        return [course.id, Number(course.progress_percentage || 0)] as const;
                    }
                })
            );

            const progressMap = Object.fromEntries(progressPairs);
            const scheduleMap: Record<number, string> = {};
            enrichedCourses.forEach((course) => {
                const courseEntries = timetable.filter((entry) => {
                    const sameSubject = String(entry.subject_name || '').toLowerCase() === String(course.name || '').toLowerCase();
                    const sameClass = String(entry.academic_class || '').toLowerCase().includes(String(course.academic_class_details?.name || '').toLowerCase());
                    return sameSubject || sameClass;
                });
                scheduleMap[course.id] = formatSchedule(courseEntries, t('student.classes.labelNoSchedule'));
            });

            const weekdaySet = new Set(timetable.map((entry) => String(entry.day_of_week).toLowerCase()));
            setActiveThisWeek(weekdaySet.size > 0 ? enrichedCourses.length : 0);
            setCourseSchedule(scheduleMap);
            setCourseProgress(progressMap);
            setCourses(enrichedCourses);
        } catch (error) {
            console.error('Error loading courses:', error);
            toast.error(t('student.classes.errorLoad'));
        } finally {
            setLoading(false);
        }
    };

    const averageProgress = useMemo(() => {
        if (courses.length === 0) return 0;
        const total = courses.reduce((acc, course) => acc + (courseProgress[course.id] ?? Number(course.progress_percentage || 0)), 0);
        return Math.round(total / courses.length);
    }, [courses, courseProgress]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-800 mb-2">{t('student.classes.pageTitle')}</h1>
                <p className="text-slate-600">{t('student.classes.subtitle')}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-blue-600 font-medium">{t('student.classes.statTotalCourses')}</p>
                            <p className="text-3xl font-bold text-blue-900 mt-1">{formatNumber(courses.length, locale)}</p>
                        </div>
                        <BookOpen className="h-10 w-10 text-blue-600" />
                    </div>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-green-600 font-medium">{t('student.classes.statAvgProgress')}</p>
                            <p className="text-3xl font-bold text-green-900 mt-1">{formatNumber(averageProgress, locale)}%</p>
                        </div>
                        <TrendingUp className="h-10 w-10 text-green-600" />
                    </div>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-purple-600 font-medium">{t('student.classes.statActiveThisWeek')}</p>
                            <p className="text-3xl font-bold text-purple-900 mt-1">{formatNumber(activeThisWeek, locale)}</p>
                        </div>
                        <Calendar className="h-10 w-10 text-purple-600" />
                    </div>
                </Card>
            </div>

            {courses.length === 0 ? (
                <Card className="p-12 text-center border-dashed">
                    <BookOpen className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-slate-600 mb-2">{t('student.classes.noClassesTitle')}</h3>
                    <p className="text-slate-500">{t('student.classes.noClassesHint')}</p>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {courses.map((course) => {
                        const progress = courseProgress[course.id] ?? Number(course.progress_percentage || 0);
                        return (
                            <Card key={course.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white">
                                    <div className="flex items-start justify-between mb-3">
                                        <BookOpen className="h-8 w-8 opacity-80" />
                                        <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">{t('student.classes.badgeActive')}</Badge>
                                    </div>
                                    <h3 className="text-xl font-bold mb-1 line-clamp-1">{course.name}</h3>
                                    <p className="text-indigo-100 text-sm">Grade {course.academic_class_details?.name || 'N/A'}</p>
                                </div>

                                <div className="p-6">
                                    <div className="flex items-center gap-3 mb-4 text-slate-600">
                                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                                            <User className="h-4 w-4 text-slate-500" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-400">{t('student.classes.labelInstructor')}</p>
                                            <span className="text-sm font-medium text-slate-700">
                                                {course.teacher_details
                                                    ? `${course.teacher_details.first_name} ${course.teacher_details.last_name}`
                                                    : t('student.classes.labelAssignedTeacher')}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <div className="flex justify-between text-xs mb-2">
                                            <span className="text-slate-500 font-medium">{t('student.classes.labelCourseProgress')}</span>
                                            <span className="font-bold text-indigo-600">{formatNumber(progress, locale)}%</span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-2">
                                            <div
                                                className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full transition-all"
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 text-slate-500 text-xs mb-6 bg-slate-50 p-2 rounded">
                                        <Clock className="h-3 w-3" />
                                        <span>{courseSchedule[course.id] || t('student.classes.labelScheduleUnavailable')}</span>
                                    </div>

                                    <div className="flex gap-2">
                                        <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700 h-9 text-sm" onClick={() => router.push(`/student/courses/${course.id}/lessons`)}>
                                            {t('student.classes.btnViewMaterials')}
                                        </Button>
                                        <Button variant="outline" className="flex-1 border-indigo-200 text-indigo-700 hover:bg-indigo-50 h-9 text-sm" onClick={() => router.push('/student/assignments')}>
                                            {t('student.classes.btnAssignments')}
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
