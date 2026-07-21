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
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { sisAPI, DisciplinaryIncident } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import {
    Plus, AlertTriangle, CheckCircle2, ShieldAlert,
    Bell, Loader2, Search
} from 'lucide-react';

const SEVERITY_COLOR: Record<string, string> = {
    low: 'bg-slate-100 text-slate-600 border-slate-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    high: 'bg-red-100 text-red-700 border-red-200',
};

const STATUS_COLOR: Record<string, string> = {
    open: 'bg-amber-100 text-amber-700',
    resolved: 'bg-emerald-100 text-emerald-700',
    escalated: 'bg-red-100 text-red-700',
};

const INCIDENT_TYPES = [
    { value: 'misconduct', label: 'General Misconduct' },
    { value: 'bullying', label: 'Bullying' },
    { value: 'cheating', label: 'Cheating / Academic Dishonesty' },
    { value: 'property_damage', label: 'Property Damage' },
    { value: 'verbal_abuse', label: 'Verbal Abuse' },
    { value: 'physical_altercation', label: 'Physical Altercation' },
    { value: 'attendance_violation', label: 'Attendance Violation' },
    { value: 'other', label: 'Other' },
];

export function IncidentLog() {
    const [incidents, setIncidents] = useState<DisciplinaryIncident[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [search, setSearch] = useState('');
    const [formOpen, setFormOpen] = useState(false);
    const [resolveId, setResolveId] = useState<string | null>(null);
    const [actionNotes, setActionNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({
        student: '', incident_date: '', incident_type: 'misconduct',
        severity: 'low', description: '', action_taken: '',
    });
    const { toast } = useToast();

    const load = async () => {
        setLoading(true);
        try {
            const data = await sisAPI.getIncidents({ status: statusFilter || undefined });
            setIncidents(Array.isArray(data) ? data : []);
        } catch { setIncidents([]); }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, [statusFilter]);

    const filtered = incidents.filter(i =>
        i.student_name.toLowerCase().includes(search.toLowerCase()) ||
        i.description.toLowerCase().includes(search.toLowerCase())
    );

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await sisAPI.createIncident(form as any);
            toast({ title: 'Incident recorded.' });
            setFormOpen(false);
            setForm({ student: '', incident_date: '', incident_type: 'misconduct', severity: 'low', description: '', action_taken: '' });
            await load();
        } catch { toast({ title: 'Error', description: 'Failed to save incident.', variant: 'destructive' }); }
        finally { setSubmitting(false); }
    };

    const handleResolve = async (id: string) => {
        setSubmitting(true);
        try {
            await sisAPI.resolveIncident(id, { action_taken: actionNotes });
            toast({ title: 'Incident resolved.' });
            setResolveId(null);
            setActionNotes('');
            await load();
        } catch { toast({ title: 'Error', variant: 'destructive' }); }
        finally { setSubmitting(false); }
    };

    const handleNotifyParent = async (id: string) => {
        try {
            await sisAPI.notifyParent(id);
            toast({ title: 'Parent notification recorded.' });
            await load();
        } catch { toast({ title: 'Error', variant: 'destructive' }); }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
                <div className="flex gap-2 items-center flex-wrap">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input placeholder="Search incidents..." value={search} onChange={e => setSearch(e.target.value)}
                            className="pl-9 border-slate-200 rounded-xl w-56 text-sm" />
                    </div>
                    <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
                        {['', 'open', 'resolved', 'escalated'].map(s => (
                            <button key={s} onClick={() => setStatusFilter(s)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === s ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500'}`}>
                                {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
                <Dialog open={formOpen} onOpenChange={setFormOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold h-9 gap-2">
                            <Plus className="h-4 w-4" /> Log Incident
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader><DialogTitle className="font-black">Log Disciplinary Incident</DialogTitle></DialogHeader>
                        <form onSubmit={handleCreate} className="space-y-4 pt-2">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Student ID</label>
                                    <Input value={form.student} onChange={e => setForm(f => ({ ...f, student: e.target.value }))}
                                        placeholder="Student UUID..." className="rounded-xl border-slate-200 text-sm" required />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Date</label>
                                    <Input type="date" value={form.incident_date} onChange={e => setForm(f => ({ ...f, incident_date: e.target.value }))}
                                        className="rounded-xl border-slate-200 text-sm" required />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Type</label>
                                    <select value={form.incident_type} onChange={e => setForm(f => ({ ...f, incident_type: e.target.value }))}
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white">
                                        {INCIDENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Severity</label>
                                    <select value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white">
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Description</label>
                                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    rows={3} className="rounded-xl border-slate-200 text-sm resize-none" required />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Action Taken (optional)</label>
                                <Textarea value={form.action_taken} onChange={e => setForm(f => ({ ...f, action_taken: e.target.value }))}
                                    rows={2} className="rounded-xl border-slate-200 text-sm resize-none" />
                            </div>
                            <div className="flex gap-3 pt-1">
                                <Button type="submit" disabled={submitting} className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold">
                                    {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Save Incident
                                </Button>
                                <Button type="button" variant="outline" onClick={() => setFormOpen(false)} className="rounded-xl">Cancel</Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {loading ? (
                <div className="space-y-2 animate-pulse">{[1,2,3].map(i => <div key={i} className="h-24 bg-slate-100 rounded-xl" />)}</div>
            ) : filtered.length === 0 ? (
                <Card className="border-dashed border-2 border-slate-200">
                    <CardContent className="py-14 text-center">
                        <ShieldAlert className="h-8 w-8 text-slate-200 mx-auto mb-3" />
                        <p className="text-slate-400 font-medium">No incidents found.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-2">
                    {filtered.map(inc => (
                        <Card key={inc.incident_id} className="border-slate-200 shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-start gap-4">
                                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${inc.severity === 'high' ? 'bg-red-50' : inc.severity === 'medium' ? 'bg-amber-50' : 'bg-slate-50'}`}>
                                        <AlertTriangle className={`h-5 w-5 ${inc.severity === 'high' ? 'text-red-500' : inc.severity === 'medium' ? 'text-amber-500' : 'text-slate-400'}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-bold text-slate-900 text-sm">{inc.student_name}</span>
                                            <Badge className={`text-[10px] font-bold px-2 py-0.5 ${SEVERITY_COLOR[inc.severity]}`}>{inc.severity}</Badge>
                                            <Badge className={`text-[10px] font-bold px-2 py-0.5 ${STATUS_COLOR[inc.status]}`}>{inc.status}</Badge>
                                            {inc.parent_notified && <Badge className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5">Parent Notified</Badge>}
                                        </div>
                                        <p className="text-xs text-slate-500 mt-0.5">{inc.incident_date} · {inc.incident_type.replace('_', ' ')}</p>
                                        <p className="text-xs text-slate-600 mt-1 line-clamp-2">{inc.description}</p>
                                    </div>
                                    <div className="flex gap-2 flex-shrink-0">
                                        {inc.status === 'open' && !inc.parent_notified && (
                                            <Button size="sm" variant="outline" onClick={() => handleNotifyParent(inc.incident_id)}
                                                className="h-8 px-2 rounded-lg text-xs border-blue-200 text-blue-600 hover:bg-blue-50">
                                                <Bell className="h-3.5 w-3.5 mr-1" /> Notify
                                            </Button>
                                        )}
                                        {inc.status === 'open' && (
                                            <Dialog open={resolveId === inc.incident_id} onOpenChange={o => setResolveId(o ? inc.incident_id : null)}>
                                                <DialogTrigger asChild>
                                                    <Button size="sm" variant="outline" className="h-8 px-2 rounded-lg text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                                                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Resolve
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="sm:max-w-[400px]">
                                                    <DialogHeader><DialogTitle>Resolve Incident</DialogTitle></DialogHeader>
                                                    <div className="space-y-3 pt-2">
                                                        <Textarea placeholder="Action taken / resolution notes..."
                                                            value={actionNotes} onChange={e => setActionNotes(e.target.value)}
                                                            rows={4} className="rounded-xl border-slate-200 text-sm resize-none" />
                                                        <Button onClick={() => handleResolve(inc.incident_id)} disabled={submitting}
                                                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold">
                                                            Mark Resolved
                                                        </Button>
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
