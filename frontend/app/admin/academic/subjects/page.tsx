// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Plus, Trash2, Search, Loader2, BookOpen, Filter, Edit, User } from 'lucide-react';
import { academicAPI, AcademicClass, Subject, Teacher } from '@/lib/api';
import Link from 'next/link';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

export default function SubjectsPage() {
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [classes, setClasses] = useState<AcademicClass[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [loading, setLoading] = useState(true);
    const [classFilter, setClassFilter] = useState<string>('all');

    // Create/Edit State
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [currentSubjectId, setCurrentSubjectId] = useState<number | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        academic_class: '', // string for Select value
        description: '',
        credits: 1.0,
        is_elective: false,
        teacher: 'unassigned', // string for Select value
        additional_teachers: [] as string[],
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const [classesData, subjectsData, teachersData] = await Promise.all([
                academicAPI.getClasses(),
                academicAPI.getSubjects(),
                academicAPI.getTeachers()
            ]);
            setClasses(classesData.sort((a, b) => a.order - b.order));
            setSubjects(subjectsData);
            setTeachers(teachersData);
        } catch (error) {
            console.error('Failed to load data', error);
            toast.error('Failed to load classes and subjects');
        } finally {
            setLoading(false);
        }
    }

    // Helper to get class name
    const getClassName = (classId: number) => {
        const cls = classes.find(c => c.id === classId);
        return cls ? cls.name : 'Unknown Class';
    };

    const getTeacherDisplayName = (teacher: Teacher) => {
        const fullName = `${teacher.first_name || ''} ${teacher.last_name || ''}`.trim();
        return fullName || teacher.username || teacher.email || 'Teacher';
    };

    const getAdditionalTeacherNames = (subject: Subject) => {
        if (Array.isArray(subject.additional_teacher_names) && subject.additional_teacher_names.length > 0) {
            return subject.additional_teacher_names;
        }

        const ids = Array.isArray(subject.additional_teachers) ? subject.additional_teachers.map((id) => String(id)) : [];
        return ids
            .map((teacherId) => teachers.find((teacher) => String(teacher.id) === teacherId))
            .filter((teacher): teacher is Teacher => Boolean(teacher))
            .map((teacher) => getTeacherDisplayName(teacher));
    };

    function openCreateDialog() {
        setFormData({
            name: '',
            code: '',
            academic_class: classFilter !== 'all' ? classFilter : '',
            description: '',
            credits: 1.0,
            is_elective: false,
            teacher: 'unassigned',
            additional_teachers: [],
        });
        setIsEditMode(false);
        setCurrentSubjectId(null);
        setIsDialogOpen(true);
    }

    function openEditDialog(subject: Subject) {
        setFormData({
            name: subject.name,
            code: subject.code || '',
            academic_class: subject.academic_class.toString(),
            description: subject.description || '',
            credits: subject.credits || 1.0,
            is_elective: subject.is_elective,
            teacher: subject.teacher ? subject.teacher.toString() : 'unassigned',
            additional_teachers: Array.isArray(subject.additional_teachers)
                ? subject.additional_teachers.map((id) => String(id))
                : [],
        });
        setIsEditMode(true);
        setCurrentSubjectId(subject.id);
        setIsDialogOpen(true);
    }

    async function handleSubmit() {
        if (!formData.name || !formData.academic_class) {
            toast.error("Name and Class are required");
            return;
        }

        try {
            setSubmitting(true);
            const leadTeacherId = formData.teacher && formData.teacher !== 'unassigned' ? formData.teacher : null;
            const additionalTeacherIds = formData.additional_teachers.filter((id) => id && id !== leadTeacherId);
            const payload = {
                name: formData.name,
                code: formData.code,
                academic_class: parseInt(formData.academic_class),
                description: formData.description,
                credits: formData.credits,
                is_elective: formData.is_elective,
                teacher: leadTeacherId,
                additional_teachers: additionalTeacherIds,
            };

            if (isEditMode && currentSubjectId) {
                await academicAPI.updateSubject(currentSubjectId, payload);
                toast.success("Subject updated");
            } else {
                await academicAPI.createSubject(payload);
                toast.success("Subject created");
            }
            setIsDialogOpen(false);

            // Reload subjects
            const updatedSubjects = await academicAPI.getSubjects();
            setSubjects(updatedSubjects);
        } catch (err) {
            console.error(err);
            toast.error("Failed to save subject");
        } finally {
            setSubmitting(false);
        }
    }

    async function handleDelete(id: number) {
        if (!confirm('Are you sure? This action cannot be undone.')) return;
        try {
            await academicAPI.deleteSubject(id);
            toast.success("Subject deleted");
            setSubjects(subjects.filter(s => s.id !== id));
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete subject");
        }
    }

    const filteredSubjects = subjects.filter(s => {
        if (classFilter !== 'all' && s.academic_class.toString() !== classFilter) return false;
        return true;
    }).sort((a, b) => {
        // Sort by Class Order, then Subject Name
        const classA = classes.find(c => c.id === a.academic_class);
        const classB = classes.find(c => c.id === b.academic_class);
        if (classA && classB && classA.order !== classB.order) return classA.order - classB.order;
        return a.name.localeCompare(b.name);
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
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Subjects</h1>
                        <p className="text-slate-500 text-sm">Manage curriculum subjects for each class.</p>
                    </div>
                </div>

                <Button onClick={openCreateDialog} className="bg-indigo-600 hover:bg-indigo-700">
                    <Plus className="mr-2 h-4 w-4" /> Add Subject
                </Button>
            </header>

            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <CardTitle>Subject List</CardTitle>
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
                                <TableHead>Class</TableHead>
                                <TableHead>Subject Name</TableHead>
                                <TableHead>Code</TableHead>
                                <TableHead>Credits</TableHead>
                                <TableHead>Assigned Teachers</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8">
                                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-400" />
                                    </TableCell>
                                </TableRow>
                            ) : filteredSubjects.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                        No subjects found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredSubjects.map((subject) => (
                                    <TableRow key={subject.id}>
                                        <TableCell>
                                            <Badge variant="outline">{getClassName(subject.academic_class)}</Badge>
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <BookOpen className="h-4 w-4 text-slate-400" />
                                                {subject.name}
                                            </div>
                                            {subject.description && <p className="text-xs text-slate-500 pl-6 truncate max-w-[200px]">{subject.description}</p>}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">{subject.code || '-'}</TableCell>
                                        <TableCell>{subject.credits}</TableCell>
                                        <TableCell>
                                            <div className="space-y-1">
                                                {subject.teacher_name ? (
                                                    <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                                                        <User className="h-3 w-3 text-emerald-500" />
                                                        <span>Lead: {subject.teacher_name}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-400 italic">Lead: Unassigned</span>
                                                )}
                                                {getAdditionalTeacherNames(subject).length > 0 && (
                                                    <p className="text-xs text-slate-500">
                                                        Additional: {getAdditionalTeacherNames(subject).join(', ')}
                                                    </p>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {subject.is_elective ?
                                                <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100">Elective</Badge>
                                                : <Badge variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-100">Core</Badge>
                                            }
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => openEditDialog(subject)}>
                                                    <Edit className="h-4 w-4 text-slate-500" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="text-red-600" onClick={() => handleDelete(subject.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{isEditMode ? 'Edit Subject' : 'Add Subject'}</DialogTitle>
                        <DialogDescription>
                            Define a subject for a specific class.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Academic Class</Label>
                            <Select
                                value={formData.academic_class}
                                onValueChange={val => setFormData({ ...formData, academic_class: val })}
                                disabled={isEditMode}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Class" />
                                </SelectTrigger>
                                <SelectContent>
                                    {classes.map(cls => (
                                        <SelectItem key={cls.id} value={cls.id.toString()}>
                                            {cls.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Subject Name</Label>
                                <Input
                                    placeholder="e.g. Mathematics"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Subject Code</Label>
                                <Input
                                    placeholder="e.g. MTH101"
                                    value={formData.code}
                                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 items-center">
                            <div className="grid gap-2">
                                <Label>Credits</Label>
                                <Input
                                    type="number"
                                    step="0.5"
                                    value={formData.credits}
                                    onChange={e => setFormData({ ...formData, credits: parseFloat(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="flex items-center gap-2 pt-6">
                                <Switch
                                    id="is-elective"
                                    checked={formData.is_elective}
                                    onCheckedChange={checked => setFormData({ ...formData, is_elective: checked })}
                                />
                                <Label htmlFor="is-elective">Is Elective?</Label>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label>Lead Teacher</Label>
                            <Select
                                value={formData.teacher}
                                onValueChange={(val) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        teacher: val,
                                        additional_teachers: prev.additional_teachers.filter((id) => id !== val),
                                    }))
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Assign a teacher" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="unassigned">Unassigned</SelectItem>
                                    {teachers.map(t => (
                                        <SelectItem key={t.id} value={t.id.toString()}>
                                            {getTeacherDisplayName(t)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label>Additional Teachers</Label>
                            <div className="max-h-40 overflow-y-auto rounded-md border border-slate-200 p-3 space-y-2">
                                {teachers.length === 0 ? (
                                    <p className="text-xs text-slate-400 italic">No teachers available.</p>
                                ) : (
                                    teachers.map((teacher) => {
                                        const teacherId = String(teacher.id);
                                        const isLead = teacherId === formData.teacher;
                                        const isChecked = formData.additional_teachers.includes(teacherId);

                                        return (
                                            <label
                                                key={teacherId}
                                                className={`flex items-center gap-2 text-sm ${
                                                    isLead ? 'text-slate-400' : 'text-slate-700'
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    className="h-4 w-4 rounded border-slate-300"
                                                    checked={isChecked}
                                                    disabled={isLead}
                                                    onChange={(event) => {
                                                        const checked = event.target.checked;
                                                        setFormData((prev) => {
                                                            const current = prev.additional_teachers;
                                                            return {
                                                                ...prev,
                                                                additional_teachers: checked
                                                                    ? [...current, teacherId]
                                                                    : current.filter((id) => id !== teacherId),
                                                            };
                                                        });
                                                    }}
                                                />
                                                <span>{getTeacherDisplayName(teacher)}</span>
                                                {isLead && <span className="text-xs italic">(Lead)</span>}
                                            </label>
                                        );
                                    })
                                )}
                            </div>
                            <p className="text-xs text-slate-500">
                                Assign co-teachers who can also teach this subject.
                            </p>
                        </div>

                        <div className="grid gap-2">
                            <Label>Description</Label>
                            <Textarea
                                placeholder="Brief description of the curriculum..."
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>

                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSubmit} disabled={submitting}>
                            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {isEditMode ? 'Update Subject' : 'Create Subject'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
