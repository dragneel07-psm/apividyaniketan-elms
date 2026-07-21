// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { appraisalAPI, AppraisalCycle, AppraisalForm } from '@/lib/api';
import { toast } from 'sonner';
import {
    Award,
    ClipboardList,
    Users,
    Star,
    CheckCircle2,
    Clock,
    XCircle,
    Loader2,
    Plus,
} from 'lucide-react';

// ── Status helpers ──────────────────────────────────────────────────────────

const CYCLE_STATUS: Record<string, { label: string; color: string }> = {
    draft: { label: 'Draft', color: 'bg-slate-100 text-slate-600 border-slate-200' },
    active: { label: 'Active', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    closed: { label: 'Closed', color: 'bg-slate-200 text-slate-500 border-slate-300' },
};

const FORM_STATUS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    pending: {
        label: 'Pending',
        color: 'bg-amber-100 text-amber-700 border-amber-200',
        icon: <Clock className="h-3.5 w-3.5" />,
    },
    self_reviewed: {
        label: 'Self-Reviewed',
        color: 'bg-blue-100 text-blue-700 border-blue-200',
        icon: <ClipboardList className="h-3.5 w-3.5" />,
    },
    completed: {
        label: 'Completed',
        color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    },
};

// ── Score slider row ────────────────────────────────────────────────────────

