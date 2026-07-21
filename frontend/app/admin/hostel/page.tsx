// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import {
    Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Dialog, DialogContent, DialogFooter,
    DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
    Select, SelectContent, SelectItem,
    SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs';
import {
    Building2, BedDouble, Users, CheckSquare,
    Plus, Pencil, LogOut, Loader2, Home,
    Phone, ShieldCheck, DoorOpen, PercentSquare,
} from 'lucide-react';
import {
    hostelAPI,
    HostelBlock, HostelRoom, HostelAllotment, HostelDashboard,
} from '@/lib/api';
import { toast } from 'sonner';

// ─── helpers ──────────────────────────────────────────────────────────────────

const GENDER_LABEL: Record<string, string> = {
    male: 'Male',
    female: 'Female',
    mixed: 'Mixed',
};

const GENDER_COLORS: Record<string, string> = {
    male:   'bg-blue-100 text-blue-700',
    female: 'bg-pink-100 text-pink-700',
    mixed:  'bg-violet-100 text-violet-700',
};

const ROOM_TYPE_LABEL: Record<string, string> = {
    single:    'Single',
    double:    'Double',
    dormitory: 'Dormitory',
};

const ROOM_TYPE_COLORS: Record<string, string> = {
    single:    'bg-sky-100 text-sky-700',
    double:    'bg-teal-100 text-teal-700',
    dormitory: 'bg-amber-100 text-amber-700',
};

// ─── page ─────────────────────────────────────────────────────────────────────

