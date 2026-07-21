// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { academicAPI, Assessment, Submission, Student } from '@/lib/api';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Save, CheckCircle, XCircle, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';

export default function GradebookPage() {
    const params = useParams();
    const router = useRouter();
    const assessmentId = params.assessmentId as string; // Note: Ensure route param matches

    const [assessment, setAssessment] = useState<Assessment | null>(null);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);

    // Grading Modal State
    const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
    const [manualScore, setManualScore] = useState<string>('');
    const [feedback, setFeedback] = useState<string>('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            try {
                // In a real app, we'd fetch the specific assessment and ALL students in the class
                // For now, we fetch submissions which gives us students who started/completed
                const [assessmentData, submissionsData] = await Promise.all([
                    academicAPI.getAssessment(assessmentId),
                    academicAPI.getSubmissions(assessmentId)
                ]);
                setAssessment(assessmentData);
                setSubmissions(submissionsData);
            } catch (error) {
                toast.error('Failed to load gradebook');
            } finally {
                setLoading(false);
            }
        };
        if (assessmentId) loadData();
    }, [assessmentId]);

    const handleOpenGrade = (sub: Submission) => {
        const anySub = sub as any;
        setSelectedSubmission(sub);
        setManualScore(anySub.score?.toString() || anySub.result?.score?.toString() || '');
        setFeedback(anySub.feedback || anySub.result?.feedback || '');
    };

    const handleSaveGrade = async () => {
        if (!selectedSubmission) return;
        setSaving(true);
        try {
            // Check if result exists, if so update/override
            // Using a specialized endpoint or updateSubmission would be ideal.
            // Assuming updateResult or gradeSubmission is available.

            // We'll use a hypothetical secure grading endpoint
            await academicAPI.gradeSubmission(selectedSubmission.id.toString(), {
                score: parseFloat(manualScore),
                feedback: feedback,
                status: 'graded'
            });

            toast.success('Grade updated');

            // Update local state
            setSubmissions(prev => prev.map(s =>
                s.id === selectedSubmission.id
                    ? { ...s, status: 'graded' } as Submission
                    : s
            ));
            setSelectedSubmission(null);
        } catch (error) {
            toast.error('Failed to save grade');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;
    if (!assessment) return <div>Assessment not found</div>;

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <header className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{assessment.title} - Gradebook</h1>
                    <p className="text-slate-500">Total Marks: {assessment.total_marks}</p>
                </div>
            </header>

            <Card>
                <CardHeader>
                    <CardTitle>Student Submissions</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Student</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Submitted At</TableHead>
                                <TableHead>Score</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {submissions.map((sub) => (
                                <TableRow key={sub.id}>
                                    <TableCell className="font-medium">
                                        {(sub as any).student_name || `Student #${sub.student}`}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={sub.status === 'graded' ? 'default' : 'secondary'}>
                                            {sub.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{sub.submitted_at ? new Date(sub.submitted_at).toLocaleString() : '-'}</TableCell>
                                    <TableCell className="font-bold">
                                        {(sub as any).score !== null && (sub as any).score !== undefined ? (sub as any).score : (sub as any).result?.score || '-'} / {assessment.total_marks}
                                    </TableCell>
                                    <TableCell>
                                        <Button size="sm" variant="outline" onClick={() => handleOpenGrade(sub)}>
                                            <Eye className="mr-2 h-4 w-4" /> Review / Grade
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {submissions.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                                        No submissions yet.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Manual Grading Dialog */}
            <Dialog open={!!selectedSubmission} onOpenChange={(open) => !open && setSelectedSubmission(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Grade Submission</DialogTitle>
                    </DialogHeader>
                    {selectedSubmission && (
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Current Score</Label>
                                    <div className="text-2xl font-bold">{(selectedSubmission as any).score || (selectedSubmission as any).result?.score || 0}</div>
                                </div>
                                <div>
                                    <Label>Max Marks</Label>
                                    <div className="text-2xl font-bold text-slate-400">/ {assessment.total_marks}</div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Override Score</Label>
                                <Input
                                    type="number"
                                    value={manualScore}
                                    onChange={(e) => setManualScore(e.target.value)}
                                    max={assessment.total_marks}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Feedback</Label>
                                <Input
                                    value={feedback}
                                    onChange={(e) => setFeedback(e.target.value)}
                                    placeholder="Good job, but..."
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedSubmission(null)}>Cancel</Button>
                        <Button onClick={handleSaveGrade} disabled={saving}>
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Grade
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
