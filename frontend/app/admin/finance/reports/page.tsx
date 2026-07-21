// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import Link from 'next/link';
import FinancialReports from '@/components/finance/FinancialReports';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, Banknote, Building2, BookOpen, AlertTriangle, Scale, Award, ChevronRight } from 'lucide-react';

const REPORTS = [
    { href: '/admin/finance/reports/day-book', icon: CalendarDays, color: 'bg-indigo-100 text-indigo-600',
      title: 'Day Book', desc: 'Every receipt and expense for the day, in chronological order.' },
    { href: '/admin/finance/reports/cash-book', icon: Banknote, color: 'bg-emerald-100 text-emerald-600',
      title: 'Cash Book', desc: 'Cash receipts only — what came into the till today.' },
    { href: '/admin/finance/reports/bank-book', icon: Building2, color: 'bg-blue-100 text-blue-600',
      title: 'Bank Book', desc: 'Bank transfer, cheque, online and card receipts.' },
    { href: '/admin/finance/reports/student-ledger', icon: BookOpen, color: 'bg-violet-100 text-violet-600',
      title: 'Student Ledger', desc: 'T-format ledger of charges and payments per student.' },
    { href: '/admin/finance/reports/aging', icon: AlertTriangle, color: 'bg-red-100 text-red-600',
      title: 'Aging Report', desc: 'Outstanding fees bucketed by overdue age (current / 30 / 60 / 90+).' },
    { href: '/admin/finance/reports/trial-balance', icon: Scale, color: 'bg-amber-100 text-amber-600',
      title: 'Trial Balance', desc: 'All Chart of Accounts balances from posted journal entries.' },
    { href: '/admin/finance/reports/scholarships', icon: Award, color: 'bg-blue-100 text-blue-700',
      title: 'Scholarship Register', desc: 'Govt-mandated scholarship listing for SSDP / EGRP / IRD audits.' },
];

export default function ReportsPage() {
    return (
        <div className="max-w-7xl mx-auto py-6 space-y-8">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Finance Reports</h1>
                <p className="text-sm text-slate-500">Day-to-day registers, ledgers and outstanding tracking.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {REPORTS.map(r => {
                    const Icon = r.icon;
                    return (
                        <Link key={r.href} href={r.href} className="block">
                            <Card className="hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer h-full">
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className={`p-2 rounded-lg ${r.color}`}><Icon className="h-5 w-5" /></div>
                                        <ChevronRight className="h-4 w-4 text-slate-400" />
                                    </div>
                                    <CardTitle className="text-base mt-3">{r.title}</CardTitle>
                                    <CardDescription className="text-xs">{r.desc}</CardDescription>
                                </CardHeader>
                            </Card>
                        </Link>
                    );
                })}
            </div>

            <div className="border-t pt-8">
                <h2 className="text-lg font-bold mb-4">PDF Exports & Defaulters</h2>
                <FinancialReports />
            </div>
        </div>
    );
}
