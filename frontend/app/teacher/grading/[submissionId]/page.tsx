// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, BrainCircuit, Save } from 'lucide-react';
import { academicAPI, aiAPI, usersAPI, Submission, Result, Assessment, Student, GradingRubric, AIGradingDraft } from '@/lib/api';
import { toast } from 'sonner';

export default function GradingPage() {
    const params = useParams();
    const router = useRouter();
    const submissionId = params.submissionId as string;

    const [loading, setLoading] = useState(true);
    const [submission, setSubmission] = useState<Submission | null>(null);
    const [result, setResult] = useState<Result | null>(null);
    const [assessment, setAssessment] = useState<Assessment | null>(null);
    const [student, setStudent] = useState<Student | null>(null);
    const [user, setUser] = useState<any>(null);
    const [grade, setGrade] = useState<number>(0);
    const [feedback, setFeedback] = useState('');
    const [saving, setSaving] = useState(false);
    const [aiAnalyzing, setAiAnalyzing] = useState(false);
    const [rubrics, setRubrics] = useState<GradingRubric[]>([]);
    const [selectedRubricId, setSelectedRubricId] = useState('');
    const [aiDraft, setAiDraft] = useState<AIGradingDraft | null>(null);
    const [creatingRubric, setCreatingRubric] = useState(false);

    const loadData = useCallback(async () => {
        try {
            const sub = await academicAPI.getSubmission(submissionId);
            setSubmission(sub);

            const [assessmentData, studentData, userData, rubricData, draftData] = await Promise.all([
                academicAPI.getAssessment(sub.assessment),
                academicAPI.getStudent(sub.student),
                usersAPI.getMe().catch(() => null),
                aiAPI.listGradingRubrics().catch(() => []),
                aiAPI.listGradingDrafts(submissionId).catch(() => []),
            ]);

            setAssessment(assessmentData);
            setStudent(studentData);
            setUser(userData);
            setRubrics(rubricData);
            if (rubricData.length > 0) {
                setSelectedRubricId((prev) => prev || rubricData[0].id);
            }
            const latestDraft = draftData.find((item) => item.status === 'draft') || draftData[0] || null;
            setAiDraft(latestDraft);

            if (sub.result) {
                const resultData = await academicAPI.getResult(sub.result.result_id);
                setResult(resultData);
                setGrade(resultData.score);
                setFeedback(resultData.teacher_feedback || resultData.ai_feedback || '');
            } else {
                setResult(null);
            }
        } catch (error) {
            console.error('Failed to load submission:', error);
            toast.error('Failed to load submission details');
        } finally {
            setLoading(false);
        }
    }, [submissionId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await academicAPI.gradeSubmission(submissionId, {
                score: grade,
                teacher_feedback: feedback
            });
            toast.success('Grade saved successfully');
            router.push('/teacher/grading');
        } catch (error) {
            console.error('Failed to save grade:', error);
            toast.error('Failed to save grade');
        } finally {
            setSaving(false);
        }
    };

    const handleCreateDefaultRubric = async () => {
        setCreatingRubric(true);
        try {
            const rubric = await aiAPI.createGradingRubric({
                title: 'Default Subjective Rubric',
                total_points: assessment?.total_marks || 100,
                criteria: [
                    { name: 'Accuracy', max_points: Math.round((assessment?.total_marks || 100) * 0.5), description: 'Facts and conceptual correctness' },
                    { name: 'Clarity', max_points: Math.round((assessment?.total_marks || 100) * 0.25), description: 'Structured and understandable writing' },
                    { name: 'Completeness', max_points: Math.round((assessment?.total_marks || 100) * 0.25), description: 'Covers required points and examples' },
                ],
            });
            setRubrics((prev) => [rubric, ...prev]);
            setSelectedRubricId(rubric.id);
            toast.success('Default rubric created');
        } catch (error) {
            console.error('Failed to create rubric', error);
            toast.error('Failed to create rubric');
        } finally {
            setCreatingRubric(false);
        }
    };

    const handleGenerateDraft = async () => {
        if (!selectedRubricId) {
            toast.error('Select a grading rubric first');
            return;
        }
        setAiAnalyzing(true);
        try {
            const draftResponse = await aiAPI.gradeSubmissionWithRubric({
                submission_id: submissionId,
                rubric_id: selectedRubricId,
            });
            const drafts = await aiAPI.listGradingDrafts(submissionId);
            const draft = drafts.find((item) => item.id === draftResponse.draft_id) || drafts[0] || null;
            setAiDraft(draft);
            if (draft) {
                setGrade(Math.round(draft.score));
                setFeedback(draft.feedback || '');
            }
            toast.success('AI draft grade generated');
        } catch (error) {
            console.error('Failed to generate AI draft', error);
            toast.error('Failed to generate AI draft');
        } finally {
            setAiAnalyzing(false);
        }
    };

    const handleApproveDraft = async () => {
        if (!aiDraft) {
            toast.error('No AI draft available');
            return;
        }
        setAiAnalyzing(true);
        try {
            const approved = await aiAPI.approveGradingDraft(aiDraft.id);
            setGrade(Math.round(approved.score));
            setFeedback(aiDraft.feedback || '');
            toast.success('AI draft approved and finalized');
            await loadData();
        } catch (error) {
            console.error('Failed to approve AI draft', error);
            toast.error('Failed to approve AI draft');
        } finally {
            setAiAnalyzing(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-muted-foreground">Loading submission...</div>;
    if (!submission) return <div className="p-8">Submission not found</div>;

    return (
        <div className="max-w-6xl mx-auto p-6 md:p-8 min-h-screen bg-gray-50/50">
            <Button variant="ghost" className="mb-6 pl-0 hover:pl-2 transition-all" onClick={() => router.back()}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back to Submissions
            </Button>

            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Grading Submission</h1>
                    <p className="text-muted-foreground mt-1">
                        Student: {student?.first_name} {student?.last_name} • Assignment: {assessment?.title}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Badge variant={submission.is_graded ? 'default' : 'secondary'} className="text-sm px-3 py-1">
                        {submission.is_graded ? 'GRADED' : 'PENDING'}
                    </Badge>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-200px)]">
                {/* Left: Student Submission */}
                <Card className="flex flex-col h-full border-slate-200 shadow-sm">
                    <CardHeader className="bg-slate-50 border-b">
                        <CardTitle className="text-base font-semibold text-gray-700">Student Response</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto p-6 font-serif text-lg leading-relaxed text-gray-800 bg-white">
                        {submission.content}
                    </CardContent>
                </Card>

                {/* Right: Grading Panel */}
                <div className="flex flex-col gap-6 h-full overflow-y-auto pr-1">
                    {/* AI Analysis Card */}
                    {user?.tenant_features?.teacher_ai_grading !== false && (
                        <Card className="border-indigo-100 bg-indigo-50/30">
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-indigo-800 text-base">
                                    <BrainCircuit className="h-5 w-5" /> AI Analysis
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {rubrics.length === 0 ? (
                                    <div className="text-center py-4">
                                        <p className="text-xs text-slate-500 mb-3">No rubric found. Create one to run AI-assisted grading.</p>
                                        <Button
                                            size="sm"
                                            className="bg-indigo-600 hover:bg-indigo-700 h-8 text-xs"
                                            onClick={handleCreateDefaultRubric}
                                            disabled={creatingRubric}
                                        >
                                            {creatingRubric ? 'Creating...' : 'Create Default Rubric'}
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-slate-600">Grading Rubric</Label>
                                            <select
                                                value={selectedRubricId}
                                                onChange={(e) => setSelectedRubricId(e.target.value)}
                                                className="w-full rounded border border-indigo-200 bg-white px-2 py-1 text-xs text-slate-700"
                                            >
                                                {rubrics.map((rubric) => (
                                                    <option key={rubric.id} value={rubric.id}>
                                                        {rubric.title} ({rubric.total_points})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <Button
                                            size="sm"
                                            className="bg-indigo-600 hover:bg-indigo-700 h-8 text-xs"
                                            onClick={handleGenerateDraft}
                                            disabled={aiAnalyzing}
                                        >
                                            <BrainCircuit className="h-3 w-3 mr-2" />
                                            {aiAnalyzing ? 'Analyzing...' : 'AI Grade'}
                                        </Button>
                                    </>
                                )}

                                {aiDraft && (
                                    <div className="space-y-2 rounded border border-indigo-100 bg-white p-3">
                                        <div className="flex items-center justify-between text-sm font-medium">
                                            <span className="text-slate-600">Draft Score:</span>
                                            <span className="text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">{Math.round(aiDraft.score)}/{assessment?.total_marks || 100}</span>
                                        </div>
                                        <div className="text-sm text-slate-700 bg-indigo-50/40 p-2 rounded border border-indigo-100">
                                            {aiDraft.feedback || 'No AI feedback'}
                                        </div>
                                        <div className="max-h-36 overflow-y-auto space-y-1">
                                            {aiDraft.criteria_breakdown?.map((row, idx) => (
                                                <div key={`${row.criterion}-${idx}`} className="text-xs text-slate-600 border rounded px-2 py-1">
                                                    <div className="font-semibold text-slate-700">
                                                        {row.criterion}: {row.points_awarded}/{row.max_points}
                                                    </div>
                                                    {row.feedback ? <div>{row.feedback}</div> : null}
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-xs h-7 border-indigo-200 text-indigo-700 bg-white"
                                                onClick={() => {
                                                    setGrade(Math.round(aiDraft.score));
                                                    setFeedback(aiDraft.feedback || '');
                                                }}
                                            >
                                                Apply Draft
                                            </Button>
                                            {aiDraft.status === 'draft' ? (
                                                <Button
                                                    size="sm"
                                                    className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                                                    onClick={handleApproveDraft}
                                                    disabled={aiAnalyzing}
                                                >
                                                    {aiAnalyzing ? 'Approving...' : 'Approve Draft'}
                                                </Button>
                                            ) : (
                                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                                                    {aiDraft.status.toUpperCase()}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Teacher Grading Form */}
                    <Card className="flex-1 flex flex-col">
                        <CardHeader>
                            <CardTitle className="text-base">Final Grade</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6 flex-1">
                            <div className="space-y-2">
                                <Label htmlFor="score">Score (0-{assessment?.total_marks || 100})</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="score"
                                        type="number"
                                        min="0"
                                        max={assessment?.total_marks || 100}
                                        className="w-24 text-lg font-bold"
                                        value={grade}
                                        onChange={(e) => setGrade(Math.min(Number(e.target.value), assessment?.total_marks || 100))}
                                    />
                                    <span className="text-muted-foreground">/ {assessment?.total_marks || 100}</span>
                                </div>
                            </div>

                            <div className="space-y-2 flex-1 flex flex-col">
                                <Label htmlFor="feedback">feedback & Remarks</Label>
                                <Textarea
                                    id="feedback"
                                    className="flex-1 min-h-[150px] resize-none"
                                    placeholder="Enter constructive feedback..."
                                    value={feedback}
                                    onChange={(e) => setFeedback(e.target.value)}
                                />
                            </div>
                        </CardContent>
                        <CardFooter className="border-t bg-slate-50 p-4 flex justify-end">
                            <Button size="lg" onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 shadow-sm">
                                <Save className="h-4 w-4 mr-2" /> {saving ? 'Saving...' : 'Save & Release Grade'}
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </div>
    );
}
