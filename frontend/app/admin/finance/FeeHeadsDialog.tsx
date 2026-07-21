// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useState } from 'react';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { billingAPI, FeeHead, FeeStructure } from '@/lib/api';
import { toast } from 'sonner';
import { Plus, Trash2, GripVertical, Loader2 } from 'lucide-react';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    structure: FeeStructure | null;
}

interface Draft {
    head_id?: string;
    name: string;
    amount: string;
    sort_order: number;
    _dirty?: boolean;
    _new?: boolean;
}

const DEFAULT_HEADS = [
    'Admission Fee', 'Tuition Fee', 'Examination Fee', 'Library Fee',
    'Lab Fee', 'Sports Fee', 'Transport Fee', 'Hostel Fee',
    'Activity Fee', 'Stationery / Books',
];

export function FeeHeadsDialog({ open, onOpenChange, structure }: Props) {
    const [drafts, setDrafts] = useState<Draft[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open || !structure) return;
        setLoading(true);
        billingAPI.getFeeHeads(structure.fee_id)
            .then((heads) => {
                setDrafts(heads.map((h, i) => ({
                    head_id: h.head_id,
                    name: h.name,
                    amount: h.amount.toString(),
                    sort_order: h.sort_order ?? i,
                })));
            })
            .catch(() => toast.error('Failed to load fee heads'))
            .finally(() => setLoading(false));
    }, [open, structure]);

    const addHead = (name = '') => {
        setDrafts((rows) => [
            ...rows,
            { name, amount: '0', sort_order: rows.length, _new: true, _dirty: true },
        ]);
    };

    const updateRow = (i: number, patch: Partial<Draft>) => {
        setDrafts((rows) => rows.map((r, idx) => idx === i ? { ...r, ...patch, _dirty: true } : r));
    };

    const removeRow = async (i: number) => {
        const row = drafts[i];
        if (row.head_id) {
            try {
                await billingAPI.deleteFeeHead(row.head_id);
                toast.success('Head removed');
            } catch {
                toast.error('Failed to delete head');
                return;
            }
        }
        setDrafts((rows) => rows.filter((_, idx) => idx !== i));
    };

    const total = drafts.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
    const structureAmount = Number(structure?.amount ?? 0);

    const saveAll = async () => {
        if (!structure) return;
        setSaving(true);
        try {
            for (let i = 0; i < drafts.length; i++) {
                const row = drafts[i];
                if (!row._dirty) continue;
                if (!row.name.trim()) continue;
                const payload: Partial<FeeHead> = {
                    fee_structure: structure.fee_id,
                    name: row.name.trim(),
                    amount: parseFloat(row.amount) || 0,
                    sort_order: i,
                };
                if (row.head_id) {
                    await billingAPI.updateFeeHead(row.head_id, payload);
                } else {
                    await billingAPI.createFeeHead(payload);
                }
            }
            toast.success('Fee heads saved');
            onOpenChange(false);
        } catch {
            toast.error('Failed to save fee heads');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl border-slate-200 shadow-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">Fee Head Breakdown</DialogTitle>
                    <DialogDescription>
                        {structure
                            ? <>Itemize <span className="font-semibold">{structure.name}</span> (Total: Rs. {structureAmount.toLocaleString()}).</>
                            : 'Pick a fee structure first.'}
                        {' '}Each head prints as a separate line on the receipt.
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="py-12 text-center"><Loader2 className="h-6 w-6 mx-auto animate-spin text-slate-400" /></div>
                ) : (
                    <>
                        {/* Quick-add presets */}
                        <div className="flex flex-wrap gap-1.5">
                            {DEFAULT_HEADS.filter(n => !drafts.find(d => d.name === n)).map((n) => (
                                <button
                                    key={n}
                                    type="button"
                                    onClick={() => addHead(n)}
                                    className="text-[10px] px-2 py-1 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-600"
                                >
                                    + {n}
                                </button>
                            ))}
                        </div>

                        {/* Editor table */}
                        <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="w-8 py-2 px-2"></th>
                                        <th className="text-left py-2 px-3 text-xs uppercase tracking-wider text-slate-500 font-bold">Head</th>
                                        <th className="text-right py-2 px-3 text-xs uppercase tracking-wider text-slate-500 font-bold w-40">Amount (Rs.)</th>
                                        <th className="w-12"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {drafts.length === 0 ? (
                                        <tr><td colSpan={4} className="py-8 text-center text-slate-400 text-xs">No heads yet. Add one above or use the presets.</td></tr>
                                    ) : drafts.map((r, i) => (
                                        <tr key={r.head_id ?? `new-${i}`} className="border-b last:border-b-0">
                                            <td className="px-2"><GripVertical className="h-4 w-4 text-slate-300" /></td>
                                            <td className="py-1.5 px-3">
                                                <Input
                                                    value={r.name}
                                                    onChange={(e) => updateRow(i, { name: e.target.value })}
                                                    placeholder="Head name"
                                                    className="h-9 text-sm"
                                                />
                                            </td>
                                            <td className="py-1.5 px-3">
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    value={r.amount}
                                                    onChange={(e) => updateRow(i, { amount: e.target.value })}
                                                    className="h-9 text-sm text-right"
                                                />
                                            </td>
                                            <td className="px-2 text-center">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => removeRow(i)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-slate-50 font-bold">
                                        <td colSpan={2} className="py-3 px-3 text-right uppercase text-xs">Total of Heads</td>
                                        <td className={`py-3 px-3 text-right ${Math.abs(total - structureAmount) > 0.01 ? 'text-amber-600' : 'text-emerald-700'}`}>
                                            Rs. {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td />
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        <Button variant="outline" size="sm" onClick={() => addHead('')}>
                            <Plus className="h-4 w-4 mr-2" /> Add Custom Head
                        </Button>

                        {Math.abs(total - structureAmount) > 0.01 && (
                            <div className="bg-amber-50 border border-amber-200 rounded-md p-2.5 text-xs text-amber-800">
                                Heads total ({total.toFixed(2)}) doesn't match the structure amount ({structureAmount.toFixed(2)}).
                                Update either the structure's total amount or your head amounts so they match.
                            </div>
                        )}
                    </>
                )}

                <DialogFooter className="border-t pt-4">
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={saveAll} disabled={saving || !structure}>
                        {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving</> : 'Save Heads'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
