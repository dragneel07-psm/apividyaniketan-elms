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
import { sisAPI, StudentHealthRecord } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import {
    Heart, Plus, Syringe, Trash2, ChevronDown, ChevronUp,
    Loader2, Search, Activity
} from 'lucide-react';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'];

const BLANK_FORM = {
    student: '', blood_group: 'unknown',
    height_cm: '', weight_kg: '',
    allergies: '', chronic_conditions: '', current_medications: '',
    emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relation: '',
    doctor_name: '', doctor_phone: '',
    insurance_provider: '', insurance_number: '', notes: '',
};

export function HealthRecords() {
    const [records, setRecords] = useState<StudentHealthRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [expanded, setExpanded] = useState<string | null>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [editRecord, setEditRecord] = useState<StudentHealthRecord | null>(null);
    const [form, setForm] = useState({ ...BLANK_FORM });
    const [submitting, setSubmitting] = useState(false);
    const [immForm, setImmForm] = useState({ vaccine_name: '', date_administered: '', next_due_date: '', administered_by: '', remarks: '' });
    const [immOpen, setImmOpen] = useState<string | null>(null);
    const { toast } = useToast();

    const load = async () => {
        setLoading(true);
        try {
            const data = await sisAPI.getHealthRecords();
            setRecords(Array.isArray(data) ? data : []);
        } catch { setRecords([]); }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const filtered = records.filter(r =>
        r.student_name.toLowerCase().includes(search.toLowerCase())
    );

    const openEdit = (rec: StudentHealthRecord) => {
        setEditRecord(rec);
        setForm({
            student: rec.student,
            blood_group: rec.blood_group,
            height_cm: rec.height_cm?.toString() ?? '',
            weight_kg: rec.weight_kg?.toString() ?? '',
            allergies: rec.allergies,
            chronic_conditions: rec.chronic_conditions,
            current_medications: rec.current_medications,
            emergency_contact_name: rec.emergency_contact_name,
            emergency_contact_phone: rec.emergency_contact_phone,
            emergency_contact_relation: rec.emergency_contact_relation,
            doctor_name: rec.doctor_name,
            doctor_phone: rec.doctor_phone,
            insurance_provider: rec.insurance_provider,
            insurance_number: rec.insurance_number,
            notes: rec.notes,
        });
        setFormOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const payload: any = { ...form };
            if (!payload.height_cm) delete payload.height_cm;
            else payload.height_cm = parseFloat(payload.height_cm);
            if (!payload.weight_kg) delete payload.weight_kg;
            else payload.weight_kg = parseFloat(payload.weight_kg);

            if (editRecord) {
                await sisAPI.updateHealthRecord(editRecord.health_id, payload);
                toast({ title: 'Health record updated.' });
            } else {
                await sisAPI.createHealthRecord(payload);
                toast({ title: 'Health record created.' });
            }
            setFormOpen(false);
            setEditRecord(null);
            setForm({ ...BLANK_FORM });
            await load();
        } catch { toast({ title: 'Error', description: 'Failed to save record.', variant: 'destructive' }); }
        finally { setSubmitting(false); }
    };

    const handleAddImmunization = async (healthId: string) => {
        setSubmitting(true);
        try {
            await sisAPI.addImmunization(healthId, immForm);
            toast({ title: 'Immunization added.' });
            setImmOpen(null);
            setImmForm({ vaccine_name: '', date_administered: '', next_due_date: '', administered_by: '', remarks: '' });
            await load();
        } catch { toast({ title: 'Error', variant: 'destructive' }); }
        finally { setSubmitting(false); }
    };

    const handleDeleteImmunization = async (healthId: string, immId: string) => {
        try {
            await sisAPI.deleteImmunization(healthId, immId);
            toast({ title: 'Immunization removed.' });
            await load();
        } catch { toast({ title: 'Error', variant: 'destructive' }); }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input placeholder="Search by student..." value={search} onChange={e => setSearch(e.target.value)}
                        className="pl-9 border-slate-200 rounded-xl w-56 text-sm" />
                </div>
                <Dialog open={formOpen} onOpenChange={o => { setFormOpen(o); if (!o) { setEditRecord(null); setForm({ ...BLANK_FORM }); } }}>
                    <DialogTrigger asChild>
                        <Button className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold h-9 gap-2">
                            <Plus className="h-4 w-4" /> Add Health Record
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                        <DialogHeader><DialogTitle className="font-black">{editRecord ? 'Edit Health Record' : 'New Health Record'}</DialogTitle></DialogHeader>
                        <form onSubmit={handleSave} className="space-y-4 pt-2">
                            {!editRecord && (
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Student ID</label>
                                    <Input value={form.student} onChange={e => setForm(f => ({ ...f, student: e.target.value }))}
                                        placeholder="Student UUID..." className="rounded-xl border-slate-200 text-sm" required />
                                </div>
                            )}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Blood Group</label>
                                    <select value={form.blood_group} onChange={e => setForm(f => ({ ...f, blood_group: e.target.value }))}
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white">
                                        {BLOOD_GROUPS.map(b => <option key={b} value={b}>{b === 'unknown' ? 'Unknown' : b}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Height (cm)</label>
                                    <Input type="number" step="0.1" value={form.height_cm} onChange={e => setForm(f => ({ ...f, height_cm: e.target.value }))}
                                        placeholder="e.g. 160.5" className="rounded-xl border-slate-200 text-sm" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Weight (kg)</label>
                                    <Input type="number" step="0.1" value={form.weight_kg} onChange={e => setForm(f => ({ ...f, weight_kg: e.target.value }))}
                                        placeholder="e.g. 55.0" className="rounded-xl border-slate-200 text-sm" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Allergies</label>
                                <Textarea value={form.allergies} onChange={e => setForm(f => ({ ...f, allergies: e.target.value }))}
                                    rows={2} className="rounded-xl border-slate-200 text-sm resize-none" placeholder="List any known allergies..." />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Chronic Conditions</label>
                                    <Textarea value={form.chronic_conditions} onChange={e => setForm(f => ({ ...f, chronic_conditions: e.target.value }))}
                                        rows={2} className="rounded-xl border-slate-200 text-sm resize-none" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Current Medications</label>
                                    <Textarea value={form.current_medications} onChange={e => setForm(f => ({ ...f, current_medications: e.target.value }))}
                                        rows={2} className="rounded-xl border-slate-200 text-sm resize-none" />
                                </div>
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pt-1">Emergency Contact</p>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Name</label>
                                    <Input value={form.emergency_contact_name} onChange={e => setForm(f => ({ ...f, emergency_contact_name: e.target.value }))}
                                        className="rounded-xl border-slate-200 text-sm" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Phone</label>
                                    <Input value={form.emergency_contact_phone} onChange={e => setForm(f => ({ ...f, emergency_contact_phone: e.target.value }))}
                                        className="rounded-xl border-slate-200 text-sm" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Relation</label>
                                    <Input value={form.emergency_contact_relation} onChange={e => setForm(f => ({ ...f, emergency_contact_relation: e.target.value }))}
                                        className="rounded-xl border-slate-200 text-sm" />
                                </div>
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pt-1">Doctor & Insurance</p>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Doctor Name</label>
                                    <Input value={form.doctor_name} onChange={e => setForm(f => ({ ...f, doctor_name: e.target.value }))}
                                        className="rounded-xl border-slate-200 text-sm" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Doctor Phone</label>
                                    <Input value={form.doctor_phone} onChange={e => setForm(f => ({ ...f, doctor_phone: e.target.value }))}
                                        className="rounded-xl border-slate-200 text-sm" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Insurance Provider</label>
                                    <Input value={form.insurance_provider} onChange={e => setForm(f => ({ ...f, insurance_provider: e.target.value }))}
                                        className="rounded-xl border-slate-200 text-sm" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Insurance Number</label>
                                    <Input value={form.insurance_number} onChange={e => setForm(f => ({ ...f, insurance_number: e.target.value }))}
                                        className="rounded-xl border-slate-200 text-sm" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Notes</label>
                                <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                    rows={2} className="rounded-xl border-slate-200 text-sm resize-none" />
                            </div>
                            <div className="flex gap-3 pt-1">
                                <Button type="submit" disabled={submitting} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold">
                                    {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Save Record
                                </Button>
                                <Button type="button" variant="outline" onClick={() => setFormOpen(false)} className="rounded-xl">Cancel</Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {loading ? (
                <div className="space-y-2 animate-pulse">{[1,2,3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-xl" />)}</div>
            ) : filtered.length === 0 ? (
                <Card className="border-dashed border-2 border-slate-200">
                    <CardContent className="py-14 text-center">
                        <Heart className="h-8 w-8 text-slate-200 mx-auto mb-3" />
                        <p className="text-slate-400 font-medium">No health records found.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-2">
                    {filtered.map(rec => (
                        <Card key={rec.health_id} className="border-slate-200 shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-xl bg-rose-50 flex items-center justify-center flex-shrink-0">
                                        <Activity className="h-5 w-5 text-rose-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-bold text-slate-900 text-sm">{rec.student_name}</span>
                                            {rec.blood_group !== 'unknown' && (
                                                <Badge className="text-[10px] font-bold px-2 py-0.5 bg-rose-100 text-rose-700 border-rose-200">
                                                    {rec.blood_group}
                                                </Badge>
                                            )}
                                            {rec.allergies && (
                                                <Badge className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-700 border-amber-200">
                                                    Allergies
                                                </Badge>
                                            )}
                                            {rec.immunizations.length > 0 && (
                                                <Badge className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-700">
                                                    {rec.immunizations.length} vaccine{rec.immunizations.length > 1 ? 's' : ''}
                                                </Badge>
                                            )}
                                        </div>
                                        {rec.emergency_contact_name && (
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                Emergency: {rec.emergency_contact_name} ({rec.emergency_contact_relation}) · {rec.emergency_contact_phone}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex gap-2 flex-shrink-0">
                                        <Button size="sm" variant="outline" onClick={() => openEdit(rec)}
                                            className="h-8 px-3 rounded-lg text-xs border-slate-200">
                                            Edit
                                        </Button>
                                        <button onClick={() => setExpanded(expanded === rec.health_id ? null : rec.health_id)}
                                            className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50">
                                            {expanded === rec.health_id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>

                                {expanded === rec.health_id && (
                                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                            {rec.height_cm && <div><p className="text-slate-400 font-bold uppercase tracking-wide text-[10px]">Height</p><p className="font-bold text-slate-700">{rec.height_cm} cm</p></div>}
                                            {rec.weight_kg && <div><p className="text-slate-400 font-bold uppercase tracking-wide text-[10px]">Weight</p><p className="font-bold text-slate-700">{rec.weight_kg} kg</p></div>}
                                            {rec.doctor_name && <div><p className="text-slate-400 font-bold uppercase tracking-wide text-[10px]">Doctor</p><p className="font-bold text-slate-700">{rec.doctor_name}</p></div>}
                                            {rec.insurance_provider && <div><p className="text-slate-400 font-bold uppercase tracking-wide text-[10px]">Insurance</p><p className="font-bold text-slate-700">{rec.insurance_provider}</p></div>}
                                        </div>
                                        {rec.allergies && <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Allergies</p><p className="text-xs text-slate-600">{rec.allergies}</p></div>}
                                        {rec.chronic_conditions && <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Chronic Conditions</p><p className="text-xs text-slate-600">{rec.chronic_conditions}</p></div>}
                                        {rec.current_medications && <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Medications</p><p className="text-xs text-slate-600">{rec.current_medications}</p></div>}
                                        {rec.notes && <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Notes</p><p className="text-xs text-slate-600">{rec.notes}</p></div>}

                                        {/* Immunizations */}
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Immunizations</p>
                                                <Dialog open={immOpen === rec.health_id} onOpenChange={o => setImmOpen(o ? rec.health_id : null)}>
                                                    <DialogTrigger asChild>
                                                        <Button size="sm" variant="outline" className="h-7 px-2 rounded-lg text-xs border-blue-200 text-blue-600 hover:bg-blue-50">
                                                            <Syringe className="h-3.5 w-3.5 mr-1" /> Add
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="sm:max-w-[400px]">
                                                        <DialogHeader><DialogTitle>Add Immunization</DialogTitle></DialogHeader>
                                                        <div className="space-y-3 pt-2">
                                                            <div className="space-y-1.5">
                                                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Vaccine Name</label>
                                                                <Input value={immForm.vaccine_name} onChange={e => setImmForm(f => ({ ...f, vaccine_name: e.target.value }))}
                                                                    className="rounded-xl border-slate-200 text-sm" required />
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-3">
                                                                <div className="space-y-1.5">
                                                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Date Given</label>
                                                                    <Input type="date" value={immForm.date_administered} onChange={e => setImmForm(f => ({ ...f, date_administered: e.target.value }))}
                                                                        className="rounded-xl border-slate-200 text-sm" />
                                                                </div>
                                                                <div className="space-y-1.5">
                                                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Next Due</label>
                                                                    <Input type="date" value={immForm.next_due_date} onChange={e => setImmForm(f => ({ ...f, next_due_date: e.target.value }))}
                                                                        className="rounded-xl border-slate-200 text-sm" />
                                                                </div>
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Administered By</label>
                                                                <Input value={immForm.administered_by} onChange={e => setImmForm(f => ({ ...f, administered_by: e.target.value }))}
                                                                    className="rounded-xl border-slate-200 text-sm" />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Remarks</label>
                                                                <Input value={immForm.remarks} onChange={e => setImmForm(f => ({ ...f, remarks: e.target.value }))}
                                                                    className="rounded-xl border-slate-200 text-sm" />
                                                            </div>
                                                            <Button onClick={() => handleAddImmunization(rec.health_id)} disabled={submitting || !immForm.vaccine_name}
                                                                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold">
                                                                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Add Immunization
                                                            </Button>
                                                        </div>
                                                    </DialogContent>
                                                </Dialog>
                                            </div>
                                            {rec.immunizations.length === 0 ? (
                                                <p className="text-xs text-slate-400">No immunization records.</p>
                                            ) : (
                                                <div className="space-y-1.5">
                                                    {rec.immunizations.map(imm => (
                                                        <div key={imm.immunization_id} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                                                            <Syringe className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-xs font-bold text-slate-700">{imm.vaccine_name}</p>
                                                                <p className="text-[10px] text-slate-400">
                                                                    {imm.date_administered && `Given: ${imm.date_administered}`}
                                                                    {imm.next_due_date && ` · Next: ${imm.next_due_date}`}
                                                                    {imm.administered_by && ` · ${imm.administered_by}`}
                                                                </p>
                                                            </div>
                                                            <button onClick={() => handleDeleteImmunization(rec.health_id, imm.immunization_id)}
                                                                className="h-6 w-6 flex items-center justify-center rounded text-slate-300 hover:text-red-400 hover:bg-red-50">
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
