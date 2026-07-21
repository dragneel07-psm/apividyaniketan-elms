// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { DollarSign, Download, CheckCircle, Clock, AlertTriangle, Loader2, TrendingUp, History, Sparkles } from "lucide-react";
import { getApiBaseUrl, saasApi, Invoice } from "@/lib/api";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function SaasBillingPage() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadInvoices();
    }, []);

    const loadInvoices = async () => {
        try {
            const data = await saasApi.getInvoices();
            setInvoices(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load invoices.");
            setInvoices([]);
        } finally {
            setIsLoading(false);
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: {
                type: "spring" as const,
                stiffness: 100
            }
        }
    };

    // Calculate Stats
    const now = Date.now();
    const totalRevenue = invoices
        .filter(inv => inv.status === 'paid')
        .reduce((acc, curr) => acc + parseFloat(curr.amount), 0);

    const pendingAmount = invoices
        .filter(inv => inv.status === 'pending')
        .reduce((acc, curr) => acc + parseFloat(curr.amount), 0);

    const failedAmount = invoices
        .filter(inv => inv.status === 'failed')
        .reduce((acc, curr) => acc + parseFloat(curr.amount), 0);
    const overdueAmount = invoices
        .filter((inv) => inv.status === 'pending' && inv.due_date && new Date(inv.due_date).getTime() < now)
        .reduce((acc, curr) => acc + parseFloat(curr.amount), 0);

    const paidCount = invoices.filter(inv => inv.status === 'paid').length;
    const pendingCount = invoices.filter(inv => inv.status === 'pending').length;
    const failedCount = invoices.filter(inv => inv.status === 'failed').length;
    const overdueCount = invoices.filter((inv) => inv.status === 'pending' && inv.due_date && new Date(inv.due_date).getTime() < now).length;

    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const currentPeriodRevenue = invoices
        .filter((inv) => inv.status === 'paid')
        .filter((inv) => {
            const issuedAt = new Date(inv.issued_date).getTime();
            return issuedAt >= (now - THIRTY_DAYS_MS);
        })
        .reduce((acc, curr) => acc + parseFloat(curr.amount), 0);
    const previousPeriodRevenue = invoices
        .filter((inv) => inv.status === 'paid')
        .filter((inv) => {
            const issuedAt = new Date(inv.issued_date).getTime();
            return issuedAt < (now - THIRTY_DAYS_MS) && issuedAt >= (now - (2 * THIRTY_DAYS_MS));
        })
        .reduce((acc, curr) => acc + parseFloat(curr.amount), 0);
    const revenueGrowthPct = previousPeriodRevenue > 0
        ? ((currentPeriodRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100
        : 0;

    if (isLoading) {
        return <div className="p-8 flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;
    }

    return (
        <div className="min-h-full p-8 space-y-12 font-sans relative overflow-hidden">
            {/* Background Mesh Gradient - Dark Mode Only or Subtle in Light */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20 dark:opacity-30">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-400/30 dark:bg-emerald-600/30 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-400/20 dark:bg-indigo-600/20 blur-[120px] rounded-full animate-pulse-slow" />
            </div>

            <div className="relative">
                <div className="flex items-center gap-3 mb-1">
                    <TrendingUp className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-500 dark:text-emerald-400 uppercase tracking-widest">Financial Intelligence</span>
                </div>
                <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-500 dark:from-white dark:to-slate-400">
                    Billing & Revenue
                </h2>
                <p className="text-lg text-slate-500 dark:text-slate-400 max-w-xl">
                    Track platform-wide revenue streams and manage global enterprise invoicing.
                </p>
            </div>

            {/* Overview Stats */}
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="relative grid gap-6 md:grid-cols-4"
            >
                <motion.div variants={itemVariants}>
                    <Card className="bg-white/80 dark:bg-[#111114]/80 border-slate-200 dark:border-white/5 backdrop-blur-3xl rounded-[32px] overflow-hidden group hover:border-emerald-500/20 transition-all duration-500 shadow-xl dark:shadow-2xl">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-6">
                            <CardTitle className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Total Revenue (YTD)</CardTitle>
                            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-all">
                                <DollarSign className="h-4 w-4 text-emerald-500" />
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 pt-0">
                            <div className="text-3xl font-black text-slate-900 dark:text-white">$ {totalRevenue.toLocaleString()}</div>
                            <p className={`text-xs mt-2 flex items-center gap-1 font-bold ${revenueGrowthPct >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                                <TrendingUp className="w-3 h-3" />
                                {revenueGrowthPct >= 0 ? '+' : ''}{revenueGrowthPct.toFixed(1)}%
                                <span className="text-slate-500 font-medium tracking-normal ml-1">vs previous 30 days</span>
                            </p>
                            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-600/0 via-emerald-600/50 to-emerald-600/0 opacity-0 group-hover:opacity-100 transition-all duration-500" />
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div variants={itemVariants}>
                    <Card className="bg-white/80 dark:bg-[#111114]/80 border-slate-200 dark:border-white/5 backdrop-blur-3xl rounded-[32px] overflow-hidden group hover:border-orange-500/20 transition-all duration-500 shadow-xl dark:shadow-2xl">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-6">
                            <CardTitle className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Pending Payments</CardTitle>
                            <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center border border-orange-500/20 group-hover:bg-orange-500/20 transition-all">
                                <Clock className="h-4 w-4 text-orange-500" />
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 pt-0">
                            <div className="text-3xl font-black text-slate-900 dark:text-white">$ {pendingAmount.toLocaleString()}</div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1 font-medium">
                                {pendingCount} invoices pending collection
                            </p>
                            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-orange-600/0 via-orange-600/50 to-orange-600/0 opacity-0 group-hover:opacity-100 transition-all duration-500" />
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div variants={itemVariants}>
                    <Card className="bg-white/80 dark:bg-[#111114]/80 border-slate-200 dark:border-white/5 backdrop-blur-3xl rounded-[32px] overflow-hidden group hover:border-indigo-500/20 transition-all duration-500 shadow-xl dark:shadow-2xl">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-6">
                            <CardTitle className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Paid Invoices</CardTitle>
                            <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 group-hover:bg-indigo-500/20 transition-all">
                                <CheckCircle className="h-4 w-4 text-indigo-500" />
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 pt-0">
                            <div className="text-3xl font-black text-slate-900 dark:text-white">{paidCount}</div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1 font-medium">
                                Successfully processed this period
                            </p>
                            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-600/0 via-indigo-600/50 to-indigo-600/0 opacity-0 group-hover:opacity-100 transition-all duration-500" />
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div variants={itemVariants}>
                    <Card className="bg-white/80 dark:bg-[#111114]/80 border-slate-200 dark:border-white/5 backdrop-blur-3xl rounded-[32px] overflow-hidden group hover:border-red-500/20 transition-all duration-500 shadow-xl dark:shadow-2xl">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-6">
                            <CardTitle className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Failed/Overdue</CardTitle>
                            <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 group-hover:bg-red-500/20 transition-all">
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 pt-0">
                            <div className="text-3xl font-black text-slate-900 dark:text-white">{failedCount + overdueCount}</div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1 font-medium">
                                ${(failedAmount + overdueAmount).toLocaleString()} at risk amount
                            </p>
                            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-red-600/0 via-red-600/50 to-red-600/0 opacity-0 group-hover:opacity-100 transition-all duration-500" />
                        </CardContent>
                    </Card>
                </motion.div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="relative"
            >
                <Card className="bg-white/80 dark:bg-[#111114]/80 border-slate-200 dark:border-white/5 backdrop-blur-3xl rounded-[40px] overflow-hidden shadow-xl dark:shadow-2xl">
                    <CardHeader className="p-10 pb-4">
                        <div className="flex items-center gap-3 mb-2">
                            <History className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                            <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">Recent Transactions</CardTitle>
                        </div>
                        <CardDescription className="text-slate-500 dark:text-slate-400 text-base">
                            The full immutable ledger of platform-wide revenue generation and tenant billing.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-10 pt-4">
                        <div className="rounded-2xl border border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/2 overflow-hidden overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-100/50 dark:bg-white/5">
                                    <TableRow className="border-slate-200 dark:border-white/5 hover:bg-transparent">
                                        <TableHead className="py-5 font-bold text-slate-500 dark:text-slate-300">Invoice ID</TableHead>
                                        <TableHead className="py-5 font-bold text-slate-500 dark:text-slate-300">Tenant School</TableHead>
                                        <TableHead className="py-5 font-bold text-slate-500 dark:text-slate-300">Financial Amount</TableHead>
                                        <TableHead className="py-5 font-bold text-slate-500 dark:text-slate-300">Product Tier</TableHead>
                                        <TableHead className="py-5 font-bold text-slate-500 dark:text-slate-300">Status</TableHead>
                                        <TableHead className="py-5 font-bold text-slate-500 dark:text-slate-300">Timestamp</TableHead>
                                        <TableHead className="py-5 font-bold text-slate-500 dark:text-slate-300 text-right">Ledger Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {invoices.length === 0 ? (
                                        <TableRow className="border-slate-200 dark:border-white/5">
                                            <TableCell colSpan={7} className="text-center py-24 text-slate-500 dark:text-slate-500">
                                                <div className="flex flex-col items-center gap-3">
                                                    <Sparkles className="w-10 h-10 opacity-20" />
                                                    <p className="text-lg font-medium">No activity detected in the ledger.</p>
                                                    <p className="text-sm max-w-xs mx-auto">Once tenants start subscribing to plans, historical invoices will appear here.</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        invoices.map((inv, idx) => (
                                            <TableRow key={inv.invoice_id} className="border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                                                <TableCell className="py-5 font-mono text-[10px] text-slate-500 tracking-widest">{inv.invoice_id.slice(0, 12)}</TableCell>
                                                <TableCell className="py-5 font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-emerald-400 transition-colors">{inv.tenant_name}</TableCell>
                                                <TableCell className="py-5 text-indigo-600 dark:text-emerald-400 font-black tracking-tight text-lg">${parseFloat(inv.amount).toLocaleString()}</TableCell>
                                                <TableCell className="py-5">
                                                    <Badge variant="outline" className="border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 rounded-lg px-3 py-1 font-bold tracking-tight uppercase text-[10px]">
                                                        {inv.plan_name}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="py-5">
                                                    {inv.status === 'paid' ? (
                                                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold w-fit">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                                                            PAID
                                                        </div>
                                                    ) : inv.status === 'pending' ? (
                                                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 text-orange-700 dark:text-orange-400 text-xs font-bold w-fit">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse shadow-[0_0_8px_#f97316]" />
                                                            PENDING
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400 text-xs font-bold w-fit">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]" />
                                                            FAILED
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="py-5 text-slate-500 dark:text-slate-400 font-medium">{new Date(inv.issued_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</TableCell>
                                                <TableCell className="py-5 text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-10 w-10 rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
                                                        onClick={() => {
                                                            const url = `${getApiBaseUrl()}/billing/saas/invoices/${inv.invoice_id}/download/`;
                                                            toast.promise(
                                                                saasApi.helpers.downloadFile(url, `invoice_${inv.invoice_id.slice(0, 8)}.pdf`),
                                                                {
                                                                    loading: 'Preparing invoice...',
                                                                    success: 'Invoice downloaded successfully',
                                                                    error: 'Failed to generate invoice'
                                                                }
                                                            );
                                                        }}
                                                    >
                                                        <Download className="h-5 w-5" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
