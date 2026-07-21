// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    ChevronLeft, BarChart2, Users,
    Clock, Target, BrainCircuit,
    ArrowUpRight, Mail, MessageSquare
} from 'lucide-react';
import { academicAPI, Assessment, Result, Student } from '@/lib/api';
import { toast } from 'sonner';

export default function teacherAssessmentResultsPage() {
    const router = useRouter();
    const params = useParams();
    const assessmentId = params.assessmentId as string;

    const [loading, setLoading] = useState(true);
    const [assessment, setAssessment] = useState<Assessment | null>(null);
    const [results, setResults] = useState<Result[]>([]);
    const [students, setStudents] = useState<Student[]>([]);

    useEffect(() => {
        loadData();
    }, [assessmentId]);

    const loadData = async () => {
        try {
            const [assessmentData, resultsData, studentsData] = await Promise.all([
                academicAPI.getAssessment(assessmentId),
                academicAPI.getResults(), // Ideally this takes an assessmentId filter, checking API
                academicAPI.getStudents()
            ]);
            setAssessment(assessmentData);

            // Filter results for this assessment
            const filteredResults = resultsData.filter(r => r.assessment === assessmentId);
            setResults(filteredResults);
            setStudents(studentsData);
        } catch (error) {
            console.error('Failed to load data', error);
            toast.error('Failed to load assessment results');
        } finally {
            setLoading(false);
        }
    };

    const getStudentName = (studentId: string) => {
        const student = students.find(s => s.id === studentId);
        if (!student) return 'Unknown Student';
        return `${student.first_name} ${student.last_name}`;
    };

    if (loading) return <div className="p-8 text-center text-slate-400">Loading results...</div>;
    if (!assessment) return <div className="p-8 text-center">Assessment not found</div>;

    const avgScore = results.length > 0
        ? Math.round((results.reduce((acc, r) => acc + r.score, 0) / (results.length * assessment.total_marks)) * 100)
        : 0;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.back()}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">{assessment.title} - Results</h1>
                    <p className="text-slate-500">View student performance and detailed analytics</p>
                </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-slate-200">
                    <CardContent className="p-6 text-center space-y-2">
                        <Users className="h-6 w-6 text-indigo-600 mx-auto" />
                        <p className="text-xs font-bold text-slate-500 uppercase">Submissions</p>
                        <h4 className="text-2xl font-black">{results.length}</h4>
                    </CardContent>
                </Card>
                <Card className="border-slate-200">
                    <CardContent className="p-6 text-center space-y-2">
                        <Target className="h-6 w-6 text-emerald-600 mx-auto" />
                        <p className="text-xs font-bold text-slate-500 uppercase">Average Score</p>
                        <h4 className="text-2xl font-black">{avgScore}%</h4>
                    </CardContent>
                </Card>
                <Card className="border-slate-200">
                    <CardContent className="p-6 text-center space-y-2">
                        <Clock className="h-6 w-6 text-amber-600 mx-auto" />
                        <p className="text-xs font-bold text-slate-500 uppercase">Avg. Time</p>
                        <h4 className="text-2xl font-black">{results.length > 0 ? Math.round(results.reduce((acc, r) => acc + (r.time_taken_minutes || 0), 0) / results.length) : 0} min</h4>
                    </CardContent>
                </Card>
                <Card className="border-slate-200">
                    <CardContent className="p-6 text-center space-y-2">
                        <BrainCircuit className="h-6 w-6 text-rose-600 mx-auto" />
                        <p className="text-xs font-bold text-slate-500 uppercase">Pass Rate</p>
                        <h4 className="text-2xl font-black">
                            {results.length > 0 ? Math.round((results.filter(r => (r.score / assessment.total_marks) * 100 >= assessment.passing_marks).length / results.length) * 100) : 0}%
                        </h4>
                    </CardContent>
                </Card>
            </div>

            {/* Results Table */}
            <Card className="border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50 border-b border-slate-200">
                    <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-500">Student Submissions</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Student</th>
                                <th className="px-6 py-4">Score</th>
                                <th className="px-6 py-4">Accuracy</th>
                                <th className="px-6 py-4">Time Taken</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {results.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic font-medium">No submissions yet for this assessment.</td>
                                </tr>
                            ) : (
                                results.map((result) => {
                                    const percentage = Math.round((result.score / assessment.total_marks) * 100);
                                    const isPassing = percentage >= assessment.passing_marks;

                                    return (
                                        <tr key={result.result_id} className="hover:bg-indigo-50/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-900">{getStudentName(result.student)}</div>
                                                <div className="text-[10px] text-slate-400">ID: {result.student.substring(0, 8)}...</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-black text-slate-900">{result.score}</span>
                                                <span className="text-slate-400 text-xs shadow-none"> / {assessment.total_marks}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant={isPassing ? 'default' : 'destructive'} className={`${isPassing ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600'} border-none shadow-sm`}>
                                                    {percentage}%
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-xs font-medium text-slate-600">
                                                <div className="flex items-center gap-1.5">
                                                    <Clock className="h-3 w-3 text-slate-400" />
                                                    {result.time_taken_minutes} minutes
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-indigo-600 hover:bg-indigo-50">
                                                        <Mail className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="outline" size="sm" className="h-8 text-xs font-bold border-indigo-200 text-indigo-600 hover:bg-indigo-50">
                                                        View Details <ArrowUpRight className="ml-1 h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </CardContent>
            </Card>
        </div>
    );
}
