// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HROverview } from './HROverview';
import { EmployeeList } from './EmployeeList';
import { LeaveManager } from './LeaveManager';
import { PayrollManager } from './PayrollManager';
import { AppraisalManager } from './AppraisalManager';
import {
    LayoutDashboard, Users, CalendarClock, Wallet, Building2, Award
} from 'lucide-react';

export default function HRDashboardPage() {
    const [_activeTab, setActiveTab] = useState('overview');

    return (
        <div className="container mx-auto py-8 space-y-8 max-w-7xl px-4 md:px-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 pb-6">
                <div>
                    <div className="flex items-center gap-2 text-violet-600 font-bold mb-1">
                        <Building2 className="h-4 w-4" />
                        <span className="text-[10px] uppercase tracking-[0.2em]">Human Resources v1.0</span>
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">HR & Payroll</h1>
                    <p className="text-slate-500 font-medium">
                        Manage employees, leaves, attendance, and monthly payroll
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="overview" className="space-y-6" onValueChange={setActiveTab}>
                <TabsList className="bg-slate-100 p-1 rounded-2xl border border-slate-200/60 overflow-x-auto h-auto">
                    <TabsTrigger
                        value="overview"
                        className="rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-violet-700 data-[state=active]:shadow-md transition-all"
                    >
                        <LayoutDashboard className="h-3.5 w-3.5 mr-2" /> Overview
                    </TabsTrigger>
                    <TabsTrigger
                        value="employees"
                        className="rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-violet-700 data-[state=active]:shadow-md transition-all"
                    >
                        <Users className="h-3.5 w-3.5 mr-2" /> Employees
                    </TabsTrigger>
                    <TabsTrigger
                        value="leaves"
                        className="rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-violet-700 data-[state=active]:shadow-md transition-all"
                    >
                        <CalendarClock className="h-3.5 w-3.5 mr-2" /> Leave Requests
                    </TabsTrigger>
                    <TabsTrigger
                        value="payroll"
                        className="rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-violet-700 data-[state=active]:shadow-md transition-all"
                    >
                        <Wallet className="h-3.5 w-3.5 mr-2" /> Payroll
                    </TabsTrigger>
                    <TabsTrigger
                        value="appraisals"
                        className="rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-violet-700 data-[state=active]:shadow-md transition-all"
                    >
                        <Award className="h-3.5 w-3.5 mr-2" /> Appraisal
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="animate-in fade-in slide-in-from-bottom-2 duration-400">
                    <HROverview />
                </TabsContent>
                <TabsContent value="employees" className="animate-in fade-in slide-in-from-bottom-2 duration-400">
                    <EmployeeList />
                </TabsContent>
                <TabsContent value="leaves" className="animate-in fade-in slide-in-from-bottom-2 duration-400">
                    <LeaveManager />
                </TabsContent>
                <TabsContent value="payroll" className="animate-in fade-in slide-in-from-bottom-2 duration-400">
                    <PayrollManager />
                </TabsContent>
                <TabsContent value="appraisals" className="animate-in fade-in slide-in-from-bottom-2 duration-400">
                    <AppraisalManager />
                </TabsContent>
            </Tabs>
        </div>
    );
}
