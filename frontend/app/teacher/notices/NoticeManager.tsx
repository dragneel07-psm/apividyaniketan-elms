// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Plus, Megaphone, Trash2, Edit,
    Users, BookOpen, User,
    Calendar, AlertCircle, Loader2,
    CheckCircle2, Clock, Filter,
    Search, Pin
} from 'lucide-react';
import { academicAPI, Notice, AcademicClass } from '@/lib/api';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { NoticeDialog } from './NoticeDialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function NoticeManager() {
    const [loading, setLoading] = useState(true);
    const [notices, setNotices] = useState<Notice[]>([]);
    const [classes, setClasses] = useState<AcademicClass[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [audienceFilter, setAudienceFilter] = useState<'all' | 'school' | 'class' | 'student'>('all');
    const [deleteId, setDeleteId] = useState<number | null>(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [noticesData, classesData] = await Promise.all([
                    academicAPI.getNotices(),
                    academicAPI.getClasses()
                ]);
                setNotices(noticesData);
                setClasses(classesData);
            } catch (error) {
                console.error("Failed to load notice data", error);
                toast.error("Failed to load notices");
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await academicAPI.deleteNotice(deleteId);
            setNotices(notices.filter(n => n.id !== deleteId));
            toast.success("Notice deleted");
        } catch (error) {
            toast.error("Failed to delete notice");
        } finally {
            setDeleteId(null);
        }
    };

    const handleSave = async (data: Partial<Notice>) => {
        try {
            if (editingNotice?.id) {
                const updated = await academicAPI.updateNotice(editingNotice.id, data);
                setNotices(notices.map(n => n.id === updated.id ? updated : n));
                toast.success("Notice updated");
            } else {
                const created = await academicAPI.createNotice(data);
                setNotices([created, ...notices]);
                toast.success("Notice published");
            }
            setIsDialogOpen(false);
            setEditingNotice(null);
        } catch (error) {
            toast.error("Failed to save notice");
        }
    };

    const getAudienceLabel = (notice: Notice) => {
        switch (notice.target_audience) {
            case 'school': return { icon: <Users className="h-3 w-3 mr-1" />, label: 'Whole School', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' };
            case 'class': return { icon: <BookOpen className="h-3 w-3 mr-1" />, label: `Class ${notice.target_class_name || notice.target_class}`, color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
            case 'student': return { icon: <User className="h-3 w-3 mr-1" />, label: 'Individual', color: 'bg-amber-100 text-amber-700 border-amber-200' };
            default: return { icon: <Megaphone className="h-3 w-3 mr-1" />, label: 'General', color: 'bg-slate-100 text-slate-700 border-slate-200' };
        }
    };

    const isNew = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - date.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 3;
    };

    const filteredNotices = notices.filter(n => {
        const matchesSearch = n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            n.content.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesAudience = audienceFilter === 'all' || n.target_audience === audienceFilter;
        return matchesSearch && matchesAudience;
    });

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 space-y-4">
                <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
                <p className="text-slate-500 font-medium">Loading notice board...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-xl">
                        <Megaphone className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Notice Board</h2>
                        <p className="text-slate-500 text-sm">Manage school-wide and class-specific announcements</p>
                    </div>
                </div>
                <Button
                    onClick={() => { setEditingNotice(null); setIsDialogOpen(true); }}
                    className="bg-indigo-600 hover:bg-indigo-700 shadow-sm"
                >
                    <Plus className="h-4 w-4 mr-2" /> Publish Notice
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <Card className="border-slate-200 shadow-sm overflow-hidden">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4">
                        <div className="flex flex-col space-y-4">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                    Active Notices <Badge variant="secondary" className="bg-slate-200 text-slate-700">{filteredNotices.length}</Badge>
                                </CardTitle>
                                <div className="relative w-full md:w-72">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search notices..."
                                        className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-2 overflow-x-auto pb-1">
                                <Button
                                    variant={audienceFilter === 'all' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setAudienceFilter('all')}
                                    className={`h-8 text-xs ${audienceFilter === 'all' ? 'bg-slate-900' : 'border-slate-200 text-slate-600'}`}
                                >
                                    All
                                </Button>
                                <Button
                                    variant={audienceFilter === 'school' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setAudienceFilter('school')}
                                    className={`h-8 text-xs ${audienceFilter === 'school' ? 'bg-indigo-600 hover:bg-indigo-700' : 'border-slate-200 text-slate-600'}`}
                                >
                                    <Users className="h-3 w-3 mr-1.5" /> Whole School
                                </Button>
                                <Button
                                    variant={audienceFilter === 'class' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setAudienceFilter('class')}
                                    className={`h-8 text-xs ${audienceFilter === 'class' ? 'bg-emerald-600 hover:bg-emerald-700' : 'border-slate-200 text-slate-600'}`}
                                >
                                    <BookOpen className="h-3 w-3 mr-1.5" /> Class Specific
                                </Button>
                                <Button
                                    variant={audienceFilter === 'student' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setAudienceFilter('student')}
                                    className={`h-8 text-xs ${audienceFilter === 'student' ? 'bg-amber-600 hover:bg-amber-700' : 'border-slate-200 text-slate-600'}`}
                                >
                                    <User className="h-3 w-3 mr-1.5" /> Individual
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-slate-100">
                            {filteredNotices.map((notice) => {
                                const audience = getAudienceLabel(notice);
                                const isRecent = notice.published_date ? isNew(notice.published_date) : false;
                                return (
                                    <div key={notice.id} className="p-5 hover:bg-slate-50/30 transition-all group relative">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 space-y-2">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    {isRecent && (
                                                        <Badge className="bg-blue-600 hover:bg-blue-600 text-[10px] h-5 py-0">NEW</Badge>
                                                    )}
                                                    <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">
                                                        {notice.priority === 'high' && <Pin className="h-3 w-3 inline mr-1 text-red-500 fill-red-500" />}
                                                        {notice.title}
                                                    </h3>
                                                    <Badge variant="outline" className={`text-[10px] h-5 py-0 ${audience.color}`}>
                                                        {audience.icon} {audience.label}
                                                    </Badge>
                                                    <Badge variant="secondary" className="text-[10px] h-5 py-0 bg-slate-100 text-slate-500">
                                                        {notice.category}
                                                    </Badge>
                                                    {notice.priority === 'high' && (
                                                        <Badge className="text-[10px] h-5 py-0 bg-red-100 text-red-600 border-red-200">
                                                            High Priority
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-sm text-slate-600 line-clamp-2 max-w-3xl leading-relaxed whitespace-pre-wrap">
                                                    {notice.content}
                                                </p>
                                                <div className="flex items-center gap-4 pt-1">
                                                    <div className="flex items-center text-xs text-slate-400 font-medium">
                                                        <Calendar className="h-3 w-3 mr-1" />
                                                        {notice.published_date ? new Date(notice.published_date).toLocaleDateString() : 'Draft'}
                                                    </div>
                                                    {notice.expiry_date && (
                                                        <div className="flex items-center text-xs text-red-400 font-medium">
                                                            <Clock className="h-3 w-3 mr-1" />
                                                            Expires: {new Date(notice.expiry_date).toLocaleDateString()}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                                                    onClick={() => { setEditingNotice(notice); setIsDialogOpen(true); }}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                                    onClick={() => notice.id && setDeleteId(notice.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {filteredNotices.length === 0 && (
                                <div className="flex flex-col items-center justify-center p-16 text-center space-y-3">
                                    <div className="p-4 bg-slate-50 rounded-full">
                                        <AlertCircle className="h-8 w-8 text-slate-300" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-slate-900 font-bold">No notices found</p>
                                        <p className="text-slate-500 text-sm max-w-xs">Publish your first announcement to keep students and staff informed.</p>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={() => setIsDialogOpen(true)} className="mt-2">
                                        <Plus className="h-4 w-4 mr-2" /> Start Now
                                    </Button>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <NoticeDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onSave={handleSave}
                editingNotice={editingNotice}
                classes={classes}
            />

            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the notice from the school board.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                            Delete Notice
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}


