// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface LessonDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: { title: string; contentType: 'article' | 'video' | 'quiz' }) => Promise<void>;
    chapterTitle?: string;
}

export function LessonDialog({ open, onOpenChange, onSubmit, chapterTitle }: LessonDialogProps) {
    const [title, setTitle] = useState('');
    const [contentType, setContentType] = useState<'article' | 'video' | 'quiz'>('article');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            setTitle('');
            setContentType('article');
        }
    }, [open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSubmit({ title, contentType });
            onOpenChange(false);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add Lesson to "{chapterTitle}"</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Lesson Title</Label>
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., Setting up the environment"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="type">Content Type</Label>
                        <Select value={contentType} onValueChange={(v: any) => setContentType(v)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="article">Article / Text</SelectItem>
                                <SelectItem value="video">Video</SelectItem>
                                <SelectItem value="quiz">Quiz</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
                            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Add Lesson
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
