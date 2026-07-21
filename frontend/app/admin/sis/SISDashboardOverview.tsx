// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { sisAPI, SISDashboardStats } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { Heart, AlertTriangle, FileText, ArrowRightLeft, ShieldAlert } from 'lucide-react';

const INCIDENT_TYPE_LABELS: Record<string, string> = {
    misconduct: 'Misconduct', bullying: 'Bullying', cheating: 'Cheating',
    property_damage: 'Property Damage', verbal_abuse: 'Verbal Abuse',
    physical_altercation: 'Physical', attendance_violation: 'Attendance', other: 'Other',
};

const SEVERITY_COLOR: Record<string, string> = {
    low: 'bg-slate-200', medium: 'bg-amber-400', high: 'bg-red-500',
};

export function SISDashboardOverview() {
    const [stats, setStats] = useState<SISDashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Mirror backend IsSISStaff: admin / saas_admin OR staff with
        // staff_role = receptionist. Skip the call for everyone else so
        // we don't spam the console with permission_denied errors.
        const u = getUser() as { role?: string; staff_role?: string } | null;
        const role = (u?.role || '').toLowerCase();
        const staffRole = (u?.staff_role || '').toLowerCase();
        const allowed = role === 'admin'
            || role === 'saas_admin'
            || (role === 'staff' && staffRole === 'receptionist');
        if (!allowed) {
            setLoading(false);
            return;
        }
        sisAPI.getStats()
            .then(setStats)
            .catch(() => null)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 animate-pulse">
            {[1,2,3,4,5].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl" />)}
        </div>
    );

    const statCards = [
        { icon: <Heart className="h-5 w-5 text-rose-600" />, label: 'Health Records', value: stats?.health_records ?? 0, color: 'bg-rose-50' },
        { icon: <AlertTriangle className="h-5 w-5 text-amber-600" />, label: 'Open Incidents', value: stats?.open_incidents ?? 0, color: 'bg-amber-50' },
        { icon: <ShieldAlert className="h-5 w-5 text-orange-600" />, label: 'Total Incidents', value: stats?.total_incidents ?? 0, color: 'bg-orange-50' },
        { icon: <FileText className="h-5 w-5 text-blue-600" />, label: 'Docs Issued', value: stats?.documents_issued ?? 0, color: 'bg-blue-50' },
        { icon: <ArrowRightLeft className="h-5 w-5 text-violet-600" />, label: 'Transfer Certs', value: stats?.transfer_certificates ?? 0, color: 'bg-violet-50' },
    ];

    const maxIncident = Math.max(1, ...(stats?.incident_by_type ?? []).map(i => i.count));

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {statCards.map((c, i) => (
                    <Card key={i} className="border-slate-200 shadow-sm">
                        <CardContent className="p-4">
                            <div className={`h-10 w-10 rounded-xl ${c.color} flex items-center justify-center mb-3`}>{c.icon}</div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{c.label}</p>
                            <p className="text-2xl font-black text-slate-900">{c.value}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-bold text-slate-700">Incidents by Type</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {(stats?.incident_by_type ?? []).length === 0
                            ? <p className="text-xs text-slate-400 text-center py-6">No incidents recorded.</p>
                            : (stats?.incident_by_type ?? []).map(item => (
                                <div key={item.incident_type} className="space-y-1">
                                    <div className="flex justify-between text-xs font-bold">
                                        <span className="text-slate-600">{INCIDENT_TYPE_LABELS[item.incident_type] ?? item.incident_type}</span>
                                        <span className="text-slate-800">{item.count}</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-amber-400 rounded-full" style={{ width: `${(item.count / maxIncident) * 100}%` }} />
                                    </div>
                                </div>
                            ))
                        }
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-bold text-slate-700">Incident Severity</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center gap-8 py-8">
                        {(stats?.incident_by_severity ?? []).length === 0
                            ? <p className="text-xs text-slate-400">No data.</p>
                            : (stats?.incident_by_severity ?? []).map(item => (
                                <div key={item.severity} className="text-center">
                                    <div className={`h-16 w-16 rounded-2xl ${SEVERITY_COLOR[item.severity] ?? 'bg-slate-200'} flex items-center justify-center mx-auto`}>
                                        <span className="text-2xl font-black text-white">{item.count}</span>
                                    </div>
                                    <p className="text-xs font-bold text-slate-600 mt-2 capitalize">{item.severity}</p>
                                </div>
                            ))
                        }
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
