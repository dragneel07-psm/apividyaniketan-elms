// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { billingAPI, academicAPI, FeeStructure, AcademicClass } from '@/lib/api';
import { toast } from 'sonner';
import { Plus, Trash2, Edit, Save, X, Coins, Users } from 'lucide-react';

export default function FeeStructureManager() {
    const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
    const [classes, setClasses] = useState<AcademicClass[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [assigningFee, setAssigningFee] = useState<FeeStructure | null>(null);
    const [dueDate, setDueDate] = useState<string>('');

    // Form State
    const [formData, setFormData] = useState<Partial<FeeStructure>>({
        name: '',
        amount: 0,
        frequency: 'monthly',
        academic_class: undefined
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [fees, cls] = await Promise.all([
                billingAPI.getFeeStructures(),
                academicAPI.getClasses()
            ]);
            setFeeStructures(fees);
            setClasses(cls);
        } catch (error) {
            toast.error('Failed to load fee data');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (fee?: FeeStructure) => {
        if (fee) {
            setEditingId(fee.fee_id);
            setFormData({
                name: fee.name,
                amount: fee.amount,
                frequency: fee.frequency,
                academic_class: fee.academic_class
            });
        } else {
            setEditingId(null);
            setFormData({
                name: '',
                amount: 0,
                frequency: 'monthly',
                academic_class: undefined
            });
        }
        setIsDialogOpen(true);
    };

    const handleSubmit = async () => {
        if (!formData.name || !formData.amount) {
            toast.error('Name and Amount are required');
            return;
        }

        try {
            if (editingId) {
                await billingAPI.updateFeeStructure(editingId, formData);
                toast.success('Fee structure updated');
            } else {
                await billingAPI.createFeeStructure(formData);
                toast.success('Fee structure created');
            }
            setIsDialogOpen(false);
            loadData();
        } catch (error) {
            toast.error('Failed to save fee structure');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this fee structure?')) return;
        try {
            await billingAPI.deleteFeeStructure(id);
            toast.success('Fee structure deleted');
            loadData();
        } catch (error) {
            toast.error('Failed to delete fee structure');
        }
    };

    const openAssignDialog = (fee: FeeStructure) => {
        setAssigningFee(fee);
        // Pre-fill class if the fee structure is already linked to one
        // We reuse formData.academic_class to store the selected class for assignment
        setFormData(prev => ({ ...prev, academic_class: fee.academic_class }));
        setDueDate('');
    };

    const handleAssign = async () => {
        if (!assigningFee || !dueDate) {
            toast.error('Please select a due date');
            return;
        }

        // Determine target class: either the fee's linked class OR the one selected in the dialog
        let classIdToAssign = assigningFee.academic_class;

        if (!classIdToAssign) {
            classIdToAssign = formData.academic_class;
        }

        if (!classIdToAssign) {
            toast.error('Please select a target class');
            return;
        }

        try {
            await billingAPI.assignBulkFees({
                fee_structure_id: assigningFee.fee_id,
                academic_class_id: classIdToAssign.toString(),
                due_date: dueDate
            });
            toast.success('Fees assigned successfully to students');
            setAssigningFee(null);
            setDueDate('');
        } catch (error) {
            console.error(error);
            toast.error('Failed to assign fees');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Fee Structures</h2>
                    <p className="text-muted-foreground">Manage school fee heads and amounts.</p>
                </div>
                <Button onClick={() => handleOpenDialog()}>
                    <Plus className="mr-2 h-4 w-4" /> Add Fee
                </Button>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fee Name</TableHead>
                                <TableHead>Class</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Frequency</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8">Loading...</TableCell>
                                </TableRow>
                            ) : feeStructures.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        No fee structures defined.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                feeStructures.map((fee) => (
                                    <TableRow key={fee.fee_id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 bg-indigo-100 rounded text-indigo-600">
                                                    <Coins className="h-4 w-4" />
                                                </div>
                                                {fee.name}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {fee.academic_class
                                                ? classes.find(c => c.id === fee.academic_class)?.name || 'Unknown Class'
                                                : <span className="text-slate-500 italic">All Classes</span>}
                                        </TableCell>
                                        <TableCell>${fee.amount.toLocaleString()}</TableCell>
                                        <TableCell className="capitalize">{fee.frequency.replace('_', ' ')}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => openAssignDialog(fee)} title="Assign to Students">
                                                <Users className="h-4 w-4 text-indigo-500" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(fee)}>
                                                <Edit className="h-4 w-4 text-slate-500" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(fee.fee_id)}>
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingId ? 'Edit Fee Structure' : 'New Fee Structure'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Fee Name</Label>
                            <Input
                                placeholder="e.g. Tuition Fee, Exam Fee"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Amount</Label>
                                <Input
                                    type="number"
                                    placeholder="0.00"
                                    value={formData.amount}
                                    onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Frequency</Label>
                                <Select
                                    value={formData.frequency}
                                    onValueChange={(val: any) => setFormData({ ...formData, frequency: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="monthly">Monthly</SelectItem>
                                        <SelectItem value="term">Term-wise</SelectItem>
                                        <SelectItem value="annual">Annual</SelectItem>
                                        <SelectItem value="one_time">One Time</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Applies To (Optional)</Label>
                            <Select
                                value={formData.academic_class ? formData.academic_class.toString() : "all"}
                                onValueChange={(val) => setFormData({ ...formData, academic_class: val === "all" ? undefined : parseInt(val) })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="All Classes" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Classes</SelectItem>
                                    {classes.map(c => (
                                        <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">If selected, this fee only applies to this class.</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSubmit}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!assigningFee} onOpenChange={(open) => !open && setAssigningFee(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Assign Fee: {assigningFee?.name}</DialogTitle>
                        <DialogDescription>Generate fee records for all students in the selected class.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Target Class</Label>
                            {assigningFee?.academic_class ? (
                                <div className="p-2 bg-slate-100 rounded border border-slate-200 text-sm">
                                    Locked to: <strong>{classes.find(c => c.id === assigningFee.academic_class)?.name}</strong>
                                </div>
                            ) : (
                                <Select
                                    value={formData.academic_class ? formData.academic_class.toString() : ""}
                                    onValueChange={(val) => setFormData({ ...formData, academic_class: parseInt(val) })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Class" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {classes.map(c => (
                                            <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>Due Date</Label>
                            <Input
                                type="date"
                                value={dueDate}
                                onChange={e => setDueDate(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAssigningFee(null)}>Cancel</Button>
                        <Button onClick={handleAssign}>Assign Fees</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
