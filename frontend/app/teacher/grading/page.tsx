// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
    ClipboardList, Search, CheckCircle2, Clock,
    FileText, TrendingUp
} from 'lucide-react';
import { academicAPI, Submission, Assessment } from '@/lib/api';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

function normalizeList<T>(payload: unknown): T[] {
    if (Array.isArray(payload)) return payload as T[];
    if (payload && typeof payload === 'object' && Array.isArray((payload as { results?: unknown[] }).results)) {
        return (payload as { results: T[] }).results;
    }
    return [];
}

export default function GradingListPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [assessments, setAssessments] = useState<Assessment[]>([]);
    const [selectedAssessment, setSelectedAssessment] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [submissionsData, assessmentsData] = await Promise.all([
                academicAPI.getSubmissions(),
                academicAPI.getAssessments()
            ]);

            setSubmissions(normalizeList<Submission>(submissionsData));
            setAssessments(normalizeList<Assessment>(assessmentsData));
        } catch (error) {
            console.error('Failed to load grading data', error);
            toast({
                title: 'Error',
                description: 'Failed to load submissions',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Filter submissions
    const filteredSubmissions = submissions.filter(sub => {
        const matchesAssessment = selectedAssessment === 'all' || sub.assessment === selectedAssessment;
        const matchesStatus = statusFilter === 'all' ||
            (statusFilter === 'graded' && sub.is_graded) ||
            (statusFilter === 'pending' && !sub.is_graded);

        return matchesAssessment && matchesStatus;
    });

    // Calculate stats
    const stats = {
        total: submissions.length,
        graded: submissions.filter(s => s.is_graded).length,
        pending: submissions.filter(s => !s.is_graded).length,
        avgScore: submissions.filter(s => s.result).length > 0
            ? Math.round(submissions.filter(s => s.result).reduce((acc, s) => acc + (s.result?.score || 0), 0) / submissions.filter(s => s.result).length)
            : 0
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Grade Assignments</h1>
                <p className="text-slate-500">Review and grade student submissions</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="border-none shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Total Submissions</CardTitle>
                        <FileText className="h-4 w-4 text-indigo-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total}</div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Graded</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600">{stats.graded}</div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Pending Review</CardTitle>
                        <Clock className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Average Score</CardTitle>
                        <TrendingUp className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{stats.avgScore}%</div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card className="border-none shadow-sm">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                        <CardTitle className="text-base font-semibold">Submissions</CardTitle>
                        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                            <div className="relative flex-1 sm:flex-initial sm:w-64">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Search students..."
                                    className="pl-9"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <Select value={selectedAssessment} onValueChange={setSelectedAssessment}>
                                <SelectTrigger className="w-full sm:w-[200px]">
                                    <SelectValue placeholder="All Assignments" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Assignments</SelectItem>
                                    {assessments.map(a => (
                                        <SelectItem key={a.id} value={a.id}>
                                            {a.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-full sm:w-[150px]">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="graded">Graded</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-12 text-slate-500">Loading submissions...</div>
                    ) : filteredSubmissions.length === 0 ? (
                        <div className="text-center py-12">
                            <ClipboardList className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-500">No submissions found</p>
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-medium text-slate-500">Student</th>
                                        <th className="px-4 py-3 text-left font-medium text-slate-500">Assignment</th>
                                        <th className="px-4 py-3 text-left font-medium text-slate-500">Submitted</th>
                                        <th className="px-4 py-3 text-left font-medium text-slate-500">Status</th>
                                        <th className="px-4 py-3 text-left font-medium text-slate-500">Score</th>
                                        <th className="px-4 py-3 text-left font-medium text-slate-500">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {filteredSubmissions.map((submission) => {
                                        const assessment = assessments.find(a => a.id === submission.assessment);
                                        return (
                                            <tr key={submission.id} className="hover:bg-slate-50">
                                                <td className="px-4 py-3 font-medium">
                                                    Student {submission.student.slice(0, 8)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {assessment?.title || 'Unknown Assignment'}
                                                </td>
                                                <td className="px-4 py-3 text-slate-500">
                                                    {new Date(submission.submitted_at).toLocaleDateString()}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {submission.is_graded ? (
                                                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                                                            <CheckCircle2 className="h-3 w-3 mr-1" />
                                                            Graded
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                                                            <Clock className="h-3 w-3 mr-1" />
                                                            Pending
                                                        </Badge>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {submission.result ? (
                                                        <span className="font-semibold text-indigo-600">
                                                            {submission.result.score}/{assessment?.total_marks || 100}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400">-</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Link href={`/teacher/grading/${submission.id}`}>
                                                        <Button size="sm" variant="outline">
                                                            {submission.is_graded ? 'Review' : 'Grade'}
                                                        </Button>
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