function ScoreInput({
    label,
    name,
    value,
    onChange,
}: {
    label: string;
    name: string;
    value: number;
    onChange: (name: string, val: number) => void;
}) {
    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between">
                <Label className="text-xs text-slate-600">{label}</Label>
                <span className="text-xs font-bold text-violet-700 w-6 text-right">{value}</span>
            </div>
            <div className="flex items-center gap-2">
                <input
                    type="range"
                    min={1}
                    max={5}
                    step={1}
                    value={value}
                    onChange={(e) => onChange(name, Number(e.target.value))}
                    className="w-full accent-violet-600"
                />
                <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                            key={n}
                            className={`h-3 w-3 ${n <= value ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

// ── Main component ──────────────────────────────────────────────────────────

export function AppraisalManager() {
    // Cycles state
    const [cycles, setCycles] = useState<AppraisalCycle[]>([]);
    const [cyclesLoading, setCyclesLoading] = useState(true);
    const [selectedCycle, setSelectedCycle] = useState<AppraisalCycle | null>(null);

    // Forms state
    const [forms, setForms] = useState<AppraisalForm[]>([]);
    const [formsLoading, setFormsLoading] = useState(false);

    // Dialogs
    const [newCycleOpen, setNewCycleOpen] = useState(false);
    const [newFormOpen, setNewFormOpen] = useState(false);
    const [completeFormOpen, setCompleteFormOpen] = useState(false);
    const [targetForm, setTargetForm] = useState<AppraisalForm | null>(null);

    // New cycle form
    const [cycleName, setCycleName] = useState('');
    const [cyclePeriodStart, setCyclePeriodStart] = useState('');
    const [cyclePeriodEnd, setCyclePeriodEnd] = useState('');
    const [cycleSubmitting, setCycleSubmitting] = useState(false);

    // New form (add appraisee)
    const [formEmployee, setFormEmployee] = useState('');
    const [formSubmitting, setFormSubmitting] = useState(false);

    // Complete form scores
    const [scores, setScores] = useState({
        punctuality: 3,
        subject_knowledge: 3,
        student_engagement: 3,
        communication: 3,
        teamwork: 3,
    });
    const [reviewerComments, setReviewerComments] = useState('');
    const [goalsNextPeriod, setGoalsNextPeriod] = useState('');
    const [completeSubmitting, setCompleteSubmitting] = useState(false);

    // ── Load cycles ──

    const loadCycles = async () => {
        setCyclesLoading(true);
        try {
            const data = await appraisalAPI.getCycles();
            setCycles(Array.isArray(data) ? data : []);
        } catch {
            setCycles([]);
            toast.error('Failed to load appraisal cycles');
        } finally {
            setCyclesLoading(false);
        }
    };

    useEffect(() => {
        loadCycles();
    }, []);

    // ── Load forms for selected cycle ──

    const loadForms = async (cycleId: string) => {
        setFormsLoading(true);
        try {
            const data = await appraisalAPI.getForms({ cycle: cycleId });
            setForms(Array.isArray(data) ? data : []);
        } catch {
            setForms([]);
            toast.error('Failed to load appraisal forms');
        } finally {
            setFormsLoading(false);
        }
    };

    const handleSelectCycle = (cycle: AppraisalCycle) => {
        setSelectedCycle(cycle);
        loadForms(cycle.cycle_id);
    };

    // ── Cycle actions ──

    const handleActivateCycle = async (cycle: AppraisalCycle) => {
        try {
            await appraisalAPI.activateCycle(cycle.cycle_id);
            toast.success(`Cycle "${cycle.name}" activated`);
            loadCycles();
            if (selectedCycle?.cycle_id === cycle.cycle_id) {
                setSelectedCycle({ ...cycle, status: 'active' });
            }
        } catch {
            toast.error('Failed to activate cycle');
        }
    };

    const handleCloseCycle = async (cycle: AppraisalCycle) => {
        try {
            await appraisalAPI.closeCycle(cycle.cycle_id);
            toast.success(`Cycle "${cycle.name}" closed`);
            loadCycles();
            if (selectedCycle?.cycle_id === cycle.cycle_id) {
                setSelectedCycle({ ...cycle, status: 'closed' });
            }
        } catch {
            toast.error('Failed to close cycle');
        }
    };

    const handleCreateCycle = async () => {
        if (!cycleName.trim() || !cyclePeriodStart || !cyclePeriodEnd) {
            toast.error('Please fill all required fields');
            return;
        }
        setCycleSubmitting(true);
        try {
            await appraisalAPI.createCycle({
                name: cycleName.trim(),
                period_start: cyclePeriodStart,
                period_end: cyclePeriodEnd,
            });
            toast.success('Appraisal cycle created');
            setCycleName('');
            setCyclePeriodStart('');
            setCyclePeriodEnd('');
            setNewCycleOpen(false);
            loadCycles();
        } catch {
            toast.error('Failed to create cycle');
        } finally {
            setCycleSubmitting(false);
        }
    };

    // ── Form actions ──

    const handleAddForm = async () => {
        if (!selectedCycle || !formEmployee.trim()) {
            toast.error('Employee ID is required');
            return;
        }
        setFormSubmitting(true);
        try {
            await appraisalAPI.createForm({
                cycle: selectedCycle.cycle_id,
                employee: formEmployee.trim(),
            });
            toast.success('Appraisal form added');
            setFormEmployee('');
            setNewFormOpen(false);
            loadForms(selectedCycle.cycle_id);
        } catch {
            toast.error('Failed to add appraisal form');
        } finally {
            setFormSubmitting(false);
        }
    };

    const openCompleteDialog = (form: AppraisalForm) => {
        setTargetForm(form);
        setScores({
            punctuality: form.punctuality ?? 3,
            subject_knowledge: form.subject_knowledge ?? 3,
            student_engagement: form.student_engagement ?? 3,
            communication: form.communication ?? 3,
            teamwork: form.teamwork ?? 3,
        });
        setReviewerComments(form.reviewer_comments ?? '');
        setGoalsNextPeriod(form.goals_next_period ?? '');
        setCompleteFormOpen(true);
    };

    const handleCompleteAppraisal = async () => {
        if (!targetForm) return;
        setCompleteSubmitting(true);
        try {
            await appraisalAPI.completeAppraisal(targetForm.form_id, {
                ...scores,
                reviewer_comments: reviewerComments,
                goals_next_period: goalsNextPeriod,
            });
            toast.success('Appraisal completed');
            setCompleteFormOpen(false);
            setTargetForm(null);
            if (selectedCycle) loadForms(selectedCycle.cycle_id);
        } catch {
            toast.error('Failed to complete appraisal');
        } finally {
            setCompleteSubmitting(false);
        }
    };

    const handleScoreChange = (name: string, val: number) => {
        setScores((prev) => ({ ...prev, [name]: val }));
    };

    // ── Render ──

    return (
        <div className="space-y-6">
            {/* Header row */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-violet-600" />
                    <h2 className="text-xl font-black text-slate-900">Staff Appraisals</h2>
                </div>
                <Button
                    size="sm"
                    onClick={() => setNewCycleOpen(true)}
                    className="bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl gap-1.5"
                >
                    <Plus className="h-3.5 w-3.5" /> New Cycle
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* ── Left: Cycles list ── */}
                <Card className="border border-slate-200 shadow-sm rounded-2xl">
                    <CardHeader className="pb-3 border-b border-slate-100">
                        <CardTitle className="text-sm font-black text-slate-700 flex items-center gap-2">
                            <ClipboardList className="h-4 w-4 text-violet-500" />
                            Appraisal Cycles
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {cyclesLoading ? (
                            <div className="flex justify-center items-center py-12">
                                <Loader2 className="h-5 w-5 animate-spin text-violet-400" />
                            </div>
                        ) : cycles.length === 0 ? (
                            <div className="text-center py-12 text-slate-400 text-sm">
                                No appraisal cycles found. Create one to get started.
                            </div>
                        ) : (
                            <ul className="divide-y divide-slate-50">
                                {cycles.map((cycle) => {
                                    const sc = CYCLE_STATUS[cycle.status] ?? CYCLE_STATUS.draft;
                                    const isSelected = selectedCycle?.cycle_id === cycle.cycle_id;
                                    return (
                                        <li
                                            key={cycle.cycle_id}
                                            onClick={() => handleSelectCycle(cycle)}
                                            className={`px-4 py-3.5 cursor-pointer transition-colors ${
                                                isSelected
                                                    ? 'bg-violet-50 border-l-2 border-violet-500'
                                                    : 'hover:bg-slate-50'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-slate-800 truncate">
                                                        {cycle.name}
                                                    </p>
                                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                                        {cycle.period_start} — {cycle.period_end}
                                                    </p>
                                                    <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                                                        <Users className="h-3 w-3" />
                                                        {cycle.form_count} form{cycle.form_count !== 1 ? 's' : ''}
                                                    </p>
                                                </div>
                                                <div className="flex flex-col items-end gap-2 shrink-0">
                                                    <Badge
                                                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sc.color}`}
                                                    >
                                                        {sc.label}
                                                    </Badge>
                                                    <div className="flex gap-1">
                                                        {cycle.status === 'draft' && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleActivateCycle(cycle);
                                                                }}
                                                                className="text-[10px] h-6 px-2 rounded-lg border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                                            >
                                                                Activate
                                                            </Button>
                                                        )}
                                                        {cycle.status === 'active' && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleCloseCycle(cycle);
                                                                }}
                                                                className="text-[10px] h-6 px-2 rounded-lg border-slate-300 text-slate-600 hover:bg-slate-100"
                                                            >
                                                                <XCircle className="h-3 w-3 mr-1" />
                                                                Close
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </CardContent>
                </Card>

                {/* ── Right: Forms list ── */}
                <Card className="border border-slate-200 shadow-sm rounded-2xl">
                    <CardHeader className="pb-3 border-b border-slate-100">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-black text-slate-700 flex items-center gap-2">
                                <Users className="h-4 w-4 text-violet-500" />
                                {selectedCycle ? `${selectedCycle.name} — Forms` : 'Select a cycle'}
                            </CardTitle>
                            {selectedCycle && (
                                <Button
                                    size="sm"
                                    onClick={() => setNewFormOpen(true)}
                                    className="bg-violet-600 hover:bg-violet-700 text-white text-[10px] font-bold rounded-xl h-7 px-2.5 gap-1"
                                >
                                    <Plus className="h-3 w-3" /> Add Form
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {!selectedCycle ? (
                            <div className="text-center py-12 text-slate-400 text-sm">
                                Click a cycle on the left to view its appraisal forms.
                            </div>
                        ) : formsLoading ? (
                            <div className="flex justify-center items-center py-12">
                                <Loader2 className="h-5 w-5 animate-spin text-violet-400" />
                            </div>
                        ) : forms.length === 0 ? (
                            <div className="text-center py-12 text-slate-400 text-sm">
                                No forms in this cycle yet.
                            </div>
                        ) : (
                            <ul className="divide-y divide-slate-50">
                                {forms.map((form) => {
                                    const fs = FORM_STATUS[form.status] ?? FORM_STATUS.pending;
                                    return (
                                        <li key={form.form_id} className="px-4 py-3.5">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-slate-800">
                                                        {form.employee_name || form.employee}
                                                    </p>
                                                    {form.overall_score !== undefined && form.overall_score !== null && (
                                                        <div className="flex items-center gap-1 mt-0.5">
                                                            <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                                                            <span className="text-[11px] font-bold text-amber-600">
                                                                {Number(form.overall_score).toFixed(1)} / 5
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div className="text-[11px] text-slate-400 mt-0.5 space-y-0.5">
                                                        {form.submitted_at && (
                                                            <p>Submitted: {new Date(form.submitted_at).toLocaleDateString()}</p>
                                                        )}
                                                        {form.completed_at && (
                                                            <p>Completed: {new Date(form.completed_at).toLocaleDateString()}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-2 shrink-0">
                                                    <Badge
                                                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${fs.color}`}
                                                    >
                                                        {fs.icon}
                                                        {fs.label}
                                                    </Badge>
                                                    {form.status !== 'completed' && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => openCompleteDialog(form)}
                                                            className="text-[10px] h-6 px-2 rounded-lg border-violet-200 text-violet-700 hover:bg-violet-50"
                                                        >
                                                            <CheckCircle2 className="h-3 w-3 mr-1" />
                                                            Complete
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* ── New Cycle Dialog ── */}
            <Dialog open={newCycleOpen} onOpenChange={setNewCycleOpen}>
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-slate-800">
                            <Award className="h-5 w-5 text-violet-600" />
                            New Appraisal Cycle
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-600">Cycle Name *</Label>
                            <Input
                                placeholder="e.g. 2025-26 Annual Review"
                                value={cycleName}
                                onChange={(e) => setCycleName(e.target.value)}
                                className="rounded-xl"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-600">Period Start *</Label>
                                <Input
                                    type="date"
                                    value={cyclePeriodStart}
                                    onChange={(e) => setCyclePeriodStart(e.target.value)}
                                    className="rounded-xl"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-600">Period End *</Label>
                                <Input
                                    type="date"
                                    value={cyclePeriodEnd}
                                    onChange={(e) => setCyclePeriodEnd(e.target.value)}
                                    className="rounded-xl"
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setNewCycleOpen(false)}
                            className="rounded-xl"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreateCycle}
                            disabled={cycleSubmitting}
                            className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl gap-1.5"
                        >
                            {cycleSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                            Create Cycle
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Add Form Dialog ── */}
            <Dialog open={newFormOpen} onOpenChange={setNewFormOpen}>
                <DialogContent className="max-w-sm rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-slate-800">
                            <Users className="h-5 w-5 text-violet-600" />
                            Add Appraisal Form
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <p className="text-xs text-slate-500">
                            Cycle: <span className="font-bold text-slate-700">{selectedCycle?.name}</span>
                        </p>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-600">Employee ID *</Label>
                            <Input
                                placeholder="Enter employee ID or username"
                                value={formEmployee}
                                onChange={(e) => setFormEmployee(e.target.value)}
                                className="rounded-xl"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setNewFormOpen(false)}
                            className="rounded-xl"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAddForm}
                            disabled={formSubmitting}
                            className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl gap-1.5"
                        >
                            {formSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                            Add Form
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Complete Appraisal Dialog ── */}
            <Dialog open={completeFormOpen} onOpenChange={setCompleteFormOpen}>
                <DialogContent className="max-w-lg rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-slate-800">
                            <Star className="h-5 w-5 text-amber-500" />
                            Complete Appraisal — {targetForm?.employee_name || targetForm?.employee}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-5 py-2">
                        {/* Score sliders */}
                        <div className="space-y-4 bg-slate-50 rounded-xl p-4 border border-slate-100">
                            <p className="text-xs font-black text-slate-600 uppercase tracking-wider">
                                Performance Ratings (1–5)
                            </p>
                            <ScoreInput
                                label="Punctuality"
                                name="punctuality"
                                value={scores.punctuality}
                                onChange={handleScoreChange}
                            />
                            <ScoreInput
                                label="Subject Knowledge"
                                name="subject_knowledge"
                                value={scores.subject_knowledge}
                                onChange={handleScoreChange}
                            />
                            <ScoreInput
                                label="Student Engagement"
                                name="student_engagement"
                                value={scores.student_engagement}
                                onChange={handleScoreChange}
                            />
                            <ScoreInput
                                label="Communication"
                                name="communication"
                                value={scores.communication}
                                onChange={handleScoreChange}
                            />
                            <ScoreInput
                                label="Teamwork"
                                name="teamwork"
                                value={scores.teamwork}
                                onChange={handleScoreChange}
                            />
                        </div>

                        {/* Reviewer comments */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-600">Reviewer Comments</Label>
                            <Textarea
                                placeholder="Overall feedback for the employee..."
                                value={reviewerComments}
                                onChange={(e) => setReviewerComments(e.target.value)}
                                rows={3}
                                className="rounded-xl resize-none text-sm"
                            />
                        </div>

                        {/* Goals */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-600">Goals for Next Period</Label>
                            <Textarea
                                placeholder="Set goals and development areas..."
                                value={goalsNextPeriod}
                                onChange={(e) => setGoalsNextPeriod(e.target.value)}
                                rows={2}
                                className="rounded-xl resize-none text-sm"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setCompleteFormOpen(false)}
                            className="rounded-xl"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCompleteAppraisal}
                            disabled={completeSubmitting}
                            className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl gap-1.5"
                        >
                            {completeSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Complete Appraisal
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
