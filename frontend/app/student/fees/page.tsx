// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditCard, DollarSign, Calendar, History, Wallet, AlertCircle, CheckCircle2, Download, Loader2, Sparkles, Receipt } from 'lucide-react';
import { billingAPI, academicAPI, usersAPI, paymentGatewayAPI, StudentFee, Payment } from '@/lib/api';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Lock } from 'lucide-react';
import { useTranslation } from '@/lib/localization';
import { formatCurrency, formatDate } from '@/lib/i18n/format';

export default function StudentFeesPage() {
    const [fees, setFees] = useState<StudentFee[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPayDialogOpen, setIsPayDialogOpen] = useState(false);
    const [selectedFee, setSelectedFee] = useState<StudentFee | null>(null);
    const [payLoading, setPayLoading] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'manual' | 'esewa' | 'khalti'>('manual');
    const [user, setUser] = useState<any>(null);
    const { t, locale } = useTranslation();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [currentUser, feesResponse] = await Promise.all([
                usersAPI.getMe(),
                billingAPI.getMyFees(),
            ]);
            setUser(currentUser);
            setFees(feesResponse.fees || []);
            setPayments(feesResponse.payments || []);
        } catch (error) {
            console.error('Failed to load fee data:', error);
            toast.error('Failed to load fee data');
            setFees([]);
            setPayments([]);
        } finally {
            setLoading(false);
        }
    };

    const handlePayNow = async (fee: StudentFee) => {
        setSelectedFee(fee);
        setIsPayDialogOpen(true);
    };

    const confirmPayment = async () => {
        if (!selectedFee) return;
        const payableAmount = Number(selectedFee.amount_due) - Number(selectedFee.amount_paid);
        if (payableAmount <= 0) {
            toast.info('This invoice is already settled.');
            return;
        }
        setPayLoading(true);
        try {
            if (paymentMethod === 'esewa') {
                const fields = await paymentGatewayAPI.esewaInitiate(selectedFee.student_fee_id);
                // Build and submit eSewa form
                const form = document.createElement('form');
                form.method = 'POST';
                form.action = 'https://rc-epay.esewa.com.np/api/epay/main/v2/form';
                Object.entries(fields).forEach(([key, value]) => {
                    const input = document.createElement('input');
                    input.type = 'hidden';
                    input.name = key;
                    input.value = String(value);
                    form.appendChild(input);
                });
                document.body.appendChild(form);
                form.submit();
                return;
            } else if (paymentMethod === 'khalti') {
                const res = await paymentGatewayAPI.khaltiInitiate(selectedFee.student_fee_id);
                window.location.href = res.payment_url;
                return;
            } else {
                await billingAPI.recordPayment({
                    student: selectedFee.student,
                    student_fee: selectedFee.student_fee_id,
                    amount: payableAmount,
                    method: 'online',
                    remarks: 'Self-paid via Student Portal'
                });
                toast.success('Payment successful! Your receipt is being generated.');
                setIsPayDialogOpen(false);
                loadData();
            }
        } catch (error) {
            toast.error('Payment failed. Please try again.');
        } finally {
            setPayLoading(false);
        }
    };

    const downloadReceipt = async (paymentId: string) => {
        try {
            await billingAPI.downloadReceipt(paymentId);
        } catch (error) {
            toast.error('Failed to download receipt');
        }
    };

    const totalDue = fees.reduce((sum, f) => sum + parseFloat(f.amount_due.toString()), 0);
    const totalPaid = fees.reduce((sum, f) => sum + parseFloat(f.amount_paid.toString()), 0);
    const pendingAmount = totalDue - totalPaid;

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (user?.tenant_features?.parent_fees === false) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center h-[60vh]">
                <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                    <Lock className="h-8 w-8 text-slate-400" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">{t('student.fees.lockedTitle')}</h2>
                <p className="text-slate-500 max-w-md mx-auto">{t('student.fees.lockedDesc')}</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <div className="flex items-center gap-2 text-indigo-600 font-bold mb-1">
                    <Wallet className="h-4 w-4" />
                    <span className="text-[10px] uppercase tracking-[0.2em]">{t('student.fees.sectionLabel')}</span>
                </div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">{t('student.fees.pageTitle')}</h1>
                <p className="text-slate-500 mt-1 text-sm">{t('student.fees.subtitle')}</p>
            </div>

            {/* Financial Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <Card className="border-0 shadow-xl overflow-hidden rounded-2xl">
                    <CardContent className="p-6 relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-violet-700" />
                        <div className="relative">
                            <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest mb-3">{t('student.fees.totalFees')}</p>
                            <h3 className="text-4xl font-black text-white">{formatCurrency(totalDue, locale)}</h3>
                            <div className="mt-3 w-full bg-white/20 rounded-full h-1.5">
                                <div className="bg-white h-1.5 rounded-full transition-all" style={{ width: `${totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 0}%` }} />
                            </div>
                            <p className="text-indigo-200 text-[10px] mt-1.5 font-medium">{t('student.fees.settled', { pct: String(totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 0) })}</p>
                        </div>
                        <CreditCard className="absolute bottom-4 right-4 h-10 w-10 text-white/10" />
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-xl overflow-hidden rounded-2xl">
                    <CardContent className="p-6 relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-600" />
                        <div className="relative">
                            <p className="text-emerald-100 text-xs font-bold uppercase tracking-widest mb-3">{t('student.fees.totalPaid')}</p>
                            <h3 className="text-4xl font-black text-white">{formatCurrency(totalPaid, locale)}</h3>
                            <p className="text-emerald-100 text-[10px] mt-4 font-medium flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" /> {t('student.fees.clearedSuccessfully')}
                            </p>
                        </div>
                        <CheckCircle2 className="absolute bottom-4 right-4 h-10 w-10 text-white/10" />
                    </CardContent>
                </Card>

                <Card className={`border-0 shadow-xl overflow-hidden rounded-2xl`}>
                    <CardContent className="p-6 relative">
                        <div className={`absolute inset-0 bg-gradient-to-br ${pendingAmount > 0 ? 'from-amber-500 to-orange-600' : 'from-slate-700 to-slate-800'}`} />
                        <div className="relative">
                            <p className={`${pendingAmount > 0 ? 'text-amber-100' : 'text-slate-400'} text-xs font-bold uppercase tracking-widest mb-3`}>{t('student.fees.outstanding')}</p>
                            <h3 className="text-4xl font-black text-white">{formatCurrency(pendingAmount, locale)}</h3>
                            <p className={`${pendingAmount > 0 ? 'text-amber-100' : 'text-slate-400'} text-[10px] mt-4 font-medium`}>
                                {pendingAmount > 0 ? t('student.fees.paymentPending') : t('student.fees.allCleared')}
                            </p>
                        </div>
                        <AlertCircle className="absolute bottom-4 right-4 h-10 w-10 text-white/10" />
                    </CardContent>
                </Card>
            </div>

            {/* Main Tabs */}
            <Tabs defaultValue="dues" className="space-y-6">
                <TabsList className="bg-white border border-slate-200 p-1 rounded-2xl shadow-sm w-full md:w-auto h-auto gap-1">
                    <TabsTrigger value="dues" className="rounded-xl px-5 py-2.5 font-bold text-sm data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md gap-2">
                        <DollarSign className="h-4 w-4" /> {t('student.fees.tabDues')}
                    </TabsTrigger>
                    <TabsTrigger value="history" className="rounded-xl px-5 py-2.5 font-bold text-sm data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md gap-2">
                        <History className="h-4 w-4" /> {t('student.fees.tabHistory')}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="dues" className="space-y-4">
                    <Card className="border-0 shadow-sm overflow-hidden">
                        <CardHeader className="bg-slate-50 border-b">
                            <CardTitle className="text-lg">{t('student.fees.invoicesTitle')}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b">
                                        <tr>
                                            <th className="px-6 py-4">{t('student.fees.colFeeStructure')}</th>
                                            <th className="px-6 py-4">{t('student.fees.colDueDate')}</th>
                                            <th className="px-6 py-4">{t('student.fees.colAmount')}</th>
                                            <th className="px-6 py-4">{t('student.fees.colPaid')}</th>
                                            <th className="px-6 py-4">{t('student.fees.colStatus')}</th>
                                            <th className="px-6 py-4">{t('student.fees.colAction')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {fees.map((fee) => (
                                            <tr key={fee.student_fee_id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-slate-900">{fee.fee_name || 'School Fee'}</div>
                                                    <div className="text-xs text-slate-500">{t('student.fees.invoiceId', { id: fee.student_fee_id.substring(0, 8) })}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                                        <Calendar className="h-3 w-3" />
                                                        {formatDate(new Date(fee.due_date), locale)}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 font-medium text-slate-900">{formatCurrency(Number(fee.amount_due), locale)}</td>
                                                <td className="px-6 py-4 text-emerald-600 font-medium">{formatCurrency(Number(fee.amount_paid), locale)}</td>
                                                <td className="px-6 py-4">
                                                    <Badge variant={
                                                        fee.status === 'paid' ? 'default' :
                                                            fee.status === 'partial' ? 'secondary' : 'destructive'
                                                    } className="capitalize">
                                                        {fee.status}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {fee.status !== 'paid' && (
                                                        <Button
                                                            size="sm"
                                                            className="bg-indigo-600 hover:bg-indigo-700"
                                                            onClick={() => handlePayNow(fee)}
                                                        >
                                                            {t('student.fees.payNow')}
                                                        </Button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {fees.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                                    {t('student.fees.noFeeRecords')}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="history" className="space-y-4">
                    <Card className="border-0 shadow-sm">
                        <CardHeader className="bg-slate-50 border-b">
                            <CardTitle className="text-lg">{t('student.fees.recentPaymentsTitle')}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b">
                                        <tr>
                                            <th className="px-6 py-4">{t('student.fees.colTransaction')}</th>
                                            <th className="px-6 py-4">{t('student.fees.colDate')}</th>
                                            <th className="px-6 py-4">{t('student.fees.colAmount')}</th>
                                            <th className="px-6 py-4">{t('student.fees.colMethod')}</th>
                                            <th className="px-6 py-4">{t('student.fees.colReceipt')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {payments.map((payment) => (
                                            <tr key={payment.payment_id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-slate-900">Payment for {payment.student_name}</div>
                                                    <div className="text-xs text-slate-500">TXID: {payment.transaction_id || payment.payment_id.substring(0, 12)}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm text-slate-600">
                                                        {formatDate(new Date(payment.payment_date), locale)}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 font-bold text-emerald-600">{formatCurrency(Number(payment.amount), locale)}</td>
                                                <td className="px-6 py-4">
                                                    <Badge variant="outline" className="capitalize">{payment.method}</Badge>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                                        onClick={() => downloadReceipt(payment.payment_id)}
                                                    >
                                                        {t('student.fees.download')}
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                        {payments.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                                    {t('student.fees.noPaymentHistory')}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Pay Dialog */}
            <Dialog open={isPayDialogOpen} onOpenChange={setIsPayDialogOpen}>
                <DialogContent className="sm:max-w-[425px] border-0 shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black text-slate-900 flex items-center gap-2">
                            <Sparkles className="h-6 w-6 text-indigo-600" /> {t('student.fees.dialogTitle')}
                        </DialogTitle>
                        <DialogDescription>
                            {t('student.fees.dialogDesc', { feeName: selectedFee?.fee_name || 'School Fee' })}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-6 space-y-6">
                        <div className="bg-slate-50 p-4 rounded-xl border border-dashed border-slate-200">
                            <div className="flex justify-between mb-2">
                                <span className="text-slate-500 font-medium">{t('student.fees.feeAmount')}</span>
                                <span className="font-bold text-slate-900">{formatCurrency(Number(selectedFee?.amount_due ?? 0), locale)}</span>
                            </div>
                            <div className="flex justify-between mb-2">
                                <span className="text-slate-500 font-medium">{t('student.fees.alreadyPaid')}</span>
                                <span className="font-bold text-emerald-600">-{formatCurrency(Number(selectedFee?.amount_paid ?? 0), locale)}</span>
                            </div>
                            <div className="border-t border-slate-200 pt-2 flex justify-between">
                                <span className="text-slate-900 font-black">{t('student.fees.totalToPay')}</span>
                                <span className="font-black text-indigo-600 text-xl">
                                    {formatCurrency(selectedFee ? Number(selectedFee.amount_due) - Number(selectedFee.amount_paid) : 0, locale)}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <Label className="font-bold text-slate-700">{t('student.fees.paymentMethod')}</Label>
                            <div className="grid grid-cols-3 gap-3">
                                <Button
                                    variant="outline"
                                    onClick={() => setPaymentMethod('manual')}
                                    className={`h-16 flex flex-col gap-1 border-2 ${paymentMethod === 'manual' ? 'border-indigo-600 bg-indigo-50' : 'border-slate-100'}`}
                                >
                                    <CreditCard className={`h-5 w-5 ${paymentMethod === 'manual' ? 'text-indigo-600' : 'text-slate-400'}`} />
                                    <span className="text-[10px] uppercase font-bold">{t('student.fees.methodManual')}</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => setPaymentMethod('esewa')}
                                    className={`h-16 flex flex-col gap-1 border-2 ${paymentMethod === 'esewa' ? 'border-green-600 bg-green-50' : 'border-slate-100'}`}
                                >
                                    <span className={`text-sm font-black ${paymentMethod === 'esewa' ? 'text-green-700' : 'text-slate-500'}`}>eSewa</span>
                                    <span className="text-[10px] uppercase font-bold">{t('student.fees.methodDigital')}</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => setPaymentMethod('khalti')}
                                    className={`h-16 flex flex-col gap-1 border-2 ${paymentMethod === 'khalti' ? 'border-purple-600 bg-purple-50' : 'border-slate-100'}`}
                                >
                                    <span className={`text-sm font-black ${paymentMethod === 'khalti' ? 'text-purple-700' : 'text-slate-500'}`}>Khalti</span>
                                    <span className="text-[10px] uppercase font-bold">{t('student.fees.methodDigital')}</span>
                                </Button>
                            </div>
                            {paymentMethod !== 'manual' && (
                                <p className="text-xs text-slate-500">{t('student.fees.redirectNotice', { provider: paymentMethod === 'esewa' ? 'eSewa' : 'Khalti' })}</p>
                            )}
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
                            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                            <p className="text-[10px] text-amber-700 leading-tight">
                                {t('student.fees.paymentNote')}
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsPayDialogOpen(false)}>{t('common.cancel')}</Button>
                        <Button
                            className="bg-indigo-600 hover:bg-indigo-700 gap-2 font-bold px-8 shadow-md"
                            onClick={confirmPayment}
                            disabled={payLoading}
                        >
                            {payLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                            {payLoading ? t('student.fees.processing') : t('student.fees.confirmPay')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
