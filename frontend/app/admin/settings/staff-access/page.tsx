// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
    ArrowLeft,
    Eye,
    EyeOff,
    KeyRound,
    Loader2,
    RefreshCw,
    Search,
    Shield,
    User as UserIcon,
    UserCog,
    UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';

import { usersAPI, User } from '@/lib/api';
import type { StaffRole } from '@/lib/auth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const STAFF_ROLE_OPTIONS: Array<{ value: StaffRole; label: string }> = [
    { value: '', label: 'No sub-role (Dashboard + Calendar only)' },
    { value: 'accountant', label: 'Accountant' },
    { value: 'librarian', label: 'Librarian' },
    { value: 'receptionist', label: 'Receptionist' },
    { value: 'hr_manager', label: 'HR Manager' },
    { value: 'hostel_warden', label: 'Hostel Warden' },
    { value: 'transport_manager', label: 'Transport Manager' },
];

const ROLE_MODULE_SUMMARY: Record<StaffRole, string> = {
    '': 'Dashboard, Calendar',
    accountant: 'Finance, Fee Collection, Inventory, Reports',
    librarian: 'Library, Inventory',
    receptionist: 'Admissions, Classes, SIS, Timetable, Communication',
    hr_manager: 'HR & Payroll, Teachers, Reports, Communication',
    hostel_warden: 'Hostel, Students (view)',
    transport_manager: 'Transport, Students (view)',
};

function roleBadgeClass(staffRole: StaffRole | undefined): string {
    switch (staffRole) {
        case 'accountant':       return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        case 'librarian':        return 'bg-violet-100 text-violet-700 border-violet-200';
        case 'receptionist':     return 'bg-blue-100 text-blue-700 border-blue-200';
        case 'hr_manager':       return 'bg-amber-100 text-amber-700 border-amber-200';
        case 'hostel_warden':    return 'bg-teal-100 text-teal-700 border-teal-200';
        case 'transport_manager':return 'bg-orange-100 text-orange-700 border-orange-200';
        default:                 return 'bg-slate-100 text-slate-600 border-slate-200';
    }
}

type CreateForm = {
    first_name: string;
    last_name: string;
    email: string;
    username: string;
    password: string;
    staff_role: StaffRole;
};

const EMPTY_FORM: CreateForm = {
    first_name: '',
    last_name: '',
    email: '',
    username: '',
    password: '',
    staff_role: '',
};

