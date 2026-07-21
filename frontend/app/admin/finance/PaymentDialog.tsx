// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState } from 'react';
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
import { billingAPI, StudentFee } from '@/lib/api';
import { DollarSign, CreditCard, Receipt, Wallet, Banknote, Building2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface PaymentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    fee: StudentFee | null;
    onSuccess: () => void;
}

export function PaymentDialog({ open, onOpenChange, fee, onSuccess }: PaymentDialogProps) {
    const [amount, setAmount] = useState<string>('');
    const [method, setMethod] = useState<'cash' | 'card' | 'bank_transfer' | 'online'>('cash');
    const [reference, setReference] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [receiptId, setReceiptId] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!fee) return;

        setIsSubmitting(true);
        try {
            const payment = await billingAPI.recordPayment({
                student: fee.student,
                student_fee: fee.student_fee_id,
                amount: parseFloat(amount),
                method,
                transaction_id: reference || undefined,
            });

            const id = payment.id || payment.payment_id;
            if (id) setReceiptId(id);
            setIsSuccess(true);
            toast.success("Payment recorded successfully");
            onSuccess();

            // Auto-trigger receipt download so the user always gets a copy.
            if (id) {
                billingAPI.downloadReceipt(id).catch(() => {
                    toast.error("Receipt could not be generated. Click Receipt to retry.");
                });
            }
        } catch (error) {
            toast.error("Failed to record payment");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDownloadReceipt = async () => {
        if (!receiptId) return;
        try {
            await billingAPI.downloadReceipt(receiptId);
        } catch {
            toast.error("Failed to download receipt");
        }
    };

    const handleReset = () => {
        setAmount('');
        setMethod('cash');
        setReference('');
        setIsSuccess(false);
        setReceiptId(null);
        onOpenChange(false);
    };

    if (isSuccess) {
        return (
            <Dialog open={open} onOpenChange={handleReset}>
                <DialogContent className="max-w-md border-emerald-100 bg-emerald-50/10">
                    <div className="py-12 flex flex-col items-center text-center space-y-4">
                        <div className="h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 animate-in zoom-in-50 duration-500">
                            <CheckCircle2 className="h-10 w-10" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-black text-slate-900">Payment Successful!</h2>
                            <p className="text-slate-500 text-sm max-w-[280px]">
                                Your payment of <strong>${parseFloat(amount).toLocaleString()}</strong> for <strong>{fee?.fee_name}</strong> has been recorded.
                            </p>
                        </div>
                        <div className="pt-6 flex gap-3 w-full max-w-[300px]">
                            <Button variant="outline" className="flex-1 h-11 border-emerald-200 text-emerald-700 bg-white hover:bg-emerald-50" onClick={handleDownloadReceipt}>
                                <Receipt className="h-4 w-4 mr-2" /> Receipt
                            </Button>
                            <Button className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700" onClick={handleReset}>
                                Done
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md border-slate-200 shadow-2xl">
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                            <Wallet className="h-5 w-5" />
                        </div>
                        <DialogTitle className="text-xl font-bold text-slate-900 tracking-tight">Record Payment</DialogTitle>
                    </div>
                    <DialogDescription className="text-slate-500">
                        Enter payment details for <strong>{fee?.student_name}</strong>.
                    </DialogDescription>
                </DialogHeader>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2 my-2">
                    <div className="flex justify-between text-xs">
                        <span className="text-slate-400 font-bold uppercase tracking-wider">Fee Category</span>
                        <span className="text-slate-900 font-bold">{fee?.fee_name}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-slate-400 font-bold uppercase tracking-wider">Balance Due</span>
                        <span className="text-red-600 font-black">${(fee?.balance || 0).toLocaleString()}</span>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 pt-2">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="pay-amount" className="text-xs font-bold uppercase tracking-wider text-slate-500">Amount to Pay ($)</Label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    id="pay-amount"
                                    type="number"
                                    placeholder="Enter amount"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    max={fee?.balance || undefined}
                                    required
                                    className="pl-9 border-slate-200 focus:ring-indigo-500/20 shadow-sm h-11 text-lg font-bold"
                                />
                            </div>
                            <div className="flex gap-2 pt-1">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-[10px] font-bold"
                                    onClick={() => setAmount((fee?.balance || 0).toString())}
                                >
                                    Full Amount
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-[10px] font-bold"
                                    onClick={() => setAmount(((fee?.balance || 0) / 2).toString())}
                                >
                                    Half
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Payment Method</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { id: 'cash', icon: <Banknote className="h-4 w-4" />, label: 'Cash' },
                                    { id: 'card', icon: <CreditCard className="h-4 w-4" />, label: 'Card' },
                                    { id: 'bank_transfer', icon: <Building2 className="h-4 w-4" />, label: 'Transfer' },
                                    { id: 'online', icon: <CreditCard className="h-4 w-4" />, label: 'Online' }
                                ].map((m) => (
                                    <button
                                        key={m.id}
                                        type="button"
                                        onClick={() => setMethod(m.id as any)}
                                        className={`flex items-center gap-3 p-3 rounded-xl border text-sm transition-all ${method === m.id ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        <div className={`${method === m.id ? 'text-indigo-600' : 'text-slate-400'}`}>
                                            {m.icon}
                                        </div>
                                        {m.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="reference" className="text-xs font-bold uppercase tracking-wider text-slate-500">Reference / Trans ID (Optional)</Label>
                            <Input
                                id="reference"
                                placeholder="Ref number..."
                                value={reference}
                                onChange={(e) => setReference(e.target.value)}
                                className="border-slate-200 focus:ring-indigo-500/20 shadow-sm h-11"
                            />
                        </div>
                    </div>

                    <DialogFooter className="border-t border-slate-100 pt-6">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-400 hover:text-slate-600">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting || !amount} className="bg-indigo-600 hover:bg-indigo-700 shadow-sm min-w-[140px] h-11">
                            {isSubmitting ? (
                                <><span className="animate-spin mr-2">⏳</span> Recording...</>
                            ) : (
                                'Confirm Payment'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
