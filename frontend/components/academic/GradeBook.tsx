// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { academicAPI, AcademicClass, GradebookData, Section } from '@/lib/api';
import { toast } from 'sonner';
import { Loader2, Save, FileText, CheckCircle2, BookOpen } from 'lucide-react';

// ── helpers ────────────────────────────────────────────────────────────────────

function letterGrade(pct: number): { label: string; cls: string } {
    if (pct >= 90) return { label: 'A+', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
    if (pct >= 80) return { label: 'A',  cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
    if (pct >= 70) return { label: 'B',  cls: 'bg-blue-100 text-blue-700 border-blue-200' };
    if (pct >= 60) return { label: 'C',  cls: 'bg-amber-100 text-amber-700 border-amber-200' };
    if (pct >= 40) return { label: 'D',  cls: 'bg-orange-100 text-orange-700 border-orange-200' };
    return             { label: 'F',  cls: 'bg-red-100 text-red-700 border-red-200' };
}

function scoreColor(pct: number): string {
    if (pct >= 80) return 'text-emerald-700 bg-emerald-50';
    if (pct >= 60) return 'text-blue-700 bg-blue-50';
    if (pct >= 40) return 'text-amber-700 bg-amber-50';
    return 'text-red-700 bg-red-50';
}

function studentAvg(student: GradebookData['students'][number], assessments: GradebookData['assessments']) {
    let earned = 0, total = 0;
    for (const a of assessments) {
        const r = student.results[a.id];
        if (r?.score !== null && r?.score !== undefined) {
            earned += r.score;
            total += a.total_marks;
        }
    }
    if (total === 0) return null;
    return Math.round((earned / total) * 100);
}

// ── component ──────────────────────────────────────────────────────────────────

export default function GradeBook() {
    const [classes, setClasses] = useState<AcademicClass[]>([]);
    const [selectedClassId, setSelectedClassId] = useState('');
    const [selectedSubjectId, setSelectedSubjectId] = useState('');
    const [selectedSectionId, setSelectedSectionId] = useState('all');
    const [gradebookData, setGradebookData] = useState<GradebookData | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [savedCells, setSavedCells] = useState<Set<string>>(new Set());

    const selectedClass = classes.find(c => c.id.toString() === selectedClassId);
    const filteredSubjects = selectedClass?.subjects ?? [];
    const sections: Section[] = selectedClass?.sections ?? [];

    useEffect(() => {
        academicAPI.getClasses()
            .then(setClasses)
            .catch(() => toast.error('Failed to load classes'));
    }, []);

    const loadGradebook = useCallback(async () => {
        if (!selectedSubjectId) return;
        setLoading(true);
        setGradebookData(null);
        try {
            // @ts-ignore
            const data = await academicAPI.getGradebook(
                parseInt(selectedSubjectId),
                selectedSectionId !== 'all' ? parseInt(selectedSectionId) : undefined
            );
            setGradebookData(data);
            setSavedCells(new Set());
        } catch {
            toast.error('Failed to load gradebook');
        } finally {
            setLoading(false);
        }
    }, [selectedSubjectId, selectedSectionId]);

    useEffect(() => {
        if (selectedSubjectId) loadGradebook();
        else setGradebookData(null);
    }, [selectedSubjectId, selectedSectionId, loadGradebook]);

    const handleScoreChange = (studentId: string, assessmentId: string, raw: string) => {
        if (!gradebookData) return;
        const score = raw === '' ? null : parseInt(raw);
        if (score !== null && score < 0) { toast.error('Score cannot be negative'); return; }
        const assessment = gradebookData.assessments.find(a => a.id === assessmentId);
        if (assessment && score !== null && score > assessment.total_marks) {
            toast.error(`Max marks: ${assessment.total_marks}`);
            return;
        }
        setGradebookData(prev => {
            if (!prev) return null;
            return {
                ...prev,
                students: prev.students.map(s =>
                    s.id !== studentId ? s : {
                        ...s,
                        results: {
                            ...s.results,
                            [assessmentId]: { ...s.results[assessmentId], score }
                        }
                    }
                )
            };
        });
        // Remove saved indicator when cell is edited
        setSavedCells(prev => {
            const next = new Set(prev);
            next.delete(`${studentId}-${assessmentId}`);
            return next;
        });
    };

    const saveCell = async (studentId: string, assessmentId: string) => {
        if (!gradebookData) return;
        const student = gradebookData.students.find(s => s.id === studentId);
        if (!student) return;
        const result = student.results[assessmentId];
        if (result.score === null) return;

        try {
            if (result.result_id) {
                await academicAPI.updateResult(result.result_id, { score: result.score });
            } else {
                const newResult = await academicAPI.createResult({
                    assessment: assessmentId,
                    student: studentId,
                    score: result.score
                });
                setGradebookData(prev => {
                    if (!prev) return null;
                    return {
                        ...prev,
                        students: prev.students.map(s =>
                            s.id !== studentId ? s : {
                                ...s,
                                results: {
                                    ...s.results,
                                    [assessmentId]: { ...s.results[assessmentId], result_id: newResult.id }
                                }
                            }
                        )
                    };
                });
            }
            setSavedCells(prev => new Set(prev).add(`${studentId}-${assessmentId}`));
        } catch {
            toast.error('Failed to save grade');
        }
    };

    const handleBulkSave = async () => {
        if (!gradebookData) return;
        setSaving(true);
        let saved = 0, failed = 0;
        const ops: Promise<void>[] = [];
        for (const student of gradebookData.students) {
            for (const assessment of gradebookData.assessments) {
                const result = student.results[assessment.id];
                if (result?.score === null || result?.score === undefined) continue;
                ops.push(
                    (async () => {
                        try {
                            if (result.result_id) {
                                await academicAPI.updateResult(result.result_id, { score: result.score! });
                            } else {
                                const newResult = await academicAPI.createResult({
                                    assessment: assessment.id,
                                    student: student.id,
                                    score: result.score!
                                });
                                setGradebookData(prev => {
                                    if (!prev) return null;
                                    return {
                                        ...prev,
                                        students: prev.students.map(s =>
                                            s.id !== student.id ? s : {
                                                ...s,
                                                results: {
                                                    ...s.results,
                                                    [assessment.id]: { ...s.results[assessment.id], result_id: newResult.id }
                                                }
                                            }
                                        )
                                    };
                                });
                            }
                            saved++;
                            setSavedCells(prev => new Set(prev).add(`${student.id}-${assessment.id}`));
                        } catch {
                            failed++;
                        }
                    })()
                );
            }
        }
        await Promise.all(ops);
        setSaving(false);
        if (failed === 0) toast.success(`Saved ${saved} grade${saved !== 1 ? 's' : ''}`);
        else toast.error(`${saved} saved, ${failed} failed`);
    };

    return (
        <div className="space-y-6 max-w-full p-4 md:p-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
                        <FileText className="h-8 w-8 text-indigo-600" /> Gradebook
                    </h1>
                    <p className="text-slate-500">Enter and manage student marks.</p>
                </div>
                {gradebookData && (
                    <Button
                        onClick={handleBulkSave}
                        disabled={saving}
                        className="h-10 gap-2 bg-indigo-600 hover:bg-indigo-700 font-bold"
                    >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save All Grades
                    </Button>
                )}
            </header>

            <Card className="border-0 shadow-sm">
                <CardHeader className="bg-white border-b pb-4">
                    <div className="flex flex-wrap gap-4 items-end">
                        {/* Class */}
                        <div className="space-y-1.5 w-48">
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Class</label>
                            <Select value={selectedClassId} onValueChange={(v) => {
                                setSelectedClassId(v);
                                setSelectedSubjectId('');
                                setSelectedSectionId('all');
                            }}>
                                <SelectTrigger><SelectValue placeholder="Select Class" /></SelectTrigger>
                                <SelectContent>
                                    {classes.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Subject */}
                        <div className="space-y-1.5 w-48">
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Subject</label>
                            <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId} disabled={!selectedClassId}>
                                <SelectTrigger><SelectValue placeholder="Select Subject" /></SelectTrigger>
                                <SelectContent>
                                    {filteredSubjects.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Section */}
                        {sections.length > 0 && (
                            <div className="space-y-1.5 w-40">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Section</label>
                                <Select value={selectedSectionId} onValueChange={setSelectedSectionId} disabled={!selectedSubjectId}>
                                    <SelectTrigger><SelectValue placeholder="All Sections" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Sections</SelectItem>
                                        {sections.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-12 text-center">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-600" />
                            <p className="text-slate-500 mt-2">Loading gradebook…</p>
                        </div>
                    ) : !gradebookData ? (
                        <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
                            <BookOpen className="h-10 w-10 text-slate-200" />
                            Select a class and subject to view the gradebook.
                        </div>
                    ) : gradebookData.students.length === 0 ? (
                        <div className="p-12 text-center text-slate-400">No students found.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow>
                                        <TableHead className="w-[220px] sticky left-0 bg-slate-50 z-10">Student</TableHead>
                                        {gradebookData.assessments.map(a => (
                                            <TableHead key={a.id} className="min-w-[140px] text-center">
                                                <div className="font-semibold text-slate-900 truncate max-w-[130px]">{a.title}</div>
                                                <div className="text-[10px] font-normal text-slate-400 uppercase tracking-wide">
                                                    {a.type} · /{a.total_marks}
                                                </div>
                                            </TableHead>
                                        ))}
                                        {/* Summary columns */}
                                        <TableHead className="min-w-[90px] text-center bg-slate-100 font-bold text-slate-700">Total %</TableHead>
                                        <TableHead className="min-w-[70px] text-center bg-slate-100 font-bold text-slate-700">Grade</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {gradebookData.students.map(student => {
                                        const avg = studentAvg(student, gradebookData.assessments);
                                        const grade = avg !== null ? letterGrade(avg) : null;
                                        const totalEarned = gradebookData.assessments.reduce((sum, a) => {
                                            const r = student.results[a.id];
                                            return sum + (r?.score ?? 0);
                                        }, 0);
                                        const totalMax = gradebookData.assessments.reduce((sum, a) => sum + a.total_marks, 0);

                                        return (
                                            <TableRow key={student.id} className="hover:bg-slate-50/50">
                                                <TableCell className="sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)]">
                                                    <div className="font-bold text-slate-900 text-sm">{student.name}</div>
                                                    <div className="text-[11px] text-slate-400">{student.email}</div>
                                                    {student.section_name && (
                                                        <Badge className="mt-0.5 h-4 px-1.5 text-[9px] bg-violet-50 text-violet-600 border-violet-200">
                                                            {student.section_name}
                                                        </Badge>
                                                    )}
                                                </TableCell>

                                                {gradebookData.assessments.map(assessment => {
                                                    const result = student.results[assessment.id] ?? { score: null, result_id: null, submitted_at: null };
                                                    const pct = result.score !== null ? Math.round((result.score / assessment.total_marks) * 100) : null;
                                                    const isSaved = savedCells.has(`${student.id}-${assessment.id}`);
                                                    return (
                                                        <TableCell key={assessment.id} className="p-2 text-center">
                                                            <div className="flex flex-col items-center gap-1">
                                                                <div className="relative flex items-center justify-center gap-1">
                                                                    <Input
                                                                        type="number"
                                                                        className={`w-20 text-center h-8 text-sm font-bold pr-1 ${
                                                                            pct !== null
                                                                                ? `${scoreColor(pct)} border-transparent`
                                                                                : 'border-dashed text-slate-400'
                                                                        }`}
                                                                        placeholder="–"
                                                                        value={result.score === null ? '' : result.score.toString()}
                                                                        onChange={e => handleScoreChange(student.id, assessment.id, e.target.value)}
                                                                        onBlur={() => saveCell(student.id, assessment.id)}
                                                                    />
                                                                    {isSaved && <CheckCircle2 className="h-3 w-3 text-emerald-500 absolute -right-4 top-2.5" />}
                                                                </div>
                                                                {pct !== null && (
                                                                    <span className={`text-[9px] font-bold px-1.5 rounded ${scoreColor(pct)}`}>
                                                                        {pct}%
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                    );
                                                })}

                                                {/* Total % */}
                                                <TableCell className="text-center bg-slate-50 font-black">
                                                    {avg !== null ? (
                                                        <span className={`text-sm font-black px-2 py-0.5 rounded ${scoreColor(avg)}`}>
                                                            {totalEarned}/{totalMax} ({avg}%)
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-300 text-xs">–</span>
                                                    )}
                                                </TableCell>

                                                {/* Letter grade */}
                                                <TableCell className="text-center bg-slate-50">
                                                    {grade ? (
                                                        <Badge className={`font-black text-sm px-2 border ${grade.cls}`}>
                                                            {grade.label}
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-slate-300 text-xs">–</span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>

                            {/* Legend */}
                            <div className="flex items-center gap-4 px-4 py-3 border-t bg-slate-50/50 text-[10px] text-slate-500 font-medium flex-wrap">
                                <span className="font-bold text-slate-600">Score colours:</span>
                                {[
                                    { label: '≥80% Excellent', cls: 'bg-emerald-50 text-emerald-700' },
                                    { label: '60-79% Good', cls: 'bg-blue-50 text-blue-700' },
                                    { label: '40-59% Average', cls: 'bg-amber-50 text-amber-700' },
                                    { label: '<40% Needs Help', cls: 'bg-red-50 text-red-700' },
                                ].map(l => (
                                    <span key={l.label} className={`px-2 py-0.5 rounded font-bold ${l.cls}`}>{l.label}</span>
                                ))}
                                <span className="ml-auto text-slate-400">Grades save automatically on blur · or use Save All</span>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
