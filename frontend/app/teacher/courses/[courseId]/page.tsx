// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    BookOpen, Users, FileText, BarChart3,
    Plus, ChevronRight, Clock,
    Calendar, TrendingUp
} from 'lucide-react';
import { academicAPI, Subject, Chapter, Assessment, Result, Submission, Student } from '@/lib/api';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

function toList<T>(payload: unknown): T[] {
    if (Array.isArray(payload)) return payload as T[];
    if (payload && typeof payload === 'object' && Array.isArray((payload as any).results)) {
        return (payload as any).results as T[];
    }
    return [];
}

export default function TeacherCourseDashboard() {
    const params = useParams();
    const courseId = params.courseId as string;

    const [subject, setSubject] = useState<Subject | null>(null);
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [loading, setLoading] = useState(true);
    const [recentProgress, setRecentProgress] = useState<Array<{ name: string; lesson: string; date: string }>>([]);
    const [insights, setInsights] = useState<Array<{ label: string; text: string; accent: string }>>([]);
    const [nextMilestone, setNextMilestone] = useState<{ title: string; date: string | null } | null>(null);
    const [stats, setStats] = useState({
        totalLessons: 0,
        publishedLessons: 0,
        totalStudents: 0,
        averageCompletion: 0,
    });

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [subjectData, chaptersRaw, studentsRaw, assessmentsRaw, resultsRaw, submissionsRaw] = await Promise.all([
                academicAPI.getSubject(parseInt(courseId)),
                academicAPI.getChapters(parseInt(courseId)),
                academicAPI.getStudents().catch(() => []),
                academicAPI.getAssessments().catch(() => []),
                academicAPI.getResults().catch(() => []),
                academicAPI.getSubmissions().catch(() => []),
            ]);

            const chaptersData = toList<Chapter>(chaptersRaw);
            const students = toList<Student>(studentsRaw);
            const assessments = toList<Assessment>(assessmentsRaw);
            const results = toList<Result>(resultsRaw);
            const submissions = toList<Submission>(submissionsRaw);

            setSubject(subjectData);
            setChapters(chaptersData);

            let total = 0;
            let published = 0;
            chaptersData.forEach((chapter) => {
                chapter.lessons?.forEach((lesson) => {
                    total += 1;
                    if (lesson.is_published) published += 1;
                });
            });

            const enrolledStudents = students.filter(
                (student) => Number(student.academic_class) === Number(subjectData.academic_class)
            );

            const subjectAssessments = assessments.filter(
                (assessment) => Number(assessment.subject) === Number(subjectData.id)
            );
            const assessmentMap = new Map(subjectAssessments.map((assessment) => [String(assessment.assessment_id), assessment]));

            const normalizedScores = results
                .filter((result) => assessmentMap.has(String(result.assessment)))
                .map((result) => {
                    const assessment = assessmentMap.get(String(result.assessment));
                    const totalMarks = Number(assessment?.total_marks || 0);
                    if (!totalMarks) return null;
                    return (Number(result.score || 0) / totalMarks) * 100;
                })
                .filter((score): score is number => typeof score === 'number' && Number.isFinite(score));

            const averageCompletion = normalizedScores.length > 0
                ? Math.round(normalizedScores.reduce((sum, score) => sum + score, 0) / normalizedScores.length)
                : 0;

            setStats({
                totalLessons: total,
                publishedLessons: published,
                totalStudents: enrolledStudents.length,
                averageCompletion,
            });

            const upcoming = subjectAssessments
                .filter((assessment) => assessment.due_date && new Date(assessment.due_date) > new Date())
                .sort((a, b) => new Date(a.due_date || '').getTime() - new Date(b.due_date || '').getTime())[0];

            setNextMilestone(upcoming
                ? { title: upcoming.title, date: upcoming.due_date || null }
                : null);

            const studentMap = new Map(enrolledStudents.map((student) => [String(student.id || student.student_id), student]));
            const subjectSubmissionFeed = submissions
                .filter((submission) => assessmentMap.has(String(submission.assessment)) && submission.status !== 'draft')
                .sort((a, b) => new Date(b.submitted_at || '').getTime() - new Date(a.submitted_at || '').getTime())
                .slice(0, 5)
                .map((submission) => {
                    const student = studentMap.get(String(submission.student));
                    const assessment = assessmentMap.get(String(submission.assessment));
                    return {
                        name: student ? `${student.first_name} ${student.last_name}`.trim() : 'Student',
                        lesson: assessment?.title || 'Assessment',
                        date: submission.submitted_at ? new Date(submission.submitted_at).toLocaleString() : 'Recently',
                    };
                });

            setRecentProgress(subjectSubmissionFeed);

            const nextInsights = [] as Array<{ label: string; text: string; accent: string }>;
            if (published < total) {
                nextInsights.push({
                    label: 'Curriculum Progress',
                    text: `${published}/${total} lessons are published. Publish remaining lessons to complete this course path.`,
                    accent: 'text-indigo-300',
                });
            }
            if (averageCompletion > 0 && averageCompletion < 70) {
                nextInsights.push({
                    label: 'Performance Signal',
                    text: `Average score is ${averageCompletion}%. Consider adding remediation content for weaker topics.`,
                    accent: 'text-amber-300',
                });
            }
            if (nextInsights.length === 0) {
                nextInsights.push({
                    label: 'Course Health',
                    text: 'Course performance and content coverage are stable for this term.',
                    accent: 'text-emerald-300',
                });
            }
            setInsights(nextInsights);
        } catch (error) {
            console.error('Failed to load course dashboard data:', error);
            toast.error('Failed to load course details');
        } finally {
            setLoading(false);
        }
    }, [courseId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border-none shadow-sm bg-indigo-50/50">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-indigo-600 font-bold uppercase text-[10px] tracking-widest">Content</CardDescription>
                        <CardTitle className="text-2xl font-black text-slate-900">{stats.totalLessons}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-slate-500">{stats.publishedLessons} Published Lessons</p>
                        <div className="mt-4 flex items-center justify-between">
                            <BookOpen className="h-8 w-8 text-indigo-200" />
                            <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-none">
                                {chapters.length} Chapters
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-emerald-50/50">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-emerald-600 font-bold uppercase text-[10px] tracking-widest">Enrollment</CardDescription>
                        <CardTitle className="text-2xl font-black text-slate-900">{stats.totalStudents}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-slate-500">Active Students</p>
                        <div className="mt-4 flex items-center justify-between">
                            <Users className="h-8 w-8 text-emerald-200" />
                            <div className="flex items-center text-emerald-600 text-xs font-bold">
                                <TrendingUp className="h-3 w-3 mr-1" /> Live
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-amber-50/50">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-amber-600 font-bold uppercase text-[10px] tracking-widest">Performance</CardDescription>
                        <CardTitle className="text-2xl font-black text-slate-900">{stats.averageCompletion}%</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-slate-500">Average Score Across Assessments</p>
                        <div className="mt-4 flex items-center justify-between">
                            <BarChart3 className="h-8 w-8 text-amber-200" />
                            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none">
                                {stats.averageCompletion >= 70 ? 'On Target' : 'Needs Support'}
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-purple-50/50">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-purple-600 font-bold uppercase text-[10px] tracking-widest">Next Milestone</CardDescription>
                        <CardTitle className="text-lg font-black text-slate-900 truncate">{nextMilestone?.title || 'No upcoming milestone'}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-slate-500">
                            {nextMilestone?.date ? `Due ${new Date(nextMilestone.date).toLocaleDateString()}` : 'Create a dated assessment to set milestone'}
                        </p>
                        <div className="mt-4 flex items-center justify-between">
                            <Calendar className="h-8 w-8 text-purple-200" />
                            <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-none">
                                {nextMilestone ? 'Upcoming' : 'Pending'}
                            </Badge>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <Card className="shadow-xl border-slate-100 overflow-hidden">
                        <CardHeader className="border-b bg-slate-50/50">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-xl font-bold">Curriculum Overview</CardTitle>
                                    <CardDescription>Structure of your course content</CardDescription>
                                </div>
                                <Link href={`/teacher/courses/${courseId}/lessons`}>
                                    <Button variant="ghost" size="sm" className="text-indigo-600 font-bold">
                                        Edit Full Curriculum <ChevronRight className="h-4 w-4 ml-1" />
                                    </Button>
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y">
                                {chapters.map((chapter, i) => (
                                    <div key={chapter.id} className="p-5 hover:bg-slate-50 transition-colors group">
                                        <div className="flex items-start justify-between">
                                            <div className="flex gap-4">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 font-black border border-indigo-100">
                                                    {i + 1}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-800">{chapter.title}</h4>
                                                    <p className="text-sm text-slate-500 line-clamp-1">{chapter.description || 'No description provided'}</p>
                                                    <div className="mt-2 flex items-center gap-3">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                                            <FileText className="h-3 w-3" /> {chapter.lessons?.length || 0} Lessons
                                                        </span>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                                            <Clock className="h-3 w-3" /> {chapter.lessons?.reduce((acc, lesson) => acc + (lesson.duration_minutes || 0), 0)} Mins Total
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <Badge variant="outline" className="border-slate-200 text-slate-400 group-hover:border-indigo-200 group-hover:text-indigo-600 transition-colors">
                                                {chapter.lessons?.filter((lesson) => lesson.is_published).length}/{chapter.lessons?.length} Published
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                                {chapters.length === 0 && (
                                    <div className="p-12 text-center text-slate-400 italic">
                                        No chapters created yet.
                                        <Link href={`/teacher/courses/${courseId}/lessons`} className="text-indigo-600 font-bold ml-1 hover:underline">
                                            Start designing your course.
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                        <CardFooter className="bg-slate-50 border-t p-4 flex justify-center">
                            <Link href={`/teacher/courses/${courseId}/lessons`}>
                                <Button className="w-48 bg-slate-900 hover:bg-slate-800 rounded-xl h-10">
                                    <Plus className="h-4 w-4 mr-2" /> Add New Chapter
                                </Button>
                            </Link>
                        </CardFooter>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="shadow-xl bg-slate-900 text-white p-6 rounded-3xl border-none">
                        <h3 className="text-xl font-bold mb-4">Quick Insights</h3>
                        <div className="space-y-4">
                            {insights.map((insight, idx) => (
                                <div key={idx} className="p-4 bg-white/10 rounded-2xl border border-white/10 hover:bg-white/15 transition-colors cursor-pointer">
                                    <p className={`${insight.accent} text-[10px] font-black uppercase tracking-widest mb-1`}>{insight.label}</p>
                                    <p className="text-sm leading-relaxed">{insight.text}</p>
                                </div>
                            ))}
                        </div>
                        <Link href="/teacher/analytics">
                            <Button className="w-full mt-6 bg-white text-slate-900 hover:bg-indigo-50 font-black rounded-2xl h-12">
                                View AI Analytics
                            </Button>
                        </Link>
                    </Card>

                    <Card className="shadow-lg border-slate-100">
                        <CardHeader>
                            <CardTitle className="text-lg">Recent Progress</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {recentProgress.length === 0 && (
                                <p className="text-sm text-slate-500">No recent submissions for this course.</p>
                            )}
                            {recentProgress.map((activity, i) => (
                                <div key={`${activity.name}-${i}`} className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600">
                                        {activity.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-800 truncate">{activity.name}</p>
                                        <p className="text-[10px] text-slate-400">Submitted: {activity.lesson}</p>
                                    </div>
                                    <span className="text-[10px] text-slate-300 whitespace-nowrap">{activity.date}</span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

const CardFooter = ({ children, className = '', ...props }: any) => (
    <div className={`p-6 pt-0 ${className}`} {...props}>
        {children}
    </div>
);
