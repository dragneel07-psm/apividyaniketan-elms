// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Send } from 'lucide-react';
import { academicAPI } from '@/lib/api';
import { toast } from 'sonner';

interface CreateNoticeDialogProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    trigger?: React.ReactNode;
    onSuccess?: () => void;
}

export function CreateNoticeDialog({ open, onOpenChange, trigger, onSuccess }: CreateNoticeDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<{
        title: string;
        content: string;
        category: string;
        priority: 'low' | 'normal' | 'high';
        target_audience: 'school' | 'class' | 'student';
        target_class: string;
    }>({
        title: '',
        content: '',
        category: 'general',
        priority: 'normal',
        target_audience: 'school',
        target_class: ''
    });

    const handleOpenChange = (val: boolean) => {
        setIsOpen(val);
        if (onOpenChange) onOpenChange(val);
    };

    const effectiveOpen = open !== undefined ? open : isOpen;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await academicAPI.createNotice({
                title: formData.title,
                content: formData.content,
                category: formData.category,
                priority: formData.priority,
                target_audience: formData.target_audience,
                target_class: formData.target_audience === 'class' ? formData.target_class : null,
            });

            // Reset form
            setFormData({
                title: '',
                content: '',
                category: 'general',
                priority: 'normal',
                target_audience: 'school',
                target_class: ''
            });

            toast.success('Notice posted successfully');
            handleOpenChange(false);
            if (onSuccess) onSuccess();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            toast.error(`Failed to post notice: ${message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={effectiveOpen} onOpenChange={handleOpenChange}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Post a New Notice</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    <div className="grid gap-2">
                        <Label htmlFor="title">Title</Label>
                        <Input
                            id="title"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="Notice Title"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="category">Category</Label>
                            <Select
                                value={formData.category}
                                onValueChange={(val) => setFormData({ ...formData, category: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="general">General</SelectItem>
                                    <SelectItem value="academic">Academic</SelectItem>
                                    <SelectItem value="event">Event</SelectItem>
                                    <SelectItem value="emergency">Emergency</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="priority">Priority</Label>
                            <Select
                                value={formData.priority}
                                onValueChange={(val) => setFormData({ ...formData, priority: val as 'low' | 'normal' | 'high' })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select priority" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="normal">Normal</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="audience">Target Audience</Label>
                        <Select
                            value={formData.target_audience}
                            onValueChange={(val) => setFormData({ ...formData, target_audience: val as 'school' | 'class' | 'student' })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select audience" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="school">Whole School</SelectItem>
                                <SelectItem value="class">Specific Class</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {formData.target_audience === 'class' && (
                        <div className="grid gap-2">
                            <Label htmlFor="target_class">Target Class</Label>
                            <Input
                                id="target_class"
                                value={formData.target_class}
                                onChange={(e) => setFormData({ ...formData, target_class: e.target.value })}
                                placeholder="Enter Class ID (e.g., CLS-001)"
                                required
                            />
                            <p className="text-xs text-slate-500">
                                Enter the numeric class ID from your class records.
                            </p>
                        </div>
                    )}

                    <div className="grid gap-2">
                        <Label htmlFor="content">Content</Label>
                        <Textarea
                            id="content"
                            value={formData.content}
                            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                            placeholder="Write your notice here..."
                            className="h-32"
                            required
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                            Post Notice
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
