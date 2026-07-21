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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Users, Plus, Shield, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { usersAPI, Group, Permission } from '@/lib/api';
import { toast } from 'sonner';

type GroupWithPermissions = Group & { permissions?: Permission[] };

export default function GroupsPage() {
    const [groups, setGroups] = useState<GroupWithPermissions[]>([]);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [creatingGroup, setCreatingGroup] = useState(false);
    const [deletingGroupId, setDeletingGroupId] = useState<string | number | null>(null);

    // Permission Management State
    const [isPermDialogOpen, setIsPermDialogOpen] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<GroupWithPermissions | null>(null);
    const [selectedPermIds, setSelectedPermIds] = useState<number[]>([]);
    const [savingPermissions, setSavingPermissions] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);
            const [groupsData, permsData] = await Promise.all([
                usersAPI.getGroups(),
                usersAPI.getPermissions()
            ]);
            setGroups(Array.isArray(groupsData) ? groupsData : []);
            setPermissions(Array.isArray(permsData) ? permsData : []);
        } catch (err: unknown) {
            console.error('Failed to load data:', err);
            const status = err && typeof err === 'object' && 'status' in err ? (err as { status?: number }).status : undefined;
            if (status === 403) {
                setError('Access Denied: You do not have permission to view groups. Please log in as an Administrator.');
            } else {
                setError('Failed to load groups. Please try again later.');
            }
        } finally {
            setLoading(false);
        }
    };

    const loadGroups = async () => {
        const data = await usersAPI.getGroups();
        setGroups(Array.isArray(data) ? data : []);
    };

    const handleCreateGroup = async () => {
        const groupName = newGroupName.trim();
        if (!groupName) {
            toast.error('Group name is required');
            return;
        }
        try {
            setCreatingGroup(true);
            setError(null);
            await usersAPI.createGroup({ name: groupName });
            setIsOpen(false);
            setNewGroupName('');
            await loadGroups();
            toast.success('Group created successfully');
        } catch (err: unknown) {
            console.error('Failed to create group:', err);
            const status = err && typeof err === 'object' && 'status' in err ? (err as { status?: number }).status : undefined;
            if (status === 403) {
                toast.error('Access denied: You do not have permission to create groups.');
            } else {
                toast.error('Failed to create group. Please check your network and try again.');
            }
        } finally {
            setCreatingGroup(false);
        }
    };

    const handleDeleteGroup = async (id: string | number) => {
        if (!confirm('Are you sure you want to delete this group?')) return;
        try {
            setDeletingGroupId(id);
            setError(null);
            await usersAPI.deleteGroup(id);
            await loadGroups();
            toast.success('Group deleted successfully');
        } catch (err: unknown) {
            console.error('Failed to delete group:', err);
            const status = err && typeof err === 'object' && 'status' in err ? (err as { status?: number }).status : undefined;
            if (status === 403) {
                toast.error('Access denied: You do not have permission to delete groups.');
            } else {
                toast.error('Failed to delete group. Please try again later.');
            }
        } finally {
            setDeletingGroupId(null);
        }
    };

    const openPermissionDialog = (group: GroupWithPermissions) => {
        setSelectedGroup(group);
        setSelectedPermIds(group.permissions ? group.permissions.map((p) => p.id) : []);
        setIsPermDialogOpen(true);
    }

    const togglePermission = (permId: number) => {
        setSelectedPermIds(prev =>
            prev.includes(permId)
                ? prev.filter(id => id !== permId)
                : [...prev, permId]
        );
    };

    const handleSavePermissions = async () => {
        if (!selectedGroup) {
            toast.error('No group selected');
            return;
        }

        try {
            setSavingPermissions(true);
            const payload = { permission_ids: selectedPermIds };
            await usersAPI.updateGroup(selectedGroup.id, payload);

            setIsPermDialogOpen(false);
            await loadGroups();
            toast.success('Permissions updated successfully');
        } catch (err: unknown) {
            console.error('Detailed Error in handleSavePermissions:', err);
            const message = err instanceof Error ? err.message : 'Unknown error';
            toast.error(`Failed to update permissions: ${message}`);
        } finally {
            setSavingPermissions(false);
        }
    };

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen dark:bg-slate-900">
            <header className="flex items-center gap-4 border-b pb-6">
                <Link href="/admin/system">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Groups & Permissions</h1>
                    <p className="text-slate-500 text-sm">Manage user roles and access control lists.</p>
                </div>
            </header>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
                    <strong className="font-bold">Error: </strong>
                    <span className="block sm:inline">{error}</span>
                </div>
            )}

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" /> User Groups
                        </CardTitle>
                        <Dialog open={isOpen} onOpenChange={setIsOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <Plus className="mr-2 h-4 w-4" /> Create Group
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Create New Group</DialogTitle>
                                    <DialogDescription>
                                        Add a new user group to categorize permissions.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="name" className="text-right">
                                            Name
                                        </Label>
                                        <Input
                                            id="name"
                                            value={newGroupName}
                                            onChange={(e) => setNewGroupName(e.target.value)}
                                            className="col-span-3"
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button onClick={handleCreateGroup} disabled={creatingGroup}>
                                        {creatingGroup ? 'Creating...' : 'Create Group'}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Group Name</TableHead>
                                <TableHead>Permissions Count</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center py-8">Loading groups...</TableCell>
                                </TableRow>
                            ) : groups.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center py-8">No groups found.</TableCell>
                                </TableRow>
                            ) : (
                                groups.map((group) => (
                                    <TableRow key={group.id}>
                                        <TableCell className="font-medium">{group.name}</TableCell>
                                        <TableCell>{group.permissions?.length || 0}</TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button variant="outline" size="sm" onClick={() => openPermissionDialog(group)}>
                                                <Shield className="h-4 w-4 mr-1" /> Permissions
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => handleDeleteGroup(group.id)}
                                                disabled={deletingGroupId === group.id}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Permission Management Dialog */}
            <Dialog open={isPermDialogOpen} onOpenChange={setIsPermDialogOpen}>
                <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Manage Permissions: {selectedGroup?.name}</DialogTitle>
                        <DialogDescription>
                            Select permissions to assign to this group.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto py-4 pr-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {permissions.map((perm) => (
                                <div key={perm.id} className="flex items-start space-x-2 border p-2 rounded hover:bg-slate-50">
                                    <input
                                        type="checkbox"
                                        id={`perm-${perm.id}`}
                                        checked={selectedPermIds.includes(perm.id)}
                                        onChange={() => togglePermission(perm.id)}
                                        className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <div className="text-sm">
                                        <label htmlFor={`perm-${perm.id}`} className="font-medium text-gray-900 block cursor-pointer">
                                            {perm.name}
                                        </label>
                                        <span className="text-gray-500 text-xs text-wrap break-all">
                                            {perm.codename}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPermDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSavePermissions} disabled={savingPermissions}>
                            {savingPermissions ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
