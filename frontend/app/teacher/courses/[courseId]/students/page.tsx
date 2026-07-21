// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { academicAPI, Subject, Student, Assessment, Result } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Search, Users, GraduationCap, Mail,
    TrendingUp, TrendingDown, Clock, ShieldAlert,
    Download
} from 'lucide-react';

function toList<T>(payload: unknown): T[] {
    if (Array.isArray(payload)) return payload as T[];
    if (payload && typeof payload === 'object' && Array.isArray((payload as any).results)) {
        return (payload as any).results as T[];
    }
    return [];
}

export default function CourseStudentsPage() {
    const params = useParams();
    const courseId = params.courseId as string;

    const [subject, setSubject] = useState<Subject | null>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [studentStats, setStudentStats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [subjectData, studentsRaw, assessmentsRaw, resultsRaw] = await Promise.all([
                academicAPI.getSubject(parseInt(courseId)),
                academicAPI.getStudents().catch(() => []),
                academicAPI.getAssessments().catch(() => []),
                academicAPI.getResults().catch(() => []),
            ]);

            const allStudents = toList<Student>(studentsRaw);
            const allAssessments = toList<Assessment>(assessmentsRaw);
            const allResults = toList<Result>(resultsRaw);

            setSubject(subjectData);

            // Filter students matching the subject's class
            const enrolledStudents = allStudents.filter(
                (student) => Number(student.academic_class) === Number(subjectData.academic_class)
            );
            setStudents(enrolledStudents);

            // Filter assessments for this subject
            const subjectAssessments = allAssessments.filter(
                (assessment) => Number(assessment.subject) === Number(subjectData.id)
            );
            const assessmentMap = new Map(subjectAssessments.map((a) => [String(a.assessment_id), a]));

            // Pre-calculate statistics per student
            const stats = enrolledStudents.map((student) => {
                const studentId = String(student.id || student.student_id);
                const studentResults = allResults.filter(
                    (r) => String(r.student) === studentId && assessmentMap.has(String(r.assessment))
                );

                let totalScore = 0;
                let maxPossible = 0;
                let submittedCount = studentResults.length;

                studentResults.forEach((r) => {
                    const assessment = assessmentMap.get(String(r.assessment));
                    if (assessment?.total_marks) {
                        totalScore += Number(r.score || 0);
                        maxPossible += Number(assessment.total_marks);
                    }
                });

                const average = maxPossible > 0 ? Math.round((totalScore / maxPossible) * 100) : 0;
                const status = average >= 75 ? 'excellent' : average >= 60 ? 'good' : average >= 40 ? 'average' : 'at-risk';

                return {
                    id: studentId,
                    student,
                    average,
                    submittedCount,
                    status
                };
            });

            setStudentStats(stats.sort((a, b) => b.average - a.average));
        } catch (error) {
            console.error('Failed to load student data:', error);
        } finally {
            setLoading(false);
        }
    }, [courseId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const filteredStats = studentStats.filter(stat => {
        const studentName = `${stat.student.first_name} ${stat.student.last_name}`.toLowerCase();
        const studentCode = (stat.student.enrollment_number || '').toLowerCase();
        const q = searchQuery.toLowerCase();
        return studentName.includes(q) || studentCode.includes(q);
    });

    const atRiskCount = studentStats.filter(s => s.status === 'at-risk').length;
    const averageClassScore = studentStats.length > 0 
        ? Math.round(studentStats.reduce((sum, s) => sum + s.average, 0) / studentStats.length)
        : 0;

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-6 animate-in fade-in duration-500">
            <div className="mb-8">
                <h2 className="text-3xl font-black text-slate-900 mb-2">Enrolled Students</h2>
                <p className="text-slate-500">View and manage students enrolled in {subject?.name}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card className="border-none shadow-sm bg-indigo-50/50">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-indigo-600 font-bold uppercase text-[10px] tracking-widest flex items-center gap-1"><Users className="h-3 w-3"/> Total Enrolled</CardDescription>
                        <CardTitle className="text-2xl font-black text-slate-900">{students.length}</CardTitle>
                    </CardHeader>
                </Card>
                <Card className="border-none shadow-sm bg-emerald-50/50">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-emerald-600 font-bold uppercase text-[10px] tracking-widest flex items-center gap-1"><TrendingUp className="h-3 w-3"/> Avg. Score</CardDescription>
                        <CardTitle className="text-2xl font-black text-slate-900">{averageClassScore}%</CardTitle>
                    </CardHeader>
                </Card>
                <Card className="border-none shadow-sm bg-rose-50/50">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-rose-600 font-bold uppercase text-[10px] tracking-widest flex items-center gap-1"><ShieldAlert className="h-3 w-3"/> At Risk</CardDescription>
                        <CardTitle className="text-2xl font-black text-slate-900">{atRiskCount}</CardTitle>
                    </CardHeader>
                </Card>
            </div>

            <Card className="shadow-lg border-slate-100 overflow-hidden rounded-2xl">
                <div className="p-4 border-b bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search students..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 bg-white border-none shadow-sm h-10"
                        />
                    </div>
                    <Button variant="outline" size="sm" className="bg-white border-slate-200">
                        <Download className="h-4 w-4 mr-2" /> Export Roster
                    </Button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase">
                            <tr>
                                <th className="px-6 py-4 rounded-tl-2xl">Student Details</th>
                                <th className="px-6 py-4">Enrollment No.</th>
                                <th className="px-6 py-4">Assessments Taken</th>
                                <th className="px-6 py-4">Overall Score</th>
                                <th className="px-6 py-4 rounded-tr-2xl text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {filteredStats.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">
                                        No students found matching your search.
                                    </td>
                                </tr>
                            ) : (
                                filteredStats.map((stat) => (
                                    <tr key={stat.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 shrink-0">
                                                    {stat.student.first_name?.[0]}{stat.student.last_name?.[0]}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900">{stat.student.first_name} {stat.student.last_name}</div>
                                                    <div className="text-[10px] text-slate-500 font-medium">{stat.student.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded">
                                                {stat.student.enrollment_number || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 font-medium">
                                            {stat.submittedCount}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full rounded-full ${
                                                            stat.average >= 75 ? 'bg-emerald-500' :
                                                            stat.average >= 60 ? 'bg-indigo-500' :
                                                            stat.average >= 40 ? 'bg-amber-500' :
                                                            'bg-rose-500'
                                                        }`}
                                                        style={{ width: `${stat.average}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs font-bold text-slate-700">{stat.average}%</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Badge variant="outline" className={`
                                                border-none shadow-sm
                                                ${stat.status === 'excellent' ? 'bg-emerald-100 text-emerald-700' : ''}
                                                ${stat.status === 'good' ? 'bg-indigo-100 text-indigo-700' : ''}
                                                ${stat.status === 'average' ? 'bg-amber-100 text-amber-700' : ''}
                                                ${stat.status === 'at-risk' ? 'bg-rose-100 text-rose-700 animate-pulse' : ''}
                                            `}>
                                                {stat.status === 'at-risk' ? 'At Risk' : stat.status.charAt(0).toUpperCase() + stat.status.slice(1)}
                                            </Badge>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
