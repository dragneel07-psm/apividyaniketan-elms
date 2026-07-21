// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { billingAPI, FeeStructure, AcademicClass } from '@/lib/api';
import { toast } from 'sonner';
import { Rocket, Calendar, Users, Loader2 } from 'lucide-react';

interface FeeAssignmentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    feeStructures: FeeStructure[];
    classes: AcademicClass[];
    onSuccess?: () => void;
}

export function FeeAssignmentDialog({ open, onOpenChange, feeStructures, classes, onSuccess }: FeeAssignmentDialogProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        fee_structure_id: '',
        academic_class_id: '',
        due_date: new Date().toISOString().split('T')[0],
    });

    const handleSubmit = async () => {
        if (!formData.fee_structure_id || !formData.academic_class_id || !formData.due_date) {
            toast.error('Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            await billingAPI.assignBulkFees(formData);
            toast.success('Fees assigned successfully to all students in the class');
            onOpenChange(false);
            if (onSuccess) onSuccess();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Failed to assign fees');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[450px] border-0 shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black text-slate-900 flex items-center gap-2">
                        <Rocket className="h-6 w-6 text-indigo-600" /> Bulk Fee Assignment
                    </DialogTitle>
                    <DialogDescription>
                        Assign a fee structure to all students in a specific class at once.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    <div className="space-y-2">
                        <Label className="font-extrabold text-slate-700 flex items-center gap-2">
                            <Rocket className="h-3.5 w-3.5 text-slate-400" /> Select Fee Structure
                        </Label>
                        <Select value={formData.fee_structure_id} onValueChange={v => setFormData({ ...formData, fee_structure_id: v })}>
                            <SelectTrigger className="border-slate-200">
                                <SelectValue placeholder="Choose structure..." />
                            </SelectTrigger>
                            <SelectContent>
                                {feeStructures.map(f => (
                                    <SelectItem key={f.fee_id} value={f.fee_id.toString()}>
                                        {f.name} (${f.amount})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label className="font-extrabold text-slate-700 flex items-center gap-2">
                            <Users className="h-3.5 w-3.5 text-slate-400" /> Target Class
                        </Label>
                        <Select value={formData.academic_class_id} onValueChange={v => setFormData({ ...formData, academic_class_id: v })}>
                            <SelectTrigger className="border-slate-200">
                                <SelectValue placeholder="Choose class..." />
                            </SelectTrigger>
                            <SelectContent>
                                {classes.map(c => (
                                    <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label className="font-extrabold text-slate-700 flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" /> Due Date
                        </Label>
                        <Input
                            type="date"
                            className="border-slate-200 font-medium"
                            value={formData.due_date}
                            onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="border-slate-200">Cancel</Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="bg-indigo-600 hover:bg-indigo-700 gap-2 font-bold px-8"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
                        Assign Now
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
