// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { FeeStructure, AcademicClass } from '@/lib/api';
import { CreditCard, Layers, AlertCircle } from 'lucide-react';

interface FeeStructureDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (data: Partial<FeeStructure>) => Promise<void>;
    editingStructure: FeeStructure | null;
    classes: AcademicClass[];
}

export function FeeStructureDialog({ open, onOpenChange, onSave, editingStructure, classes }: FeeStructureDialogProps) {
    const [name, setName] = useState('');
    const [amount, setAmount] = useState<string>('');
    const [frequency, setFrequency] = useState<'monthly' | 'one_time' | 'annual' | 'term'>('monthly');
    const [targetClass, setTargetClass] = useState<string>('');
    const [lateFeeType, setLateFeeType] = useState<'none' | 'flat' | 'percent'>('none');
    const [lateFeeAmount, setLateFeeAmount] = useState<string>('0');
    const [graceDays, setGraceDays] = useState<string>('0');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (editingStructure) {
            setName(editingStructure.name);
            setAmount(editingStructure.amount.toString());
            setFrequency(editingStructure.frequency);
            setTargetClass(editingStructure.academic_class?.toString() || '');
            setLateFeeType(editingStructure.late_fee_type || 'none');
            setLateFeeAmount((editingStructure.late_fee_amount ?? 0).toString());
            setGraceDays((editingStructure.grace_days ?? 0).toString());
        } else {
            setName('');
            setAmount('');
            setFrequency('monthly');
            setTargetClass('');
            setLateFeeType('none');
            setLateFeeAmount('0');
            setGraceDays('0');
        }
    }, [editingStructure, open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await onSave({
                name,
                amount: parseFloat(amount),
                frequency,
                academic_class: (targetClass === 'all' || !targetClass) ? null : parseInt(targetClass),
                late_fee_type: lateFeeType,
                late_fee_amount: parseFloat(lateFeeAmount) || 0,
                grace_days: parseInt(graceDays) || 0,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg border-slate-200 shadow-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-emerald-50 rounded-lg">
                            <CreditCard className="h-5 w-5 text-emerald-600" />
                        </div>
                        <DialogTitle className="text-xl font-bold text-slate-900 tracking-tight">
                            {editingStructure ? 'Edit Fee Type' : 'Create Fee Type'}
                        </DialogTitle>
                    </div>
                    <DialogDescription className="text-slate-500">
                        Define the amount and frequency for this fee item.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-slate-500">Fee Name</Label>
                            <Input
                                id="name"
                                placeholder="e.g. Tuition Fee (Grade 10)"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                className="border-slate-200 focus:ring-emerald-500/20 shadow-sm h-11"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="amount" className="text-xs font-bold uppercase tracking-wider text-slate-500">Amount (Rs.)</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">Rs.</span>
                                    <Input
                                        id="amount"
                                        type="number"
                                        placeholder="0.00"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        required
                                        className="pl-10 border-slate-200 focus:ring-emerald-500/20 shadow-sm h-11"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="frequency" className="text-xs font-bold uppercase tracking-wider text-slate-500">Frequency</Label>
                                <Select value={frequency} onValueChange={(val: any) => setFrequency(val)}>
                                    <SelectTrigger className="border-slate-200 shadow-sm h-11">
                                        <SelectValue placeholder="Frequency" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="monthly">Monthly</SelectItem>
                                        <SelectItem value="term">Term-wise</SelectItem>
                                        <SelectItem value="annual">Annual</SelectItem>
                                        <SelectItem value="one_time">One-time</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="class" className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                                <Layers className="h-3 w-3" /> Target Class (Optional)
                            </Label>
                            <Select value={targetClass} onValueChange={setTargetClass}>
                                <SelectTrigger className="border-slate-200 shadow-sm h-11">
                                    <SelectValue placeholder="Global Fee (All Classes)" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Global (All Classes)</SelectItem>
                                    {classes.map(c => (
                                        <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-[10px] text-slate-400 italic mt-1">
                                If specified, this fee will only be available for the selected class.
                            </p>
                        </div>

                        {/* Late Fee Policy — Phase C */}
                        <div className="border border-amber-200 bg-amber-50/40 rounded-lg p-4 space-y-3">
                            <div className="flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-amber-600" />
                                <Label className="text-xs font-bold uppercase tracking-wider text-amber-700">Late Fee Policy</Label>
                            </div>
                            <p className="text-[11px] text-slate-500">
                                Applied automatically by the nightly job once the grace period has passed.
                            </p>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase text-slate-500">Type</Label>
                                    <Select value={lateFeeType} onValueChange={(v: any) => setLateFeeType(v)}>
                                        <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">None</SelectItem>
                                            <SelectItem value="flat">Flat (Rs.)</SelectItem>
                                            <SelectItem value="percent">% of Balance</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase text-slate-500">
                                        {lateFeeType === 'percent' ? 'Percent (0-100)' : 'Amount (Rs.)'}
                                    </Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={lateFeeAmount}
                                        onChange={(e) => setLateFeeAmount(e.target.value)}
                                        disabled={lateFeeType === 'none'}
                                        className="h-9 text-xs"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase text-slate-500">Grace Days</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        value={graceDays}
                                        onChange={(e) => setGraceDays(e.target.value)}
                                        disabled={lateFeeType === 'none'}
                                        className="h-9 text-xs"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="border-t border-slate-100 pt-6">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-400 hover:text-slate-600">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 shadow-sm min-w-[140px] h-11">
                            {isSubmitting ? (
                                <><span className="animate-spin mr-2">⏳</span> Saving...</>
                            ) : (
                                editingStructure ? 'Update Fee' : 'Create Fee Type'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
