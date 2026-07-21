// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { billingAPI, academicAPI, api, downloadReport, StudentFee, Payment, Student } from '@/lib/api';
import { toast } from 'sonner';
import { Download, AlertCircle, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function FinancialReports() {
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold tracking-tight">Financial Reports</h2>

            <Tabs defaultValue="defaulters">
                <TabsList>
                    <TabsTrigger value="defaulters">Defaulters List</TabsTrigger>
                    <TabsTrigger value="daily">Daily Collection</TabsTrigger>
                </TabsList>

                <TabsContent value="defaulters" className="space-y-4">
                    <DefaultersList />
                </TabsContent>

                <TabsContent value="daily" className="space-y-4">
                    <DailyCollection />
                </TabsContent>
            </Tabs>
        </div>
    );
}

function DefaultersList() {
    const [defaulters, setDefaulters] = useState<{ student: string; name: string; amount: number; count: number }[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDefaulters();
    }, []);

    const loadDefaulters = async () => {
        try {
            const fees = await billingAPI.getStudentFees();
            const pendingFees = fees.filter(f => ['pending', 'partial', 'overdue'].includes(f.status));

            // Group by student
            const studentMap = new Map<string, { name: string; amount: number; count: number }>();

            pendingFees.forEach(fee => {
                const current = studentMap.get(fee.student) || {
                    name: fee.student_name || 'Unknown Student',
                    amount: 0,
                    count: 0
                };

                const balance = fee.amount_due - fee.amount_paid;
                if (balance > 0) {
                    current.amount += balance;
                    current.count += 1;
                    studentMap.set(fee.student, current);
                }
            });

            const list = Array.from(studentMap.entries()).map(([id, data]) => ({
                student: id,
                ...data
            })).sort((a, b) => b.amount - a.amount); // Sort by highest debt

            setDefaulters(list);
        } catch (error) {
            toast.error('Failed to load defaulters');
        } finally {
            setLoading(false);
        }
    };

    const downloadPDF = async () => {
        try {
            await downloadReport(api.reports.getPendingFeesPDF(), `pending_fees_${new Date().toISOString().slice(0, 10)}.pdf`);
        } catch {
            toast.error('Failed to download report');
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Outstanding Dues</CardTitle>
                    <CardDescription>Students with pending fee payments.</CardDescription>
                </div>
                <Button variant="outline" onClick={downloadPDF}>
                    <Download className="mr-2 h-4 w-4" /> Download PDF
                </Button>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Student Name</TableHead>
                            <TableHead>Pending Records</TableHead>
                            <TableHead className="text-right">Total Outstanding</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center py-8">Loading...</TableCell>
                            </TableRow>
                        ) : defaulters.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                                    No defaulters found. Good job!
                                </TableCell>
                            </TableRow>
                        ) : (
                            defaulters.map((d) => (
                                <TableRow key={d.student}>
                                    <TableCell className="font-medium">{d.name}</TableCell>
                                    <TableCell>{d.count} invoices</TableCell>
                                    <TableCell className="text-right font-bold text-red-600">
                                        ${d.amount.toFixed(2)}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

function DailyCollection() {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);

    const today = new Date().toISOString().split('T')[0];

    useEffect(() => {
        loadDaily();
    }, []);

    const loadDaily = async () => {
        try {
            const allPayments = await billingAPI.getPayments();
            // Filter by today's date (ignoring time for simplicity, or strictly check strings)
            // Payment date is ISO string.
            const todaysPayments = allPayments.filter(p => p.payment_date.startsWith(today));

            setPayments(todaysPayments);
            setTotal(todaysPayments.reduce((sum, p) => sum + Number(p.amount), 0));
        } catch (error) {
            toast.error('Failed to load collections');
        } finally {
            setLoading(false);
        }
    };

    const downloadDailyReport = async () => {
        try {
            await downloadReport(api.reports.getFeeCollectionPDF(today, today), `fee_collection_${today}.pdf`);
        } catch {
            toast.error('Failed to download report');
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Daily Collection ({today})</CardTitle>
                    <CardDescription>Payments received today.</CardDescription>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-xl font-bold text-green-600">
                        Total: ${total.toFixed(2)}
                    </div>
                    <Button variant="outline" onClick={downloadDailyReport}>
                        <Download className="mr-2 h-4 w-4" /> Download Report
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Time</TableHead>
                            <TableHead>Student</TableHead>
                            <TableHead>Method</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8">Loading...</TableCell>
                            </TableRow>
                        ) : payments.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                    No payments collected today.
                                </TableCell>
                            </TableRow>
                        ) : (
                            payments.map((p) => (
                                <TableRow key={p.payment_id}>
                                    <TableCell>{format(new Date(p.payment_date), 'HH:mm')}</TableCell>
                                    <TableCell>{p.student_name || 'Unknown'}</TableCell>
                                    <TableCell className="capitalize">{p.method}</TableCell>
                                    <TableCell className="text-right font-medium">
                                        ${Number(p.amount).toFixed(2)}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
