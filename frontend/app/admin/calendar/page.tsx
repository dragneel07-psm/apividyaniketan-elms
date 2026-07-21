// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { eventsAPI, SchoolEvent } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import {
    ChevronLeft, ChevronRight, Plus, Trash2, Edit2,
    MapPin, Clock, Users, Calendar, Loader2,
} from 'lucide-react';

const EVENT_TYPE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
    holiday: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
    exam: { bg: 'bg-violet-100', text: 'text-violet-700', dot: 'bg-violet-500' },
    sports: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    cultural: { bg: 'bg-pink-100', text: 'text-pink-700', dot: 'bg-pink-500' },
    ptm: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
    academic: { bg: 'bg-indigo-100', text: 'text-indigo-700', dot: 'bg-indigo-500' },
    meeting: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
    other: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
};

const EVENT_TYPES = [
    { value: 'holiday', label: 'Public Holiday' },
    { value: 'exam', label: 'Examination' },
    { value: 'sports', label: 'Sports Event' },
    { value: 'cultural', label: 'Cultural Event' },
    { value: 'ptm', label: 'Parent-Teacher Meeting' },
    { value: 'academic', label: 'Academic Activity' },
    { value: 'meeting', label: 'Staff Meeting' },
    { value: 'other', label: 'Other' },
];

