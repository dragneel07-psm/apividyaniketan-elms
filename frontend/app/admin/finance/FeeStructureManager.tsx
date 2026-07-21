// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Plus, Receipt, Trash2, Edit,
    CreditCard, DollarSign, Calendar,
    Loader2, AlertCircle, Search,
    ArrowUpRight, Users, Settings2, Layers
} from 'lucide-react';
import { billingAPI, academicAPI, FeeStructure, AcademicClass } from '@/lib/api';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { FeeStructureDialog } from './FeeStructureDialog';
import { FeeHeadsDialog } from './FeeHeadsDialog';

export function FeeStructureManager() {
    const [loading, setLoading] = useState(true);
    const [structures, setStructures] = useState<FeeStructure[]>([]);
    const [classes, setClasses] = useState<AcademicClass[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingStructure, setEditingStructure] = useState<FeeStructure | null>(null);
    const [headsTarget, setHeadsTarget] = useState<FeeStructure | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [feeData, classData] = await Promise.all([
                billingAPI.getFeeStructures(),
                academicAPI.getClasses()
            ]);
            setStructures(feeData);
            setClasses(classData);
        } catch (error) {
            toast.error("Failed to load fee structures");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this fee structure? This might affect existing student bills.')) return;
        try {
            await billingAPI.deleteFeeStructure(id);
            setStructures(structures.filter(s => s.fee_id !== id));
            toast.success("Fee structure deleted");
        } catch (error) {
            toast.error("Failed to delete fee structure");
        }
    };

    const handleSave = async (data: Partial<FeeStructure>) => {
        try {
            if (editingStructure?.fee_id) {
                const updated = await billingAPI.updateFeeStructure(editingStructure.fee_id, data);
                setStructures(structures.map(s => s.fee_id === updated.fee_id ? updated : s));
                toast.success("Fee structure updated");
            } else {
                const created = await billingAPI.createFeeStructure(data);
                setStructures([...structures, created]);
                toast.success("Fee structure created");
            }
            setIsDialogOpen(false);
        } catch (error) {
            toast.error("Failed to save fee structure");
        }
    };

    const filteredStructures = structures.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 space-y-4">
                <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
                <p className="text-slate-500 font-medium">Loading finance settings...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 rounded-xl">
                        <DollarSign className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Fee Structures</h2>
                        <p className="text-slate-500 text-sm">Define and manage tuition, transport, and other fees</p>
                    </div>
                </div>
                <Button
                    onClick={() => { setEditingStructure(null); setIsDialogOpen(true); }}
                    className="bg-emerald-600 hover:bg-emerald-700 shadow-sm"
                >
                    <Plus className="h-4 w-4 mr-2" /> New Fee Type
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-2 border-slate-200 shadow-sm">
                    <CardHeader className="py-4 border-b border-slate-100 flex flex-row items-center justify-between">
                        <CardTitle className="text-lg font-bold">Standard Fee Types</CardTitle>
                        <div className="relative w-48">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Filter..."
                                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:ring-1 focus:ring-emerald-500 outline-none"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                                    <tr>
                                        <th className="px-6 py-3">Fee Name</th>
                                        <th className="px-6 py-3">Frequency</th>
                                        <th className="px-6 py-3">Amount</th>
                                        <th className="px-6 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredStructures.map((s) => (
                                        <tr key={s.fee_id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                                                        <CreditCard className="h-4 w-4" />
                                                    </div>
                                                    <span className="font-bold text-slate-800">{s.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant="outline" className="capitalize bg-slate-50 text-slate-600 border-slate-200">
                                                    {s.frequency}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 font-black text-slate-900">
                                                Rs. {s.amount.toLocaleString()}
                                                {s.heads && s.heads.length > 0 && (
                                                    <div className="text-[10px] font-medium text-slate-500 mt-0.5">
                                                        {s.heads.length} head{s.heads.length === 1 ? '' : 's'}
                                                    </div>
                                                )}
                                                {s.late_fee_type && s.late_fee_type !== 'none' && (
                                                    <div className="text-[10px] font-medium text-amber-600 mt-0.5">
                                                        Late fee: {s.late_fee_type === 'flat' ? `Rs. ${s.late_fee_amount}` : `${s.late_fee_amount}%`} after {s.grace_days}d
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-1 opacity-10 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-slate-400 hover:text-violet-600 hover:bg-violet-50"
                                                        onClick={() => setHeadsTarget(s)}
                                                        title="Manage fee head breakdown"
                                                    >
                                                        <Layers className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                                                        onClick={() => { setEditingStructure(s); setIsDialogOpen(true); }}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                                        onClick={() => handleDelete(s.fee_id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredStructures.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">
                                                No fee structures defined yet.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card className="border-none shadow-md bg-gradient-to-br from-indigo-600 to-indigo-800 text-white">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <ArrowUpRight className="h-4 w-4" /> Quick Insights
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm">
                                <p className="text-xs opacity-80 uppercase font-black tracking-widest mb-1">Total Active Fees</p>
                                <h3 className="text-2xl font-black">{structures.length}</h3>
                            </div>
                            <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm">
                                <p className="text-xs opacity-80 uppercase font-black tracking-widest mb-1">Fee Frequency Mix</p>
                                <div className="flex gap-2 mt-2">
                                    <div className="h-1.5 flex-1 bg-white/40 rounded-full overflow-hidden">
                                        <div className="h-full bg-white w-2/3"></div>
                                    </div>
                                    <span className="text-[10px] font-bold">Monthly</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                            <CardTitle className="text-sm font-bold text-slate-800">Finance Tools</CardTitle>
                            <Settings2 className="h-4 w-4 text-slate-400" />
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3">
                            <Button variant="outline" className="w-full justify-start text-xs font-bold gap-3 h-10 border-slate-200 hover:bg-slate-50">
                                <Receipt className="h-4 w-4 text-indigo-600" /> Bulk Assignment Logic
                            </Button>
                            <Button variant="outline" className="w-full justify-start text-xs font-bold gap-3 h-10 border-slate-200 hover:bg-slate-50">
                                <Users className="h-4 w-4 text-emerald-600" /> Multi-Class Policies
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <FeeStructureDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onSave={handleSave}
                editingStructure={editingStructure}
                classes={classes}
            />

            <FeeHeadsDialog
                open={!!headsTarget}
                onOpenChange={(o) => { if (!o) { setHeadsTarget(null); loadData(); } }}
                structure={headsTarget}
            />
        </div>
    );
}
