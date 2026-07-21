// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api, getApiBaseUrl } from '@/lib/api';
import { toast } from 'sonner';
import { Loader2, Database, Download, Save, RefreshCw } from 'lucide-react';

interface BackupFile {
    filename: string;
    created_at: string;
    size_mb: number;
}

export default function BackupsPage() {
    const [backups, setBackups] = useState<BackupFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [downloadingFile, setDownloadingFile] = useState<string | null>(null);

    useEffect(() => {
        loadBackups();
    }, []);

    const loadBackups = async () => {
        setLoading(true);
        try {
            const data = await api.backups.list();
            setBackups(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load backups');
            setBackups([]);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateBackup = async () => {
        setCreating(true);
        try {
            await api.backups.create();
            toast.success('Backup created successfully');
            await loadBackups();
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : 'Failed to create backup');
        } finally {
            setCreating(false);
        }
    };

    const handleDownload = async (filename: string) => {
        setDownloadingFile(filename);
        try {
            const tenantId = localStorage.getItem('tenant_id') || 'demo';
            const baseUrl = getApiBaseUrl();
            // Auth rides on the httpOnly session cookie; the same-origin /api
            // proxy attaches the Authorization header server-side.
            const response = await fetch(
                `${baseUrl}/core/backups/download/${encodeURIComponent(filename)}/`,
                {
                    method: 'GET',
                    headers: {
                        'x-tenant-id': tenantId,
                    },
                }
            );
            if (!response.ok) {
                throw new Error(`Failed to download backup (${response.status})`);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.success('Backup download started');
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : 'Failed to download backup');
        } finally {
            setDownloadingFile(null);
        }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Database Backups</h1>
                    <p className="text-slate-500">Manage and download tenant database backups.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={loadBackups}>
                        <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                    </Button>
                    <Button onClick={handleCreateBackup} disabled={creating} className="bg-emerald-600 hover:bg-emerald-700">
                        {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Create Backup
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Database className="h-5 w-5 text-indigo-500" />
                        Available Backups
                    </CardTitle>
                    <CardDescription>
                        Backups are stored locally on the server.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Filename</TableHead>
                                <TableHead>Created At</TableHead>
                                <TableHead>Size (MB)</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        <Loader2 className="animate-spin h-6 w-6 mx-auto text-slate-400" />
                                    </TableCell>
                                </TableRow>
                            ) : backups.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center text-slate-500">
                                        No backups found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                backups.map((backup) => (
                                    <TableRow key={backup.filename}>
                                        <TableCell className="font-medium font-mono text-sm">{backup.filename}</TableCell>
                                        <TableCell>{new Date(backup.created_at).toLocaleString()}</TableCell>
                                        <TableCell>{backup.size_mb} MB</TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDownload(backup.filename)}
                                                disabled={downloadingFile === backup.filename}
                                                title="Download backup"
                                            >
                                                {downloadingFile === backup.filename ? (
                                                    <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                                                ) : (
                                                    <Download className="h-4 w-4 text-slate-700" />
                                                )}
                                            </Button>
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
