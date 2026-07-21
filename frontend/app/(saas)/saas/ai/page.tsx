// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { saasApi, SaasAIUsageResponse } from '@/lib/api';
import { BrainCircuit, DollarSign, Loader2, Network, Server, Zap } from 'lucide-react';

const numberFmt = new Intl.NumberFormat('en-US');
const dateTimeFmt = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' });

export default function SaasAiUsagePage() {
    const [isLoading, setIsLoading] = useState(true);
    const [aiStats, setAiStats] = useState<SaasAIUsageResponse | null>(null);

    useEffect(() => {
        loadAiStats();
    }, []);

    const loadAiStats = async () => {
        try {
            const data = await saasApi.getAIUsage();
            setAiStats({
                ...data,
                usage_by_feature: Array.isArray(data?.usage_by_feature) ? data.usage_by_feature : [],
                top_tenants: Array.isArray(data?.top_tenants) ? data.top_tenants : [],
                daily_usage_last_7_days: Array.isArray(data?.daily_usage_last_7_days) ? data.daily_usage_last_7_days : [],
                tenant_errors: Array.isArray(data?.tenant_errors) ? data.tenant_errors : [],
            });
        } catch (error: unknown) {
            console.error(error);
            const message = error instanceof Error ? error.message : 'Failed to load AI usage data.';
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="h-full flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
                <p className="text-slate-500 dark:text-slate-400 font-mono text-sm animate-pulse">Analyzing AI usage...</p>
            </div>
        );
    }

    if (!aiStats) {
        return (
            <div className="p-8 lg:p-10 space-y-6 min-h-full">
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">AI Intelligence & Cost</h2>
                <Card>
                    <CardHeader>
                        <CardTitle>Data Unavailable</CardTitle>
                        <CardDescription>Unable to load SaaS AI analytics right now.</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    const usageByFeature = Array.isArray(aiStats.usage_by_feature) ? aiStats.usage_by_feature : [];
    const topTenants = Array.isArray(aiStats.top_tenants) ? aiStats.top_tenants : [];
    const dailyUsageRows = Array.isArray(aiStats.daily_usage_last_7_days) ? aiStats.daily_usage_last_7_days : [];
    const tenantErrors = Array.isArray(aiStats.tenant_errors) ? aiStats.tenant_errors : [];

    return (
        <div className="p-8 lg:p-10 space-y-8 min-h-full">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">AI Intelligence & Cost</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Provider setup, token flow, and tenant-level usage analytics.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs uppercase tracking-wider text-slate-500">Provider</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="text-lg font-semibold flex items-center gap-2">
                                <Network className="w-4 h-4 text-indigo-500" />
                                {aiStats.provider.name}
                            </div>
                            <Badge variant={aiStats.provider.configured ? 'outline' : 'destructive'}>
                                {aiStats.provider.configured ? 'Configured' : 'Not Configured'}
                            </Badge>
                            <p className="text-xs text-slate-500 break-all">{aiStats.provider.base_url}</p>
                            {aiStats.provider.source ? (
                                <p className="text-xs text-slate-500">Source: {aiStats.provider.source === 'saas_settings' ? 'SaaS Settings' : 'Environment'}</p>
                            ) : null}
                            {aiStats.provider.api_key_masked ? (
                                <p className="text-xs text-slate-500">Key: {aiStats.provider.api_key_masked}</p>
                            ) : null}
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs uppercase tracking-wider text-slate-500">Model</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-lg font-semibold flex items-center gap-2">
                                <Server className="w-4 h-4 text-emerald-500" />
                                <span className="break-all">{aiStats.provider.model}</span>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs uppercase tracking-wider text-slate-500">Total Tokens</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold flex items-center gap-2">
                                <BrainCircuit className="w-5 h-5 text-indigo-500" />
                                {numberFmt.format(aiStats.total_tokens)}
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                                Prompt: {numberFmt.format(aiStats.total_prompt_tokens)} | Completion: {numberFmt.format(aiStats.total_completion_tokens)}
                            </p>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs uppercase tracking-wider text-slate-500">Cost & Requests</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold flex items-center gap-2">
                                <DollarSign className="w-5 h-5 text-emerald-500" />
                                ${aiStats.cost_estimate.toFixed(4)}
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                                {numberFmt.format(aiStats.total_requests)} requests | {aiStats.avg_tokens_per_request.toFixed(2)} tok/request
                            </p>
                            <p className="text-xs text-slate-500 mt-1">${aiStats.avg_cost_per_1k_tokens.toFixed(6)} per 1k tokens</p>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Feature Usage Breakdown</CardTitle>
                        <CardDescription>Token and request distribution by AI feature.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="pl-6">Feature</TableHead>
                                    <TableHead>Tokens</TableHead>
                                    <TableHead>Requests</TableHead>
                                    <TableHead>Cost</TableHead>
                                    <TableHead>Share</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {usageByFeature.length === 0 ? (
                                    <TableRow>
                                        <TableCell className="pl-6 text-slate-500" colSpan={5}>No AI usage recorded yet.</TableCell>
                                    </TableRow>
                                ) : (
                                    usageByFeature.map((feature) => (
                                        <TableRow key={feature.feature}>
                                            <TableCell className="pl-6 font-medium">{feature.feature}</TableCell>
                                            <TableCell>{numberFmt.format(feature.tokens)}</TableCell>
                                            <TableCell>{numberFmt.format(feature.requests)}</TableCell>
                                            <TableCell>${feature.cost_estimate.toFixed(4)}</TableCell>
                                            <TableCell>{feature.percentage.toFixed(2)}%</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Top Tenant Consumers</CardTitle>
                        <CardDescription>
                            Active tenants: {aiStats.active_tenants}/{aiStats.total_tenants}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="pl-6">Tenant</TableHead>
                                    <TableHead>Tokens</TableHead>
                                    <TableHead>Requests</TableHead>
                                    <TableHead>Cost</TableHead>
                                    <TableHead>Last Activity</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {topTenants.length === 0 ? (
                                    <TableRow>
                                        <TableCell className="pl-6 text-slate-500" colSpan={5}>No tenant AI usage found.</TableCell>
                                    </TableRow>
                                ) : (
                                    topTenants.map((tenant) => (
                                        <TableRow key={tenant.tenant_id}>
                                            <TableCell className="pl-6 font-medium">{tenant.tenant_name}</TableCell>
                                            <TableCell>{numberFmt.format(tenant.tokens)}</TableCell>
                                            <TableCell>{numberFmt.format(tenant.requests)}</TableCell>
                                            <TableCell>${tenant.cost_estimate.toFixed(4)}</TableCell>
                                            <TableCell>{tenant.last_activity ? dateTimeFmt.format(new Date(tenant.last_activity)) : '-'}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-500" />
                        Last 7 Days Usage Trend
                    </CardTitle>
                    <CardDescription>Daily request volume, token usage, and cost summary.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="pl-6">Date</TableHead>
                                <TableHead>Tokens</TableHead>
                                <TableHead>Requests</TableHead>
                                <TableHead>Cost</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {dailyUsageRows.map((row) => (
                                <TableRow key={row.date}>
                                    <TableCell className="pl-6 font-medium">{row.date}</TableCell>
                                    <TableCell>{numberFmt.format(row.tokens)}</TableCell>
                                    <TableCell>{numberFmt.format(row.requests)}</TableCell>
                                    <TableCell>${row.cost_estimate.toFixed(4)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {tenantErrors.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Tenant Data Warnings</CardTitle>
                        <CardDescription>Some tenant schemas could not be scanned for AI logs.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {tenantErrors.map((item, idx) => (
                            <p key={`${item.tenant_id || 'unknown'}-${idx}`} className="text-sm text-amber-600 dark:text-amber-400">
                                {(item.tenant_name || item.schema_name || 'Unknown tenant')}: {item.error}
                            </p>
                        ))}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
