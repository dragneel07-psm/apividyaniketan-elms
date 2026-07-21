// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCcw, Search } from 'lucide-react';
import { coreAPI, AuditLog } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

function getLogTimestamp(log: AuditLog): string {
    return log.timestamp || log.created_at || '';
}

function getLogActor(log: AuditLog): string {
    return log.user || log.actor || 'System';
}

function summarizeDetails(log: AuditLog): string {
    const details = log.details || log.metadata || {};
    if (!details || typeof details !== 'object' || Object.keys(details).length === 0) {
        return '-';
    }
    const sampleEntries = Object.entries(details).slice(0, 3);
    return sampleEntries.map(([key, value]) => `${key}: ${String(value)}`).join(' | ');
}

export default function SaasAuditPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [search, setSearch] = useState('');
    const [actionFilter, setActionFilter] = useState('all');

    const loadAuditLogs = async (refresh = false) => {
        try {
            if (refresh) setIsRefreshing(true);
            else setIsLoading(true);
            const data = await coreAPI.getAuditLogs();
            setLogs(
                [...(data || [])].sort((a, b) => {
                    const aTime = new Date(getLogTimestamp(a)).getTime() || 0;
                    const bTime = new Date(getLogTimestamp(b)).getTime() || 0;
                    return bTime - aTime;
                })
            );
        } catch (error) {
            console.error(error);
            toast.error('Failed to load audit logs.');
            setLogs([]);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        loadAuditLogs();
    }, []);

    const actionTypes = useMemo(() => {
        const values = new Set<string>();
        logs.forEach((log) => {
            if (log.action) values.add(log.action);
        });
        return Array.from(values).sort();
    }, [logs]);

    const filteredLogs = useMemo(() => {
        const query = search.trim().toLowerCase();
        return logs.filter((log) => {
            if (actionFilter !== 'all' && log.action !== actionFilter) return false;
            if (!query) return true;

            const haystack = [
                log.action,
                getLogActor(log),
                summarizeDetails(log),
                log.ip_address || '',
            ]
                .join(' ')
                .toLowerCase();

            return haystack.includes(query);
        });
    }, [logs, search, actionFilter]);

    return (
        <div className="p-8 space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Audit Log</h2>
                    <p className="text-slate-500 mt-1">Live system activity feed for SaaS administration.</p>
                </div>
                <Button variant="outline" onClick={() => loadAuditLogs(true)} disabled={isLoading || isRefreshing}>
                    <RefreshCcw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            <Card>
                <CardHeader className="space-y-4">
                    <CardTitle>System Activities</CardTitle>
                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search action, actor, details, or IP..."
                                className="pl-10"
                            />
                        </div>
                        <Select value={actionFilter} onValueChange={setActionFilter}>
                            <SelectTrigger className="w-full md:w-[240px]">
                                <SelectValue placeholder="Filter by action" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Actions</SelectItem>
                                {actionTypes.map((action) => (
                                    <SelectItem key={action} value={action}>
                                        {action}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Badge variant="secondary" className="self-start md:self-center">
                            {filteredLogs.length} logs
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="py-16 flex justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Action Type</TableHead>
                                    <TableHead>Admin User</TableHead>
                                    <TableHead>Date & Time</TableHead>
                                    <TableHead>IP</TableHead>
                                    <TableHead>Description</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredLogs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-12 text-slate-500">
                                            No audit records found for current filters.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredLogs.map((log) => (
                                        <TableRow key={String(log.id)}>
                                            <TableCell className="font-mono text-xs">{log.action}</TableCell>
                                            <TableCell>{getLogActor(log)}</TableCell>
                                            <TableCell>
                                                {getLogTimestamp(log) ? new Date(getLogTimestamp(log)).toLocaleString() : '-'}
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">{log.ip_address || '-'}</TableCell>
                                            <TableCell className="max-w-[360px] truncate" title={summarizeDetails(log)}>
                                                {summarizeDetails(log)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
