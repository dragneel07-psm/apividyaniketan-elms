// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Plus, Receipt, CreditCard,
    Search, Filter, Loader2,
    AlertCircle, CheckCircle2,
    Clock, MoreVertical, Download,
    Users, Calendar
} from 'lucide-react';
import { billingAPI, academicAPI, StudentFee, FeeStructure, AcademicClass, Payment } from '@/lib/api';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { PaymentDialog } from './PaymentDialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";

import { Skeleton } from "@/components/ui/skeleton";

export function StudentFeeList() {
    const [loading, setLoading] = useState(true);
    const [fees, setFees] = useState<StudentFee[]>([]);
    const [structures, setStructures] = useState<FeeStructure[]>([]);
    const [classes, setClasses] = useState<AcademicClass[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'overdue'>('all');
    const [isPaymentOpen, setIsPaymentOpen] = useState(false);
    const [selectedFee, setSelectedFee] = useState<StudentFee | null>(null);
    const [waiveTarget, setWaiveTarget] = useState<StudentFee | null>(null);
    const [historyTarget, setHistoryTarget] = useState<StudentFee | null>(null);
    const [statementTarget, setStatementTarget] = useState<StudentFee | null>(null);
    const [actionPayments, setActionPayments] = useState<Payment[]>([]);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [feeData, structureData, classData] = await Promise.all([
                billingAPI.getStudentFees(),
                billingAPI.getFeeStructures(),
                academicAPI.getClasses()
            ]);
            setFees(feeData);
            setStructures(structureData);
            setClasses(classData);
        } catch (error) {
            toast.error("Failed to load fee data");
        } finally {
            setLoading(false);
        }
    };

    const handleRecordPayment = (fee: StudentFee) => {
        setSelectedFee(fee);
        setIsPaymentOpen(true);
    };

    const loadPaymentsForStudent = async (studentId: string) => {
        setActionLoading(true);
        try {
            const all = await billingAPI.getPayments();
            setActionPayments(all.filter(p => p.student === studentId));
        } catch {
            toast.error("Failed to load payment history");
            setActionPayments([]);
        } finally {
            setActionLoading(false);
        }
    };

    const openHistory = (fee: StudentFee) => {
        setHistoryTarget(fee);
        loadPaymentsForStudent(fee.student);
    };

    const openStatement = (fee: StudentFee) => {
        setStatementTarget(fee);
        loadPaymentsForStudent(fee.student);
    };

    const confirmWaive = async () => {
        if (!waiveTarget) return;
        try {
            await billingAPI.updateStudentFee(waiveTarget.student_fee_id, { status: 'waived' });
            toast.success("Fee waived");
            setWaiveTarget(null);
            await loadData();
        } catch {
            toast.error("Failed to waive fee");
        }
    };

    const escapeHtml = (s: string) =>
        s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

    const printStatement = () => {
        if (!statementTarget) return;
        const studentFees = fees.filter(f => f.student === statementTarget.student);
        const totalDue = studentFees.reduce((s, f) => s + Number(f.amount_due || 0), 0);
        const totalPaid = studentFees.reduce((s, f) => s + Number(f.amount_paid || 0), 0);
        const outstanding = totalDue - totalPaid;
        const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const today = new Date().toLocaleDateString();

        const feeRows = studentFees.map(f => `
            <tr>
                <td>${escapeHtml(f.fee_name || '')}</td>
                <td>${new Date(f.due_date).toLocaleDateString()}</td>
                <td class="num">$${fmt(Number(f.amount_due))}</td>
                <td class="num paid">$${fmt(Number(f.amount_paid))}</td>
                <td class="status">${escapeHtml(f.status)}</td>
            </tr>`).join('');

        const paymentRows = actionPayments.map(p => `
            <tr>
                <td>${new Date(p.payment_date).toLocaleDateString()}</td>
                <td class="cap">${escapeHtml(p.method)}</td>
                <td>${escapeHtml(p.transaction_id || '—')}</td>
                <td class="num paid">$${fmt(Number(p.amount))}</td>
            </tr>`).join('');

        const html = `<!doctype html>
<html><head><title>Account Statement — ${escapeHtml(statementTarget.student_name || '')}</title>
<style>
  @page { size: A4; margin: 1.5cm; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; color: #1a202c; font-size: 12px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .meta { color: #64748b; font-size: 11px; margin-bottom: 18px; }
  .summary { display: flex; gap: 12px; margin-bottom: 24px; }
  .card { flex: 1; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; }
  .card .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; }
  .card .value { font-size: 16px; font-weight: 700; margin-top: 2px; }
  .card.due .value { color: ${outstanding > 0 ? '#dc2626' : '#059669'}; }
  .card.paid .value { color: #059669; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #475569; margin: 18px 0 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { text-align: left; text-transform: uppercase; font-size: 9px; letter-spacing: 0.5px; color: #64748b; padding: 6px 8px; border-bottom: 1px solid #e2e8f0; }
  td { padding: 6px 8px; border-bottom: 1px solid #f1f5f9; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  td.paid { color: #059669; font-weight: 600; }
  td.cap, td.status { text-transform: capitalize; }
  .empty { color: #94a3b8; font-style: italic; padding: 12px 0; }
  .footer { margin-top: 36px; font-size: 10px; color: #94a3b8; text-align: center; }
</style></head><body>
  <h1>Account Statement</h1>
  <div class="meta">${escapeHtml(statementTarget.student_name || '')} &middot; Generated ${today}</div>
  <div class="summary">
    <div class="card"><div class="label">Total Charged</div><div class="value">$${fmt(totalDue)}</div></div>
    <div class="card paid"><div class="label">Total Paid</div><div class="value">$${fmt(totalPaid)}</div></div>
    <div class="card due"><div class="label">Outstanding</div><div class="value">$${fmt(outstanding)}</div></div>
  </div>
  <h2>Fees</h2>
  ${studentFees.length ? `<table><thead><tr><th>Item</th><th>Due</th><th class="num">Charged</th><th class="num">Paid</th><th>Status</th></tr></thead><tbody>${feeRows}</tbody></table>` : '<div class="empty">No fees recorded.</div>'}
  <h2>Payments (${actionPayments.length})</h2>
  ${actionPayments.length ? `<table><thead><tr><th>Date</th><th>Method</th><th>Reference</th><th class="num">Amount</th></tr></thead><tbody>${paymentRows}</tbody></table>` : '<div class="empty">No payments recorded.</div>'}
  <div class="footer">Computer-generated statement.</div>
  <script>window.onload = () => { window.print(); }</script>
</body></html>`;

        const w = window.open('', '_blank', 'width=900,height=1000');
        if (!w) {
            toast.error("Unable to open print window. Allow pop-ups and try again.");
            return;
        }
        w.document.open();
        w.document.write(html);
        w.document.close();
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'paid': return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200"><CheckCircle2 className="h-3 w-3 mr-1" /> Paid</Badge>;
            case 'partial': return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200"><Clock className="h-3 w-3 mr-1" /> Partial</Badge>;
            case 'overdue': return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200"><AlertCircle className="h-3 w-3 mr-1" /> Overdue</Badge>;
            case 'pending': return <Badge variant="outline" className="text-slate-500 border-slate-200">Pending</Badge>;
            default: return <Badge variant="secondary">{status}</Badge>;
        }
    };

    const filteredFees = fees.filter(f => {
        const matchesSearch = f.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            f.fee_name?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || f.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-xl" />
                        <div className="space-y-2">
                            <Skeleton className="h-6 w-48" />
                            <Skeleton className="h-4 w-64" />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Skeleton className="h-10 w-32" />
                        <Skeleton className="h-10 w-40" />
                    </div>
                </div>
                <Card className="border-slate-200 shadow-sm overflow-hidden">
                    <CardHeader className="py-4 border-b border-slate-100">
                        <div className="flex justify-between items-center">
                            <Skeleton className="h-6 w-32" />
                            <Skeleton className="h-10 w-64" />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="p-6 space-y-4">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Skeleton className="h-9 w-9 rounded-full" />
                                        <div className="space-y-1">
                                            <Skeleton className="h-4 w-32" />
                                            <Skeleton className="h-3 w-20" />
                                        </div>
                                    </div>
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-4 w-20" />
                                    <Skeleton className="h-4 w-16" />
                                    <Skeleton className="h-6 w-24 rounded-full" />
                                    <Skeleton className="h-8 w-20" />
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-xl">
                        <Receipt className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Student Fees</h2>
                        <p className="text-slate-500 text-sm">Track payments, balances, and issue new bills</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="border-slate-200 hover:bg-slate-50">
                        <Download className="h-4 w-4 mr-2" /> Export CSV
                    </Button>
                    <Button className="bg-indigo-600 hover:bg-indigo-700 shadow-sm">
                        <Plus className="h-4 w-4 mr-2" /> Bulk Assign Fees
                    </Button>
                </div>
            </div>

            <Card className="border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="py-4 border-b border-slate-100 flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <CardTitle className="text-lg font-bold">Billing Records</CardTitle>
                            <div className="hidden md:flex gap-1">
                                <Badge variant="secondary" className="bg-slate-100 text-slate-600">Total: {filteredFees.length}</Badge>
                                <Badge variant="secondary" className="bg-red-50 text-red-600">Unpaid: {fees.filter(f => f.status !== 'paid').length}</Badge>
                            </div>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            <div className="relative flex-1 md:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search student or fee..."
                                    className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="icon" className="shrink-0 border-slate-200">
                                        <Filter className={`h-4 w-4 ${statusFilter !== 'all' ? 'text-indigo-600' : 'text-slate-500'}`} />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setStatusFilter('all')} className={statusFilter === 'all' ? 'bg-slate-100 font-bold' : ''}>
                                        All Statuses
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setStatusFilter('paid')} className={statusFilter === 'paid' ? 'text-emerald-600 font-bold bg-emerald-50' : ''}>
                                        Paid
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setStatusFilter('pending')} className={statusFilter === 'pending' ? 'text-slate-600 font-bold bg-slate-50' : ''}>
                                        Pending
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setStatusFilter('overdue')} className={statusFilter === 'overdue' ? 'text-red-600 font-bold bg-red-50' : ''}>
                                        Overdue
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                    {statusFilter !== 'all' && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-500 uppercase">Active Filter:</span>
                            <Badge variant="secondary" className="capitalize flex gap-1 items-center cursor-pointer hover:bg-slate-200" onClick={() => setStatusFilter('all')}>
                                {statusFilter} <span className="text-slate-400 ml-1">×</span>
                            </Badge>
                        </div>
                    )}
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-separate border-spacing-0">
                            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-4 border-b">Student</th>
                                    <th className="px-6 py-4 border-b">Fee Item</th>
                                    <th className="px-6 py-4 border-b">Amount Due</th>
                                    <th className="px-6 py-4 border-b">Paid</th>
                                    <th className="px-6 py-4 border-b">Balance</th>
                                    <th className="px-6 py-4 border-b">Due Date</th>
                                    <th className="px-6 py-4 border-b">Status</th>
                                    <th className="px-6 py-4 border-b text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {filteredFees.map((fee) => (
                                    <tr key={fee.student_fee_id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-700 font-bold text-xs border border-indigo-100">
                                                    {fee.student_name?.split(' ').map(n => n[0]).join('')}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 leading-none mb-1">{fee.student_name}</p>
                                                    <p className="text-[10px] text-slate-400 font-medium">ID: {fee.student.slice(0, 8)}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-medium text-slate-700">{fee.fee_name}</p>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-slate-900">
                                            ${fee.amount_due.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-emerald-600">
                                            ${fee.amount_paid.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`font-black ${fee.balance! > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                                                ${(fee.balance || 0).toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                                                <Calendar className="h-3.5 w-3.5" />
                                                {new Date(fee.due_date).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getStatusBadge(fee.status)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                {fee.status !== 'paid' && (
                                                    <Button
                                                        size="sm"
                                                        className="h-8 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white border border-indigo-100 shadow-none font-bold text-xs"
                                                        onClick={() => handleRecordPayment(fee)}
                                                    >
                                                        Pay Now
                                                    </Button>
                                                )}
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-44">
                                                        <DropdownMenuItem
                                                            className="text-xs font-bold gap-2"
                                                            onClick={() =>
                                                                billingAPI.generateBill(fee.student_fee_id)
                                                                    .catch(() => toast.error('Failed to download bill'))
                                                            }
                                                        >
                                                            <Download className="h-3.5 w-3.5" /> Download Bill
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="text-xs font-bold gap-2" onClick={() => openStatement(fee)}>
                                                            <Download className="h-3.5 w-3.5" /> Statement
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="text-xs font-bold gap-2" onClick={() => openHistory(fee)}>
                                                            <Filter className="h-3.5 w-3.5" /> History
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            className="text-xs font-bold gap-2 text-red-600"
                                                            disabled={fee.status === 'paid' || fee.status === 'waived'}
                                                            onClick={() => setWaiveTarget(fee)}
                                                        >
                                                            <AlertCircle className="h-3.5 w-3.5" /> Waive Fee
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredFees.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center justify-center space-y-3">
                                                <div className="p-4 bg-slate-50 rounded-full">
                                                    <Search className="h-8 w-8 text-slate-300" />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-slate-900 font-bold">No results found</p>
                                                    <p className="text-slate-500 text-sm max-w-xs mx-auto">Try adjusting your search or filters to find what you're looking for.</p>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <PaymentDialog
                open={isPaymentOpen}
                onOpenChange={setIsPaymentOpen}
                fee={selectedFee}
                onSuccess={loadData}
            />

            <Dialog open={!!waiveTarget} onOpenChange={(o) => !o && setWaiveTarget(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Waive this fee?</DialogTitle>
                        <DialogDescription>
                            {waiveTarget && (
                                <>
                                    Mark <span className="font-semibold">{waiveTarget.fee_name}</span> for{' '}
                                    <span className="font-semibold">{waiveTarget.student_name}</span> as waived.
                                    The outstanding balance of ${(waiveTarget.balance ?? (waiveTarget.amount_due - waiveTarget.amount_paid)).toLocaleString()} will be cleared.
                                    This cannot be undone from the UI.
                                </>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setWaiveTarget(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmWaive}>Waive Fee</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!historyTarget} onOpenChange={(o) => !o && setHistoryTarget(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Payment History</DialogTitle>
                        <DialogDescription>
                            {historyTarget && <>Payments recorded for {historyTarget.student_name}.</>}
                        </DialogDescription>
                    </DialogHeader>
                    {actionLoading ? (
                        <div className="py-8 text-center text-sm text-slate-500">Loading…</div>
                    ) : actionPayments.length === 0 ? (
                        <div className="py-8 text-center text-sm text-slate-500">No payments recorded.</div>
                    ) : (
                        <div className="max-h-96 overflow-y-auto">
                            <table className="w-full text-sm">
                                <thead className="text-xs uppercase text-slate-500 border-b">
                                    <tr>
                                        <th className="text-left py-2">Date</th>
                                        <th className="text-left py-2">Method</th>
                                        <th className="text-left py-2">Reference</th>
                                        <th className="text-right py-2">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {actionPayments.map(p => (
                                        <tr key={p.payment_id} className="border-b last:border-b-0">
                                            <td className="py-2">{new Date(p.payment_date).toLocaleDateString()}</td>
                                            <td className="py-2 capitalize">{p.method}</td>
                                            <td className="py-2 text-slate-500">{p.transaction_id || '—'}</td>
                                            <td className="py-2 text-right font-semibold">${Number(p.amount).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={!!statementTarget} onOpenChange={(o) => !o && setStatementTarget(null)}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Account Statement</DialogTitle>
                        <DialogDescription>
                            {statementTarget && <>Full fee and payment summary for {statementTarget.student_name}.</>}
                        </DialogDescription>
                    </DialogHeader>
                    {statementTarget && (() => {
                        const studentFees = fees.filter(f => f.student === statementTarget.student);
                        const totalDue = studentFees.reduce((s, f) => s + Number(f.amount_due || 0), 0);
                        const totalPaid = studentFees.reduce((s, f) => s + Number(f.amount_paid || 0), 0);
                        const outstanding = totalDue - totalPaid;
                        return (
                            <div className="space-y-4">
                                <div className="grid grid-cols-3 gap-3 text-sm">
                                    <div className="rounded-lg border p-3">
                                        <div className="text-xs text-slate-500">Total Charged</div>
                                        <div className="font-bold">${totalDue.toLocaleString()}</div>
                                    </div>
                                    <div className="rounded-lg border p-3">
                                        <div className="text-xs text-slate-500">Total Paid</div>
                                        <div className="font-bold text-emerald-600">${totalPaid.toLocaleString()}</div>
                                    </div>
                                    <div className="rounded-lg border p-3">
                                        <div className="text-xs text-slate-500">Outstanding</div>
                                        <div className={`font-bold ${outstanding > 0 ? 'text-red-600' : 'text-slate-500'}`}>${outstanding.toLocaleString()}</div>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">Fees</h4>
                                    <table className="w-full text-sm">
                                        <thead className="text-xs uppercase text-slate-500 border-b">
                                            <tr>
                                                <th className="text-left py-2">Item</th>
                                                <th className="text-left py-2">Due</th>
                                                <th className="text-right py-2">Charged</th>
                                                <th className="text-right py-2">Paid</th>
                                                <th className="text-right py-2">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {studentFees.map(f => (
                                                <tr key={f.student_fee_id} className="border-b last:border-b-0">
                                                    <td className="py-2">{f.fee_name}</td>
                                                    <td className="py-2">{new Date(f.due_date).toLocaleDateString()}</td>
                                                    <td className="py-2 text-right">${Number(f.amount_due).toLocaleString()}</td>
                                                    <td className="py-2 text-right text-emerald-600">${Number(f.amount_paid).toLocaleString()}</td>
                                                    <td className="py-2 text-right capitalize">{f.status}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">Payments ({actionPayments.length})</h4>
                                    {actionLoading ? (
                                        <div className="py-4 text-center text-sm text-slate-500">Loading payments…</div>
                                    ) : actionPayments.length === 0 ? (
                                        <div className="py-4 text-center text-sm text-slate-500">No payments recorded.</div>
                                    ) : (
                                        <table className="w-full text-sm">
                                            <thead className="text-xs uppercase text-slate-500 border-b">
                                                <tr>
                                                    <th className="text-left py-2">Date</th>
                                                    <th className="text-left py-2">Method</th>
                                                    <th className="text-right py-2">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {actionPayments.map(p => (
                                                    <tr key={p.payment_id} className="border-b last:border-b-0">
                                                        <td className="py-2">{new Date(p.payment_date).toLocaleDateString()}</td>
                                                        <td className="py-2 capitalize">{p.method}</td>
                                                        <td className="py-2 text-right font-semibold">${Number(p.amount).toLocaleString()}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={printStatement}>Print</Button>
                                </DialogFooter>
                            </div>
                        );
                    })()}
                </DialogContent>
            </Dialog>
        </div>
    );
}
