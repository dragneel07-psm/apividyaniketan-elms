// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, Loader2, MapPin, Plus, School, Trash2, Video, VideoOff } from 'lucide-react';
import { academicAPI, liveSessionAPI, LiveSession, Timetable, Teacher, AcademicClass } from '@/lib/api';
import { toast } from 'sonner';

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function TeacherTimetablePage() {
    const [loading, setLoading] = useState(true);
    const [teacherProfile, setTeacherProfile] = useState<Teacher | null>(null);
    const [assignedClasses, setAssignedClasses] = useState<AcademicClass[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [classTimetable, setClassTimetable] = useState<Timetable[]>([]);
    const [myRequests, setMyRequests] = useState<Timetable[]>([]);
    const [activeDay, setActiveDay] = useState(new Date().toLocaleDateString('en-US', { weekday: 'long' }));
    const [requestSubmitting, setRequestSubmitting] = useState(false);
    // Map of timetable_id → active LiveSession
    const [activeSessions, setActiveSessions] = useState<Record<number, LiveSession>>({});
    const [sessionLoading, setSessionLoading] = useState<Record<number, boolean>>({});

    const [requestForm, setRequestForm] = useState({
        academic_class: '',
        day_of_week: 'Monday',
        start_time: '',
        end_time: '',
        subject_name: '',
        room_number: '',
    });

    const refreshMyRequests = async (options?: {
        teacherId?: string;
        assignedClassIds?: number[];
        optimisticRequest?: Timetable;
    }) => {
        try {
            const requests = await academicAPI.getMyTimetableRequests();
            let normalized = Array.isArray(requests) ? requests : [];

            if (normalized.length === 0 && options?.teacherId) {
                const fallback = await academicAPI.getTimetable({ entry_type: 'extra' });
                const teacherId = options.teacherId;
                const assignedClassIds = options.assignedClassIds || [];
                normalized = (Array.isArray(fallback) ? fallback : []).filter((request) => {
                    const requestTeacherId = String(request.teacher || '');
                    const requestClassId = Number(request.academic_class);
                    const isAssignedClass = Number.isFinite(requestClassId) && assignedClassIds.includes(requestClassId);
                    return requestTeacherId === teacherId || isAssignedClass;
                });
            }

            if (options?.optimisticRequest) {
                const optimisticId = Number(options.optimisticRequest.timetable_id || 0);
                const alreadyPresent = normalized.some((request) => Number(request.timetable_id || 0) === optimisticId);
                if (!alreadyPresent) {
                    normalized = [options.optimisticRequest, ...normalized];
                }
            }

            normalized.sort((a, b) => Number(b.timetable_id || 0) - Number(a.timetable_id || 0));
            setMyRequests(normalized);
        } catch (error) {
            console.error('Failed to load extra class requests', error);
            if (options?.optimisticRequest) {
                const optimisticRequest = options.optimisticRequest;
                setMyRequests((previous) => {
                    const optimisticId = Number(optimisticRequest.timetable_id || 0);
                    const alreadyPresent = previous.some((request) => Number(request.timetable_id || 0) === optimisticId);
                    if (alreadyPresent) return previous;
                    return [optimisticRequest, ...previous];
                });
                return;
            }
            setMyRequests([]);
        }
    };

    const loadActiveSessions = useCallback(async () => {
        try {
            const sessions = await liveSessionAPI.getActive();
            const map: Record<number, LiveSession> = {};
            sessions.forEach((s) => { map[s.timetable] = s; });
            setActiveSessions(map);
        } catch {
            // silently ignore — polling failures shouldn't break the page
        }
    }, []);

    const handleStartClass = async (slot: Timetable) => {
        setSessionLoading((prev) => ({ ...prev, [slot.timetable_id]: true }));
        try {
            const session = await liveSessionAPI.start(slot.timetable_id);
            setActiveSessions((prev) => ({ ...prev, [slot.timetable_id]: session }));
            window.open(session.jitsi_url, '_blank', 'noopener,noreferrer');
            toast.success(`Class started — Jitsi room opened`);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Failed to start class';
            toast.error(message);
        } finally {
            setSessionLoading((prev) => ({ ...prev, [slot.timetable_id]: false }));
        }
    };

    const handleEndClass = async (slot: Timetable) => {
        const session = activeSessions[slot.timetable_id];
        if (!session) return;
        setSessionLoading((prev) => ({ ...prev, [slot.timetable_id]: true }));
        try {
            await liveSessionAPI.end(session.session_id);
            setActiveSessions((prev) => {
                const next = { ...prev };
                delete next[slot.timetable_id];
                return next;
            });
            toast.success('Class ended');
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Failed to end class';
            toast.error(message);
        } finally {
            setSessionLoading((prev) => ({ ...prev, [slot.timetable_id]: false }));
        }
    };

    useEffect(() => {
        const loadTeacherContext = async () => {
            try {
                const [me, allClasses] = await Promise.all([
                    academicAPI.getMyTeacherProfile(),
                    academicAPI.getClasses(),
                ]);

                setTeacherProfile(me);

                const classMap = new Map(allClasses.map((academicClass) => [Number(academicClass.id), academicClass]));
                const resolvedAssigned = (me.assigned_classes || [])
                    .map((classId) => classMap.get(Number(classId)))
                    .filter((value): value is AcademicClass => Boolean(value));

                setAssignedClasses(resolvedAssigned);

                if (resolvedAssigned.length > 0) {
                    const defaultClass = String(resolvedAssigned[0].id);
                    setSelectedClassId(defaultClass);
                    setRequestForm((prev) => ({ ...prev, academic_class: defaultClass }));
                }

                await Promise.all([
                    refreshMyRequests({
                        teacherId: String(me.id),
                        assignedClassIds: resolvedAssigned.map((academicClass) => Number(academicClass.id)),
                    }),
                    loadActiveSessions(),
                ]);
            } catch (error) {
                console.error('Failed to load teacher timetable context', error);
                toast.error('Failed to load timetable data. Make sure your teacher profile has been set up by the admin.');
            } finally {
                setLoading(false);
            }
        };

        void loadTeacherContext();

        // Poll for active session changes every 30 s
        const interval = setInterval(loadActiveSessions, 30_000);
        return () => clearInterval(interval);
    }, [loadActiveSessions]);

    useEffect(() => {
        if (!selectedClassId) {
            setClassTimetable([]);
            return;
        }

        const loadClassTimetable = async () => {
            try {
                const data = await academicAPI.getTimetable({
                    academic_class: selectedClassId,
                    status: 'approved',
                });
                setClassTimetable(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error('Failed to load class timetable', error);
                toast.error('Failed to load class timetable');
            }
        };

        void loadClassTimetable();
    }, [selectedClassId]);

    const daySlots = useMemo(
        () =>
            WEEK_DAYS.reduce<Record<string, Timetable[]>>((acc, day) => {
                acc[day] = classTimetable
                    .filter((slot) => slot.day_of_week === day)
                    .sort((a, b) => a.start_time.localeCompare(b.start_time));
                return acc;
            }, {}),
        [classTimetable],
    );

    const handleSubmitExtraRequest = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!teacherProfile) return;

        setRequestSubmitting(true);
        try {
            const createdRequest = await academicAPI.createTimetable({
                academic_class: requestForm.academic_class,
                day_of_week: requestForm.day_of_week,
                start_time: requestForm.start_time,
                end_time: requestForm.end_time,
                subject_name: requestForm.subject_name,
                room_number: requestForm.room_number,
                teacher: teacherProfile.id,
                entry_type: 'extra',
                status: 'pending',
            });

            await refreshMyRequests({
                teacherId: String(teacherProfile.id),
                assignedClassIds: assignedClasses.map((academicClass) => Number(academicClass.id)),
                optimisticRequest: createdRequest,
            });
            setRequestForm((prev) => ({
                ...prev,
                start_time: '',
                end_time: '',
                subject_name: '',
                room_number: '',
            }));
            toast.success('Extra class request submitted for approval');
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            toast.error(`Failed to submit request: ${message}`);
        } finally {
            setRequestSubmitting(false);
        }
    };

    const handleDeleteRequest = async (requestId: number) => {
        if (!confirm('Delete this extra class request?')) return;
        try {
            await academicAPI.deleteTimetable(requestId);
            await refreshMyRequests({
                teacherId: teacherProfile ? String(teacherProfile.id) : '',
                assignedClassIds: assignedClasses.map((academicClass) => Number(academicClass.id)),
            });
            toast.success('Extra class request deleted');
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            toast.error(`Failed to delete request: ${message}`);
        }
    };

    if (loading) return <div className="p-12 text-center text-slate-400">Loading schedule...</div>;

    if (!teacherProfile) {
        return (
            <div className="p-12 text-center">
                <h2 className="text-xl font-bold text-slate-700">Teacher Profile Not Found</h2>
                <p className="text-slate-500">Please contact administration.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                    <Calendar className="h-8 w-8 text-indigo-600" /> Timetable
                </h1>
                <p className="text-slate-500">
                    View class timetable and submit extra class requests for admin approval.
                </p>
            </div>

            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <CardTitle>Class Timetable (Read-only)</CardTitle>
                    <div className="w-full md:w-72">
                        <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select assigned class" />
                            </SelectTrigger>
                            <SelectContent>
                                {assignedClasses.map((academicClass) => (
                                    <SelectItem key={academicClass.id} value={String(academicClass.id)}>
                                        {academicClass.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    {assignedClasses.length === 0 ? (
                        <div className="text-slate-500 text-sm">No classes are assigned to your profile.</div>
                    ) : (
                        <Tabs value={activeDay} onValueChange={setActiveDay}>
                            <TabsList className="w-full justify-start h-12 bg-transparent p-0 gap-2 overflow-x-auto">
                                {WEEK_DAYS.map((day) => (
                                    <TabsTrigger
                                        key={day}
                                        value={day}
                                        className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-full px-5 border border-slate-200"
                                    >
                                        {day}
                                    </TabsTrigger>
                                ))}
                            </TabsList>

                            {WEEK_DAYS.map((day) => (
                                <TabsContent key={day} value={day} className="pt-4">
                                    {daySlots[day]?.length ? (
                                        <div className="space-y-3">
                                            {daySlots[day].map((slot) => {
                                                const activeSession = activeSessions[slot.timetable_id];
                                                const isLive = Boolean(activeSession);
                                                const btnLoading = sessionLoading[slot.timetable_id];
                                                return (
                                                <div key={slot.timetable_id} className={`border rounded-lg p-4 bg-white ${isLive ? 'border-green-400 ring-1 ring-green-300' : ''}`}>
                                                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="outline">{slot.entry_type === 'extra' ? 'Extra' : 'Main'}</Badge>
                                                            <Badge variant="secondary">{slot.status || 'approved'}</Badge>
                                                            {isLive && (
                                                                <Badge className="bg-green-500 text-white animate-pulse">● LIVE</Badge>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {isLive && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="text-green-700 border-green-400 hover:bg-green-50"
                                                                    onClick={() => window.open(activeSession.jitsi_url, '_blank', 'noopener,noreferrer')}
                                                                >
                                                                    <Video className="h-4 w-4 mr-1" /> Rejoin
                                                                </Button>
                                                            )}
                                                            {isLive ? (
                                                                <Button
                                                                    size="sm"
                                                                    variant="destructive"
                                                                    disabled={btnLoading}
                                                                    onClick={() => handleEndClass(slot)}
                                                                >
                                                                    {btnLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <VideoOff className="h-4 w-4 mr-1" />}
                                                                    End Class
                                                                </Button>
                                                            ) : (
                                                                <Button
                                                                    size="sm"
                                                                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                                                    disabled={btnLoading}
                                                                    onClick={() => handleStartClass(slot)}
                                                                >
                                                                    {btnLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4 mr-1" />}
                                                                    Start Class
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <h3 className="font-semibold text-slate-900">{slot.subject_name}</h3>
                                                    <div className="text-sm text-slate-600 mt-2 flex flex-wrap items-center gap-4">
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="h-4 w-4 text-indigo-500" />
                                                            {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                                                        </span>
                                                        {slot.room_number && (
                                                            <span className="flex items-center gap-1">
                                                                <MapPin className="h-4 w-4 text-indigo-500" />
                                                                Room {slot.room_number}
                                                            </span>
                                                        )}
                                                        {slot.teacher_name && (
                                                            <span className="flex items-center gap-1">
                                                                <School className="h-4 w-4 text-indigo-500" />
                                                                {slot.teacher_name}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="py-10 text-center text-slate-500">
                                            No classes scheduled for {day}.
                                        </div>
                                    )}
                                </TabsContent>
                            ))}
                        </Tabs>
                    )}
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <Card className="xl:col-span-1 border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle>Request Extra Class</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmitExtraRequest} className="space-y-3">
                            <div className="grid gap-1">
                                <Label>Class</Label>
                                <Select
                                    value={requestForm.academic_class}
                                    onValueChange={(value) => setRequestForm((prev) => ({ ...prev, academic_class: value }))}
                                >
                                    <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                                    <SelectContent>
                                        {assignedClasses.map((academicClass) => (
                                            <SelectItem key={academicClass.id} value={String(academicClass.id)}>
                                                {academicClass.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-1">
                                <Label>Day</Label>
                                <Select
                                    value={requestForm.day_of_week}
                                    onValueChange={(value) => setRequestForm((prev) => ({ ...prev, day_of_week: value }))}
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
                                    <Label>Start</Label>
                                    <Input
                                        type="time"
                                        required
                                        value={requestForm.start_time}
                                        onChange={(e) => setRequestForm((prev) => ({ ...prev, start_time: e.target.value }))}
                                    />
                                </div>
                                <div className="grid gap-1">
                                    <Label>End</Label>
                                    <Input
                                        type="time"
                                        required
                                        value={requestForm.end_time}
                                        onChange={(e) => setRequestForm((prev) => ({ ...prev, end_time: e.target.value }))}
                                    />
                                </div>
                            </div>
                            <div className="grid gap-1">
                                <Label>Subject</Label>
                                <Input
                                    required
                                    placeholder="Remedial Mathematics"
                                    value={requestForm.subject_name}
                                    onChange={(e) => setRequestForm((prev) => ({ ...prev, subject_name: e.target.value }))}
                                />
                            </div>
                            <div className="grid gap-1">
                                <Label>Room</Label>
                                <Input
                                    placeholder="Lab 2"
                                    value={requestForm.room_number}
                                    onChange={(e) => setRequestForm((prev) => ({ ...prev, room_number: e.target.value }))}
                                />
                            </div>
                            <Button
                                type="submit"
                                className="w-full"
                                disabled={requestSubmitting || !requestForm.academic_class}
                            >
                                {requestSubmitting ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <Plus className="h-4 w-4 mr-2" />
                                )}
                                Submit Request
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <Card className="xl:col-span-2 border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle>My Extra Class Requests</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {myRequests.length === 0 ? (
                            <div className="text-slate-500 text-sm">No extra class requests created yet.</div>
                        ) : (
                            myRequests.map((request) => {
                                const canDelete = request.status !== 'approved';
                                return (
                                    <div key={request.timetable_id} className="border rounded-lg p-3 bg-white">
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <div className="space-y-1">
                                                <div className="font-semibold text-slate-900">{request.subject_name}</div>
                                                <div className="text-xs text-slate-600">
                                                    Class {request.academic_class_name || request.academic_class} • {request.day_of_week}
                                                    {' '}
                                                    {request.start_time.slice(0, 5)}-{request.end_time.slice(0, 5)}
                                                    {request.room_number ? ` • Room ${request.room_number}` : ''}
                                                </div>
                                                {request.approval_comment && (
                                                    <div className="text-xs text-slate-500">
                                                        Note: {request.approval_comment}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge
                                                    variant={
                                                        request.status === 'approved'
                                                            ? 'default'
                                                            : request.status === 'rejected'
                                                                ? 'destructive'
                                                                : 'secondary'
                                                    }
                                                    className="capitalize"
                                                >
                                                    {request.status || 'pending'}
                                                </Badge>
                                                {canDelete && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-red-500"
                                                        onClick={() => handleDeleteRequest(request.timetable_id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
