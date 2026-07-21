// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { academicAPI, Lesson, aiAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, Save, ArrowLeft, Eye, BrainCircuit, Sparkles, FileText, ListChecks } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useSearchParams } from 'next/navigation';

// Editor Components
import { RichTextEditor } from '@/components/editor/rich-text-editor';
import { LessonMaterialsManager } from '@/components/courses/lesson-materials-manager';

export default function LessonEditorPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const courseId = params.courseId as string;
    const lessonId = params.lessonId as string;
    const chapterId = searchParams.get('chapterId');
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [lesson, setLesson] = useState<Lesson | null>(null);

    // Form State
    const [title, setTitle] = useState('');
    const [contentType, setContentType] = useState<'text' | 'video' | 'quiz' | 'interactive'>('text');
    const [content, setContent] = useState('');
    const [videoUrl, setVideoUrl] = useState('');
    const [isPublished, setIsPublished] = useState(false);
    const [duration, setDuration] = useState(15);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);

    useEffect(() => {
        if (lessonId === 'new') {
            setLoading(false);
            if (!chapterId) {
                toast.error("Missing chapter identification");
            }
            return;
        }

        const loadLesson = async () => {
            try {
                const data = await academicAPI.getLesson(parseInt(lessonId));
                setLesson(data);
                setTitle(data.title);
                setContentType(data.content_type);
                setContent(data.content || '');
                setVideoUrl(data.video_url || '');
                setIsPublished(data.is_published);
                setDuration(data.duration_minutes || 15);
            } catch (error) {
                console.error("Failed to load lesson", error);
                toast.error("Failed to load lesson details");
            } finally {
                setLoading(false);
            }
        };
        loadLesson();
    }, [lessonId, chapterId]);

    const handleAIGenerate = async (type: 'outline' | 'summary' | 'questions') => {
        setIsGenerating(true);
        try {
            const task = type === 'outline'
                ? 'Generate a lesson outline with key headings and bullet points.'
                : type === 'summary'
                    ? 'Summarize this lesson in one concise paragraph.'
                    : 'Generate 3 review questions for students at the end of this lesson.';
            const prompt = [
                `Task: ${task}`,
                `Lesson title: ${title || lesson?.title || 'Untitled lesson'}`,
                `Content type: ${contentType}`,
                `Current content: ${content || 'No content yet.'}`,
                'Return concise plain text.',
            ].join('\n');

            const response = await aiAPI.chat(prompt, '', []);
            const generated = String(response?.response || '').trim();
            if (!generated) {
                toast.error('AI returned empty content.');
                return;
            }

            const htmlBlock = generated
                .split('\n')
                .filter(Boolean)
                .map((line) => `<p>${line}</p>`)
                .join('');

            setContent((prev) => `${prev}${prev ? '<hr />' : ''}${htmlBlock}`);
            toast.success(`AI ${type} generated`);
        } catch (error) {
            console.error('AI generation failed', error);
            toast.error('Failed to generate AI content');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSave = async () => {
        if (!title.trim()) {
            toast.error("Please enter a title");
            return;
        }

        try {
            setSaving(true);
            const data = {
                title,
                content_type: contentType,
                content,
                video_url: videoUrl,
                is_published: isPublished,
                duration_minutes: duration,
                chapter: lesson?.chapter || (chapterId ? parseInt(chapterId) : 0)
            };

            if (lessonId === 'new') {
                if (!chapterId) {
                    toast.error("Cannot create lesson without a chapter");
                    setSaving(false);
                    return;
                }
                const newLesson = await academicAPI.createLesson(data);
                toast.success("Lesson created successfully");
                router.push(`/teacher/courses/${courseId}/lessons/${newLesson.id}`);
                return;
            }

            await academicAPI.updateLesson(parseInt(lessonId), data);
            toast.success("Lesson saved successfully");
            router.refresh();
        } catch (error) {
            console.error("Failed to save lesson", error);
            toast.error("Failed to save lesson");
        } finally {
            setSaving(false);
        }
    };

    const handleGenerateLessonQuiz = async () => {
        if (lessonId === 'new' || !lesson) {
            toast.error('Save lesson first before generating quiz.');
            return;
        }

        const rawDifficulty = (window.prompt('Quiz difficulty? (easy | medium | hard)', 'medium') || 'medium').trim().toLowerCase();
        const difficulty = rawDifficulty === 'easy' || rawDifficulty === 'hard' ? rawDifficulty : 'medium';

        const rawCount = window.prompt('Number of questions (1-30)', '10') || '10';
        const parsedCount = Number.parseInt(rawCount, 10);
        const count = Number.isFinite(parsedCount) ? Math.max(1, Math.min(30, parsedCount)) : 10;

        setIsGeneratingQuiz(true);
        try {
            const result = await aiAPI.generateQuiz({
                source_type: 'lesson',
                source_id: lesson.id,
                difficulty: difficulty as 'easy' | 'medium' | 'hard',
                count,
            });
            toast.success(`Quiz created (${result.questions.length} questions). Quiz ID: ${result.quiz_id}`);
        } catch (error: any) {
            console.error('AI quiz generation failed', error);
            toast.error(error?.message || 'Failed to generate quiz');
        } finally {
            setIsGeneratingQuiz(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center p-10"><Loader2 className="animate-spin h-8 w-8 text-indigo-500" /></div>;
    }

    return (
        <div className="max-w-5xl mx-auto py-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between mb-8 sticky top-0 bg-slate-50/95 backdrop-blur z-20 py-4 border-b border-slate-200">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">{title || 'Untitled Lesson'}</h1>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Badge variant="outline">{contentType.toUpperCase()}</Badge>
                            <span>{duration} mins</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 mr-4 bg-white px-3 py-1.5 rounded-full border border-slate-200">
                        <span className="text-xs font-medium text-slate-600">Published</span>
                        <Switch checked={isPublished} onCheckedChange={setIsPublished} />
                    </div>
                    <Button variant="outline" size="sm" onClick={() => window.open(`/student/courses/${courseId}/lessons/${lessonId}`, '_blank')}>
                        <Eye className="h-4 w-4 mr-2" /> Preview
                    </Button>
                    <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                        Save Changes
                    </Button>
                </div>
            </div>

            {/* Main Editor */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Content Editor */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardContent className="p-6 space-y-6">
                            <div className="space-y-2">
                                <Label>Lesson Title</Label>
                                <Input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="text-lg font-bold"
                                    placeholder="Enter lesson title..."
                                />
                            </div>

                            <Tabs value={contentType} onValueChange={(v) => setContentType(v as any)} className="w-full">
                                <TabsList className="grid w-full grid-cols-4 mb-4">
                                    <TabsTrigger value="text">Text & Media</TabsTrigger>
                                    <TabsTrigger value="video">Video</TabsTrigger>
                                    <TabsTrigger value="quiz" disabled>Quiz</TabsTrigger>
                                    <TabsTrigger value="interactive" disabled>Interactive</TabsTrigger>
                                </TabsList>

                                <TabsContent value="text" className="space-y-4">
                                    <RichTextEditor
                                        content={content}
                                        onChange={setContent}
                                    />
                                </TabsContent>

                                <TabsContent value="video" className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Video URL (YouTube/Vimeo)</Label>
                                        <Input
                                            value={videoUrl}
                                            onChange={(e) => setVideoUrl(e.target.value)}
                                            placeholder="https://www.youtube.com/watch?v=..."
                                        />
                                    </div>
                                    {videoUrl && (
                                        <div className="aspect-video bg-black rounded-lg overflow-hidden mt-4">
                                            <iframe
                                                src={videoUrl.replace('watch?v=', 'embed/')}
                                                className="w-full h-full"
                                                allowFullScreen
                                            />
                                        </div>
                                    )}
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                </div>

                {/* Right: Settings & Materials */}
                <div className="space-y-6">
                    <Card className="border-indigo-100 shadow-sm overflow-hidden">
                        <div className="h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
                        <CardHeader className="pb-3 bg-indigo-50/30">
                            <CardTitle className="flex items-center gap-2 text-indigo-800 text-base">
                                <BrainCircuit className="h-5 w-5" /> AI Copilot
                            </CardTitle>
                            <CardDescription>Accelerate your workflow</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 pt-4">
                            <Button
                                variant="outline"
                                className="w-full justify-start text-slate-700"
                                onClick={() => handleAIGenerate('outline')}
                                disabled={isGenerating}
                            >
                                <Sparkles className="h-4 w-4 mr-2 text-indigo-500" />
                                {isGenerating ? 'Generating...' : 'Generate Outline'}
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full justify-start text-slate-700"
                                onClick={() => handleAIGenerate('summary')}
                                disabled={isGenerating}
                            >
                                <FileText className="h-4 w-4 mr-2 text-indigo-500" />
                                Summarize Content
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full justify-start text-slate-700"
                                onClick={() => handleAIGenerate('questions')}
                                disabled={isGenerating}
                            >
                                <ListChecks className="h-4 w-4 mr-2 text-indigo-500" />
                                Create Quiz Questions
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full justify-start text-slate-700"
                                onClick={handleGenerateLessonQuiz}
                                disabled={isGeneratingQuiz}
                            >
                                <ListChecks className="h-4 w-4 mr-2 text-indigo-500" />
                                {isGeneratingQuiz ? 'Generating Quiz...' : 'Generate Quiz Assessment'}
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6 space-y-4">
                            <h3 className="font-bold text-slate-900 border-b pb-2 mb-2">Lesson Settings</h3>
                            <div className="space-y-2">
                                <Label>Duration (minutes)</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    value={duration}
                                    onChange={(e) => setDuration(parseInt(e.target.value))}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6 space-y-4">
                            <div className="flex items-center justify-between border-b pb-2 mb-2">
                                <h3 className="font-bold text-slate-900">Materials</h3>
                            </div>
                            {lessonId !== 'new' ? (
                                <LessonMaterialsManager lessonId={parseInt(lessonId)} />
                            ) : (
                                <p className="text-xs text-slate-500 italic">Save lesson first to manage materials</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
