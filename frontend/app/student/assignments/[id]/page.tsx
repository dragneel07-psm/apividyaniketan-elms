// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
    Clock, Save, Send, ChevronLeft, Loader2, FileText, CheckCircle, BrainCircuit
} from 'lucide-react';
import { academicAPI, aiAPI, Assessment, Submission } from '@/lib/api';
import Link from 'next/link';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/localization';
import { formatDate } from '@/lib/i18n/format';

function toList<T>(payload: unknown): T[] {
    if (Array.isArray(payload)) return payload as T[];
    if (payload && typeof payload === 'object' && Array.isArray((payload as { results?: unknown[] }).results)) {
        return (payload as { results: T[] }).results;
    }
    return [];
}

export default function AssignmentSubmissionPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const { t, locale } = useTranslation();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [assignment, setAssignment] = useState<Assessment | null>(null);
    const [submission, setSubmission] = useState<Submission | null>(null);
    const [content, setContent] = useState('');
    const [studentId, setStudentId] = useState('');
    const [proofreading, setProofreading] = useState(false);
    const [aiGrading, setAiGrading] = useState(false);

    const loadData = useCallback(async () => {
        try {
            const studentsRaw = await academicAPI.getStudents();
            const students = toList<{ id: string }>(studentsRaw);
            if (students.length === 0) return;
            const sId = students[0].id;
            setStudentId(sId);

            // Get assignment
            const assess = await academicAPI.getAssessment(id);
            setAssignment(assess);

            // Check for existing submission
            const allSubsRaw = await academicAPI.getSubmissions();
            const allSubs = toList<Submission>(allSubsRaw);
            const existing = allSubs.find(s => s.assessment === id && s.student === sId);

            if (existing) {
                setSubmission(existing);
                setContent(existing.content || '');
            }
        } catch (error) {
            console.error('Failed to load assignment:', error);
            toast.error(t('student.assignmentDetail.toastLoadFailed'));
        } finally {
            setLoading(false);
        }
    }, [id, t]);

    useEffect(() => {
        if (id) loadData();
    }, [id, loadData]);

    async function handleSubmit(asDraft = false) {
        if (!studentId || !assignment) return;
        setSubmitting(true);

        try {
            const data: Partial<Submission> = {
                student: studentId,
                assessment: assignment.assessment_id,
                content: content,
                status: asDraft ? 'draft' : 'submitted'
            };

            if (submission) {
                await academicAPI.updateSubmission(submission.submission_id, data);
            } else {
                await academicAPI.createSubmission(data);
            }

            if (!asDraft) {
                toast.success(t('student.assignmentDetail.toastSubmitSuccess'));
                router.push('/student/assignments');
            } else {
                toast.success(t('student.assignmentDetail.toastDraftSaved'));
                await loadData();
            }
        } catch (error: unknown) {
            console.error('Failed to submit:', error);
            const message = error instanceof Error ? error.message : t('student.assignmentDetail.toastSubmitFailed');
            toast.error(message);
        } finally {
            setSubmitting(false);
        }
    }

    const handleAIProofread = async () => {
        if (!content.trim()) {
            toast.error(t('student.assignmentDetail.toastProofreadNoContent'));
            return;
        }
        setProofreading(true);
        try {
            const prompt = [
                'Proofread the following student assignment response.',
                'Keep the original meaning, improve grammar, clarity, and structure.',
                'Return only the improved text.',
                '',
                content,
            ].join('\n');
            const response = await aiAPI.chat(prompt, '', []);
            const improved = String(response?.response || '').trim();
            if (!improved) {
                toast.error(t('student.assignmentDetail.toastProofreadEmpty'));
                return;
            }
            setContent(improved);
            toast.success(t('student.assignmentDetail.toastProofreadSuccess'));
        } catch (error: unknown) {
            console.error('AI proofread failed:', error);
            const message = error instanceof Error ? error.message : t('student.assignmentDetail.toastProofreadFailed');
            toast.error(message);
        } finally {
            setProofreading(false);
        }
    };

    const handleAIGrade = async () => {
        if (!submission) return;
        if (!confirm(t('student.assignmentDetail.confirmAIGrade'))) return;

        setAiGrading(true);
        try {
            const result = await academicAPI.triggerAIGrading(submission.submission_id);
            const score = result && typeof result === 'object' && 'score' in (result as Record<string, unknown>)
                ? (result as Record<string, unknown>).score
                : undefined;
            toast.success(
                typeof score === 'number'
                    ? t('student.assignmentDetail.toastGradingSuccess', { score: String(score) })
                    : t('student.assignmentDetail.toastGradingSuccessNoScore')
            );
            await loadData();
        } catch (error: unknown) {
            console.error('Failed to grade submission', error);
            const message = error instanceof Error ? error.message : t('student.assignmentDetail.toastGradingFailed');
            toast.error(message);
        } finally {
            setAiGrading(false);
        }
    };

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;
    if (!assignment) return <div className="p-8">{t('student.assignmentDetail.notFound')}</div>;

    const isSubmitted = submission?.status === 'submitted' || submission?.status === 'graded';

    return (
        <div className="p-8 max-w-4xl mx-auto min-h-screen">
            <Link href="/student/assignments">
                <Button variant="ghost" className="mb-4 pl-0 hover:pl-2 transition-all">
                    <ChevronLeft className="mr-1 h-4 w-4" /> {t('student.assignmentDetail.backToAssignments')}
                </Button>
            </Link>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Instructions */}
                <div className="lg:col-span-1 space-y-6">
                    <Card className="bg-slate-50 border-slate-200">
                        <CardHeader>
                            <Badge variant="outline" className="w-fit mb-2 bg-white">{assignment.type}</Badge>
                            <CardTitle className="text-xl">{assignment.title}</CardTitle>
                            <CardDescription className="flex items-center gap-2 mt-2">
                                <Clock className="h-4 w-4" /> {assignment.due_date ? formatDate(new Date(assignment.due_date), locale) : t('common.loading')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="prose prose-sm max-w-none text-slate-600">
                            <h4 className="font-semibold text-slate-900 mb-2">{t('student.assignmentDetail.labelInstructions')}</h4>
                            <p>{assignment.description || t('student.assignmentDetail.labelNoInstructions')}</p>

                            <div className="mt-6 pt-6 border-t">
                                <h4 className="font-semibold text-slate-900 mb-2">{t('student.assignmentDetail.labelGradingCriteria')}</h4>
                                <ul className="list-disc pl-4 space-y-1">
                                    <li>{t('student.assignmentDetail.criteriaClarity')}</li>
                                    <li>{t('student.assignmentDetail.criteriaEvidence')}</li>
                                    <li>{t('student.assignmentDetail.criteriaGrammar')}</li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right: Submission Area */}
                <div className="lg:col-span-2">
                    <Card className="h-full flex flex-col">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-indigo-600" />
                                {t('student.assignmentDetail.labelYourResponse')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 min-h-[400px]">
                            {isSubmitted ? (
                                <div className="bg-slate-50 p-6 rounded-lg h-full border">
                                    <div className="flex items-center gap-2 text-green-600 font-medium mb-4">
                                        <CheckCircle className="h-5 w-5" /> {t('student.assignmentDetail.submittedOn', { date: formatDate(new Date(submission.submitted_at), locale) })}
                                    </div>
                                    <div className="whitespace-pre-wrap text-slate-800 font-serif leading-relaxed">
                                        {content}
                                    </div>
                                </div>
                            ) : (
                                <Textarea
                                    placeholder={t('student.assignmentDetail.placeholderResponse')}
                                    className="h-full min-h-[300px] resize-none font-serif text-lg leading-relaxed p-6"
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                />
                            )}
                        </CardContent>
                        <CardFooter className="border-t bg-slate-50/50 flex justify-between p-4">
                            {isSubmitted ? (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between text-sm text-muted-foreground w-full">
                                        <span>{t('student.assignmentDetail.submittedOn', { date: formatDate(new Date(submission.submitted_at), locale) })}</span>
                                        <Badge variant={submission.status === 'graded' ? 'default' : 'secondary'}>
                                            {submission.status.toUpperCase()}
                                        </Badge>
                                    </div>

                                    {submission.status === 'submitted' ? (
                                        <Button
                                            onClick={handleAIGrade}
                                            disabled={aiGrading}
                                            className="w-full bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                                        >
                                            {aiGrading ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <BrainCircuit className="mr-2 h-4 w-4" />
                                            )}
                                            {t('student.assignmentDetail.btnGradeWithAI')}
                                        </Button>
                                    ) : null}

                                    {submission.status === 'graded' && (
                                        <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-lg mt-4">
                                            <h4 className="font-bold flex items-center gap-2 text-indigo-900 mb-2">
                                                <BrainCircuit className="h-4 w-4" /> {t('student.assignmentDetail.aiFeedbackTitle')}
                                            </h4>
                                            <p className="text-indigo-800 text-sm">
                                                {t('student.assignmentDetail.aiFeedbackHint')}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <Button variant="outline" onClick={() => handleSubmit(true)} disabled={submitting}>
                                        <Save className="mr-2 h-4 w-4" /> {t('student.assignmentDetail.btnSaveDraft')}
                                    </Button>
                                    <div className="flex gap-2">
                                        <Button variant="secondary" onClick={handleAIProofread} disabled={proofreading || submitting || !content.trim()}>
                                            {proofreading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                            {t('student.assignmentDetail.btnAIProofread')}
                                        </Button>
                                        <Button onClick={() => handleSubmit(false)} disabled={submitting || !content} className="bg-indigo-600 hover:bg-indigo-700">
                                            {submitting ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />}
                                            {t('student.assignmentDetail.btnSubmitAssignment')}
                                        </Button>
                                    </div>
                                </>
                            )}
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </div>
    );
}
