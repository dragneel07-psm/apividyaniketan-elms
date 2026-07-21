// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Building, Users, CreditCard, Activity, Loader2, RefreshCcw, Eye, EyeOff, Key, ShieldAlert, ShieldCheck, Save, Download, Upload, Copy, Trash2 } from "lucide-react";
import { coreAPI, getApiBaseUrl, Invoice, saasApi, Subscription, SubscriptionPlan, SubscriptionPlanHistory, Tenant } from "@/lib/api";
import { DeleteTenantDialog } from "@/components/saas/delete-tenant-dialog";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";

type TenantDetails = Tenant & {
    id?: string | number;
    tenant_id?: string;
    schema_name?: string;
    student_count?: number;
    teacher_count?: number;
    plan_name?: string;
    billing_cycle?: string;
    subscription_status?: string;
    ai_usage?: string;
};

const DEFAULT_FEATURE_FLAGS: Record<string, boolean> = {
    student_ai_chatbot: false,
    student_gamification: false,
    parent_attendance: false,
    parent_fees: false,
    teacher_ai_grading: false,
    teacher_reports: false,
    projects: true,
};

function getTenantIdentifier(tenantValue: unknown): string {
    if (!tenantValue) return '';
    if (typeof tenantValue === 'string' || typeof tenantValue === 'number') {
        return String(tenantValue);
    }
    if (typeof tenantValue === 'object') {
        const maybeTenant = tenantValue as Record<string, unknown>;
        return String(maybeTenant.id ?? maybeTenant.tenant_id ?? '');
    }
    return '';
}

function belongsToSchool(tenantValue: unknown, school: TenantDetails): boolean {
    const tenantRef = getTenantIdentifier(tenantValue);
    if (!tenantRef) return false;
    const schoolRefs = [school.id, school.tenant_id].filter(Boolean).map(String);
    return schoolRefs.includes(tenantRef);
}

const numberFmt = new Intl.NumberFormat('en-US');

