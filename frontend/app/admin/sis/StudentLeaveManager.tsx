// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, XCircle, Loader2, CalendarDays } from 'lucide-react';
import { studentLeaveAPI, StudentLeave } from '@/lib/api';
import { toast } from 'sonner';

type FilterTab = 'pending' | 'approved' | 'rejected' | 'all';

const FILTER_TABS: { id: FilterTab; label: string }[] = [
    { id: 'pending', label: 'Pending' },
    { id: 'approved', label: 'Approved' },
    { id: 'rejected', label: 'Rejected' },
    { id: 'all', label: 'All' },
];

function leaveTypeBadge(type: StudentLeave['leave_type']) {
    const map: Record<StudentLeave['leave_type'], string> = {
        sick: 'bg-red-100 text-red-700',
        personal: 'bg-blue-100 text-blue-700',
        family: 'bg-purple-100 text-purple-700',
        event: 'bg-cyan-100 text-cyan-700',
        other: 'bg-slate-100 text-slate-700',
    };
    return map[type] ?? 'bg-slate-100 text-slate-700';
}

function statusBadge(status: StudentLeave['status']) {
    const map: Record<StudentLeave['status'], string> = {
        pending: 'bg-amber-100 text-amber-700',
        approved: 'bg-green-100 text-green-700',
        rejected: 'bg-red-100 text-red-700',
        cancelled: 'bg-slate-100 text-slate-500',
    };
    return map[status] ?? 'bg-slate-100 text-slate-500';
}

export function StudentLeaveManager() {
    const [activeTab, setActiveTab] = useState<FilterTab>('pending');
    const [leaves, setLeaves] = useState<StudentLeave[]>([]);
    const [loading, setLoading] = useState(true);
    const [pendingCount, setPendingCount] = useState(0);

    // Remarks dialog state
    const [remarkDialogOpen, setRemarkDialogOpen] = useState(false);
    const [remarkAction, setRemarkAction] = useState<'approve' | 'reject'>('approve');
    const [selectedLeave, setSelectedLeave] = useState<StudentLeave | null>(null);
    const [remarks, setRemarks] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        loadLeaves();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    const loadLeaves = async () => {
        try {
            setLoading(true);
            const params = activeTab !== 'all' ? { status: activeTab } : undefined;
            const data = await studentLeaveAPI.getLeaves(params);
            setLeaves(Array.isArray(data) ? data : []);

            // Always keep pending count up to date
            if (activeTab === 'pending') {
                setPendingCount(Array.isArray(data) ? data.length : 0);
            } else {
                const pending = await studentLeaveAPI.getLeaves({ status: 'pending' });
                setPendingCount(Array.isArray(pending) ? pending.length : 0);
            }
        } catch {
            toast.error('Failed to load leave requests');
            setLeaves([]);
        } finally {
            setLoading(false);
        }
    };

    const openRemarkDialog = (leave: StudentLeave, action: 'approve' | 'reject') => {
        setSelectedLeave(leave);
        setRemarkAction(action);
        setRemarks('');
        setRemarkDialogOpen(true);
    };

    const confirmAction = async () => {
        if (!selectedLeave) return;
        setActionLoading(true);
        try {
            if (remarkAction === 'approve') {
                await studentLeaveAPI.approveLeave(selectedLeave.leave_id, remarks || undefined);
                toast.success('Leave approved successfully');
            } else {
                await studentLeaveAPI.rejectLeave(selectedLeave.leave_id, remarks || 'Rejected.');
                toast.success('Leave rejected');
            }
            setRemarkDialogOpen(false);
            loadLeaves();
        } catch {
            toast.error(`Failed to ${remarkAction} leave`);
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Filter Tabs */}
            <div className="flex bg-slate-100 rounded-2xl p-1 gap-1 w-fit">
                {FILTER_TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                            activeTab === tab.id
                                ? 'bg-white shadow-sm text-indigo-700'
                                : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        {tab.label}
                        {tab.id === 'pending' && pendingCount > 0 && (
                            <span className="bg-amber-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                                {pendingCount}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Table */}
            <Card className="border-0 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50 border-b py-3 px-6">
                    <CardTitle className="text-base flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-indigo-500" />
                        Leave Requests
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
                                        <th className="px-6 py-4">Student</th>
                                        <th className="px-6 py-4">Class</th>
                                        <th className="px-6 py-4">Type</th>
                                        <th className="px-6 py-4">Date Range</th>
                                        <th className="px-6 py-4">Days</th>
                                        <th className="px-6 py-4">Reason</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {leaves.map(leave => (
                                        <tr key={leave.leave_id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-slate-900">
                                                    {leave.student_name || '—'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600">
                                                {leave.class_name || '—'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${leaveTypeBadge(leave.leave_type)}`}>
                                                    {leave.leave_type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                                                {new Date(leave.start_date).toLocaleDateString()} &rarr; {new Date(leave.end_date).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium text-slate-800">
                                                {leave.total_days}
                                            </td>
                                            <td className="px-6 py-4 max-w-[200px]">
                                                <p className="text-sm text-slate-600 truncate" title={leave.reason}>
                                                    {leave.reason}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${statusBadge(leave.status)}`}>
                                                    {leave.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {leave.status === 'pending' && (
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                            title="Approve"
                                                            onClick={() => openRemarkDialog(leave, 'approve')}
                                                        >
                                                            <CheckCircle2 className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                            title="Reject"
                                                            onClick={() => openRemarkDialog(leave, 'reject')}
                                                        >
                                                            <XCircle className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {leaves.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                                                No leave requests found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Remarks Dialog */}
            <Dialog open={remarkDialogOpen} onOpenChange={setRemarkDialogOpen}>
                <DialogContent className="sm:max-w-[440px] border-0 shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black text-slate-900 capitalize">
                            {remarkAction} Leave Request
                        </DialogTitle>
                        <DialogDescription>
                            {remarkAction === 'approve'
                                ? 'Optionally add a remark before approving.'
                                : 'Add a remark explaining the rejection.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-3">
                        {selectedLeave && (
                            <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-1">
                                <div className="font-semibold text-slate-800">{selectedLeave.student_name}</div>
                                <div className="text-slate-500 capitalize">{selectedLeave.leave_type} leave &bull; {selectedLeave.total_days} day(s)</div>
                                <div className="text-slate-500">{new Date(selectedLeave.start_date).toLocaleDateString()} &rarr; {new Date(selectedLeave.end_date).toLocaleDateString()}</div>
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label className="font-semibold text-slate-700">Remarks (optional)</Label>
                            <Textarea
                                placeholder="Add a remark..."
                                value={remarks}
                                onChange={e => setRemarks(e.target.value)}
                                rows={3}
                                className="resize-none"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setRemarkDialogOpen(false)}>Cancel</Button>
                        <Button
                            onClick={confirmAction}
                            disabled={actionLoading}
                            className={remarkAction === 'approve'
                                ? 'bg-green-600 hover:bg-green-700 text-white gap-2'
                                : 'bg-red-600 hover:bg-red-700 text-white gap-2'}
                        >
                            {actionLoading
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : remarkAction === 'approve'
                                    ? <CheckCircle2 className="h-4 w-4" />
                                    : <XCircle className="h-4 w-4" />}
                            {actionLoading ? 'Processing...' : remarkAction === 'approve' ? 'Approve' : 'Reject'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
