// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Activity, CreditCard, School, Users, Server,
    AlertTriangle, Loader2, TrendingUp, Brain,
    ShieldCheck, Globe, Zap, ArrowUpRight, Search, Bell, User
} from 'lucide-react';
import Link from 'next/link';
import { saasApi } from '@/lib/api';
import { toast } from "sonner";
import { motion, AnimatePresence } from 'framer-motion';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, AreaChart, Area,
    BarChart, Bar, Cell
} from 'recharts';
import { SafeResponsiveContainer } from '@/components/ui/safe-responsive-container';
import { Badge } from '@/components/ui/badge';

// Stylized World Map SVG for "Tenant Health"
const WorldMap = () => (
    <svg viewBox="0 0 1000 500" className="w-full h-full opacity-30">
        <path fill="currentColor" d="M150,150 Q200,100 250,150 T350,150" className="text-slate-400" />
        <path fill="currentColor" d="M450,250 Q500,200 550,250 T650,250" className="text-slate-400" />
        <path fill="currentColor" d="M750,150 Q800,100 850,150 T950,150" className="text-slate-400" />
        <path fill="currentColor" d="M200,350 Q250,300 300,350 T400,350" className="text-slate-400" />
        <path fill="currentColor" d="M600,400 Q650,350 700,400 T800,400" className="text-slate-400" />

        {/* Pulsing health dots */}
        <motion.circle cx="200" cy="180" r="6" fill="#10f1b5" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 2 }} />
        <motion.circle cx="350" cy="150" r="8" fill="#10f1b5" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 3, delay: 0.5 }} />
        <motion.circle cx="500" cy="280" r="5" fill="#f1c40f" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 2, delay: 1 }} />
        <motion.circle cx="780" cy="160" r="7" fill="#10f1b5" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 4 }} />
        <motion.circle cx="850" cy="350" r="6" fill="#e74c3c" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5 }} />
        <motion.circle cx="120" cy="300" r="4" fill="#10f1b5" />
    </svg>
);

