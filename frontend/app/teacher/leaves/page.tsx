// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
    CalendarClock, CheckCircle2, XCircle, Clock, Ban, Loader2,
} from 'lucide-react';
import { studentLeaveAPI, StudentLeave } from '@/lib/api';
import { toast } from 'sonner';

const STATUS_BADGE: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700',
    cancelled: 'bg-slate-100 text-slate-500',
};

const TABS = ['pending', 'approved', 'rejected', 'all'] as const;
type Tab = typeof TABS[number];

export default function TeacherLeavesPage() {
    const [leaves, setLeaves] = useState<StudentLeave[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<Tab>('pending');

    // Action dialog
    const [actionLeave, setActionLeave] = useState<StudentLeave | null>(null);
    const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
    const [remarks, setRemarks] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        loadLeaves();
    }, [activeTab]);

    const loadLeaves = async () => {
        setLoading(true);
        try {
            const params = activeTab !== 'all' ? { status: activeTab } : {};
            const data = await studentLeaveAPI.getLeaves(params);
            setLeaves(Array.isArray(data) ? data : []);
        } catch {
            toast.error('Failed to load leave requests.');
        } finally {
            setLoading(false);
        }
    };

    const openAction = (leave: StudentLeave, type: 'approve' | 'reject') => {
        setActionLeave(leave);
        setActionType(type);
        setRemarks('');
    };

    const handleAction = async () => {
        if (!actionLeave) return;
        setActionLoading(true);
        try {
            if (actionType === 'approve') {
                await studentLeaveAPI.approveLeave(actionLeave.leave_id, remarks);
                toast.success('Leave approved.');
            } else {
                await studentLeaveAPI.rejectLeave(actionLeave.leave_id, remarks || 'Rejected by teacher.');
                toast.success('Leave rejected.');
            }
            setActionLeave(null);
            loadLeaves();
        } catch {
            toast.error('Action failed. Please try again.');
        } finally {
            setActionLoading(false);
        }
    };

    const pendingCount = leaves.filter(l => l.status === 'pending').length;

    return (
        <div className="p-6 md:p-8 space-y-6 max-w-5xl">
            {/* Header */}
            <div>
                <div className="flex items-center gap-2 text-teal-600 font-bold mb-1">
                    <CalendarClock className="h-4 w-4" />
                    <span className="text-[10px] uppercase tracking-[0.2em]">Teacher Portal</span>
                </div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Student Leave Requests</h1>
                <p className="text-slate-500 font-medium">Review and action leave requests for your students.</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 rounded-2xl p-1 w-fit">
                {TABS.map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all capitalize ${
                            activeTab === tab
                                ? 'bg-white shadow-sm text-teal-700'
                                : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        {tab}
                        {tab === 'pending' && pendingCount > 0 && (
                            <span className="bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                                {pendingCount}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Table */}
            <Card className="border-slate-200">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-bold text-slate-700 flex items-center gap-2">
                        <CalendarClock className="h-4 w-4 text-teal-500" />
                        {activeTab === 'all' ? 'All Leave Requests' : `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Requests`}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex justify-center py-16">
                            <Loader2 className="h-7 w-7 animate-spin text-teal-500" />
                        </div>
                    ) : leaves.length === 0 ? (
                        <div className="py-16 text-center text-slate-400">
                            <CalendarClock className="h-10 w-10 mx-auto mb-3 opacity-30" />
                            <p className="font-medium">No {activeTab !== 'all' ? activeTab : ''} leave requests.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 border-y border-slate-100">
                                    <tr>
                                        {['Student', 'Class', 'Type', 'Period', 'Days', 'Reason', 'Status', 'Actions'].map(h => (
                                            <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {leaves.map(leave => (
                                        <tr key={leave.leave_id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-3 font-semibold text-slate-800">
                                                {leave.student_name || leave.student}
                                            </td>
                                            <td className="px-4 py-3 text-slate-500 text-xs">{leave.class_name || '—'}</td>
                                            <td className="px-4 py-3">
                                                <Badge variant="outline" className="capitalize text-xs font-semibold">
                                                    {leave.leave_type.replace('_', ' ')}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 text-slate-600 whitespace-nowrap text-xs">
                                                {leave.start_date} → {leave.end_date}
                                            </td>
                                            <td className="px-4 py-3 text-slate-600 font-semibold">{leave.total_days}d</td>
                                            <td className="px-4 py-3 text-slate-500 max-w-[180px] truncate text-xs">{leave.reason}</td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${STATUS_BADGE[leave.status]}`}>
                                                    {leave.status === 'pending' && <Clock className="h-3 w-3" />}
                                                    {leave.status === 'approved' && <CheckCircle2 className="h-3 w-3" />}
                                                    {leave.status === 'rejected' && <XCircle className="h-3 w-3" />}
                                                    {leave.status === 'cancelled' && <Ban className="h-3 w-3" />}
                                                    {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                {leave.status === 'pending' && (
                                                    <div className="flex gap-1.5">
                                                        <Button
                                                            size="sm"
                                                            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 gap-1"
                                                            onClick={() => openAction(leave, 'approve')}
                                                        >
                                                            <CheckCircle2 className="h-3 w-3" /> Approve
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50 gap-1"
                                                            onClick={() => openAction(leave, 'reject')}
                                                        >
                                                            <XCircle className="h-3 w-3" /> Reject
                                                        </Button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Action Dialog */}
            <Dialog open={!!actionLeave} onOpenChange={() => setActionLeave(null)}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className={`flex items-center gap-2 font-black ${actionType === 'approve' ? 'text-emerald-700' : 'text-red-700'}`}>
                            {actionType === 'approve'
                                ? <><CheckCircle2 className="h-5 w-5" /> Approve Leave</>
                                : <><XCircle className="h-5 w-5" /> Reject Leave</>
                            }
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-3 space-y-3">
                        <p className="text-sm text-slate-600">
                            {actionType === 'approve' ? 'Approving' : 'Rejecting'} leave for{' '}
                            <span className="font-bold">{actionLeave?.student_name}</span>{' '}
                            ({actionLeave?.start_date} → {actionLeave?.end_date}).
                        </p>
                        <div className="space-y-1.5">
                            <Label className="font-bold text-slate-600">
                                Remarks <span className="text-slate-400 font-normal">(optional)</span>
                            </Label>
                            <Textarea
                                value={remarks}
                                onChange={e => setRemarks(e.target.value)}
                                placeholder="Add a note..."
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setActionLeave(null)}>Cancel</Button>
                        <Button
                            className={`gap-2 font-bold ${actionType === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}
                            onClick={handleAction}
                            disabled={actionLoading}
                        >
                            {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : actionType === 'approve' ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                            {actionLoading ? 'Processing...' : actionType === 'approve' ? 'Confirm Approve' : 'Confirm Reject'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
