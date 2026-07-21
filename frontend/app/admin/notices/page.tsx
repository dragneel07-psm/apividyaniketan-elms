// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { academicAPI, Notice, AcademicClass, Student } from '@/lib/api';
import { toast } from 'sonner';
import { Bell, Plus, Trash2, Edit, Megaphone, Users, User, School, Loader2, Send } from 'lucide-react';

export default function NoticesManagementPage() {
    const [notices, setNotices] = useState<Notice[]>([]);
    const [classes, setClasses] = useState<AcademicClass[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingNotice, setEditingNotice] = useState<Notice | null>(null);

    // Form State
    const [formData, setFormData] = useState<Partial<Notice>>({
        title: '',
        content: '',
        category: 'General',
        priority: 'normal',
        target_audience: 'school',
        target_class: null,
        target_student: null,
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [noticesData, classesData, studentsData] = await Promise.all([
                academicAPI.getNotices(),
                academicAPI.getClasses(),
                academicAPI.getStudents()
            ]);
            setNotices(noticesData);
            setClasses(classesData);
            setStudents(studentsData);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load notices');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenCreate = () => {
        setEditingNotice(null);
        setFormData({
            title: '',
            content: '',
            category: 'General',
            priority: 'normal',
            target_audience: 'school',
            target_class: null,
            target_student: null,
        });
        setIsDialogOpen(true);
    };

    const handleOpenEdit = (notice: Notice) => {
        setEditingNotice(notice);
        setFormData(notice);
        setIsDialogOpen(true);
    };

    const handleSubmit = async () => {
        if (!formData.title || !formData.content) {
            toast.error('Please fill in title and content');
            return;
        }

        try {
            if (editingNotice?.notice_id) {
                await academicAPI.updateNotice(editingNotice.notice_id, formData);
                toast.success('Notice updated successfully');
            } else {
                await academicAPI.createNotice(formData);
                toast.success('Notice published successfully');
            }
            setIsDialogOpen(false);
            await loadData();
        } catch (error) {
            console.error(error);
            toast.error('Failed to save notice');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this notice?')) return;

        try {
            await academicAPI.deleteNotice(id);
            toast.success('Notice deleted');
            loadData();
        } catch (error) {
            console.error(error);
            toast.error('Failed to delete notice');
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return 'bg-red-100 text-red-700 border-red-200';
            case 'normal': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'low': return 'bg-slate-100 text-slate-700 border-slate-200';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    const getAudienceIcon = (audience: string) => {
        switch (audience) {
            case 'school': return <School className="h-3 w-3" />;
            case 'class': return <Users className="h-3 w-3" />;
            case 'student': return <User className="h-3 w-3" />;
            default: return null;
        }
    };

    if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-indigo-600" /></div>;

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
                        <Megaphone className="h-8 w-8 text-indigo-600" /> Notice Board
                    </h1>
                    <p className="text-slate-500">Manage school-wide announcements and targeted messages.</p>
                </div>
                <Button onClick={handleOpenCreate} className="bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100 gap-2">
                    <Plus className="h-4 w-4" /> Create Notice
                </Button>
            </header>

            <Card className="border-0 shadow-sm overflow-hidden">
                <CardHeader className="bg-white border-b">
                    <CardTitle className="text-lg font-bold">Manage Announcements</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead>Title & Category</TableHead>
                                <TableHead>Audience</TableHead>
                                <TableHead>Priority</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {notices.map((notice) => (
                                <TableRow key={notice.notice_id} className="hover:bg-slate-50/50 transition-colors">
                                    <TableCell>
                                        <div className="font-bold text-slate-900">{notice.title}</div>
                                        <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{notice.category}</div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="gap-1 px-2 py-0.5 capitalize font-medium border-slate-200 text-slate-600">
                                            {getAudienceIcon(notice.target_audience)}
                                            {notice.target_audience}
                                        </Badge>
                                        {notice.target_audience === 'class' && (
                                            <div className="text-[10px] text-slate-400 mt-1 font-medium">
                                                {classes.find(c => c.id.toString() === notice.target_class?.toString())?.name || 'Unknown Class'}
                                            </div>
                                        )}
                                        {notice.target_audience === 'student' && (
                                            <div className="text-[10px] text-slate-400 mt-1 font-medium">
                                                {students.find(s => s.id === notice.target_student)?.first_name || 'Unknown Student'}
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={`${getPriorityColor(notice.priority)} capitalize border-transparent`}>
                                            {notice.priority}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm text-slate-500 font-medium">
                                        {notice.published_date ? new Date(notice.published_date).toLocaleDateString() : 'Draft'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50" onClick={() => handleOpenEdit(notice)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50" onClick={() => notice.notice_id && handleDelete(notice.notice_id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {notices.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-32 text-center text-slate-400 font-medium">
                                        No notices found. Start by creating one!
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[600px] border-0 shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black text-slate-900 flex items-center gap-2">
                            {editingNotice ? 'Edit Notice' : 'Create New Notice'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-6 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="title" className="text-right font-bold text-slate-700">Title</Label>
                            <Input
                                id="title"
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                className="col-span-3 border-slate-200 focus:ring-indigo-500"
                                placeholder="e.g. Annual Sports Meet 2026"
                            />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="content" className="text-right font-bold text-slate-700">Content</Label>
                            <Textarea
                                id="content"
                                value={formData.content}
                                onChange={e => setFormData({ ...formData, content: e.target.value })}
                                className="col-span-3 border-slate-200 focus:ring-indigo-500 min-h-[120px]"
                                placeholder="Write the announcement details here..."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid grid-cols-2 items-center gap-4">
                                <Label className="text-right font-bold text-slate-700">Category</Label>
                                <Select value={formData.category} onValueChange={v => setFormData({ ...formData, category: v })}>
                                    <SelectTrigger className="border-slate-200">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="General">General</SelectItem>
                                        <SelectItem value="Academic">Academic</SelectItem>
                                        <SelectItem value="Event">Event</SelectItem>
                                        <SelectItem value="Holiday">Holiday</SelectItem>
                                        <SelectItem value="Exam">Exam</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-2 items-center gap-4">
                                <Label className="text-right font-bold text-slate-700">Priority</Label>
                                <Select value={formData.priority} onValueChange={v => setFormData({ ...formData, priority: v as any })}>
                                    <SelectTrigger className="border-slate-200">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">Low</SelectItem>
                                        <SelectItem value="normal">Normal</SelectItem>
                                        <SelectItem value="high">High</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="border-t pt-4 space-y-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right font-bold text-slate-700">Target Audience</Label>
                                <div className="col-span-3 flex gap-2">
                                    <Button
                                        type="button"
                                        variant={formData.target_audience === 'school' ? 'default' : 'outline'}
                                        size="sm"
                                        className="flex-1 gap-1"
                                        onClick={() => setFormData({ ...formData, target_audience: 'school', target_class: null, target_student: null })}
                                    >
                                        <School className="h-4 w-4" /> School
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={formData.target_audience === 'class' ? 'default' : 'outline'}
                                        size="sm"
                                        className="flex-1 gap-1"
                                        onClick={() => setFormData({ ...formData, target_audience: 'class', target_student: null })}
                                    >
                                        <Users className="h-4 w-4" /> Class
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={formData.target_audience === 'student' ? 'default' : 'outline'}
                                        size="sm"
                                        className="flex-1 gap-1"
                                        onClick={() => setFormData({ ...formData, target_audience: 'student', target_class: null })}
                                    >
                                        <User className="h-4 w-4" /> Student
                                    </Button>
                                </div>
                            </div>

                            {formData.target_audience === 'class' && (
                                <div className="grid grid-cols-4 items-center gap-4 animate-in fade-in slide-in-from-top-2">
                                    <Label className="text-right font-bold text-slate-700">Select Class</Label>
                                    <Select
                                        value={formData.target_class?.toString() || ''}
                                        onValueChange={v => setFormData({ ...formData, target_class: v })}
                                    >
                                        <SelectTrigger className="col-span-3 border-slate-200">
                                            <SelectValue placeholder="Choose a class..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {classes.map(c => (
                                                <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {formData.target_audience === 'student' && (
                                <div className="grid grid-cols-4 items-center gap-4 animate-in fade-in slide-in-from-top-2">
                                    <Label className="text-right font-bold text-slate-700">Select Student</Label>
                                    <Select
                                        value={formData.target_student || ''}
                                        onValueChange={v => setFormData({ ...formData, target_student: v })}
                                    >
                                        <SelectTrigger className="col-span-3 border-slate-200">
                                            <SelectValue placeholder="Search student name..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {students.map(s => (
                                                <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="border-slate-200">Cancel</Button>
                        <Button onClick={handleSubmit} className="bg-indigo-600 hover:bg-indigo-700 gap-2">
                            <Send className="h-4 w-4" /> {editingNotice ? 'Update Notice' : 'Publish Notice'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
