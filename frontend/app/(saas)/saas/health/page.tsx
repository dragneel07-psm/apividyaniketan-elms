// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { saasApi } from '@/lib/api';
import { toast } from 'sonner';
import {
    ShieldAlert, Clock, AlertTriangle, Ban, DollarSign,
    RefreshCw, Loader2, CheckCircle2, ExternalLink, Bell,
} from 'lucide-react';
import Link from 'next/link';

type HealthData = Awaited<ReturnType<typeof saasApi.getHealthMonitor>>;

function AlertBadge({ count, label, critical }: { count: number; label: string; critical?: boolean }) {
    if (count === 0) return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
            <CheckCircle2 className="h-3 w-3" /> {label}: OK
        </span>
    );
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${critical ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
            <Bell className="h-3 w-3" /> {count} {label}
        </span>
    );
}

export default function SaasHealthPage() {
    const [data, setData] = useState<HealthData | null>(null);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        try {
            const res = await saasApi.getHealthMonitor();
            setData(res);
        } catch {
            toast.error('Failed to load health monitor');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full py-32 space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-red-500" />
                <p className="text-slate-500 text-sm animate-pulse">Scanning platform health...</p>
            </div>
        );
    }

    if (!data) return null;

    const hasIssues = data.total_alerts > 0;

    return (
        <div className="p-8 lg:p-10 space-y-8 min-h-full">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <ShieldAlert className="w-5 h-5 text-red-500" />
                        <span className="text-xs font-bold text-red-500 uppercase tracking-widest">Platform Monitor</span>
                    </div>
                    <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">Health Monitor</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Proactive alerts for trials, payments, and tenant issues.
                    </p>
                </div>
                <Button variant="outline" onClick={load} disabled={loading}>
                    <RefreshCw className="h-4 w-4 mr-2" /> Refresh
                </Button>
            </div>

            {/* Overall health banner */}
            <div className={`rounded-2xl p-5 flex items-center gap-4 ${hasIssues ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' : 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'}`}>
                {hasIssues
                    ? <AlertTriangle className="w-8 h-8 text-red-500 shrink-0" />
                    : <CheckCircle2 className="w-8 h-8 text-emerald-500 shrink-0" />}
                <div>
                    <p className={`font-bold ${hasIssues ? 'text-red-700 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                        {hasIssues ? `${data.total_alerts} alert${data.total_alerts !== 1 ? 's' : ''} need attention` : 'Platform is healthy — no issues detected'}
                    </p>
                    <div className="flex gap-2 flex-wrap mt-1">
                        <AlertBadge count={data.expiring_trials.length} label="expiring trials" />
                        <AlertBadge count={data.past_due.length} label="past due" critical />
                        <AlertBadge count={data.failed_payments.length} label="failed payments" critical />
                        <AlertBadge count={data.suspended_tenants.length} label="suspended" />
                    </div>
                </div>
            </div>

            {/* Expiring Trials */}
            <Card className="dark:bg-[#111114] dark:border-white/10">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-amber-500" />
                        <div>
                            <CardTitle>Trials Expiring Soon</CardTitle>
                            <CardDescription>Schools whose trial ends within 7 days.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {data.expiring_trials.length === 0 ? (
                        <p className="text-sm text-slate-400 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> No trials expiring within 7 days.</p>
                    ) : (
                        <div className="space-y-3">
                            {data.expiring_trials.map((t) => (
                                <div key={t.tenant_id} className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                                    <div>
                                        <p className="font-semibold text-slate-900 dark:text-white">{t.tenant_name}</p>
                                        <p className="text-xs text-slate-500">Plan: {t.plan} · Expires: {t.end_date}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-sm font-bold px-3 py-1 rounded-full ${t.days_left <= 2 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                            {t.days_left}d left
                                        </span>
                                        <Link href={`/saas/schools/${t.tenant_id}`}>
                                            <Button size="sm" variant="outline" className="h-8">
                                                <ExternalLink className="h-3.5 w-3.5 mr-1" /> Manage
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Past Due Subscriptions */}
            <Card className="dark:bg-[#111114] dark:border-white/10">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                        <div>
                            <CardTitle>Past Due Subscriptions</CardTitle>
                            <CardDescription>Schools with overdue subscription payments.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {data.past_due.length === 0 ? (
                        <p className="text-sm text-slate-400 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> No past due subscriptions.</p>
                    ) : (
                        <div className="space-y-3">
                            {data.past_due.map((t) => (
                                <div key={t.tenant_id} className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                                    <div>
                                        <p className="font-semibold text-slate-900 dark:text-white">{t.tenant_name}</p>
                                        <p className="text-xs text-slate-500">Plan: {t.plan}{t.end_date ? ` · Due: ${t.end_date}` : ''}</p>
                                    </div>
                                    <Link href={`/saas/schools/${t.tenant_id}`}>
                                        <Button size="sm" variant="outline" className="h-8">
                                            <ExternalLink className="h-3.5 w-3.5 mr-1" /> Manage
                                        </Button>
                                    </Link>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Failed Payments */}
            <Card className="dark:bg-[#111114] dark:border-white/10">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <DollarSign className="w-5 h-5 text-red-500" />
                        <div>
                            <CardTitle>Failed Payments</CardTitle>
                            <CardDescription>Invoices that failed in the last 30 days.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {data.failed_payments.length === 0 ? (
                        <p className="text-sm text-slate-400 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> No failed payments in last 30 days.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-xs text-slate-400 uppercase border-b border-slate-100 dark:border-white/10">
                                        <th className="text-left py-2 font-medium">School</th>
                                        <th className="text-left py-2 font-medium">Amount</th>
                                        <th className="text-left py-2 font-medium">Date</th>
                                        <th className="text-left py-2 font-medium">Invoice</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                    {data.failed_payments.map((inv) => (
                                        <tr key={inv.invoice_id} className="hover:bg-slate-50 dark:hover:bg-white/5">
                                            <td className="py-3 font-medium text-slate-900 dark:text-white">{inv.tenant_name}</td>
                                            <td className="py-3 text-red-600 font-bold">${inv.amount.toLocaleString()}</td>
                                            <td className="py-3 text-slate-500">{inv.issued_date}</td>
                                            <td className="py-3 font-mono text-xs text-slate-400">{inv.invoice_id.slice(0, 12)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Suspended Tenants */}
            <Card className="dark:bg-[#111114] dark:border-white/10">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <Ban className="w-5 h-5 text-slate-500" />
                        <div>
                            <CardTitle>Suspended Schools</CardTitle>
                            <CardDescription>Schools with suspended accounts.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {data.suspended_tenants.length === 0 ? (
                        <p className="text-sm text-slate-400 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> No suspended schools.</p>
                    ) : (
                        <div className="space-y-3">
                            {data.suspended_tenants.map((t) => (
                                <div key={t.tenant_id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl">
                                    <div>
                                        <p className="font-semibold text-slate-900 dark:text-white">{t.tenant_name}</p>
                                        {t.subdomain && <p className="text-xs text-slate-400 font-mono">{t.subdomain}</p>}
                                    </div>
                                    <Link href={`/saas/schools/${t.tenant_id}`}>
                                        <Button size="sm" variant="outline" className="h-8">
                                            <ExternalLink className="h-3.5 w-3.5 mr-1" /> View
                                        </Button>
                                    </Link>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
