// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Dialog, DialogContent, DialogFooter,
    DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem,
    SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    Bus, MapPin, Truck, Users, Plus, Pencil, Trash2,
    Loader2, CheckCircle2, XCircle, Route,
} from 'lucide-react';
import {
    transportAPI,
    TransportRoute,
    TransportVehicle,
    TransportAssignment,
    TransportSummary,
} from '@/lib/api';
import { toast } from 'sonner';

// ─── Form state types ──────────────────────────────────────────────────────────

interface RouteForm {
    name: string;
    description: string;
    is_active: boolean;
}

interface VehicleForm {
    plate_number: string;
    model: string;
    capacity: string;
    driver_name: string;
    driver_phone: string;
    route: string;
    is_active: boolean;
}

interface AssignmentForm {
    student: string;
    route: string;
    vehicle: string;
    pickup_stop: string;
    monthly_fee: string;
    active_from: string;
}

const emptyRouteForm = (): RouteForm => ({
    name: '',
    description: '',
    is_active: true,
});

const emptyVehicleForm = (): VehicleForm => ({
    plate_number: '',
    model: '',
    capacity: '',
    driver_name: '',
    driver_phone: '',
    route: '__none__',
    is_active: true,
});

const emptyAssignmentForm = (): AssignmentForm => ({
    student: '',
    route: '',
    vehicle: '__none__',
    pickup_stop: '',
    monthly_fee: '',
    active_from: new Date().toISOString().split('T')[0],
});

// ─── Main Component ────────────────────────────────────────────────────────────

