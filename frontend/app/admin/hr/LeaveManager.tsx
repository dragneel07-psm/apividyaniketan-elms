// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { hrAPI, HRLeaveApplication } from '@/lib/api';
import { CalendarDays, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    pending: {
        label: 'Pending',
        color: 'bg-amber-100 text-amber-700 border-amber-200',
        icon: <Clock className="h-3.5 w-3.5" />,
    },
    approved: {
        label: 'Approved',
        color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    },
    rejected: {
        label: 'Rejected',
        color: 'bg-red-100 text-red-700 border-red-200',
        icon: <XCircle className="h-3.5 w-3.5" />,
    },
    cancelled: {
        label: 'Cancelled',
        color: 'bg-slate-100 text-slate-500 border-slate-200',
        icon: <AlertCircle className="h-3.5 w-3.5" />,
    },
};

export function LeaveManager() {
    const [leaves, setLeaves] = useState<HRLeaveApplication[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>('pending');
    const [actionId, setActionId] = useState<string | null>(null);
    const [remarks, setRemarks] = useState<Record<string, string>>({});

    const load = async () => {
        setLoading(true);
        try {
            const data = await hrAPI.getLeaves({ status: statusFilter || undefined });
            setLeaves(Array.isArray(data) ? data : []);
        } catch {
            setLeaves([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [statusFilter]);

    const handleApprove = async (leave: HRLeaveApplication) => {
        setActionId(leave.leave_id);
        try {
            await hrAPI.approveLeave(leave.leave_id, remarks[leave.leave_id] ?? '');
            await load();
        } catch {
            /* handle silently */
        } finally {
            setActionId(null);
        }
    };

    const handleReject = async (leave: HRLeaveApplication) => {
        const r = remarks[leave.leave_id];
        if (!r?.trim()) {
            alert('Please provide remarks before rejecting.');
            return;
        }
        setActionId(leave.leave_id);
        try {
            await hrAPI.rejectLeave(leave.leave_id, r);
            await load();
        } catch {
            /* handle silently */
        } finally {
            setActionId(null);
        }
    };

    return (
        <div className="space-y-4">
            {/* Filter tabs */}
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
                {['pending', 'approved', 'rejected', 'cancelled', ''].map((s, i) => (
                    <button
                        key={i}
                        onClick={() => setStatusFilter(s)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            statusFilter === s
                                ? 'bg-white shadow-sm text-indigo-700'
                                : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="space-y-3 animate-pulse">
                    {[1, 2, 3].map(i => <div key={i} className="h-28 bg-slate-100 rounded-xl" />)}
                </div>
            ) : leaves.length === 0 ? (
                <Card className="border-dashed border-2 border-slate-200">
                    <CardContent className="py-14 text-center">
                        <CalendarDays className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                        <p className="text-slate-400 font-medium">No leave applications found.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {leaves.map(leave => {
                        const cfg = STATUS_CONFIG[leave.status] ?? STATUS_CONFIG.pending;
                        const isPending = leave.status === 'pending';
                        return (
                            <Card key={leave.leave_id} className="border-slate-200 shadow-sm">
                                <CardContent className="p-5">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 flex-wrap">
                                                <span className="font-bold text-slate-900">{leave.employee_name}</span>
                                                <Badge className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 ${cfg.color}`}>
                                                    {cfg.icon} {cfg.label}
                                                </Badge>
                                                <Badge variant="outline" className="text-[10px] font-bold px-2 py-0.5 text-slate-600">
                                                    {leave.leave_type_code} — {leave.leave_type_name}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                                                <span className="flex items-center gap-1">
                                                    <CalendarDays className="h-3 w-3" />
                                                    {leave.start_date} → {leave.end_date}
                                                </span>
                                                <span className="font-bold text-slate-600">{leave.total_days} day(s)</span>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-2 leading-relaxed line-clamp-2">{leave.reason}</p>
                                            {leave.review_remarks && (
                                                <p className="text-xs text-slate-400 mt-1 italic">
                                                    Remarks: {leave.review_remarks}
                                                </p>
                                            )}
                                        </div>
                                        <div className="text-xs text-slate-400 whitespace-nowrap">
                                            {new Date(leave.applied_at).toLocaleDateString()}
                                        </div>
                                    </div>

                                    {isPending && (
                                        <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                                            <Textarea
                                                placeholder="Remarks (required for rejection)..."
                                                rows={2}
                                                className="text-xs border-slate-200 rounded-xl resize-none"
                                                value={remarks[leave.leave_id] ?? ''}
                                                onChange={e =>
                                                    setRemarks(prev => ({ ...prev, [leave.leave_id]: e.target.value }))
                                                }
                                            />
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    disabled={actionId === leave.leave_id}
                                                    onClick={() => handleApprove(leave)}
                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg h-8 px-4 gap-1.5"
                                                >
                                                    <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    disabled={actionId === leave.leave_id}
                                                    onClick={() => handleReject(leave)}
                                                    className="text-red-600 border-red-200 hover:bg-red-50 text-xs rounded-lg h-8 px-4 gap-1.5"
                                                >
                                                    <XCircle className="h-3.5 w-3.5" /> Reject
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
