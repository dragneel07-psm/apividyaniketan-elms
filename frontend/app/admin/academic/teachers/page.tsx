// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

/* eslint-disable @next/next/no-img-element */

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
    ArrowLeft, Plus, Search, MoreHorizontal, User as UserIcon, Download,
    ShieldCheck, ShieldAlert, X, Mail, Edit, Briefcase, Lock, BookOpen, GraduationCap, BarChart3
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { academicAPI, usersAPI, Teacher, AcademicClass, TeacherProfileOverview } from '@/lib/api';
import { ChangePasswordDialog } from '@/components/admin/change-password-dialog';
import { toast } from 'sonner';

// Helper to generate consistent avatars
const getAvatarUrl = (seed: string) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=e5e7eb`;

// Extended interface for form handling
interface TeacherFormState extends Partial<Teacher> {
    password?: string;
}

export default function TeachersPage() {
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [classes, setClasses] = useState<AcademicClass[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Dialog State
    const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogMode, setDialogMode] = useState<'view' | 'edit' | 'create'>('view');
    const [teacherOverview, setTeacherOverview] = useState<TeacherProfileOverview | null>(null);
    const [teacherOverviewLoading, setTeacherOverviewLoading] = useState(false);

    // Create Form State
    const [newTeacher, setNewTeacher] = useState<TeacherFormState>({
        first_name: '',
        last_name: '',
        email: '',
        username: '',
        password: 'ChangeMe123!',
        designation: 'subject_teacher',
        assigned_classes: []
    });

    // Password Dialog State
    const [passwordDialog, setPasswordDialog] = useState<{ open: boolean; userId: string; userName: string }>({
        open: false, userId: '', userName: ''
    });

    // Assign Classes Dialog State
    const [assignDialog, setAssignDialog] = useState<{ open: boolean; teacher: Teacher | null; selectedIds: number[] }>({
        open: false, teacher: null, selectedIds: []
    });
    const [assignSaving, setAssignSaving] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (!dialogOpen || dialogMode !== 'view' || !selectedTeacher?.id) {
            setTeacherOverview(null);
            setTeacherOverviewLoading(false);
            return;
        }

        let cancelled = false;

        const loadTeacherOverview = async () => {
            setTeacherOverviewLoading(true);
            try {
                const overview = await academicAPI.getTeacherProfileOverview(selectedTeacher.id);
                if (!cancelled) {
                    setTeacherOverview(overview);
                }
            } catch (error) {
                console.error('Failed to load teacher profile overview:', error);
                if (!cancelled) {
                    setTeacherOverview(null);
                    toast.error('Failed to load teaching profile details.');
                }
            } finally {
                if (!cancelled) {
                    setTeacherOverviewLoading(false);
                }
            }
        };

        loadTeacherOverview();

        return () => {
            cancelled = true;
        };
    }, [dialogOpen, dialogMode, selectedTeacher?.id]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [teachersData, classesData] = await Promise.all([
                academicAPI.getTeachers(),
                academicAPI.getClasses()
            ]);
            setTeachers(teachersData);
            setClasses(classesData);
        } catch (error) {
            console.error('Failed to load teachers:', error);
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const getAssignedClasses = (assignedIds: number[] | undefined) => {
        if (!assignedIds || assignedIds.length === 0) return [];
        return assignedIds.map(id => classes.find(c => c.id === id)).filter(Boolean) as AcademicClass[];
    };

    const handleExportCSV = () => {
        const headers = ['ID', 'First Name', 'Last Name', 'Username', 'Email', 'Designation', 'Status'];
        const rows = teachers.map(t => [
            t.id,
            t.first_name || '',
            t.last_name || '',
            t.username || '',
            t.email || '',
            t.designation,
            t.is_active === false ? 'Suspended' : 'Active'
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `teachers_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleCreateTeacher = async () => {
        if (!newTeacher.first_name || !newTeacher.last_name || !newTeacher.username || !newTeacher.email) {
            toast.error('Please fill in all required fields.');
            return;
        }

        try {
            await academicAPI.createTeacher({
                first_name: newTeacher.first_name,
                last_name: newTeacher.last_name,
                username: newTeacher.username,
                email: newTeacher.email,
                password: newTeacher.password,
                designation: newTeacher.designation,
                assigned_classes: newTeacher.assigned_classes
            });

            toast.success('Teacher created successfully!');
            setDialogOpen(false);
            setNewTeacher({
                first_name: '', last_name: '', email: '', username: '', password: 'ChangeMe123!', designation: 'subject_teacher', assigned_classes: []
            });
            await loadData();
        } catch (error: unknown) {
            console.error(error);
            const message = error instanceof Error ? error.message : 'Unknown error';
            toast.error(`Failed to create teacher: ${message}`);
        }
    };

    const handleSuspend = async (teacher: Teacher) => {
        const action = teacher.is_active === false ? 'activate' : 'suspend';
        if (!confirm(`Are you sure you want to ${action} this teacher?`)) return;

        try {
            const newState = teacher.is_active === false;
            if (teacher.user_id) {
                await usersAPI.updateAccount(teacher.user_id, { is_active: newState });
            }

            // Optimistic update
            setTeachers(teachers.map(t => t.id === teacher.id ? { ...t, is_active: newState } : t));
            toast.success(`Teacher ${newState ? 'activated' : 'suspended'} successfully.`);
        } catch (e) {
            console.error(e);
            toast.error('Failed to update status.');
        }
    };

    const handleSaveTeacher = async () => {
        if (!selectedTeacher) return;
        try {
            await academicAPI.updateTeacher(selectedTeacher.id, {
                designation: selectedTeacher.designation,
                assigned_classes: selectedTeacher.assigned_classes
            });

            toast.success('Teacher updated successfully!');
            setDialogOpen(false);
            loadData();
        } catch (e) {
            console.error(e);
            toast.error('Failed to update teacher');
        }
    };

    const handleAssignClasses = async () => {
        if (!assignDialog.teacher) return;
        setAssignSaving(true);
        try {
            await academicAPI.assignTeacherClasses(assignDialog.teacher.id, assignDialog.selectedIds, 'set');
            setTeachers(teachers.map(t =>
                t.id === assignDialog.teacher!.id
                    ? { ...t, assigned_classes: assignDialog.selectedIds }
                    : t
            ));
            toast.success('Classes assigned successfully!');
            setAssignDialog({ open: false, teacher: null, selectedIds: [] });
        } catch (e) {
            console.error(e);
            toast.error('Failed to assign classes.');
        } finally {
            setAssignSaving(false);
        }
    };

    const [selectedDesignation, setSelectedDesignation] = useState<string>('all');
    const [selectedClass, setSelectedClass] = useState<string>('all');

    const filteredTeachers = teachers.filter(teacher => {
        const matchesSearch = ((teacher.first_name || '') + ' ' + (teacher.last_name || '') + ' ' + (teacher.username || '') + ' ' + teacher.designation).toLowerCase().includes(searchTerm.toLowerCase());

        // Filter by Designation
        if (selectedDesignation !== 'all') {
            if (teacher.designation !== selectedDesignation) return false;
        }

        // Filter by Assigned Class
        if (selectedClass !== 'all') {
            const classIdToCheck = parseInt(selectedClass);
            if (!teacher.assigned_classes || !teacher.assigned_classes.includes(classIdToCheck)) return false;
        }

        return matchesSearch;
    });

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen dark:bg-slate-900 font-sans">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-sidebar-border/10 pb-6">
                <div className="flex items-center gap-4">
                    <Link href="/admin/academic">
                        <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-200 dark:hover:bg-slate-800">
                            <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Teacher Management</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">Manage faculty members, track designations, and assignments.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={handleExportCSV} className="shadow-sm border-slate-200 dark:border-slate-700">
                        <Download className="mr-2 h-4 w-4" /> Export CSV
                    </Button>
                    <Button
                        onClick={() => {
                            setNewTeacher({ first_name: '', last_name: '', email: '', username: '', password: 'ChangeMe123!', designation: 'subject_teacher', assigned_classes: [] });
                            setDialogMode('create');
                            setDialogOpen(true);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all hover:scale-105"
                    >
                        <Plus className="mr-2 h-4 w-4" /> Add Teacher
                    </Button>
                </div>
            </header>

            {/* Filters */}
            <div className="flex flex-col md:flex-row items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="relative flex-1 w-full md:max-w-md">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search by name, email, or designation..."
                        className="pl-10 bg-slate-50 dark:bg-slate-900 border-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    <select
                        className="h-10 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[120px]"
                        value={selectedDesignation}
                        onChange={(e) => setSelectedDesignation(e.target.value)}
                    >
                        <option value="all">All Roles</option>
                        <option value="subject_teacher">Subject Teacher</option>
                        <option value="class_teacher">Class Teacher</option>
                        <option value="program_director">Program Director</option>
                    </select>

                    <select
                        className="h-10 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[120px]"
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                    >
                        <option value="all">All Classes</option>
                        {classes.map(c => (
                            <option key={c.id} value={c.id}>Grade {c.name}</option>
                        ))}
                    </select>

                    <Button
                        variant="ghost"
                        size="icon"
                        title="Clear Filters"
                        onClick={() => { setSelectedDesignation('all'); setSelectedClass('all'); setSearchTerm(''); }}
                        className="text-slate-400 hover:text-red-500"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Teachers Table */}
            <Card className="border-none shadow-md overflow-hidden">
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
                            <p>Loading faculty records...</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                                <TableRow>
                                    <TableHead className="w-[80px]">Avatar</TableHead>
                                    <TableHead>Teacher Info</TableHead>
                                    <TableHead>Designation</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Assigned Classes</TableHead>
                                    <TableHead className="text-right pr-6">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredTeachers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                                            No teachers found matching your search.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredTeachers.map((teacher) => (
                                        <TableRow key={teacher.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                            <TableCell>
                                                <img
                                                    src={getAvatarUrl(teacher.username || String(teacher.id))}
                                                    alt="Avatar"
                                                    className="h-10 w-10 rounded-full border border-slate-200 dark:border-slate-700 bg-white"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                                                        {teacher.first_name || teacher.last_name
                                                            ? `${teacher.first_name || ''} ${teacher.last_name || ''}`.trim()
                                                            : 'Unknown Name'}
                                                    </span>
                                                    <span className="text-xs text-slate-500">{teacher.email || teacher.username}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="font-medium bg-purple-50 text-purple-700 border-purple-200 capitalize">
                                                    {(teacher.designation || 'Teacher').replace('_', ' ')}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {teacher.is_active === false ? (
                                                    <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-red-200 shadow-none">Suspended</Badge>
                                                ) : (
                                                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200 shadow-none">Active</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-sm text-slate-600">
                                                {getAssignedClasses(teacher.assigned_classes).length > 0 ? (
                                                    <div className="flex gap-1 flex-wrap">
                                                        {getAssignedClasses(teacher.assigned_classes).map(c => (
                                                            <span key={c.id} className="px-1.5 py-0.5 rounded bg-slate-100 text-xs border border-slate-200">
                                                                {c.name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 italic">None</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right lg:pr-6">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 p-0 rounded-full hover:bg-indigo-50 hover:text-indigo-600">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-56 p-2 rounded-xl border-slate-200 shadow-xl">
                                                        <DropdownMenuLabel className="text-xs text-slate-500 font-normal ml-2">Manage Teacher</DropdownMenuLabel>
                                                        <DropdownMenuItem
                                                            onClick={() => {
                                                                setSelectedTeacher(teacher);
                                                                setDialogMode('view');
                                                                setDialogOpen(true);
                                                            }}
                                                            className="rounded-lg cursor-pointer focus:bg-indigo-50 focus:text-indigo-600"
                                                        >
                                                            <UserIcon className="mr-2 h-4 w-4" /> View Profile
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => {
                                                                setSelectedTeacher(teacher);
                                                                setDialogMode('edit');
                                                                setDialogOpen(true);
                                                            }}
                                                            className="rounded-lg cursor-pointer focus:bg-indigo-50 focus:text-indigo-600"
                                                        >
                                                            <Edit className="mr-2 h-4 w-4" /> Edit Designation
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => setAssignDialog({
                                                                open: true,
                                                                teacher,
                                                                selectedIds: [...(teacher.assigned_classes || [])]
                                                            })}
                                                            className="rounded-lg cursor-pointer focus:bg-indigo-50 focus:text-indigo-600"
                                                        >
                                                            <BookOpen className="mr-2 h-4 w-4" /> Assign Classes
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => setPasswordDialog({
                                                                open: true,
                                                                userId: teacher.user_id,
                                                                userName: `${teacher.first_name || ''} ${teacher.last_name || ''}`
                                                            })}
                                                            className="rounded-lg cursor-pointer focus:bg-indigo-50 focus:text-indigo-600"
                                                        >
                                                            <Lock className="mr-2 h-4 w-4" /> Change Password
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator className="my-1 bg-slate-100" />
                                                        <DropdownMenuItem
                                                            onClick={() => handleSuspend(teacher)}
                                                            className={teacher.is_active === false ? "text-emerald-600 focus:text-emerald-700 focus:bg-emerald-50 rounded-lg cursor-pointer" : "text-red-600 focus:text-red-700 focus:bg-red-50 rounded-lg cursor-pointer"}
                                                        >
                                                            {teacher.is_active === false ? <ShieldCheck className="mr-2 h-4 w-4" /> : <ShieldAlert className="mr-2 h-4 w-4" />}
                                                            {teacher.is_active === false ? 'Activate Account' : 'Suspend Account'}
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Teacher Dialog (View/Edit/Create) */}
            {dialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-all duration-200">
                    <Card className="w-full max-w-5xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden border-0 rounded-2xl ring-1 ring-slate-900/5">

                        {/* Profile Banner */}
                        <div className="h-32 bg-gradient-to-r from-teal-500 via-emerald-500 to-green-500 relative">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDialogOpen(false)}
                                className="absolute right-4 top-4 text-white/80 hover:text-white hover:bg-white/20 rounded-full"
                            >
                                <X className="h-5 w-5" />
                            </Button>
                        </div>

                        {/* Profile Header (Overlapping) */}
                        <div className="px-8 pb-6 relative">
                            <div className="flex justify-between items-end -mt-12 mb-6">
                                <div className="flex items-end">
                                    <img
                                        src={getAvatarUrl(dialogMode === 'create' ? newTeacher.username || 'new' : selectedTeacher?.username || '')}
                                        className="h-24 w-24 rounded-full border-4 border-white dark:border-slate-900 shadow-lg bg-white"
                                        alt="Profile"
                                    />
                                    <div className="ml-4 mb-1">
                                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                                            {dialogMode === 'create' ? 'New Teacher' : `${selectedTeacher?.first_name || 'Teacher'} ${selectedTeacher?.last_name || ''}`}
                                        </h2>
                                        <div className="flex items-center text-slate-500 text-sm">
                                            {dialogMode !== 'create' && <><Mail className="h-3 w-3 mr-1" /> {selectedTeacher?.email || 'No email'}</>}
                                        </div>
                                    </div>
                                </div>
                                {dialogMode === 'view' && (
                                    <Button onClick={() => setDialogMode('edit')} variant="outline" size="sm" className="mb-2 rounded-full hidden sm:flex">
                                        Edit Profile
                                    </Button>
                                )}
                            </div>

                            <CardContent className="p-0 space-y-6">
                                {dialogMode === 'create' ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">First Name *</label>
                                            <Input
                                                value={newTeacher.first_name}
                                                onChange={(e) => setNewTeacher({ ...newTeacher, first_name: e.target.value })}
                                                placeholder="Jane"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Last Name *</label>
                                            <Input
                                                value={newTeacher.last_name}
                                                onChange={(e) => setNewTeacher({ ...newTeacher, last_name: e.target.value })}
                                                placeholder="Smith"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Username *</label>
                                            <Input
                                                value={newTeacher.username}
                                                onChange={(e) => setNewTeacher({ ...newTeacher, username: e.target.value })}
                                                placeholder="janesmith"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Email *</label>
                                            <Input
                                                type="email"
                                                value={newTeacher.email}
                                                onChange={(e) => setNewTeacher({ ...newTeacher, email: e.target.value })}
                                                placeholder="jane@school.edu"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Designation *</label>
                                            <select
                                                className="w-full h-10 px-3 rounded-md border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                value={newTeacher.designation}
                                                onChange={(e) =>
                                                    setNewTeacher({
                                                        ...newTeacher,
                                                        designation: e.target.value as Teacher['designation']
                                                    })
                                                }
                                            >
                                                <option value="subject_teacher">Subject Teacher</option>
                                                <option value="class_teacher">Class Teacher</option>
                                                <option value="program_director">Program Director</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Default Password</label>
                                            <Input
                                                disabled
                                                value={newTeacher.password}
                                                className="bg-slate-50 text-slate-500"
                                            />
                                        </div>

                                        <div className="space-y-2 md:col-span-2">
                                            <label className="text-sm font-medium">Assigned Classes</label>
                                            <div className="border rounded-md p-3 max-h-60 overflow-y-auto bg-slate-50">
                                                <div className="space-y-3">
                                                    {classes.map(c => (
                                                        <div key={c.id} className="bg-white p-2 rounded border border-slate-100">
                                                            <label className="flex items-center space-x-2 cursor-pointer font-medium mb-1">
                                                                <input
                                                                    type="checkbox"
                                                                    className="rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                                                    checked={newTeacher.assigned_classes?.includes(c.id) || false}
                                                                    onChange={(e) => {
                                                                        const checked = e.target.checked;
                                                                        const current = newTeacher.assigned_classes || [];
                                                                        if (checked) setNewTeacher({ ...newTeacher, assigned_classes: [...current, c.id] });
                                                                        else setNewTeacher({ ...newTeacher, assigned_classes: current.filter(id => id !== c.id) });
                                                                    }}
                                                                />
                                                                <span className="text-sm text-slate-700">Grade {c.name}</span>
                                                            </label>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    // View / Edit Mode Content
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            {/* Professional Info */}
                                            <div className="space-y-4">
                                                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center">
                                                    <Briefcase className="h-4 w-4 mr-2" /> Professional Info
                                                </h3>
                                                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl space-y-3">
                                                    <div>
                                                        <label className="text-xs text-slate-500 block mb-1">Designation</label>
                                                        {dialogMode === 'view' ? (
                                                            <div className="font-medium text-slate-900 capitalize">{(selectedTeacher?.designation || 'Teacher').replace('_', ' ')}</div>
                                                        ) : (
                                                            <select
                                                                className="w-full p-2 rounded-md border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                                                value={selectedTeacher?.designation || ''}
                                                                onChange={(e) =>
                                                                    setSelectedTeacher(
                                                                        selectedTeacher
                                                                            ? { ...selectedTeacher, designation: e.target.value as Teacher['designation'] }
                                                                            : null
                                                                    )
                                                                }
                                                            >
                                                                <option value="subject_teacher">Subject Teacher</option>
                                                                <option value="class_teacher">Class Teacher</option>
                                                                <option value="program_director">Program Director</option>
                                                            </select>
                                                        )}
                                                    </div>
                                                    {/* Assigned Classes Logic */}
                                                    {dialogMode === 'view' ? (
                                                        <div className="flex gap-2 flex-wrap">
                                                            {getAssignedClasses(selectedTeacher?.assigned_classes).length > 0 ?
                                                                getAssignedClasses(selectedTeacher?.assigned_classes).map((c) => (
                                                                    <span key={c.id} className="px-2 py-1 rounded-md border text-xs font-medium bg-white">
                                                                        Grade {c.name}
                                                                    </span>
                                                                ))
                                                                : <span className="text-sm text-slate-400">No active assignments</span>}
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-4">
                                                            <div>
                                                                <div className="border rounded-md p-3 max-h-60 overflow-y-auto bg-white">
                                                                    <div className="text-xs text-slate-500 mb-2">Select classes to teach:</div>
                                                                    <div className="space-y-3">
                                                                        {classes.map(c => (
                                                                            <div key={c.id} className="bg-slate-50 p-2 rounded border border-slate-100">
                                                                                <label className="flex items-center space-x-2 cursor-pointer font-medium mb-1">
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        className="rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                                                                        checked={selectedTeacher?.assigned_classes?.includes(c.id) || false}
                                                                                        onChange={(e) => {
                                                                                            const checked = e.target.checked;
                                                                                            setSelectedTeacher(prev => {
                                                                                                if (!prev) return null;
                                                                                                const current = prev.assigned_classes || [];
                                                                                                if (checked) return { ...prev, assigned_classes: [...current, c.id] };
                                                                                                else return { ...prev, assigned_classes: current.filter(id => id !== c.id) };
                                                                                            });
                                                                                        }}
                                                                                    />
                                                                                    <span className="text-sm text-slate-800">Grade {c.name}</span>
                                                                                </label>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Account Check */}
                                            <div className="space-y-4">
                                                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center">
                                                    <ShieldCheck className="h-4 w-4 mr-2" /> Account Status
                                                </h3>
                                                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl space-y-3">
                                                    <div className="flex justify-between items-center">
                                                        <div className="text-sm text-slate-600">Username</div>
                                                        <div className="font-mono text-xs bg-white px-2 py-1 rounded border">{selectedTeacher?.username}</div>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <div className="text-sm text-slate-600">Account Status</div>
                                                        {selectedTeacher?.is_active === false ? (
                                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">Suspended</span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Active</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {dialogMode === 'view' && (
                                            <div className="space-y-4">
                                                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center">
                                                    <BarChart3 className="h-4 w-4 mr-2" /> Teaching Coverage
                                                </h3>

                                                {teacherOverviewLoading && (
                                                    <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 py-8 text-sm text-slate-500">
                                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600 mr-3"></div>
                                                        Loading teaching details...
                                                    </div>
                                                )}

                                                {!teacherOverviewLoading && teacherOverview && (
                                                    <>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                                            <div className="rounded-xl border bg-white p-3">
                                                                <div className="text-xs text-slate-500 flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" /> Subjects</div>
                                                                <div className="text-2xl font-semibold text-slate-900">{teacherOverview.summary.total_subjects}</div>
                                                            </div>
                                                            <div className="rounded-xl border bg-white p-3">
                                                                <div className="text-xs text-slate-500 flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5" /> Classes</div>
                                                                <div className="text-2xl font-semibold text-slate-900">{teacherOverview.summary.total_classes}</div>
                                                                <div className="text-[11px] text-slate-500">
                                                                    Class teacher: {teacherOverview.summary.total_classes_as_class_teacher} | Subject teacher: {teacherOverview.summary.total_classes_as_subject_teacher}
                                                                </div>
                                                            </div>
                                                            <div className="rounded-xl border bg-white p-3">
                                                                <div className="text-xs text-slate-500">Lessons Taught</div>
                                                                <div className="text-2xl font-semibold text-emerald-600">{teacherOverview.summary.taught_lessons}</div>
                                                            </div>
                                                            <div className="rounded-xl border bg-white p-3">
                                                                <div className="text-xs text-slate-500">Lessons Left</div>
                                                                <div className="text-2xl font-semibold text-amber-600">{teacherOverview.summary.remaining_lessons}</div>
                                                                <div className="text-[11px] text-slate-500">{teacherOverview.summary.progress_percentage}% completed</div>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                                            <div className="rounded-xl border bg-white p-4 space-y-3">
                                                                <h4 className="text-sm font-semibold text-slate-800">Subjects Taught</h4>
                                                                {teacherOverview.subjects.length === 0 ? (
                                                                    <p className="text-sm text-slate-500">No subject assignments found.</p>
                                                                ) : (
                                                                    <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                                                                        {teacherOverview.subjects.map((subject) => (
                                                                            <div key={`${subject.class_id}-${subject.subject_id}-${subject.role}`} className="rounded-lg border border-slate-200 p-3">
                                                                                <div className="flex items-center justify-between gap-2">
                                                                                    <div>
                                                                                        <div className="font-medium text-slate-900">{subject.subject_name}</div>
                                                                                        <div className="text-xs text-slate-500">
                                                                                            {subject.class_name} {subject.section_names.length > 0 ? `(${subject.section_names.join(', ')})` : ''}
                                                                                        </div>
                                                                                    </div>
                                                                                    <Badge variant="outline" className="capitalize">
                                                                                        {subject.role === 'lead_teacher' ? 'Lead Teacher' : 'Additional Teacher'}
                                                                                    </Badge>
                                                                                </div>
                                                                                <div className="mt-2">
                                                                                    <div className="flex justify-between text-xs text-slate-500">
                                                                                        <span>Taught {subject.taught_lessons}/{subject.total_lessons}</span>
                                                                                        <span>{subject.progress_percentage}%</span>
                                                                                    </div>
                                                                                    <div className="mt-1 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                                                                                        <div className="h-full bg-emerald-500" style={{ width: `${subject.progress_percentage}%` }} />
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="rounded-xl border bg-white p-4 space-y-3">
                                                                <h4 className="text-sm font-semibold text-slate-800">Class & Section Responsibilities</h4>
                                                                {teacherOverview.class_sections_progress.length === 0 ? (
                                                                    <p className="text-sm text-slate-500">No class responsibilities found.</p>
                                                                ) : (
                                                                    <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                                                                        {teacherOverview.class_sections_progress.map((classRow) => (
                                                                            <div key={classRow.class_id} className="rounded-lg border border-slate-200 p-3">
                                                                                <div className="flex items-start justify-between gap-2">
                                                                                    <div>
                                                                                        <div className="font-medium text-slate-900">{classRow.class_name}</div>
                                                                                        <div className="text-xs text-slate-500">
                                                                                            Sections: {classRow.section_names.length > 0 ? classRow.section_names.join(', ') : 'None'}
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="flex gap-1 flex-wrap justify-end">
                                                                                        {classRow.roles.map((role) => (
                                                                                            <Badge key={`${classRow.class_id}-${role}`} variant="outline" className="capitalize">
                                                                                                {role.replace('_', ' ')}
                                                                                            </Badge>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>
                                                                                <div className="mt-2 text-xs text-slate-600">
                                                                                    Subjects: {classRow.subjects.length > 0 ? classRow.subjects.map((s) => s.subject_name).join(', ') : 'None'}
                                                                                </div>
                                                                                <div className="mt-2">
                                                                                    <div className="flex justify-between text-xs text-slate-500">
                                                                                        <span>Coverage {classRow.taught_lessons}/{classRow.total_lessons}</span>
                                                                                        <span>{classRow.progress_percentage}%</span>
                                                                                    </div>
                                                                                    <div className="mt-1 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                                                                                        <div className="h-full bg-indigo-500" style={{ width: `${classRow.progress_percentage}%` }} />
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </>
                                                )}

                                                {!teacherOverviewLoading && !teacherOverview && (
                                                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 py-6 text-center text-sm text-slate-500">
                                                        Teaching coverage details are not available for this teacher yet.
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>

                            {/* Footer Actions */}
                            <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end gap-3">
                                <Button variant="ghost" className="hover:bg-slate-100" onClick={() => setDialogOpen(false)}>Cancel</Button>
                                {dialogMode === 'create' && (
                                    <Button onClick={handleCreateTeacher} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6">Create Teacher</Button>
                                )}
                                {dialogMode === 'edit' && (
                                    <Button onClick={handleSaveTeacher} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6">Save Changes</Button>
                                )}
                            </div>
                        </div> {/* End Profile Header Wrapper */}
                    </Card>
                </div>
            )}

            {/* Password Dialog */}
            <ChangePasswordDialog
                open={passwordDialog.open}
                onOpenChange={(open) => setPasswordDialog(prev => ({ ...prev, open }))}
                userId={passwordDialog.userId}
                userName={passwordDialog.userName}
            />

            {/* Assign Classes Dialog */}
            {assignDialog.open && assignDialog.teacher && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <Card className="w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl rounded-2xl border-0 ring-1 ring-slate-900/5">
                        <div className="p-6 space-y-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Assign Classes</h2>
                                    <p className="text-sm text-slate-500 mt-0.5">
                                        {assignDialog.teacher.first_name} {assignDialog.teacher.last_name}
                                    </p>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => setAssignDialog({ open: false, teacher: null, selectedIds: [] })}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>

                            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                                {classes.map(c => (
                                    <label key={c.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 accent-indigo-600"
                                            checked={assignDialog.selectedIds.includes(c.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setAssignDialog(d => ({ ...d, selectedIds: [...d.selectedIds, c.id] }));
                                                } else {
                                                    setAssignDialog(d => ({ ...d, selectedIds: d.selectedIds.filter(id => id !== c.id) }));
                                                }
                                            }}
                                        />
                                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{c.name}</span>
                                    </label>
                                ))}
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <Button variant="ghost" onClick={() => setAssignDialog({ open: false, teacher: null, selectedIds: [] })}>
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleAssignClasses}
                                    disabled={assignSaving}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6"
                                >
                                    {assignSaving ? 'Saving...' : 'Save Assignments'}
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
