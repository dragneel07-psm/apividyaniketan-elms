// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Video, Link as LinkIcon, FileUp, Eye } from 'lucide-react';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';
import { toast } from 'sonner';

// Dynamic import to avoid SSR issues with react-quill
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

export interface LessonData {
    lesson_id?: string;
    course: string;
    title: string;
    content_type: 'text' | 'video' | 'pdf' | 'link';
    content: string;
}

interface LessonEditorProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    lesson?: LessonData | null;
    courseId: string;
    onSave: (data: LessonData) => Promise<void>;
}

export function LessonEditor({ open, onOpenChange, lesson, courseId, onSave }: LessonEditorProps) {
    const [title, setTitle] = useState('');
    const [contentType, setContentType] = useState<'text' | 'video' | 'pdf' | 'link'>('text');
    const [content, setContent] = useState('');
    const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (lesson) {
            setTitle(lesson.title);
            setContentType(lesson.content_type);
            setContent(lesson.content);
        } else {
            setTitle('');
            setContentType('text');
            setContent('');
        }
    }, [lesson, open]);

    const handleSave = async () => {
        if (!title.trim()) {
            toast.error('Please enter a lesson title');
            return;
        }

        if (!content.trim() && contentType !== 'pdf') {
            toast.error('Please add content to the lesson');
            return;
        }

        setSaving(true);
        try {
            await onSave({
                lesson_id: lesson?.lesson_id,
                course: courseId,
                title,
                content_type: contentType,
                content
            });
            toast.success(lesson ? 'Lesson updated' : 'Lesson created');
            onOpenChange(false);
        } catch (error) {
            console.error('Failed to save lesson:', error);
            toast.error('Failed to save lesson. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const renderContentEditor = () => {
        switch (contentType) {
            case 'text':
                return (
                    <div className="h-[400px]">
                        <ReactQuill
                            theme="snow"
                            value={content}
                            onChange={setContent}
                            className="h-[350px]"
                            modules={{
                                toolbar: [
                                    [{ 'header': [1, 2, 3, false] }],
                                    ['bold', 'italic', 'underline', 'strike'],
                                    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                                    [{ 'color': [] }, { 'background': [] }],
                                    ['link', 'image', 'code-block'],
                                    ['clean']
                                ]
                            }}
                        />
                    </div>
                );

            case 'video':
                return (
                    <div className="space-y-4">
                        <div>
                            <Label>Video URL (YouTube, Vimeo, or direct link)</Label>
                            <Input
                                placeholder="https://www.youtube.com/watch?v=..."
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Supports YouTube, Vimeo, and direct video URLs
                            </p>
                        </div>
                    </div>
                );

            case 'pdf':
                return (
                    <div className="space-y-4">
                        <div>
                            <Label>PDF URL or File Path</Label>
                            <Input
                                placeholder="/media/lessons/document.pdf or https://..."
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Enter the URL or path to the PDF file
                            </p>
                        </div>
                    </div>
                );

            case 'link':
                return (
                    <div className="space-y-4">
                        <div>
                            <Label>External Resource URL</Label>
                            <Input
                                placeholder="https://example.com/resource"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Link to external learning resources
                            </p>
                        </div>
                    </div>
                );
        }
    };

    const renderPreview = () => {
        switch (contentType) {
            case 'text':
                return (
                    <div
                        className="prose max-w-none p-4 border rounded-lg bg-white"
                        dangerouslySetInnerHTML={{ __html: content }}
                    />
                );

            case 'video':
                if (!content) return <p className="text-muted-foreground">No video URL provided</p>;

                // Extract YouTube video ID
                const youtubeMatch = content.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
                const vimeoMatch = content.match(/vimeo\.com\/(\d+)/);

                if (youtubeMatch) {
                    return (
                        <iframe
                            width="100%"
                            height="400"
                            src={`https://www.youtube.com/embed/${youtubeMatch[1]}`}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="rounded-lg"
                        />
                    );
                } else if (vimeoMatch) {
                    return (
                        <iframe
                            width="100%"
                            height="400"
                            src={`https://player.vimeo.com/video/${vimeoMatch[1]}`}
                            frameBorder="0"
                            allow="autoplay; fullscreen; picture-in-picture"
                            allowFullScreen
                            className="rounded-lg"
                        />
                    );
                } else {
                    return (
                        <video width="100%" height="400" controls className="rounded-lg">
                            <source src={content} />
                            Your browser does not support the video tag.
                        </video>
                    );
                }

            case 'pdf':
                return content ? (
                    <iframe
                        src={content}
                        width="100%"
                        height="600"
                        className="border rounded-lg"
                        title="PDF Preview"
                    />
                ) : (
                    <p className="text-muted-foreground">No PDF URL provided</p>
                );

            case 'link':
                return content ? (
                    <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground mb-2">External Resource:</p>
                        <a
                            href={content}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center gap-2"
                        >
                            <LinkIcon className="h-4 w-4" />
                            {content}
                        </a>
                    </div>
                ) : (
                    <p className="text-muted-foreground">No link provided</p>
                );
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>
                        {lesson ? 'Edit Lesson' : 'Create New Lesson'}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Lesson Title</Label>
                        <Input
                            id="title"
                            placeholder="Enter lesson title..."
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Content Type</Label>
                        <Select
                            value={contentType}
                            onValueChange={(v) => setContentType(v as 'text' | 'video' | 'pdf' | 'link')}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="text">
                                    <div className="flex items-center gap-2">
                                        <FileText className="h-4 w-4" />
                                        Text Content
                                    </div>
                                </SelectItem>
                                <SelectItem value="video">
                                    <div className="flex items-center gap-2">
                                        <Video className="h-4 w-4" />
                                        Video
                                    </div>
                                </SelectItem>
                                <SelectItem value="pdf">
                                    <div className="flex items-center gap-2">
                                        <FileUp className="h-4 w-4" />
                                        PDF Document
                                    </div>
                                </SelectItem>
                                <SelectItem value="link">
                                    <div className="flex items-center gap-2">
                                        <LinkIcon className="h-4 w-4" />
                                        External Link
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'edit' | 'preview')}>
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="edit">Edit</TabsTrigger>
                            <TabsTrigger value="preview">
                                <Eye className="h-4 w-4 mr-2" />
                                Preview
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="edit" className="mt-4">
                            {renderContentEditor()}
                        </TabsContent>

                        <TabsContent value="preview" className="mt-4">
                            <div className="min-h-[400px]">
                                {renderPreview()}
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving...' : 'Save Lesson'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
