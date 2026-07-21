// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Server, Save, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { coreAPI, Tenant } from '@/lib/api';
import { toast } from 'sonner';

function getTenantId(tenant: Tenant | null): string {
    if (!tenant) return '';
    const idLike = (tenant as any).id ?? tenant.tenant_id;
    return idLike ? String(idLike) : '';
}

export default function TenantConfigPage() {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadTenants();
    }, []);

    const loadTenants = async () => {
        try {
            setLoading(true);
            const data = await coreAPI.getTenants();
            const rows = Array.isArray(data) ? data : [];
            setTenants(rows);
            if (rows.length > 0) {
                setSelectedTenant(rows[0]);
            }
        } catch (error) {
            console.error('Failed to load tenants:', error);
            toast.error('Failed to load tenant settings.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        const tenantId = getTenantId(selectedTenant);
        if (!selectedTenant || !tenantId) return;
        setSaving(true);
        try {
            const updated = await coreAPI.updateTenant(tenantId, {
                name: selectedTenant.name,
                website: selectedTenant.website || undefined,
                subdomain: selectedTenant.subdomain,
            });
            setSelectedTenant((prev) => (prev ? { ...prev, ...updated } : prev));
            setTenants((prev) =>
                prev.map((tenant) => (getTenantId(tenant) === tenantId ? { ...tenant, ...updated } : tenant))
            );
            toast.success('Tenant configuration saved successfully.');
        } catch (error) {
            console.error('Failed to save tenant:', error);
            toast.error('Failed to save tenant configuration.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-6">Loading settings...</div>;

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen dark:bg-slate-900">
            <header className="flex items-center gap-4 border-b pb-6">
                <Link href="/admin/system">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tenant Configurations</h1>
                    <p className="text-slate-500 text-sm">Manage school identity, domains, and global settings.</p>
                </div>
            </header>

            <div className="grid gap-6 md:grid-cols-4">
                {/* Tenant List (Sidebar) */}
                <Card className="col-span-1 border-r h-full">
                    <CardHeader>
                        <CardTitle className="text-sm">My Schools</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {tenants.map((tenant) => (
                            <div
                                key={getTenantId(tenant)}
                                onClick={() => setSelectedTenant(tenant)}
                                className={`p-3 rounded-lg cursor-pointer text-sm font-medium border ${
                                    getTenantId(selectedTenant) === getTenantId(tenant)
                                        ? 'bg-primary/10 border-primary text-primary'
                                        : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                            >
                                {tenant.name}
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Tenant Editor */}
                <Card className="col-span-3">
                    {selectedTenant ? (
                        <>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Server className="h-5 w-5" /> {selectedTenant.name}
                                </CardTitle>
                                <CardDescription>ID: {getTenantId(selectedTenant) || 'N/A'}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 max-w-lg">
                                <div className="space-y-2">
                                    <Label htmlFor="name">School Name</Label>
                                    <Input
                                        id="name"
                                        value={selectedTenant.name}
                                        onChange={(e) => setSelectedTenant({ ...selectedTenant, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="domain">Custom Domain</Label>
                                    <Input
                                        id="domain"
                                        value={selectedTenant.website || ''}
                                        placeholder="e.g. school.edu.np"
                                        onChange={(e) => setSelectedTenant({ ...selectedTenant, website: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="subdomain">Subdomain</Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            id="subdomain"
                                            value={selectedTenant.subdomain || ''}
                                            onChange={(e) => setSelectedTenant({ ...selectedTenant, subdomain: e.target.value })}
                                        />
                                        <span className="text-muted-foreground text-sm">.saas.edu.np</span>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="justify-between border-t pt-6">
                                <span className="text-xs text-muted-foreground">
                                    Last updated: {selectedTenant.updated_at ? new Date(selectedTenant.updated_at).toLocaleDateString() : 'N/A'}
                                </span>
                                <Button onClick={handleSave} disabled={saving}>
                                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                    Save Changes
                                </Button>
                            </CardFooter>
                        </>
                    ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground p-12">
                            Select a school to configure
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}
