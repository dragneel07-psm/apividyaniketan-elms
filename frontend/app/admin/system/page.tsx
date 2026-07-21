// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Server, Shield, Database, Activity, ArrowLeft, Terminal
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, } from 'recharts';
import { SafeResponsiveContainer } from '@/components/ui/safe-responsive-container';
import Link from 'next/link'; // Ensure Link is imported
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { coreAPI, usersAPI, AuditLog } from '@/lib/api';
import { toast } from 'sonner';

export default function SystemAdminDashboard() {
    const [features, setFeatures] = useState({
        aiTutor: false,
        autoGrading: false,
        maintenanceMode: false,
        betaFeatures: false
    });
    const [latencyHistory, setLatencyHistory] = useState<Array<{ time: string; load: number }>>([]);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [auditLoading, setAuditLoading] = useState(true);

    // Real-time System Stats
    const [systemStats, setSystemStats] = useState({
        status: 'Checking...',
        latency: '--',
        storage: { total: '--', used: '--', percent: 0 }
    });

    const fetchSystemStats = useCallback(async () => {
        try {
            const data = await coreAPI.getSystemStatus();
            setSystemStats(data);
            const numericLatency = Number.parseInt(String(data.latency || '').replace(/[^\d]/g, ''), 10);
            const point = {
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                load: Number.isFinite(numericLatency) ? numericLatency : 0,
            };
            setLatencyHistory((prev) => {
                const next = [...prev, point];
                return next.slice(-24);
            });
        } catch (error) {
            console.error('Failed to fetch system stats:', error);
            setSystemStats(prev => ({ ...prev, status: 'Offline' }));
        }
    }, []);

    useEffect(() => {
        fetchSystemStats();
        const interval = setInterval(fetchSystemStats, 5000);
        return () => clearInterval(interval);
    }, [fetchSystemStats]);

    useEffect(() => {
        async function loadFeatureState() {
            try {
                const me = await usersAPI.getMe();
                const tenantFeatures = me?.tenant_features || {};
                setFeatures((prev) => ({
                    ...prev,
                    aiTutor: tenantFeatures.student_ai_chatbot !== false,
                    autoGrading: tenantFeatures.teacher_ai_grading !== false,
                    betaFeatures: tenantFeatures.teacher_reports !== false,
                }));
            } catch (error) {
                console.error('Failed to load feature state:', error);
            }
        }

        async function loadAuditLogs() {
            try {
                setAuditLoading(true);
                const logs = await coreAPI.getAuditLogs();
                setAuditLogs(Array.isArray(logs) ? logs.slice(0, 6) : []);
            } catch (error) {
                console.error('Failed to load audit logs:', error);
                setAuditLogs([]);
            } finally {
                setAuditLoading(false);
            }
        }

        loadFeatureState();
        loadAuditLogs();
    }, []);

    const handleMaintenanceToggle = () => {
        toast.info('Platform maintenance mode is managed from the SaaS admin portal.');
    };

    return (
        <div className="p-6 space-y-8 bg-slate-50 min-h-screen dark:bg-slate-900">
            {/* Header */}
            <header className="flex items-center gap-4 border-b pb-6">
                <Link href="/admin">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">System Administration</h1>
                    <p className="text-slate-500 text-sm">Monitor system health, logs, and global configurations.</p>
                </div>
            </header>

            {/* Health Overview */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card className={`border-t-4 ${systemStats.status === 'Operational' ? 'border-t-emerald-500' : 'border-t-red-500'}`}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">System Status</CardTitle>
                        <Activity className={`h-4 w-4 ${systemStats.status === 'Operational' ? 'text-emerald-500' : 'text-red-500'}`} />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${systemStats.status === 'Operational' ? 'text-emerald-600' : 'text-red-600'}`}>
                            {systemStats.status}
                        </div>
                        <p className="text-xs text-muted-foreground">Real-time check</p>
                    </CardContent>
                </Card>
                <Card className="border-t-4 border-t-blue-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">API Latency</CardTitle>
                        <Server className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{systemStats.latency}</div>
                        <p className="text-xs text-muted-foreground">Response time from live status checks</p>
                    </CardContent>
                </Card>
                <Card className="border-t-4 border-t-purple-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Storage</CardTitle>
                        <Database className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{systemStats.storage.used}</div>
                        <p className="text-xs text-muted-foreground">of {systemStats.storage.total} Used</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Server Load Chart */}
                <Card className="col-span-2">
                    <CardHeader>
                        <CardTitle>Server Load (24h)</CardTitle>
                        <CardDescription>Latency trend from periodic health checks</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        {latencyHistory.length > 0 ? (
                            <SafeResponsiveContainer width="100%" height="100%">
                                <AreaChart data={latencyHistory}>
                                    <defs>
                                        <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="time" />
                                    <YAxis />
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <Tooltip />
                                    <Area type="monotone" dataKey="load" stroke="#8884d8" fillOpacity={1} fill="url(#colorLoad)" />
                                </AreaChart>
                            </SafeResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-sm text-slate-500 border border-dashed border-slate-200 rounded-lg">
                                Waiting for enough health-check samples...
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Feature Toggles */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Feature Flags</CardTitle>
                            <CardDescription>Global system toggles</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="ai-tutor">AI Tutor Engine</Label>
                                <Switch id="ai-tutor" checked={features.aiTutor} disabled />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label htmlFor="auto-grade">Auto-Grading</Label>
                                <Switch id="auto-grade" checked={features.autoGrading} disabled />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label htmlFor="beta">Beta Features</Label>
                                <Switch id="beta" checked={features.betaFeatures} disabled />
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t">
                                <Label htmlFor="maint" className="text-red-600 font-medium">Maintenance Mode</Label>
                                <Switch
                                    id="maint"
                                    checked={features.maintenanceMode}
                                    onCheckedChange={handleMaintenanceToggle}
                                    disabled
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Feature flags are plan-controlled. Platform maintenance mode is managed only from the SaaS admin portal.
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Quick Links</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Link href="/admin/system/groups">
                                <Button variant="outline" className="w-full justify-start mb-2">
                                    <Shield className="mr-2 h-4 w-4" /> Manage Groups & Permissions
                                </Button>
                            </Link>
                            <Link href="/admin/system/tenants">
                                <Button variant="outline" className="w-full justify-start">
                                    <Server className="mr-2 h-4 w-4" /> Tenant Configurations
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Audit Logs */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Terminal className="h-5 w-5" /> Recent Audit Logs
                        </CardTitle>
                        <Link href="/admin/system/audit-logs">
                            <Button variant="ghost" size="sm" className="text-xs">View All</Button>
                        </Link>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {auditLoading && (
                            <div className="text-sm text-muted-foreground">Loading logs...</div>
                        )}
                        {!auditLoading && auditLogs.length === 0 && (
                            <div className="text-sm text-muted-foreground">No audit logs found.</div>
                        )}
                        {!auditLoading && auditLogs.map((log) => {
                            const when = (log.timestamp || log.created_at);
                            const actor = log.user || log.actor || 'System';
                            const ip = (log as any).ip_address || (log.metadata as any)?.ip_address || 'N/A';
                            const isWarning = String(log.action || '').toLowerCase().includes('fail');
                            return (
                                <div key={String(log.id)} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                                    <div className="flex items-center gap-3">
                                        <div className={`h-2 w-2 rounded-full ${isWarning ? 'bg-red-500' : 'bg-emerald-500'}`} />
                                        <div>
                                            <p className="text-sm font-medium">{log.action}</p>
                                            <p className="text-xs text-muted-foreground">User: {actor} • IP: {ip}</p>
                                        </div>
                                    </div>
                                    <span className="text-xs text-muted-foreground font-mono">{when ? new Date(when).toLocaleString() : '-'}</span>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
