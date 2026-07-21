// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { inventoryAPI, MaintenanceRequest } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Wrench, CheckCircle2, Loader2 } from 'lucide-react';

const PRIORITY_COLOR: Record<string, string> = {
    low: 'bg-slate-100 text-slate-600', medium: 'bg-amber-100 text-amber-700',
    high: 'bg-red-100 text-red-700', critical: 'bg-red-200 text-red-900',
};
const STATUS_COLOR: Record<string, string> = {
    open: 'bg-amber-100 text-amber-700', in_progress: 'bg-blue-100 text-blue-700',
    resolved: 'bg-emerald-100 text-emerald-700', cancelled: 'bg-slate-100 text-slate-500',
};

export function MaintenanceLog() {
    const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [resolveId, setResolveId] = useState<string | null>(null);
    const [resolveForm, setResolveForm] = useState({ resolution_notes: '', actual_cost: '' });
    const [submitting, setSubmitting] = useState(false);
    const { toast } = useToast();

    const load = async () => {
        setLoading(true);
        try {
            const data = await inventoryAPI.getMaintenanceRequests(statusFilter ? { status: statusFilter } : undefined);
            setRequests(Array.isArray(data) ? data : []);
        } catch { setRequests([]); }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, [statusFilter]);

    const handleResolve = async (id: string) => {
        setSubmitting(true);
        try {
            const payload: any = { resolution_notes: resolveForm.resolution_notes };
            if (resolveForm.actual_cost) payload.actual_cost = parseFloat(resolveForm.actual_cost);
            await inventoryAPI.resolveMaintenanceRequest(id, payload);
            toast({ title: 'Issue resolved.' });
            setResolveId(null);
            setResolveForm({ resolution_notes: '', actual_cost: '' });
            await load();
        } catch { toast({ title: 'Error', variant: 'destructive' }); }
        finally { setSubmitting(false); }
    };

    return (
        <div className="space-y-4">
            <div className="flex gap-2 items-center flex-wrap">
                <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
                    {['', 'open', 'in_progress', 'resolved', 'cancelled'].map(s => (
                        <button key={s} onClick={() => setStatusFilter(s)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === s ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500'}`}>
                            {s === '' ? 'All' : s.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="space-y-2 animate-pulse">{[1,2,3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-xl" />)}</div>
            ) : requests.length === 0 ? (
                <Card className="border-dashed border-2 border-slate-200">
                    <CardContent className="py-14 text-center">
                        <Wrench className="h-8 w-8 text-slate-200 mx-auto mb-3" />
                        <p className="text-slate-400 font-medium">No maintenance requests found.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-2">
                    {requests.map(req => (
                        <Card key={req.request_id} className="border-slate-200 shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-start gap-4">
                                    <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                                        <Wrench className="h-5 w-5 text-amber-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-bold text-slate-900 text-sm">{req.title}</span>
                                            <Badge className={`text-[10px] font-bold px-2 py-0.5 ${STATUS_COLOR[req.status]}`}>{req.status_display}</Badge>
                                            <Badge className={`text-[10px] font-bold px-2 py-0.5 ${PRIORITY_COLOR[req.priority]}`}>{req.priority_display}</Badge>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            {req.asset_name}{req.asset_tag ? ` (${req.asset_tag})` : ''} · {req.reported_date}
                                            {req.reported_by_name && ` · ${req.reported_by_name}`}
                                        </p>
                                        {req.description && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{req.description}</p>}
                                        {req.estimated_cost && <p className="text-xs text-slate-500 mt-0.5">Est. cost: ${Number(req.estimated_cost).toFixed(2)}{req.actual_cost ? ` · Actual: $${Number(req.actual_cost).toFixed(2)}` : ''}</p>}
                                        {req.resolution_notes && <p className="text-xs text-emerald-600 mt-0.5 font-medium">✓ {req.resolution_notes}</p>}
                                    </div>
                                    {(req.status === 'open' || req.status === 'in_progress') && (
                                        <Button size="sm" variant="outline"
                                            onClick={() => setResolveId(req.request_id)}
                                            className="h-8 px-2 rounded-lg text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50 flex-shrink-0">
                                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Resolve
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Resolve dialog */}
            <Dialog open={!!resolveId} onOpenChange={o => !o && setResolveId(null)}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader><DialogTitle>Resolve Maintenance Issue</DialogTitle></DialogHeader>
                    <div className="space-y-3 pt-2">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Resolution Notes</label>
                            <Textarea value={resolveForm.resolution_notes} onChange={e => setResolveForm(f => ({ ...f, resolution_notes: e.target.value }))}
                                rows={3} placeholder="What was done to fix the issue?" className="rounded-xl border-slate-200 text-sm resize-none" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Actual Cost ($)</label>
                            <Input type="number" step="0.01" value={resolveForm.actual_cost}
                                onChange={e => setResolveForm(f => ({ ...f, actual_cost: e.target.value }))}
                                placeholder="0.00" className="rounded-xl border-slate-200 text-sm" />
                        </div>
                        <Button onClick={() => resolveId && handleResolve(resolveId)} disabled={submitting}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold">
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Mark Resolved
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
