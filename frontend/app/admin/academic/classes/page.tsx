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
import { ArrowLeft, Plus, Trash2, Search, Loader2, School, Settings2, Edit } from 'lucide-react';
import { academicAPI, AcademicClass, Section } from '@/lib/api';
import Link from 'next/link';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function ClassManagementPage() {
    const [classes, setClasses] = useState<AcademicClass[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');

    // Create Class State
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [createForm, setCreateForm] = useState({ name: '', order: 0 });
    const [createLoading, setCreateLoading] = useState(false);

    // Manage Sections State
    const [selectedClass, setSelectedClass] = useState<AcademicClass | null>(null);
    const [isSectionDialogOpen, setIsSectionDialogOpen] = useState(false);
    const [newSection, setNewSection] = useState({ name: '', capacity: 40 });
    const [sectionLoading, setSectionLoading] = useState(false);

    useEffect(() => {
        loadClasses();
    }, []);

    async function loadClasses() {
        try {
            const data = await academicAPI.getClasses();
            // Sort by order
            const sorted = data.sort((a, b) => a.order - b.order);
            setClasses(sorted);
        } catch (error) {
            console.error('Failed to load classes', error);
            toast.error('Failed to load classes');
        } finally {
            setLoading(false);
        }
    }

    async function handleCreateClass() {
        if (!createForm.name) {
            toast.error("Class name is required");
            return;
        }
        try {
            setCreateLoading(true);
            await academicAPI.createClass({
                name: createForm.name,
                order: createForm.order || classes.length + 1
            });
            toast.success("Class created successfully");
            setIsCreateDialogOpen(false);
            setCreateForm({ name: '', order: 0 });
            await loadClasses();
        } catch (err) {
            console.error(err);
            toast.error("Failed to create class");
        } finally {
            setCreateLoading(false);
        }
    }

    async function handleDeleteClass(id: number) {
        if (!confirm('Are you sure? This will delete all sections and unlink students.')) return;
        try {
            await academicAPI.deleteClass(id);
            toast.success("Class deleted");
            await loadClasses();
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete class");
        }
    }

    function openSectionManager(cls: AcademicClass) {
        setSelectedClass(cls);
        setIsSectionDialogOpen(true);
    }

    async function handleAddSection() {
        if (!selectedClass || !newSection.name) return;
        try {
            setSectionLoading(true);
            await academicAPI.createSection({
                name: newSection.name,
                capacity: newSection.capacity,
                academic_class: selectedClass.id
            });
            toast.success("Section added");
            setNewSection({ name: '', capacity: 40 });
            // Reload classes only (or fetch class specific? getClasses includes sections normally?)
            // Assuming getClasses serializer includes nested sections
            await loadClasses();
            // Update selected class ref if needed, but getClasses updates 'classes' state which re-renders table
            // However, the Dialog uses 'selectedClass' state. We need to update that too or close dialog
            // Better to re-fetch or find the updated class in the new 'classes' list.

            // For smoother UX, let's just reload list and keep dialog open?
            // But selectedClass is stale.
            // Let's rely on effect or manually update state.
            // Simpler: Close dialog or switch to View Mode.
        } catch (err) {
            console.error(err);
            toast.error("Failed to add section");
        } finally {
            setSectionLoading(false);
        }
    }

    async function handleDeleteSection(sectionId: number) {
        if (!confirm("Delete this section? Enrollment data may be lost.")) return;
        try {
            await academicAPI.deleteSection(sectionId);
            toast.success("Section deleted");
            await loadClasses(); // Reloads list
            // Manually update selectedClass for immediate UI feedback if dialog is open?
            if (selectedClass && selectedClass.sections) {
                setSelectedClass({
                    ...selectedClass,
                    sections: selectedClass.sections.filter(s => s.id !== sectionId)
                });
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to delete section");
        }
    }

    // Update selectedClass when classes list changes (to keep dialog in sync)
    useEffect(() => {
        if (selectedClass) {
            const updated = classes.find(c => c.id === selectedClass.id);
            if (updated) setSelectedClass(updated);
        }
    }, [classes, selectedClass?.id]); // Note: Don't dep on selectedClass itself to avoid loop

    const filteredClasses = classes.filter(c =>
        c.name.toLowerCase().includes(filter.toLowerCase())
    );

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
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Class Management</h1>
                        <p className="text-slate-500 text-sm">Define your school&apos;s structural hierarchy (Grades, Classes, Sections).</p>
                    </div>
                </div>

                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-indigo-600 hover:bg-indigo-700">
                            <Plus className="mr-2 h-4 w-4" /> Add New Class
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add Academic Class</DialogTitle>
                            <DialogDescription>Create a new grade level (e.g. Grade 1, Class 10).</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label>Class Name</Label>
                                <Input
                                    placeholder="e.g. Grade 10"
                                    value={createForm.name}
                                    onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Order Sequence</Label>
                                <Input
                                    type="number"
                                    value={createForm.order}
                                    onChange={e => setCreateForm({ ...createForm, order: parseInt(e.target.value) || 0 })}
                                />
                                <p className="text-xs text-slate-500">Used for sorting (e.g. Grade 1 comes before Grade 2)</p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleCreateClass} disabled={createLoading}>
                                {createLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Create Class
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </header>

            {/* List */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Academic Structure</CardTitle>
                        <div className="relative w-72">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search classes..."
                                className="pl-8"
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[100px]">Order</TableHead>
                                <TableHead>Class Name</TableHead>
                                <TableHead>Sections</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8">
                                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-400" />
                                    </TableCell>
                                </TableRow>
                            ) : filteredClasses.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                        No classes defined yet.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredClasses.map((cls) => (
                                    <TableRow key={cls.id}>
                                        <TableCell className="font-mono text-slate-500">#{cls.order}</TableCell>
                                        <TableCell className="font-medium text-lg">
                                            <div className="flex items-center gap-2">
                                                <School className="h-4 w-4 text-slate-400" />
                                                {cls.name}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-2">
                                                {cls.sections && cls.sections.length > 0 ? (
                                                    cls.sections.map(sec => (
                                                        <Badge key={sec.id} variant="secondary" className="px-2 py-0.5">
                                                            Section {sec.name}
                                                        </Badge>
                                                    ))
                                                ) : (
                                                    <span className="text-xs text-slate-400 italic">No sections</span>
                                                )}
                                                <Button size="icon" variant="ghost" className="h-6 w-6 ml-1" onClick={() => openSectionManager(cls)}>
                                                    <Edit className="h-3 w-3 text-slate-500" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="outline" size="sm" onClick={() => openSectionManager(cls)}>
                                                    Manage Sections
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => handleDeleteClass(cls.id)}>
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

            {/* Section Management Dialog */}
            <Dialog open={isSectionDialogOpen} onOpenChange={setIsSectionDialogOpen}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Manage Sections for {selectedClass?.name}</DialogTitle>
                        <DialogDescription>Add or remove sections. Students are enrolled into specific sections.</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        {/* List Existing */}
                        <div className="space-y-3">
                            <h4 className="text-sm font-medium text-slate-700">Existing Sections</h4>
                            <div className="grid grid-cols-2 gap-3">
                                {selectedClass?.sections?.map(sec => (
                                    <div key={sec.id} className="flex items-center justify-between p-3 border rounded-lg bg-slate-50">
                                        <div>
                                            <p className="font-semibold text-sm">Section {sec.name}</p>
                                            <p className="text-xs text-slate-500">Capacity: {sec.capacity}</p>
                                        </div>
                                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:bg-red-100" onClick={() => handleDeleteSection(sec.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                                {(!selectedClass?.sections || selectedClass.sections.length === 0) && (
                                    <p className="text-sm text-slate-500 col-span-2 italic">No sections created yet.</p>
                                )}
                            </div>
                        </div>

                        {/* Add New */}
                        <div className="border-t pt-4 space-y-3">
                            <h4 className="text-sm font-medium text-slate-700">Add New Section</h4>
                            <div className="flex gap-3 items-end">
                                <div className="grid gap-1.5 flex-1">
                                    <Label className="text-xs">Section Name</Label>
                                    <Input
                                        placeholder="e.g. A, B, Blue"
                                        value={newSection.name}
                                        onChange={e => setNewSection({ ...newSection, name: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-1.5 w-24">
                                    <Label className="text-xs">Capacity</Label>
                                    <Input
                                        type="number"
                                        placeholder="40"
                                        value={newSection.capacity}
                                        onChange={e => setNewSection({ ...newSection, capacity: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                                <Button onClick={handleAddSection} disabled={sectionLoading || !newSection.name}>
                                    {sectionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                                    Add
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
