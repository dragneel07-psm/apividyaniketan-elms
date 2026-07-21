// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useState } from 'react';
import { SISDashboardOverview } from './SISDashboardOverview';
import { IncidentLog } from './IncidentLog';
import { HealthRecords } from './HealthRecords';
import { DocumentsManager } from './DocumentsManager';
import { StudentLeaveManager } from './StudentLeaveManager';
import { ComplaintManager } from './ComplaintManager';
import { LayoutDashboard, AlertTriangle, Heart, FileText, CalendarClock, MessageSquareWarning, ShieldOff } from 'lucide-react';
import { getUser } from '@/lib/auth';

const TABS = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'incidents', label: 'Incidents', icon: AlertTriangle },
    { id: 'health', label: 'Health', icon: Heart },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'leaves', label: 'Leaves', icon: CalendarClock },
    { id: 'complaints', label: 'Complaints', icon: MessageSquareWarning },
] as const;

type TabId = typeof TABS[number]['id'];

export default function SISPage() {
    const [activeTab, setActiveTab] = useState<TabId>('overview');
    const [authorized, setAuthorized] = useState<boolean | null>(null);

    useEffect(() => {
        // Backend SIS endpoints accept admin / saas_admin and staff users
        // whose staff_role is 'receptionist' (front-desk handles SIS work).
        // Anyone else would 403 on every sub-tab.
        const u = getUser() as { role?: string; staff_role?: string } | null;
        const role = (u?.role || '').toLowerCase();
        const staffRole = (u?.staff_role || '').toLowerCase();
        setAuthorized(
            role === 'admin'
            || role === 'saas_admin'
            || (role === 'staff' && staffRole === 'receptionist')
        );
    }, []);

    if (authorized === false) {
        return (
            <div className="p-6">
                <div className="max-w-md mx-auto mt-16 text-center space-y-4">
                    <div className="mx-auto h-14 w-14 rounded-full bg-amber-100 flex items-center justify-center">
                        <ShieldOff className="h-6 w-6 text-amber-600" />
                    </div>
                    <h1 className="text-xl font-bold text-slate-900">SIS access is admin-only</h1>
                    <p className="text-sm text-slate-500">
                        Student Information System (health records, incidents, documents, leaves, complaints)
                        is restricted to school admins. Ask your admin to grant access or open a different module.
                    </p>
                </div>
            </div>
        );
    }

    if (authorized === null) {
        return <div className="p-6"><div className="animate-pulse h-6 w-48 bg-slate-100 rounded" /></div>;
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-black text-slate-900">Student Information System</h1>
                <p className="text-sm text-slate-500 mt-1">Health records, disciplinary incidents, and official documents</p>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap bg-slate-100 rounded-2xl p-1 gap-1 w-fit">
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                                activeTab === tab.id
                                    ? 'bg-white shadow-sm text-indigo-700'
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <Icon className="h-4 w-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Content */}
            {activeTab === 'overview' && <SISDashboardOverview />}
            {activeTab === 'incidents' && <IncidentLog />}
            {activeTab === 'health' && <HealthRecords />}
            {activeTab === 'documents' && <DocumentsManager />}
            {activeTab === 'leaves' && <StudentLeaveManager />}
            {activeTab === 'complaints' && <ComplaintManager />}
        </div>
    );
}
