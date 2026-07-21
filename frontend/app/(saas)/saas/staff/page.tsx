// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { saasStaffApi, SaasStaffMember, SaasStaffRole } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    UserPlus,
    Loader2,
    UserCheck,
    UserX,
    Pencil,
    Search,
    Shield,
    Users,
    CheckCircle2,
    XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

// ── Role metadata ──────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<SaasStaffRole, string> = {
    '':              'General',
    support:         'Customer Support',
    billing:         'Billing',
    schools_manager: 'Schools Manager',
    reports:         'Reports & Analytics',
};

const ROLE_COLORS: Record<SaasStaffRole, string> = {
    '':              'bg-slate-100 text-slate-600',
    support:         'bg-blue-100 text-blue-700',
    billing:         'bg-emerald-100 text-emerald-700',
    schools_manager: 'bg-violet-100 text-violet-700',
    reports:         'bg-amber-100 text-amber-700',
};

const ROLE_OPTIONS: { value: SaasStaffRole; label: string }[] = [
    { value: '',              label: 'General' },
    { value: 'support',         label: 'Customer Support' },
    { value: 'billing',         label: 'Billing' },
    { value: 'schools_manager', label: 'Schools Manager' },
    { value: 'reports',         label: 'Reports & Analytics' },
];

// ── Permissions matrix ─────────────────────────────────────────────────────────

const ROLE_PERMISSIONS: Record<SaasStaffRole, string[]> = {
    '':              ['View dashboard', 'View schools'],
    support:         ['View dashboard', 'View schools', 'Manage tickets', 'Contact tenants'],
    billing:         ['View dashboard', 'View invoices', 'Process payments', 'Manage subscriptions'],
    schools_manager: ['View dashboard', 'Manage schools', 'Onboard tenants', 'Suspend accounts'],
    reports:         ['View dashboard', 'Export reports', 'View analytics', 'View audit logs'],
};

