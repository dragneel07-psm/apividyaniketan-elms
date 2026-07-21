// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Calendar, CheckCircle, User, ArrowLeft, Download
} from 'lucide-react';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import { academicAPI, Assessment, Submission, Student } from '@/lib/api';
import QuestionManager from './QuestionManager';
import { toast } from 'sonner';

function toList<T>(payload: unknown): T[] {
    if (Array.isArray(payload)) return payload as T[];
    if (payload && typeof payload === 'object' && Array.isArray((payload as any).results)) {
        return (payload as any).results as T[];
    }
    return [];
}

export default function AssignmentDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [loading, setLoading] = useState(true);
    const [assessment, setAssessment] = useState<Assessment | null>(null);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [students, setStudents] = useState<Record<string, Student>>({});

    // Grading State
    const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
    const [gradeScore, setGradeScore] = useState<number>(0);
    const [feedback, setFeedback] = useState('');
    const [gradingLoading, setGradingLoading] = useState(false);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [assessmentData, submissionsRaw, studentsRaw] = await Promise.all([
                academicAPI.getAssessment(id),
                academicAPI.getSubmissions(id).catch(() => []),
                academicAPI.getStudents().catch(() => [])
            ]);

            const submissionsData = toList<Submission>(submissionsRaw);
            const studentsData = toList<Student>(studentsRaw);

            setAssessment(assessmentData);
            setSubmissions(submissionsData);

            // Map students for easy lookup
            const studentMap: Record<string, Student> = {};
            studentsData.forEach((s: Student) => studentMap[s.id] = s);
            setStudents(studentMap);

        } catch (error) {
            console.error('Failed to load assignment details:', error);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        if (id) loadData();
    }, [id, loadData]);

    const handleGradeOpen = (submission: Submission) => {
        setSelectedSubmission(submission);
        setGradeScore(submission.result?.score || 0);
        setFeedback(submission.result?.teacher_feedback || '');
    };

    const handleGradeSubmit = async () => {
        if (!selectedSubmission) return;
        setGradingLoading(true);
        try {
            await academicAPI.gradeSubmission(selectedSubmission.submission_id, {
                score: gradeScore,
                feedback: feedback
            });

            setSelectedSubmission(null);
            await loadData();
            toast.success('Grade saved');
        } catch (error) {
            console.error('Grading failed:', error);
            toast.error('Failed to save grade');
        } finally {
            setGradingLoading(false);
        }
    };

    if (loading) return <div className="p-12 text-center text-slate-400">Loading details...</div>;
    if (!assessment) return <div className="p-12 text-center">Assessment not found</div>;

    const submittedCount = submissions.filter(s => s.status !== 'draft').length;
    const gradedCount = submissions.filter(s => s.status === 'graded').length;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-slate-900">{assessment.title}</h1>
                        <Badge variant="outline" className="capitalize bg-slate-100">{assessment.type}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
                        <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> Due: {new Date(assessment.due_date || '').toLocaleDateString()}</span>
                        <span className="flex items-center gap-1"><CheckCircle className="h-4 w-4" /> {assessment.total_marks} Points</span>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Total Submissions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">{submittedCount}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Graded</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">{gradedCount}</div>
                        <div className="h-1 w-full bg-slate-100 mt-2 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500" style={{ width: `${submittedCount ? (gradedCount / submittedCount) * 100 : 0}%` }}></div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Time Remaining</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">
                            {assessment.due_date && new Date(assessment.due_date) > new Date()
                                ? Math.ceil((new Date(assessment.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) + ' Days'
                                : 'Closed'}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="submissions" className="w-full">
                <TabsList className="bg-white border mb-4">
                    <TabsTrigger value="submissions">Submissions</TabsTrigger>
                    {assessment.type === 'quiz' && <TabsTrigger value="questions">Questions</TabsTrigger>}
                    <TabsTrigger value="details">Instructions</TabsTrigger>
                </TabsList>

                <TabsContent value="questions">
                    <QuestionManager assessmentId={assessment.assessment_id} />
                </TabsContent>

                <TabsContent value="details">
                    <Card>
                        <CardContent className="pt-6">
                            <h3 className="font-semibold text-lg mb-2">Instructions</h3>
                            <p className="text-slate-600 whitespace-pre-wrap leading-relaxed">
                                {assessment.description || 'No instructions provided.'}
                            </p>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="submissions">
                    <Card>
                        <CardHeader>
                            <CardTitle>Student Submissions</CardTitle>
                            <CardDescription>Review and grade student work.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border border-slate-200">
                                <div className="grid grid-cols-12 gap-4 p-3 bg-slate-50 border-b border-slate-200 font-medium text-sm text-slate-600">
                                    <div className="col-span-4">Student</div>
                                    <div className="col-span-3">Status</div>
                                    <div className="col-span-3">Submitted At</div>
                                    <div className="col-span-2 text-right">Actions</div>
                                </div>
                                <div className="divide-y divide-slate-100">
                                    {submissions.length === 0 ? (
                                        <div className="p-8 text-center text-slate-500">No submissions yet.</div>
                                    ) : submissions.map((sub) => {
                                        const student = students[sub.student] || { first_name: 'Unknown', last_name: 'Student' };
                                        return (
                                            <div key={sub.submission_id} className="grid grid-cols-12 gap-4 p-3 items-center hover:bg-slate-50/50 transition-colors">
                                                <div className="col-span-4 flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700">
                                                        <User className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-slate-900">{student.first_name} {student.last_name}</div>
                                                        <div className="text-xs text-slate-500">Student ID: {student.id ? student.id.substring(0, 8) : '...'}</div>
                                                    </div>
                                                </div>
                                                <div className="col-span-3">
                                                    <Badge variant={sub.status === 'graded' ? 'default' : sub.status === 'submitted' ? 'secondary' : 'outline'}
                                                        className={sub.status === 'graded' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : ''}
                                                    >
                                                        {sub.status === 'graded' ? `Graded: ${sub.result?.score || 0}/${assessment.total_marks}` : sub.status}
                                                    </Badge>
                                                </div>
                                                <div className="col-span-3 text-sm text-slate-600">
                                                    {sub.submitted_at ? new Date(sub.submitted_at).toLocaleString() : '-'}
                                                </div>
                                                <div className="col-span-2 text-right">
                                                    {sub.status !== 'draft' && (
                                                        <Button size="sm" variant="outline" onClick={() => handleGradeOpen(sub)}>
                                                            {sub.status === 'graded' ? 'Edit Grade' : 'Grade'}
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Grading Dialog */}
            <Dialog open={!!selectedSubmission} onOpenChange={(open) => !open && setSelectedSubmission(null)}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Grade Submission</DialogTitle>
                        <DialogDescription>
                            Review the student&apos;s work and provide feedback.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedSubmission && (
                        <div className="space-y-6 py-4">
                            {/* Student Content View */}
                            <div className="space-y-2">
                                <h4 className="text-sm font-medium text-slate-900">Student Answer</h4>
                                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-sm leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
                                    {selectedSubmission.content || (
                                        <span className="text-slate-400 italic">No text content provided.</span>
                                    )}
                                </div>
                                {selectedSubmission.file_url && (
                                    <Button variant="outline" className="w-full mt-2" onClick={() => window.open(selectedSubmission.file_url, '_blank')}>
                                        <Download className="h-4 w-4 mr-2" /> Download Attachment
                                    </Button>
                                )}
                            </div>

                            {/* Grading Controls */}
                            <div className="grid grid-cols-3 gap-6">
                                <div className="col-span-1 space-y-2">
                                    <Label className="text-sm font-medium">Score (Max: {assessment.total_marks})</Label>
                                    <div className="relative">
                                        <Input
                                            type="number"
                                            min="0"
                                            max={assessment.total_marks}
                                            value={gradeScore}
                                            onChange={(e) => setGradeScore(Number(e.target.value))}
                                            className="text-lg font-bold"
                                        />
                                    </div>
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <Label className="text-sm font-medium">Feedback</Label>
                                    <Textarea
                                        placeholder="Add constructive feedback..."
                                        value={feedback}
                                        onChange={(e) => setFeedback(e.target.value)}
                                        className="h-24 resize-none"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedSubmission(null)}>Cancel</Button>
                        <Button onClick={handleGradeSubmit} disabled={gradingLoading} className="bg-indigo-600 hover:bg-indigo-700">
                            {gradingLoading ? 'Saving...' : 'Save Grade'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function Label({
    children,
    className,
    htmlFor,
}: React.PropsWithChildren<{ className?: string; htmlFor?: string }>) {
    return (
        <label
            htmlFor={htmlFor}
            className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className || ''}`}
        >
            {children}
        </label>
    );
}
