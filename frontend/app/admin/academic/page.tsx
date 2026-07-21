// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    BookOpen, GraduationCap, ArrowLeft, Plus, Users, School, ShieldAlert
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend
} from 'recharts';
import { SafeResponsiveContainer } from '@/components/ui/safe-responsive-container';
import Link from 'next/link';
import { academicAPI, Subject, Result, Assessment } from '@/lib/api';

type ManagementCardProps = {
    title: string;
    desc: string;
    icon: React.ElementType;
    link: string;
    actionLink?: string;
};

function ManagementCard({ title, desc, icon: Icon, link, actionLink }: ManagementCardProps) {
    return (
        <Card className="hover:shadow-md transition-shadow group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground group-hover:text-indigo-500 transition-colors" />
            </CardHeader>
            <CardContent>
                <p className="text-xs text-muted-foreground mt-1 mb-4 h-10">{desc}</p>
                <div className="flex gap-2">
                    <Link href={link} className="w-full">
                        <Button variant="outline" size="sm" className="w-full border-slate-200">Manage</Button>
                    </Link>
                    {actionLink && (
                        <Link href={actionLink}>
                            <Button size="sm" variant="ghost" className="px-2"><Plus className="h-4 w-4" /></Button>
                        </Link>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

function StatCard({ title, value, icon: Icon, color }: { title: string; value: number; icon: any; color: string }) {
    return (
        <Card>
            <CardContent className="p-6 flex items-center gap-4">
                <div className={`p-3 rounded-full ${color} bg-opacity-10`}>
                    <Icon className={`h-6 w-6 ${color.replace('bg-', 'text-')}`} />
                </div>
                <div>
                    <p className="text-sm font-medium text-slate-500">{title}</p>
                    <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
                </div>
            </CardContent>
        </Card>
    );
}

function toList<T>(payload: unknown): T[] {
    if (Array.isArray(payload)) return payload as T[];
    if (payload && typeof payload === 'object' && Array.isArray((payload as any).results)) {
        return (payload as any).results as T[];
    }
    return [];
}

export default function AcademicControlDashboard() {
    const [stats, setStats] = useState({
        total_teachers: 0,
        total_students: 0,
        total_classes: 0,
        total_subjects: 0
    });
    const [curriculumData, setCurriculumData] = useState<Array<{ subject: string; covered: number; target: number }>>([]);
    const [performanceData, setPerformanceData] = useState<Array<{ subject: string; A: number; B: number; fullMark: number }>>([]);

    useEffect(() => {
        async function loadData() {
            try {
                const [statsData, subjectsRaw, assessmentsRaw, resultsRaw] = await Promise.all([
                    academicAPI.getStats(),
                    academicAPI.getSubjects().catch(() => []),
                    academicAPI.getAssessments().catch(() => []),
                    academicAPI.getResults().catch(() => []),
                ]);
                setStats(statsData);

                const subjects = toList<Subject>(subjectsRaw);
                const assessments = toList<Assessment>(assessmentsRaw);
                const results = toList<Result>(resultsRaw);

                const coverage = await Promise.all(
                    subjects.slice(0, 8).map(async (subject) => {
                        try {
                            const lessons = await academicAPI.getLessons(undefined, subject.id);
                            const total = lessons.length;
                            const published = lessons.filter((lesson) => lesson.is_published).length;
                            return {
                                subject: subject.name,
                                covered: total > 0 ? Math.round((published / total) * 100) : 0,
                                target: 100,
                            };
                        } catch {
                            return { subject: subject.name, covered: 0, target: 100 };
                        }
                    })
                );
                setCurriculumData(coverage);

                const subjectMap = new Map(subjects.map((subject) => [Number(subject.id), subject]));
                const assessmentMap = new Map(assessments.map((assessment) => [String(assessment.assessment_id), assessment]));
                const buckets = new Map<string, { A: number; B: number }>();

                results.forEach((result) => {
                    const assessment = assessmentMap.get(String(result.assessment));
                    if (!assessment) return;
                    const subject = subjectMap.get(Number(assessment.subject));
                    if (!subject) return;
                    const total = Number(assessment.total_marks || 0);
                    if (!total) return;
                    const pct = (Number(result.score || 0) / total) * 100;
                    const bucket = buckets.get(subject.name) || { A: 0, B: 0 };
                    if (pct >= 80) bucket.A += 1;
                    else if (pct >= 60) bucket.B += 1;
                    buckets.set(subject.name, bucket);
                });

                const radar = Array.from(buckets.entries()).map(([subject, value]) => ({
                    subject,
                    A: value.A,
                    B: value.B,
                    fullMark: Math.max(30, value.A + value.B),
                })).slice(0, 8);
                setPerformanceData(radar);
            } catch (error) {
                console.error('Failed to load academic control dashboard', error);
            }
        }

        loadData();
    }, []);

    return (
        <div className="p-6 space-y-8 bg-slate-50 min-h-screen dark:bg-slate-900">
            <header className="flex items-center gap-4 border-b pb-6">
                <Link href="/admin">
                    <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Academic Control Center</h1>
                    <p className="text-slate-500 text-sm">Manage curriculum, subjects, and assess academic standards.</p>
                </div>
            </header>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Total Classes" value={stats.total_classes} icon={School} color="bg-indigo-500 text-indigo-500" />
                <StatCard title="Subjects" value={stats.total_subjects} icon={BookOpen} color="bg-emerald-500 text-emerald-500" />
                <StatCard title="Faculty" value={stats.total_teachers} icon={GraduationCap} color="bg-amber-500 text-amber-500" />
                <StatCard title="Students" value={stats.total_students} icon={Users} color="bg-blue-500 text-blue-500" />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Curriculum Coverage</CardTitle>
                        <CardDescription>Published lesson percentage per subject</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        {curriculumData.length > 0 ? (
                            <SafeResponsiveContainer width="100%" height="100%">
                                <BarChart data={curriculumData} layout="vertical" margin={{ left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                    <XAxis type="number" domain={[0, 100]} />
                                    <YAxis dataKey="subject" type="category" width={120} tick={{ fontSize: 12 }} />
                                    <Tooltip />
                                    <Bar dataKey="covered" fill="#4f46e5" radius={[0, 4, 4, 0]} barSize={20} name="Completed %" />
                                </BarChart>
                            </SafeResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-500">No curriculum data available.</div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Subject Performance Radar</CardTitle>
                        <CardDescription>Distribution of A/B scores by subject</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        {performanceData.length > 0 ? (
                            <SafeResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={performanceData}>
                                    <PolarGrid />
                                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 30]} />
                                    <Radar name="Grade A Students" dataKey="A" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                                    <Radar name="Grade B Students" dataKey="B" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                                    <Legend />
                                    <Tooltip />
                                </RadarChart>
                            </SafeResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-500">No performance data available.</div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div>
                <h3 className="text-lg font-semibold mb-4 text-slate-800">Management Modules</h3>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    <ManagementCard title="Academic Years" desc="Configure academic sessions and terms." icon={GraduationCap} link="/admin/academic/years" actionLink="/admin/academic/years" />
                    <ManagementCard title="Classes & Sections" desc="Configure Grades, Classes, and Sections." icon={School} link="/admin/academic/classes" actionLink="/admin/academic/classes" />
                    <ManagementCard title="Subjects" desc="Manage subject definitions and curriculum." icon={BookOpen} link="/admin/academic/subjects" actionLink="/admin/academic/subjects" />
                    <ManagementCard title="Student Management" desc="Manage student profiles, enrollments, and progress." icon={Users} link="/admin/academic/students" actionLink="/admin/academic/students" />
                    <ManagementCard title="Teacher Management" desc="Manage faculty, assignments, and workload." icon={GraduationCap} link="/admin/academic/teachers" actionLink="/admin/academic/teachers" />
                    <ManagementCard title="Promotion Exceptions" desc="Review and override promote/hold decisions before final publish." icon={ShieldAlert} link="/admin/academic/promotion-exceptions" actionLink="/admin/academic/promotion-exceptions" />
                    <ManagementCard title="Admissions" desc="Track enquiries and convert applicants into student accounts." icon={Users} link="/admin/admissions" actionLink="/admin/admissions" />
                </div>
            </div>
        </div>
    );
}
