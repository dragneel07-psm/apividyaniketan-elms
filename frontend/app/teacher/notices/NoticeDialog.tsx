// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Notice, AcademicClass } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Megaphone, Users, BookOpen, User, Calendar } from 'lucide-react';

interface NoticeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (data: Partial<Notice>) => Promise<void>;
    editingNotice: Notice | null;
    classes: AcademicClass[];
}

export function NoticeDialog({ open, onOpenChange, onSave, editingNotice, classes }: NoticeDialogProps) {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [category, setCategory] = useState('General');
    const [priority, setPriority] = useState<'low' | 'normal' | 'high'>('normal');
    const [targetAudience, setTargetAudience] = useState<'school' | 'class' | 'student'>('school');
    const [targetClass, setTargetClass] = useState<string>('');
    const [expiryDate, setExpiryDate] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (editingNotice) {
            setTitle(editingNotice.title);
            setContent(editingNotice.content);
            setCategory(editingNotice.category || 'General');
            setPriority(editingNotice.priority);
            setTargetAudience(editingNotice.target_audience);
            setTargetClass(editingNotice.target_class?.toString() || '');
            setExpiryDate(editingNotice.expiry_date || '');
        } else {
            setTitle('');
            setContent('');
            setCategory('General');
            setPriority('normal');
            setTargetAudience('school');
            setTargetClass('');
            setExpiryDate('');
        }
    }, [editingNotice, open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await onSave({
                title,
                content,
                category,
                priority,
                target_audience: targetAudience,
                target_class: targetAudience === 'class' ? targetClass : null,
                expiry_date: expiryDate || null,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl border-slate-200">
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-indigo-50 rounded-lg">
                            <Megaphone className="h-5 w-5 text-indigo-600" />
                        </div>
                        <DialogTitle className="text-xl font-bold text-slate-900 tracking-tight">
                            {editingNotice ? 'Edit Notice' : 'Publish New Announcement'}
                        </DialogTitle>
                    </div>
                    <DialogDescription className="text-slate-500">
                        Reach your audience effectively with targeted notices.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="title" className="text-xs font-bold uppercase tracking-wider text-slate-500">Notice Title</Label>
                                <Input
                                    id="title"
                                    placeholder="e.g. Annual Sports Meet 2026"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    required
                                    className="border-slate-200 focus:ring-indigo-500/20 shadow-sm"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="category" className="text-xs font-bold uppercase tracking-wider text-slate-500">Category</Label>
                                <Select value={category} onValueChange={setCategory}>
                                    <SelectTrigger className="border-slate-200 shadow-sm">
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="General">General</SelectItem>
                                        <SelectItem value="Academic">Academic</SelectItem>
                                        <SelectItem value="Event">Event</SelectItem>
                                        <SelectItem value="Holiday">Holiday</SelectItem>
                                        <SelectItem value="Emergency">Emergency</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="priority" className="text-xs font-bold uppercase tracking-wider text-slate-500">Priority Level</Label>
                                <div className="flex gap-4 pt-1">
                                    {['low', 'normal', 'high'].map((p) => (
                                        <button
                                            key={p}
                                            type="button"
                                            onClick={() => setPriority(p as any)}
                                            className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg border transition-all ${priority === p
                                                    ? (p === 'high' ? 'bg-red-50 border-red-500 text-red-700 shadow-sm' : p === 'normal' ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm' : 'bg-slate-50 border-slate-500 text-slate-700 shadow-sm')
                                                    : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                                                }`}
                                        >
                                            {p.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="audience" className="text-xs font-bold uppercase tracking-wider text-slate-500">Target Audience</Label>
                                <div className="grid grid-cols-1 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setTargetAudience('school')}
                                        className={`flex items-center gap-3 p-3 rounded-xl border text-sm transition-all ${targetAudience === 'school' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        <Users className={`h-4 w-4 ${targetAudience === 'school' ? 'text-indigo-600' : 'text-slate-400'}`} />
                                        <div className="text-left">
                                            <p className="font-bold">Whole School</p>
                                            <p className="text-[10px] opacity-70">Visible to all students & staff</p>
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTargetAudience('class')}
                                        className={`flex items-center gap-3 p-3 rounded-xl border text-sm transition-all ${targetAudience === 'class' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        <BookOpen className={`h-4 w-4 ${targetAudience === 'class' ? 'text-emerald-600' : 'text-slate-400'}`} />
                                        <div className="text-left">
                                            <p className="font-bold">Specific Class</p>
                                            <p className="text-[10px] opacity-70">Target a particular section</p>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {targetAudience === 'class' && (
                                <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                                    <Label htmlFor="class" className="text-xs font-bold uppercase tracking-wider text-slate-500">Select Class</Label>
                                    <Select value={targetClass} onValueChange={setTargetClass}>
                                        <SelectTrigger className="border-slate-200 shadow-sm">
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

                            <div className="space-y-2">
                                <Label htmlFor="expiry" className="text-xs font-bold uppercase tracking-wider text-slate-500">Expiry Date (Optional)</Label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input
                                        id="expiry"
                                        type="date"
                                        value={expiryDate}
                                        onChange={(e) => setExpiryDate(e.target.value)}
                                        className="pl-10 border-slate-200 focus:ring-indigo-500/20 shadow-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="content" className="text-xs font-bold uppercase tracking-wider text-slate-500">Notice Content</Label>
                        <Textarea
                            id="content"
                            placeholder="Type the full announcement content here..."
                            rows={6}
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            required
                            className="border-slate-200 focus:ring-indigo-500/20 shadow-sm resize-none"
                        />
                    </div>

                    <DialogFooter className="border-t border-slate-100 pt-6">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-400 hover:text-slate-600">
                            Discard
                        </Button>
                        <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 shadow-sm min-w-[140px]">
                            {isSubmitting ? (
                                <><span className="animate-spin mr-2">⏳</span> Processing...</>
                            ) : (
                                editingNotice ? 'Update Notice' : 'Publish Announcement'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
