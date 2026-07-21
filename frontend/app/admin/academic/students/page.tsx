// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Trash2, Loader2, User, Filter, Edit, Mail, Eye, Lock, UserRoundPlus, Wrench, AlertTriangle } from 'lucide-react';
import { academicAPI, AcademicClass, Student } from '@/lib/api';
import Link from 'next/link';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StudentProfileOverviewDialog } from '@/components/student/student-profile-overview-dialog';
import { ChangePasswordDialog } from '@/components/admin/change-password-dialog';

type StudentFormData = {
    first_name: string;
    last_name: string;
    email: string;
    username: string;
    password: string;
    academic_class: string;
    section: string;
    learning_style: NonNullable<Student['learning_style']>;
    daily_study_goal: number;
};

const defaultFormData: StudentFormData = {
    first_name: '',
    last_name: '',
    email: '',
    username: '',
    password: '',
    academic_class: '',
    section: '',
    learning_style: 'visual',
    daily_study_goal: 30,
};

export default function StudentsPage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [classes, setClasses] = useState<AcademicClass[]>([]);
    const [loading, setLoading] = useState(true);
    const [classFilter, setClassFilter] = useState<string>('all');

    // Form State
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [currentStudentId, setCurrentStudentId] = useState<string | null>(null);
    const [profileStudent, setProfileStudent] = useState<Student | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [passwordDialog, setPasswordDialog] = useState<{ open: boolean; userId: string; userName: string }>({
        open: false,
        userId: '',
        userName: '',
    });
    const [repairDialog, setRepairDialog] = useState<{ open: boolean; student: Student | null }>({ open: false, student: null });
    const [repairForm, setRepairForm] = useState({ email: '', password: 'Student@123', first_name: '', last_name: '' });
    const [repairing, setRepairing] = useState(false);

    const [formData, setFormData] = useState<StudentFormData>(defaultFormData);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const [studentsData, classesData] = await Promise.all([
                academicAPI.getStudents(),
                academicAPI.getClasses()
            ]);
            setStudents(studentsData);
            setClasses(classesData.sort((a, b) => a.order - b.order));
        } catch (error) {
            console.error('Failed to load data', error);
            toast.error('Failed to load students');
        } finally {
            setLoading(false);
        }
    }

    const resetForm = () => {
        setFormData(defaultFormData);
        setCurrentStudentId(null);
    };

    const openEditDialog = (student: Student) => {
        setFormData({
            first_name: student.first_name,
            last_name: student.last_name,
            email: student.email,
            username: student.username || '',
            password: '',
            academic_class: student.academic_class ? student.academic_class.toString() : '',
            section: student.section ? student.section.toString() : '',
            learning_style: student.learning_style || 'visual',
            daily_study_goal: student.daily_study_goal || 30
        });
        setCurrentStudentId(student.id);
        setIsDialogOpen(true);
    };

    const handleSubmit = async () => {
        if (!formData.first_name || !formData.last_name || !formData.email) {
            toast.error("Name and Email are required");
            return;
        }

        try {
            setSubmitting(true);
            const payload: Partial<Student> & { password?: string } = {
                first_name: formData.first_name,
                last_name: formData.last_name,
                email: formData.email,
                username: formData.username || formData.email.split('@')[0],
                academic_class: formData.academic_class ? parseInt(formData.academic_class) : null,
                section: formData.section ? parseInt(formData.section) : null,
                learning_style: formData.learning_style,
                daily_study_goal: formData.daily_study_goal
            };

            if (currentStudentId) {
                await academicAPI.updateStudent(currentStudentId, payload);
                toast.success("Student updated");
            }

            setIsDialogOpen(false);
            await loadData(); // Reload to get updates
        } catch (error) {
            console.error(error);
            let message = "Failed to save student";
            if (error instanceof Error) {
                message = error.message || message;
                try {
                    const parsed = JSON.parse(error.message);
                    if (Array.isArray(parsed?.email) && parsed.email[0]) {
                        message = parsed.email[0];
                    } else if (Array.isArray(parsed?.non_field_errors) && parsed.non_field_errors[0]) {
                        message = parsed.non_field_errors[0];
                    } else if (typeof parsed?.detail === 'string' && parsed.detail) {
                        message = parsed.detail;
                    }
                } catch {
                    // Keep original message when API did not return JSON payload.
                }
            }
            toast.error(message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure? This will delete the student and their account.')) return;
        try {
            await academicAPI.deleteStudent(id);
            toast.success("Student deleted");
            setStudents(students.filter(s => s.id !== id));
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete student");
        }
    };

    const openPasswordDialog = (student: Student, closeProfile = false) => {
        if (!student.user_id) {
            toast.error('This student has no linked user account. Delete and re-admit via the Admissions Pipeline to fix this.');
            return;
        }
        if (closeProfile) {
            setProfileStudent(null);
        }
        setPasswordDialog({
            open: true,
            userId: student.user_id,
            userName: `${student.first_name || ''} ${student.last_name || ''}`.trim() || student.email || 'Student',
        });
    };

    const openRepairDialog = (student: Student) => {
        setRepairForm({
            email: student.email || '',
            password: 'Student@123',
            first_name: student.first_name || '',
            last_name: student.last_name || '',
        });
        setRepairDialog({ open: true, student });
    };

    const handleRepair = async () => {
        if (!repairDialog.student) return;
        if (!repairForm.email.trim()) { toast.error('Email is required.'); return; }
        setRepairing(true);
        try {
            const res = await academicAPI.repairStudentUser(repairDialog.student.id, repairForm);
            toast.success('Student account repaired successfully.');
            setRepairDialog({ open: false, student: null });
            // Update student in local state
            setStudents(prev => prev.map(s =>
                s.id === repairDialog.student!.id ? { ...s, ...res.student } : s
            ));
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to repair account.');
        } finally {
            setRepairing(false);
        }
    };

    // Helper: Find full class object matching selected ID
    const selectedClass = classes.find(c => c.id.toString() === formData.academic_class);
    const availableSections = selectedClass?.sections || [];

    // Filter Logic
    const filteredStudents = students.filter(s => {
        if (classFilter !== 'all' && s.academic_class?.toString() !== classFilter) return false;
        return true;
    });

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen dark:bg-slate-900">
            {/* Header */}
            <header className="flex items-center justify-between border-b pb-6">
                <div className="flex items-center gap-4">
                    <Link href="/admin/academic">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Students</h1>
                        <p className="text-slate-500 text-sm">Manage student enrollments and profiles.</p>
                    </div>
                </div>

                <Link href="/admin/admissions">
                    <Button className="bg-indigo-600 hover:bg-indigo-700">
                        <UserRoundPlus className="mr-2 h-4 w-4" /> Admissions Pipeline
                    </Button>
                </Link>
            </header>

            {/* Info banner */}
            <div className="flex items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
                <UserRoundPlus className="h-4 w-4 shrink-0" />
                <span>
                    New students are enrolled via the{' '}
                    <Link href="/admin/admissions" className="font-semibold underline underline-offset-2 hover:text-indigo-900">
                        Admissions Pipeline
                    </Link>
                    . Use the edit action below to update existing student profiles.
                </span>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <CardTitle>Student Directory</CardTitle>
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-slate-500" />
                            <Select value={classFilter} onValueChange={setClassFilter}>
                                <SelectTrigger className="w-[200px]">
                                    <SelectValue placeholder="Filter by Class" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Classes</SelectItem>
                                    {classes.map(cls => (
                                        <SelectItem key={cls.id} value={cls.id.toString()}>
                                            {cls.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Class</TableHead>
                                <TableHead>Section</TableHead>
                                <TableHead>Learning Style</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8">
                                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-400" />
                                    </TableCell>
                                </TableRow>
                            ) : filteredStudents.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        No students found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredStudents.map((student) => {
                                    // Resolve Class Name
                                    const cls = classes.find(c => c.id === student.academic_class);
                                    const sec = cls?.sections?.find(s => s.id === student.section);

                                    const hasNoUser = !student.user_id;
                                    return (
                                        <TableRow key={student.id} className={hasNoUser ? 'bg-red-50' : ''}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <div className={`p-1 rounded-full ${hasNoUser ? 'bg-red-100' : 'bg-indigo-100'}`}>
                                                        <User className={`h-4 w-4 ${hasNoUser ? 'text-red-500' : 'text-indigo-600'}`} />
                                                    </div>
                                                    <div>
                                                        <span>{student.first_name} {student.last_name}</span>
                                                        {hasNoUser && (
                                                            <span className="ml-2 text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded">
                                                                No user account
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 text-slate-500 text-sm">
                                                    <Mail className="h-3 w-3" />
                                                    {student.email || <span className="italic text-slate-400">—</span>}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {cls ? <Badge variant="outline">{cls.name}</Badge> : '-'}
                                            </TableCell>
                                            <TableCell>
                                                {sec ? <Badge variant="secondary">{sec.name}</Badge> : '-'}
                                            </TableCell>
                                            <TableCell className="capitalize">{student.learning_style || '-'}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    {hasNoUser ? (
                                                        <>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="text-amber-700 border-amber-300 hover:bg-amber-50 gap-1.5 h-8 px-2 text-xs font-semibold"
                                                                onClick={() => openRepairDialog(student)}
                                                            >
                                                                <Wrench className="h-3.5 w-3.5" />
                                                                Repair Account
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="text-red-600" onClick={() => handleDelete(student.id)}>
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Button variant="ghost" size="icon" onClick={() => setProfileStudent(student)}>
                                                                <Eye className="h-4 w-4 text-slate-500" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(student)}>
                                                                <Edit className="h-4 w-4 text-slate-500" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" onClick={() => openPasswordDialog(student)}>
                                                                <Lock className="h-4 w-4 text-slate-500" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="text-red-600" onClick={() => handleDelete(student.id)}>
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Edit Student</DialogTitle>
                        <DialogDescription>
                            Update the student&apos;s profile and enrollment details.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>First Name</Label>
                                <Input value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })} placeholder="John" />
                            </div>
                            <div className="grid gap-2">
                                <Label>Last Name</Label>
                                <Input value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })} placeholder="Doe" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Email</Label>
                                <Input value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="student@school.com" />
                            </div>
                            <div className="grid gap-2">
                                <Label>Username (Optional)</Label>
                                <Input value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} placeholder="johndoe" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Academic Class</Label>
                                <Select value={formData.academic_class} onValueChange={val => setFormData({ ...formData, academic_class: val, section: '' })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Class" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {classes.map(c => (
                                            <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Section</Label>
                                <Select value={formData.section} onValueChange={val => setFormData({ ...formData, section: val })} disabled={!formData.academic_class || availableSections.length === 0}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Section" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableSections.map(s => (
                                            <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Learning Style</Label>
                                <Select
                                    value={formData.learning_style}
                                    onValueChange={(val) =>
                                        setFormData({ ...formData, learning_style: val as NonNullable<Student['learning_style']> })
                                    }
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="visual">Visual (Video)</SelectItem>
                                        <SelectItem value="reading">Reading (Text)</SelectItem>
                                        <SelectItem value="practice">Practice (Quiz)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Daily Goal (Minutes)</Label>
                                <Input type="number" value={formData.daily_study_goal} onChange={e => setFormData({ ...formData, daily_study_goal: parseInt(e.target.value) || 0 })} />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSubmit} disabled={submitting}>
                            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Update Student
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <StudentProfileOverviewDialog
                student={profileStudent}
                open={!!profileStudent}
                onOpenChange={(open) => {
                    if (!open) setProfileStudent(null);
                }}
                headerAction={profileStudent ? (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={() => openPasswordDialog(profileStudent, true)}
                    >
                        <Lock className="mr-2 h-4 w-4" />
                        Change Password
                    </Button>
                ) : null}
            />

            <ChangePasswordDialog
                open={passwordDialog.open}
                onOpenChange={(open) => setPasswordDialog((prev) => ({ ...prev, open }))}
                userId={passwordDialog.userId}
                userName={passwordDialog.userName}
            />

            {/* Repair Account Dialog */}
            <Dialog open={repairDialog.open} onOpenChange={(open) => setRepairDialog(prev => ({ ...prev, open }))}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-amber-700">
                            <Wrench className="h-5 w-5" />
                            Repair Student Account
                        </DialogTitle>
                        <DialogDescription>
                            This student&apos;s user account was deleted or is missing. Enter an email and password to create a new login account and re-link it to this student.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex gap-2 text-xs text-amber-800">
                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>A new login account will be created. The student will use this email &amp; password to log in.</span>
                    </div>

                    <div className="grid gap-3 py-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="grid gap-1.5">
                                <Label>First Name</Label>
                                <Input value={repairForm.first_name} onChange={e => setRepairForm(p => ({ ...p, first_name: e.target.value }))} />
                            </div>
                            <div className="grid gap-1.5">
                                <Label>Last Name</Label>
                                <Input value={repairForm.last_name} onChange={e => setRepairForm(p => ({ ...p, last_name: e.target.value }))} />
                            </div>
                        </div>
                        <div className="grid gap-1.5">
                            <Label>Email *</Label>
                            <Input type="email" value={repairForm.email} onChange={e => setRepairForm(p => ({ ...p, email: e.target.value }))} placeholder="student@school.com" />
                        </div>
                        <div className="grid gap-1.5">
                            <Label>Password *</Label>
                            <Input type="text" value={repairForm.password} onChange={e => setRepairForm(p => ({ ...p, password: e.target.value }))} />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRepairDialog({ open: false, student: null })} disabled={repairing}>
                            Cancel
                        </Button>
                        <Button onClick={handleRepair} disabled={repairing} className="bg-amber-600 hover:bg-amber-700 text-white">
                            {repairing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Repair Account
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
