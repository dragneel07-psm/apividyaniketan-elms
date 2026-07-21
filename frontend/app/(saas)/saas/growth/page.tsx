// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { saasApi } from '@/lib/api';
import { toast } from 'sonner';
import { TrendingUp, Users, DollarSign, School, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type GrowthData = Awaited<ReturnType<typeof saasApi.getGrowthAnalytics>>;

const STATUS_COLORS: Record<string, string> = {
    active: 'bg-emerald-500',
    trial: 'bg-indigo-500',
    past_due: 'bg-amber-500',
    cancelled: 'bg-red-500',
};

const STATUS_TEXT: Record<string, string> = {
    active: 'text-emerald-700',
    trial: 'text-indigo-700',
    past_due: 'text-amber-700',
    cancelled: 'text-red-700',
};

const STATUS_BG: Record<string, string> = {
    active: 'bg-emerald-50',
    trial: 'bg-indigo-50',
    past_due: 'bg-amber-50',
    cancelled: 'bg-red-50',
};

export default function SaasGrowthPage() {
    const [data, setData] = useState<GrowthData | null>(null);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        try {
            const res = await saasApi.getGrowthAnalytics();
            setData(res);
        } catch {
            toast.error('Failed to load growth analytics');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full py-32 space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
                <p className="text-slate-500 text-sm animate-pulse">Loading growth analytics...</p>
            </div>
        );
    }

    if (!data) return null;

    const maxSignups = Math.max(...data.monthly_signups.map((r) => r.count), 1);
    const maxPlanCount = Math.max(...data.plan_distribution.map((r) => r.count), 1);
    const maxRevenue = Math.max(...data.revenue_by_plan.map((r) => r.total), 1);
    const totalStatusCount = data.status_breakdown.reduce((s, r) => s + r.count, 0) || 1;
    const monthlyCount = data.billing_cycles.find((c) => c.cycle === 'monthly')?.count ?? 0;
    const yearlyCount = data.billing_cycles.find((c) => c.cycle === 'yearly')?.count ?? 0;
    const totalCycles = monthlyCount + yearlyCount || 1;

    return (
        <div className="p-8 lg:p-10 space-y-10 min-h-full">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="w-5 h-5 text-indigo-500" />
                        <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest">Platform Intelligence</span>
                    </div>
                    <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">Growth Analytics</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Tenant acquisition, plan adoption, and revenue distribution.</p>
                </div>
                <Button variant="outline" onClick={load} disabled={loading}>
                    <RefreshCw className="h-4 w-4 mr-2" /> Refresh
                </Button>
            </div>

            {/* Summary KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Schools', value: data.summary.total_tenants, icon: School, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
                    { label: 'Active Subscriptions', value: data.summary.active_subscriptions, icon: Users, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
                    { label: 'On Trial', value: data.summary.trial_subscriptions, icon: TrendingUp, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
                    { label: 'Total Revenue', value: `$${data.summary.total_revenue.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
                ].map(({ label, value, icon: Icon, color, bg }) => (
                    <Card key={label} className="dark:bg-[#111114] dark:border-white/10">
                        <CardContent className="p-6 flex items-center gap-4">
                            <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center`}>
                                <Icon className={`w-5 h-5 ${color}`} />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</p>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Monthly Signups Chart */}
            <Card className="dark:bg-[#111114] dark:border-white/10">
                <CardHeader>
                    <CardTitle>Monthly New Schools</CardTitle>
                    <CardDescription>New tenant registrations over the last 12 months.</CardDescription>
                </CardHeader>
                <CardContent>
                    {data.monthly_signups.length === 0 ? (
                        <div className="flex items-center justify-center h-32 text-slate-400 text-sm">No signup data available.</div>
                    ) : (
                        <div className="space-y-3">
                            {data.monthly_signups.map((row) => (
                                <div key={row.month} className="flex items-center gap-3">
                                    <span className="text-xs text-slate-500 w-16 shrink-0">{row.label}</span>
                                    <div className="flex-1 bg-slate-100 dark:bg-white/5 rounded-full h-6 overflow-hidden">
                                        <div
                                            className="h-full bg-indigo-500 rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                                            style={{ width: `${Math.max(4, (row.count / maxSignups) * 100)}%` }}
                                        >
                                            <span className="text-white text-xs font-bold">{row.count}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Plan Distribution + Status Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="dark:bg-[#111114] dark:border-white/10">
                    <CardHeader>
                        <CardTitle>Plan Distribution</CardTitle>
                        <CardDescription>Number of schools on each subscription plan.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {data.plan_distribution.length === 0 ? (
                            <p className="text-sm text-slate-400">No plan data.</p>
                        ) : (
                            data.plan_distribution.map((row, i) => {
                                const colors = ['bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500', 'bg-pink-500'];
                                const color = colors[i % colors.length];
                                return (
                                    <div key={row.plan} className="flex items-center gap-3">
                                        <span className="text-xs text-slate-600 dark:text-slate-400 w-28 truncate shrink-0">{row.plan}</span>
                                        <div className="flex-1 bg-slate-100 dark:bg-white/5 rounded-full h-5 overflow-hidden">
                                            <div
                                                className={`h-full ${color} rounded-full flex items-center justify-end pr-2`}
                                                style={{ width: `${Math.max(6, (row.count / maxPlanCount) * 100)}%` }}
                                            >
                                                <span className="text-white text-xs font-bold">{row.count}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </CardContent>
                </Card>

                <Card className="dark:bg-[#111114] dark:border-white/10">
                    <CardHeader>
                        <CardTitle>Subscription Status</CardTitle>
                        <CardDescription>Breakdown of subscriptions by current status.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {data.status_breakdown.map((row) => {
                            const pct = Math.round((row.count / totalStatusCount) * 100);
                            return (
                                <div key={row.status} className="flex items-center gap-3">
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize w-24 text-center shrink-0 ${STATUS_BG[row.status] ?? 'bg-slate-100'} ${STATUS_TEXT[row.status] ?? 'text-slate-600'}`}>
                                        {row.status.replace('_', ' ')}
                                    </span>
                                    <div className="flex-1 bg-slate-100 dark:bg-white/5 rounded-full h-5 overflow-hidden">
                                        <div
                                            className={`h-full ${STATUS_COLORS[row.status] ?? 'bg-slate-400'} rounded-full flex items-center justify-end pr-2`}
                                            style={{ width: `${Math.max(4, pct)}%` }}
                                        >
                                            <span className="text-white text-xs font-bold">{row.count}</span>
                                        </div>
                                    </div>
                                    <span className="text-xs text-slate-400 w-10 text-right">{pct}%</span>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>
            </div>

            {/* Revenue by Plan + Billing Cycle */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 dark:bg-[#111114] dark:border-white/10">
                    <CardHeader>
                        <CardTitle>Revenue by Plan</CardTitle>
                        <CardDescription>Total collected revenue per subscription plan (paid invoices).</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {data.revenue_by_plan.length === 0 ? (
                            <p className="text-sm text-slate-400">No revenue data yet.</p>
                        ) : (
                            data.revenue_by_plan.map((row) => (
                                <div key={row.plan} className="flex items-center gap-3">
                                    <span className="text-xs text-slate-600 dark:text-slate-400 w-28 truncate shrink-0">{row.plan}</span>
                                    <div className="flex-1 bg-slate-100 dark:bg-white/5 rounded-full h-6 overflow-hidden">
                                        <div
                                            className="h-full bg-emerald-500 rounded-full flex items-center justify-end pr-2"
                                            style={{ width: `${Math.max(4, (row.total / maxRevenue) * 100)}%` }}
                                        >
                                            <span className="text-white text-xs font-bold">${row.total.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

                <Card className="dark:bg-[#111114] dark:border-white/10">
                    <CardHeader>
                        <CardTitle>Billing Cycle Split</CardTitle>
                        <CardDescription>Monthly vs yearly billing preference.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {[
                            { label: 'Monthly', count: monthlyCount, color: 'bg-indigo-500' },
                            { label: 'Yearly', count: yearlyCount, color: 'bg-emerald-500' },
                        ].map(({ label, count, color }) => {
                            const pct = Math.round((count / totalCycles) * 100);
                            return (
                                <div key={label} className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="font-medium text-slate-700 dark:text-slate-300">{label}</span>
                                        <span className="text-slate-500">{count} schools ({pct}%)</span>
                                    </div>
                                    <div className="w-full bg-slate-100 dark:bg-white/5 rounded-full h-3 overflow-hidden">
                                        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                                    </div>
                                </div>
                            );
                        })}

                        <div className="pt-4 border-t border-slate-100 dark:border-white/10">
                            <p className="text-xs text-slate-500">
                                {yearlyCount > monthlyCount
                                    ? `${pct(yearlyCount, totalCycles)}% of schools prefer annual billing — great for ARR predictability.`
                                    : `${pct(monthlyCount, totalCycles)}% on monthly. Consider incentivising annual plans.`}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function pct(val: number, total: number) {
    return total ? Math.round((val / total) * 100) : 0;
}
