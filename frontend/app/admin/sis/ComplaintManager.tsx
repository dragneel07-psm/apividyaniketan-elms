// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { MessageSquareWarning, Loader2, UserCheck, CheckCircle2 } from 'lucide-react';
import { complaintAPI, Complaint } from '@/lib/api';
import { toast } from 'sonner';

type StatusFilter = 'all' | Complaint['status'];
type CategoryFilter = 'all' | Complaint['category'];

const STATUS_TABS: { id: StatusFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'open', label: 'Open' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'resolved', label: 'Resolved' },
    { id: 'closed', label: 'Closed' },
];

const CATEGORIES: CategoryFilter[] = ['all', 'academic', 'facility', 'staff', 'billing', 'bullying', 'safety', 'other'];

function statusBadge(status: Complaint['status']) {
    const map: Record<Complaint['status'], string> = {
        open: 'bg-blue-100 text-blue-700',
        in_progress: 'bg-amber-100 text-amber-700',
        resolved: 'bg-green-100 text-green-700',
        closed: 'bg-slate-100 text-slate-500',
    };
    return map[status] ?? 'bg-slate-100 text-slate-500';
}

function priorityBadge(priority: Complaint['priority']) {
    const map: Record<Complaint['priority'], string> = {
        low: 'bg-slate-100 text-slate-500',
        medium: 'bg-amber-100 text-amber-700',
        high: 'bg-red-100 text-red-700',
    };
    return map[priority] ?? 'bg-slate-100 text-slate-500';
}

function categoryBadge(category: Complaint['category']) {
    const map: Record<Complaint['category'], string> = {
        academic: 'bg-indigo-100 text-indigo-700',
        facility: 'bg-teal-100 text-teal-700',
        staff: 'bg-purple-100 text-purple-700',
        billing: 'bg-yellow-100 text-yellow-700',
        bullying: 'bg-red-100 text-red-700',
        safety: 'bg-orange-100 text-orange-700',
        other: 'bg-slate-100 text-slate-600',
    };
    return map[category] ?? 'bg-slate-100 text-slate-600';
}

