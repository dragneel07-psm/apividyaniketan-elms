// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { billingAPI, academicAPI, Student, StudentFee } from '@/lib/api';
import { toast } from 'sonner';
import { Search, CreditCard, Printer, CheckCircle, Banknote, User } from 'lucide-react';

export default function FeeCollector() {
    const [searchTerm, setSearchTerm] = useState('');
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [fees, setFees] = useState<StudentFee[]>([]);
    const [loadingInfo, setLoadingInfo] = useState(false);

    // Payment State
    const [selectedFeeIds, setSelectedFeeIds] = useState<string[]>([]);
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'online' | 'cheque'>('cash');
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [lastPaymentId, setLastPaymentId] = useState<string | null>(null);

    const handleSearch = async () => {
        if (!searchTerm) return;
        setLoadingInfo(true);
        try {
            // In a real app, use a dedicated search endpoint. 
            // Here we fetch all (demo scale) and filter.
            const allStudents = await academicAPI.getStudents();
            const filtered = allStudents.filter(s =>
                s.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.student_id.includes(searchTerm)
            );
            setStudents(filtered);
            setSelectedStudent(null);
            setFees([]);
        } catch (error) {
            toast.error('Search failed');
        } finally {
            setLoadingInfo(false);
        }
    };

    const selectStudent = async (student: Student) => {
        setSelectedStudent(student);
        setFees([]);
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
            // For MVP: multiple fees payment = multiple records or one transaction? 
            // API only supports one recordPayment call which accepts `student_fee` ID (singular).
            // So we loop? Or API needs update. 
            // Let's assume for now we pay fees one by one or the backend handles bulk?
            // "recordPayment" takes "student_fee" FK.
            // If paying multiple, we need to make multiple calls or enhance API.

            // Wait, recordPayment is:
            // payment = serializer.save(...)
            // if payment.student_fee: update...

            // We'll iterate for now.
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
                        <div className="flex gap-2">
                            <Input
                                placeholder="Name or ID..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                            />
                            <Button size="icon" onClick={handleSearch}>
                                <Search className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                            {students.map(student => (
                                <div
                                    key={student.id}
                                    onClick={() => selectStudent(student)}
                                    className={`p-3 rounded-lg cursor-pointer border transition-colors flex items-center gap-3
                                        ${selectedStudent?.id === student.id
                                            ? 'bg-indigo-50 border-indigo-200 shadow-sm'
                                            : 'hover:bg-slate-50 border-transparent'}`}
                                >
                                    <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600">
                                        <User className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <div className="font-medium text-sm">{student.first_name} {student.last_name}</div>
                                        <div className="text-xs text-muted-foreground">ID: {student.student_id}</div>
                                    </div>
                                </div>
                            ))}
                            {students.length === 0 && searchTerm && !loadingInfo && (
                                <div className="text-center text-sm text-muted-foreground py-4">No students found</div>
                            )}
                        </div>
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
                                        Collect ${paymentAmount.toFixed(2)}
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

                                                return (
                                                    <TableRow key={fee.student_fee_id} className={isPaid ? "bg-slate-50 opacity-75" : ""}>
                                                        <TableCell>
                                                            {!isPaid && (
                                                                <Checkbox
                                                                    checked={selectedFeeIds.includes(fee.student_fee_id)}
                                                                    onCheckedChange={() => toggleFeeSelection(fee.student_fee_id, balance)}
                                                                />
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="font-medium">{fee.fee_name}</TableCell>
                                                        <TableCell>{fee.due_date}</TableCell>
                                                        <TableCell>${fee.amount_due}</TableCell>
                                                        <TableCell>${fee.amount_paid}</TableCell>
                                                        <TableCell className="font-bold text-slate-900">${balance.toFixed(2)}</TableCell>
                                                        <TableCell>
                                                            <span className={`px-2 py-1 rounded-full text-xs font-medium 
                                                                ${fee.status === 'paid' ? 'bg-green-100 text-green-700' :
                                                                    fee.status === 'overdue' ? 'bg-red-100 text-red-700' :
                                                                        'bg-amber-100 text-amber-700'}`}>
                                                                {fee.status.toUpperCase()}
                                                            </span>
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
                                <span>${paymentAmount.toFixed(2)}</span>
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
