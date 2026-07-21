// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowDown, ArrowUp, CheckCircle2, Copy, Loader2, Plus, Save, Trash2, XCircle } from 'lucide-react';
import { academicAPI, AcademicClass, Teacher, Timetable, TimetableOverview } from '@/lib/api';
import { toast } from 'sonner';

interface ManageScheduleDialogProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    trigger?: React.ReactNode;
}

type EntryFilter = 'all' | 'main' | 'extra';
type PendingScope = 'selected' | 'all';
type MainDraftRow = {
    row_id: string;
    day_of_week: string;
    start_time: string;
    end_time: string;
    subject_name: string;
    room_number: string;
    teacher: string;
};

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function makeRowId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createDraftRow(partial?: Partial<MainDraftRow>): MainDraftRow {
    return {
        row_id: partial?.row_id || makeRowId(),
        day_of_week: partial?.day_of_week || 'Monday',
        start_time: partial?.start_time || '',
        end_time: partial?.end_time || '',
        subject_name: partial?.subject_name || '',
        room_number: partial?.room_number || '',
        teacher: partial?.teacher || '',
    };
}

export function ManageScheduleDialog({ open, onOpenChange, trigger }: ManageScheduleDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [copyLoading, setCopyLoading] = useState(false);
    const [classes, setClasses] = useState<AcademicClass[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [copySourceClass, setCopySourceClass] = useState('');
    const [copyOverwrite, setCopyOverwrite] = useState(true);
    const [entryFilter, setEntryFilter] = useState<EntryFilter>('all');
    const [pendingScope, setPendingScope] = useState<PendingScope>('selected');
    const [overview, setOverview] = useState<TimetableOverview | null>(null);
    const [pendingRequests, setPendingRequests] = useState<Timetable[]>([]);
    const [approvalComments, setApprovalComments] = useState<Record<number, string>>({});
    const [bulkSaving, setBulkSaving] = useState(false);
    const [draftRows, setDraftRows] = useState<MainDraftRow[]>([]);
    const [draftOverwrite, setDraftOverwrite] = useState(true);

    const [formData, setFormData] = useState({
        day_of_week: 'Monday',
        start_time: '',
        end_time: '',
        subject_name: '',
        room_number: '',
        teacher: '',
    });

    const effectiveOpen = open !== undefined ? open : isOpen;

    const handleOpenChange = (value: boolean) => {
        setIsOpen(value);
        if (onOpenChange) onOpenChange(value);
    };

    const refreshPendingRequests = useCallback(async () => {
        try {
            const data = await academicAPI.getPendingTimetableRequests();
            setPendingRequests(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to load pending timetable requests', error);
            setPendingRequests([]);
        }
    }, []);

    const refreshClassOverview = useCallback(async () => {
        if (!selectedClass) {
            setOverview(null);
            return;
        }
        try {
            const response = await academicAPI.getTimetableOverview(selectedClass);
            setOverview(response);
        } catch (error) {
            console.error('Failed to load timetable overview', error);
            setOverview(null);
            toast.error('Failed to load timetable overview');
        }
    }, [selectedClass]);

    useEffect(() => {
        if (!effectiveOpen) return;
        const loadDependencies = async () => {
            try {
                const [classesData, teachersData] = await Promise.all([
                    academicAPI.getClasses(),
                    academicAPI.getTeachers(),
                ]);
                const safeClasses = Array.isArray(classesData) ? classesData : [];
                setClasses(safeClasses);
                setTeachers(Array.isArray(teachersData) ? teachersData : []);

                if (!selectedClass && safeClasses.length > 0) {
                    const firstClassId = String(safeClasses[0].id);
                    setSelectedClass(firstClassId);
                    setCopySourceClass(firstClassId);
                }
            } catch (error) {
                console.error('Failed to load timetable manager dependencies', error);
                toast.error('Failed to load timetable manager');
            }
        };
        void loadDependencies();
    }, [effectiveOpen, selectedClass]);

    useEffect(() => {
        if (!effectiveOpen) return;
        void refreshPendingRequests();
    }, [effectiveOpen, refreshPendingRequests]);

    useEffect(() => {
        if (!effectiveOpen) return;
        void refreshClassOverview();
    }, [effectiveOpen, refreshClassOverview]);

    useEffect(() => {
        if (!selectedClass) return;
        if (copySourceClass && copySourceClass !== selectedClass) return;
        const fallbackSource = classes.find((item) => String(item.id) !== selectedClass);
        setCopySourceClass(fallbackSource ? String(fallbackSource.id) : '');
    }, [classes, copySourceClass, selectedClass]);

    const filteredSlotsByDay = useMemo(() => {
        const base: Record<string, Timetable[]> = WEEK_DAYS.reduce((acc, day) => {
            acc[day] = [];
            return acc;
        }, {} as Record<string, Timetable[]>);

        const allSlots = overview?.days.flatMap((day) => day.slots) ?? [];
        for (const slot of allSlots) {
            if (entryFilter !== 'all' && slot.entry_type !== entryFilter) continue;
            if (!base[slot.day_of_week]) base[slot.day_of_week] = [];
            base[slot.day_of_week].push(slot);
        }

        for (const day of WEEK_DAYS) {
            base[day].sort((a, b) => a.start_time.localeCompare(b.start_time));
        }
        return base;
    }, [entryFilter, overview]);

    const visiblePendingRequests = useMemo(() => {
        if (pendingScope === 'all') return pendingRequests;
        if (!selectedClass) return [];
        return pendingRequests.filter((request) => String(request.academic_class) === selectedClass);
    }, [pendingRequests, pendingScope, selectedClass]);

    const handleAddMainSlot = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!selectedClass) return;

        setLoading(true);
        try {
            const created = await academicAPI.createTimetable({
                academic_class: selectedClass,
                day_of_week: formData.day_of_week,
                start_time: formData.start_time,
                end_time: formData.end_time,
                subject_name: formData.subject_name,
                room_number: formData.room_number,
                teacher: formData.teacher || null,
                entry_type: 'main',
                status: 'approved',
            });

            // Optimistically add the new slot to overview so it appears instantly
            setOverview((prev) => {
                if (!prev) return prev;
                const newSlot: Timetable = {
                    timetable_id: created.timetable_id,
                    day_of_week: created.day_of_week,
                    start_time: created.start_time,
                    end_time: created.end_time,
                    subject_name: created.subject_name,
                    room_number: created.room_number || '',
                    teacher: created.teacher ?? null,
                    teacher_name: created.teacher_name,
                    entry_type: 'main',
                    status: 'approved',
                    academic_class: Number(selectedClass),
                };
                const dayIndex = prev.days.findIndex((d) => d.day_of_week === newSlot.day_of_week);
                let updatedDays;
                if (dayIndex >= 0) {
                    updatedDays = prev.days.map((d, i) =>
                        i === dayIndex ? { ...d, slots: [...d.slots, newSlot], total_slots: d.total_slots + 1, main_slots: d.main_slots + 1, approved_slots: d.approved_slots + 1 } : d,
                    );
                } else {
                    updatedDays = [...prev.days, { day_of_week: newSlot.day_of_week, slots: [newSlot], total_slots: 1, main_slots: 1, extra_slots: 0, approved_slots: 1 }];
                }
                return {
                    ...prev,
                    days: updatedDays,
                    total_slots: prev.total_slots + 1,
                    main_slots: prev.main_slots + 1,
                    approved_slots: prev.approved_slots + 1,
                };
            });

            setFormData((prev) => ({
                ...prev,
                subject_name: '',
                room_number: '',
                teacher: '',
            }));
            toast.success('Main timetable slot created');
            // Refresh in background to sync server state
            void refreshClassOverview();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            toast.error(`Failed to create slot: ${message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteSlot = async (id: number) => {
        if (!confirm('Delete this timetable slot?')) return;
        try {
            await academicAPI.deleteTimetable(id);
            await Promise.all([refreshClassOverview(), refreshPendingRequests()]);
            toast.success('Timetable slot deleted');
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            toast.error(`Failed to delete slot: ${message}`);
        }
    };

    const handleApproveRequest = async (requestId: number, status: 'approved' | 'rejected') => {
        try {
            await academicAPI.approveTimetableRequest(requestId, {
                status,
                approval_comment: approvalComments[requestId] || '',
            });
            setApprovalComments((prev) => ({ ...prev, [requestId]: '' }));
            await Promise.all([refreshClassOverview(), refreshPendingRequests()]);
            toast.success(status === 'approved' ? 'Extra class approved' : 'Extra class rejected');
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            toast.error(`Failed to update request: ${message}`);
        }
    };

    const handleCopyMainTimetable = async () => {
        if (!selectedClass || !copySourceClass) {
            toast.error('Select both source and target classes.');
            return;
        }

        setCopyLoading(true);
        try {
            const response = await academicAPI.cloneMainTimetable(copySourceClass, selectedClass, copyOverwrite);
            await Promise.all([refreshClassOverview(), refreshPendingRequests()]);
            toast.success(`Copied ${response.created_count || 0} main slots to selected class.`);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            toast.error(`Failed to copy timetable: ${message}`);
        } finally {
            setCopyLoading(false);
        }
    };

    const buildDraftFromOverview = useCallback((data: TimetableOverview | null): MainDraftRow[] => {
        if (!data) return [];
        return data.days
            .flatMap((day) => day.slots)
            .filter((slot) => slot.entry_type === 'main')
            .sort((a, b) => {
                const dayA = WEEK_DAYS.indexOf(a.day_of_week);
                const dayB = WEEK_DAYS.indexOf(b.day_of_week);
                if (dayA !== dayB) return dayA - dayB;
                return a.start_time.localeCompare(b.start_time);
            })
            .map((slot) =>
                createDraftRow({
                    day_of_week: slot.day_of_week,
                    start_time: slot.start_time?.slice(0, 5) || '',
                    end_time: slot.end_time?.slice(0, 5) || '',
                    subject_name: slot.subject_name || '',
                    room_number: slot.room_number || '',
                    teacher: slot.teacher ? String(slot.teacher) : '',
                }),
            );
    }, []);

    const handleLoadCurrentToDraft = useCallback(() => {
        const nextRows = buildDraftFromOverview(overview);
        setDraftRows(nextRows);
        toast.success(`Loaded ${nextRows.length} main slots into editor.`);
    }, [buildDraftFromOverview, overview]);

    const handleAddDraftRow = () => {
        setDraftRows((prev) => [...prev, createDraftRow()]);
    };

    const updateDraftRow = (rowId: string, patch: Partial<MainDraftRow>) => {
        setDraftRows((prev) => prev.map((row) => (row.row_id === rowId ? { ...row, ...patch } : row)));
    };

    const removeDraftRow = (rowId: string) => {
        setDraftRows((prev) => prev.filter((row) => row.row_id !== rowId));
    };

    const moveDraftRow = (index: number, direction: -1 | 1) => {
        setDraftRows((prev) => {
            const targetIndex = index + direction;
            if (targetIndex < 0 || targetIndex >= prev.length) return prev;
            const next = [...prev];
            const current = next[index];
            next[index] = next[targetIndex];
            next[targetIndex] = current;
            return next;
        });
    };

    const sortDraftRows = () => {
        setDraftRows((prev) =>
            [...prev].sort((a, b) => {
                const dayA = WEEK_DAYS.indexOf(a.day_of_week);
                const dayB = WEEK_DAYS.indexOf(b.day_of_week);
                if (dayA !== dayB) return dayA - dayB;
                return a.start_time.localeCompare(b.start_time);
            }),
        );
    };

    const validateDraftRows = () => {
        if (draftRows.length === 0) {
            return 'Add at least one row in the editor.';
        }
        for (let index = 0; index < draftRows.length; index += 1) {
            const row = draftRows[index];
            if (!row.day_of_week || !row.start_time || !row.end_time || !row.subject_name.trim()) {
                return `Row ${index + 1} is incomplete.`;
            }
            if (row.start_time >= row.end_time) {
                return `Row ${index + 1} has invalid time range.`;
            }
        }
        return '';
    };

    const handleSaveDraftRows = async () => {
        if (!selectedClass) {
            toast.error('Select class first.');
            return;
        }

        const validationError = validateDraftRows();
        if (validationError) {
            toast.error(validationError);
            return;
        }

        setBulkSaving(true);
        try {
            const payload = draftRows.map((row) => ({
                day_of_week: row.day_of_week,
                start_time: row.start_time,
                end_time: row.end_time,
                subject_name: row.subject_name.trim(),
                room_number: row.room_number.trim() || null,
                teacher: row.teacher || null,
            }));

            const response = await academicAPI.bulkReplaceMainTimetable(selectedClass, payload, draftOverwrite);
            await Promise.all([refreshClassOverview(), refreshPendingRequests()]);
            toast.success(`Saved ${response.created_count || payload.length} main timetable slots.`);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            toast.error(`Failed to save weekly editor: ${message}`);
        } finally {
            setBulkSaving(false);
        }
    };

    return (
        <Dialog open={effectiveOpen} onOpenChange={handleOpenChange}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="sm:max-w-[1100px] h-[88vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Timetable Management Console</DialogTitle>
                    <DialogDescription>
                        High-performance class scheduling with overview analytics, quick copy, and extra-class approvals.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-wrap gap-3 items-center py-4 border-b">
                    <div className="flex items-center gap-2">
                        <Label>Class</Label>
                        <Select value={selectedClass} onValueChange={setSelectedClass}>
                            <SelectTrigger className="w-[220px]">
                                <SelectValue placeholder="Select class" />
                            </SelectTrigger>
                            <SelectContent>
                                {classes.map((item) => (
                                    <SelectItem key={item.id} value={String(item.id)}>
                                        {item.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center gap-2">
                        <Label>View</Label>
                        <Select value={entryFilter} onValueChange={(value) => setEntryFilter(value as EntryFilter)}>
                            <SelectTrigger className="w-[140px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Slots</SelectItem>
                                <SelectItem value="main">Main Only</SelectItem>
                                <SelectItem value="extra">Extra Only</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4">
                    <div className="rounded-lg border bg-slate-50 p-3">
                        <p className="text-[11px] text-slate-500">Total Slots</p>
                        <p className="text-lg font-semibold">{overview?.total_slots ?? 0}</p>
                    </div>
                    <div className="rounded-lg border bg-slate-50 p-3">
                        <p className="text-[11px] text-slate-500">Main Slots</p>
                        <p className="text-lg font-semibold">{overview?.main_slots ?? 0}</p>
                    </div>
                    <div className="rounded-lg border bg-slate-50 p-3">
                        <p className="text-[11px] text-slate-500">Extra Slots</p>
                        <p className="text-lg font-semibold">{overview?.extra_slots ?? 0}</p>
                    </div>
                    <div className="rounded-lg border bg-slate-50 p-3">
                        <p className="text-[11px] text-slate-500">Pending</p>
                        <p className="text-lg font-semibold">{overview?.pending_slots ?? 0}</p>
                    </div>
                </div>

                <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden pt-4">
                    <div className="lg:col-span-2 overflow-y-auto space-y-4 pr-2">
                        <div className="border rounded-lg p-4 bg-white">
                            <h3 className="font-semibold text-sm mb-4 text-slate-800">Class Timetable by Day</h3>
                            <div className="space-y-4">
                                {WEEK_DAYS.map((day) => {
                                    const daySlots = filteredSlotsByDay[day] || [];
                                    if (daySlots.length === 0) return null;

                                    return (
                                        <div key={day} className="border rounded-md p-3">
                                            <h4 className="font-semibold text-xs text-indigo-600 mb-2">{day}</h4>
                                            <div className="space-y-2">
                                                {daySlots.map((slot) => (
                                                    <div
                                                        key={slot.timetable_id}
                                                        className="text-xs flex justify-between items-center bg-slate-50 p-2 rounded"
                                                    >
                                                        <div className="space-y-1">
                                                            <div>
                                                                {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                                                                {' : '}
                                                                <strong>{slot.subject_name}</strong>
                                                                {slot.room_number ? ` (${slot.room_number})` : ''}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <Badge variant={slot.entry_type === 'extra' ? 'secondary' : 'default'}>
                                                                    {slot.entry_type === 'extra' ? 'Extra' : 'Main'}
                                                                </Badge>
                                                                <Badge variant={slot.status === 'approved' ? 'outline' : 'destructive'}>
                                                                    {slot.status || 'approved'}
                                                                </Badge>
                                                                {slot.teacher_name && (
                                                                    <span className="text-slate-500">Teacher: {slot.teacher_name}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-6 w-6 p-0 text-red-500"
                                                            onClick={() => handleDeleteSlot(slot.timetable_id)}
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                                {(overview?.total_slots || 0) === 0 && (
                                    <div className="text-center text-slate-500 py-8">
                                        No timetable entries found for this class.
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="border rounded-lg p-4 bg-white">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-sm text-slate-800">Pending Extra Class Requests</h3>
                                <Select value={pendingScope} onValueChange={(value) => setPendingScope(value as PendingScope)}>
                                    <SelectTrigger className="w-[180px] h-8 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="selected">Selected Class Only</SelectItem>
                                        <SelectItem value="all">All Classes</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                {visiblePendingRequests.length === 0 ? (
                                    <div className="text-center text-slate-500 py-6">No pending requests.</div>
                                ) : (
                                    visiblePendingRequests.map((request) => (
                                        <div key={request.timetable_id} className="rounded-md border p-3 bg-slate-50">
                                            <div className="space-y-2 text-xs">
                                                <div className="font-semibold text-slate-800">
                                                    {request.subject_name} ({request.day_of_week} {request.start_time.slice(0, 5)}-{request.end_time.slice(0, 5)})
                                                </div>
                                                <div className="text-slate-600">
                                                    Class: {request.academic_class_name || request.academic_class}
                                                    {request.room_number ? ` • Room: ${request.room_number}` : ''}
                                                </div>
                                                <div className="text-slate-500">
                                                    Requested by: {request.created_by_name || request.teacher_name || 'Teacher'}
                                                </div>
                                            </div>
                                            <Input
                                                className="mt-2 h-8 text-xs"
                                                placeholder="Approval note (optional)"
                                                value={approvalComments[request.timetable_id] || ''}
                                                onChange={(event) =>
                                                    setApprovalComments((prev) => ({
                                                        ...prev,
                                                        [request.timetable_id]: event.target.value,
                                                    }))
                                                }
                                            />
                                            <div className="flex items-center gap-2 mt-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                                    onClick={() => handleApproveRequest(request.timetable_id, 'approved')}
                                                >
                                                    <CheckCircle2 className="h-4 w-4 mr-1" />
                                                    Approve
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-red-600 border-red-200 hover:bg-red-50"
                                                    onClick={() => handleApproveRequest(request.timetable_id, 'rejected')}
                                                >
                                                    <XCircle className="h-4 w-4 mr-1" />
                                                    Reject
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 overflow-y-auto pr-1">
                        <div className="bg-slate-50 p-4 rounded-lg border">
                            <h3 className="font-semibold mb-4">Create Main Slot</h3>
                            <form onSubmit={handleAddMainSlot} className="space-y-3">
                                <div className="grid gap-1">
                                    <Label className="text-xs">Day</Label>
                                    <Select
                                        value={formData.day_of_week}
                                        onValueChange={(value) => setFormData((prev) => ({ ...prev, day_of_week: value }))}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {WEEK_DAYS.map((day) => (
                                                <SelectItem key={day} value={day}>{day}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div className="grid gap-1">
                                        <Label className="text-xs">Start</Label>
                                        <Input
                                            type="time"
                                            required
                                            value={formData.start_time}
                                            onChange={(event) => setFormData((prev) => ({ ...prev, start_time: event.target.value }))}
                                        />
                                    </div>
                                    <div className="grid gap-1">
                                        <Label className="text-xs">End</Label>
                                        <Input
                                            type="time"
                                            required
                                            value={formData.end_time}
                                            onChange={(event) => setFormData((prev) => ({ ...prev, end_time: event.target.value }))}
                                        />
                                    </div>
                                </div>

                                <div className="grid gap-1">
                                    <Label className="text-xs">Subject</Label>
                                    <Input
                                        required
                                        placeholder="Physics"
                                        value={formData.subject_name}
                                        onChange={(event) => setFormData((prev) => ({ ...prev, subject_name: event.target.value }))}
                                    />
                                </div>

                                <div className="grid gap-1">
                                    <Label className="text-xs">Room</Label>
                                    <Input
                                        placeholder="101"
                                        value={formData.room_number}
                                        onChange={(event) => setFormData((prev) => ({ ...prev, room_number: event.target.value }))}
                                    />
                                </div>

                                <div className="grid gap-1">
                                    <Label className="text-xs">Teacher (optional)</Label>
                                    <Select
                                        value={formData.teacher || 'none'}
                                        onValueChange={(value) =>
                                            setFormData((prev) => ({ ...prev, teacher: value === 'none' ? '' : value }))
                                        }
                                    >
                                        <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Unassigned</SelectItem>
                                            {teachers.map((teacher) => (
                                                <SelectItem key={teacher.id} value={teacher.id}>
                                                    {teacher.first_name} {teacher.last_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <Button type="submit" size="sm" className="w-full mt-2" disabled={loading || !selectedClass}>
                                    {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
                                    Add Main Slot
                                </Button>
                            </form>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-lg border">
                            <h3 className="font-semibold mb-3">Copy Main Timetable</h3>
                            <p className="text-xs text-slate-500 mb-3">
                                Clone approved main slots from another class to the selected class.
                            </p>

                            <div className="space-y-3">
                                <div className="grid gap-1">
                                    <Label className="text-xs">Source Class</Label>
                                    <Select value={copySourceClass} onValueChange={setCopySourceClass}>
                                        <SelectTrigger><SelectValue placeholder="Select source class" /></SelectTrigger>
                                        <SelectContent>
                                            {classes
                                                .filter((item) => String(item.id) !== selectedClass)
                                                .map((item) => (
                                                    <SelectItem key={item.id} value={String(item.id)}>
                                                        {item.name}
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <label className="flex items-center gap-2 text-xs text-slate-700">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-slate-300"
                                        checked={copyOverwrite}
                                        onChange={(event) => setCopyOverwrite(event.target.checked)}
                                    />
                                    Overwrite existing main slots in target class
                                </label>

                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full"
                                    onClick={handleCopyMainTimetable}
                                    disabled={!selectedClass || !copySourceClass || copyLoading}
                                >
                                    {copyLoading ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <Copy className="h-4 w-4 mr-2" />
                                    )}
                                    Copy Main Timetable
                                </Button>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-lg border">
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <h3 className="font-semibold">Weekly Grid Editor</h3>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Edit all main timetable slots and save in one bulk operation.
                                    </p>
                                </div>
                                <Badge variant="secondary">{draftRows.length} rows</Badge>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 mt-3">
                                <Button type="button" variant="outline" size="sm" onClick={handleLoadCurrentToDraft}>
                                    Load Current
                                </Button>
                                <Button type="button" variant="outline" size="sm" onClick={handleAddDraftRow}>
                                    <Plus className="h-3 w-3 mr-1" />
                                    Add Row
                                </Button>
                                <Button type="button" variant="outline" size="sm" onClick={sortDraftRows} disabled={draftRows.length < 2}>
                                    Sort by Day/Time
                                </Button>
                            </div>

                            <label className="flex items-center gap-2 text-xs text-slate-700 mt-3">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-slate-300"
                                    checked={draftOverwrite}
                                    onChange={(event) => setDraftOverwrite(event.target.checked)}
                                />
                                Replace existing main timetable before save
                            </label>

                            <div className="space-y-3 mt-3 max-h-[320px] overflow-y-auto pr-1">
                                {draftRows.length === 0 ? (
                                    <div className="text-xs text-slate-500 border rounded-md p-3 bg-white">
                                        No rows in editor. Click <strong>Load Current</strong> or <strong>Add Row</strong>.
                                    </div>
                                ) : (
                                    draftRows.map((row, index) => (
                                        <div key={row.row_id} className="rounded-md border bg-white p-2 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] font-medium text-slate-500">Row {index + 1}</span>
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 w-6 p-0"
                                                        onClick={() => moveDraftRow(index, -1)}
                                                        disabled={index === 0}
                                                    >
                                                        <ArrowUp className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 w-6 p-0"
                                                        onClick={() => moveDraftRow(index, 1)}
                                                        disabled={index === draftRows.length - 1}
                                                    >
                                                        <ArrowDown className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 w-6 p-0 text-red-500"
                                                        onClick={() => removeDraftRow(row.row_id)}
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2">
                                                <Select
                                                    value={row.day_of_week}
                                                    onValueChange={(value) => updateDraftRow(row.row_id, { day_of_week: value })}
                                                >
                                                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        {WEEK_DAYS.map((day) => (
                                                            <SelectItem key={day} value={day}>{day}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>

                                                <Select
                                                    value={row.teacher || 'none'}
                                                    onValueChange={(value) => updateDraftRow(row.row_id, { teacher: value === 'none' ? '' : value })}
                                                >
                                                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Teacher" /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="none">Unassigned</SelectItem>
                                                        {teachers.map((teacher) => (
                                                            <SelectItem key={teacher.id} value={teacher.id}>
                                                                {teacher.first_name} {teacher.last_name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>

                                                <Input
                                                    className="h-8 text-xs"
                                                    type="time"
                                                    value={row.start_time}
                                                    onChange={(event) => updateDraftRow(row.row_id, { start_time: event.target.value })}
                                                />
                                                <Input
                                                    className="h-8 text-xs"
                                                    type="time"
                                                    value={row.end_time}
                                                    onChange={(event) => updateDraftRow(row.row_id, { end_time: event.target.value })}
                                                />

                                                <Input
                                                    className="h-8 text-xs col-span-2"
                                                    placeholder="Subject"
                                                    value={row.subject_name}
                                                    onChange={(event) => updateDraftRow(row.row_id, { subject_name: event.target.value })}
                                                />
                                                <Input
                                                    className="h-8 text-xs col-span-2"
                                                    placeholder="Room (optional)"
                                                    value={row.room_number}
                                                    onChange={(event) => updateDraftRow(row.row_id, { room_number: event.target.value })}
                                                />
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <Button
                                type="button"
                                className="w-full mt-3"
                                onClick={handleSaveDraftRows}
                                disabled={bulkSaving || !selectedClass || draftRows.length === 0}
                            >
                                {bulkSaving ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <Save className="h-4 w-4 mr-2" />
                                )}
                                Save Weekly Editor
                            </Button>
                        </div>
                    </div>
                </div>

                <DialogFooter className="mt-4 pt-4 border-t">
                    <Button variant="outline" onClick={() => handleOpenChange(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