export default function SchoolDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const schoolId = useMemo(() => {
        const raw = params.id;
        if (!raw) return '';
        return Array.isArray(raw) ? raw[0] : String(raw);
    }, [params.id]);

    const [school, setSchool] = useState<TenantDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [isUpdatingTenantStatus, setIsUpdatingTenantStatus] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isSavingFeatures, setIsSavingFeatures] = useState(false);
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);
    const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);

    const [settingsForm, setSettingsForm] = useState({
        name: '',
        subdomain: '',
        contact_email: '',
        contact_phone: '',
        website: '',
        address: '',
        type: 'standard',
        status: 'active'
    });
    const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>(DEFAULT_FEATURE_FLAGS);

    const [adminSharePassword, setAdminSharePassword] = useState('');
    const [tenantAdminEmail, setTenantAdminEmail] = useState('');
    const [showSharePassword, setShowSharePassword] = useState(false);
    const [isResettingAdminPassword, setIsResettingAdminPassword] = useState(false);

    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [invoicesLoading, setInvoicesLoading] = useState(false);
    const [planHistory, setPlanHistory] = useState<SubscriptionPlanHistory[]>([]);
    const [planHistoryLoading, setPlanHistoryLoading] = useState(false);
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([]);
    const [subscriptionLoading, setSubscriptionLoading] = useState(false);
    const [selectedPlanId, setSelectedPlanId] = useState('');
    const [selectedBillingCycle, setSelectedBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
    const [isUpdatingSubscription, setIsUpdatingSubscription] = useState(false);

    const loadInvoices = useCallback(async (tenant: TenantDetails) => {
        setInvoicesLoading(true);
        try {
            const allInvoices = await saasApi.getInvoices();
            const invoiceRows = Array.isArray(allInvoices) ? allInvoices : [];
            const scopedInvoices = invoiceRows
                .filter(inv => belongsToSchool(inv.tenant, tenant))
                .sort((a, b) => new Date(b.issued_date).getTime() - new Date(a.issued_date).getTime());
            setInvoices(scopedInvoices);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load tenant invoices.");
            setInvoices([]);
        } finally {
            setInvoicesLoading(false);
        }
    }, []);

    const loadPlanHistory = useCallback(async (tenant: TenantDetails) => {
        setPlanHistoryLoading(true);
        try {
            const tenantId = String(tenant.id ?? tenant.tenant_id ?? '');
            if (!tenantId) {
                setPlanHistory([]);
                return;
            }
            const history = await saasApi.getSubscriptionHistoryByTenant(tenantId);
            setPlanHistory(Array.isArray(history) ? history : []);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load plan history.");
            setPlanHistory([]);
        } finally {
            setPlanHistoryLoading(false);
        }
    }, []);

    const loadSubscriptionContext = useCallback(async (tenant: TenantDetails) => {
        setSubscriptionLoading(true);
        try {
            const tenantId = String(tenant.id ?? tenant.tenant_id ?? '');
            if (!tenantId) {
                setSubscription(null);
                setAvailablePlans([]);
                setSelectedPlanId('');
                return;
            }

            const [plans, subscriptions] = await Promise.all([
                saasApi.getPlans(),
                saasApi.getSubscriptions(),
            ]);

            const safePlans = Array.isArray(plans) ? plans : [];
            const safeSubscriptions = Array.isArray(subscriptions) ? subscriptions : [];
            const matchedSubscription = safeSubscriptions.find((sub) => {
                const subTenantId = String((sub as { tenant?: string | number }).tenant ?? '');
                return subTenantId === tenantId;
            }) || null;

            const currentPlanId = String(matchedSubscription?.plan ?? '');
            const visiblePlans = safePlans.filter((plan) => {
                const planId = String(plan.plan_id || plan.id || '');
                if (!planId) return false;
                if (plan.is_active) return true;
                return currentPlanId !== '' && planId === currentPlanId;
            });

            setAvailablePlans(visiblePlans);
            setSubscription(matchedSubscription);

            if (matchedSubscription) {
                setSelectedPlanId(currentPlanId);
                const cycle = (matchedSubscription.billing_cycle || 'monthly').toLowerCase();
                setSelectedBillingCycle(cycle === 'yearly' ? 'yearly' : 'monthly');
            } else {
                const fallbackPlanId = String(visiblePlans[0]?.plan_id || visiblePlans[0]?.id || '');
                setSelectedPlanId(fallbackPlanId);
                setSelectedBillingCycle('monthly');
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to load subscription plans.");
            setSubscription(null);
            setAvailablePlans([]);
        } finally {
            setSubscriptionLoading(false);
        }
    }, []);

    const loadSchoolAndUsers = useCallback(async (id: string) => {
        setIsLoading(true);
        try {
            const tenant = await saasApi.getTenant(id) as TenantDetails;
            setSchool(tenant);
            setTenantAdminEmail('');
            setSettingsForm({
                name: tenant.name || '',
                subdomain: tenant.subdomain || '',
                contact_email: tenant.contact_email || '',
                contact_phone: tenant.contact_phone || '',
                website: tenant.website || '',
                address: tenant.address || '',
                type: tenant.type || 'standard',
                status: tenant.status || 'active'
            });
            setFeatureFlags({
                ...DEFAULT_FEATURE_FLAGS,
                ...(tenant.features || {})
            });

            await Promise.all([
                loadInvoices(tenant),
                loadPlanHistory(tenant),
                loadSubscriptionContext(tenant),
            ]);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load school details.");
        } finally {
            setIsLoading(false);
        }
    }, [loadInvoices, loadPlanHistory, loadSubscriptionContext]);

    useEffect(() => {
        if (schoolId) {
            loadSchoolAndUsers(schoolId);
        }
    }, [schoolId, loadSchoolAndUsers]);

    const handleRefreshInvoices = async () => {
        if (!school) return;
        await loadInvoices(school);
    };

    const handleRefreshPlanHistory = async () => {
        if (!school) return;
        await loadPlanHistory(school);
    };

    const handleRefreshSubscriptionContext = async () => {
        if (!school) return;
        await loadSubscriptionContext(school);
    };

    const generateTemporaryPassword = () => {
        const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*";
        const length = 14;
        const randomValues = new Uint32Array(length);
        crypto.getRandomValues(randomValues);
        let password = '';
        for (let i = 0; i < length; i += 1) {
            password += alphabet[randomValues[i] % alphabet.length];
        }
        return password;
    };

    const copyText = async (label: string, value: string) => {
        if (!value) {
            toast.error(`No ${label.toLowerCase()} to copy.`);
            return;
        }
        try {
            await navigator.clipboard.writeText(value);
            toast.success(`${label} copied.`);
        } catch (error) {
            console.error(error);
            toast.error(`Failed to copy ${label.toLowerCase()}.`);
        }
    };

    const handleGenerateAdminSharePassword = async () => {
        if (!school) return;
        const tenantId = String(school.id ?? school.tenant_id ?? '');
        if (!tenantId) {
            toast.error("Missing tenant identifier.");
            return;
        }
        const temporaryPassword = generateTemporaryPassword();
        setIsResettingAdminPassword(true);
        try {
            const result = await saasApi.resetAdminPassword(tenantId, temporaryPassword);
            setAdminSharePassword(temporaryPassword);
            setShowSharePassword(true);
            if (result.admin_email) {
                setTenantAdminEmail(result.admin_email);
            }
            toast.success(`Temporary password set for ${result.admin_email || 'tenant admin'}.`);
        } catch (error) {
            console.error(error);
            toast.error("Failed to generate temporary admin password.");
        } finally {
            setIsResettingAdminPassword(false);
        }
    };

    const handleDownloadInvoice = async (invoice: Invoice) => {
        try {
            const apiBase = getApiBaseUrl();
            const url = `${apiBase}/billing/saas/invoices/${invoice.invoice_id}/download/`;
            await toast.promise(
                saasApi.helpers.downloadFile(url, `invoice_${invoice.invoice_id.slice(0, 8)}.pdf`),
                {
                    loading: 'Preparing invoice...',
                    success: 'Invoice downloaded successfully.',
                    error: 'Failed to download invoice.'
                }
            );
        } catch (error) {
            console.error(error);
            toast.error("Failed to download invoice.");
        }
    };

    const handleApplyPlanChange = async () => {
        if (!school) return;
        const tenantId = String(school.id ?? school.tenant_id ?? '');
        if (!tenantId) return;
        if (!selectedPlanId) {
            toast.error("Please select a subscription plan.");
            return;
        }

        setIsUpdatingSubscription(true);
        try {
            const payload = {
                plan: selectedPlanId,
                billing_cycle: selectedBillingCycle,
            };

            if (subscription?.subscription_id) {
                await saasApi.updateSubscription(subscription.subscription_id, payload);
            } else {
                await saasApi.createSubscription({
                    tenant: tenantId,
                    plan: selectedPlanId,
                    billing_cycle: selectedBillingCycle,
                    status: 'active',
                });
            }

            const selectedPlan = availablePlans.find(
                (plan) => String(plan.plan_id || plan.id || '') === selectedPlanId
            );
            setSchool((prev) => prev ? ({
                ...prev,
                plan_name: selectedPlan?.name || prev.plan_name,
                billing_cycle: selectedBillingCycle,
                subscription_status: 'active',
            }) : prev);

            toast.success("Subscription plan updated successfully.");
            await loadSchoolAndUsers(schoolId);
        } catch (error) {
            console.error(error);
            toast.error("Failed to update subscription plan.");
        } finally {
            setIsUpdatingSubscription(false);
        }
    };

    const handleSaveSettings = async () => {
        if (!school) return;
        setIsSavingSettings(true);
        try {
            const targetId = String(school.id ?? schoolId);
            const updated = await saasApi.updateTenant(targetId, {
                name: settingsForm.name,
                subdomain: settingsForm.subdomain,
                contact_email: settingsForm.contact_email || undefined,
                contact_phone: settingsForm.contact_phone || undefined,
                website: settingsForm.website || undefined,
                address: settingsForm.address || undefined,
                type: settingsForm.type,
                status: settingsForm.status
            });
            setSchool(prev => ({ ...(prev || {}), ...updated }));
            toast.success("Tenant settings saved.");
        } catch (error) {
            console.error(error);
            toast.error("Failed to save tenant settings.");
        } finally {
            setIsSavingSettings(false);
        }
    };

    const handleToggleFeatureOverride = async (key: string, nextValue: boolean) => {
        if (!school) return;
        const targetId = String(school.id ?? schoolId);
        const currentOverrides = (school.feature_overrides || {}) as Record<string, boolean>;
        const planBaseline = (school.plan_features || {}) as Record<string, boolean>;
        const planValue = planBaseline[key];
        // Optimistically reflect the new value in the UI.
        setFeatureFlags(prev => ({ ...prev, [key]: nextValue }));
        // If the new value matches the plan baseline, drop the override entry
        // entirely — keeps feature_overrides minimal.
        const nextOverrides: Record<string, boolean> = { ...currentOverrides };
        if (planValue !== undefined && planValue === nextValue) {
            delete nextOverrides[key];
        } else {
            nextOverrides[key] = nextValue;
        }
        try {
            const updated = await coreAPI.updateTenant(targetId, { feature_overrides: nextOverrides });
            setSchool(prev => (prev ? { ...prev, ...updated } : prev));
            setFeatureFlags(prev => ({ ...prev, ...((updated.features as Record<string, boolean>) || {}) }));
            toast.success(`${key.replace(/_/g, ' ')} ${nextValue ? 'enabled' : 'disabled'} for this school.`);
        } catch (error) {
            console.error(error);
            // Revert optimistic update.
            setFeatureFlags(prev => ({ ...prev, [key]: !nextValue }));
            toast.error("Failed to update feature override.");
        }
    };

    const handleSaveFeatures = async () => {
        toast.info("Toggles save automatically. Use the switches above to enable or disable a feature for this school.");
    };

    const handleUploadLogo = async () => {
        if (!school || !selectedLogoFile) return;
        setIsUploadingLogo(true);
        try {
            const formData = new FormData();
            formData.append('logo', selectedLogoFile);
            const targetId = String(school.id ?? schoolId);
            const updated = await coreAPI.uploadTenantLogo(targetId, formData);
            setSchool(prev => (prev ? { ...prev, ...updated } : prev));
            setSelectedLogoFile(null);
            toast.success("School logo updated.");
        } catch (error) {
            console.error(error);
            toast.error("Failed to upload logo.");
        } finally {
            setIsUploadingLogo(false);
        }
    };

    const handleToggleTenantStatus = async () => {
        if (!school) return;
        const isActive = school.status === 'active';
        setIsUpdatingTenantStatus(true);
        try {
            const targetId = String(school.id ?? schoolId);
            const updated = await saasApi.updateTenant(targetId, {
                status: isActive ? 'suspended' : 'active'
            });
            const updatedStatus = updated.status || (isActive ? 'suspended' : 'active');
            setSchool(prev => (prev ? { ...prev, ...updated, status: updatedStatus } : prev));
            setSettingsForm(prev => ({ ...prev, status: updatedStatus }));
            toast.success(`Tenant ${isActive ? 'suspended' : 'activated'}.`);
        } catch (error) {
            console.error(error);
            toast.error("Failed to update tenant status.");
        } finally {
            setIsUpdatingTenantStatus(false);
        }
    };

    const studentCount = school?.student_count ?? 0;
    const teacherCount = school?.teacher_count ?? 0;
    const adminCount = school?.admin_count ?? 0;
    const totalUsers = Math.max(school?.total_users ?? 0, studentCount + teacherCount + adminCount);
    const aiTokensUsed = school?.ai_tokens_used ?? 0;
    const aiTokenLimit = school?.ai_token_limit ?? 0;
    const aiUsagePercent = useMemo(() => {
        if (typeof school?.ai_usage === 'string' && school.ai_usage.trim().endsWith('%')) {
            const parsed = parseFloat(school.ai_usage.replace('%', '').trim());
            if (!Number.isNaN(parsed)) return parsed;
        }
        if (aiTokenLimit <= 0) return 0;
        return (aiTokensUsed / aiTokenLimit) * 100;
    }, [school?.ai_usage, aiTokenLimit, aiTokensUsed]);

    const storageUsedMb = school?.storage_used_mb
        ?? ((school?.storage_used_bytes ?? 0) / (1024 * 1024));
    const storageLimitGb = school?.storage_limit_gb ?? 0;
    const storageUsagePercent = school?.storage_usage_percent
        ?? (storageLimitGb > 0 ? (storageUsedMb / (storageLimitGb * 1024)) * 100 : 0);
    const tenantIdentifier = String(school?.id ?? school?.tenant_id ?? schoolId);
    const schoolDomain = school?.domain
        || school?.website
        || (school?.subdomain ? `${school.subdomain}` : 'Not configured');
    const schoolCode = (school?.subdomain || school?.schema_name || '').trim();
    const adminLoginEmail = tenantAdminEmail.trim();

    const paidInvoices = invoices.filter(inv => inv.status === 'paid');
    const pendingInvoices = invoices.filter(inv => inv.status === 'pending');
    const failedInvoices = invoices.filter(inv => inv.status === 'failed');
    const paidRevenue = paidInvoices.reduce((sum, inv) => sum + parseFloat(inv.amount || '0'), 0);
    const pendingRevenue = pendingInvoices.reduce((sum, inv) => sum + parseFloat(inv.amount || '0'), 0);

    const nextInvoiceDate = useMemo(() => {
        if (invoices.length === 0) return 'Not available';
        const latest = invoices[0];
        if (latest.due_date) return new Date(latest.due_date).toLocaleDateString();

        const source = new Date(latest.issued_date);
        if (Number.isNaN(source.getTime())) return 'Not available';
        const next = new Date(source);
        if ((school?.billing_cycle || '').toLowerCase().includes('year')) {
            next.setFullYear(next.getFullYear() + 1);
        } else {
            next.setMonth(next.getMonth() + 1);
        }
        return next.toLocaleDateString();
    }, [invoices, school?.billing_cycle]);

    const currentPlan = useMemo(() => {
        if (!subscription?.plan) return null;
        const currentPlanId = String(subscription.plan);
        return availablePlans.find(plan => String(plan.plan_id || plan.id || '') === currentPlanId) || null;
    }, [availablePlans, subscription?.plan]);

    const selectedPlan = useMemo(() => {
        if (!selectedPlanId) return null;
        return availablePlans.find(plan => String(plan.plan_id || plan.id || '') === selectedPlanId) || null;
    }, [availablePlans, selectedPlanId]);

    const planChangeLabel = useMemo(() => {
        if (!currentPlan || !selectedPlan) return 'Apply Plan Change';
        const currentMonthly = Number(currentPlan.price_monthly || 0);
        const nextMonthly = Number(selectedPlan.price_monthly || 0);
        if (nextMonthly > currentMonthly) return 'Upgrade Plan';
        if (nextMonthly < currentMonthly) return 'Downgrade Plan';
        return 'Apply Plan Change';
    }, [currentPlan, selectedPlan]);

    const hasPendingPlanChange = useMemo(() => {
        if (!subscription) return Boolean(selectedPlanId);
        const currentPlanId = String(subscription.plan || '');
        const selectedId = String(selectedPlanId || '');
        const currentCycle = (subscription.billing_cycle || 'monthly').toLowerCase();
        return currentPlanId !== selectedId || currentCycle !== selectedBillingCycle;
    }, [subscription, selectedPlanId, selectedBillingCycle]);

    if (isLoading) {
        return <div className="p-8 flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;
    }

    if (!school) {
        return (
            <div className="p-8 text-center space-y-4">
                <h2 className="text-2xl font-bold">School Not Found</h2>
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Schools
                </Button>
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" className="p-0 h-auto hover:bg-transparent" onClick={() => router.back()}>
                            <ArrowLeft className="h-4 w-4 mr-1" />
                        </Button>
                        <h2 className="text-3xl font-bold tracking-tight">{school.name}</h2>
                        <Badge variant={school.status === 'active' ? 'default' : 'secondary'} className="capitalize ml-2">
                            {school.status}
                        </Badge>
                    </div>
                    <p className="text-slate-400 pl-6">
                        {schoolDomain} • ID: <span className="font-mono text-xs">{tenantIdentifier}</span>
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setActiveTab('settings')}>
                        Edit Configuration
                    </Button>
                    <Button variant={school.status === 'active' ? 'destructive' : 'default'} onClick={handleToggleTenantStatus} disabled={isUpdatingTenantStatus}>
                        {isUpdatingTenantStatus && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {school.status === 'active' ? 'Suspend Tenant' : 'Activate Tenant'}
                    </Button>
                    {school.status === 'suspended' && (
                        <Button
                            variant="destructive"
                            onClick={() => setIsDeleteDialogOpen(true)}
                            className="bg-red-700 hover:bg-red-800"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Tenant
                        </Button>
                    )}
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalUsers}</div>
                        <p className="text-xs text-muted-foreground">
                            {studentCount} Students • {teacherCount} Teachers • {adminCount} Admins
                        </p>
                        <Button variant="link" className="h-auto p-0 mt-2 text-xs" onClick={() => setActiveTab('users')}>
                            View user details
                        </Button>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Current Plan</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{school.plan_name || 'Trial (Plan Pending)'}</div>
                        <p className="text-xs text-muted-foreground">
                            {(school.billing_cycle || 'monthly')} cycle • {(school.subscription_status || school.status || 'active')}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                            AI limit: {numberFmt.format(aiTokenLimit)} tokens • Storage limit: {storageLimitGb} GB
                        </p>
                        <Button variant="link" className="h-auto p-0 mt-2 text-xs" onClick={() => setActiveTab('billing')}>
                            Open plan details
                        </Button>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">AI Usage</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{aiUsagePercent.toFixed(1)}%</div>
                        <p className="text-xs text-muted-foreground">
                            {numberFmt.format(aiTokensUsed)} / {numberFmt.format(aiTokenLimit)} tokens
                        </p>
                        <div className="mt-2 h-2 rounded bg-slate-100 overflow-hidden">
                            <div
                                className={`h-full ${aiUsagePercent >= 90 ? 'bg-red-500' : aiUsagePercent >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                style={{ width: `${Math.min(aiUsagePercent, 100)}%` }}
                            />
                        </div>
                        <Button variant="link" className="h-auto p-0 mt-2 text-xs" onClick={() => router.push('/saas/ai')}>
                            Open AI analytics
                        </Button>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Storage</CardTitle>
                        <Building className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{storageUsagePercent.toFixed(2)}%</div>
                        <p className="text-xs text-muted-foreground">
                            {storageUsedMb.toFixed(2)} MB used of {storageLimitGb} GB
                        </p>
                        <div className="mt-2 h-2 rounded bg-slate-100 overflow-hidden">
                            <div
                                className={`h-full ${storageUsagePercent >= 90 ? 'bg-red-500' : storageUsagePercent >= 70 ? 'bg-amber-500' : 'bg-indigo-500'}`}
                                style={{ width: `${Math.min(storageUsagePercent, 100)}%` }}
                            />
                        </div>
                        <p className="text-[11px] text-slate-500 mt-2">
                            Calculated from tenant schema size in PostgreSQL.
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="users">Users</TabsTrigger>
                    <TabsTrigger value="billing">Billing & Plan</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Overview & Activity</CardTitle>
                            <CardDescription>
                                Operational summary for this school tenant.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                            <div className="grid gap-4 md:grid-cols-3">
                                <div className="rounded-md border p-4">
                                    <div className="text-slate-500">Tenant Type</div>
                                    <div className="font-semibold capitalize">{school.type || 'standard'}</div>
                                </div>
                                <div className="rounded-md border p-4">
                                    <div className="text-slate-500">Subscription Status</div>
                                    <div className="font-semibold capitalize">{school.subscription_status || school.status || 'active'}</div>
                                </div>
                                <div className="rounded-md border p-4">
                                    <div className="text-slate-500">Contact Email</div>
                                    <div className="font-semibold">{school.contact_email || 'Not configured'}</div>
                                </div>
                                <div className="rounded-md border p-4">
                                    <div className="text-slate-500">Contact Phone</div>
                                    <div className="font-semibold">{school.contact_phone || 'Not configured'}</div>
                                </div>
                                <div className="rounded-md border p-4">
                                    <div className="text-slate-500">Paid Revenue</div>
                                    <div className="font-semibold">${numberFmt.format(paidRevenue)}</div>
                                </div>
                                <div className="rounded-md border p-4">
                                    <div className="text-slate-500">Pending Revenue</div>
                                    <div className="font-semibold">${numberFmt.format(pendingRevenue)}</div>
                                </div>
                            </div>

                            <div className="rounded-md border p-4 space-y-4">
                                <div>
                                    <div className="font-medium">School Access Credentials</div>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Existing passwords are encrypted and cannot be viewed. Generate a temporary password when you need to share credentials.
                                    </p>
                                </div>
                                <div className="grid gap-3 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label>School Code</Label>
                                        <div className="flex gap-2">
                                            <Input value={schoolCode || 'Not configured'} readOnly />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                onClick={() => copyText('School code', schoolCode)}
                                            >
                                                <Copy className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Admin Login Email</Label>
                                        <div className="flex gap-2">
                                            <Input value={adminLoginEmail || 'Hidden (available after reset)'} readOnly />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                onClick={() => copyText('Admin email', adminLoginEmail)}
                                                disabled={!adminLoginEmail}
                                            >
                                                <Copy className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Temporary Admin Password</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            type={showSharePassword ? 'text' : 'password'}
                                            value={adminSharePassword || 'Generate to view temporary password'}
                                            readOnly
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            onClick={() => setShowSharePassword((prev) => !prev)}
                                            disabled={!adminSharePassword}
                                        >
                                            {showSharePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            onClick={() => copyText('Temporary password', adminSharePassword)}
                                            disabled={!adminSharePassword}
                                        >
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleGenerateAdminSharePassword}
                                        disabled={isResettingAdminPassword}
                                    >
                                        {isResettingAdminPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Key className="mr-2 h-4 w-4" />}
                                        Generate Temporary Password
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => copyText(
                                            'Credentials',
                                            `School Code: ${schoolCode}\nAdmin Email: ${adminLoginEmail || 'tenant-admin'}\nTemporary Password: ${adminSharePassword}`
                                        )}
                                        disabled={!schoolCode || !adminSharePassword}
                                    >
                                        <Copy className="mr-2 h-4 w-4" />
                                        Copy Full Credentials
                                    </Button>
                                </div>
                            </div>

                            <div className="rounded-md border">
                                <div className="border-b px-4 py-3 font-medium">Recent Billing Activity</div>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Invoice</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Amount</TableHead>
                                            <TableHead>Date</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {invoices.slice(0, 5).length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="py-6 text-center text-slate-500">
                                                    No invoice activity found.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            invoices.slice(0, 5).map(inv => (
                                                <TableRow key={inv.invoice_id}>
                                                    <TableCell className="font-mono text-xs">{inv.invoice_id.slice(0, 8)}</TableCell>
                                                    <TableCell className="capitalize">{inv.status}</TableCell>
                                                    <TableCell>${numberFmt.format(parseFloat(inv.amount || '0'))}</TableCell>
                                                    <TableCell>{new Date(inv.issued_date).toLocaleDateString()}</TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="flex flex-wrap justify-end gap-2">
                                <Button variant="outline" onClick={() => setActiveTab('users')}>Manage Users</Button>
                                <Button variant="outline" onClick={() => setActiveTab('billing')}>Open Billing</Button>
                                <Button variant="outline" onClick={() => loadSchoolAndUsers(schoolId)} disabled={isLoading}>
                                    <RefreshCcw className="mr-2 h-4 w-4" /> Refresh Details
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="users">
                    <Card>
                        <CardHeader>
                            <CardTitle>User Management (Restricted)</CardTitle>
                            <CardDescription>
                                SaaS admin can only view tenant user counts and manage tenant admin password.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="rounded-md border p-4">
                                <p className="text-sm text-slate-600">
                                    Direct user listing, create, update, and status changes are disabled from SaaS admin.
                                    School users are managed inside the tenant admin portal.
                                </p>
                            </div>

                            <div className="grid gap-4 md:grid-cols-4">
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{totalUsers}</div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium">Students</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{studentCount}</div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium">Teachers</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{teacherCount}</div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium">Tenant Admins</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{adminCount}</div>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="rounded-md border">
                                <div className="border-b px-4 py-3 font-medium">Tenant AI Token Usage</div>
                                <div className="p-4 space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span>Used</span>
                                        <span className="font-medium">{numberFmt.format(aiTokensUsed)} / {numberFmt.format(aiTokenLimit)} tokens</span>
                                    </div>
                                    <div className="h-2 rounded bg-slate-100 overflow-hidden">
                                        <div
                                            className={`h-full ${aiUsagePercent >= 90 ? 'bg-red-500' : aiUsagePercent >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                            style={{ width: `${Math.min(aiUsagePercent, 100)}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-slate-500">
                                        Current usage: {aiUsagePercent.toFixed(1)}%
                                    </p>
                                </div>
                            </div>

                            <div className="rounded-md border p-4 space-y-4">
                                <div>
                                    <h4 className="font-medium">Tenant Admin Password</h4>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Only tenant admin passwords can be managed from SaaS admin.
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <Label>Tenant Admin Email</Label>
                                    <Input value={adminLoginEmail || 'Hidden (available after reset)'} readOnly />
                                </div>
                                <div className="space-y-2">
                                    <Label>Temporary Admin Password</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            type={showSharePassword ? 'text' : 'password'}
                                            value={adminSharePassword || 'Generate to view temporary password'}
                                            readOnly
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            onClick={() => setShowSharePassword((prev) => !prev)}
                                            disabled={!adminSharePassword}
                                        >
                                            {showSharePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            onClick={() => copyText('Temporary password', adminSharePassword)}
                                            disabled={!adminSharePassword}
                                        >
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleGenerateAdminSharePassword}
                                        disabled={isResettingAdminPassword}
                                    >
                                        {isResettingAdminPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Key className="mr-2 h-4 w-4" />}
                                        Generate Temporary Password
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="billing">
                    <Card>
                        <CardHeader>
                            <CardTitle>Subscription Details</CardTitle>
                            <CardDescription>Plan usage, invoices, and payment status for this school.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="rounded-md border p-4 space-y-4">
                                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <h4 className="font-semibold">Upgrade / Downgrade Plan</h4>
                                        <p className="text-sm text-slate-500">
                                            Change the subscription plan and billing cycle for this school.
                                        </p>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={handleRefreshSubscriptionContext} disabled={subscriptionLoading}>
                                        {subscriptionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                                        Refresh Plans
                                    </Button>
                                </div>

                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label>Subscription Plan</Label>
                                        <Select value={selectedPlanId} onValueChange={setSelectedPlanId} disabled={subscriptionLoading || isUpdatingSubscription}>
                                            <SelectTrigger>
                                                <SelectValue placeholder={subscriptionLoading ? "Loading plans..." : "Select plan"} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availablePlans.length === 0 ? (
                                                    <SelectItem value="none" disabled>No active plans available</SelectItem>
                                                ) : (
                                                    availablePlans.map((plan) => {
                                                        const planValue = String(plan.plan_id || plan.id || '');
                                                        return (
                                                            <SelectItem key={planValue} value={planValue}>
                                                                {plan.name} - ${numberFmt.format(Number(plan.price_monthly || 0))}/mo
                                                            </SelectItem>
                                                        );
                                                    })
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Billing Cycle</Label>
                                        <Select value={selectedBillingCycle} onValueChange={(value) => setSelectedBillingCycle(value as 'monthly' | 'yearly')} disabled={subscriptionLoading || isUpdatingSubscription}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="monthly">Monthly</SelectItem>
                                                <SelectItem value="yearly">Yearly</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="text-xs text-slate-500">
                                    Current: {currentPlan?.name || school.plan_name || 'Trial (Plan Pending)'} • {(subscription?.billing_cycle || school.billing_cycle || 'monthly')}
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <Button onClick={handleApplyPlanChange} disabled={!selectedPlanId || isUpdatingSubscription || !hasPendingPlanChange}>
                                        {isUpdatingSubscription ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        {planChangeLabel}
                                    </Button>
                                    <Button variant="outline" onClick={handleRefreshPlanHistory} disabled={planHistoryLoading}>
                                        {planHistoryLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                                        Refresh History
                                    </Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <span className="font-semibold block">Plan:</span> {school.plan_name || 'Trial (Plan Pending)'}
                                </div>
                                <div>
                                    <span className="font-semibold block">Status:</span> {school.subscription_status || school.status}
                                </div>
                                <div>
                                    <span className="font-semibold block">Billing Cycle:</span> {school.billing_cycle || 'monthly'}
                                </div>
                                <div>
                                    <span className="font-semibold block">Next Invoice:</span> {nextInvoiceDate}
                                </div>
                                <div>
                                    <span className="font-semibold block">AI Usage:</span> {numberFmt.format(aiTokensUsed)} / {numberFmt.format(aiTokenLimit)} tokens
                                </div>
                                <div>
                                    <span className="font-semibold block">Storage Usage:</span> {storageUsedMb.toFixed(2)} MB / {storageLimitGb} GB
                                </div>
                                <div>
                                    <span className="font-semibold block">Paid Revenue:</span> ${numberFmt.format(paidRevenue)}
                                </div>
                                <div>
                                    <span className="font-semibold block">Pending Revenue:</span> ${numberFmt.format(pendingRevenue)}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setActiveTab('settings')}>
                                    Edit Billing Settings
                                </Button>
                                <Button variant="outline" onClick={handleRefreshInvoices} disabled={invoicesLoading}>
                                    {invoicesLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                                    Refresh Invoices
                                </Button>
                                <Button variant={school.status === 'active' ? 'destructive' : 'default'} onClick={handleToggleTenantStatus} disabled={isUpdatingTenantStatus}>
                                    {isUpdatingTenantStatus ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    {school.status === 'active' ? 'Suspend Subscription' : 'Reactivate Subscription'}
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                <div className="rounded-md border p-4">
                                    <div className="text-slate-500 text-sm">Paid Invoices</div>
                                    <div className="text-xl font-semibold">{paidInvoices.length}</div>
                                </div>
                                <div className="rounded-md border p-4">
                                    <div className="text-slate-500 text-sm">Pending Invoices</div>
                                    <div className="text-xl font-semibold">{pendingInvoices.length}</div>
                                </div>
                                <div className="rounded-md border p-4">
                                    <div className="text-slate-500 text-sm">Failed Invoices</div>
                                    <div className="text-xl font-semibold">{failedInvoices.length}</div>
                                </div>
                            </div>

                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Invoice</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Amount</TableHead>
                                            <TableHead>Issued</TableHead>
                                            <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {invoicesLoading ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="py-8 text-center">
                                                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-slate-400" />
                                                </TableCell>
                                            </TableRow>
                                        ) : invoices.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="py-8 text-center text-slate-500">
                                                    No invoices found for this school.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            invoices.map(inv => (
                                                <TableRow key={inv.invoice_id}>
                                                    <TableCell className="font-mono text-xs">{inv.invoice_id.slice(0, 8)}</TableCell>
                                                    <TableCell className="capitalize">{inv.status}</TableCell>
                                                    <TableCell>${numberFmt.format(parseFloat(inv.amount || '0'))}</TableCell>
                                                    <TableCell>{new Date(inv.issued_date).toLocaleDateString()}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Button variant="ghost" size="icon" onClick={() => handleDownloadInvoice(inv)}>
                                                            <Download className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="settings">
                    <Card>
                        <CardHeader>
                            <CardTitle>Tenant Configuration</CardTitle>
                            <CardDescription>Update tenant identity, contact details, and status.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="name">School Name</Label>
                                    <Input
                                        id="name"
                                        value={settingsForm.name}
                                        onChange={(e) => setSettingsForm(prev => ({ ...prev, name: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="subdomain">Subdomain</Label>
                                    <Input
                                        id="subdomain"
                                        value={settingsForm.subdomain}
                                        onChange={(e) => setSettingsForm(prev => ({ ...prev, subdomain: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="contactEmail">Contact Email</Label>
                                    <Input
                                        id="contactEmail"
                                        value={settingsForm.contact_email}
                                        onChange={(e) => setSettingsForm(prev => ({ ...prev, contact_email: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="contactPhone">Contact Phone</Label>
                                    <Input
                                        id="contactPhone"
                                        value={settingsForm.contact_phone}
                                        onChange={(e) => setSettingsForm(prev => ({ ...prev, contact_phone: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="website">Website</Label>
                                    <Input
                                        id="website"
                                        value={settingsForm.website}
                                        onChange={(e) => setSettingsForm(prev => ({ ...prev, website: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Status</Label>
                                    <Select value={settingsForm.status} onValueChange={(value) => setSettingsForm(prev => ({ ...prev, status: value }))}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="active">Active</SelectItem>
                                            <SelectItem value="suspended">Suspended</SelectItem>
                                            <SelectItem value="inactive">Inactive</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Type</Label>
                                    <Select value={settingsForm.type} onValueChange={(value) => setSettingsForm(prev => ({ ...prev, type: value }))}>
                                        <SelectTrigger disabled>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="standard">Standard</SelectItem>
                                            <SelectItem value="premium">Premium</SelectItem>
                                            <SelectItem value="enterprise">Enterprise</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="address">Address</Label>
                                <Input
                                    id="address"
                                    value={settingsForm.address}
                                    onChange={(e) => setSettingsForm(prev => ({ ...prev, address: e.target.value }))}
                                />
                            </div>
                            <p className="text-xs text-slate-500">
                                Tenant type and feature access are automatically enforced from the subscribed plan.
                            </p>
                            <div className="flex justify-end">
                                <Button onClick={handleSaveSettings} disabled={isSavingSettings}>
                                    {isSavingSettings ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                    Save Configuration
                                </Button>
                            </div>

                            <div className="border-t pt-6 space-y-4">
                                <div>
                                    <h4 className="font-semibold">Feature Flags</h4>
                                    <p className="text-sm text-slate-500">
                                        Toggle to override the plan baseline for this school.
                                        An override badge appears next to flags that diverge
                                        from the plan default.
                                    </p>
                                </div>
                                <div className="grid gap-3 md:grid-cols-2">
                                    {Object.entries(featureFlags).map(([key, value]) => {
                                        const overrides = (school?.feature_overrides || {}) as Record<string, boolean>;
                                        const isOverridden = Object.prototype.hasOwnProperty.call(overrides, key);
                                        return (
                                            <div key={key} className="flex items-center justify-between rounded-md border p-3">
                                                <div className="flex items-center gap-2 text-sm">
                                                    <span>{key.replace(/_/g, ' ')}</span>
                                                    {isOverridden && (
                                                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-800">
                                                            override
                                                        </span>
                                                    )}
                                                </div>
                                                <Switch
                                                    checked={value}
                                                    onCheckedChange={(next) => handleToggleFeatureOverride(key, next)}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="border-t pt-6 space-y-4">
                                <div>
                                    <h4 className="font-semibold">Branding</h4>
                                    <p className="text-sm text-slate-500">Upload school logo used across tenant pages.</p>
                                </div>
                                {school.logo ? (
                                    <Image
                                        src={school.logo}
                                        alt="School logo"
                                        width={80}
                                        height={80}
                                        className="h-20 w-20 rounded border object-cover"
                                    />
                                ) : (
                                    <div className="text-sm text-slate-500">No logo uploaded yet.</div>
                                )}
                                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                                    <Input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => setSelectedLogoFile(e.target.files?.[0] || null)}
                                    />
                                    <Button
                                        variant="outline"
                                        onClick={handleUploadLogo}
                                        disabled={!selectedLogoFile || isUploadingLogo}
                                    >
                                        {isUploadingLogo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                        Upload Logo
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <DeleteTenantDialog
                tenant={school}
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
            />
        </div>
    );
}