export default function HostelManagementPage() {
    // ── data ──
    const [dashboard, setDashboard] = useState<HostelDashboard | null>(null);
    const [blocks, setBlocks]       = useState<HostelBlock[]>([]);
    const [rooms, setRooms]         = useState<HostelRoom[]>([]);
    const [allotments, setAllotments] = useState<HostelAllotment[]>([]);

    // ── loading ──
    const [loading, setLoading]         = useState(true);
    const [submitting, setSubmitting]   = useState(false);

    // ── filters ──
    const [roomBlockFilter, setRoomBlockFilter]         = useState<string>('all');
    const [allotmentActiveOnly, setAllotmentActiveOnly] = useState(false);

    // ── block dialog ──
    const [blockDialogOpen, setBlockDialogOpen] = useState(false);
    const [editingBlock, setEditingBlock]       = useState<HostelBlock | null>(null);
    const [blockForm, setBlockForm] = useState({
        name: '', gender: 'male' as HostelBlock['gender'],
        warden_name: '', warden_phone: '', total_rooms: '',
    });

    // ── room dialog ──
    const [roomDialogOpen, setRoomDialogOpen] = useState(false);
    const [editingRoom, setEditingRoom]       = useState<HostelRoom | null>(null);
    const [roomForm, setRoomForm] = useState({
        block: '', room_number: '',
        room_type: 'single' as HostelRoom['room_type'],
        capacity: '', monthly_fee: '', floor: '',
    });

    // ── allotment dialog ──
    const [allotDialogOpen, setAllotDialogOpen] = useState(false);
    const [allotForm, setAllotForm] = useState({
        student: '', room: '', check_in_date: '', remarks: '',
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Load
    // ─────────────────────────────────────────────────────────────────────────

    useEffect(() => { loadAll(); }, []);

    const loadAll = async () => {
        try {
            setLoading(true);
            const [dash, blks, rms, allots] = await Promise.all([
                hostelAPI.getDashboard(),
                hostelAPI.getBlocks(),
                hostelAPI.getRooms(),
                hostelAPI.getAllotments(),
            ]);
            setDashboard(dash);
            setBlocks(blks);
            setRooms(rms);
            setAllotments(allots);
        } catch {
            toast.error('Failed to load hostel data');
        } finally {
            setLoading(false);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Block handlers
    // ─────────────────────────────────────────────────────────────────────────

    const openAddBlock = () => {
        setEditingBlock(null);
        setBlockForm({ name: '', gender: 'male', warden_name: '', warden_phone: '', total_rooms: '' });
        setBlockDialogOpen(true);
    };

    const openEditBlock = (block: HostelBlock) => {
        setEditingBlock(block);
        setBlockForm({
            name: block.name,
            gender: block.gender,
            warden_name: block.warden_name,
            warden_phone: block.warden_phone,
            total_rooms: String(block.total_rooms),
        });
        setBlockDialogOpen(true);
    };

    const handleSaveBlock = async () => {
        if (!blockForm.name || !blockForm.gender) {
            toast.error('Name and gender are required');
            return;
        }
        setSubmitting(true);
        try {
            const payload: Partial<HostelBlock> = {
                name: blockForm.name,
                gender: blockForm.gender,
                warden_name: blockForm.warden_name,
                warden_phone: blockForm.warden_phone,
                total_rooms: blockForm.total_rooms ? parseInt(blockForm.total_rooms, 10) : undefined,
            };
            if (editingBlock) {
                await hostelAPI.updateBlock(editingBlock.block_id, payload);
                toast.success('Block updated');
            } else {
                await hostelAPI.createBlock(payload);
                toast.success('Block created');
            }
            setBlockDialogOpen(false);
            loadAll();
        } catch {
            toast.error('Failed to save block');
        } finally {
            setSubmitting(false);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Room handlers
    // ─────────────────────────────────────────────────────────────────────────

    const openAddRoom = () => {
        setEditingRoom(null);
        setRoomForm({ block: '', room_number: '', room_type: 'single', capacity: '', monthly_fee: '', floor: '' });
        setRoomDialogOpen(true);
    };

    const openEditRoom = (room: HostelRoom) => {
        setEditingRoom(room);
        setRoomForm({
            block: room.block,
            room_number: room.room_number,
            room_type: room.room_type,
            capacity: String(room.capacity),
            monthly_fee: String(room.monthly_fee),
            floor: String(room.floor),
        });
        setRoomDialogOpen(true);
    };

    const handleSaveRoom = async () => {
        if (!roomForm.block || !roomForm.room_number || !roomForm.room_type) {
            toast.error('Block, room number, and type are required');
            return;
        }
        setSubmitting(true);
        try {
            const payload: Partial<HostelRoom> = {
                block: roomForm.block,
                room_number: roomForm.room_number,
                room_type: roomForm.room_type,
                capacity: roomForm.capacity ? parseInt(roomForm.capacity, 10) : undefined,
                monthly_fee: roomForm.monthly_fee ? parseFloat(roomForm.monthly_fee) : undefined,
                floor: roomForm.floor ? parseInt(roomForm.floor, 10) : undefined,
            };
            if (editingRoom) {
                await hostelAPI.updateRoom(editingRoom.room_id, payload);
                toast.success('Room updated');
            } else {
                await hostelAPI.createRoom(payload);
                toast.success('Room created');
            }
            setRoomDialogOpen(false);
            loadAll();
        } catch {
            toast.error('Failed to save room');
        } finally {
            setSubmitting(false);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Allotment handlers
    // ─────────────────────────────────────────────────────────────────────────

    const openNewAllotment = () => {
        setAllotForm({ student: '', room: '', check_in_date: '', remarks: '' });
        setAllotDialogOpen(true);
    };

    const handleCreateAllotment = async () => {
        if (!allotForm.student || !allotForm.room || !allotForm.check_in_date) {
            toast.error('Student, room, and check-in date are required');
            return;
        }
        setSubmitting(true);
        try {
            await hostelAPI.createAllotment({
                student: allotForm.student,
                room: allotForm.room,
                check_in_date: allotForm.check_in_date,
                remarks: allotForm.remarks,
            });
            toast.success('Allotment created');
            setAllotDialogOpen(false);
            loadAll();
        } catch {
            toast.error('Failed to create allotment');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCheckOut = async (allotment: HostelAllotment) => {
        if (!confirm(`Check out student from room ${allotment.room_number ?? allotment.room}?`)) return;
        try {
            const today = new Date().toISOString().split('T')[0];
            await hostelAPI.checkOut(allotment.allotment_id, today);
            toast.success('Student checked out');
            loadAll();
        } catch {
            toast.error('Failed to check out');
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Derived data
    // ─────────────────────────────────────────────────────────────────────────

    const filteredRooms = roomBlockFilter === 'all'
        ? rooms
        : rooms.filter(r => r.block === roomBlockFilter);

    const filteredAllotments = allotmentActiveOnly
        ? allotments.filter(a => a.is_active)
        : allotments;

    const blockName = (id: string) => blocks.find(b => b.block_id === id)?.name ?? id;

    // ─────────────────────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 space-y-8 max-w-7xl px-4 md:px-6">

            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 pb-6">
                <div>
                    <div className="flex items-center gap-2 text-emerald-600 font-bold mb-1">
                        <Home className="h-4 w-4" />
                        <span className="text-[10px] uppercase tracking-[0.2em]">Hostel Management v1.0</span>
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">Hostel Management</h1>
                    <p className="text-slate-500 font-medium">
                        Manage blocks, rooms, and student allotments
                    </p>
                </div>
            </div>

            {/* ── Dashboard Stats ── */}
            {dashboard && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="border-emerald-100 bg-emerald-50 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-5">
                            <CardTitle className="text-sm font-semibold text-emerald-800">Total Blocks</CardTitle>
                            <Building2 className="h-4 w-4 text-emerald-600" />
                        </CardHeader>
                        <CardContent className="px-5 pb-4">
                            <div className="text-3xl font-black text-emerald-900">{dashboard.total_blocks}</div>
                            <p className="text-xs text-emerald-700 mt-1">Residential blocks</p>
                        </CardContent>
                    </Card>

                    <Card className="border-sky-100 bg-sky-50 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-5">
                            <CardTitle className="text-sm font-semibold text-sky-800">Total Capacity</CardTitle>
                            <BedDouble className="h-4 w-4 text-sky-600" />
                        </CardHeader>
                        <CardContent className="px-5 pb-4">
                            <div className="text-3xl font-black text-sky-900">{dashboard.total_capacity}</div>
                            <p className="text-xs text-sky-700 mt-1">Total beds available</p>
                        </CardContent>
                    </Card>

                    <Card className="border-violet-100 bg-violet-50 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-5">
                            <CardTitle className="text-sm font-semibold text-violet-800">Occupied</CardTitle>
                            <Users className="h-4 w-4 text-violet-600" />
                        </CardHeader>
                        <CardContent className="px-5 pb-4">
                            <div className="text-3xl font-black text-violet-900">{dashboard.total_occupied}</div>
                            <p className="text-xs text-violet-700 mt-1">Students housed</p>
                        </CardContent>
                    </Card>

                    <Card className="border-amber-100 bg-amber-50 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-5">
                            <CardTitle className="text-sm font-semibold text-amber-800">Available Beds</CardTitle>
                            <PercentSquare className="h-4 w-4 text-amber-600" />
                        </CardHeader>
                        <CardContent className="px-5 pb-4">
                            <div className="flex items-baseline gap-2">
                                <div className="text-3xl font-black text-amber-900">{dashboard.available_beds}</div>
                                <Badge className="bg-emerald-100 text-emerald-700 text-xs font-bold border-0">
                                    {dashboard.occupancy_rate.toFixed(1)}% full
                                </Badge>
                            </div>
                            <p className="text-xs text-amber-700 mt-1">Beds still open</p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ── Tabs ── */}
            <Tabs defaultValue="blocks" className="space-y-6">
                <TabsList className="bg-slate-100 p-1 rounded-2xl border border-slate-200/60 h-auto overflow-x-auto">
                    <TabsTrigger
                        value="blocks"
                        className="rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-md transition-all"
                    >
                        <Building2 className="h-3.5 w-3.5 mr-2" /> Blocks
                    </TabsTrigger>
                    <TabsTrigger
                        value="rooms"
                        className="rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-md transition-all"
                    >
                        <DoorOpen className="h-3.5 w-3.5 mr-2" /> Rooms
                    </TabsTrigger>
                    <TabsTrigger
                        value="allotments"
                        className="rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-md transition-all"
                    >
                        <CheckSquare className="h-3.5 w-3.5 mr-2" /> Allotments
                    </TabsTrigger>
                </TabsList>

                {/* ════════════════════════════════════════════════════════════
                    BLOCKS TAB
                ════════════════════════════════════════════════════════════ */}
                <TabsContent value="blocks" className="animate-in fade-in slide-in-from-bottom-2 duration-400">
                    <Card className="shadow-sm border-slate-200">
                        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-4">
                            <CardTitle className="text-base font-black text-slate-800">Hostel Blocks</CardTitle>
                            <Button
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                                onClick={openAddBlock}
                            >
                                <Plus className="h-4 w-4 mr-1" /> Add Block
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            {blocks.length === 0 ? (
                                <div className="text-center py-16 text-slate-400">
                                    <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                                    No blocks found. Add your first block.
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-100 bg-slate-50/60">
                                                <th className="text-left px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Name</th>
                                                <th className="text-left px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Gender</th>
                                                <th className="text-left px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Warden</th>
                                                <th className="text-left px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Total Rooms</th>
                                                <th className="text-left px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Occupied / Available</th>
                                                <th className="text-left px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Status</th>
                                                <th className="px-5 py-3" />
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {blocks.map((block, idx) => (
                                                <tr
                                                    key={block.block_id}
                                                    className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors ${idx % 2 === 0 ? '' : 'bg-slate-50/30'}`}
                                                >
                                                    <td className="px-5 py-3.5 font-semibold text-slate-800">{block.name}</td>
                                                    <td className="px-5 py-3.5">
                                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${GENDER_COLORS[block.gender] ?? 'bg-slate-100 text-slate-700'}`}>
                                                            {GENDER_LABEL[block.gender] ?? block.gender}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        <div className="font-medium text-slate-700">{block.warden_name || '—'}</div>
                                                        {block.warden_phone && (
                                                            <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                                                                <Phone className="h-3 w-3" />
                                                                {block.warden_phone}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-3.5 text-slate-700 font-medium">{block.total_rooms}</td>
                                                    <td className="px-5 py-3.5">
                                                        <span className="text-violet-700 font-bold">{block.occupied_rooms}</span>
                                                        <span className="text-slate-400 mx-1">/</span>
                                                        <span className="text-emerald-700 font-bold">{block.available_rooms}</span>
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        {block.is_active
                                                            ? <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs font-bold"><ShieldCheck className="h-3 w-3 mr-1" />Active</Badge>
                                                            : <Badge className="bg-slate-100 text-slate-500 border-0 text-xs font-bold">Inactive</Badge>
                                                        }
                                                    </td>
                                                    <td className="px-5 py-3.5 text-right">
                                                        <Button
                                                            size="sm" variant="ghost"
                                                            className="text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg"
                                                            onClick={() => openEditBlock(block)}
                                                        >
                                                            <Pencil className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ════════════════════════════════════════════════════════════
                    ROOMS TAB
                ════════════════════════════════════════════════════════════ */}
                <TabsContent value="rooms" className="animate-in fade-in slide-in-from-bottom-2 duration-400">
                    <Card className="shadow-sm border-slate-200">
                        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-4 gap-4 flex-wrap">
                            <CardTitle className="text-base font-black text-slate-800">Rooms</CardTitle>
                            <div className="flex items-center gap-3 flex-wrap">
                                {/* Block filter */}
                                <Select value={roomBlockFilter} onValueChange={setRoomBlockFilter}>
                                    <SelectTrigger className="h-9 w-44 rounded-xl text-sm">
                                        <SelectValue placeholder="Filter by block" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Blocks</SelectItem>
                                        {blocks.map(b => (
                                            <SelectItem key={b.block_id} value={b.block_id}>{b.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button
                                    size="sm"
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                                    onClick={openAddRoom}
                                >
                                    <Plus className="h-4 w-4 mr-1" /> Add Room
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {filteredRooms.length === 0 ? (
                                <div className="text-center py-16 text-slate-400">
                                    <DoorOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
                                    No rooms found.
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-100 bg-slate-50/60">
                                                <th className="text-left px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Room No.</th>
                                                <th className="text-left px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Block</th>
                                                <th className="text-left px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Type</th>
                                                <th className="text-left px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Capacity</th>
                                                <th className="text-left px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Floor</th>
                                                <th className="text-left px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Monthly Fee (NPR)</th>
                                                <th className="text-left px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Occupancy</th>
                                                <th className="text-left px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Status</th>
                                                <th className="px-5 py-3" />
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredRooms.map((room, idx) => {
                                                const pct = room.capacity > 0 ? Math.round((room.occupied_beds / room.capacity) * 100) : 0;
                                                return (
                                                    <tr
                                                        key={room.room_id}
                                                        className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors ${idx % 2 === 0 ? '' : 'bg-slate-50/30'}`}
                                                    >
                                                        <td className="px-5 py-3.5 font-semibold text-slate-800">{room.room_number}</td>
                                                        <td className="px-5 py-3.5 text-slate-600">{blockName(room.block)}</td>
                                                        <td className="px-5 py-3.5">
                                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${ROOM_TYPE_COLORS[room.room_type] ?? 'bg-slate-100 text-slate-700'}`}>
                                                                {ROOM_TYPE_LABEL[room.room_type] ?? room.room_type}
                                                            </span>
                                                        </td>
                                                        <td className="px-5 py-3.5 text-slate-700">{room.capacity}</td>
                                                        <td className="px-5 py-3.5 text-slate-700">{room.floor}</td>
                                                        <td className="px-5 py-3.5 text-slate-700">
                                                            NPR {Number(room.monthly_fee).toLocaleString()}
                                                        </td>
                                                        <td className="px-5 py-3.5">
                                                            <div className="flex items-center gap-2">
                                                                <div className="flex-1 min-w-[72px] bg-slate-100 rounded-full h-2 overflow-hidden">
                                                                    <div
                                                                        className={`h-2 rounded-full transition-all ${pct >= 100 ? 'bg-rose-500' : pct >= 70 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                                                                        style={{ width: `${Math.min(pct, 100)}%` }}
                                                                    />
                                                                </div>
                                                                <span className="text-xs text-slate-500 w-14 shrink-0">
                                                                    {room.occupied_beds}/{room.capacity}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-3.5">
                                                            {room.is_full
                                                                ? <Badge className="bg-rose-100 text-rose-700 border-0 text-xs font-bold">Full</Badge>
                                                                : room.is_active
                                                                    ? <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs font-bold">Available</Badge>
                                                                    : <Badge className="bg-slate-100 text-slate-500 border-0 text-xs font-bold">Inactive</Badge>
                                                            }
                                                        </td>
                                                        <td className="px-5 py-3.5 text-right">
                                                            <Button
                                                                size="sm" variant="ghost"
                                                                className="text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg"
                                                                onClick={() => openEditRoom(room)}
                                                            >
                                                                <Pencil className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ════════════════════════════════════════════════════════════
                    ALLOTMENTS TAB
                ════════════════════════════════════════════════════════════ */}
                <TabsContent value="allotments" className="animate-in fade-in slide-in-from-bottom-2 duration-400">
                    <Card className="shadow-sm border-slate-200">
                        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-4 gap-4 flex-wrap">
                            <CardTitle className="text-base font-black text-slate-800">Student Allotments</CardTitle>
                            <div className="flex items-center gap-4 flex-wrap">
                                {/* Active only toggle */}
                                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={allotmentActiveOnly}
                                        onChange={e => setAllotmentActiveOnly(e.target.checked)}
                                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                    />
                                    Active only
                                </label>
                                <Button
                                    size="sm"
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                                    onClick={openNewAllotment}
                                >
                                    <Plus className="h-4 w-4 mr-1" /> New Allotment
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {filteredAllotments.length === 0 ? (
                                <div className="text-center py-16 text-slate-400">
                                    <CheckSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
                                    No allotments found.
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-100 bg-slate-50/60">
                                                <th className="text-left px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Student</th>
                                                <th className="text-left px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Room</th>
                                                <th className="text-left px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Block</th>
                                                <th className="text-left px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Check-in</th>
                                                <th className="text-left px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Check-out</th>
                                                <th className="text-left px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Status</th>
                                                <th className="px-5 py-3" />
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredAllotments.map((allot, idx) => (
                                                <tr
                                                    key={allot.allotment_id}
                                                    className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors ${idx % 2 === 0 ? '' : 'bg-slate-50/30'}`}
                                                >
                                                    <td className="px-5 py-3.5">
                                                        <div className="font-semibold text-slate-800">{allot.student_name ?? allot.student}</div>
                                                        <div className="text-xs text-slate-400 font-mono">{allot.student}</div>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-slate-700 font-medium">{allot.room_number ?? allot.room}</td>
                                                    <td className="px-5 py-3.5 text-slate-600">{allot.block_name ?? '—'}</td>
                                                    <td className="px-5 py-3.5 text-slate-600">
                                                        {allot.check_in_date ? new Date(allot.check_in_date).toLocaleDateString() : '—'}
                                                    </td>
                                                    <td className="px-5 py-3.5 text-slate-600">
                                                        {allot.check_out_date ? new Date(allot.check_out_date).toLocaleDateString() : '—'}
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        {allot.is_active
                                                            ? <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs font-bold">Active</Badge>
                                                            : <Badge className="bg-slate-100 text-slate-500 border-0 text-xs font-bold">Checked Out</Badge>
                                                        }
                                                    </td>
                                                    <td className="px-5 py-3.5 text-right">
                                                        {allot.is_active && (
                                                            <Button
                                                                size="sm" variant="outline"
                                                                className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-xl text-xs"
                                                                onClick={() => handleCheckOut(allot)}
                                                            >
                                                                <LogOut className="h-3.5 w-3.5 mr-1" /> Check Out
                                                            </Button>
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
                </TabsContent>
            </Tabs>

            {/* ════════════════════════════════════════════════════════════════
                BLOCK DIALOG
            ════════════════════════════════════════════════════════════════ */}
            <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingBlock ? 'Edit Block' : 'Add Block'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label>Block Name <span className="text-rose-500">*</span></Label>
                            <Input
                                placeholder="e.g. Block A"
                                value={blockForm.name}
                                onChange={e => setBlockForm(p => ({ ...p, name: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Gender <span className="text-rose-500">*</span></Label>
                            <Select value={blockForm.gender} onValueChange={v => setBlockForm(p => ({ ...p, gender: v as HostelBlock['gender'] }))}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select gender" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="male">Male</SelectItem>
                                    <SelectItem value="female">Female</SelectItem>
                                    <SelectItem value="mixed">Mixed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Warden Name</Label>
                            <Input
                                placeholder="Warden full name"
                                value={blockForm.warden_name}
                                onChange={e => setBlockForm(p => ({ ...p, warden_name: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Warden Phone</Label>
                            <Input
                                placeholder="+977-98xxxxxxxx"
                                value={blockForm.warden_phone}
                                onChange={e => setBlockForm(p => ({ ...p, warden_phone: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Total Rooms</Label>
                            <Input
                                type="number" min="0" placeholder="e.g. 30"
                                value={blockForm.total_rooms}
                                onChange={e => setBlockForm(p => ({ ...p, total_rooms: e.target.value }))}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setBlockDialogOpen(false)}>Cancel</Button>
                        <Button
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={handleSaveBlock}
                            disabled={submitting}
                        >
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            {editingBlock ? 'Update Block' : 'Create Block'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ════════════════════════════════════════════════════════════════
                ROOM DIALOG
            ════════════════════════════════════════════════════════════════ */}
            <Dialog open={roomDialogOpen} onOpenChange={setRoomDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingRoom ? 'Edit Room' : 'Add Room'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label>Block <span className="text-rose-500">*</span></Label>
                            <Select value={roomForm.block} onValueChange={v => setRoomForm(p => ({ ...p, block: v }))} disabled={!!editingRoom}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select block" />
                                </SelectTrigger>
                                <SelectContent>
                                    {blocks.map(b => (
                                        <SelectItem key={b.block_id} value={b.block_id}>{b.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Room Number <span className="text-rose-500">*</span></Label>
                            <Input
                                placeholder="e.g. 101"
                                value={roomForm.room_number}
                                onChange={e => setRoomForm(p => ({ ...p, room_number: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Room Type <span className="text-rose-500">*</span></Label>
                            <Select value={roomForm.room_type} onValueChange={v => setRoomForm(p => ({ ...p, room_type: v as HostelRoom['room_type'] }))}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="single">Single</SelectItem>
                                    <SelectItem value="double">Double</SelectItem>
                                    <SelectItem value="dormitory">Dormitory</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1.5">
                                <Label>Capacity</Label>
                                <Input
                                    type="number" min="1" placeholder="e.g. 2"
                                    value={roomForm.capacity}
                                    onChange={e => setRoomForm(p => ({ ...p, capacity: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Floor</Label>
                                <Input
                                    type="number" min="0" placeholder="e.g. 1"
                                    value={roomForm.floor}
                                    onChange={e => setRoomForm(p => ({ ...p, floor: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Monthly Fee</Label>
                                <Input
                                    type="number" min="0" placeholder="NPR"
                                    value={roomForm.monthly_fee}
                                    onChange={e => setRoomForm(p => ({ ...p, monthly_fee: e.target.value }))}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRoomDialogOpen(false)}>Cancel</Button>
                        <Button
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={handleSaveRoom}
                            disabled={submitting}
                        >
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            {editingRoom ? 'Update Room' : 'Create Room'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ════════════════════════════════════════════════════════════════
                ALLOTMENT DIALOG
            ════════════════════════════════════════════════════════════════ */}
            <Dialog open={allotDialogOpen} onOpenChange={setAllotDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>New Allotment</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label>Student ID <span className="text-rose-500">*</span></Label>
                            <Input
                                placeholder="Enter student ID"
                                value={allotForm.student}
                                onChange={e => setAllotForm(p => ({ ...p, student: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Room <span className="text-rose-500">*</span></Label>
                            <Select value={allotForm.room} onValueChange={v => setAllotForm(p => ({ ...p, room: v }))}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select room" />
                                </SelectTrigger>
                                <SelectContent>
                                    {rooms.filter(r => !r.is_full && r.is_active).map(r => (
                                        <SelectItem key={r.room_id} value={r.room_id}>
                                            {blockName(r.block)} — Room {r.room_number} ({r.available_beds} bed{r.available_beds !== 1 ? 's' : ''} free)
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Check-in Date <span className="text-rose-500">*</span></Label>
                            <Input
                                type="date"
                                value={allotForm.check_in_date}
                                onChange={e => setAllotForm(p => ({ ...p, check_in_date: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Remarks</Label>
                            <Input
                                placeholder="Optional notes"
                                value={allotForm.remarks}
                                onChange={e => setAllotForm(p => ({ ...p, remarks: e.target.value }))}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAllotDialogOpen(false)}>Cancel</Button>
                        <Button
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={handleCreateAllotment}
                            disabled={submitting}
                        >
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Create Allotment
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