export default function StaffAccessPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [saving, setSaving] = useState<string | null>(null);

    // Create staff dialog
    const [createOpen, setCreateOpen] = useState(false);
    const [createForm, setCreateForm] = useState<CreateForm>(EMPTY_FORM);
    const [creating, setCreating] = useState(false);

    // View staff details dialog
    const [viewUser, setViewUser] = useState<User | null>(null);

    // Reset password dialog
    const [resetUser, setResetUser] = useState<User | null>(null);
    const [resetPassword, setResetPassword] = useState('');
    const [showResetPassword, setShowResetPassword] = useState(false);
    const [resetting, setResetting] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const all = await usersAPI.getAccounts();
            setUsers(all.filter((u) => u.role === 'staff' || u.role === 'admin'));
        } catch {
            toast.error('Failed to load staff accounts.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleStaffRoleChange = async (userId: string, staffRole: StaffRole) => {
        setSaving(userId);
        try {
            // Trust the backend's response — if the field was silently dropped,
            // the UI will reflect what was actually persisted, not an optimistic guess.
            const updated = await usersAPI.updateAccount(userId, {
                staff_role: staffRole,
            } as Partial<User>);
            setUsers((prev) =>
                prev.map((u) => (u.user_id === userId ? { ...u, ...updated } : u))
            );
            const persisted = (updated.staff_role ?? '') as StaffRole;
            if (persisted !== staffRole) {
                toast.error('Server did not persist the role. Please retry.');
            } else {
                toast.success('Staff role updated.');
            }
        } catch {
            toast.error('Failed to update staff role.');
        } finally {
            setSaving(null);
        }
    };

    const generatePassword = () => {
        const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
        let pwd = '';
        const buf = new Uint32Array(14);
        crypto.getRandomValues(buf);
        for (let i = 0; i < buf.length; i++) pwd += chars[buf[i] % chars.length];
        setResetPassword(pwd);
        setShowResetPassword(true);
    };

    const handleResetPassword = async () => {
        if (!resetUser) return;
        if (!resetPassword || resetPassword.length < 8) {
            toast.error('Password must be at least 8 characters.');
            return;
        }
        setResetting(true);
        try {
            await usersAPI.resetUserPassword(resetUser.user_id, resetPassword);
            toast.success(`Password reset for ${resetUser.email}.`);
            setResetUser(null);
            setResetPassword('');
            setShowResetPassword(false);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to reset password.');
        } finally {
            setResetting(false);
        }
    };

    const openResetPassword = (u: User) => {
        setResetUser(u);
        setResetPassword('');
        setShowResetPassword(false);
    };

    const handleCreateStaff = async () => {
        if (!createForm.first_name.trim() || !createForm.email.trim() || !createForm.password.trim()) {
            toast.error('First name, email and password are required.');
            return;
        }
        setCreating(true);
        try {
            await usersAPI.createAccount({
                first_name: createForm.first_name.trim(),
                last_name: createForm.last_name.trim(),
                email: createForm.email.trim(),
                username: createForm.username.trim() || createForm.email.split('@')[0],
                password: createForm.password,
                role: 'staff',
                staff_role: createForm.staff_role,
            } as Partial<User> & { password: string });
            toast.success('Staff account created.');
            setCreateOpen(false);
            setCreateForm(EMPTY_FORM);
            await load();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to create staff account.');
        } finally {
            setCreating(false);
        }
    };

    const filtered = users.filter((u) => {
        const q = search.toLowerCase();
        return (
            u.first_name.toLowerCase().includes(q) ||
            u.last_name.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q)
        );
    });

    return (
        <div className="p-6 space-y-6 max-w-5xl">
            {/* Header */}
            <header className="flex items-center justify-between border-b pb-6">
                <div className="flex items-center gap-4">
                    <Link href="/admin/settings">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <Shield className="h-6 w-6 text-indigo-600" />
                            Staff Access Control
                        </h1>
                        <p className="text-slate-500 text-sm mt-1">
                            Create staff accounts and assign module-level access roles.
                        </p>
                    </div>
                </div>
                <Button
                    className="bg-indigo-600 hover:bg-indigo-700 gap-2"
                    onClick={() => { setCreateForm(EMPTY_FORM); setCreateOpen(true); }}
                >
                    <UserPlus className="h-4 w-4" />
                    Add Staff User
                </Button>
            </header>

            {/* Role reference */}
            <Card className="border-indigo-100 bg-indigo-50/40">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-indigo-800">Role Access Reference</CardTitle>
                    <CardDescription className="text-indigo-600 text-xs">
                        School Admin always has full access. Assign a sub-role to staff accounts to control which modules they see.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                        {STAFF_ROLE_OPTIONS.filter((o) => o.value !== '').map((opt) => (
                            <div
                                key={opt.value}
                                className="flex flex-col gap-0.5 rounded-lg border border-indigo-100 bg-white p-3"
                            >
                                <Badge className={`w-fit text-[10px] font-bold px-2 py-0.5 ${roleBadgeClass(opt.value)}`}>
                                    {opt.label}
                                </Badge>
                                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                                    {ROLE_MODULE_SUMMARY[opt.value]}
                                </p>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Staff table */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <UserCog className="h-5 w-5 text-slate-500" />
                        Staff &amp; Admin Accounts
                        <Badge variant="secondary" className="ml-2">{users.length}</Badge>
                    </CardTitle>
                    <div className="relative max-w-xs mt-2">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                            className="pl-9"
                            placeholder="Search by name or email…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Account Role</TableHead>
                                <TableHead>Staff Sub-Role</TableHead>
                                <TableHead>Module Access</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-10">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
                                    </TableCell>
                                </TableRow>
                            ) : filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-10 text-slate-400">
                                        No staff accounts found. Use "Add Staff User" to create one.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filtered.map((u) => {
                                    const isAdmin = u.role === 'admin';
                                    const staffRole = (u.staff_role ?? '') as StaffRole;

                                    return (
                                        <TableRow key={u.user_id}>
                                            <TableCell className="font-medium">
                                                {u.first_name} {u.last_name}
                                            </TableCell>
                                            <TableCell className="text-slate-500 text-sm">{u.email}</TableCell>
                                            <TableCell>
                                                {isAdmin ? (
                                                    <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 text-[10px] font-bold">
                                                        School Admin
                                                    </Badge>
                                                ) : (
                                                    <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-[10px] font-bold">
                                                        Staff
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {isAdmin ? (
                                                    <span className="text-xs text-slate-400 italic">Full access — no sub-role needed</span>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <Select
                                                            value={staffRole}
                                                            onValueChange={(val) =>
                                                                handleStaffRoleChange(u.user_id, val as StaffRole)
                                                            }
                                                            disabled={saving === u.user_id}
                                                        >
                                                            <SelectTrigger className="w-44 h-8 text-xs">
                                                                <SelectValue placeholder="Select role…" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {STAFF_ROLE_OPTIONS.map((opt) => (
                                                                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                                                        {opt.label}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        {saving === u.user_id && (
                                                            <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                                                        )}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-xs text-slate-500 max-w-xs">
                                                {isAdmin ? 'All modules' : ROLE_MODULE_SUMMARY[staffRole]}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-slate-500 hover:text-indigo-600"
                                                        title="View staff details"
                                                        onClick={() => setViewUser(u)}
                                                    >
                                                        <UserIcon className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-slate-500 hover:text-amber-600"
                                                        title="Reset password"
                                                        onClick={() => openResetPassword(u)}
                                                    >
                                                        <KeyRound className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Create Staff Dialog */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="sm:max-w-[520px]">
                    <DialogHeader>
                        <DialogTitle>Add Staff User</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>First Name *</Label>
                                <Input
                                    value={createForm.first_name}
                                    onChange={(e) => setCreateForm((p) => ({ ...p, first_name: e.target.value }))}
                                    placeholder="Jane"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Last Name</Label>
                                <Input
                                    value={createForm.last_name}
                                    onChange={(e) => setCreateForm((p) => ({ ...p, last_name: e.target.value }))}
                                    placeholder="Doe"
                                />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label>Email *</Label>
                            <Input
                                type="email"
                                value={createForm.email}
                                onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
                                placeholder="jane@school.com"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Username (optional)</Label>
                                <Input
                                    value={createForm.username}
                                    onChange={(e) => setCreateForm((p) => ({ ...p, username: e.target.value }))}
                                    placeholder="janedoe"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Password *</Label>
                                <Input
                                    type="password"
                                    value={createForm.password}
                                    onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))}
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label>Staff Role</Label>
                            <Select
                                value={createForm.staff_role}
                                onValueChange={(val) => setCreateForm((p) => ({ ...p, staff_role: val as StaffRole }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select role…" />
                                </SelectTrigger>
                                <SelectContent>
                                    {STAFF_ROLE_OPTIONS.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {createForm.staff_role && (
                                <p className="text-xs text-slate-500">
                                    Access: {ROLE_MODULE_SUMMARY[createForm.staff_role]}
                                </p>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreateStaff} disabled={creating} className="bg-indigo-600 hover:bg-indigo-700">
                            {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Staff User
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* View Staff Details Dialog */}
            <Dialog open={!!viewUser} onOpenChange={(open) => !open && setViewUser(null)}>
                <DialogContent className="sm:max-w-[520px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <UserIcon className="h-5 w-5 text-indigo-600" />
                            Staff Details
                        </DialogTitle>
                    </DialogHeader>
                    {viewUser && (
                        <div className="space-y-4 py-2">
                            <div className="flex items-center gap-4 rounded-lg border bg-slate-50 p-4">
                                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 text-xl font-bold">
                                    {(viewUser.first_name?.[0] ?? '?').toUpperCase()}
                                    {(viewUser.last_name?.[0] ?? '').toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <p className="font-semibold text-slate-900 truncate">
                                        {viewUser.first_name} {viewUser.last_name}
                                    </p>
                                    <p className="text-sm text-slate-500 truncate">{viewUser.email}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <DetailRow label="Username" value={viewUser.username || '—'} />
                                <DetailRow
                                    label="Account Status"
                                    value={
                                        <Badge
                                            className={
                                                viewUser.is_active === false
                                                    ? 'bg-rose-100 text-rose-700 border-rose-200 text-[10px] font-bold'
                                                    : 'bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] font-bold'
                                            }
                                        >
                                            {viewUser.is_active === false ? 'Inactive' : 'Active'}
                                        </Badge>
                                    }
                                />
                                <DetailRow
                                    label="Account Role"
                                    value={
                                        <Badge
                                            className={
                                                viewUser.role === 'admin'
                                                    ? 'bg-indigo-100 text-indigo-700 border-indigo-200 text-[10px] font-bold'
                                                    : 'bg-slate-100 text-slate-600 border-slate-200 text-[10px] font-bold'
                                            }
                                        >
                                            {viewUser.role === 'admin' ? 'School Admin' : 'Staff'}
                                        </Badge>
                                    }
                                />
                                <DetailRow
                                    label="Sub-Role"
                                    value={
                                        viewUser.role === 'admin' ? (
                                            <span className="text-xs text-slate-400 italic">Full access</span>
                                        ) : (
                                            <Badge
                                                className={`text-[10px] font-bold ${roleBadgeClass(
                                                    (viewUser.staff_role ?? '') as StaffRole
                                                )}`}
                                            >
                                                {STAFF_ROLE_OPTIONS.find(
                                                    (o) => o.value === (viewUser.staff_role ?? '')
                                                )?.label ?? '—'}
                                            </Badge>
                                        )
                                    }
                                />
                                <div className="col-span-2">
                                    <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">
                                        Module Access
                                    </p>
                                    <p className="text-sm text-slate-700">
                                        {viewUser.role === 'admin'
                                            ? 'All modules'
                                            : ROLE_MODULE_SUMMARY[(viewUser.staff_role ?? '') as StaffRole]}
                                    </p>
                                </div>
                                <DetailRow label="User ID" value={<code className="text-xs">{viewUser.user_id}</code>} />
                                <DetailRow label="Tenant" value={<code className="text-xs">{viewUser.tenant || '—'}</code>} />
                            </div>
                        </div>
                    )}
                    <DialogFooter className="gap-2">
                        {viewUser && viewUser.role !== 'admin' && (
                            <Button
                                variant="outline"
                                onClick={() => {
                                    const u = viewUser;
                                    setViewUser(null);
                                    if (u) openResetPassword(u);
                                }}
                                className="gap-2"
                            >
                                <KeyRound className="h-4 w-4" />
                                Reset Password
                            </Button>
                        )}
                        <Button onClick={() => setViewUser(null)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reset Password Dialog */}
            <Dialog open={!!resetUser} onOpenChange={(open) => !open && !resetting && setResetUser(null)}>
                <DialogContent className="sm:max-w-[460px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <KeyRound className="h-5 w-5 text-amber-600" />
                            Reset Password
                        </DialogTitle>
                    </DialogHeader>
                    {resetUser && (
                        <div className="space-y-4 py-2">
                            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                                Setting a new password for{' '}
                                <strong>
                                    {resetUser.first_name} {resetUser.last_name}
                                </strong>{' '}
                                ({resetUser.email}). The user will be able to sign in with this password
                                immediately. Share it through a secure channel.
                            </div>
                            <div className="grid gap-2">
                                <Label>New Password</Label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Input
                                            type={showResetPassword ? 'text' : 'password'}
                                            value={resetPassword}
                                            onChange={(e) => setResetPassword(e.target.value)}
                                            placeholder="Min 8 characters"
                                            className="pr-9"
                                            autoFocus
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowResetPassword((v) => !v)}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                                            tabIndex={-1}
                                        >
                                            {showResetPassword ? (
                                                <EyeOff className="h-4 w-4" />
                                            ) : (
                                                <Eye className="h-4 w-4" />
                                            )}
                                        </button>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={generatePassword}
                                        className="gap-2"
                                    >
                                        <RefreshCw className="h-4 w-4" />
                                        Generate
                                    </Button>
                                </div>
                                <p className="text-[11px] text-slate-500">
                                    Use at least 8 characters. The "Generate" button creates a strong random
                                    password you can copy from the field above.
                                </p>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setResetUser(null)}
                            disabled={resetting}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleResetPassword}
                            disabled={resetting || resetPassword.length < 8}
                            className="bg-amber-600 hover:bg-amber-700"
                        >
                            {resetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Reset Password
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
    return (
        <div>
            <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">{label}</p>
            <div className="text-sm text-slate-700">{value}</div>
        </div>
    );
}
