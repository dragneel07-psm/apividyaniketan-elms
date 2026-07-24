// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
    Users, GraduationCap, School, BookOpen,
    Loader2, TrendingUp, Brain, Server, ClipboardList, KeyRound,
} from 'lucide-react';
import Link from 'next/link';
import { analyticsAPI, saasApi, AnalyticsDashboard, SaasAIUsageResponse, SystemStatus, AdminPasswordResetRequestItem } from '@/lib/api';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { SafeResponsiveContainer } from '@/components/ui/safe-responsive-container';
import { Badge } from '@/components/ui/badge';

export default function SaasDashboardPage() {
    const [dashboard, setDashboard] = useState<AnalyticsDashboard | null>(null);
    const [aiUsage, setAiUsage] = useState<SaasAIUsageResponse | null>(null);
    const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
    const [pendingResets, setPendingResets] = useState<AdminPasswordResetRequestItem[]>([]);
    const [schoolAdmins, setSchoolAdmins] = useState<Array<{ user_id: string; email: string; first_name: string; last_name: string; is_active: boolean }>>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isClient, setIsClient] = useState(false);
    // Unified reset target for both flows: resolving a pending request (has
    // request_id) and directly resetting any admin's password (has user_id).
    const [resetTarget, setResetTarget] = useState<{ mode: 'request' | 'direct'; id: string; email: string } | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [isResolving, setIsResolving] = useState(false);

    useEffect(() => {
        setIsClient(true);
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            const [dashboardRes, aiRes, statusRes, resetsRes, adminsRes] = await Promise.all([
                analyticsAPI.getDashboard({ days: 30 }),
                saasApi.getAIUsage(),
                saasApi.getSystemStatus().catch(() => null),
                saasApi.getPendingPasswordResetRequests().catch(() => []),
                saasApi.getSchoolAdmins().catch(() => []),
            ]);
            setDashboard(dashboardRes);
            setAiUsage(aiRes);
            setSystemStatus(statusRes);
            setPendingResets(resetsRes);
            setSchoolAdmins(adminsRes);
        } catch (error: unknown) {
            console.error('Dashboard Load Error:', error);
            const msg = error instanceof Error ? error.message : 'Unknown Error';
            toast.error(`Failed to load platform overview: ${msg}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleResolveReset = async () => {
        if (!resetTarget || newPassword.length < 8) {
            toast.error('Password must be at least 8 characters.');
            return;
        }
        setIsResolving(true);
        try {
            if (resetTarget.mode === 'request') {
                await saasApi.resolvePasswordResetRequest(resetTarget.id, newPassword);
                setPendingResets((prev) => prev.filter((r) => r.request_id !== resetTarget.id));
            } else {
                await saasApi.directResetAdminPassword(resetTarget.id, newPassword);
                setPendingResets((prev) => prev.filter((r) => r.email !== resetTarget.email));
            }
            toast.success(`Password reset for ${resetTarget.email}.`);
            setResetTarget(null);
            setNewPassword('');
        } catch {
            toast.error('Could not reset the password. Please try again.');
        } finally {
            setIsResolving(false);
        }
    };

    if (isLoading || !dashboard) {
        return (
            <div className="min-h-screen bg-[#0a0a0c] flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
                <p className="text-indigo-400 font-mono text-sm animate-pulse">Loading platform overview...</p>
            </div>
        );
    }

    const { snapshot, attendance_trend = [] } = dashboard;
    const trendRows = Array.isArray(attendance_trend) ? attendance_trend : [];

    return (
        <div className="p-8 lg:p-10 space-y-10 min-h-full">
            {/* School snapshot */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                    { label: 'Students', value: snapshot.students, icon: Users, color: 'text-sky-500 bg-sky-500/10' },
                    { label: 'Teachers', value: snapshot.teachers, icon: GraduationCap, color: 'text-emerald-500 bg-emerald-500/10' },
                    { label: 'Classes', value: snapshot.classes, icon: School, color: 'text-violet-500 bg-violet-500/10' },
                    { label: 'Subjects', value: snapshot.subjects, icon: BookOpen, color: 'text-amber-500 bg-amber-500/10' },
                ].map(({ label, value, icon: Icon, color }, idx) => (
                    <motion.div key={label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                        <Card className="bg-white dark:bg-[#111114] border-slate-200 dark:border-white/10 shadow-lg dark:shadow-none">
                            <CardContent className="p-6 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{label}</p>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{value.toLocaleString()}</p>
                                </div>
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                                    <Icon className="w-5 h-5" />
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {pendingResets.length > 0 && (
                <Card className="bg-white dark:bg-[#111114] border-amber-300 dark:border-amber-500/30 shadow-lg dark:shadow-none">
                    <CardHeader>
                        <CardTitle className="text-sm font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-widest flex items-center gap-2">
                            <KeyRound className="w-4 h-4" /> Pending Password Reset Requests
                        </CardTitle>
                        <CardDescription>School admins who couldn&apos;t log in and asked for help.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {pendingResets.map((req) => (
                            <div key={req.request_id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#1a1a1f] border border-slate-200 dark:border-white/5">
                                <div>
                                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{req.first_name} {req.last_name} ({req.email})</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Requested {new Date(req.requested_at).toLocaleString()}</p>
                                </div>
                                <Button size="sm" onClick={() => { setResetTarget({ mode: 'request', id: req.request_id, email: req.email }); setNewPassword(''); }}>
                                    Reset Password
                                </Button>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {schoolAdmins.length > 0 && (
                <Card className="bg-white dark:bg-[#111114] border-slate-200 dark:border-white/10 shadow-lg dark:shadow-none">
                    <CardHeader>
                        <CardTitle className="text-sm font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2">
                            <KeyRound className="w-4 h-4" /> School Admin Accounts
                        </CardTitle>
                        <CardDescription>Reset a school admin&apos;s password any time — no request needed.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {schoolAdmins.map((admin) => (
                            <div key={admin.user_id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#1a1a1f] border border-slate-200 dark:border-white/5">
                                <div>
                                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{admin.first_name} {admin.last_name} ({admin.email})</p>
                                    {!admin.is_active && <p className="text-xs text-rose-500">Inactive</p>}
                                </div>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => { setResetTarget({ mode: 'direct', id: admin.user_id, email: admin.email }); setNewPassword(''); }}
                                >
                                    Reset Password
                                </Button>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Attendance trend */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-8">
                    <Card className="bg-white dark:bg-[#111114] border-slate-200 dark:border-white/10 shadow-xl dark:shadow-none h-[400px]">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-sm font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-widest">Attendance Rate (30 Days)</CardTitle>
                                <div className="mt-2 flex items-baseline gap-2">
                                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white">{snapshot.overall_attendance_rate}%</h2>
                                    <span className="text-xs font-bold text-slate-400">Pass rate: {snapshot.pass_rate}%</span>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="h-[280px] w-full">
                            {isClient && trendRows.length > 0 ? (
                                <SafeResponsiveContainer width="100%" height="100%">
                                    <LineChart data={trendRows}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} opacity={0.5} />
                                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
                                        <Tooltip contentStyle={{ backgroundColor: '#111114', border: '1px solid #333', borderRadius: '12px' }} itemStyle={{ color: '#fff' }} />
                                        <Line type="monotone" dataKey="rate" stroke="#10f1b5" strokeWidth={3} dot={false} name="Attendance %" />
                                    </LineChart>
                                </SafeResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-slate-500 text-xs italic">
                                    No attendance data available yet.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>

                {/* System status */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-4">
                    <Card className="bg-white dark:bg-[#111114] border-slate-200 dark:border-white/10 shadow-xl dark:shadow-none h-[400px]">
                        <CardHeader>
                            <CardTitle className="text-sm font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-widest">System Status</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-[#1a1a1f] border border-slate-200 dark:border-white/5">
                                <div className="flex items-center gap-2">
                                    <Server className="w-4 h-4 text-slate-400" />
                                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">API</span>
                                </div>
                                <Badge variant={systemStatus?.status === 'ok' ? 'outline' : 'destructive'}>
                                    {systemStatus?.status || 'Unknown'}
                                </Badge>
                            </div>
                            {systemStatus && (
                                <>
                                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
                                        <span>Latency</span>
                                        <span className="font-mono">{systemStatus.latency}</span>
                                    </div>
                                    <div className="space-y-1 px-1">
                                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                                            <span>Storage used</span>
                                            <span className="font-mono">{systemStatus.storage.used} / {systemStatus.storage.total}</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${systemStatus.storage.percent >= 90 ? 'bg-red-500' : systemStatus.storage.percent >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                                style={{ width: `${Math.min(systemStatus.storage.percent, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                </>
                            )}
                            <Link href="/saas/audit" className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-[#1a1a1f] border border-slate-200 dark:border-white/5 hover:border-indigo-400 transition-colors">
                                <div className="flex items-center gap-2">
                                    <ClipboardList className="w-4 h-4 text-slate-400" />
                                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">View Audit Log</span>
                                </div>
                            </Link>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* AI usage snapshot */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
                    <Card className="bg-white dark:bg-[#111114] border-slate-200 dark:border-white/10 shadow-lg dark:shadow-none p-6">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-300 uppercase tracking-widest">AI Tokens Used</h3>
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 dark:text-indigo-400">
                                <Brain className="w-6 h-6" />
                            </div>
                        </div>
                        <h4 className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
                            {(((aiUsage?.total_tokens || 0) / 1000000).toFixed(2))}M Tokens
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                            {aiUsage?.provider.configured ? `Provider: ${aiUsage.provider.name} (configured)` : 'AI provider not configured'}
                        </p>
                    </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
                    <Card className="bg-white dark:bg-[#111114] border-slate-200 dark:border-white/10 shadow-lg dark:shadow-none p-6">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-300 uppercase tracking-widest">AI Cost Estimate</h3>
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 dark:text-emerald-400">
                                <TrendingUp className="w-6 h-6" />
                            </div>
                        </div>
                        <h4 className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
                            ${(aiUsage?.cost_estimate || 0).toFixed(2)}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                            {(aiUsage?.total_requests || 0).toLocaleString()} requests total
                        </p>
                    </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}>
                    <Link href="/saas/ai">
                        <Card className="bg-white dark:bg-[#111114] border-slate-200 dark:border-white/10 shadow-lg dark:shadow-none p-6 h-full hover:border-indigo-400 transition-colors cursor-pointer">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-300 uppercase tracking-widest">AI Usage Details</h3>
                                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                                    <Brain className="w-6 h-6" />
                                </div>
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Feature breakdown, daily trend, and provider configuration &rarr;
                            </p>
                        </Card>
                    </Link>
                </motion.div>
            </div>

            <Dialog open={!!resetTarget} onOpenChange={(open) => { if (!open) setResetTarget(null); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reset Password</DialogTitle>
                        <DialogDescription>
                            Set a new password for {resetTarget?.email}. Share it with them through a secure channel.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                        <Label htmlFor="new-admin-password">New Password</Label>
                        <Input
                            id="new-admin-password"
                            type="text"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Minimum 8 characters"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setResetTarget(null)} disabled={isResolving}>Cancel</Button>
                        <Button onClick={handleResolveReset} disabled={isResolving}>
                            {isResolving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reset Password'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
