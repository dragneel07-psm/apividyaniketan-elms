// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Search, Download, ExternalLink,
    Filter, Loader2, ArrowUpDown,
    CheckCircle2, XCircle, AlertCircle
} from 'lucide-react';
import { academicAPI, GradebookData } from '@/lib/api';
import { toast } from 'sonner';

export default function GradebookManager() {
    const params = useParams();
    const courseId = params.courseId as string;
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<GradebookData | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const loadGradebook = async () => {
            try {
                const gradebook = await academicAPI.getGradebook(parseInt(courseId));
                setData(gradebook);
            } catch (error) {
                console.error("Failed to load gradebook", error);
                toast.error("Failed to load gradebook data");
            } finally {
                setLoading(false);
            }
        };
        loadGradebook();
    }, [courseId]);

    const filteredStudents = data?.students.filter(student =>
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 space-y-4">
                <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
                <p className="text-slate-500 font-medium tracking-tight">Compiling marks and results...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Gradebook</h2>
                    <p className="text-slate-500">Track student performance across all assessments</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" className="border-slate-200">
                        <Download className="h-4 w-4 mr-2" /> Export CSV
                    </Button>
                </div>
            </div>

            <Card className="border-slate-200 overflow-hidden shadow-sm">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                    <div className="flex items-center justify-between gap-4">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search by student name or email..."
                                className="pl-9 bg-white border-slate-200"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button variant="ghost" size="sm" className="text-slate-500">
                            <Filter className="h-4 w-4 mr-2" /> Filters
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-b border-slate-100">
                                    <TableHead className="w-[200px] font-semibold text-slate-900 sticky left-0 bg-slate-50/50 z-10">Student</TableHead>
                                    {data?.assessments.map(assessment => (
                                        <TableHead key={assessment.id} className="min-w-[120px] text-center font-semibold text-slate-900">
                                            <div className="flex flex-col items-center">
                                                <span>{assessment.title}</span>
                                                <span className="text-[10px] text-slate-400 font-normal">Max: {assessment.total_marks}</span>
                                            </div>
                                        </TableHead>
                                    ))}
                                    <TableHead className="w-[100px] text-right font-semibold text-slate-900">Final Avg</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredStudents.map(student => {
                                    // Calculate average
                                    const scores = Object.values(student.results)
                                        .filter(r => r.score !== null)
                                        .map(r => r.score as number);

                                    const avg = scores.length > 0
                                        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
                                        : 0;

                                    return (
                                        <TableRow key={student.id} className="hover:bg-slate-50/30 transition-colors">
                                            <TableCell className="font-medium text-slate-900 sticky left-0 bg-white group">
                                                <div className="flex flex-col">
                                                    <span>{student.name}</span>
                                                    <span className="text-[10px] text-slate-400 font-normal font-mono">{student.email}</span>
                                                </div>
                                            </TableCell>

                                            {data?.assessments.map(assessment => {
                                                const result = student.results[assessment.id];
                                                const pct = result?.score !== null ? (result.score! / assessment.total_marks) * 100 : 0;

                                                return (
                                                    <TableCell
                                                        key={`${student.id}-${assessment.id}`}
                                                        className="text-center cursor-pointer hover:bg-indigo-50/50 transition-colors group"
                                                        onClick={() => result?.result_id && router.push(`/teacher/courses/${courseId}/grades/${result.result_id}`)}
                                                    >
                                                        {result?.score !== null ? (
                                                            <div className="inline-flex flex-col items-center">
                                                                <span className={`text-sm font-bold ${pct >= 40 ? 'text-indigo-600' : 'text-red-500'}`}>
                                                                    {result.score}
                                                                </span>
                                                                <div className="w-8 h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                                                    <div
                                                                        className={`h-full ${pct >= 80 ? 'bg-emerald-500' : pct >= 40 ? 'bg-indigo-500' : 'bg-red-500'}`}
                                                                        style={{ width: `${pct}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-300 text-xs">—</span>
                                                        )}
                                                    </TableCell>
                                                );
                                            })}

                                            <TableCell className="text-right">
                                                <Badge variant={avg >= 40 ? "secondary" : "outline"} className={`font-bold ${avg >= 40 ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                                                    {avg}%
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}

                                {filteredStudents.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={(data?.assessments.length || 0) + 2} className="h-32 text-center text-slate-500">
                                            No students found matching your search.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
