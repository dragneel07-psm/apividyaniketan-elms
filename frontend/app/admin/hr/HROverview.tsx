// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { hrAPI, HRDashboardStats } from '@/lib/api';
import {
    Users, Building2, CalendarClock, FileText,
    Briefcase, TrendingUp
} from 'lucide-react';

const CONTRACT_LABELS: Record<string, string> = {
    permanent: 'Permanent',
    probationary: 'Probationary',
    fixed_term: 'Fixed-Term',
    part_time: 'Part-Time',
};

const CONTRACT_COLORS: Record<string, string> = {
    permanent: 'bg-emerald-100 text-emerald-700',
    probationary: 'bg-amber-100 text-amber-700',
    fixed_term: 'bg-blue-100 text-blue-700',
    part_time: 'bg-slate-100 text-slate-600',
};

export function HROverview() {
    const [stats, setStats] = useState<HRDashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        hrAPI.getDashboardStats()
            .then(setStats)
            .catch(() => null)
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-32 bg-slate-100 rounded-2xl border border-slate-200" />
                ))}
            </div>
        );
    }

    const statCards = [
        {
            title: 'Active Employees',
            value: stats?.total_employees ?? 0,
            icon: <Users className="h-6 w-6 text-indigo-600" />,
            color: 'bg-indigo-50',
            border: 'border-indigo-100',
        },
        {
            title: 'Departments',
            value: stats?.total_departments ?? 0,
            icon: <Building2 className="h-6 w-6 text-violet-600" />,
            color: 'bg-violet-50',
            border: 'border-violet-100',
        },
        {
            title: 'Pending Leaves',
            value: stats?.pending_leave_requests ?? 0,
            icon: <CalendarClock className="h-6 w-6 text-amber-600" />,
            color: 'bg-amber-50',
            border: 'border-amber-100',
        },
        {
            title: 'Open Payroll Periods',
            value: stats?.open_payroll_periods ?? 0,
            icon: <FileText className="h-6 w-6 text-emerald-600" />,
            color: 'bg-emerald-50',
            border: 'border-emerald-100',
        },
    ];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((card, idx) => (
                    <Card key={idx} className={`border ${card.border} shadow-sm hover:shadow-md transition-all`}>
                        <CardContent className="p-6">
                            <div className={`h-12 w-12 rounded-2xl ${card.color} flex items-center justify-center mb-4`}>
                                {card.icon}
                            </div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{card.title}</p>
                            <h3 className="text-3xl font-black text-slate-900 mt-1">{card.value}</h3>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Contract Breakdown */}
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center gap-2 pb-3">
                        <Briefcase className="h-5 w-5 text-slate-400" />
                        <CardTitle className="text-base font-bold">Contract Type Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {(stats?.contract_breakdown ?? []).length === 0 && (
                            <p className="text-sm text-slate-400 text-center py-6">No employee data yet.</p>
                        )}
                        {(stats?.contract_breakdown ?? []).map((item) => (
                            <div key={item.contract_type} className="flex items-center justify-between">
                                <Badge className={`text-xs font-bold px-3 py-1 ${CONTRACT_COLORS[item.contract_type] ?? 'bg-slate-100 text-slate-600'}`}>
                                    {CONTRACT_LABELS[item.contract_type] ?? item.contract_type}
                                </Badge>
                                <span className="text-sm font-bold text-slate-700">{item.count} staff</span>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Department Headcount */}
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center gap-2 pb-3">
                        <TrendingUp className="h-5 w-5 text-slate-400" />
                        <CardTitle className="text-base font-bold">Department Headcount</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {(stats?.department_headcount ?? []).length === 0 && (
                            <p className="text-sm text-slate-400 text-center py-6">No department data yet.</p>
                        )}
                        {(stats?.department_headcount ?? []).map((item) => (
                            <div key={item.department__name} className="space-y-1">
                                <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                                    <span className="text-slate-600">{item.department__name}</span>
                                    <span className="text-indigo-600">{item.count}</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-indigo-500 rounded-full transition-all"
                                        style={{
                                            width: `${Math.min(100, (item.count / (stats?.total_employees || 1)) * 100)}%`
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
