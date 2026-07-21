// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    DollarSign, TrendingUp, TrendingDown,
    AlertCircle, Activity, Users
} from 'lucide-react';
import { billingAPI, FinanceDashboard, FinancialAnalytics } from '@/lib/api';

const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
    salary: 'Salaries', maintenance: 'Maintenance', utilities: 'Utilities',
    supplies: 'Supplies', events: 'Events', transport: 'Transport', other: 'Other',
};

const STATUS_COLOR: Record<string, string> = {
    paid: 'bg-emerald-500',
    partial: 'bg-amber-400',
    pending: 'bg-slate-300',
    overdue: 'bg-red-500',
    waived: 'bg-violet-400',
};

const STATUS_TEXT_COLOR: Record<string, string> = {
    paid: 'text-emerald-700',
    partial: 'text-amber-700',
    pending: 'text-slate-600',
    overdue: 'text-red-700',
    waived: 'text-violet-700',
};

export function FinanceOverview() {
    const [data, setData] = useState<FinanceDashboard | null>(null);
    const [analytics, setAnalytics] = useState<FinancialAnalytics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            billingAPI.getFinanceDashboard().catch(() => null),
            billingAPI.getFinancialAnalytics().catch(() => null),
        ]).then(([dash, anal]) => {
            if (dash) setData(dash);
            if (anal) setAnalytics(anal);
        }).finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div className="space-y-6 animate-pulse">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1,2,3,4].map(i => <div key={i} className="h-32 bg-slate-100 rounded-2xl" />)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 h-64 bg-slate-100 rounded-2xl" />
                <div className="h-64 bg-slate-100 rounded-2xl" />
            </div>
        </div>
    );

    const statCards = [
        {
            title: 'Total Revenue',
            value: `$${(data?.total_revenue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            icon: <DollarSign className="h-5 w-5 text-emerald-600" />,
            color: 'bg-emerald-50',
            sub: analytics?.collection_rate != null ? `${analytics.collection_rate}% collected` : undefined,
        },
        {
            title: 'Outstanding Fees',
            value: `$${(data?.total_pending ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            icon: <AlertCircle className="h-5 w-5 text-red-600" />,
            color: 'bg-red-50',
            sub: analytics?.top_defaulters?.length ? `${analytics.top_defaulters.length} defaulters` : undefined,
        },
        {
            title: 'Total Expenses',
            value: `$${(data?.total_expenses ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            icon: <TrendingDown className="h-5 w-5 text-orange-600" />,
            color: 'bg-orange-50',
            sub: analytics?.expense_by_category?.length ? `${analytics.expense_by_category.length} categories` : undefined,
        },
        {
            title: 'Net Balance',
            value: `$${(data?.net_balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            icon: <Activity className="h-5 w-5 text-indigo-600" />,
            color: 'bg-indigo-50',
            sub: (data?.net_balance ?? 0) >= 0 ? 'Surplus' : 'Deficit',
        },
    ];

    // Monthly chart – last 12 months
    const monthly = analytics?.monthly_collections ?? [];
    const maxMonthly = Math.max(1, ...monthly.map(m => m.total));

    // Fee status pie segments
    const statusBreakdown = analytics?.fee_status_breakdown ?? [];
    const totalFees = statusBreakdown.reduce((s, i) => s + i.total_due, 0) || 1;

    return (
        <div className="space-y-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {statCards.map((c, i) => (
                    <Card key={i} className="border-slate-200 shadow-sm">
                        <CardContent className="p-5">
                            <div className={`h-10 w-10 rounded-xl ${c.color} flex items-center justify-center mb-3`}>
                                {c.icon}
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{c.title}</p>
                            <p className="text-xl font-black text-slate-900 mt-0.5">{c.value}</p>
                            {c.sub && <p className="text-[10px] text-slate-400 mt-1">{c.sub}</p>}
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Monthly Revenue Trend */}
                <Card className="lg:col-span-2 border-slate-200 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold text-slate-700">Monthly Collections (Last 12 Months)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {monthly.length === 0 ? (
                            <div className="h-48 flex items-center justify-center">
                                <p className="text-xs text-slate-400">No payment data yet.</p>
                            </div>
                        ) : (
                            <div className="flex items-end gap-1.5 h-48 pt-2">
                                {monthly.map(m => (
                                    <div key={m.month} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                                        <p className="text-[9px] text-slate-500 font-bold">
                                            ${m.total >= 1000 ? `${(m.total / 1000).toFixed(1)}k` : m.total.toFixed(0)}
                                        </p>
                                        <div className="w-full bg-slate-100 rounded-t-sm relative" style={{ height: '120px' }}>
                                            <div
                                                className="absolute bottom-0 left-0 right-0 bg-indigo-500 rounded-t-sm transition-all"
                                                style={{ height: `${(m.total / maxMonthly) * 100}%` }}
                                            />
                                        </div>
                                        <p className="text-[9px] text-slate-400 truncate w-full text-center">{m.label.split(' ')[0]}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Fee Collection Status */}
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold text-slate-700">Fee Collection Status</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {statusBreakdown.length === 0 ? (
                            <p className="text-xs text-slate-400 py-4 text-center">No fee data.</p>
                        ) : (
                            statusBreakdown.map(item => {
                                const pct = Math.round((item.total_due / totalFees) * 100);
                                return (
                                    <div key={item.status} className="space-y-1">
                                        <div className="flex justify-between text-xs font-bold">
                                            <span className={`capitalize ${STATUS_TEXT_COLOR[item.status] ?? 'text-slate-600'}`}>{item.status}</span>
                                            <span className="text-slate-600">{pct}% · {item.count}</span>
                                        </div>
                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full ${STATUS_COLOR[item.status] ?? 'bg-slate-300'}`}
                                                style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Expense by Category */}
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold text-slate-700">Expenses by Category</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {(analytics?.expense_by_category ?? []).length === 0 ? (
                            <p className="text-xs text-slate-400 py-4 text-center">No expense data.</p>
                        ) : (() => {
                            const maxExp = Math.max(1, ...(analytics?.expense_by_category ?? []).map(e => e.total));
                            return (analytics?.expense_by_category ?? []).map(item => (
                                <div key={item.category} className="space-y-1">
                                    <div className="flex justify-between text-xs font-bold">
                                        <span className="text-slate-600">{EXPENSE_CATEGORY_LABELS[item.category] ?? item.category}</span>
                                        <span className="text-slate-800">${item.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-orange-400 rounded-full" style={{ width: `${(item.total / maxExp) * 100}%` }} />
                                    </div>
                                </div>
                            ));
                        })()}
                    </CardContent>
                </Card>

                {/* Top Defaulters */}
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-red-500" />
                            <CardTitle className="text-sm font-bold text-slate-700">Top Defaulters</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {(analytics?.top_defaulters ?? []).length === 0 ? (
                            <p className="text-xs text-slate-400 py-4 text-center">No outstanding dues.</p>
                        ) : (
                            (analytics?.top_defaulters ?? []).slice(0, 6).map((d, i) => (
                                <div key={d.student_id} className="flex items-center gap-3">
                                    <span className="text-[10px] font-black text-slate-300 w-4">{i + 1}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-slate-700 truncate">{d.student_name}</p>
                                        <p className="text-[10px] text-slate-400">{d.fee_count} pending fee{d.fee_count > 1 ? 's' : ''}</p>
                                    </div>
                                    <span className="text-xs font-black text-red-600">${d.outstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Recent Activity */}
            {(data?.recent_payments?.length ?? 0) > 0 && (
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold text-slate-700">Recent Payments</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {data?.recent_payments?.map(p => (
                                <div key={p.payment_id} className="flex items-center gap-3 py-1.5 border-b border-slate-100 last:border-0">
                                    <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-slate-700 truncate">{(p as any).student_name ?? 'Student'}</p>
                                        <p className="text-[10px] text-slate-400 capitalize">{p.method} · {new Date(p.payment_date).toLocaleDateString()}</p>
                                    </div>
                                    <span className="text-sm font-black text-emerald-600">${Number(p.amount).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
