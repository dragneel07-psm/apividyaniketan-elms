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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { feeDiscountAPI, FeeDiscount, SCHOLARSHIP_CATEGORY_LABELS, SCHOLARSHIP_SOURCE_LABELS, ScholarshipCategory, ScholarshipSource } from '@/lib/api';
import { toast } from 'sonner';
import {
    Percent,
    Tag,
    Plus,
    Pencil,
    ToggleLeft,
    ToggleRight,
    Loader2,
    CheckCircle2,
    XCircle,
} from 'lucide-react';

// ── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
    return new Intl.NumberFormat('en-NP', { maximumFractionDigits: 2 }).format(n);
}

// ── Discount form state ──────────────────────────────────────────────────────

interface DiscountFormState {
    name: string;
    discount_type: 'percentage' | 'flat';
    value: string;
    max_cap: string;
    reason: string;
    is_active: boolean;
    scholarship_category: string;
    scholarship_source: string;
}

const EMPTY_FORM: DiscountFormState = {
    name: '',
    discount_type: 'percentage',
    value: '',
    max_cap: '',
    reason: '',
    is_active: true,
    scholarship_category: '',
    scholarship_source: '',
};

// ── Main component ───────────────────────────────────────────────────────────

export function DiscountManager() {
    const [discounts, setDiscounts] = useState<FeeDiscount[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<FeeDiscount | null>(null);
    const [form, setForm] = useState<DiscountFormState>(EMPTY_FORM);
    const [submitting, setSubmitting] = useState(false);
    const [togglingId, setTogglingId] = useState<string | null>(null);

    const loadDiscounts = async () => {
        setLoading(true);
        try {
            const data = await feeDiscountAPI.getDiscounts();
            setDiscounts(Array.isArray(data) ? data : []);
        } catch {
            setDiscounts([]);
            toast.error('Failed to load discounts');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDiscounts();
    }, []);

    const openCreate = () => {
        setEditTarget(null);
        setForm(EMPTY_FORM);
        setDialogOpen(true);
    };

    const openEdit = (d: FeeDiscount) => {
        setEditTarget(d);
        setForm({
            name: d.name,
            discount_type: d.discount_type,
            value: String(d.value),
            max_cap: d.max_cap != null ? String(d.max_cap) : '',
            reason: d.reason ?? '',
            is_active: d.is_active,
            scholarship_category: d.scholarship_category ?? '',
            scholarship_source: d.scholarship_source ?? '',
        });
        setDialogOpen(true);
    };

    const handleSubmit = async () => {
        if (!form.name.trim() || !form.value) {
            toast.error('Name and value are required');
            return;
        }
        const payload: Partial<FeeDiscount> = {
            name: form.name.trim(),
            discount_type: form.discount_type,
            value: parseFloat(form.value),
            max_cap: form.max_cap ? parseFloat(form.max_cap) : undefined,
            reason: form.reason.trim() || undefined,
            is_active: form.is_active,
            scholarship_category: form.scholarship_category as FeeDiscount['scholarship_category'],
            scholarship_source: form.scholarship_source as FeeDiscount['scholarship_source'],
        };
        setSubmitting(true);
        try {
            if (editTarget) {
                await feeDiscountAPI.updateDiscount(editTarget.discount_id, payload);
                toast.success('Discount updated');
            } else {
                await feeDiscountAPI.createDiscount(payload);
                toast.success('Discount created');
            }
            setDialogOpen(false);
            loadDiscounts();
        } catch {
            toast.error('Failed to save discount');
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggleActive = async (d: FeeDiscount) => {
        setTogglingId(d.discount_id);
        try {
            await feeDiscountAPI.updateDiscount(d.discount_id, { is_active: !d.is_active });
            toast.success(d.is_active ? 'Discount deactivated' : 'Discount activated');
            loadDiscounts();
        } catch {
            toast.error('Failed to update discount status');
        } finally {
            setTogglingId(null);
        }
    };

    // ── Render ──

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Percent className="h-5 w-5 text-amber-600" />
                    <h2 className="text-xl font-black text-slate-900">Fee Discounts</h2>
                </div>
                <Button
                    size="sm"
                    onClick={openCreate}
                    className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl gap-1.5"
                >
                    <Plus className="h-3.5 w-3.5" /> Add Discount
                </Button>
            </div>

            {/* Table card */}
            <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="pb-3 border-b border-slate-100 bg-amber-50/40">
                    <CardTitle className="text-sm font-black text-slate-700 flex items-center gap-2">
                        <Tag className="h-4 w-4 text-amber-500" />
                        All Discounts
                        <span className="ml-auto text-[11px] font-medium text-slate-400">
                            {discounts.length} total
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex justify-center items-center py-14">
                            <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
                        </div>
                    ) : discounts.length === 0 ? (
                        <div className="text-center py-14 text-slate-400 text-sm">
                            No discounts configured yet.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50/60">
                                        <th className="text-left px-4 py-2.5 text-[11px] font-black text-slate-500 uppercase tracking-wider">Name</th>
                                        <th className="text-left px-4 py-2.5 text-[11px] font-black text-slate-500 uppercase tracking-wider">Type</th>
                                        <th className="text-right px-4 py-2.5 text-[11px] font-black text-slate-500 uppercase tracking-wider">Value</th>
                                        <th className="text-right px-4 py-2.5 text-[11px] font-black text-slate-500 uppercase tracking-wider">Max Cap</th>
                                        <th className="text-left px-4 py-2.5 text-[11px] font-black text-slate-500 uppercase tracking-wider">Reason</th>
                                        <th className="text-center px-4 py-2.5 text-[11px] font-black text-slate-500 uppercase tracking-wider">Status</th>
                                        <th className="text-left px-4 py-2.5 text-[11px] font-black text-slate-500 uppercase tracking-wider">Created</th>
                                        <th className="px-4 py-2.5" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {discounts.map((d) => (
                                        <tr key={d.discount_id} className="hover:bg-amber-50/30 transition-colors">
                                            <td className="px-4 py-3 font-bold text-slate-800">{d.name}</td>
                                            <td className="px-4 py-3">
                                                <Badge
                                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                                        d.discount_type === 'percentage'
                                                            ? 'bg-amber-100 text-amber-700 border-amber-200'
                                                            : 'bg-yellow-100 text-yellow-700 border-yellow-200'
                                                    }`}
                                                >
                                                    {d.discount_type === 'percentage' ? (
                                                        <><Percent className="h-2.5 w-2.5 inline mr-0.5" />%</>
                                                    ) : (
                                                        'NPR Flat'
                                                    )}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold text-slate-700">
                                                {d.discount_type === 'percentage'
                                                    ? `${fmt(d.value)}%`
                                                    : `NPR ${fmt(d.value)}`}
                                            </td>
                                            <td className="px-4 py-3 text-right text-slate-500 text-xs">
                                                {d.max_cap != null ? `NPR ${fmt(d.max_cap)}` : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-slate-500 text-xs max-w-[180px] truncate">
                                                {d.reason || '—'}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {d.is_active ? (
                                                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 w-fit mx-auto">
                                                        <CheckCircle2 className="h-3 w-3" /> Active
                                                    </Badge>
                                                ) : (
                                                    <Badge className="bg-slate-100 text-slate-500 border-slate-200 text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 w-fit mx-auto">
                                                        <XCircle className="h-3 w-3" /> Inactive
                                                    </Badge>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-slate-400">
                                                {new Date(d.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1.5 justify-end">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => openEdit(d)}
                                                        className="h-7 w-7 p-0 rounded-lg hover:bg-amber-100 text-amber-600"
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleToggleActive(d)}
                                                        disabled={togglingId === d.discount_id}
                                                        className="h-7 w-7 p-0 rounded-lg hover:bg-slate-100 text-slate-500"
                                                    >
                                                        {togglingId === d.discount_id ? (
                                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        ) : d.is_active ? (
                                                            <ToggleRight className="h-4 w-4 text-emerald-600" />
                                                        ) : (
                                                            <ToggleLeft className="h-4 w-4 text-slate-400" />
                                                        )}
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ── Add / Edit Dialog ── */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-slate-800">
                            <Tag className="h-5 w-5 text-amber-500" />
                            {editTarget ? 'Edit Discount' : 'Add Discount'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-600">Name *</Label>
                            <Input
                                placeholder="e.g. Sibling Discount"
                                value={form.name}
                                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                className="rounded-xl"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-600">Type *</Label>
                                <Select
                                    value={form.discount_type}
                                    onValueChange={(v) =>
                                        setForm((f) => ({ ...f, discount_type: v as 'percentage' | 'flat' }))
                                    }
                                >
                                    <SelectTrigger className="rounded-xl">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                                        <SelectItem value="flat">Flat (NPR)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-600">Value *</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    placeholder={form.discount_type === 'percentage' ? '10' : '500'}
                                    value={form.value}
                                    onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                                    className="rounded-xl"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-600">Max Cap (NPR, optional)</Label>
                            <Input
                                type="number"
                                min={0}
                                placeholder="Leave blank for no cap"
                                value={form.max_cap}
                                onChange={(e) => setForm((f) => ({ ...f, max_cap: e.target.value }))}
                                className="rounded-xl"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-600">Reason / Notes</Label>
                            <Textarea
                                placeholder="Describe the discount criteria..."
                                value={form.reason}
                                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                                rows={2}
                                className="rounded-xl resize-none text-sm"
                            />
                        </div>

                        {/* Phase E: Scholarship classification — for the Govt audit register. */}
                        <div className="bg-blue-50/40 border border-blue-200 rounded-xl p-3 space-y-3">
                            <div>
                                <Label className="text-xs font-bold text-blue-700">Scholarship Classification (optional)</Label>
                                <p className="text-[10px] text-slate-500 mt-0.5">
                                    Tag this discount so any fee using it shows up in the Govt Scholarship Register report.
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase text-slate-500">Category</Label>
                                    <Select
                                        value={form.scholarship_category || ''}
                                        onValueChange={(v) => setForm((f) => ({ ...f, scholarship_category: v === '__none__' ? '' : v }))}
                                    >
                                        <SelectTrigger className="h-9 text-xs rounded-lg"><SelectValue placeholder="Not a scholarship" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="__none__">Not a scholarship</SelectItem>
                                            {(Object.keys(SCHOLARSHIP_CATEGORY_LABELS) as ScholarshipCategory[])
                                                .filter(k => k !== '')
                                                .map((k) => (
                                                    <SelectItem key={k} value={k}>{SCHOLARSHIP_CATEGORY_LABELS[k]}</SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase text-slate-500">Funding Source</Label>
                                    <Select
                                        value={form.scholarship_source || ''}
                                        onValueChange={(v) => setForm((f) => ({ ...f, scholarship_source: v === '__none__' ? '' : v }))}
                                        disabled={!form.scholarship_category}
                                    >
                                        <SelectTrigger className="h-9 text-xs rounded-lg"><SelectValue placeholder="—" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="__none__">—</SelectItem>
                                            {(Object.keys(SCHOLARSHIP_SOURCE_LABELS) as ScholarshipSource[])
                                                .filter(k => k !== '')
                                                .map((k) => (
                                                    <SelectItem key={k} value={k}>{SCHOLARSHIP_SOURCE_LABELS[k]}</SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="discount-active"
                                checked={form.is_active}
                                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                                className="accent-amber-500 h-4 w-4 rounded"
                            />
                            <Label htmlFor="discount-active" className="text-xs font-bold text-slate-600 cursor-pointer">
                                Active
                            </Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDialogOpen(false)}
                            className="rounded-xl"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl gap-1.5"
                        >
                            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                            {editTarget ? 'Update' : 'Create'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
