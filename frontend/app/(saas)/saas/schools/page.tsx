// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { MoreHorizontal, ArrowUpCircle, AlertCircle, Loader2, Search, ShieldCheck, Globe, RefreshCcw, Trash2 } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { saasApi, Tenant } from "@/lib/api/saas";
import { toast } from "sonner";
import Link from 'next/link';
import { CreateSchoolDialog } from "@/components/saas/create-school-dialog";
import { ManageFeaturesDialog } from "@/components/saas/manage-features-dialog";
import { ResetPasswordDialog } from "@/components/saas/reset-password-dialog";
import { DeleteTenantDialog } from "@/components/saas/delete-tenant-dialog";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Eye, Key } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type TenantSummary = Tenant & {
    id?: string | number;
    tenant_id?: string;
    schema_name?: string;
    plan_name?: string;
    student_count?: number;
    ai_usage?: string;
    billing_cycle?: string;
    subscription_status?: 'active' | 'inactive' | 'suspended' | string;
};

export default function SaasSchoolsPage() {
    const [schools, setSchools] = useState<TenantSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => {
        loadSchools();
    }, []);

    const loadSchools = async () => {
        try {
            const data = await saasApi.getTenants();
            const rows = (Array.isArray(data) ? data : []) as TenantSummary[];
            setSchools(rows.filter((school) => (school.schema_name || '').toLowerCase() !== 'public'));
        } catch (error) {
            console.error(error);
            toast.error("Failed to load schools.");
        } finally {
            setIsLoading(false);
        }
    };

    const filteredSchools = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return schools.filter((school) => {
            const status = (school.status || school.subscription_status || '').toLowerCase();
            if (statusFilter !== 'all' && status !== statusFilter) return false;
            if (!query) return true;
            const haystack = [
                school.name,
                school.subdomain,
                school.schema_name,
                school.plan_name,
                school.website,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            return haystack.includes(query);
        });
    }, [schools, searchQuery, statusFilter]);

    if (isLoading) {
        return (
            <div className="h-full flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
                <p className="text-slate-500 dark:text-slate-400 font-mono text-sm animate-pulse">Scanning Tenant Network...</p>
            </div>
        );
    }

    return (
        <div className="p-8 lg:p-10 space-y-8 min-h-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">School Management</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Manage and monitor all onboarded education tenants.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={loadSchools} disabled={isLoading}>
                        <RefreshCcw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <CreateSchoolDialog onCreated={loadSchools} />
                </div>
            </div>

            <Card className="bg-white dark:bg-[#111114] border-slate-200 dark:border-white/10 shadow-xl dark:shadow-none backdrop-blur-3xl overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-white/10 flex flex-col sm:flex-row gap-4 justify-between items-center">
                    <div className="relative w-full sm:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Search by school name, domain or code..."
                            className="pl-10 bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 focus:ring-indigo-500 dark:focus:ring-indigo-500/20"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[170px]">
                                <SelectValue placeholder="Filter status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="trial">Trial</SelectItem>
                                <SelectItem value="suspended">Suspended</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                            </SelectContent>
                        </Select>
                        <Badge variant="secondary" className="h-9 px-4 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20">
                            Total: {filteredSchools.length}
                        </Badge>
                    </div>
                </div>

                <div className="relative overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent border-slate-200 dark:border-white/5">
                                <TableHead className="text-slate-500 dark:text-slate-400 uppercase text-xs font-bold tracking-wider pl-6">School Details</TableHead>
                                <TableHead className="text-slate-500 dark:text-slate-400 uppercase text-xs font-bold tracking-wider">Plan & Usage</TableHead>
                                <TableHead className="text-slate-500 dark:text-slate-400 uppercase text-xs font-bold tracking-wider">Statistics</TableHead>
                                <TableHead className="text-slate-500 dark:text-slate-400 uppercase text-xs font-bold tracking-wider">Status</TableHead>
                                <TableHead className="text-right text-slate-500 dark:text-slate-400 uppercase text-xs font-bold tracking-wider pr-6">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredSchools.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-16 text-slate-400">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                                                <Search className="w-6 h-6 text-slate-400" />
                                            </div>
                                            <p>No schools found matching your search.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredSchools.map((school, index) => (
                                    <SchoolTableRow
                                        key={school.id || school.schema_name || index}
                                        school={school}
                                        index={index}
                                        onUpdated={loadSchools}
                                    />
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>
        </div >
    );
}

function SchoolTableRow({ school, index, onUpdated }: { school: TenantSummary, index: number, onUpdated: () => Promise<void> | void }) {
    const [isManageFeaturesOpen, setIsManageFeaturesOpen] = useState(false);
    const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    const schoolId = String(school.id || school.tenant_id || '');
    const normalizedStatus = (school.status || school.subscription_status || 'trial').toLowerCase();
    const isSuspended = normalizedStatus === 'suspended' || normalizedStatus === 'inactive';
    const usagePercent = Number.parseFloat((school.ai_usage || '0').toString().replace('%', '')) || 0;

    const displayDomain = (() => {
        if (school.website) {
            try {
                return new URL(school.website).host;
            } catch {
                return school.website.replace(/^https?:\/\//, '');
            }
        }
        return school.subdomain || school.schema_name || 'unknown';
    })();

    const handleToggleStatus = async () => {
        if (!schoolId) return;
        setIsUpdatingStatus(true);
        const nextStatus = isSuspended ? 'active' : 'suspended';
        try {
            await saasApi.updateTenant(schoolId, { status: nextStatus });
            toast.success(`School ${nextStatus === 'active' ? 'activated' : 'suspended'} successfully.`);
            await onUpdated();
        } catch (error: unknown) {
            console.error(error);
            const message = error instanceof Error ? error.message : 'Failed to update school status.';
            toast.error(message);
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    // Using Lucide react icons imported above
    return (
        <>
            <motion.tr
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors"
            >
                <TableCell className="pl-6 py-4">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-500/20">
                            {school.name.charAt(0)}
                        </div>
                        <Link href={`/saas/schools/${schoolId}`} className="block">
                            <div className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex items-center gap-2">
                                {school.name}
                                <Search className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <Globe className="w-3 h-3 text-slate-400" />
                                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tracking-tight hover:underline flex items-center gap-1">
                                    {displayDomain}
                                </span>
                            </div>
                        </Link>
                    </div>
                </TableCell>
                <TableCell className="py-4">
                    <div className="space-y-2">
                        <Badge variant="outline" className="border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10">
                            {school.plan_name || 'Trial (Plan Pending)'}
                        </Badge>
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full ${usagePercent > 90 ? 'bg-red-500' : 'bg-emerald-500'}`}
                                    style={{ width: `${Math.max(0, Math.min(100, usagePercent))}%` }}
                                ></div>
                            </div>
                            <span>{school.ai_usage || `${usagePercent.toFixed(1)}%`} AI Load</span>
                        </div>
                    </div>
                </TableCell>
                <TableCell className="py-4">
                    <div className="text-sm">
                        <div className="font-semibold text-slate-900 dark:text-white">{school.student_count || 0} Students</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Billing: {school.billing_cycle || 'Monthly'}</div>
                    </div>
                </TableCell>
                <TableCell className="py-4">
                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        normalizedStatus === 'active'
                            ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400'
                            : normalizedStatus === 'trial'
                                ? 'bg-indigo-100 dark:bg-indigo-500/10 text-indigo-800 dark:text-indigo-300'
                                : 'bg-red-100 dark:bg-red-500/10 text-red-800 dark:text-red-400'
                    }`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-2 ${normalizedStatus === 'active' ? 'bg-emerald-500' : normalizedStatus === 'trial' ? 'bg-indigo-500' : 'bg-red-500'} animate-pulse`}></span>
                        {(school.status || school.subscription_status || 'trial').toUpperCase()}
                    </div>
                </TableCell>
                <TableCell className="text-right pr-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                        <Link href={`/saas/schools/${schoolId}`}>
                            <Button variant="ghost" size="sm" className="h-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-500/10">
                                <Search className="w-4 h-4 mr-2" />
                                View
                            </Button>
                        </Link>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900 dark:hover:text-white">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel>Manage Tenant</DropdownMenuLabel>
                                <Link href={`/saas/schools/${schoolId}`}>
                                    <DropdownMenuItem>
                                        <Eye className="mr-2 h-4 w-4 text-slate-500" /> View Full Information
                                    </DropdownMenuItem>
                                </Link>
                                <DropdownMenuItem onSelect={() => setIsResetPasswordOpen(true)}>
                                    <Key className="mr-2 h-4 w-4 text-amber-500" /> Reset Admin Password
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={() => setIsManageFeaturesOpen(true)}>
                                    <ShieldCheck className="mr-2 h-4 w-4 text-indigo-500" /> Manage Features
                                </DropdownMenuItem>
                                <Link href={`/saas/schools/${schoolId}`}>
                                    <DropdownMenuItem>
                                        <ArrowUpCircle className="mr-2 h-4 w-4 text-emerald-500" /> Open Billing & Plan
                                    </DropdownMenuItem>
                                </Link>
                                <DropdownMenuItem disabled={isUpdatingStatus || !schoolId} onSelect={(event) => { event.preventDefault(); void handleToggleStatus(); }}>
                                    <AlertCircle className="mr-2 h-4 w-4" />
                                    {isSuspended ? 'Activate Account' : 'Suspend Account'}
                                </DropdownMenuItem>
                                {isSuspended && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            onSelect={() => setIsDeleteOpen(true)}
                                            className="text-red-600 dark:text-red-400 focus:bg-red-50 dark:focus:bg-red-500/10 focus:text-red-700"
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Delete Tenant
                                        </DropdownMenuItem>
                                    </>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem disabled className="text-slate-500">
                                    <ArrowUpCircle className="mr-2 h-4 w-4 text-emerald-500" /> Upgrade Plan
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </TableCell>
            </motion.tr>

            <ManageFeaturesDialog
                tenant={school}
                open={isManageFeaturesOpen}
                onOpenChange={setIsManageFeaturesOpen}
                onUpdated={onUpdated}
            />
            <ResetPasswordDialog
                tenant={school}
                open={isResetPasswordOpen}
                onOpenChange={setIsResetPasswordOpen}
            />
            <DeleteTenantDialog
                tenant={school}
                open={isDeleteOpen}
                onOpenChange={setIsDeleteOpen}
                onDeleted={onUpdated}
            />
        </>
    );
}
