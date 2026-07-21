// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle2, Loader2, RotateCcw, ShieldAlert, UserRoundCheck } from 'lucide-react';

import { academicAPI, Assessment, PromotionExceptionAction, PromotionExceptionsResponse } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type FilterValue = 'all' | string;

function parsePercent(raw: string): number | undefined {
    const value = raw.trim();
    if (!value) return undefined;
    const parsed = Number(value);
    if (Number.isNaN(parsed) || parsed < 0 || parsed > 100) {
        return undefined;
    }
    return parsed;
}

export default function PromotionExceptionsPage() {
    const [loadingAssessments, setLoadingAssessments] = useState(true);
    const [loadingRows, setLoadingRows] = useState(false);
    const [assessments, setAssessments] = useState<Assessment[]>([]);
    const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('');
    const [payload, setPayload] = useState<PromotionExceptionsResponse | null>(null);

    const [minScoreInput, setMinScoreInput] = useState('40');
    const [minAttendanceInput, setMinAttendanceInput] = useState('60');
    const [appliedMinScore, setAppliedMinScore] = useState<number | undefined>(40);
    const [appliedMinAttendance, setAppliedMinAttendance] = useState<number | undefined>(60);

    const [classFilter, setClassFilter] = useState<FilterValue>('all');
    const [sectionFilter, setSectionFilter] = useState<FilterValue>('all');
    const [reasonFilter, setReasonFilter] = useState<FilterValue>('all');
    const [decisionReason, setDecisionReason] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [pageSize, setPageSize] = useState(25);
    const [page, setPage] = useState(1);

    const [actionStudentId, setActionStudentId] = useState<string | null>(null);
    const [bulkActionLoading, setBulkActionLoading] = useState<PromotionExceptionAction | null>(null);
    const [reopening, setReopening] = useState(false);

    const selectedAssessment = useMemo(
        () => assessments.find((item) => item.id === selectedAssessmentId) || null,
        [assessments, selectedAssessmentId],
    );

    useEffect(() => {
        async function loadAssessments() {
            try {
                setLoadingAssessments(true);
                const all = await academicAPI.getAssessments();
                const finals = all
                    .filter((assessment) => Boolean(assessment.is_final_assessment))
                    .sort((a, b) => a.title.localeCompare(b.title));
                setAssessments(finals);
                if (finals.length > 0) {
                    setSelectedAssessmentId(finals[0].id);
                }
            } catch (error) {
                console.error('Failed to load assessments for promotion exceptions', error);
                toast.error('Failed to load final assessments');
            } finally {
                setLoadingAssessments(false);
            }
        }

        loadAssessments();
    }, []);

    async function loadRows(assessmentId: string) {
        if (!assessmentId) return;
        try {
            setLoadingRows(true);
            const response = await academicAPI.getPromotionExceptions(assessmentId, {
                academic_year: selectedAssessment?.academic_year ?? undefined,
                min_score_percentage: appliedMinScore,
                min_attendance_percentage: appliedMinAttendance,
                class: classFilter !== 'all' ? classFilter : undefined,
                section: sectionFilter !== 'all' ? sectionFilter : undefined,
                fail_reason: reasonFilter !== 'all' ? reasonFilter : undefined,
            });
            setPayload(response);
        } catch (error) {
            console.error('Failed to load promotion exception rows', error);
            toast.error('Failed to load promotion exceptions');
        } finally {
            setLoadingRows(false);
        }
    }

    useEffect(() => {
        if (!selectedAssessmentId) return;
        loadRows(selectedAssessmentId);
    }, [selectedAssessmentId, classFilter, sectionFilter, reasonFilter, appliedMinScore, appliedMinAttendance]);

    const sectionOptions = useMemo(() => {
        if (!payload) return [];
        if (classFilter === 'all') return payload.available_filters.sections;
        return payload.available_filters.sections.filter((section) => String(section.class_id) === classFilter);
    }, [payload, classFilter]);

    useEffect(() => {
        if (sectionFilter === 'all') return;
        const exists = sectionOptions.some((section) => String(section.id) === sectionFilter);
        if (!exists) {
            setSectionFilter('all');
        }
    }, [sectionOptions, sectionFilter]);

    function applyThresholds() {
        const score = parsePercent(minScoreInput);
        const attendance = parsePercent(minAttendanceInput);

        if (minScoreInput.trim() !== '' && score === undefined) {
            toast.error('Min score % must be between 0 and 100');
            return;
        }
        if (minAttendanceInput.trim() !== '' && attendance === undefined) {
            toast.error('Min attendance % must be between 0 and 100');
            return;
        }
        setAppliedMinScore(score);
        setAppliedMinAttendance(attendance);
    }

    async function handleStudentAction(studentId: string, action: PromotionExceptionAction) {
        if (!selectedAssessmentId) return;
        const reason = decisionReason.trim();
        if (!reason) {
            toast.error('Decision reason is required');
            return;
        }
        try {
            setActionStudentId(studentId);
            await academicAPI.decidePromotionException(selectedAssessmentId, {
                student_id: studentId,
                action,
                decision_reason: reason,
                academic_year: selectedAssessment?.academic_year ?? undefined,
                min_score_percentage: appliedMinScore,
                min_attendance_percentage: appliedMinAttendance,
            });
            toast.success(`Student decision updated: ${action}`);
            await loadRows(selectedAssessmentId);
        } catch (error) {
            console.error('Failed to update student promotion decision', error);
            toast.error('Failed to update student decision');
        } finally {
            setActionStudentId(null);
        }
    }

    async function handleBulkAction(action: PromotionExceptionAction) {
        if (!selectedAssessmentId) return;
        const reason = decisionReason.trim();
        if (!reason) {
            toast.error('Decision reason is required');
            return;
        }
        try {
            setBulkActionLoading(action);
            const response = await academicAPI.bulkPromotionExceptions(selectedAssessmentId, {
                action,
                decision_reason: reason,
                academic_year: selectedAssessment?.academic_year ?? undefined,
                class: classFilter !== 'all' ? classFilter : undefined,
                section: sectionFilter !== 'all' ? sectionFilter : undefined,
                fail_reason: reasonFilter !== 'all' ? reasonFilter : undefined,
                min_score_percentage: appliedMinScore,
                min_attendance_percentage: appliedMinAttendance,
            });
            toast.success(`${response.updated} students updated`);
            await loadRows(selectedAssessmentId);
        } catch (error) {
            console.error('Failed to run bulk promotion decision', error);
            toast.error('Failed to run bulk action');
        } finally {
            setBulkActionLoading(null);
        }
    }

    async function handleReopenResults() {
        if (!selectedAssessmentId) return;
        const reason = decisionReason.trim();
        if (!reason) {
            toast.error('Reopen reason is required');
            return;
        }

        try {
            setReopening(true);
            const response = await academicAPI.reopenAssessmentResults(selectedAssessmentId, {
                reason,
                academic_year: selectedAssessment?.academic_year ?? undefined,
            });
            if (response.reopened) {
                toast.success('Results reopened. You can now edit promotion decisions.');
            } else {
                toast.success('Results reopened');
            }
            await loadRows(selectedAssessmentId);
        } catch (error) {
            console.error('Failed to reopen results', error);
            toast.error('Failed to reopen results');
        } finally {
            setReopening(false);
        }
    }

    const summary = payload?.summary;
    const isLocked = Boolean(payload?.locked);
    const filteredStudents = useMemo(() => {
        const rows = payload?.students || [];
        const term = searchTerm.trim().toLowerCase();
        if (!term) return rows;
        return rows.filter((row) => {
            const haystack = [
                row.student_name,
                row.student_id,
                row.class_name || '',
                row.section_name || '',
                row.hold_reason_label || '',
                row.recommended_action,
                row.effective_action,
                row.decision?.decision_reason || '',
            ]
                .join(' ')
                .toLowerCase();
            return haystack.includes(term);
        });
    }, [payload?.students, searchTerm]);
    const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
    const currentPage = Math.min(page, totalPages);
    const pagedStudents = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredStudents.slice(start, start + pageSize);
    }, [filteredStudents, currentPage, pageSize]);

    useEffect(() => {
        setPage(1);
    }, [searchTerm, pageSize, selectedAssessmentId, classFilter, sectionFilter, reasonFilter]);

    if (loadingAssessments) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6 p-4 md:p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
                        <ShieldAlert className="h-6 w-6 text-indigo-600" />
                        Promotion Exception Center
                    </h1>
                    <p className="text-sm text-slate-500">
                        Review final result promotion outcomes and override student decisions before publish.
                    </p>
                </div>
                <Link href="/admin/academic/assessments">
                    <Button variant="outline" className="gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Assessments
                    </Button>
                </Link>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Selection & Rules</CardTitle>
                    <CardDescription>Choose final assessment, threshold rules, and exception filters.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-6">
                    {isLocked ? (
                        <div className="md:col-span-6 flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                            <span>{payload?.lock_reason || 'Decisions are locked for this assessment.'}</span>
                            <Button
                                size="sm"
                                onClick={handleReopenResults}
                                disabled={reopening}
                                className="bg-amber-600 hover:bg-amber-700"
                            >
                                {reopening ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
                                Reopen Results
                            </Button>
                        </div>
                    ) : null}
                    <div className="grid gap-2 md:col-span-2">
                        <Label>Final Assessment</Label>
                        <Select value={selectedAssessmentId} onValueChange={setSelectedAssessmentId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select final assessment" />
                            </SelectTrigger>
                            <SelectContent>
                                {assessments.length > 0 ? assessments.map((assessment) => (
                                    <SelectItem key={assessment.id} value={assessment.id}>
                                        {assessment.title}
                                    </SelectItem>
                                )) : (
                                    <div className="p-2 text-sm text-slate-500">No final assessments found.</div>
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label>Min Score %</Label>
                        <Input value={minScoreInput} onChange={(event) => setMinScoreInput(event.target.value)} />
                    </div>
                    <div className="grid gap-2">
                        <Label>Min Attendance %</Label>
                        <Input value={minAttendanceInput} onChange={(event) => setMinAttendanceInput(event.target.value)} />
                    </div>
                    <div className="grid gap-2">
                        <Label>Class</Label>
                        <Select value={classFilter} onValueChange={setClassFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="All classes" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Classes</SelectItem>
                                {(payload?.available_filters.classes || []).map((item) => (
                                    <SelectItem key={item.id} value={String(item.id)}>
                                        {item.name} ({item.count})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label>Section</Label>
                        <Select value={sectionFilter} onValueChange={setSectionFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="All sections" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Sections</SelectItem>
                                {sectionOptions.map((item) => (
                                    <SelectItem key={item.id} value={String(item.id)}>
                                        {item.name} ({item.count})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label>Fail Reason</Label>
                        <Select value={reasonFilter} onValueChange={setReasonFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="All reasons" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Reasons</SelectItem>
                                {(payload?.available_filters.fail_reasons || []).map((item) => (
                                    <SelectItem key={item.code} value={item.code}>
                                        {item.label} ({item.count})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="md:col-span-6 flex flex-wrap items-center gap-2">
                        <div className="w-full md:max-w-md">
                            <Label htmlFor="decision_reason" className="mb-2 block">Decision / Reopen Reason (Required)</Label>
                            <Input
                                id="decision_reason"
                                value={decisionReason}
                                onChange={(event) => setDecisionReason(event.target.value)}
                                placeholder="e.g. Approved by exam committee after re-evaluation"
                            />
                        </div>
                    </div>
                    {payload?.publication_audit && payload.publication_audit.length > 0 ? (
                        <div className="md:col-span-6 rounded-md border border-slate-200 bg-slate-50 p-3">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Recent Result Status Changes</p>
                            <div className="space-y-1 text-xs text-slate-600">
                                {payload.publication_audit.slice(0, 3).map((event, index) => (
                                    <p key={`${event.action}-${event.created_at}-${index}`}>
                                        <span className="font-semibold">{event.action.toUpperCase()}</span>
                                        {' • '}
                                        {(event.performed_by_name || event.performed_by || 'Unknown')}
                                        {' • '}
                                        {new Date(event.created_at).toLocaleString()}
                                        {event.reason ? ` • ${event.reason}` : ''}
                                    </p>
                                ))}
                            </div>
                        </div>
                    ) : null}
                    <div className="md:col-span-6 flex flex-wrap items-center gap-2">
                        <Button onClick={applyThresholds} variant="outline">Apply Rules</Button>
                        <Button
                            onClick={() => handleBulkAction('promote')}
                            disabled={loadingRows || bulkActionLoading !== null || isLocked}
                            className="bg-emerald-600 hover:bg-emerald-700"
                        >
                            {bulkActionLoading === 'promote' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Bulk Approve
                        </Button>
                        <Button
                            onClick={() => handleBulkAction('hold')}
                            disabled={loadingRows || bulkActionLoading !== null || isLocked}
                            variant="secondary"
                        >
                            {bulkActionLoading === 'hold' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Bulk Hold
                        </Button>
                        <Button
                            onClick={() => handleBulkAction('override')}
                            disabled={loadingRows || bulkActionLoading !== null || isLocked}
                            variant="outline"
                        >
                            {bulkActionLoading === 'override' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Bulk Override
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardContent className="p-5">
                        <p className="text-xs uppercase tracking-wide text-slate-500">Students</p>
                        <p className="text-2xl font-bold text-slate-900">{summary?.total_students ?? 0}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-5">
                        <p className="text-xs uppercase tracking-wide text-slate-500">Recommended Hold</p>
                        <p className="text-2xl font-bold text-amber-600">{summary?.recommended_hold ?? 0}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-5">
                        <p className="text-xs uppercase tracking-wide text-slate-500">Decided Hold</p>
                        <p className="text-2xl font-bold text-rose-600">{summary?.decided_hold ?? 0}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-5">
                        <p className="text-xs uppercase tracking-wide text-slate-500">Overrides</p>
                        <p className="text-2xl font-bold text-indigo-600">{summary?.overrides ?? 0}</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <UserRoundCheck className="h-5 w-5 text-indigo-600" />
                        Student Decision Queue
                    </CardTitle>
                    <CardDescription>
                        Promote / Hold / Override per student. Saved decisions will apply automatically during final result publish.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                        <Input
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="Search student, class, section, reason..."
                            className="w-full md:max-w-sm"
                        />
                        <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
                            <SelectTrigger className="w-[140px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="10">10 / page</SelectItem>
                                <SelectItem value="25">25 / page</SelectItem>
                                <SelectItem value="50">50 / page</SelectItem>
                                <SelectItem value="100">100 / page</SelectItem>
                            </SelectContent>
                        </Select>
                        <div className="text-xs text-slate-500">
                            Showing {pagedStudents.length} of {filteredStudents.length} matched students
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Student</TableHead>
                                    <TableHead>Class</TableHead>
                                    <TableHead>Score %</TableHead>
                                    <TableHead>Attendance %</TableHead>
                                    <TableHead>Recommended</TableHead>
                                    <TableHead>Effective</TableHead>
                                    <TableHead>Fail Reason</TableHead>
                                    <TableHead>Latest Change</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loadingRows ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="h-28 text-center">
                                            <Loader2 className="mx-auto h-5 w-5 animate-spin text-indigo-600" />
                                        </TableCell>
                                    </TableRow>
                                ) : pagedStudents.length ? pagedStudents.map((row) => (
                                    <TableRow key={row.student_id}>
                                        <TableCell>
                                            <p className="font-semibold text-slate-900">{row.student_name}</p>
                                            <p className="text-xs text-slate-500">{row.student_id}</p>
                                        </TableCell>
                                        <TableCell>
                                            <p>{row.class_name || 'N/A'}</p>
                                            <p className="text-xs text-slate-500">{row.section_name || 'No section'}</p>
                                        </TableCell>
                                        <TableCell>{row.average_score_percentage ?? 'N/A'}</TableCell>
                                        <TableCell>{row.attendance_percentage ?? 'N/A'}</TableCell>
                                        <TableCell>
                                            <Badge variant={row.recommended_action === 'promote' ? 'default' : 'secondary'}>
                                                {row.recommended_action}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                className={
                                                    row.effective_action === 'promote'
                                                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                                                        : 'bg-rose-100 text-rose-700 hover:bg-rose-100'
                                                }
                                            >
                                                {row.effective_action}
                                            </Badge>
                                            {row.is_override ? (
                                                <p className="mt-1 text-[11px] font-medium text-indigo-600">Override</p>
                                            ) : null}
                                        </TableCell>
                                        <TableCell>
                                            {row.hold_reason_label ? (
                                                <span className="text-sm text-slate-700">{row.hold_reason_label}</span>
                                            ) : (
                                                <span className="text-sm text-slate-400">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {row.history && row.history.length > 0 ? (
                                                <div className="space-y-1 text-xs">
                                                    <p className="font-medium text-slate-700">
                                                        {(row.history[0].decided_by_name || row.history[0].decided_by || 'Unknown')}
                                                        {' • '}
                                                        {new Date(row.history[0].created_at).toLocaleString()}
                                                    </p>
                                                    <p className="text-slate-600">
                                                        {(row.history[0].previous_decision || 'none')}
                                                        {' -> '}
                                                        {(row.history[0].new_decision || 'none')}
                                                    </p>
                                                    <p className="text-slate-500">{row.history[0].decision_reason}</p>
                                                </div>
                                            ) : (
                                                <span className="text-sm text-slate-400">No changes</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleStudentAction(row.student_id, 'promote')}
                                                    disabled={actionStudentId === row.student_id || isLocked}
                                                >
                                                    {actionStudentId === row.student_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Promote'}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleStudentAction(row.student_id, 'hold')}
                                                    disabled={actionStudentId === row.student_id || isLocked}
                                                >
                                                    {actionStudentId === row.student_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Hold'}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleStudentAction(row.student_id, 'override')}
                                                    disabled={actionStudentId === row.student_id || isLocked}
                                                >
                                                    {actionStudentId === row.student_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Override'}
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={9} className="h-24 text-center text-slate-500">
                                            No students match the current filters/search.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                        <div className="text-xs text-slate-500">
                            Page {currentPage} of {totalPages}
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={currentPage <= 1}
                                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={currentPage >= totalPages}
                                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="flex items-center gap-2 text-xs text-slate-500">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Decisions saved here are automatically merged when publishing final results.
            </div>
        </div>
    );
}
