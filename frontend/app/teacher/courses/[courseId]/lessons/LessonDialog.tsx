// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { academicAPI, Lesson, LessonMaterial } from '@/lib/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { FileText, Video, Link as LinkIcon, Paperclip, Plus, Trash2, Eye } from 'lucide-react';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';

// Dynamic import for ReactQuill
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

interface LessonDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    lesson: Lesson | null;
    chapterId: number;
    onSuccess: () => void;
    initialType?: 'text' | 'video' | 'quiz';
}

export function LessonDialog({ open, onOpenChange, lesson, chapterId, onSuccess, initialType }: LessonDialogProps) {
    const router = useRouter();
    const params = useParams();
    const courseId = params.courseId as string;

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [videoUrl, setVideoUrl] = useState('');
    const [durationMinutes, setDurationMinutes] = useState(45);
    const [isPublished, setIsPublished] = useState(false);
    const [order, setOrder] = useState(0);
    const [contentType, setContentType] = useState<'text' | 'video' | 'quiz'>('text');
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('content');

    // Quiz settings
    const [quizTotalMarks, setQuizTotalMarks] = useState(10);
    const [quizPassingMarks, setQuizPassingMarks] = useState(4);

    // Materials state
    const [materials, setMaterials] = useState<LessonMaterial[]>([]);
    const [pendingMaterials, setPendingMaterials] = useState<{ title: string, file: File | null, link: string, type: string }[]>([]);
    const [newMaterialTitle, setNewMaterialTitle] = useState('');
    const [newMaterialLink, setNewMaterialLink] = useState('');
    const [newMaterialFile, setNewMaterialFile] = useState<File | null>(null);
    const [uploadingMaterial, setUploadingMaterial] = useState(false);

    useEffect(() => {
        if (lesson) {
            setTitle(lesson.title);
            setContent(lesson.content || '');
            setVideoUrl(lesson.video_url || '');
            setDurationMinutes(lesson.duration_minutes);
            setIsPublished(lesson.is_published);
            setOrder(lesson.order);
            setMaterials(lesson.materials || []);
            setContentType(lesson.content_type as any);
        } else {
            setTitle('');
            setContent('');
            setVideoUrl('');
            setDurationMinutes(45);
            setIsPublished(false);
            setOrder(0);
            setMaterials([]);
            setContentType(initialType || 'text');
        }
        setPendingMaterials([]);
        setActiveTab('content');
    }, [lesson, open]);

    const handleSave = async () => {
        if (!title.trim()) {
            toast.error('Title is required');
            return;
        }

        setSaving(true);
        try {
            let assessmentId = lesson?.assessment;

            // If it's a new quiz, create a draft assessment first
            if (contentType === 'quiz' && !assessmentId) {
                const assessment = await academicAPI.createAssessment({
                    title: `Quiz: ${title}`,
                    description: `Assessment for lesson ${title}`,
                    type: 'quiz',
                    subject: chapterId,
                    total_marks: quizTotalMarks,
                    passing_marks: quizPassingMarks,
                    duration_minutes: durationMinutes
                });
                assessmentId = assessment.assessment_id;
            }

            const data = {
                title,
                content: contentType === 'quiz' ? '' : content,
                content_type: contentType,
                video_url: contentType === 'video' ? videoUrl : null,
                duration_minutes: durationMinutes,
                is_published: isPublished,
                order,
                chapter: chapterId,
                assessment: assessmentId
            };

            let savedLesson: Lesson;
            if (lesson) {
                savedLesson = await academicAPI.updateLesson(lesson.id, data);
                toast.success('Lesson updated');
            } else {
                savedLesson = await academicAPI.createLesson(data);

                // Process pending materials for new lesson
                if (pendingMaterials.length > 0) {
                    toast.loading(`Uploading ${pendingMaterials.length} materials...`);
                    for (const pm of pendingMaterials) {
                        const formData = new FormData();
                        formData.append('lesson', savedLesson.id.toString());
                        formData.append('title', pm.title);
                        if (pm.file) {
                            formData.append('file', pm.file);
                            formData.append('material_type', pm.type);
                        } else if (pm.link) {
                            formData.append('link', pm.link);
                            formData.append('material_type', 'link');
                        }
                        await academicAPI.createMaterial(formData);
                    }
                    toast.dismiss();
                    toast.success('Lesson created with materials');
                } else {
                    toast.success('Lesson created');
                }
            }

            if (contentType === 'quiz' && assessmentId) {
                toast.success('Redirecting to Quiz Builder...');
                router.push(`/teacher/courses/${courseId}/quizzes/${assessmentId}`);
            }

            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error('Failed to save lesson:', error);
            toast.error('Failed to save lesson');
        } finally {
            setSaving(false);
        }
    };

    const handleAddMaterial = async () => {
        if (!newMaterialTitle.trim()) {
            toast.error('Material title is required');
            return;
        }

        if (!newMaterialFile && !newMaterialLink) {
            toast.error('Please provide a file or a link');
            return;
        }

        if (!lesson) {
            // Local queueing for new lessons
            const type = newMaterialFile ? getMaterialType(newMaterialFile.name) : 'link';
            setPendingMaterials([...pendingMaterials, {
                title: newMaterialTitle,
                file: newMaterialFile,
                link: newMaterialLink,
                type: type
            }]);
            setNewMaterialTitle('');
            setNewMaterialLink('');
            setNewMaterialFile(null);
            toast.success('Material added to queue');
            return;
        }

        setUploadingMaterial(true);
        try {
            const formData = new FormData();
            formData.append('lesson', lesson.id.toString());
            formData.append('title', newMaterialTitle);

            if (newMaterialFile) {
                formData.append('file', newMaterialFile);
                formData.append('material_type', getMaterialType(newMaterialFile.name));
            } else if (newMaterialLink) {
                formData.append('link', newMaterialLink);
                formData.append('material_type', 'link');
            }

            const material = await academicAPI.createMaterial(formData);
            setMaterials([...materials, material]);
            setNewMaterialTitle('');
            setNewMaterialLink('');
            setNewMaterialFile(null);
            toast.success('Material uploaded');
        } catch (error) {
            console.error('Failed to upload material:', error);
            toast.error('Failed to upload material');
        } finally {
            setUploadingMaterial(false);
        }
    };

    const handleDeleteMaterial = async (id: number) => {
        try {
            await academicAPI.deleteMaterial(id);
            setMaterials(materials.filter(m => m.id !== id));
            toast.success('Material removed');
        } catch (error) {
            toast.error('Failed to remove material');
        }
    };

    const getMaterialType = (fileName: string) => {
        const ext = fileName.split('.').pop()?.toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) return 'image';
        if (['pdf'].includes(ext || '')) return 'pdf';
        if (['mp4', 'webm'].includes(ext || '')) return 'video';
        return 'other';
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>{lesson ? 'Edit Lesson' : 'Create New Lesson'}</DialogTitle>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="content">Content</TabsTrigger>
                        <TabsTrigger value="settings">Settings</TabsTrigger>
                        <TabsTrigger value="materials">Materials {pendingMaterials.length > 0 && `(${pendingMaterials.length})`}</TabsTrigger>
                    </TabsList>

                    <div className="flex-1 overflow-y-auto py-4 px-1">
                        <TabsContent value="content" className="space-y-4 mt-0 border-none p-0">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-2 space-y-2">
                                    <Label htmlFor="lesson-title">Lesson Title</Label>
                                    <Input
                                        id="lesson-title"
                                        placeholder="e.g. Solving Linear Equations"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Content Type</Label>
                                    <Select value={contentType} onValueChange={(v: any) => setContentType(v)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="text">Article / Text</SelectItem>
                                            <SelectItem value="video">Video Lecture</SelectItem>
                                            <SelectItem value="quiz">Quiz / Assessment</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {contentType === 'text' && (
                                <div className="space-y-2">
                                    <Label>Lesson Content (Rich Text)</Label>
                                    <div className="h-[300px] mb-12">
                                        <ReactQuill
                                            theme="snow"
                                            value={content}
                                            onChange={setContent}
                                            className="h-[250px]"
                                            modules={{
                                                toolbar: [
                                                    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                                                    [{ 'font': [] }],
                                                    ['bold', 'italic', 'underline', 'strike'],
                                                    [{ 'color': [] }, { 'background': [] }],
                                                    [{ 'script': 'sub' }, { 'script': 'super' }],
                                                    ['blockquote', 'code-block'],
                                                    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                                                    [{ 'indent': '-1' }, { 'indent': '+1' }],
                                                    [{ 'direction': 'rtl' }],
                                                    [{ 'align': [] }],
                                                    ['link', 'image', 'video'],
                                                    ['clean']
                                                ]
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            {contentType === 'video' && (
                                <div className="space-y-4 py-8">
                                    <div className="bg-slate-50 p-8 rounded-2xl border-2 border-dashed border-slate-200 text-center">
                                        <div className="bg-indigo-100 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Video className="h-8 w-8 text-indigo-600" />
                                        </div>
                                        <h4 className="font-bold text-slate-800 mb-2">Configure Video Lecture</h4>
                                        <p className="text-sm text-slate-500 mb-6">Enter the URL for your video lecture from YouTube, Vimeo, or a direct link.</p>

                                        <div className="max-w-md mx-auto space-y-2 text-left">
                                            <Label htmlFor="video-url">Video URL</Label>
                                            <Input
                                                id="video-url"
                                                placeholder="https://www.youtube.com/watch?v=..."
                                                value={videoUrl}
                                                onChange={(e) => setVideoUrl(e.target.value)}
                                                className="bg-white"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {contentType === 'quiz' && (
                                <div className="space-y-4 py-8">
                                    <div className="bg-emerald-50 p-8 rounded-2xl border-2 border-dashed border-emerald-200 text-center">
                                        <div className="bg-emerald-100 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <FileText className="h-8 w-8 text-emerald-600" />
                                        </div>
                                        <h4 className="font-bold text-slate-800 mb-2">Quiz / Assessment</h4>
                                        <p className="text-sm text-slate-500 mb-6">
                                            You are creating a Quiz. After saving, you will be redirected to the Quiz Builder
                                            to add questions and configure settings.
                                        </p>

                                        <div className="max-w-md mx-auto grid grid-cols-2 gap-4 mb-6 text-left">
                                            <div className="space-y-2">
                                                <Label htmlFor="quiz-total-marks">Total Marks</Label>
                                                <Input
                                                    id="quiz-total-marks"
                                                    type="number"
                                                    value={quizTotalMarks}
                                                    onChange={(e) => setQuizTotalMarks(parseInt(e.target.value))}
                                                    className="bg-white"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="quiz-passing-marks">Passing Marks</Label>
                                                <Input
                                                    id="quiz-passing-marks"
                                                    type="number"
                                                    value={quizPassingMarks}
                                                    onChange={(e) => setQuizPassingMarks(parseInt(e.target.value))}
                                                    className="bg-white"
                                                />
                                            </div>
                                        </div>

                                        {lesson?.assessment && (
                                            <Button
                                                variant="outline"
                                                className="border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                                                onClick={() => router.push(`/teacher/courses/${courseId}/quizzes/${lesson.assessment}`)}
                                            >
                                                Open Quiz Builder
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="settings" className="space-y-4 mt-0 border-none p-0">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="duration">Estimated Duration (minutes)</Label>
                                    <Input
                                        id="duration"
                                        type="number"
                                        value={durationMinutes}
                                        onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 0)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="lesson-order">Order</Label>
                                    <Input
                                        id="lesson-order"
                                        type="number"
                                        value={order}
                                        onChange={(e) => setOrder(parseInt(e.target.value) || 0)}
                                    />
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
                                <div className="space-y-0.5">
                                    <Label>Published Status</Label>
                                    <p className="text-xs text-slate-500">Make this lesson visible to students</p>
                                </div>
                                <Switch
                                    checked={isPublished}
                                    onCheckedChange={setIsPublished}
                                />
                            </div>
                        </TabsContent>

                        <TabsContent value="materials" className="space-y-6 mt-0 border-none p-0">
                            <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 space-y-4">
                                <h4 className="font-semibold text-indigo-900 flex items-center gap-2">
                                    <Plus className="h-4 w-4" /> Add Lesson Material
                                </h4>
                                <div className="grid gap-3">
                                    <Input
                                        placeholder="Material Title (e.g. Slides PDF)"
                                        value={newMaterialTitle}
                                        onChange={(e) => setNewMaterialTitle(e.target.value)}
                                        className="bg-white"
                                    />
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <Label className="text-[10px] uppercase text-slate-400">File Upload</Label>
                                            <Input
                                                type="file"
                                                onChange={(e) => setNewMaterialFile(e.target.files?.[0] || null)}
                                                className="bg-white text-xs h-9"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px] uppercase text-slate-400">Or External Link</Label>
                                            <Input
                                                placeholder="https://..."
                                                value={newMaterialLink}
                                                onChange={(e) => setNewMaterialLink(e.target.value)}
                                                disabled={!!newMaterialFile}
                                                className="bg-white"
                                            />
                                        </div>
                                    </div>
                                    <Button
                                        onClick={handleAddMaterial}
                                        className="w-full bg-indigo-600 hover:bg-indigo-700 h-9"
                                        disabled={uploadingMaterial}
                                    >
                                        {uploadingMaterial ? 'Uploading...' : 'Add Material'}
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-slate-500">
                                    {lesson ? 'Existing Materials' : 'Materials to Upload'}
                                </Label>
                                {materials.length === 0 && pendingMaterials.length === 0 ? (
                                    <p className="text-center py-8 text-slate-400 text-sm italic">No materials added to this lesson yet.</p>
                                ) : (
                                    <div className="grid gap-2">
                                        {/* Pending Materials */}
                                        {pendingMaterials.map((pm, i) => (
                                            <div key={`pending-${i}`} className="flex items-center justify-between p-3 bg-indigo-50/30 border border-indigo-100 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-indigo-100 p-2 rounded">
                                                        <Plus className="h-4 w-4 text-indigo-600 animate-pulse" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-sm text-slate-800">{pm.title}</p>
                                                        <p className="text-[10px] text-indigo-500 font-bold uppercase">Pending Upload</p>
                                                    </div>
                                                </div>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => setPendingMaterials(pendingMaterials.filter((_, idx) => idx !== i))}>
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        ))}

                                        {/* Existing Materials */}
                                        {materials.map((m) => (
                                            <div key={m.id} className="flex items-center justify-between p-3 bg-white border rounded-lg hover:shadow-sm transition-shadow">
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-slate-100 p-2 rounded">
                                                        {m.material_type === 'link' ? <LinkIcon className="h-4 w-4 text-slate-500" /> : <Paperclip className="h-4 w-4 text-slate-500" />}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-sm text-slate-800">{m.title}</p>
                                                        <p className="text-[10px] text-slate-400 uppercase">{m.material_type}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                                                        <a href={m.file || m.link} target="_blank" rel="noopener noreferrer">
                                                            <Eye className="h-3.5 w-3.5" />
                                                        </a>
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => handleDeleteMaterial(m.id)}>
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </TabsContent>
                    </div>
                </Tabs>

                <DialogFooter className="border-t pt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-700">
                        {saving ? 'Saving...' : (lesson ? 'Save Changes' : 'Create Lesson')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
