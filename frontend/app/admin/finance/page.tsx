// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState } from 'react';
import { FinanceOverview } from './FinanceOverview';
import { FeeStructureManager } from './FeeStructureManager';
import { StudentFeeList } from './StudentFeeList';
import { ExpenseManager } from './ExpenseManager';
import FinancialReports from '@/components/finance/FinancialReports';
import { DiscountManager } from './DiscountManager';
import { LedgerManager } from './LedgerManager';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
    LayoutDashboard, Receipt, Settings2, TrendingUp, Wallet,
    Building2, CalendarDays, Percent, BookOpen, Layers
} from 'lucide-react';

const TABS = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'fees', label: 'Student Fees', icon: Receipt },
    { id: 'structures', label: 'Fee Matrix', icon: Settings2 },
    { id: 'expenses', label: 'Expenses', icon: Wallet },
    { id: 'reports', label: 'Reports', icon: TrendingUp },
    { id: 'discounts', label: 'Discounts', icon: Percent },
    { id: 'ledger', label: 'Ledger', icon: BookOpen },
] as const;

type TabId = typeof TABS[number]['id'];

export default function FinanceDashboardPage() {
    const [activeTab, setActiveTab] = useState<TabId>('overview');

    return (
        <div className="container mx-auto py-8 space-y-8 max-w-7xl px-4 md:px-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 pb-6">
                <div>
                    <div className="flex items-center gap-2 text-indigo-600 font-bold mb-1">
                        <Building2 className="h-4 w-4" />
                        <span className="text-[10px] uppercase tracking-[0.2em]">Institutional Finance</span>
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">Financial Center</h1>
                    <p className="text-slate-500 font-medium">Fee management, expense tracking, and financial reporting</p>
                </div>
                <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
                    <Link href="/admin/finance/bulk-billing">
                        <Button size="sm" className="gap-1.5 bg-indigo-600 hover:bg-indigo-700">
                            <Layers className="h-3.5 w-3.5" /> Bulk Billing
                        </Button>
                    </Link>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg shadow-sm border border-slate-100 text-xs font-bold text-slate-700">
                        <CalendarDays className="h-3.5 w-3.5 text-indigo-500" />
                        {new Date().getFullYear()} Academic Year
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex bg-slate-100 rounded-2xl p-1 gap-1 w-fit overflow-x-auto">
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                                activeTab === tab.id
                                    ? 'bg-white shadow-md text-indigo-700'
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <Icon className="h-3.5 w-3.5" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Content */}
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {activeTab === 'overview' && <FinanceOverview />}
                {activeTab === 'fees' && <StudentFeeList />}
                {activeTab === 'structures' && <FeeStructureManager />}
                {activeTab === 'expenses' && <ExpenseManager />}
                {activeTab === 'reports' && (
                    <div className="max-w-5xl">
                        <FinancialReports />
                    </div>
                )}
                {activeTab === 'discounts' && <DiscountManager />}
                {activeTab === 'ledger' && <LedgerManager />}
            </div>
        </div>
    );
}
