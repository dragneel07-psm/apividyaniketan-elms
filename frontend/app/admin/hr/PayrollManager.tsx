// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { hrAPI, HRPayrollPeriod, HRSalarySlip } from '@/lib/api';
import {
    FileText, ChevronRight, Sparkles, CheckCheck,
    ArrowLeft, DollarSign, Users, CreditCard, Download, Loader2, Plus
} from 'lucide-react';

const PERIOD_STATUS_COLOR: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-600 border-slate-200',
    processing: 'bg-amber-100 text-amber-700 border-amber-200',
    finalized: 'bg-blue-100 text-blue-700 border-blue-200',
    paid: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const SLIP_STATUS_COLOR: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-500',
    finalized: 'bg-blue-100 text-blue-700',
    paid: 'bg-emerald-100 text-emerald-700',
};

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

export function PayrollManager() {
    const [periods, setPeriods] = useState<HRPayrollPeriod[]>([]);
    const [selectedPeriod, setSelectedPeriod] = useState<HRPayrollPeriod | null>(null);
    const [slips, setSlips] = useState<HRSalarySlip[]>([]);
    const [loading, setLoading] = useState(true);
    const [slipsLoading, setSlipsLoading] = useState(false);
    const [actionId, setActionId] = useState<string | null>(null);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [newPeriodOpen, setNewPeriodOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [newForm, setNewForm] = useState({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        start_date: '',
        end_date: '',
        working_days: 26,
        notes: '',
    });

    const handleCreatePeriod = async () => {
        setCreating(true);
        try {
            const monthName = MONTHS[newForm.month - 1];
            await hrAPI.createPayrollPeriod({
                name: `${monthName} ${newForm.year}`,
                month: newForm.month,
                year: newForm.year,
                start_date: newForm.start_date,
                end_date: newForm.end_date,
                working_days: newForm.working_days,
                notes: newForm.notes,
            });
            setNewPeriodOpen(false);
            setNewForm({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), start_date: '', end_date: '', working_days: 26, notes: '' });
            await loadPeriods();
        } catch {
            /* handle silently */
        } finally {
            setCreating(false);
        }
    };

    const loadPeriods = async () => {
        setLoading(true);
        try {
            const data = await hrAPI.getPayrollPeriods();
            setPeriods(Array.isArray(data) ? data : []);
        } catch {
            setPeriods([]);
        } finally {
            setLoading(false);
        }
    };

    const loadSlips = async (period: HRPayrollPeriod) => {
        setSlipsLoading(true);
        try {
            const data = await hrAPI.getSalarySlips({ payroll_period: period.period_id });
            setSlips(Array.isArray(data) ? data : []);
        } catch {
            setSlips([]);
        } finally {
            setSlipsLoading(false);
        }
    };

    useEffect(() => { loadPeriods(); }, []);

    const openPeriod = async (period: HRPayrollPeriod) => {
        setSelectedPeriod(period);
        await loadSlips(period);
    };

    const handleGenerateSlips = async () => {
        if (!selectedPeriod) return;
        setActionId('generate');
        try {
            const res = await hrAPI.generateSlips(selectedPeriod.period_id);
            alert(res.message);
            await loadSlips(selectedPeriod);
        } catch {
            /* handle silently */
        } finally {
            setActionId(null);
        }
    };

    const handleFinalize = async () => {
        if (!selectedPeriod) return;
        setActionId('finalize');
        try {
            const updated = await hrAPI.finalizePayrollPeriod(selectedPeriod.period_id);
            setSelectedPeriod(updated);
            await loadPeriods();
            await loadSlips(updated);
        } catch {
            /* handle silently */
        } finally {
            setActionId(null);
        }
    };

    const handleDownloadPayslip = async (slip: HRSalarySlip) => {
        setDownloadingId(slip.slip_id);
        try {
            const empName = slip.employee_name?.replace(/\s+/g, '_') || 'employee';
            await hrAPI.downloadPayslip(slip.slip_id, `payslip_${empName}_${slip.period_name?.replace(/\s+/g, '_') || ''}.pdf`);
        } catch {
            /* handle silently */
        } finally {
            setDownloadingId(null);
        }
    };

    const handleMarkPaid = async (slip: HRSalarySlip) => {
        const date = new Date().toISOString().split('T')[0];
        setActionId(slip.slip_id);
        try {
            await hrAPI.markSlipPaid(slip.slip_id, {
                payment_date: date,
                payment_method: 'bank_transfer',
            });
            if (selectedPeriod) await loadSlips(selectedPeriod);
        } catch {
            /* handle silently */
        } finally {
            setActionId(null);
        }
    };

    const totalNetSalary = slips.reduce((s, slip) => s + Number(slip.net_salary), 0);

    // Slip Detail View
    if (selectedPeriod) {
        return (
            <div className="space-y-5">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedPeriod(null)}
                        className="gap-2 text-slate-600 hover:text-slate-900 rounded-xl"
                    >
                        <ArrowLeft className="h-4 w-4" /> Back
                    </Button>
                    <div>
                        <h2 className="text-lg font-black text-slate-900">{selectedPeriod.name}</h2>
                        <p className="text-xs text-slate-500">
                            {selectedPeriod.start_date} → {selectedPeriod.end_date} · {selectedPeriod.working_days} working days
                        </p>
                    </div>
                    <Badge className={`ml-auto text-xs font-bold px-3 py-1 ${PERIOD_STATUS_COLOR[selectedPeriod.status]}`}>
                        {selectedPeriod.status.toUpperCase()}
                    </Badge>
                </div>

                {/* Summary row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                        { icon: <Users className="h-5 w-5 text-indigo-600" />, label: 'Total Slips', value: slips.length, color: 'bg-indigo-50' },
                        { icon: <DollarSign className="h-5 w-5 text-emerald-600" />, label: 'Total Net Payout', value: totalNetSalary.toLocaleString(), color: 'bg-emerald-50' },
                        { icon: <CheckCheck className="h-5 w-5 text-blue-600" />, label: 'Paid', value: slips.filter(s => s.status === 'paid').length, color: 'bg-blue-50' },
                        { icon: <FileText className="h-5 w-5 text-amber-600" />, label: 'Draft / Finalized', value: slips.filter(s => s.status !== 'paid').length, color: 'bg-amber-50' },
                    ].map((s, i) => (
                        <Card key={i} className="border-slate-200 shadow-sm">
                            <CardContent className="p-4 flex items-center gap-3">
                                <div className={`h-10 w-10 rounded-xl ${s.color} flex items-center justify-center`}>{s.icon}</div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.label}</p>
                                    <p className="text-lg font-black text-slate-900">{s.value}</p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Actions */}
                {selectedPeriod.status === 'draft' && (
                    <div className="flex gap-3">
                        <Button
                            onClick={handleGenerateSlips}
                            disabled={!!actionId}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold h-9 gap-2"
                        >
                            <Sparkles className="h-4 w-4" />
                            {actionId === 'generate' ? 'Generating...' : 'Auto-Generate Slips'}
                        </Button>
                        <Button
                            onClick={handleFinalize}
                            disabled={!!actionId || slips.length === 0}
                            variant="outline"
                            className="border-blue-200 text-blue-700 hover:bg-blue-50 rounded-xl text-xs font-bold h-9 gap-2"
                        >
                            <CheckCheck className="h-4 w-4" />
                            {actionId === 'finalize' ? 'Finalizing...' : 'Finalize Period'}
                        </Button>
                    </div>
                )}

                {/* Salary Slips Table */}
                {slipsLoading ? (
                    <div className="space-y-2 animate-pulse">
                        {[1, 2, 3].map(i => <div key={i} className="h-14 bg-slate-100 rounded-xl" />)}
                    </div>
                ) : slips.length === 0 ? (
                    <Card className="border-dashed border-2 border-slate-200">
                        <CardContent className="py-14 text-center">
                            <FileText className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                            <p className="text-slate-400 font-medium">No salary slips yet.</p>
                            <p className="text-xs text-slate-400 mt-1">Click &quot;Auto-Generate Slips&quot; to create slips for all active employees.</p>
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="border-slate-200 shadow-sm overflow-hidden">
                        <CardHeader className="border-b border-slate-100 py-3 px-5">
                            <CardTitle className="text-sm font-bold text-slate-700">Salary Slips</CardTitle>
                        </CardHeader>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        {['Employee', 'Department', 'Basic', 'Gross', 'Deductions', 'Net Salary', 'Status', ''].map(h => (
                                            <th key={h} className="px-4 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {slips.map(slip => (
                                        <tr key={slip.slip_id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-4 py-3">
                                                <div>
                                                    <p className="font-bold text-slate-900">{slip.employee_name}</p>
                                                    {slip.employee_code && (
                                                        <p className="text-xs text-slate-400 font-mono">#{slip.employee_code}</p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-slate-500">{slip.department_name ?? '—'}</td>
                                            <td className="px-4 py-3 text-xs font-medium text-slate-700">{Number(slip.basic_salary).toLocaleString()}</td>
                                            <td className="px-4 py-3 text-xs font-medium text-slate-700">{Number(slip.gross_salary).toLocaleString()}</td>
                                            <td className="px-4 py-3 text-xs font-medium text-red-600">{Number(slip.total_deductions).toLocaleString()}</td>
                                            <td className="px-4 py-3 text-sm font-black text-emerald-700">{Number(slip.net_salary).toLocaleString()}</td>
                                            <td className="px-4 py-3">
                                                <Badge className={`text-[10px] font-bold px-2 py-0.5 ${SLIP_STATUS_COLOR[slip.status]}`}>
                                                    {slip.status.toUpperCase()}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    {slip.status === 'finalized' && (
                                                        <Button
                                                            size="sm"
                                                            disabled={actionId === slip.slip_id}
                                                            onClick={() => handleMarkPaid(slip)}
                                                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg h-7 px-3 gap-1"
                                                        >
                                                            <CreditCard className="h-3 w-3" /> Pay
                                                        </Button>
                                                    )}
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        disabled={downloadingId === slip.slip_id}
                                                        onClick={() => handleDownloadPayslip(slip)}
                                                        className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-xs rounded-lg h-7 px-3 gap-1"
                                                    >
                                                        {downloadingId === slip.slip_id
                                                            ? <Loader2 className="h-3 w-3 animate-spin" />
                                                            : <Download className="h-3 w-3" />}
                                                        PDF
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}
            </div>
        );
    }

    // Period List View
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">Select a payroll period to manage salary slips.</p>
                <Button
                    onClick={() => setNewPeriodOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold h-9 px-4 gap-2"
                >
                    <Plus className="h-4 w-4" /> New Period
                </Button>
            </div>

            {/* New Period Dialog */}
            <Dialog open={newPeriodOpen} onOpenChange={setNewPeriodOpen}>
                <DialogContent className="sm:max-w-[440px]">
                    <DialogHeader>
                        <DialogTitle className="font-black text-slate-900">Create Payroll Period</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Month</label>
                                <select
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white"
                                    value={newForm.month}
                                    onChange={e => setNewForm(f => ({ ...f, month: Number(e.target.value) }))}
                                >
                                    {MONTHS.map((m, i) => (
                                        <option key={m} value={i + 1}>{m}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Year</label>
                                <Input
                                    type="number"
                                    value={newForm.year}
                                    onChange={e => setNewForm(f => ({ ...f, year: Number(e.target.value) }))}
                                    className="rounded-xl border-slate-200 text-sm"
                                    min={2020}
                                    max={2099}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Start Date</label>
                                <Input
                                    type="date"
                                    value={newForm.start_date}
                                    onChange={e => setNewForm(f => ({ ...f, start_date: e.target.value }))}
                                    className="rounded-xl border-slate-200 text-sm"
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">End Date</label>
                                <Input
                                    type="date"
                                    value={newForm.end_date}
                                    onChange={e => setNewForm(f => ({ ...f, end_date: e.target.value }))}
                                    className="rounded-xl border-slate-200 text-sm"
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Working Days</label>
                            <Input
                                type="number"
                                value={newForm.working_days}
                                onChange={e => setNewForm(f => ({ ...f, working_days: Number(e.target.value) }))}
                                className="rounded-xl border-slate-200 text-sm"
                                min={1}
                                max={31}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Notes (optional)</label>
                            <Input
                                value={newForm.notes}
                                onChange={e => setNewForm(f => ({ ...f, notes: e.target.value }))}
                                placeholder="E.g. includes bonus payment..."
                                className="rounded-xl border-slate-200 text-sm"
                            />
                        </div>
                        <div className="flex gap-3 pt-1">
                            <Button
                                onClick={handleCreatePeriod}
                                disabled={creating || !newForm.start_date || !newForm.end_date}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm"
                            >
                                {creating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</> : 'Create Period'}
                            </Button>
                            <Button type="button" variant="outline" onClick={() => setNewPeriodOpen(false)} className="rounded-xl border-slate-200 text-slate-600">
                                Cancel
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {loading ? (
                <div className="space-y-3 animate-pulse">
                    {[1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-xl" />)}
                </div>
            ) : periods.length === 0 ? (
                <Card className="border-dashed border-2 border-slate-200">
                    <CardContent className="py-14 text-center">
                        <FileText className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                        <p className="text-slate-400 font-medium">No payroll periods yet.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-2">
                    {periods.map(period => (
                        <Card
                            key={period.period_id}
                            className="border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer"
                            onClick={() => openPeriod(period)}
                        >
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex flex-col items-center justify-center flex-shrink-0">
                                    <span className="text-[9px] font-bold text-indigo-400 uppercase">{MONTHS[period.month - 1]?.slice(0, 3)}</span>
                                    <span className="text-base font-black text-indigo-700">{period.year}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-slate-900">{period.name}</span>
                                        <Badge className={`text-[10px] font-bold px-2 py-0.5 ${PERIOD_STATUS_COLOR[period.status]}`}>
                                            {period.status.toUpperCase()}
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {period.start_date} → {period.end_date} · {period.working_days} working days · {period.slip_count} slips
                                    </p>
                                </div>
                                <ChevronRight className="h-5 w-5 text-slate-300 flex-shrink-0" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
