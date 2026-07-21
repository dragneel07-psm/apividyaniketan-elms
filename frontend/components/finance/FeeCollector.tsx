// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { billingAPI, academicAPI, Student, StudentFee } from '@/lib/api';
import { toast } from 'sonner';
import { formatRs } from '@/lib/finance';
import { CreditCard, Printer, CheckCircle, Banknote, User, Loader2, ChevronsUpDown, Check } from 'lucide-react';

const FEE_STATUS_COLOR: Record<string, string> = {
    paid: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    partial: 'bg-amber-100 text-amber-700 border-amber-200',
    overdue: 'bg-red-100 text-red-700 border-red-200',
    pending: 'bg-slate-100 text-slate-600 border-slate-200',
    waived: 'bg-blue-100 text-blue-700 border-blue-200',
};

export default function FeeCollector() {
    const [allStudents, setAllStudents] = useState<Student[]>([]);
    const [loadingStudents, setLoadingStudents] = useState(true);
    const [comboOpen, setComboOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [fees, setFees] = useState<StudentFee[]>([]);
    const [loadingInfo, setLoadingInfo] = useState(false);

    // Payment State
    const [selectedFeeIds, setSelectedFeeIds] = useState<string[]>([]);
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'online' | 'cheque'>('cash');
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [lastPaymentId, setLastPaymentId] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            setLoadingStudents(true);
            try {
                // In a real app, use a dedicated search endpoint. Here we
                // fetch all (demo scale) once and filter client-side as the
                // dropdown's search box is typed into.
                const data = await academicAPI.getStudents();
                setAllStudents(data);
            } catch {
                toast.error('Failed to load students');
            } finally {
                setLoadingStudents(false);
            }
        })();
    }, []);

    const selectStudent = async (student: Student) => {
        setSelectedStudent(student);
        setFees([]);
        setSelectedFeeIds([]);
        setPaymentAmount(0);
        setLastPaymentId(null);
        setLoadingInfo(true);
        try {
            const allFees = await billingAPI.getStudentFees();
            // Filter client side for demo
            const studentFees = allFees.filter(f => f.student === student.id); // UUID match
            setFees(studentFees);
        } catch (error) {
            toast.error('Failed to load student fees');
        } finally {
            setLoadingInfo(false);
        }
    };

    const toggleFeeSelection = (feeId: string, amountDue: number) => {
        if (selectedFeeIds.includes(feeId)) {
            setSelectedFeeIds(prev => prev.filter(id => id !== feeId));
            setPaymentAmount(prev => prev - amountDue);
        } else {
            setSelectedFeeIds(prev => [...prev, feeId]);
            setPaymentAmount(prev => prev + amountDue);
        }
    };

    const handleProcessPayment = async () => {
        if (!selectedStudent || paymentAmount <= 0) return;

        try {
            // recordPayment only accepts a single student_fee per call, so a
            // multi-fee collection is submitted as one request per fee line.
            for (const feeId of selectedFeeIds) {
                const fee = fees.find(f => f.student_fee_id === feeId);
                const amountToPay = fee ? (fee.amount_due - fee.amount_paid) : 0; // Paying full balance

                if (amountToPay > 0) {
                    const payment = await billingAPI.recordPayment({
                        student: selectedStudent.id,
                        student_fee: feeId,
                        amount: amountToPay,
                        method: paymentMethod,
                        // transaction_id?
                    });
                    setLastPaymentId(payment.payment_id); // Only keeps last one for receipt
                }
            }

            toast.success('Payment recorded successfully');
            setIsConfirmOpen(false);
            setSelectedFeeIds([]);
            setPaymentAmount(0);

            // Refresh
            selectStudent(selectedStudent);
        } catch (error) {
            toast.error('Payment failed');
        }
    };

    const downloadReceipt = async () => {
        if (lastPaymentId) {
            await billingAPI.downloadReceipt(lastPaymentId);
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Panel: Search & Student List */}
            <div className="md:col-span-1 space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Find Student</CardTitle>
                        <CardDescription>Search by name or ID</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Popover open={comboOpen} onOpenChange={setComboOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={comboOpen}
                                    disabled={loadingStudents}
                                    className="w-full justify-between font-normal"
                                >
                                    <span className="flex items-center gap-2 truncate">
                                        {loadingStudents ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                                                Loading students...
                                            </>
                                        ) : selectedStudent ? (
                                            `${selectedStudent.first_name} ${selectedStudent.last_name} (${selectedStudent.student_id})`
                                        ) : (
                                            <span className="text-muted-foreground">Search by name or ID...</span>
                                        )}
                                    </span>
                                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                <Command>
                                    <CommandInput placeholder="Name or ID..." />
                                    <CommandList className="max-h-[320px]">
                                        <CommandEmpty>No students found.</CommandEmpty>
                                        <CommandGroup>
                                            {allStudents.map(student => (
                                                <CommandItem
                                                    key={student.id}
                                                    value={`${student.first_name} ${student.last_name} ${student.student_id}`}
                                                    onSelect={() => {
                                                        selectStudent(student);
                                                        setComboOpen(false);
                                                    }}
                                                    className="gap-2"
                                                >
                                                    <Check className={`h-4 w-4 shrink-0 ${selectedStudent?.id === student.id ? 'opacity-100' : 'opacity-0'}`} />
                                                    <div className="h-7 w-7 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                                                        <User className="h-3.5 w-3.5" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-medium text-sm truncate">{student.first_name} {student.last_name}</div>
                                                        <div className="text-xs text-muted-foreground">ID: {student.student_id}</div>
                                                    </div>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>

                        {loadingInfo && (
                            <div className="flex justify-center py-6">
                                <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Right Panel: Fee Details & Payment */}
            <div className="md:col-span-2">
                {selectedStudent ? (
                    <div className="space-y-6">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Fee Accounts</CardTitle>
                                    <CardDescription>Pending dues for {selectedStudent.first_name} {selectedStudent.last_name}</CardDescription>
                                </div>
                                {selectedFeeIds.length > 0 && (
                                    <Button onClick={() => setIsConfirmOpen(true)}>
                                        <CreditCard className="mr-2 h-4 w-4" />
                                        Collect {formatRs(paymentAmount)}
                                    </Button>
                                )}
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[50px]"></TableHead>
                                            <TableHead>Fee Head</TableHead>
                                            <TableHead>Due Date</TableHead>
                                            <TableHead>Amount</TableHead>
                                            <TableHead>Paid</TableHead>
                                            <TableHead>Balance</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {fees.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                                    No fee records found.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            fees.map(fee => {
                                                const balance = fee.amount_due - fee.amount_paid;
                                                const isPaid = balance <= 0;
                                                const isPayable = !isPaid && fee.status !== 'waived';

                                                return (
                                                    <TableRow key={fee.student_fee_id} className={!isPayable ? "bg-slate-50 opacity-75" : ""}>
                                                        <TableCell>
                                                            {isPayable && (
                                                                <Checkbox
                                                                    checked={selectedFeeIds.includes(fee.student_fee_id)}
                                                                    onCheckedChange={() => toggleFeeSelection(fee.student_fee_id, balance)}
                                                                />
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="font-medium">{fee.fee_name}</TableCell>
                                                        <TableCell>{fee.due_date}</TableCell>
                                                        <TableCell>{formatRs(fee.amount_due)}</TableCell>
                                                        <TableCell>{formatRs(fee.amount_paid)}</TableCell>
                                                        <TableCell className="font-bold text-slate-900">{formatRs(balance)}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className={`font-bold ${FEE_STATUS_COLOR[fee.status] || FEE_STATUS_COLOR.pending}`}>
                                                                {fee.status.toUpperCase()}
                                                            </Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        {/* Recent Transactions / Receipts could go here */}
                        {lastPaymentId && (
                            <Card className="bg-green-50 border-green-200">
                                <CardContent className="flex items-center justify-between p-4">
                                    <div className="flex items-center gap-2 text-green-700">
                                        <CheckCircle className="h-5 w-5" />
                                        <span className="font-medium">Payment Recorded Successfully!</span>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={downloadReceipt} className="border-green-300 text-green-700 hover:bg-green-100">
                                        <Printer className="mr-2 h-4 w-4" /> Download Receipt
                                    </Button>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center p-12 bg-slate-50 border-2 border-dashed border-slate-200 rounded-lg text-slate-400">
                        <Banknote className="h-12 w-12 mb-4 opacity-50" />
                        <h3 className="text-lg font-medium">Select a student to collect fees</h3>
                        <p>Search for a student on the left to view their account.</p>
                    </div>
                )}
            </div>

            <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Payment</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="bg-slate-50 p-4 rounded-md space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Student:</span>
                                <span className="font-medium">{selectedStudent?.first_name} {selectedStudent?.last_name}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>Fees Selected:</span>
                                <span className="font-medium">{selectedFeeIds.length}</span>
                            </div>
                            <div className="border-t pt-2 flex justify-between font-bold text-lg">
                                <span>Total Amount:</span>
                                <span>{formatRs(paymentAmount)}</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Payment Method</Label>
                            <Select value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="cash">Cash</SelectItem>
                                    <SelectItem value="card">Card</SelectItem>
                                    <SelectItem value="online">Online Transfer</SelectItem>
                                    <SelectItem value="cheque">Cheque</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>Cancel</Button>
                        <Button onClick={handleProcessPayment}>Process Payment</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