export default function TransportManagementPage() {
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState<TransportSummary>({ total_routes: 0, active_routes: 0 });
    const [routes, setRoutes] = useState<TransportRoute[]>([]);
    const [vehicles, setVehicles] = useState<TransportVehicle[]>([]);
    const [assignments, setAssignments] = useState<TransportAssignment[]>([]);

    // Route dialog
    const [showRouteDialog, setShowRouteDialog] = useState(false);
    const [editingRoute, setEditingRoute] = useState<TransportRoute | null>(null);
    const [routeForm, setRouteForm] = useState<RouteForm>(emptyRouteForm());
    const [routeSubmitting, setRouteSubmitting] = useState(false);

    // Vehicle dialog
    const [showVehicleDialog, setShowVehicleDialog] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState<TransportVehicle | null>(null);
    const [vehicleForm, setVehicleForm] = useState<VehicleForm>(emptyVehicleForm());
    const [vehicleSubmitting, setVehicleSubmitting] = useState(false);

    // Assignment dialog
    const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);
    const [assignmentForm, setAssignmentForm] = useState<AssignmentForm>(emptyAssignmentForm());
    const [assignmentSubmitting, setAssignmentSubmitting] = useState(false);

    useEffect(() => {
        loadAll();
    }, []);

    const loadAll = async () => {
        try {
            setLoading(true);
            const [summaryData, routesData, vehiclesData, assignmentsData] = await Promise.all([
                transportAPI.getSummary(),
                transportAPI.getRoutes(),
                transportAPI.getVehicles(),
                transportAPI.getAssignments(),
            ]);
            setSummary(summaryData);
            setRoutes(routesData);
            setVehicles(vehiclesData);
            setAssignments(assignmentsData);
        } catch {
            toast.error('Failed to load transport data');
        } finally {
            setLoading(false);
        }
    };

    // ─── Route CRUD ──────────────────────────────────────────────────────────────

    const openAddRoute = () => {
        setEditingRoute(null);
        setRouteForm(emptyRouteForm());
        setShowRouteDialog(true);
    };

    const openEditRoute = (route: TransportRoute) => {
        setEditingRoute(route);
        setRouteForm({ name: route.name, description: route.description, is_active: route.is_active });
        setShowRouteDialog(true);
    };

    const handleSaveRoute = async () => {
        if (!routeForm.name.trim()) {
            toast.error('Route name is required');
            return;
        }
        setRouteSubmitting(true);
        try {
            if (editingRoute) {
                await transportAPI.updateRoute(editingRoute.route_id, routeForm);
                toast.success('Route updated');
            } else {
                await transportAPI.createRoute(routeForm);
                toast.success('Route created');
            }
            setShowRouteDialog(false);
            loadAll();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to save route';
            toast.error(msg);
        } finally {
            setRouteSubmitting(false);
        }
    };

    const handleDeleteRoute = async (id: string) => {
        if (!confirm('Delete this route? This cannot be undone.')) return;
        try {
            await transportAPI.deleteRoute(id);
            toast.success('Route deleted');
            loadAll();
        } catch {
            toast.error('Failed to delete route');
        }
    };

    // ─── Vehicle CRUD ────────────────────────────────────────────────────────────

    const openAddVehicle = () => {
        setEditingVehicle(null);
        setVehicleForm(emptyVehicleForm());
        setShowVehicleDialog(true);
    };

    const openEditVehicle = (vehicle: TransportVehicle) => {
        setEditingVehicle(vehicle);
        setVehicleForm({
            plate_number: vehicle.plate_number,
            model: vehicle.model,
            capacity: String(vehicle.capacity),
            driver_name: vehicle.driver_name,
            driver_phone: vehicle.driver_phone,
            route: vehicle.route ?? '__none__',
            is_active: vehicle.is_active,
        });
        setShowVehicleDialog(true);
    };

    const handleSaveVehicle = async () => {
        if (!vehicleForm.plate_number.trim() || !vehicleForm.model.trim()) {
            toast.error('Plate number and model are required');
            return;
        }
        setVehicleSubmitting(true);
        try {
            const payload = {
                ...vehicleForm,
                capacity: parseInt(vehicleForm.capacity, 10) || 0,
                route: vehicleForm.route === '__none__' ? null : vehicleForm.route,
            };
            if (editingVehicle) {
                await transportAPI.updateVehicle(editingVehicle.vehicle_id, payload);
                toast.success('Vehicle updated');
            } else {
                await transportAPI.createVehicle(payload);
                toast.success('Vehicle added');
            }
            setShowVehicleDialog(false);
            loadAll();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to save vehicle';
            toast.error(msg);
        } finally {
            setVehicleSubmitting(false);
        }
    };

    const handleDeleteVehicle = async (id: string) => {
        if (!confirm('Delete this vehicle? This cannot be undone.')) return;
        try {
            await transportAPI.deleteVehicle(id);
            toast.success('Vehicle deleted');
            loadAll();
        } catch {
            toast.error('Failed to delete vehicle');
        }
    };

    // ─── Assignment CRUD ─────────────────────────────────────────────────────────

    const openAddAssignment = () => {
        setAssignmentForm(emptyAssignmentForm());
        setShowAssignmentDialog(true);
    };

    const handleSaveAssignment = async () => {
        if (!assignmentForm.student.trim() || !assignmentForm.route) {
            toast.error('Student and route are required');
            return;
        }
        setAssignmentSubmitting(true);
        try {
            const payload = {
                ...assignmentForm,
                vehicle: assignmentForm.vehicle === '__none__' ? null : assignmentForm.vehicle || null,
                monthly_fee: parseFloat(assignmentForm.monthly_fee) || 0,
            };
            await transportAPI.createAssignment(payload);
            toast.success('Student assigned to transport');
            setShowAssignmentDialog(false);
            loadAll();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to create assignment';
            toast.error(msg);
        } finally {
            setAssignmentSubmitting(false);
        }
    };

    const handleDeactivateAssignment = async (id: string) => {
        try {
            await transportAPI.updateAssignment(id, { is_active: false });
            toast.success('Assignment deactivated');
            loadAll();
        } catch {
            toast.error('Failed to deactivate assignment');
        }
    };

    // ─── Helpers ─────────────────────────────────────────────────────────────────

    const getRouteName = (id: string | null) => {
        if (!id) return '—';
        return routes.find(r => r.route_id === id)?.name ?? id;
    };

    const getVehiclePlate = (id: string | null) => {
        if (!id) return '—';
        return vehicles.find(v => v.vehicle_id === id)?.plate_number ?? id;
    };

    const activeAssignments = assignments.filter(a => a.is_active).length;

    // ─── Loading state ───────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
            </div>
        );
    }

    // ─── Render ──────────────────────────────────────────────────────────────────

    return (
        <div className="container mx-auto py-8 space-y-8 max-w-7xl px-4 md:px-6">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 pb-6">
                <div>
                    <div className="flex items-center gap-2 text-sky-600 font-bold mb-1">
                        <Bus className="h-4 w-4" />
                        <span className="text-[10px] uppercase tracking-[0.2em]">Transport Module</span>
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">Transport Management</h1>
                    <p className="text-slate-500 font-medium">
                        Manage school bus routes, vehicles, and student transport assignments
                    </p>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="shadow-sm border-sky-100 bg-sky-50">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-semibold text-sky-900">Total Routes</CardTitle>
                        <Route className="h-4 w-4 text-sky-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-sky-700">{summary.total_routes}</div>
                        <p className="text-xs text-sky-600 mt-1">Registered routes</p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-emerald-100 bg-emerald-50">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-semibold text-emerald-900">Active Routes</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-emerald-700">{summary.active_routes}</div>
                        <p className="text-xs text-emerald-600 mt-1">Currently running</p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-blue-100 bg-blue-50">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-semibold text-blue-900">Total Vehicles</CardTitle>
                        <Truck className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-blue-700">{vehicles.length}</div>
                        <p className="text-xs text-blue-600 mt-1">Fleet size</p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-violet-100 bg-violet-50">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-semibold text-violet-900">Active Assignments</CardTitle>
                        <Users className="h-4 w-4 text-violet-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-violet-700">{activeAssignments}</div>
                        <p className="text-xs text-violet-600 mt-1">Students enrolled</p>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="routes" className="space-y-6">
                <TabsList className="bg-slate-100 p-1 rounded-2xl border border-slate-200/60 overflow-x-auto h-auto">
                    <TabsTrigger
                        value="routes"
                        className="rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-sky-700 data-[state=active]:shadow-md transition-all"
                    >
                        <MapPin className="h-3.5 w-3.5 mr-2" /> Routes
                    </TabsTrigger>
                    <TabsTrigger
                        value="vehicles"
                        className="rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-sky-700 data-[state=active]:shadow-md transition-all"
                    >
                        <Truck className="h-3.5 w-3.5 mr-2" /> Vehicles
                    </TabsTrigger>
                    <TabsTrigger
                        value="assignments"
                        className="rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-sky-700 data-[state=active]:shadow-md transition-all"
                    >
                        <Users className="h-3.5 w-3.5 mr-2" /> Student Assignments
                    </TabsTrigger>
                </TabsList>

                {/* ── Routes Tab ──────────────────────────────────────────────── */}
                <TabsContent value="routes" className="animate-in fade-in slide-in-from-bottom-2 duration-400">
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-4">
                            <CardTitle className="text-base font-bold text-slate-800">Routes</CardTitle>
                            <Button
                                size="sm"
                                onClick={openAddRoute}
                                className="bg-sky-600 hover:bg-sky-700 text-white"
                            >
                                <Plus className="h-4 w-4 mr-1.5" /> Add Route
                            </Button>
                        </CardHeader>
                        <CardContent className="pt-4">
                            {routes.length === 0 ? (
                                <div className="text-center py-16 text-slate-400">
                                    <MapPin className="h-10 w-10 mx-auto mb-3 opacity-30" />
                                    <p>No routes configured yet.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-100">
                                                <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
                                                <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Description</th>
                                                <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Stops</th>
                                                <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                                <th className="py-3 px-4" />
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {routes.map(route => (
                                                <tr key={route.route_id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                                                    <td className="py-3 px-4 font-semibold text-slate-800">{route.name}</td>
                                                    <td className="py-3 px-4 text-slate-500 max-w-xs truncate">{route.description || '—'}</td>
                                                    <td className="py-3 px-4">
                                                        <Badge variant="secondary" className="bg-sky-100 text-sky-700 border-sky-200">
                                                            {route.stops?.length ?? 0} stops
                                                        </Badge>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        {route.is_active ? (
                                                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">Active</Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="text-slate-400">Inactive</Badge>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <div className="flex items-center gap-1 justify-end">
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-7 w-7 text-slate-400 hover:text-sky-600"
                                                                onClick={() => openEditRoute(route)}
                                                            >
                                                                <Pencil className="h-3.5 w-3.5" />
                                                            </Button>
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-7 w-7 text-slate-400 hover:text-rose-600"
                                                                onClick={() => handleDeleteRoute(route.route_id)}
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
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

                {/* ── Vehicles Tab ────────────────────────────────────────────── */}
                <TabsContent value="vehicles" className="animate-in fade-in slide-in-from-bottom-2 duration-400">
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-4">
                            <CardTitle className="text-base font-bold text-slate-800">Vehicles</CardTitle>
                            <Button
                                size="sm"
                                onClick={openAddVehicle}
                                className="bg-sky-600 hover:bg-sky-700 text-white"
                            >
                                <Plus className="h-4 w-4 mr-1.5" /> Add Vehicle
                            </Button>
                        </CardHeader>
                        <CardContent className="pt-4">
                            {vehicles.length === 0 ? (
                                <div className="text-center py-16 text-slate-400">
                                    <Truck className="h-10 w-10 mx-auto mb-3 opacity-30" />
                                    <p>No vehicles registered yet.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-100">
                                                <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Plate</th>
                                                <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Model</th>
                                                <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Capacity</th>
                                                <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Driver</th>
                                                <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Route</th>
                                                <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                                <th className="py-3 px-4" />
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {vehicles.map(vehicle => (
                                                <tr key={vehicle.vehicle_id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                                                    <td className="py-3 px-4 font-mono font-semibold text-slate-800">{vehicle.plate_number}</td>
                                                    <td className="py-3 px-4 text-slate-700">{vehicle.model}</td>
                                                    <td className="py-3 px-4 text-slate-600">{vehicle.capacity} seats</td>
                                                    <td className="py-3 px-4">
                                                        <div className="font-medium text-slate-700">{vehicle.driver_name}</div>
                                                        <div className="text-xs text-slate-400">{vehicle.driver_phone}</div>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        {vehicle.route ? (
                                                            <Badge variant="secondary" className="bg-sky-50 text-sky-700 border-sky-200">
                                                                {getRouteName(vehicle.route)}
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-slate-400 text-xs">Unassigned</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        {vehicle.is_active ? (
                                                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">Active</Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="text-slate-400">Inactive</Badge>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <div className="flex items-center gap-1 justify-end">
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-7 w-7 text-slate-400 hover:text-sky-600"
                                                                onClick={() => openEditVehicle(vehicle)}
                                                            >
                                                                <Pencil className="h-3.5 w-3.5" />
                                                            </Button>
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-7 w-7 text-slate-400 hover:text-rose-600"
                                                                onClick={() => handleDeleteVehicle(vehicle.vehicle_id)}
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
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

                {/* ── Assignments Tab ──────────────────────────────────────────── */}
                <TabsContent value="assignments" className="animate-in fade-in slide-in-from-bottom-2 duration-400">
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-4">
                            <CardTitle className="text-base font-bold text-slate-800">Student Assignments</CardTitle>
                            <Button
                                size="sm"
                                onClick={openAddAssignment}
                                className="bg-sky-600 hover:bg-sky-700 text-white"
                            >
                                <Plus className="h-4 w-4 mr-1.5" /> Assign Student
                            </Button>
                        </CardHeader>
                        <CardContent className="pt-4">
                            {assignments.length === 0 ? (
                                <div className="text-center py-16 text-slate-400">
                                    <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                                    <p>No student assignments yet.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-100">
                                                <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Student</th>
                                                <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Route</th>
                                                <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Vehicle</th>
                                                <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Pickup Stop</th>
                                                <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Monthly Fee</th>
                                                <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Active From</th>
                                                <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                                <th className="py-3 px-4" />
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {assignments.map(assignment => (
                                                <tr key={assignment.assignment_id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                                                    <td className="py-3 px-4 font-medium text-slate-800">
                                                        {assignment.student_name || assignment.student}
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <Badge variant="secondary" className="bg-sky-50 text-sky-700 border-sky-200">
                                                            {assignment.route_name || getRouteName(assignment.route)}
                                                        </Badge>
                                                    </td>
                                                    <td className="py-3 px-4 font-mono text-slate-600">
                                                        {getVehiclePlate(assignment.vehicle)}
                                                    </td>
                                                    <td className="py-3 px-4 text-slate-600">{assignment.pickup_stop || '—'}</td>
                                                    <td className="py-3 px-4 font-semibold text-slate-700">
                                                        {assignment.monthly_fee ? `$${Number(assignment.monthly_fee).toFixed(2)}` : '—'}
                                                    </td>
                                                    <td className="py-3 px-4 text-slate-500">
                                                        {assignment.active_from ? new Date(assignment.active_from).toLocaleDateString() : '—'}
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        {assignment.is_active ? (
                                                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">Active</Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="text-slate-400">Inactive</Badge>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        {assignment.is_active && (
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-7 w-7 text-slate-400 hover:text-rose-600"
                                                                title="Deactivate assignment"
                                                                onClick={() => handleDeactivateAssignment(assignment.assignment_id)}
                                                            >
                                                                <XCircle className="h-3.5 w-3.5" />
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

            {/* ── Route Dialog ───────────────────────────────────────────────── */}
            <Dialog open={showRouteDialog} onOpenChange={setShowRouteDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingRoute ? 'Edit Route' : 'Add Route'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="route-name">Route Name <span className="text-rose-500">*</span></Label>
                            <Input
                                id="route-name"
                                placeholder="e.g. North Campus Line"
                                value={routeForm.name}
                                onChange={e => setRouteForm(f => ({ ...f, name: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="route-desc">Description</Label>
                            <textarea
                                id="route-desc"
                                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                                placeholder="Optional description of this route..."
                                value={routeForm.description}
                                onChange={e => setRouteForm(f => ({ ...f, description: e.target.value }))}
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <Label>Status</Label>
                            <button
                                type="button"
                                onClick={() => setRouteForm(f => ({ ...f, is_active: !f.is_active }))}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 ${routeForm.is_active ? 'bg-sky-500' : 'bg-slate-200'}`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${routeForm.is_active ? 'translate-x-6' : 'translate-x-1'}`}
                                />
                            </button>
                            <span className="text-sm text-slate-600">{routeForm.is_active ? 'Active' : 'Inactive'}</span>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRouteDialog(false)}>Cancel</Button>
                        <Button
                            onClick={handleSaveRoute}
                            disabled={routeSubmitting}
                            className="bg-sky-600 hover:bg-sky-700"
                        >
                            {routeSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            {editingRoute ? 'Save Changes' : 'Create Route'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Vehicle Dialog ─────────────────────────────────────────────── */}
            <Dialog open={showVehicleDialog} onOpenChange={setShowVehicleDialog}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingVehicle ? 'Edit Vehicle' : 'Add Vehicle'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="v-plate">Plate Number <span className="text-rose-500">*</span></Label>
                                <Input
                                    id="v-plate"
                                    placeholder="e.g. KCA 123A"
                                    value={vehicleForm.plate_number}
                                    onChange={e => setVehicleForm(f => ({ ...f, plate_number: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="v-model">Model <span className="text-rose-500">*</span></Label>
                                <Input
                                    id="v-model"
                                    placeholder="e.g. Toyota Coaster"
                                    value={vehicleForm.model}
                                    onChange={e => setVehicleForm(f => ({ ...f, model: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="v-capacity">Seating Capacity</Label>
                            <Input
                                id="v-capacity"
                                type="number"
                                min="1"
                                placeholder="e.g. 30"
                                value={vehicleForm.capacity}
                                onChange={e => setVehicleForm(f => ({ ...f, capacity: e.target.value }))}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="v-driver">Driver Name</Label>
                                <Input
                                    id="v-driver"
                                    placeholder="Full name"
                                    value={vehicleForm.driver_name}
                                    onChange={e => setVehicleForm(f => ({ ...f, driver_name: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="v-phone">Driver Phone</Label>
                                <Input
                                    id="v-phone"
                                    placeholder="+1 555 000 0000"
                                    value={vehicleForm.driver_phone}
                                    onChange={e => setVehicleForm(f => ({ ...f, driver_phone: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Assigned Route</Label>
                            <Select
                                value={vehicleForm.route}
                                onValueChange={val => setVehicleForm(f => ({ ...f, route: val }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a route..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__none__">No route assigned</SelectItem>
                                    {routes.map(r => (
                                        <SelectItem key={r.route_id} value={r.route_id}>
                                            {r.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center gap-3">
                            <Label>Status</Label>
                            <button
                                type="button"
                                onClick={() => setVehicleForm(f => ({ ...f, is_active: !f.is_active }))}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 ${vehicleForm.is_active ? 'bg-sky-500' : 'bg-slate-200'}`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${vehicleForm.is_active ? 'translate-x-6' : 'translate-x-1'}`}
                                />
                            </button>
                            <span className="text-sm text-slate-600">{vehicleForm.is_active ? 'Active' : 'Inactive'}</span>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowVehicleDialog(false)}>Cancel</Button>
                        <Button
                            onClick={handleSaveVehicle}
                            disabled={vehicleSubmitting}
                            className="bg-sky-600 hover:bg-sky-700"
                        >
                            {vehicleSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            {editingVehicle ? 'Save Changes' : 'Add Vehicle'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Assignment Dialog ──────────────────────────────────────────── */}
            <Dialog open={showAssignmentDialog} onOpenChange={setShowAssignmentDialog}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Assign Student to Transport</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="a-student">Student ID <span className="text-rose-500">*</span></Label>
                            <Input
                                id="a-student"
                                placeholder="Enter student ID or UUID"
                                value={assignmentForm.student}
                                onChange={e => setAssignmentForm(f => ({ ...f, student: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Route <span className="text-rose-500">*</span></Label>
                            <Select
                                value={assignmentForm.route}
                                onValueChange={val => setAssignmentForm(f => ({ ...f, route: val }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a route..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {routes.map(r => (
                                        <SelectItem key={r.route_id} value={r.route_id}>
                                            {r.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Vehicle</Label>
                            <Select
                                value={assignmentForm.vehicle}
                                onValueChange={val => setAssignmentForm(f => ({ ...f, vehicle: val }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a vehicle..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__none__">No vehicle</SelectItem>
                                    {vehicles.map(v => (
                                        <SelectItem key={v.vehicle_id} value={v.vehicle_id}>
                                            {v.plate_number} — {v.model}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="a-stop">Pickup Stop</Label>
                            <Input
                                id="a-stop"
                                placeholder="e.g. Main Gate, Stop 3"
                                value={assignmentForm.pickup_stop}
                                onChange={e => setAssignmentForm(f => ({ ...f, pickup_stop: e.target.value }))}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="a-fee">Monthly Fee ($)</Label>
                                <Input
                                    id="a-fee"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={assignmentForm.monthly_fee}
                                    onChange={e => setAssignmentForm(f => ({ ...f, monthly_fee: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="a-from">Active From</Label>
                                <Input
                                    id="a-from"
                                    type="date"
                                    value={assignmentForm.active_from}
                                    onChange={e => setAssignmentForm(f => ({ ...f, active_from: e.target.value }))}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAssignmentDialog(false)}>Cancel</Button>
                        <Button
                            onClick={handleSaveAssignment}
                            disabled={assignmentSubmitting}
                            className="bg-sky-600 hover:bg-sky-700"
                        >
                            {assignmentSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Assign Student
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
