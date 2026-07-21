// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { academicAPI, aiAPI, AtRiskStudent, Student, StudentProfileOverview } from '@/lib/api';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, BarChart3, BookOpen, ClipboardList, Loader2, Target, Trophy } from 'lucide-react';
import { toast } from 'sonner';

interface StudentProfileOverviewDialogProps {
    student: Student | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    headerAction?: ReactNode;
}

function formatDate(value: string | null | undefined): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString();
}

function statusBadgeClass(status: string): string {
    switch (status) {
        case 'graded':
            return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100';
        case 'submitted':
            return 'bg-blue-100 text-blue-700 hover:bg-blue-100';
        case 'late':
            return 'bg-red-100 text-red-700 hover:bg-red-100';
        case 'draft':
            return 'bg-slate-100 text-slate-700 hover:bg-slate-100';
        default:
            return 'bg-amber-100 text-amber-700 hover:bg-amber-100';
    }
}

export function StudentProfileOverviewDialog({ student, open, onOpenChange, headerAction }: StudentProfileOverviewDialogProps) {
    const [loading, setLoading] = useState(false);
    const [overview, setOverview] = useState<StudentProfileOverview | null>(null);
    const [riskInsight, setRiskInsight] = useState<AtRiskStudent | null>(null);

    useEffect(() => {
        if (!open || !student?.id) {
            setOverview(null);
            setRiskInsight(null);
            setLoading(false);
            return;
        }

        let cancelled = false;

        const loadOverview = async () => {
            setLoading(true);
            try {
                const payload = await academicAPI.getStudentProfileOverview(student.id);
                if (!cancelled) {
                    setOverview(payload);
                }
                const classId = Number(payload?.student?.class_id || student?.academic_class || 0);
                if (classId > 0) {
                    try {
                        const riskRows = await aiAPI.getAtRiskStudents(classId, false);
                        if (!cancelled) {
                            const selected = riskRows.find((row) => {
                                const target = String(student.id || student.student_id || '').toLowerCase();
                                return String(row.student_id || '').toLowerCase() === target;
                            }) || null;
                            setRiskInsight(selected);
                        }
                    } catch (_err) {
                        if (!cancelled) {
                            setRiskInsight(null);
                        }
                    }
                } else if (!cancelled) {
                    setRiskInsight(null);
                }
            } catch (error) {
                console.error('Failed to load student profile overview:', error);
                if (!cancelled) {
                    setOverview(null);
                    setRiskInsight(null);
                    toast.error('Failed to load student profile details.');
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        loadOverview();
        return () => {
            cancelled = true;
        };
    }, [open, student?.id]);

    const fullName = useMemo(() => {
        const first = overview?.student.first_name || student?.first_name || '';
        const last = overview?.student.last_name || student?.last_name || '';
        const joined = `${first} ${last}`.trim();
        return joined || 'Student';
    }, [overview?.student.first_name, overview?.student.last_name, student?.first_name, student?.last_name]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <DialogTitle className="text-xl">Student Profile</DialogTitle>
                            <DialogDescription>
                                Detailed performance view for {fullName}
                            </DialogDescription>
                        </div>
                        {headerAction}
                    </div>
                </DialogHeader>

                {loading && (
                    <div className="flex items-center justify-center py-12 text-slate-500">
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        Loading profile analytics...
                    </div>
                )}

                {!loading && !overview && (
                    <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-slate-500">
                        Student analytics are not available right now.
                    </div>
                )}

                {!loading && overview && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card className="border-slate-200">
                                <CardContent className="p-4 space-y-1">
                                    <p className="text-xs uppercase tracking-wide text-slate-500">Student</p>
                                    <p className="font-semibold text-slate-900">{fullName}</p>
                                    <p className="text-sm text-slate-500">{overview.student.email}</p>
                                    <p className="text-xs text-slate-500">
                                        {overview.student.class_name || '-'} {overview.student.section_name ? `• Section ${overview.student.section_name}` : ''}
                                    </p>
                                </CardContent>
                            </Card>
                            <Card className="border-slate-200">
                                <CardContent className="p-4">
                                    <div className="flex items-center text-slate-600 text-xs mb-2"><Target className="h-3.5 w-3.5 mr-1" /> Overall Progress</div>
                                    <p className="text-2xl font-semibold text-slate-900">{overview.overall.progress_percentage}%</p>
                                    <p className="text-xs text-slate-500">{overview.overall.completed_lessons}/{overview.overall.total_lessons} lessons completed</p>
                                    <Progress value={overview.overall.progress_percentage} className="mt-2 h-2" />
                                </CardContent>
                            </Card>
                            <Card className="border-slate-200">
                                <CardContent className="p-4 space-y-1">
                                    <div className="flex items-center text-slate-600 text-xs"><Trophy className="h-3.5 w-3.5 mr-1" /> Performance</div>
                                    <p className="text-2xl font-semibold text-slate-900">{overview.overall.average_score_percentage}%</p>
                                    <p className="text-xs text-slate-500">Avg score across {overview.recent_results.length} result(s)</p>
                                    <p className="text-xs text-slate-500">
                                        Assignments: {overview.overall.submitted_assignments}/{overview.overall.total_assignments} submitted
                                    </p>
                                </CardContent>
                            </Card>
                        </div>

                        <Card className="border-slate-200">
                            <CardContent className="p-4">
                                <h3 className="font-semibold text-slate-900 mb-3 flex items-center">
                                    <BookOpen className="h-4 w-4 mr-2 text-indigo-600" /> All Subject Progress
                                </h3>
                                <div className="space-y-3">
                                    {overview.subject_progress.length === 0 && (
                                        <p className="text-sm text-slate-500">No subject progress data available.</p>
                                    )}
                                    {overview.subject_progress.map((subject) => (
                                        <div key={subject.subject_id} className="rounded-lg border border-slate-200 p-3">
                                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                                                <div>
                                                    <p className="font-medium text-slate-900">{subject.subject_name}</p>
                                                    <p className="text-xs text-slate-500">
                                                        Lessons {subject.completed_lessons}/{subject.total_lessons} • Assessments {subject.assessments_completed}/{subject.assessments_total}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-semibold text-indigo-700">{subject.progress_percentage}%</p>
                                                    <p className="text-xs text-slate-500">Avg score {subject.average_score_percentage}%</p>
                                                </div>
                                            </div>
                                            <Progress value={subject.progress_percentage} className="mt-2 h-2" />
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                            <Card className="border-slate-200">
                                <CardContent className="p-4">
                                    <h3 className="font-semibold text-slate-900 mb-3 flex items-center">
                                        <BarChart3 className="h-4 w-4 mr-2 text-emerald-600" /> Recent Results
                                    </h3>
                                    {overview.recent_results.length === 0 ? (
                                        <p className="text-sm text-slate-500">No results found.</p>
                                    ) : (
                                        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                                            {overview.recent_results.map((result) => (
                                                <div key={result.result_id} className="rounded-lg border border-slate-200 p-3">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div>
                                                            <p className="font-medium text-slate-900">{result.assessment_title}</p>
                                                            <p className="text-xs text-slate-500">{result.subject_name} • {result.assessment_type}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="font-semibold text-slate-900">{result.score}/{result.total_marks}</p>
                                                            <p className="text-xs text-slate-500">{result.percentage}%</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="border-slate-200">
                                <CardContent className="p-4">
                                    <h3 className="font-semibold text-slate-900 mb-3 flex items-center">
                                        <ClipboardList className="h-4 w-4 mr-2 text-orange-600" /> Assignments
                                    </h3>
                                    {overview.assignments.length === 0 ? (
                                        <p className="text-sm text-slate-500">No assignments found.</p>
                                    ) : (
                                        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                                            {overview.assignments.map((assignment) => (
                                                <div key={assignment.assessment_id} className="rounded-lg border border-slate-200 p-3">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div>
                                                            <p className="font-medium text-slate-900">{assignment.title}</p>
                                                            <p className="text-xs text-slate-500">{assignment.subject_name} • Due {formatDate(assignment.due_date)}</p>
                                                        </div>
                                                        <Badge className={statusBadgeClass(assignment.status)}>
                                                            {assignment.status}
                                                        </Badge>
                                                    </div>
                                                    {assignment.score !== null && (
                                                        <p className="text-xs text-slate-600 mt-2">
                                                            Score: {assignment.score}/{assignment.total_marks} ({assignment.percentage ?? 0}%)
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        <Card className="border-slate-200">
                            <CardContent className="p-4">
                                <h3 className="font-semibold text-slate-900 mb-3 flex items-center">
                                    <AlertCircle className="h-4 w-4 mr-2 text-rose-600" /> Student Analytics
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                    <div className="rounded-lg border border-slate-200 p-3">
                                        <p className="text-xs text-slate-500">Best Subject</p>
                                        <p className="font-medium text-slate-900">
                                            {overview.analytics.best_subject?.subject_name || '-'}
                                        </p>
                                    </div>
                                    <div className="rounded-lg border border-slate-200 p-3">
                                        <p className="text-xs text-slate-500">Needs Improvement</p>
                                        <p className="font-medium text-slate-900">
                                            {overview.analytics.weakest_subject?.subject_name || '-'}
                                        </p>
                                    </div>
                                    <div className="rounded-lg border border-slate-200 p-3">
                                        <p className="text-xs text-slate-500">Momentum</p>
                                        <p className="font-medium text-slate-900 capitalize">{overview.analytics.momentum_label.replace('_', ' ')}</p>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-500 mt-3">
                                    Attention subjects: {overview.analytics.needs_attention_subjects.length > 0 ? overview.analytics.needs_attention_subjects.join(', ') : 'None'}
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="border-slate-200">
                            <CardContent className="p-4">
                                <h3 className="font-semibold text-slate-900 mb-3 flex items-center">
                                    <AlertCircle className="h-4 w-4 mr-2 text-orange-600" /> Risk Insights (Teacher)
                                </h3>
                                {!riskInsight ? (
                                    <p className="text-sm text-slate-500">No high-risk alerts for this student in the selected class.</p>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between rounded-lg border border-orange-100 bg-orange-50/40 p-3">
                                            <p className="text-sm font-medium text-slate-900">Risk Score</p>
                                            <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">
                                                {riskInsight.risk_score}/100
                                            </Badge>
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Reasons</p>
                                            <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
                                                {(riskInsight.reasons || []).map((reason, idx) => (
                                                    <li key={`risk-reason-${idx}`}>{reason}</li>
                                                ))}
                                            </ul>
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Suggested Actions</p>
                                            <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
                                                {(riskInsight.suggested_actions || []).map((item, idx) => (
                                                    <li key={`risk-action-${idx}`}>{item}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
