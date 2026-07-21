// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { academicAPI, paymentGatewayAPI, Parent, Student } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { toast as toastSonner } from 'sonner';
import {
    Wallet, Loader2, AlertCircle, CheckCircle2, Clock,
    XCircle, Receipt, DollarSign, TrendingDown, CreditCard,
} from 'lucide-react';
import {
    Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useTranslation } from '@/lib/localization';
import { formatCurrency, formatDate } from '@/lib/i18n/format';

export default function ParentFeesPage() {
    const { toast } = useToast();
    const { t, locale } = useTranslation();

    const FEE_STATUS: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
        paid:    { label: t('parent.fees.statusPaid'),    cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
        partial: { label: t('parent.fees.statusPartial'), cls: 'bg-amber-100 text-amber-700 border-amber-200',       icon: <Clock className="h-3.5 w-3.5" /> },
        pending: { label: t('parent.fees.statusPending'), cls: 'bg-slate-100 text-slate-600 border-slate-200',       icon: <Clock className="h-3.5 w-3.5" /> },
        overdue: { label: t('parent.fees.statusOverdue'), cls: 'bg-red-100 text-red-700 border-red-200',             icon: <XCircle className="h-3.5 w-3.5" /> },
    };
    const [parent, setParent] = useState<Parent | null>(null);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [feesData, setFeesData] = useState<{ fees: any[]; payments: any[]; summary: any } | null>(null);
    const [loading, setLoading] = useState(true);
    const [feesLoading, setFeesLoading] = useState(false);
    const [payDialog, setPayDialog] = useState(false);
    const [payingFee, setPayingFee] = useState<any>(null);
    const [payMethod, setPayMethod] = useState<'esewa' | 'khalti'>('esewa');
    const [payLoading, setPayLoading] = useState(false);

    useEffect(() => {
        academicAPI.getMyParent()
            .then((p) => {
                setParent(p);
                if (p.students.length > 0) setSelectedStudent(p.students[0]);
            })
            .catch(() => toast({ title: 'Error', description: t('parent.fees.errorLoadProfile'), variant: 'destructive' }))
            .finally(() => setLoading(false));
    }, [toast, t]);

    useEffect(() => {
        if (!selectedStudent) return;
        setFeesLoading(true);
        academicAPI.getChildFees(selectedStudent.student_id)
            .then(setFeesData)
            .catch(() => toast({ title: 'Error', description: t('parent.fees.errorLoad'), variant: 'destructive' }))
            .finally(() => setFeesLoading(false));
    }, [selectedStudent, toast, t]);

    const openPayDialog = (fee: any) => {
        setPayingFee(fee);
        setPayMethod('esewa');
        setPayDialog(true);
    };

    const confirmPay = async () => {
        if (!payingFee) return;
        setPayLoading(true);
        try {
            if (payMethod === 'esewa') {
                const fields = await paymentGatewayAPI.esewaInitiate(payingFee.student_fee_id ?? payingFee.id);
                const form = document.createElement('form');
                form.method = 'POST';
                form.action = 'https://rc-epay.esewa.com.np/api/epay/main/v2/form';
                Object.entries(fields).forEach(([k, v]) => {
                    const inp = document.createElement('input');
                    inp.type = 'hidden'; inp.name = k; inp.value = String(v);
                    form.appendChild(inp);
                });
                document.body.appendChild(form);
                form.submit();
            } else {
                const res = await paymentGatewayAPI.khaltiInitiate(payingFee.student_fee_id ?? payingFee.id);
                window.location.href = res.payment_url;
            }
        } catch {
            toastSonner.error(t('parent.fees.errorPayment'));
            setPayLoading(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
        </div>
    );

    if (!parent || parent.students.length === 0) return (
        <div className="p-8 text-center">
            <AlertCircle className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">{t('parent.fees.noChildren')}</p>
        </div>
    );

    const fees = feesData?.fees ?? [];
    const payments = feesData?.payments ?? [];
    const summary = feesData?.summary ?? {};

    const totalFee = summary.total_fee ?? fees.reduce((s: number, f: any) => s + (f.amount ?? 0), 0);
    const totalPaid = summary.total_paid ?? payments.reduce((s: number, p: any) => s + (p.amount_paid ?? p.amount ?? 0), 0);
    const totalDue = summary.total_due ?? Math.max(0, totalFee - totalPaid);
    const paidPct = totalFee > 0 ? Math.round((totalPaid / totalFee) * 100) : 0;

    const overdueCount = fees.filter((f: any) => f.status === 'overdue').length;

    return (
        <div className="p-6 md:p-8 space-y-6 max-w-5xl">
            {/* Header */}
            <div>
                <div className="flex items-center gap-2 text-violet-600 font-bold mb-1">
                    <Wallet className="h-4 w-4" />
                    <span className="text-[10px] uppercase tracking-[0.2em]">{t('parent.fees.sectionLabel')}</span>
                </div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">{t('parent.fees.pageTitle')}</h1>
                <p className="text-slate-500 font-medium">{t('parent.fees.subtitle')}</p>
            </div>

            {/* Child selector */}
            {parent.students.length > 1 && (
                <div className="flex gap-2 flex-wrap">
                    {parent.students.map((s) => (
                        <Button
                            key={s.student_id}
                            size="sm"
                            variant={selectedStudent?.student_id === s.student_id ? 'default' : 'outline'}
                            className="rounded-xl h-9 text-xs font-bold"
                            onClick={() => setSelectedStudent(s)}
                        >
                            {s.first_name} {s.last_name}
                        </Button>
                    ))}
                </div>
            )}

            {feesLoading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
                </div>
            ) : (
                <>
                    {/* Overdue alert */}
                    {overdueCount > 0 && (
                        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                            <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                            <p className="text-sm font-bold text-red-700">
                                {overdueCount !== 1 ? t('parent.fees.overdueAlert_plural', { count: overdueCount }) : t('parent.fees.overdueAlert', { count: overdueCount })}
                            </p>
                        </div>
                    )}

                    {/* Summary cards */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {[
                            { label: t('parent.fees.totalFee'),    value: formatCurrency(totalFee, locale),   icon: <DollarSign className="h-5 w-5 text-slate-500" />,   bg: 'bg-slate-50' },
                            { label: t('parent.fees.amountPaid'),  value: formatCurrency(totalPaid, locale),  icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />, bg: 'bg-emerald-50' },
                            { label: t('parent.fees.balanceDue'),  value: formatCurrency(totalDue, locale),   icon: <TrendingDown className="h-5 w-5 text-red-500" />,     bg: 'bg-red-50' },
                        ].map(({ label, value, icon, bg }) => (
                            <Card key={label} className="border-slate-200">
                                <CardContent className={`p-4 ${bg} rounded-xl`}>
                                    <div className="flex items-center gap-2 mb-2">{icon}<p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</p></div>
                                    <p className="text-xl font-black text-slate-800">{value}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Payment progress */}
                    <Card className="border-slate-200">
                        <CardContent className="p-4 space-y-2">
                            <div className="flex justify-between text-sm font-bold text-slate-700">
                                <span>{t('parent.fees.paymentProgress')}</span>
                                <span className={paidPct >= 100 ? 'text-emerald-600' : paidPct >= 50 ? 'text-amber-600' : 'text-red-500'}>
                                    {t('parent.fees.paidPct', { pct: paidPct })}
                                </span>
                            </div>
                            <Progress value={paidPct} className="h-3" />
                        </CardContent>
                    </Card>

                    {/* Fee items */}
                    {fees.length > 0 && (
                        <Card className="border-slate-200">
                            <CardHeader>
                                <CardTitle className="text-base font-black flex items-center gap-2">
                                    <Receipt className="h-4 w-4 text-violet-600" /> {t('parent.fees.feeStructureTitle')}
                                </CardTitle>
                                <CardDescription>{t('parent.fees.feeStructureDesc', { name: selectedStudent?.first_name ?? '' })}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {fees.map((fee: any, i: number) => {
                                        const st = fee.status || 'pending';
                                        const cfg = FEE_STATUS[st] ?? FEE_STATUS.pending;
                                        return (
                                            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800">{fee.fee_type || fee.description || 'Fee'}</p>
                                                    {fee.due_date && (
                                                        <p className="text-xs text-slate-400">
                                                            {t('parent.fees.due')}: {formatDate(fee.due_date, locale)}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <p className="text-sm font-black text-slate-800">{formatCurrency(fee.amount ?? 0, locale)}</p>
                                                    <Badge className={`flex items-center gap-1 text-xs ${cfg.cls}`}>
                                                        {cfg.icon} {cfg.label}
                                                    </Badge>
                                                    {['pending', 'partial', 'overdue'].includes(st) && (fee.student_fee_id || fee.id) && (
                                                        <Button
                                                            size="sm"
                                                            className="h-7 text-xs font-bold bg-violet-600 hover:bg-violet-700 gap-1"
                                                            onClick={() => openPayDialog(fee)}
                                                        >
                                                            <CreditCard className="h-3 w-3" /> {t('parent.fees.pay')}
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Payment history */}
                    {payments.length > 0 && (
                        <Card className="border-slate-200">
                            <CardHeader>
                                <CardTitle className="text-base font-black flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600" /> {t('parent.fees.paymentHistory')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {payments.slice().reverse().map((p: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                                            <div>
                                                <p className="text-sm font-bold text-slate-800">{p.payment_method || p.method || t('parent.fees.paymentFallback')}</p>
                                                {p.payment_date || p.date ? (
                                                    <p className="text-xs text-slate-400">
                                                        {formatDate(p.payment_date || p.date, locale)}
                                                    </p>
                                                ) : null}
                                                {p.receipt_number && <p className="text-xs text-slate-400 font-mono">{t('parent.fees.receipt')}: {p.receipt_number}</p>}
                                            </div>
                                            <p className="text-sm font-black text-emerald-700">{formatCurrency(p.amount_paid ?? p.amount ?? 0, locale)}</p>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {fees.length === 0 && payments.length === 0 && (
                        <Card className="border-dashed border-2 border-slate-200">
                            <CardContent className="py-16 text-center">
                                <Wallet className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                                <p className="text-slate-400 font-medium">{t('parent.fees.noFeeRecords')}</p>
                            </CardContent>
                        </Card>
                    )}
                </>
            )}
            {/* Payment Dialog */}
            <Dialog open={payDialog} onOpenChange={setPayDialog}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 font-black">
                            <CreditCard className="h-5 w-5 text-violet-600" /> {t('parent.fees.payOnlineTitle')}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <p className="text-sm text-slate-600">
                            {t('parent.fees.selectMethod')} <span className="font-black text-slate-900">{formatCurrency(payingFee?.amount ?? 0, locale)}</span>.
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            {(['esewa', 'khalti'] as const).map(m => (
                                <button
                                    key={m}
                                    onClick={() => setPayMethod(m)}
                                    className={`h-16 rounded-xl border-2 font-black text-sm transition-all ${payMethod === m
                                        ? m === 'esewa' ? 'border-green-600 bg-green-50 text-green-700' : 'border-purple-600 bg-purple-50 text-purple-700'
                                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                                    }`}
                                >
                                    {m === 'esewa' ? 'eSewa' : 'Khalti'}
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-slate-400">{t('parent.fees.redirectNotice')}</p>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setPayDialog(false)}>{t('common.cancel')}</Button>
                        <Button
                            className="bg-violet-600 hover:bg-violet-700 gap-2 font-bold"
                            onClick={confirmPay}
                            disabled={payLoading}
                        >
                            {payLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                            {payLoading ? t('parent.fees.redirecting') : t('parent.fees.continue')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