function RoleBadge({ role }: { role: SaasStaffRole }) {
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[role]}`}>
            {ROLE_LABELS[role]}
        </span>
    );
}

// ── Create form state ──────────────────────────────────────────────────────────

type CreateForm = {
    email: string;
    first_name: string;
    last_name: string;
    password: string;
    saas_staff_role: SaasStaffRole;
};

type EditForm = {
    first_name: string;
    last_name: string;
    saas_staff_role: SaasStaffRole;
};

// ── Component ──────────────────────────────────────────────────────────────────

export default function StaffManagementPage() {
    const [staff, setStaff] = useState<SaasStaffMember[]>([]);
    const [loading, setLoading] = useState(true);

    // Dialog state
    const [createOpen, setCreateOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<SaasStaffMember | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Filters
    const [search, setSearch] = useState('');
    const [filterRole, setFilterRole] = useState<SaasStaffRole | 'all'>('all');
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

    // Forms
    const [createForm, setCreateForm] = useState<CreateForm>({
        email: '', first_name: '', last_name: '', password: '', saas_staff_role: '',
    });
    const [editForm, setEditForm] = useState<EditForm>({
        first_name: '', last_name: '', saas_staff_role: '',
    });

    const loadStaff = useCallback(async () => {
        try {
            const data = await saasStaffApi.list();
            setStaff(data);
        } catch {
            toast.error('Failed to load staff members.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadStaff(); }, [loadStaff]);

    // ── Filtered list ─────────────────────────────────────────────────────────

    const filtered = useMemo(() => {
        return staff.filter(m => {
            const q = search.toLowerCase();
            const nameMatch = !q ||
                m.first_name.toLowerCase().includes(q) ||
                m.last_name.toLowerCase().includes(q) ||
                m.email.toLowerCase().includes(q);

            const roleMatch = filterRole === 'all' || m.saas_staff_role === filterRole;
            const statusMatch =
                filterStatus === 'all' ||
                (filterStatus === 'active' && m.is_active) ||
                (filterStatus === 'inactive' && !m.is_active);

            return nameMatch && roleMatch && statusMatch;
        });
    }, [staff, search, filterRole, filterStatus]);

    // ── Stats ────────────────────────────────────────────────────────────────

    const stats = useMemo(() => ({
        total: staff.length,
        active: staff.filter(m => m.is_active).length,
        inactive: staff.filter(m => !m.is_active).length,
    }), [staff]);

    // ── Actions ───────────────────────────────────────────────────────────────

    async function handleCreate() {
        if (!createForm.email || !createForm.first_name || !createForm.last_name || !createForm.password) {
            toast.error('All fields except role are required.');
            return;
        }
        setSubmitting(true);
        try {
            const created = await saasStaffApi.create(createForm);
            setStaff(prev => [created, ...prev]);
            setCreateOpen(false);
            setCreateForm({ email: '', first_name: '', last_name: '', password: '', saas_staff_role: '' });
            toast.success(`Staff account created for ${created.email}`);
        } catch (err: unknown) {
            const e = err as { details?: { email?: string[]; password?: string[] }; message?: string };
            const msg = e?.details?.email?.[0] ?? e?.details?.password?.[0] ?? e?.message ?? 'Failed to create staff.';
            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    }

    function openEdit(member: SaasStaffMember) {
        setEditForm({
            first_name: member.first_name,
            last_name: member.last_name,
            saas_staff_role: member.saas_staff_role,
        });
        setEditTarget(member);
    }

    async function handleEdit() {
        if (!editTarget) return;
        setSubmitting(true);
        try {
            const updated = await saasStaffApi.update(editTarget.user_id, editForm);
            setStaff(prev => prev.map(s => s.user_id === editTarget.user_id ? updated : s));
            setEditTarget(null);
            toast.success(`${updated.first_name} ${updated.last_name} updated.`);
        } catch {
            toast.error('Failed to update staff member.');
        } finally {
            setSubmitting(false);
        }
    }

    async function toggleActive(member: SaasStaffMember) {
        try {
            const updated = await saasStaffApi.update(member.user_id, { is_active: !member.is_active });
            setStaff(prev => prev.map(s => s.user_id === member.user_id ? updated : s));
            toast.success(`${updated.first_name} ${updated.is_active ? 'activated' : 'deactivated'}.`);
        } catch {
            toast.error('Failed to update staff status.');
        }
    }

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">

            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Staff Management</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Manage SaaS portal staff accounts and their access roles.
                    </p>
                </div>
                <Button onClick={() => setCreateOpen(true)} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                    <UserPlus className="h-4 w-4" />
                    Add Staff
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Total Staff', value: stats.total, icon: Users, color: 'text-indigo-600' },
                    { label: 'Active', value: stats.active, icon: CheckCircle2, color: 'text-emerald-600' },
                    { label: 'Inactive', value: stats.inactive, icon: XCircle, color: 'text-slate-400' },
                ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-slate-50 dark:bg-slate-700 ${color}`}>
                            <Icon className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
                            <p className="text-xs text-slate-500">{label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search by name or email…"
                        className="pl-9"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <Select value={filterRole} onValueChange={v => setFilterRole(v as SaasStaffRole | 'all')}>
                    <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filter by role" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        {ROLE_OPTIONS.map(r => (
                            <SelectItem key={r.value} value={r.value || '__general__'}>{r.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={v => setFilterStatus(v as 'all' | 'active' | 'inactive')}>
                    <SelectTrigger className="w-36">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-20 text-slate-400 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <UserPlus className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">{staff.length === 0 ? 'No staff members yet' : 'No results match your filters'}</p>
                    <p className="text-sm mt-1">
                        {staff.length === 0 ? 'Add your first staff member to get started.' : 'Try adjusting the search or filters.'}
                    </p>
                </div>
            ) : (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Member</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Permissions</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Joined</TableHead>
                                <TableHead>Last Login</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.map(member => (
                                <TableRow key={member.user_id} className={!member.is_active ? 'opacity-60' : ''}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                                {(member.first_name?.[0] || '').toUpperCase()}{(member.last_name?.[0] || '').toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900 dark:text-white text-sm">
                                                    {member.first_name} {member.last_name}
                                                </p>
                                                <p className="text-xs text-slate-500">{member.email}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <RoleBadge role={member.saas_staff_role || ''} />
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                                            {ROLE_PERMISSIONS[member.saas_staff_role || ''].map(p => (
                                                <span key={p} className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded">
                                                    {p}
                                                </span>
                                            ))}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            className={member.is_active
                                                ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                                : 'bg-slate-100 text-slate-500'}
                                        >
                                            {member.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-slate-500 text-sm">
                                        {new Date(member.date_joined).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="text-slate-500 text-sm">
                                        {member.last_login ? new Date(member.last_login).toLocaleDateString() : '—'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-slate-400 hover:text-indigo-600"
                                                title="Edit"
                                                onClick={() => openEdit(member)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className={`h-8 w-8 ${member.is_active ? 'text-slate-400 hover:text-amber-600' : 'text-slate-400 hover:text-emerald-600'}`}
                                                title={member.is_active ? 'Deactivate' : 'Activate'}
                                                onClick={() => toggleActive(member)}
                                            >
                                                {member.is_active
                                                    ? <UserX className="h-4 w-4" />
                                                    : <UserCheck className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* ── Create Dialog ── */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <UserPlus className="h-5 w-5 text-indigo-500" />
                            Add Staff Member
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="c_first_name">First Name</Label>
                                <Input
                                    id="c_first_name"
                                    value={createForm.first_name}
                                    onChange={e => setCreateForm(f => ({ ...f, first_name: e.target.value }))}
                                    placeholder="Jane"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="c_last_name">Last Name</Label>
                                <Input
                                    id="c_last_name"
                                    value={createForm.last_name}
                                    onChange={e => setCreateForm(f => ({ ...f, last_name: e.target.value }))}
                                    placeholder="Smith"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="c_email">Email</Label>
                            <Input
                                id="c_email"
                                type="email"
                                value={createForm.email}
                                onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))}
                                placeholder="jane@example.com"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="c_password">Password</Label>
                            <Input
                                id="c_password"
                                type="password"
                                value={createForm.password}
                                onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))}
                                placeholder="Min 8 characters"
                            />
                            <p className="text-xs text-slate-400">Share this securely with the staff member.</p>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Access Role</Label>
                            <Select
                                value={createForm.saas_staff_role || '__general__'}
                                onValueChange={v => setCreateForm(f => ({ ...f, saas_staff_role: (v === '__general__' ? '' : v) as SaasStaffRole }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                    {ROLE_OPTIONS.map(r => (
                                        <SelectItem key={r.value} value={r.value || '__general__'}>
                                            {r.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {/* Permissions preview */}
                            {createForm.saas_staff_role !== undefined && (
                                <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                    <p className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1">
                                        <Shield className="h-3 w-3" /> Permissions
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                        {ROLE_PERMISSIONS[createForm.saas_staff_role].map(p => (
                                            <span key={p} className="text-[10px] bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 px-1.5 py-0.5 rounded">
                                                {p}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                        <Button
                            onClick={handleCreate}
                            disabled={submitting}
                            className="bg-indigo-600 hover:bg-indigo-700"
                        >
                            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Create Account
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Edit Dialog ── */}
            <Dialog open={!!editTarget} onOpenChange={open => { if (!open) setEditTarget(null); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Pencil className="h-5 w-5 text-indigo-500" />
                            Edit Staff Member
                        </DialogTitle>
                    </DialogHeader>
                    {editTarget && (
                        <div className="space-y-4 py-2">
                            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold shrink-0">
                                    {editTarget.first_name?.[0]?.toUpperCase()}{editTarget.last_name?.[0]?.toUpperCase()}
                                </div>
                                <div>
                                    <p className="font-medium text-sm">{editTarget.first_name} {editTarget.last_name}</p>
                                    <p className="text-xs text-slate-500">{editTarget.email}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label>First Name</Label>
                                    <Input
                                        value={editForm.first_name}
                                        onChange={e => setEditForm(f => ({ ...f, first_name: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Last Name</Label>
                                    <Input
                                        value={editForm.last_name}
                                        onChange={e => setEditForm(f => ({ ...f, last_name: e.target.value }))}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Access Role</Label>
                                <Select
                                    value={editForm.saas_staff_role || '__general__'}
                                    onValueChange={v => setEditForm(f => ({ ...f, saas_staff_role: (v === '__general__' ? '' : v) as SaasStaffRole }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ROLE_OPTIONS.map(r => (
                                            <SelectItem key={r.value} value={r.value || '__general__'}>
                                                {r.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                    <p className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1">
                                        <Shield className="h-3 w-3" /> Permissions for this role
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                        {ROLE_PERMISSIONS[editForm.saas_staff_role].map(p => (
                                            <span key={p} className="text-[10px] bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 px-1.5 py-0.5 rounded">
                                                {p}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
                        <Button
                            onClick={handleEdit}
                            disabled={submitting}
                            className="bg-indigo-600 hover:bg-indigo-700"
                        >
                            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