const AUDIENCE_OPTIONS = [
    { value: 'all', label: 'Everyone' },
    { value: 'students', label: 'Students' },
    { value: 'teachers', label: 'Teachers' },
    { value: 'parents', label: 'Parents' },
    { value: 'staff', label: 'Staff Only' },
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

const BLANK_FORM = {
    title: '', description: '', event_type: 'other', audience: 'all',
    start_date: '', end_date: '', start_time: '', end_time: '',
    is_all_day: true, location: '', is_holiday: false, color: '',
};

function isBetween(dateStr: string, startStr: string, endStr: string) {
    return dateStr >= startStr && dateStr <= endStr;
}

export default function CalendarPage() {
    const today = new Date();
    const [viewYear, setViewYear] = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-indexed
    const [events, setEvents] = useState<SchoolEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [editEvent, setEditEvent] = useState<SchoolEvent | null>(null);
    const [form, setForm] = useState({ ...BLANK_FORM });
    const [submitting, setSubmitting] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [typeFilter, setTypeFilter] = useState('');
    const { toast } = useToast();

    const monthStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await eventsAPI.getEvents({ month: monthStr });
            setEvents(Array.isArray(data) ? data : []);
        } catch { setEvents([]); }
        finally { setLoading(false); }
    }, [monthStr]);

    useEffect(() => { load(); }, [load]);

    // Build calendar grid
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const prevMonth = () => {
        if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
        else setViewMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
        else setViewMonth(m => m + 1);
    };

    const getEventsForDay = (day: number) => {
        const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return events.filter(e => {
            const match = isBetween(dateStr, e.start_date, e.end_date);
            return match && (!typeFilter || e.event_type === typeFilter);
        });
    };

    const selectedEvents = selectedDate
        ? events.filter(e => isBetween(selectedDate, e.start_date, e.end_date) && (!typeFilter || e.event_type === typeFilter))
        : [];

    const openCreate = (date?: string) => {
        setEditEvent(null);
        setForm({ ...BLANK_FORM, start_date: date ?? '', end_date: date ?? '' });
        setFormOpen(true);
    };

    const openEdit = (evt: SchoolEvent) => {
        setEditEvent(evt);
        setForm({
            title: evt.title, description: evt.description,
            event_type: evt.event_type, audience: evt.audience,
            start_date: evt.start_date, end_date: evt.end_date,
            start_time: evt.start_time ?? '', end_time: evt.end_time ?? '',
            is_all_day: evt.is_all_day, location: evt.location,
            is_holiday: evt.is_holiday, color: evt.color,
        });
        setFormOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const payload: any = {
                ...form,
                start_time: form.is_all_day ? null : (form.start_time || null),
                end_time: form.is_all_day ? null : (form.end_time || null),
            };
            if (editEvent) {
                await eventsAPI.updateEvent(editEvent.event_id, payload);
                toast({ title: 'Event updated.' });
            } else {
                await eventsAPI.createEvent(payload);
                toast({ title: 'Event created.' });
            }
            setFormOpen(false);
            setEditEvent(null);
            await load();
        } catch { toast({ title: 'Error', description: 'Failed to save event.', variant: 'destructive' }); }
        finally { setSubmitting(false); }
    };

    const handleDelete = async (id: string) => {
        setSubmitting(true);
        try {
            await eventsAPI.deleteEvent(id);
            toast({ title: 'Event deleted.' });
            setDeleteId(null);
            setSelectedDate(null);
            await load();
        } catch { toast({ title: 'Error', variant: 'destructive' }); }
        finally { setSubmitting(false); }
    };

    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900">School Calendar</h1>
                    <p className="text-sm text-slate-500 mt-1">Manage events, holidays, and school activities</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Type filter pills */}
                    <div className="flex bg-slate-100 rounded-xl p-1 gap-1 flex-wrap">
                        <button onClick={() => setTypeFilter('')}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${!typeFilter ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500'}`}>
                            All
                        </button>
                        {EVENT_TYPES.map(t => (
                            <button key={t.value} onClick={() => setTypeFilter(typeFilter === t.value ? '' : t.value)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${typeFilter === t.value ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500'}`}>
                                {t.label.split(' ')[0]}
                            </button>
                        ))}
                    </div>
                    <Button onClick={() => openCreate()} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold h-9 gap-2">
                        <Plus className="h-4 w-4" /> Add Event
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                {/* Calendar Grid */}
                <div className="xl:col-span-3">
                    <Card className="border-slate-200 shadow-sm">
                        <CardContent className="p-4">
                            {/* Month navigation */}
                            <div className="flex items-center justify-between mb-4">
                                <button onClick={prevMonth} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-100">
                                    <ChevronLeft className="h-4 w-4 text-slate-600" />
                                </button>
                                <h2 className="text-lg font-black text-slate-900">{MONTHS[viewMonth]} {viewYear}</h2>
                                <button onClick={nextMonth} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-100">
                                    <ChevronRight className="h-4 w-4 text-slate-600" />
                                </button>
                            </div>

                            {/* Day headers */}
                            <div className="grid grid-cols-7 mb-1">
                                {DAYS.map(d => (
                                    <div key={d} className="text-center text-[10px] font-black text-slate-400 uppercase tracking-wider py-1">{d}</div>
                                ))}
                            </div>

                            {/* Calendar cells */}
                            {loading ? (
                                <div className="h-64 flex items-center justify-center">
                                    <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
                                </div>
                            ) : (
                                <div className="grid grid-cols-7 gap-px bg-slate-100 rounded-xl overflow-hidden">
                                    {/* Empty cells before first day */}
                                    {Array.from({ length: firstDay }).map((_, i) => (
                                        <div key={`empty-${i}`} className="bg-slate-50 min-h-[80px]" />
                                    ))}
                                    {/* Day cells */}
                                    {Array.from({ length: daysInMonth }).map((_, i) => {
                                        const day = i + 1;
                                        const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                        const dayEvents = getEventsForDay(day);
                                        const isToday = dateStr === todayStr;
                                        const isSelected = dateStr === selectedDate;
                                        const isWeekend = new Date(viewYear, viewMonth, day).getDay() % 6 === 0;

                                        return (
                                            <div
                                                key={day}
                                                onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                                                className={`bg-white min-h-[80px] p-1.5 cursor-pointer transition-all hover:bg-slate-50 ${isSelected ? 'ring-2 ring-inset ring-indigo-400' : ''} ${isWeekend ? 'bg-slate-50/60' : ''}`}
                                            >
                                                <div className={`text-xs font-black w-6 h-6 flex items-center justify-center rounded-full mb-1 ${isToday ? 'bg-indigo-600 text-white' : 'text-slate-700'}`}>
                                                    {day}
                                                </div>
                                                <div className="space-y-0.5">
                                                    {dayEvents.slice(0, 3).map(ev => {
                                                        const colors = EVENT_TYPE_COLORS[ev.event_type] ?? EVENT_TYPE_COLORS.other;
                                                        return (
                                                            <div key={ev.event_id} className={`text-[9px] font-bold px-1 py-0.5 rounded truncate ${colors.bg} ${colors.text}`}>
                                                                {ev.title}
                                                            </div>
                                                        );
                                                    })}
                                                    {dayEvents.length > 3 && (
                                                        <div className="text-[9px] text-slate-400 font-bold pl-1">+{dayEvents.length - 3} more</div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                    {/* Selected day events */}
                    {selectedDate ? (
                        <Card className="border-slate-200 shadow-sm">
                            <CardContent className="p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-black text-slate-700">
                                        {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                                    </p>
                                    <Button size="sm" variant="outline" onClick={() => openCreate(selectedDate)}
                                        className="h-7 px-2 rounded-lg text-xs border-indigo-200 text-indigo-600 hover:bg-indigo-50">
                                        <Plus className="h-3 w-3 mr-1" /> Add
                                    </Button>
                                </div>
                                {selectedEvents.length === 0 ? (
                                    <p className="text-xs text-slate-400 text-center py-4">No events this day.</p>
                                ) : (
                                    selectedEvents.map(ev => {
                                        const colors = EVENT_TYPE_COLORS[ev.event_type] ?? EVENT_TYPE_COLORS.other;
                                        return (
                                            <div key={ev.event_id} className={`p-3 rounded-xl ${colors.bg} space-y-1.5`}>
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className={`text-xs font-black ${colors.text}`}>{ev.title}</p>
                                                    <div className="flex gap-1 flex-shrink-0">
                                                        <button onClick={() => openEdit(ev)} className={`h-6 w-6 flex items-center justify-center rounded hover:opacity-70 ${colors.text}`}>
                                                            <Edit2 className="h-3 w-3" />
                                                        </button>
                                                        <button onClick={() => setDeleteId(ev.event_id)} className="h-6 w-6 flex items-center justify-center rounded hover:opacity-70 text-red-500">
                                                            <Trash2 className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="space-y-0.5">
                                                    <Badge className={`text-[9px] font-bold px-1.5 py-0.5 ${colors.bg} ${colors.text} border-0`}>{ev.event_type_display}</Badge>
                                                    {ev.location && <p className={`text-[10px] flex items-center gap-1 ${colors.text}`}><MapPin className="h-3 w-3" />{ev.location}</p>}
                                                    {!ev.is_all_day && ev.start_time && <p className={`text-[10px] flex items-center gap-1 ${colors.text}`}><Clock className="h-3 w-3" />{ev.start_time}{ev.end_time ? ` – ${ev.end_time}` : ''}</p>}
                                                    {ev.audience !== 'all' && <p className={`text-[10px] flex items-center gap-1 ${colors.text}`}><Users className="h-3 w-3" />{ev.audience_display}</p>}
                                                    {ev.description && <p className={`text-[10px] mt-1 ${colors.text} opacity-80`}>{ev.description}</p>}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="border-dashed border-2 border-slate-200">
                            <CardContent className="py-8 text-center">
                                <Calendar className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                                <p className="text-xs text-slate-400">Click a day to see events</p>
                            </CardContent>
                        </Card>
                    )}

                    {/* This month summary */}
                    <Card className="border-slate-200 shadow-sm">
                        <CardContent className="p-4 space-y-2">
                            <p className="text-xs font-black text-slate-500 uppercase tracking-wide">This Month</p>
                            {EVENT_TYPES.map(t => {
                                const count = events.filter(e => e.event_type === t.value).length;
                                if (!count) return null;
                                const colors = EVENT_TYPE_COLORS[t.value];
                                return (
                                    <div key={t.value} className="flex items-center gap-2">
                                        <div className={`h-2 w-2 rounded-full ${colors.dot}`} />
                                        <span className="text-xs text-slate-600 flex-1">{t.label}</span>
                                        <span className="text-xs font-bold text-slate-700">{count}</span>
                                    </div>
                                );
                            })}
                            {events.length === 0 && <p className="text-xs text-slate-400">No events this month.</p>}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Event Form Dialog */}
            <Dialog open={formOpen} onOpenChange={o => { setFormOpen(o); if (!o) { setEditEvent(null); setForm({ ...BLANK_FORM }); } }}>
                <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle className="font-black">{editEvent ? 'Edit Event' : 'Add Event'}</DialogTitle></DialogHeader>
                    <form onSubmit={handleSave} className="space-y-4 pt-2">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Title</label>
                            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                placeholder="Event name..." className="rounded-xl border-slate-200 text-sm" required />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Type</label>
                                <select value={form.event_type} onChange={e => setForm(f => ({ ...f, event_type: e.target.value }))}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white">
                                    {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Audience</label>
                                <select value={form.audience} onChange={e => setForm(f => ({ ...f, audience: e.target.value }))}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white">
                                    {AUDIENCE_OPTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Start Date</label>
                                <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value, end_date: f.end_date || e.target.value }))}
                                    className="rounded-xl border-slate-200 text-sm" required />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">End Date</label>
                                <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                                    className="rounded-xl border-slate-200 text-sm" required />
                            </div>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={form.is_all_day} onChange={e => setForm(f => ({ ...f, is_all_day: e.target.checked }))} className="rounded" />
                            <span className="text-sm text-slate-700 font-medium">All-day event</span>
                        </label>
                        {!form.is_all_day && (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Start Time</label>
                                    <Input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                                        className="rounded-xl border-slate-200 text-sm" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">End Time</label>
                                    <Input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                                        className="rounded-xl border-slate-200 text-sm" />
                                </div>
                            </div>
                        )}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Location (optional)</label>
                            <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                                placeholder="e.g. Main Hall, Ground" className="rounded-xl border-slate-200 text-sm" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Description (optional)</label>
                            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                rows={2} className="rounded-xl border-slate-200 text-sm resize-none" />
                        </div>
                        <div className="flex gap-3 items-center">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={form.is_holiday} onChange={e => setForm(f => ({ ...f, is_holiday: e.target.checked }))} className="rounded" />
                                <span className="text-sm text-slate-700 font-medium">Mark as school holiday</span>
                            </label>
                        </div>
                        <div className="flex gap-3 pt-1">
                            <Button type="submit" disabled={submitting} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold">
                                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                {editEvent ? 'Update Event' : 'Create Event'}
                            </Button>
                            <Button type="button" variant="outline" onClick={() => setFormOpen(false)} className="rounded-xl">Cancel</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete confirmation */}
            <Dialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
                <DialogContent className="sm:max-w-[360px]">
                    <DialogHeader><DialogTitle>Delete Event</DialogTitle></DialogHeader>
                    <div className="space-y-4 pt-2">
                        <p className="text-sm text-slate-600">This event will be permanently deleted.</p>
                        <Button onClick={() => deleteId && handleDelete(deleteId)} disabled={submitting}
                            className="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold">
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Delete
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
