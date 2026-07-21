// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save, Loader2, Trash2, FileUp, Video, Paperclip, X, Layout, FileText, HelpCircle, Eye } from 'lucide-react';
import { RichTextEditor } from '@/components/editor/rich-text-editor';
import { QuizBuilder } from '@/components/lessons/quiz-builder';
import { academicAPI, Lesson, LessonMaterial } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface LessonEditorProps {
    lesson: Lesson;
    chapterTitle?: string;
    onSave: (updatedLesson: Lesson) => Promise<void>;
    onDelete?: () => void;
}

export default function LessonEditor({ lesson, chapterTitle, onSave, onDelete }: LessonEditorProps) {
    const [localLesson, setLocalLesson] = useState<Lesson>(lesson);
    const [isSaving, setIsSaving] = useState(false);
    const [materials, setMaterials] = useState<LessonMaterial[]>(lesson.materials || []);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Sync local state when prop changes
    if (lesson.id !== localLesson.id) {
        setLocalLesson(lesson);
        setMaterials(lesson.materials || []);
    }

    const handleChange = (field: keyof Lesson, value: any) => {
        setLocalLesson(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave(localLesson);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];

        // Client-side guardrails so users get an immediate rejection
        // instead of uploading hundreds of MB only to hit a backend 413.
        const MAX_BYTES = 100 * 1024 * 1024; // 100 MB
        if (file.size > MAX_BYTES) {
            toast.error(`File too large. Max size is ${MAX_BYTES / (1024 * 1024)} MB.`);
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }
        const ALLOWED_PREFIXES = ['image/', 'video/', 'audio/'];
        const ALLOWED_EXACT = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain',
        ];
        const mimeOk =
            ALLOWED_PREFIXES.some(p => file.type.startsWith(p)) ||
            ALLOWED_EXACT.includes(file.type);
        if (!mimeOk) {
            toast.error('Unsupported file type.');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        const formData = new FormData();
        formData.append('title', file.name);
        formData.append('lesson', lesson.id.toString());
        formData.append('material_type', file.type.includes('pdf') ? 'pdf' : file.type.includes('image') ? 'image' : 'other');
        formData.append('file', file);

        setUploading(true);
        try {
            const newMaterial = await academicAPI.createMaterial(formData);
            setMaterials(prev => [...prev, newMaterial]);
            toast.success('Material uploaded successfully');
        } catch (error) {
            console.error(error);
            toast.error('Failed to upload material');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDeleteMaterial = async (id: number) => {
        try {
            await academicAPI.deleteMaterial(id);
            setMaterials(prev => prev.filter(m => m.id !== id));
            toast.success('Material deleted');
        } catch (error) {
            toast.error('Failed to delete material');
        }
    };

    return (
        <div className="mx-auto max-w-3xl space-y-6">
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <Input
                        value={localLesson.title}
                        onChange={(e) => handleChange('title', e.target.value)}
                        className="h-auto border-none bg-transparent p-0 text-3xl font-black text-slate-900 focus-visible:ring-0 placeholder:text-slate-300"
                        placeholder="Lesson Title"
                    />
                    <p className="text-sm text-slate-500">In Chapter: {chapterTitle}</p>
                </div>
                <div className="flex gap-2">
                    <div className="flex items-center gap-4 px-3 py-1.5 bg-white rounded-full border border-slate-200 shadow-sm mr-2">
                        <div className="flex items-center gap-2">
                            <span className={cn("text-[10px] font-black uppercase tracking-wider", localLesson.is_published ? "text-emerald-600" : "text-amber-600")}>
                                {localLesson.is_published ? "Published" : "Draft"}
                            </span>
                            <Switch
                                checked={localLesson.is_published}
                                onCheckedChange={(val) => handleChange('is_published', val)}
                                className="data-[state=checked]:bg-emerald-500 scale-75"
                            />
                        </div>
                    </div>
                    {onDelete && (
                        <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:text-red-500 hover:bg-red-50" onClick={onDelete}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 rounded-full px-6"
                    >
                        {isSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" /> Save Lesson
                            </>
                        )}
                    </Button>
                </div>
            </div>

            <Card>
                <CardContent className="p-6 space-y-6">
                    {/* Content Type Selector */}
                    <div className="pb-6 border-b border-slate-100">
                        <label className="mb-3 block text-xs font-black uppercase tracking-widest text-slate-400">Content Module Type</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {[
                                { id: 'text', label: 'Article / Text', icon: FileText },
                                { id: 'video', label: 'Video Lecture', icon: Video },
                                { id: 'quiz', label: 'Interactive Quiz', icon: HelpCircle },
                                { id: 'interactive', label: 'Interactive Lab', icon: Layout }
                            ].map((type) => (
                                <button
                                    key={type.id}
                                    type="button"
                                    onClick={() => handleChange('content_type', type.id)}
                                    className={cn(
                                        "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2",
                                        localLesson.content_type === type.id
                                            ? "bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm"
                                            : "bg-white border-slate-100 text-slate-500 hover:border-slate-200"
                                    )}
                                >
                                    <type.icon className={cn("h-5 w-5", localLesson.content_type === type.id ? "text-indigo-600" : "text-slate-400")} />
                                    <span className="text-xs font-bold leading-none">{type.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Lesson Content / Quiz Builder */}
                    <div className="space-y-6">
                        {localLesson.content_type === 'quiz' ? (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <label className="mb-2 block text-sm font-bold text-slate-700">Quiz Configuration</label>
                                <QuizBuilder
                                    data={localLesson.interactive_data}
                                    onChange={(data) => handleChange('interactive_data', data)}
                                />
                            </div>
                        ) : (
                            <div>
                                <label className="mb-2 block text-sm font-bold text-slate-700">
                                    {localLesson.content_type === 'video' ? 'Video Description / Notes' : 'Lesson Content'}
                                </label>
                                <div className="min-h-[400px]">
                                    <RichTextEditor
                                        content={localLesson.content || ''}
                                        onChange={(val) => handleChange('content', val)}
                                        editable={true}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Metadata Fields */}
                    <div className="grid grid-cols-2 gap-6 pt-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <Video className="h-4 w-4 text-indigo-500" /> Video URL
                            </label>
                            <Input
                                value={localLesson.video_url || ''}
                                onChange={(e) => handleChange('video_url', e.target.value)}
                                placeholder="https://youtube.com/..."
                                className="bg-slate-50"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <Save className="h-4 w-4 text-indigo-500" /> Duration (mins)
                            </label>
                            <Input
                                type="number"
                                value={localLesson.duration_minutes}
                                onChange={(e) => handleChange('duration_minutes', parseInt(e.target.value))}
                                className="bg-slate-50"
                            />
                        </div>
                    </div>

                    {/* Materials Section */}
                    <div className="pt-4 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-4">
                            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <Paperclip className="h-4 w-4 text-indigo-500" /> Review Materials
                            </label>
                            <div className="relative">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileUpload}
                                    className="hidden"
                                    id="file-upload"
                                />
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={uploading}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {uploading ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <FileUp className="h-3 w-3 mr-2" />}
                                    Upload File
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            {materials.map((material) => (
                                <div key={material.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 group">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                                            {material.material_type === 'pdf' ? (
                                                <span className="text-xs font-bold text-red-500">PDF</span>
                                            ) : (
                                                <Paperclip className="h-4 w-4 text-slate-400" />
                                            )}
                                        </div>
                                        <div className="text-sm">
                                            <p className="font-medium text-slate-700">{material.title}</p>
                                            <a href={material.file || material.link || '#'} target="_blank" className="text-xs text-indigo-500 hover:underline">
                                                Download / View
                                            </a>
                                        </div>
                                    </div>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => handleDeleteMaterial(material.id)}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                            {materials.length === 0 && (
                                <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                                    <p className="text-xs text-slate-400">No materials attached. Upload PDFs, images or reference files.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div >
    );
}
