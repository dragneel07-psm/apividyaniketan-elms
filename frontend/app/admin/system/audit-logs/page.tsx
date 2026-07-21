// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Search, Terminal } from 'lucide-react';
import Link from 'next/link';
import { coreAPI, AuditLog } from '@/lib/api';

function getLogTimestamp(log: AuditLog): string {
    return log.timestamp || log.created_at || '';
}

function getLogActor(log: AuditLog): string {
    return log.user || log.actor || 'System';
}

function getLogDetails(log: AuditLog): string {
    const payload = log.details || log.metadata || {};
    if (!payload || typeof payload !== 'object') return '-';
    const entries = Object.entries(payload).slice(0, 3);
    if (entries.length === 0) return '-';
    return entries.map(([k, v]) => `${k}: ${String(v)}`).join(' | ');
}

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadLogs();
    }, []);

    const loadLogs = async () => {
        try {
            setLoading(true);
            const data = await coreAPI.getAuditLogs();
            setLogs(data);
        } catch (error) {
            console.error('Failed to load audit logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredLogs = logs.filter(log =>
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getLogActor(log).toLowerCase().includes(searchTerm.toLowerCase()) ||
        JSON.stringify(log.details || log.metadata || {}).toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen dark:bg-slate-900">
            <header className="flex items-center gap-4 border-b pb-6">
                <Link href="/admin/system">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Audit Logs</h1>
                    <p className="text-slate-500 text-sm">Security and comprehensive system event logs.</p>
                </div>
            </header>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Terminal className="h-5 w-5" /> All System Events
                        </CardTitle>
                        <div className="relative w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search logs..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Timestamp</TableHead>
                                <TableHead>Action</TableHead>
                                <TableHead>User</TableHead>
                                <TableHead>IP Address</TableHead>
                                <TableHead>Details</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8">Loading logs...</TableCell>
                                </TableRow>
                            ) : filteredLogs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8">No logs found matching your search.</TableCell>
                                </TableRow>
                            ) : (
                                filteredLogs.map((log) => (
                                    <TableRow key={log.id}>
                                        <TableCell className="font-mono text-xs">
                                            {getLogTimestamp(log) ? new Date(getLogTimestamp(log)).toLocaleString() : '-'}
                                        </TableCell>
                                        <TableCell className="font-medium">{log.action}</TableCell>
                                        <TableCell>{getLogActor(log)}</TableCell>
                                        <TableCell className="font-mono text-xs text-muted-foreground">{(log as any).ip_address || (log.metadata as any)?.ip_address || 'N/A'}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground max-w-md truncate">
                                            {getLogDetails(log)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
