// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Loader2, ShieldAlert } from 'lucide-react';

interface AuditLog {
    id: number;
    actor_email: string;
    action: string;
    object_repr: string;
    changes: string;
    timestamp: string;
    remote_addr?: string;
}

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadLogs();
    }, []);

    const loadLogs = async () => {
        setLoading(true);
        try {
            // Need to ensure backend `AuditLogSerializer` and viewset `list` logic returns correct format.
            // Assuming `AuditLogViewSet` returns list of logs.
            const data = await api.auditLogs.list();
            const anyData = data as any;
            setLogs(anyData.results || anyData); // handle pagination if any
        } catch (error) {
            console.error(error);
            toast.error('Failed to load security logs');
        } finally {
            setLoading(false);
        }
    };

    const getActionColor = (action: string) => {
        switch (action.toLowerCase()) {
            case 'create': return 'bg-emerald-100 text-emerald-800';
            case 'update': return 'bg-blue-100 text-blue-800';
            case 'delete': return 'bg-red-100 text-red-800';
            default: return 'bg-slate-100 text-slate-800';
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Security Audit Logs</h1>
                <p className="text-slate-500">Track sensitive modifications and system access.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ShieldAlert className="h-5 w-5 text-indigo-500" />
                        Activity Log
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Timestamp</TableHead>
                                <TableHead>User</TableHead>
                                <TableHead>Action</TableHead>
                                <TableHead>Object</TableHead>
                                <TableHead>Changes</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        <Loader2 className="animate-spin h-6 w-6 mx-auto text-slate-400" />
                                    </TableCell>
                                </TableRow>
                            ) : logs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                                        No logs found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                logs.map((log) => (
                                    <TableRow key={log.id}>
                                        <TableCell className="text-xs text-slate-500">
                                            {new Date(log.timestamp).toLocaleString()}
                                        </TableCell>
                                        <TableCell className="font-medium">{log.actor_email || 'System'}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={getActionColor(log.action)}>
                                                {log.action}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm font-mono text-slate-600 truncate max-w-[150px]" title={log.object_repr}>
                                            {log.object_repr}
                                        </TableCell>
                                        <TableCell className="text-xs font-mono text-slate-500 truncate max-w-[200px]" title={log.changes}>
                                            {log.changes}
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
