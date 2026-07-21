// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usersAPI } from '@/lib/api';
import { toast } from 'sonner';
import { Loader2, Save, Globe, Shield, Activity, UserCog, ChevronRight } from 'lucide-react';
import Link from 'next/link';

type SchoolAdminSettings = {
    school_name: string;
    support_email: string;
    default_language: 'en' | 'es' | 'fr';
    allow_registration: boolean;
    maintenance_mode: boolean;
    admin_name: string;
    tenant_schema: string;
};

function formatTenantName(schema: string): string {
    return schema
        .split(/[-_]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ') || 'School';
}

function normalizeLanguage(raw: string | null): SchoolAdminSettings['default_language'] {
    if (raw === 'es' || raw === 'fr') return raw;
    return 'en';
}

export default function SettingsPage() {
    const [settings, setSettings] = useState<SchoolAdminSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        void loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const me = await usersAPI.getMe();
            const cachedTenantName = typeof window !== 'undefined' ? localStorage.getItem('tenant_name') : null;
            const cachedTenantId = typeof window !== 'undefined' ? localStorage.getItem('tenant_id') : null;
            const tenantSchema = (cachedTenantId || me?.tenant || 'school').trim().toLowerCase();
            const adminName = `${me.first_name || ''} ${me.last_name || ''}`.trim() || me.username || 'School Admin';

            setSettings({
                school_name: (cachedTenantName || '').trim() || formatTenantName(tenantSchema),
                support_email: me.email || '',
                default_language: normalizeLanguage(
                    typeof window !== 'undefined' ? localStorage.getItem('school_admin_language') : null
                ),
                allow_registration: false,
                maintenance_mode: false,
                admin_name: adminName,
                tenant_schema: tenantSchema,
            });
        } catch (error) {
            console.error(error);
            toast.error('Failed to load school settings');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            if (typeof window !== 'undefined' && settings) {
                localStorage.setItem('school_admin_language', settings.default_language);
            }
            toast.success('Language preference saved for this browser.');
            toast.info('Platform-wide settings are managed from the SaaS admin portal.');
        } catch (error) {
            console.error(error);
            toast.error('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-600" /></div>;
    if (!settings) return <div className="p-6">Failed to load configuration.</div>;

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">School Settings</h1>
                    <p className="text-slate-500">School-level preferences and access controls for this tenant.</p>
                </div>
                <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Preference
                </Button>
            </div>

            <Tabs defaultValue="general" className="w-full">
                <TabsList className="mb-4">
                    <TabsTrigger value="general" className="gap-2"><Globe className="h-4 w-4" /> General</TabsTrigger>
                    <TabsTrigger value="security" className="gap-2"><Shield className="h-4 w-4" /> Security & Access</TabsTrigger>
                    <TabsTrigger value="staff-access" className="gap-2"><UserCog className="h-4 w-4" /> Staff Access</TabsTrigger>
                    <TabsTrigger value="system" className="gap-2"><Activity className="h-4 w-4" /> System</TabsTrigger>
                </TabsList>

                <TabsContent value="general">
                    <Card className="mb-4 border-indigo-200 bg-indigo-50/40">
                        <CardHeader>
                            <CardTitle className="text-base">School Profile & Billing Identity</CardTitle>
                            <CardDescription>
                                PAN, address, logo, signatories and bill numbering — printed on every receipt and tax invoice.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Link href="/admin/settings/school-profile">
                                <Button>Open School Profile <ChevronRight className="h-4 w-4 ml-1" /></Button>
                            </Link>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>School Profile</CardTitle>
                            <CardDescription>Tenant identity is provisioned centrally and shown here for reference.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>School Name</Label>
                                    <Input
                                        value={settings.school_name}
                                        readOnly
                                        disabled
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Admin Contact Email</Label>
                                    <Input
                                        type="email"
                                        value={settings.support_email}
                                        readOnly
                                        disabled
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Portal Language Preference</Label>
                                    <Select
                                        value={settings.default_language}
                                        onValueChange={v => setSettings({ ...settings, default_language: normalizeLanguage(v) })}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="en">English</SelectItem>
                                            <SelectItem value="es">Spanish</SelectItem>
                                            <SelectItem value="fr">French</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Tenant Schema</Label>
                                    <Input value={settings.tenant_schema} readOnly disabled className="font-mono" />
                                </div>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                                School name, tenant provisioning, and platform branding are managed from the SaaS admin portal.
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="security">
                    <Card>
                        <CardHeader>
                            <CardTitle>Access Control</CardTitle>
                            <CardDescription>These are platform-wide controls and are read-only for school admins.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Allow New Registrations</Label>
                                    <p className="text-sm text-slate-500">
                                        Tenant signup is controlled from the SaaS platform.
                                    </p>
                                </div>
                                <Switch
                                    checked={settings.allow_registration}
                                    disabled
                                />
                            </div>

                            <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50 border-amber-200">
                                <div className="space-y-0.5">
                                    <Label className="text-base text-amber-900">Maintenance Mode</Label>
                                    <p className="text-sm text-amber-700">
                                        Platform maintenance mode is managed by the SaaS administrator.
                                    </p>
                                </div>
                                <Switch
                                    checked={settings.maintenance_mode}
                                    disabled
                                    className="data-[state=checked]:bg-amber-600"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="system">
                    <Card>
                        <CardHeader>
                            <CardTitle>School Admin Context</CardTitle>
                            <CardDescription>Information about the current school administration session.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm text-slate-600">
                            <div>
                                Signed in as <span className="font-semibold text-slate-900">{settings.admin_name}</span>.
                            </div>
                            <div>
                                School operational dashboards are available from the main admin dashboard.
                            </div>
                            <div>
                                Global infrastructure settings are available only from the SaaS admin portal.
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="staff-access">
                    <Card>
                        <CardHeader>
                            <CardTitle>Staff Access Control</CardTitle>
                            <CardDescription>
                                Assign module permissions to staff accounts. School Admins always have full access.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Link href="/admin/settings/staff-access">
                                <Button variant="outline" className="gap-2">
                                    <UserCog className="h-4 w-4" />
                                    Manage Staff Roles
                                    <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
