// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import {
    useCreateRubricTemplate,
    useGradeProject,
    useProject,
    useRubricTemplates,
    type RubricTemplate,
} from '@/services/projects';

interface RubricLine {
    criterion: string;
    score: string;
    max: string;
    notes: string;
}

const STARTER_LINES: RubricLine[] = [
    { criterion: 'Research depth', score: '', max: '10', notes: '' },
    { criterion: 'Presentation', score: '', max: '10', notes: '' },
    { criterion: 'Teamwork', score: '', max: '10', notes: '' },
];

export default function TeacherGradeProjectPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const id = params?.id;
    const projectQ = useProject(id);
    const gradeMut = useGradeProject(id || '');
    const templatesQ = useRubricTemplates();
    const createTemplate = useCreateRubricTemplate();

    const [finalGrade, setFinalGrade] = useState<string>('');
    const [note, setNote] = useState<string>('');
    const [lines, setLines] = useState<RubricLine[]>(STARTER_LINES);
    const [templateName, setTemplateName] = useState<string>('');

    if (projectQ.isLoading) return <p className="p-6 text-sm text-slate-500">Loading…</p>;
    if (!projectQ.data) return <p className="p-6 text-sm text-rose-600">Project not found.</p>;
    const project = projectQ.data;

    const updateLine = (idx: number, patch: Partial<RubricLine>) => {
        setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
    };

    const addLine = () =>
        setLines((prev) => [...prev, { criterion: '', score: '', max: '10', notes: '' }]);

    const applyTemplate = (template: RubricTemplate) => {
        const seeded: RubricLine[] = (template.criteria_json || []).map((line) => ({
            criterion: line.criterion || '',
            score: '',
            max: line.max != null ? String(line.max) : '10',
            notes: '',
        }));
        if (seeded.length === 0) {
            toast({ title: 'Template is empty', variant: 'destructive' });
            return;
        }
        setLines(seeded);
        toast({ title: `Loaded template "${template.name}"` });
    };

    const saveAsTemplate = async () => {
        const trimmed = templateName.trim();
        if (!trimmed) {
            toast({ title: 'Template name required', variant: 'destructive' });
            return;
        }
        const criteria = lines
            .filter((l) => l.criterion.trim())
            .map((l) => ({ criterion: l.criterion.trim(), max: Number(l.max) || 0 }));
        if (criteria.length === 0) {
            toast({ title: 'Add at least one criterion before saving as template', variant: 'destructive' });
            return;
        }
        try {
            await createTemplate.mutateAsync({ name: trimmed, criteria_json: criteria });
            setTemplateName('');
            toast({ title: 'Saved as template' });
        } catch {
            toast({ title: 'Could not save template', variant: 'destructive' });
        }
    };

    const submit = async () => {
        const grade = Number(finalGrade);
        if (!Number.isFinite(grade)) {
            toast({ title: 'Final grade must be a number', variant: 'destructive' });
            return;
        }
        const rubric_json = {
            lines: lines
                .filter((l) => l.criterion.trim())
                .map((l) => ({
                    criterion: l.criterion.trim(),
                    score: Number(l.score) || 0,
                    max: Number(l.max) || 0,
                    notes: l.notes.trim(),
                })),
        };
        try {
            await gradeMut.mutateAsync({ final_grade: grade, rubric_json, note });
            toast({ title: 'Project graded' });
            router.push(`/teacher/projects/${project.project_id}`);
        } catch (err) {
            const detail = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
            toast({ title: 'Grading failed', description: detail, variant: 'destructive' });
        }
    };

    return (
        <div className="mx-auto max-w-3xl space-y-6 p-6">
            <header>
                <h1 className="text-2xl font-semibold text-slate-900">Grade: {project.title}</h1>
                <p className="text-sm text-slate-500">
                    Provide a final grade and an optional rubric breakdown.
                </p>
            </header>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base">Rubric</CardTitle>
                    {templatesQ.data && templatesQ.data.length > 0 && (
                        <Select
                            onValueChange={(value) => {
                                const tpl = templatesQ.data?.find((t) => t.template_id === value);
                                if (tpl) applyTemplate(tpl);
                            }}
                        >
                            <SelectTrigger className="w-64">
                                <SelectValue placeholder="Load from template…" />
                            </SelectTrigger>
                            <SelectContent>
                                {templatesQ.data.map((t) => (
                                    <SelectItem key={t.template_id} value={t.template_id}>
                                        {t.name}
                                        {t.is_shared ? ' (shared)' : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </CardHeader>
                <CardContent className="space-y-3">
                    {lines.map((l, i) => (
                        <div key={i} className="grid gap-2 md:grid-cols-[1.5fr_auto_auto_2fr]">
                            <Input
                                placeholder="Criterion"
                                value={l.criterion}
                                onChange={(e) => updateLine(i, { criterion: e.target.value })}
                            />
                            <Input
                                placeholder="Score"
                                type="number"
                                value={l.score}
                                onChange={(e) => updateLine(i, { score: e.target.value })}
                                className="w-24"
                            />
                            <Input
                                placeholder="Max"
                                type="number"
                                value={l.max}
                                onChange={(e) => updateLine(i, { max: e.target.value })}
                                className="w-24"
                            />
                            <Input
                                placeholder="Notes"
                                value={l.notes}
                                onChange={(e) => updateLine(i, { notes: e.target.value })}
                            />
                        </div>
                    ))}
                    <Button variant="ghost" size="sm" onClick={addLine}>
                        + Add criterion
                    </Button>
                    <div className="mt-4 flex items-center gap-2 border-t pt-4">
                        <Input
                            placeholder="Template name to save current rubric…"
                            value={templateName}
                            onChange={(e) => setTemplateName(e.target.value)}
                        />
                        <Button
                            type="button"
                            variant="outline"
                            onClick={saveAsTemplate}
                            disabled={createTemplate.isPending || !templateName.trim()}
                        >
                            Save as template
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Final grade</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="final_grade">Score (0–100)</Label>
                        <Input
                            id="final_grade"
                            type="number"
                            min={0}
                            max={100}
                            step="0.5"
                            value={finalGrade}
                            onChange={(e) => setFinalGrade(e.target.value)}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="note">Mentor note (optional)</Label>
                        <Textarea
                            id="note"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            rows={3}
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => router.back()}>
                    Cancel
                </Button>
                <Button onClick={submit} disabled={gradeMut.isPending || !finalGrade}>
                    {gradeMut.isPending ? 'Saving…' : 'Save grade'}
                </Button>
            </div>
        </div>
    );
}
