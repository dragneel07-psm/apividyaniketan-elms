// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { academicAPI, Notice, AcademicClass, Student } from '@/lib/api';
import { toast } from 'sonner';
import { Loader2, Trash2, Megaphone, Users, User, School } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function NoticeManagementPage() {
    const [notices, setNotices] = useState<Notice[]>([]);
    const [classes, setClasses] = useState<AcademicClass[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);

    // Form State
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [category, setCategory] = useState('General');
    const [priority, setPriority] = useState<'low' | 'normal' | 'high'>('normal');
    const [audience, setAudience] = useState<'school' | 'class' | 'student'>('school');
    const [targetClass, setTargetClass] = useState<string>('');
    const [targetStudentId, setTargetStudentId] = useState<string>(''); // For simplicity, manual ID entry or search later

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [noticesData, classesData] = await Promise.all([
                academicAPI.getNotices(),
                academicAPI.getClasses()
            ]);
            setNotices(noticesData);
            setClasses(classesData);
        } catch (error) {
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!title || !content) return toast.error('Title and content are required');

        setCreating(true);
        try {
            const payload: Partial<Notice> = {
                title,
                content,
                category,
                priority,
                target_audience: audience,
            };

            if (audience === 'class' && targetClass) {
                payload.target_class = targetClass; // API expects ID, select usually returns string ID
            }
            // Logic for student selector would go here

            await academicAPI.createNotice(payload);
            toast.success('Notice published successfully');
            setTitle('');
            setContent('');
            await loadData(); // Refresh list
        } catch (error) {
            toast.error('Failed to publish notice');
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure?')) return;
        try {
            await academicAPI.deleteNotice(id);
            setNotices(prev => prev.filter(n => n.notice_id !== id));
            toast.success('Notice deleted');
        } catch (error) {
            toast.error('Failed to delete notice');
        }
    };

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-8">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-slate-900">Communication Center</h1>
                    <p className="text-slate-500">Manage announcements and notices.</p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Creation Form */}
                <Card className="lg:col-span-1 border-indigo-100 shadow-md">
                    <CardHeader className="bg-indigo-50/50 pb-4">
                        <CardTitle className="flex items-center gap-2 text-indigo-900">
                            <Megaphone className="h-5 w-5" /> Publish Notice
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-500">Title</label>
                            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. School Closed Tomorrow" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-slate-500">Category</label>
                                <Select value={category} onValueChange={setCategory}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="General">General</SelectItem>
                                        <SelectItem value="Academic">Academic</SelectItem>
                                        <SelectItem value="Event">Event</SelectItem>
                                        <SelectItem value="Urgent">Urgent</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-slate-500">Priority</label>
                                <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">Low</SelectItem>
                                        <SelectItem value="normal">Normal</SelectItem>
                                        <SelectItem value="high">High</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-500">Audience</label>
                            <div className="grid grid-cols-3 gap-2">
                                <Button
                                    variant={audience === 'school' ? 'default' : 'outline'}
                                    size="sm"
                                    className="bg-slate-900"
                                    onClick={() => setAudience('school')}
                                >
                                    <School className="mr-2 h-3 w-3" /> School
                                </Button>
                                <Button
                                    variant={audience === 'class' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setAudience('class')}
                                >
                                    <Users className="mr-2 h-3 w-3" /> Class
                                </Button>
                                <Button
                                    variant={audience === 'student' ? 'default' : 'outline'}
                                    size="sm"
                                    disabled // Detailed student search deferred
                                    title="Coming soon"
                                >
                                    <User className="mr-2 h-3 w-3" /> Student
                                </Button>
                            </div>
                        </div>

                        {audience === 'class' && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                                <label className="text-xs font-bold uppercase text-slate-500">Select Class</label>
                                <Select value={targetClass} onValueChange={setTargetClass}>
                                    <SelectTrigger><SelectValue placeholder="Select a class" /></SelectTrigger>
                                    <SelectContent>
                                        {classes.map(c => (
                                            <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-500">Content</label>
                            <Textarea
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                className="min-h-[150px]"
                                placeholder="Write your message here..."
                            />
                        </div>

                        <Button className="w-full bg-indigo-600 hover:bg-indigo-700" onClick={handleCreate} disabled={creating}>
                            {creating ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Megaphone className="mr-2 h-4 w-4" />}
                            Publish Notice
                        </Button>
                    </CardContent>
                </Card>

                {/* Notices List */}
                <div className="lg:col-span-2 space-y-4">
                    <h2 className="text-lg font-bold text-slate-700">Recent Notices</h2>
                    {notices.length === 0 ? (
                        <div className="text-center py-10 bg-slate-50 rounded-lg text-slate-400">
                            No notices found.
                        </div>
                    ) : (
                        notices.map((notice) => (
                            <Card key={notice.notice_id} className="group hover:border-indigo-200 transition-colors">
                                <CardContent className="p-5">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="bg-slate-50">{notice.category}</Badge>
                                                {notice.priority === 'high' && <Badge variant="destructive">High Priority</Badge>}
                                                <span className="text-xs text-slate-400">
                                                    {new Date(notice.published_date || '').toLocaleDateString()}
                                                </span>
                                            </div>
                                            <h3 className="text-lg font-bold text-slate-900">{notice.title}</h3>
                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <span>To: </span>
                                                <Badge variant="secondary" className="text-[10px] h-5">
                                                    {notice.target_audience === 'school' ? 'Whole School' :
                                                        notice.target_audience === 'class' ? 'Class' : 'Specific Student'}
                                                </Badge>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-slate-400 hover:text-red-500 hover:bg-red-50"
                                            onClick={() => handleDelete(notice.notice_id!)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="mt-4 text-slate-600 text-sm whitespace-pre-wrap">
                                        {notice.content}
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
