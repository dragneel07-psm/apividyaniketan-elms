// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { academicAPI, Chapter } from '@/lib/api';
import { toast } from 'sonner';

interface ChapterDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    chapter: Chapter | null;
    subjectId: number;
    onSuccess: () => void;
}

export function ChapterDialog({ open, onOpenChange, chapter, subjectId, onSuccess }: ChapterDialogProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [order, setOrder] = useState(0);
    const [isPublished, setIsPublished] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (chapter) {
            setTitle(chapter.title);
            setDescription(chapter.description || '');
            setOrder(chapter.order);
            setIsPublished(chapter.is_published);
        } else {
            setTitle('');
            setDescription('');
            setOrder(0);
            setIsPublished(false);
        }
    }, [chapter, open]);

    const handleSave = async () => {
        if (!title.trim()) {
            toast.error('Title is required');
            return;
        }

        setSaving(true);
        try {
            const data = {
                title,
                description,
                order,
                is_published: isPublished,
                subject: subjectId
            };

            if (chapter) {
                await academicAPI.updateChapter(chapter.id, data);
                toast.success('Chapter updated');
            } else {
                await academicAPI.createChapter(data);
                toast.success('Chapter created');
            }
            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error('Failed to save chapter:', error);
            toast.error('Failed to save chapter');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{chapter ? 'Edit Chapter' : 'Create New Chapter'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Chapter Title</Label>
                        <Input
                            id="title"
                            placeholder="e.g. Introduction to Algebra"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Description (Optional)</Label>
                        <Textarea
                            id="description"
                            placeholder="What will students learn in this chapter?"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                        <div className="space-y-2 flex-1">
                            <Label htmlFor="order">Display Order</Label>
                            <Input
                                id="order"
                                type="number"
                                value={order}
                                onChange={(e) => setOrder(parseInt(e.target.value) || 0)}
                            />
                        </div>
                        <div className="space-y-2 flex items-center gap-3 pt-6">
                            <Label htmlFor="published" className="cursor-pointer">Published</Label>
                            <Switch
                                id="published"
                                checked={isPublished}
                                onCheckedChange={setIsPublished}
                            />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving...' : (chapter ? 'Update' : 'Create')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