export function ComplaintManager() {
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [loading, setLoading] = useState(true);

    // Assign dialog
    const [assignDialogOpen, setAssignDialogOpen] = useState(false);
    const [assignUserId, setAssignUserId] = useState('');
    const [assignTarget, setAssignTarget] = useState<Complaint | null>(null);
    const [assignLoading, setAssignLoading] = useState(false);

    // Resolve dialog
    const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
    const [resolutionNote, setResolutionNote] = useState('');
    const [resolveTarget, setResolveTarget] = useState<Complaint | null>(null);
    const [resolveLoading, setResolveLoading] = useState(false);

    useEffect(() => {
        loadComplaints();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusFilter, categoryFilter]);

    const loadComplaints = async () => {
        try {
            setLoading(true);
            const params: { status?: string; category?: string } = {};
            if (statusFilter !== 'all') params.status = statusFilter;
            if (categoryFilter !== 'all') params.category = categoryFilter;
            const data = await complaintAPI.getComplaints(Object.keys(params).length ? params : undefined);
            setComplaints(Array.isArray(data) ? data : []);
        } catch {
            toast.error('Failed to load complaints');
            setComplaints([]);
        } finally {
            setLoading(false);
        }
    };

    const openAssignDialog = (complaint: Complaint) => {
        setAssignTarget(complaint);
        setAssignUserId(complaint.assigned_to ?? '');
        setAssignDialogOpen(true);
    };

    const confirmAssign = async () => {
        if (!assignTarget || !assignUserId.trim()) {
            toast.error('Please enter a user ID');
            return;
        }
        setAssignLoading(true);
        try {
            await complaintAPI.assignComplaint(assignTarget.complaint_id, assignUserId.trim());
            toast.success('Complaint assigned');
            setAssignDialogOpen(false);
            loadComplaints();
        } catch {
            toast.error('Failed to assign complaint');
        } finally {
            setAssignLoading(false);
        }
    };

    const openResolveDialog = (complaint: Complaint) => {
        setResolveTarget(complaint);
        setResolutionNote('');
        setResolveDialogOpen(true);
    };

    const confirmResolve = async () => {
        if (!resolveTarget) return;
        if (!resolutionNote.trim()) {
            toast.error('Please enter a resolution note');
            return;
        }
        setResolveLoading(true);
        try {
            await complaintAPI.resolveComplaint(resolveTarget.complaint_id, resolutionNote.trim());
            toast.success('Complaint resolved');
            setResolveDialogOpen(false);
            loadComplaints();
        } catch {
            toast.error('Failed to resolve complaint');
        } finally {
            setResolveLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Filters Row */}
            <div className="flex flex-wrap items-center gap-3">
                {/* Status tabs */}
                <div className="flex bg-slate-100 rounded-2xl p-1 gap-1">
                    {STATUS_TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setStatusFilter(tab.id)}
                            className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-all ${
                                statusFilter === tab.id
                                    ? 'bg-white shadow-sm text-indigo-700'
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Category select */}
                <select
                    value={categoryFilter}
                    onChange={e => setCategoryFilter(e.target.value as CategoryFilter)}
                    className="text-sm border border-slate-200 rounded-xl px-3 py-1.5 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 capitalize"
                >
                    {CATEGORIES.map(cat => (
                        <option key={cat} value={cat} className="capitalize">{cat === 'all' ? 'All Categories' : cat}</option>
                    ))}
                </select>
            </div>

            {/* Table */}
            <Card className="border-0 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50 border-b py-3 px-6">
                    <CardTitle className="text-base flex items-center gap-2">
                        <MessageSquareWarning className="h-4 w-4 text-indigo-500" />
                        Complaints
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex justify-center items-center py-16">
                            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b">
                                    <tr>
                                        <th className="px-6 py-4">Submitted By</th>
                                        <th className="px-6 py-4">Category</th>
                                        <th className="px-6 py-4">Title</th>
                                        <th className="px-6 py-4">Priority</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {complaints.map(complaint => (
                                        <tr key={complaint.complaint_id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-slate-900">
                                                    {complaint.anonymous ? 'Anonymous' : (complaint.submitted_by_name || '—')}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${categoryBadge(complaint.category)}`}>
                                                    {complaint.category}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 max-w-[220px]">
                                                <p className="text-sm font-medium text-slate-800 truncate" title={complaint.title}>
                                                    {complaint.title}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${priorityBadge(complaint.priority)}`}>
                                                    {complaint.priority}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${statusBadge(complaint.status)}`}>
                                                    {complaint.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">
                                                {new Date(complaint.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    {complaint.status !== 'resolved' && complaint.status !== 'closed' && (
                                                        <>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-7 px-2 text-xs gap-1 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                                                                onClick={() => openAssignDialog(complaint)}
                                                            >
                                                                <UserCheck className="h-3 w-3" />
                                                                Assign
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-7 px-2 text-xs gap-1 border-green-200 text-green-700 hover:bg-green-50"
                                                                onClick={() => openResolveDialog(complaint)}
                                                            >
                                                                <CheckCircle2 className="h-3 w-3" />
                                                                Resolve
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {complaints.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                                No complaints found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Assign Dialog */}
            <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
                <DialogContent className="sm:max-w-[420px] border-0 shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black text-slate-900">Assign Complaint</DialogTitle>
                        <DialogDescription>
                            Enter the user ID of the staff member to assign this complaint to.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-3">
                        {assignTarget && (
                            <div className="bg-slate-50 rounded-lg p-3 text-sm">
                                <div className="font-semibold text-slate-800 truncate">{assignTarget.title}</div>
                                <div className="text-slate-500 capitalize mt-1">{assignTarget.category} &bull; Priority: {assignTarget.priority}</div>
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label className="font-semibold text-slate-700">Assign To (User ID)</Label>
                            <Input
                                placeholder="Enter user ID..."
                                value={assignUserId}
                                onChange={e => setAssignUserId(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
                        <Button
                            onClick={confirmAssign}
                            disabled={assignLoading || !assignUserId.trim()}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                        >
                            {assignLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
                            {assignLoading ? 'Assigning...' : 'Assign'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Resolve Dialog */}
            <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
                <DialogContent className="sm:max-w-[420px] border-0 shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black text-slate-900">Resolve Complaint</DialogTitle>
                        <DialogDescription>
                            Provide a resolution note to close this complaint.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-3">
                        {resolveTarget && (
                            <div className="bg-slate-50 rounded-lg p-3 text-sm">
                                <div className="font-semibold text-slate-800 truncate">{resolveTarget.title}</div>
                                <div className="text-slate-500 capitalize mt-1">{resolveTarget.category} &bull; Priority: {resolveTarget.priority}</div>
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label className="font-semibold text-slate-700">Resolution Note</Label>
                            <Textarea
                                placeholder="Describe how the complaint was resolved..."
                                value={resolutionNote}
                                onChange={e => setResolutionNote(e.target.value)}
                                rows={4}
                                className="resize-none"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setResolveDialogOpen(false)}>Cancel</Button>
                        <Button
                            onClick={confirmResolve}
                            disabled={resolveLoading || !resolutionNote.trim()}
                            className="bg-green-600 hover:bg-green-700 text-white gap-2"
                        >
                            {resolveLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                            {resolveLoading ? 'Resolving...' : 'Mark Resolved'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
