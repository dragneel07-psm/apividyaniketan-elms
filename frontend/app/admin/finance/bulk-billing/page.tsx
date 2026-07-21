// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { billingAPI, academicAPI, AcademicClass, FeeStructure } from '@/lib/api';
import { toast } from 'sonner';
import { Layers, FileText, Loader2, Printer, Calendar } from 'lucide-react';

const today = () => new Date().toISOString().slice(0, 10);
const inAMonth = () => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().slice(0, 10);
};
const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function BulkBillingPage() {
    const [classes, setClasses] = useState<AcademicClass[]>([]);
    const [structures, setStructures] = useState<FeeStructure[]>([]);
    const [selectedClasses, setSelectedClasses] = useState<Set<string | number>>(new Set());
    const [selectedStructures, setSelectedStructures] = useState<Set<string>>(new Set());
    const [dueDate, setDueDate] = useState(inAMonth());
    const [skipExisting, setSkipExisting] = useState(true);
    const [busy, setBusy] = useState<'idle' | 'assigning' | 'printing'>('idle');
    const [lastResult, setLastResult] = useState<{
        created: number; skipped: number; student_count: number;
        summary: { fee_structure_id: string; fee_structure_name: string; created: number; skipped: number }[];
        created_fee_ids: string[];
    } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([academicAPI.getClasses(), billingAPI.getFeeStructures()])
            .then(([cls, structs]) => { setClasses(cls); setStructures(structs); })
            .catch(() => toast.error('Failed to load classes and fee structures'))
            .finally(() => setLoading(false));
    }, []);

    const toggleClass = (id: string | number) =>
        setSelectedClasses(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

    const toggleStructure = (id: string) =>
        setSelectedStructures(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

    const totalAmount = useMemo(() =>
        Array.from(selectedStructures).reduce((sum, id) => {
            const s = structures.find(x => x.fee_id === id);
            return sum + (s ? Number(s.amount) : 0);
        }, 0)
    , [selectedStructures, structures]);

    const handleAssign = async () => {
        if (selectedClasses.size === 0 || selectedStructures.size === 0) {
            toast.error('Pick at least one class and one fee structure.');
            return;
        }
        setBusy('assigning');
        try {
            const result = await billingAPI.bulkAssignMulti({
                class_ids: Array.from(selectedClasses),
                fee_structure_ids: Array.from(selectedStructures),
                due_date: dueDate,
                skip_existing: skipExisting,
            });
            setLastResult(result);
            toast.success(`Created ${result.created} bills (${result.skipped} skipped).`);
        } catch {
            toast.error('Bulk assignment failed.');
        } finally {
            setBusy('idle');
        }
    };

    const handlePrintBills = async () => {
        if (!lastResult || lastResult.created_fee_ids.length === 0) return;
        setBusy('printing');
        try {
            await billingAPI.bulkBillsPdf(lastResult.created_fee_ids);
            toast.success('Bulk bills PDF downloaded.');
        } catch {
            toast.error('Failed to generate bills PDF.');
        } finally {
            setBusy('idle');
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>;
    }

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-xl"><Layers className="h-5 w-5 text-indigo-600" /></div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Bulk Billing</h1>
                    <p className="text-sm text-slate-500">
                        Generate monthly bills for many students at once — pick class(es), fee structure(s) and due date,
                        then print all bills as one PDF.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Classes */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">1. Pick Class(es)</CardTitle>
                        <CardDescription>{selectedClasses.size} of {classes.length} selected</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-1.5 max-h-72 overflow-y-auto">
                        <div className="flex gap-2 pb-2 border-b">
                            <Button size="sm" variant="outline" onClick={() => setSelectedClasses(new Set(classes.map(c => c.id)))}>Select All</Button>
                            <Button size="sm" variant="outline" onClick={() => setSelectedClasses(new Set())}>Clear</Button>
                        </div>
                        {classes.length === 0 ? (
                            <div className="py-4 text-sm text-slate-400">No classes yet.</div>
                        ) : classes.map(c => (
                            <label key={c.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 rounded px-2 py-1.5">
                                <Checkbox
                                    checked={selectedClasses.has(c.id)}
                                    onCheckedChange={() => toggleClass(c.id)}
                                />
                                <span className="text-sm">{c.name}</span>
                            </label>
                        ))}
                    </CardContent>
                </Card>

                {/* Fee Structures */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">2. Pick Fee Structure(s)</CardTitle>
                        <CardDescription>{selectedStructures.size} selected · Total Rs. {fmt(totalAmount)} per student</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-1.5 max-h-72 overflow-y-auto">
                        <div className="flex gap-2 pb-2 border-b">
                            <Button size="sm" variant="outline" onClick={() => setSelectedStructures(new Set(structures.map(s => s.fee_id)))}>Select All</Button>
                            <Button size="sm" variant="outline" onClick={() => setSelectedStructures(new Set())}>Clear</Button>
                        </div>
                        {structures.length === 0 ? (
                            <div className="py-4 text-sm text-slate-400">No fee structures yet.</div>
                        ) : structures.map(s => (
                            <label key={s.fee_id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 rounded px-2 py-1.5">
                                <Checkbox
                                    checked={selectedStructures.has(s.fee_id)}
                                    onCheckedChange={() => toggleStructure(s.fee_id)}
                                />
                                <span className="text-sm flex-1">{s.name}</span>
                                <span className="text-xs text-slate-500">Rs. {fmt(Number(s.amount))}</span>
                            </label>
                        ))}
                    </CardContent>
                </Card>
            </div>

            {/* Settings */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">3. Due Date & Options</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="space-y-1">
                        <Label className="text-xs uppercase text-slate-500 flex items-center gap-1.5"><Calendar className="h-3 w-3" /> Due Date</Label>
                        <Input type="date" value={dueDate} min={today()} onChange={e => setDueDate(e.target.value)} />
                    </div>
                    <div className="flex items-center gap-2 pt-6">
                        <Checkbox checked={skipExisting} onCheckedChange={(v) => setSkipExisting(!!v)} id="skip" />
                        <Label htmlFor="skip" className="text-sm cursor-pointer">
                            Skip duplicates (don't re-create bills with the same structure + due date)
                        </Label>
                    </div>
                    <Button onClick={handleAssign} disabled={busy !== 'idle'} className="md:col-start-3">
                        {busy === 'assigning' ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating bills…</> : 'Generate Bills'}
                    </Button>
                </CardContent>
            </Card>

            {/* Result */}
            {lastResult && (
                <Card className="border-emerald-200 bg-emerald-50/40">
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4 text-emerald-600" /> Generation Result</CardTitle>
                        <CardDescription>
                            {lastResult.student_count} student(s) × {lastResult.summary.length} structure(s)
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-3 gap-3 text-sm">
                            <Stat label="Created" value={lastResult.created.toString()} color="text-emerald-700" />
                            <Stat label="Skipped" value={lastResult.skipped.toString()} color="text-slate-600" />
                            <Stat label="Students" value={lastResult.student_count.toString()} color="text-slate-700" />
                        </div>

                        <table className="w-full text-sm">
                            <thead className="bg-white">
                                <tr>
                                    <th className="text-left py-2 px-3 text-xs uppercase font-bold text-slate-500 border-b">Structure</th>
                                    <th className="text-right py-2 px-3 text-xs uppercase font-bold text-slate-500 border-b">Created</th>
                                    <th className="text-right py-2 px-3 text-xs uppercase font-bold text-slate-500 border-b">Skipped</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lastResult.summary.map(r => (
                                    <tr key={r.fee_structure_id} className="border-b last:border-b-0">
                                        <td className="py-2 px-3">{r.fee_structure_name}</td>
                                        <td className="py-2 px-3 text-right font-semibold text-emerald-700">{r.created}</td>
                                        <td className="py-2 px-3 text-right text-slate-500">{r.skipped}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {lastResult.created > 0 && (
                            <Button onClick={handlePrintBills} disabled={busy !== 'idle'} className="w-full">
                                {busy === 'printing' ? (
                                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Building PDF…</>
                                ) : (
                                    <><Printer className="h-4 w-4 mr-2" />Download All {lastResult.created} Bills as PDF</>
                                )}
                            </Button>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
    return (
        <div className="border border-slate-200 rounded-lg p-3 bg-white">
            <div className="text-xs text-slate-500 uppercase tracking-wider">{label}</div>
            <div className={`font-bold text-2xl ${color}`}>{value}</div>
        </div>
    );
}