export default function SaasDashboardPage() {
    const [data, setData] = useState<any>(null);
    const [aiUsage, setAiUsage] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    const [isClient, setIsClient] = useState(false);
    useEffect(() => {
        setIsClient(true);
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            const [kpiRes, aiRes] = await Promise.all([
                saasApi.getKPIs(),
                saasApi.getAIUsage()
            ]);
            setData(kpiRes);
            setAiUsage(aiRes);
        } catch (error: any) {
            console.error("Dashboard Load Error:", error);
            const msg = error.message || "Unknown Error";
            toast.error(`Failed to load platform intelligence: ${msg}`);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading || !data) {
        return (
            <div className="min-h-screen bg-[#0a0a0c] flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
                <p className="text-indigo-400 font-mono text-sm animate-pulse">Initializing Master Control Dashboard...</p>
            </div>
        );
    }

    const {
        kpis = { mrr: 0, total_schools: 0, total_students: 0 },
        revenue_trend = [],
        tenant_activity = [],
        alerts = []
    } = data || {};

    const safeAlerts = Array.isArray(alerts) ? alerts : [];
    const trendRows = Array.isArray(revenue_trend) ? revenue_trend : [];
    const tenantRows = Array.isArray(tenant_activity) ? tenant_activity : [];
    const latestMrr = Number(trendRows[trendRows.length - 1]?.mrr || kpis.mrr || 0);
    const previousMrr = Number(trendRows[trendRows.length - 2]?.mrr || 0);
    const mrrGrowthPct = previousMrr > 0 ? ((latestMrr - previousMrr) / previousMrr) * 100 : 0;
    const healthyTenants = tenantRows.filter((tenant: any) => tenant.status === 'active').length;
    const healthPercent = tenantRows.length > 0 ? Math.round((healthyTenants / tenantRows.length) * 100) : 0;
    const focusTenant = [...tenantRows].sort((a: any, b: any) => Number(a.students || 0) - Number(b.students || 0))[0];
    const activeStudentsBarsRaw = [...tenantRows]
        .sort((a: any, b: any) => Number(b.students || 0) - Number(a.students || 0))
        .slice(0, 11)
        .map((tenant: any) => Number(tenant.students || 0));
    const maxStudentsPerTenant = Math.max(...activeStudentsBarsRaw, 1);
    const activeStudentsBars = activeStudentsBarsRaw.length > 0
        ? activeStudentsBarsRaw.map((count) => Math.max(8, Math.round((count / maxStudentsPerTenant) * 100)))
        : [0];
    const aiAdoptionPercent = aiUsage?.total_tenants
        ? Math.round(((aiUsage?.active_tenants || 0) / aiUsage.total_tenants) * 100)
        : 0;

    return (
        <div className="p-8 lg:p-10 space-y-10 min-h-full">
            {/* KPI Cards */}
            {/* Row 1: MRR Chart & Tenant Health Map */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="lg:col-span-8"
                >
                    <Card className="bg-white dark:bg-[#111114] border-slate-200 dark:border-white/10 shadow-xl dark:shadow-none backdrop-blur-3xl overflow-hidden h-[450px]">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <CardTitle className="text-sm font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-widest">Monthly Recurring Revenue (MRR)</CardTitle>
                                    <Link href="/saas/plans" className="text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors">
                                        <ArrowUpRight className="w-4 h-4" />
                                    </Link>
                                </div>
                                <div className="mt-2 flex items-baseline gap-2">
                                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white">${kpis.mrr.toLocaleString()}</h2>
                                    <span className={`text-xs font-bold ${mrrGrowthPct >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                                        {mrrGrowthPct >= 0 ? '+' : ''}{mrrGrowthPct.toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-300">
                                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" /> Current MRR</div>
                                <div className="flex items-center gap-2 font-mono"><div className="w-2.5 h-2.5 bg-indigo-500 rounded-full" /> Projected MRR</div>
                            </div>
                        </CardHeader>
                        <CardContent className="h-[320px] w-full mt-4">
                            {isClient && Array.isArray(revenue_trend) && revenue_trend.length > 0 ? (
                                <SafeResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={revenue_trend}>
                                        <defs>
                                            <linearGradient id="neonGreen" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10f1b5" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="#10f1b5" stopOpacity={0} />
                                            </linearGradient>
                                            <filter id="glow">
                                                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                                                <feMerge>
                                                    <feMergeNode in="coloredBlur" />
                                                    <feMergeNode in="SourceGraphic" />
                                                </feMerge>
                                            </filter>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} opacity={0.5} />
                                        <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v / 1000}K`} dx={-10} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#111114', border: '1px solid #333', borderRadius: '12px' }}
                                            itemStyle={{ color: '#fff' }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="mrr"
                                            stroke="#10f1b5"
                                            strokeWidth={4}
                                            fill="url(#neonGreen)"
                                            filter="url(#glow)"
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="projected"
                                            stroke="#6366f1"
                                            strokeWidth={2}
                                            strokeDasharray="8 8"
                                            fill="transparent"
                                        />
                                    </AreaChart>
                                </SafeResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-slate-500 text-xs italic">
                                    No revenue data available yet.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="lg:col-span-4"
                >
                    <Card className="bg-white dark:bg-[#111114] border-slate-200 dark:border-white/10 shadow-xl dark:shadow-none backdrop-blur-3xl h-[450px] relative overflow-hidden">
                        <CardHeader>
                            <CardTitle className="text-sm font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-widest">Tenant Health</CardTitle>
                        </CardHeader>
                        <CardContent className="h-full flex flex-col justify-center">
                            <div className="absolute inset-0 p-8 pt-20">
                                <WorldMap />
                            </div>

                            <div className="relative z-10 space-y-4 mt-[160px]">
                                <div className="bg-slate-50 dark:bg-[#1a1a1f] border border-slate-200 dark:border-white/5 p-4 rounded-xl shadow-2xl relative">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Node Focus</span>
                                        <Badge className={`${focusTenant?.status === 'error' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'} border-none text-[9px] px-1.5 py-0`}>
                                            {focusTenant?.status === 'error' ? 'Critical' : 'Watch'}
                                        </Badge>
                                    </div>
                                    <p className="text-xs font-semibold text-slate-900 dark:text-white">
                                        School ID: {focusTenant?.id ? String(focusTenant.id).slice(0, 6) : 'N/A'}
                                    </p>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                                        {focusTenant?.status === 'error'
                                            ? 'Schema connection issue detected.'
                                            : `${Number(focusTenant?.students || 0)} students enrolled.`}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-slate-50 dark:bg-[#1a1a1f] p-3 rounded-lg border border-slate-200 dark:border-white/5 text-center">
                                        <p className="text-[9px] uppercase font-bold text-slate-500 dark:text-slate-400">Active Nodes</p>
                                        <p className="text-lg font-bold text-slate-900 dark:text-white">{kpis.total_schools}</p>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-[#1a1a1f] p-3 rounded-lg border border-slate-200 dark:border-white/5 text-center">
                                        <p className="text-[9px] uppercase font-bold text-slate-500 dark:text-slate-400">Healthy</p>
                                        <p className="text-lg font-bold text-emerald-500 dark:text-emerald-400">{healthPercent}%</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* Row 2: Token Usage, Active Students, Security Alerts */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* AI Token Usage */}
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
                    <Card className="bg-white dark:bg-[#111114] border-slate-200 dark:border-white/10 shadow-lg dark:shadow-none backdrop-blur-2xl relative overflow-hidden p-6 group">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-300 uppercase tracking-widest">AI Tokens Usage</h3>
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 dark:text-indigo-400">
                                <Brain className="w-6 h-6" />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">Total Usage</p>
                                <h4 className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
                                    {((aiUsage?.total_tokens || 0) / 1000000).toFixed(1)}M Tokens
                                </h4>
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.max(0, Math.min(100, aiAdoptionPercent))}%` }}
                                    transition={{ duration: 1.5 }}
                                    className="h-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                                />
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-bold">
                                <span className="text-emerald-500 dark:text-emerald-400 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {aiAdoptionPercent}% AI-active tenants</span>
                                <span className="text-slate-500 dark:text-slate-400 uppercase">Cost: ${Number(aiUsage?.cost_estimate || 0).toFixed(2)}</span>
                            </div>
                        </div>
                    </Card>
                </motion.div>

                {/* Active Students */}
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
                    <Card className="bg-white dark:bg-[#111114] border-slate-200 dark:border-white/10 shadow-lg dark:shadow-none backdrop-blur-2xl relative overflow-hidden p-6 group">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-300 uppercase tracking-widest">Active Students</h3>
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 dark:text-emerald-400">
                                <Users className="w-6 h-6" />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">Currently Active</p>
                                <h4 className="text-2xl font-bold font-mono text-slate-900 dark:text-white">{kpis.total_students.toLocaleString()}</h4>
                            </div>
                            <div className="h-[40px] w-full flex items-end gap-1">
                                {activeStudentsBars.map((h, i) => (
                                    <motion.div key={i} initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ delay: 0.5 + (i * 0.05) }} className="flex-1 bg-emerald-500/20 rounded-t-sm" />
                                ))}
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-bold">
                                <span className="text-emerald-500 dark:text-emerald-400 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {tenantRows.length} tenants tracked</span>
                                <span className="text-slate-500 dark:text-slate-400 uppercase">Top tenant activity</span>
                            </div>
                        </div>
                    </Card>
                </motion.div>

                {/* Security Alerts */}
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}>
                    <Card className="bg-white dark:bg-[#111114] border-slate-200 dark:border-white/10 shadow-lg dark:shadow-none backdrop-blur-2xl relative overflow-hidden p-6 group">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-300 uppercase tracking-widest">Security Alerts</h3>
                            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <h4 className="text-2xl font-bold tracking-tight text-red-500">
                                {safeAlerts.filter((a: any) => a.level === 'critical').length} Critical Alerts
                            </h4>
                            <ul className="space-y-2">
                                {safeAlerts.map((alert: any) => (
                                    <li key={alert.id} className="text-[10px] text-slate-500 dark:text-slate-400 flex flex-col gap-0.5">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-1.5 h-1.5 rounded-full ${alert.level === 'critical' ? 'bg-red-500' :
                                                alert.level === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                                                }`} />
                                            <span className="font-bold text-slate-900 dark:text-slate-200">{alert.title}</span>
                                            <span className="ml-auto text-[8px] opacity-50">{alert.timestamp}</span>
                                        </div>
                                        <p className="pl-3.5 text-slate-500 dark:text-slate-400 leading-tight">{alert.description}</p>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
}
