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
import { academicAPI, Parent } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import {
    CalendarClock, Plus, CheckCircle2, XCircle, Clock,
    CheckCheck, Loader2, Video, User
} from 'lucide-react';
import { useTranslation } from '@/lib/localization';
import { formatDate } from '@/lib/i18n/format';

export default function MeetingsPage() {
    const { t, locale } = useTranslation();

    const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
        pending: { label: t('parent.meetings.statusPending'), color: 'bg-amber-100 text-amber-700', icon: <Clock className="h-3.5 w-3.5" /> },
        confirmed: { label: t('parent.meetings.statusConfirmed'), color: 'bg-blue-100 text-blue-700', icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
        cancelled: { label: t('parent.meetings.statusCancelled'), color: 'bg-red-100 text-red-600', icon: <XCircle className="h-3.5 w-3.5" /> },
        completed: { label: t('parent.meetings.statusCompleted'), color: 'bg-emerald-100 text-emerald-700', icon: <CheckCheck className="h-3.5 w-3.5" /> },
    };

    const SLOTS = [
        { value: 'morning', label: t('parent.meetings.slotMorning'), time: t('parent.meetings.slotMorningTime') },
        { value: 'afternoon', label: t('parent.meetings.slotAfternoon'), time: t('parent.meetings.slotAfternoonTime') },
        { value: 'evening', label: t('parent.meetings.slotEvening'), time: t('parent.meetings.slotEveningTime') },
    ];

    const [meetings, setMeetings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [parentData, setParentData] = useState<Parent | null>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({
        student: '',
        teacher: '',
        requested_date: '',
        preferred_slot: 'morning',
        purpose: '',
    });
    const { toast } = useToast();

    const load = async () => {
        setLoading(true);
        try {
            const [mtgs, parent] = await Promise.all([
                academicAPI.getMeetings(),
                academicAPI.getMyParent(),
            ]);
            setMeetings(Array.isArray(mtgs) ? mtgs : []);
            setParentData(parent);
        } catch {
            setMeetings([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.student || !form.teacher || !form.requested_date || !form.purpose) {
            toast({ title: t('parent.meetings.errorMissingFields'), variant: 'destructive' });
            return;
        }
        setSubmitting(true);
        try {
            await academicAPI.requestMeeting(form);
            toast({ title: t('parent.meetings.successRequested') });
            setFormOpen(false);
            setForm({ student: '', teacher: '', requested_date: '', preferred_slot: 'morning', purpose: '' });
            await load();
        } catch {
            toast({ title: t('parent.meetings.errorSubmit'), variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = async (meetingId: string) => {
        try {
            await academicAPI.cancelMeeting(meetingId, 'Cancelled by parent');
            await load();
        } catch {
            toast({ title: t('parent.meetings.errorCancel'), variant: 'destructive' });
        }
    };

    return (
        <div className="p-6 md:p-8 space-y-6 max-w-4xl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-900">{t('parent.meetings.pageTitle')}</h1>
                    <p className="text-slate-500 text-sm">{t('parent.meetings.subtitle')}</p>
                </div>
                <Dialog open={formOpen} onOpenChange={setFormOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold h-9 gap-2">
                            <Plus className="h-4 w-4" /> {t('parent.meetings.btnRequestMeeting')}
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle className="font-black text-slate-900">{t('parent.meetings.dialogTitle')}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                            {/* Child selector */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">{t('parent.meetings.labelChild')}</label>
                                <select
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white"
                                    value={form.student}
                                    onChange={e => setForm(f => ({ ...f, student: e.target.value }))}
                                    required
                                >
                                    <option value="">{t('parent.meetings.placeholderChild')}</option>
                                    {(parentData?.students ?? []).map(s => (
                                        <option key={s.student_id} value={s.student_id}>
                                            {s.first_name} {s.last_name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Teacher ID */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">{t('parent.meetings.labelTeacherId')}</label>
                                <Input
                                    placeholder={t('parent.meetings.placeholderTeacherId')}
                                    value={form.teacher}
                                    onChange={e => setForm(f => ({ ...f, teacher: e.target.value }))}
                                    className="rounded-xl border-slate-200 text-sm"
                                    required
                                />
                            </div>

                            {/* Date */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">{t('parent.meetings.labelPreferredDate')}</label>
                                <Input
                                    type="date"
                                    value={form.requested_date}
                                    onChange={e => setForm(f => ({ ...f, requested_date: e.target.value }))}
                                    className="rounded-xl border-slate-200 text-sm"
                                    min={new Date().toISOString().split('T')[0]}
                                    required
                                />
                            </div>

                            {/* Time slot */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">{t('parent.meetings.labelPreferredSlot')}</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {SLOTS.map(slot => (
                                        <button
                                            key={slot.value}
                                            type="button"
                                            onClick={() => setForm(f => ({ ...f, preferred_slot: slot.value }))}
                                            className={`p-2 rounded-xl border text-xs font-bold transition-all text-center ${
                                                form.preferred_slot === slot.value
                                                    ? 'bg-violet-50 border-violet-300 text-violet-700'
                                                    : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                                            }`}
                                        >
                                            {slot.label}
                                            <br />
                                            <span className="text-[10px] font-normal opacity-70">
                                                {slot.time}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Purpose */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">{t('parent.meetings.labelPurpose')}</label>
                                <Textarea
                                    placeholder={t('parent.meetings.placeholderPurpose')}
                                    value={form.purpose}
                                    onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}
                                    rows={3}
                                    className="rounded-xl border-slate-200 text-sm resize-none"
                                    required
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <Button type="submit" disabled={submitting} className="flex-1 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-sm">
                                    {submitting
                                        ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {t('parent.meetings.btnSending')}</>
                                        : t('parent.meetings.btnSendRequest')}
                                </Button>
                                <Button type="button" variant="outline" onClick={() => setFormOpen(false)} className="rounded-xl border-slate-200 text-slate-600">
                                    {t('parent.meetings.btnCancel')}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-violet-400" /></div>
            ) : meetings.length === 0 ? (
                <Card className="border-dashed border-2 border-slate-200">
                    <CardContent className="py-16 text-center">
                        <CalendarClock className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                        <p className="text-slate-400 font-medium">{t('parent.meetings.noMeetings')}</p>
                        <p className="text-xs text-slate-400 mt-1">{t('parent.meetings.noMeetingsHint')}</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {meetings.map(m => {
                        const cfg = STATUS_CONFIG[m.status] ?? STATUS_CONFIG.pending;
                        const slot = SLOTS.find(s => s.value === m.preferred_slot);
                        return (
                            <Card key={m.meeting_id} className="border-slate-200 shadow-sm">
                                <CardContent className="p-5">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 flex-wrap">
                                                <Badge className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 ${cfg.color}`}>
                                                    {cfg.icon} {cfg.label}
                                                </Badge>
                                                <span className="text-xs text-slate-400">
                                                    {formatDate(new Date(m.created_at), locale)}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 mt-2 text-sm">
                                                <span className="flex items-center gap-1.5 font-bold text-slate-900">
                                                    <User className="h-4 w-4 text-slate-400" />
                                                    {m.student_name}
                                                </span>
                                                <span className="text-slate-400">↔</span>
                                                <span className="font-medium text-slate-600">{m.teacher_name}</span>
                                            </div>
                                            <div className="mt-1 flex items-center gap-4 text-xs text-slate-500">
                                                <span className="flex items-center gap-1">
                                                    <CalendarClock className="h-3 w-3" />
                                                    {formatDate(new Date(m.requested_date), locale)} · {slot ? `${slot.label} ${slot.time}` : m.preferred_slot}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-2 line-clamp-2">{m.purpose}</p>

                                            {m.status === 'confirmed' && m.meeting_link && (
                                                <a href={m.meeting_link} target="_blank" rel="noreferrer"
                                                    className="inline-flex items-center gap-1.5 mt-2 text-xs font-bold text-blue-600 hover:underline">
                                                    <Video className="h-3.5 w-3.5" /> {t('parent.meetings.joinMeeting')}
                                                </a>
                                            )}

                                            {m.status === 'confirmed' && m.confirmed_datetime && (
                                                <p className="text-xs text-blue-600 mt-1 font-medium">
                                                    {t('parent.meetings.confirmed', { datetime: formatDate(new Date(m.confirmed_datetime), locale) })}
                                                </p>
                                            )}

                                            {m.meeting_notes && (
                                                <div className="mt-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
                                                    <p className="text-xs text-slate-500 italic">{m.meeting_notes}</p>
                                                </div>
                                            )}
                                        </div>

                                        {m.status === 'pending' && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleCancel(m.meeting_id)}
                                                className="text-red-600 border-red-200 hover:bg-red-50 rounded-lg text-xs h-8 px-3 flex-shrink-0"
                                            >
                                                <XCircle className="h-3.5 w-3.5 mr-1" /> {t('parent.meetings.btnCancelMeeting')}
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
