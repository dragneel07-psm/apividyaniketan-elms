// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, Save, Sparkles, Upload, FileText, ListChecks, LayoutTemplate, BrainCircuit } from 'lucide-react';
import Link from 'next/link';
import { academicAPI, AcademicClass, Subject, Chapter, aiAPI } from '@/lib/api';
import { useEffect } from 'react';
import { toast } from 'sonner';

export default function CreateLessonPage() {
    const params = useParams();
    const router = useRouter();
    const classId = params.id as string;

    // Data State
    const [academicClass, setAcademicClass] = useState<AcademicClass | null>(null);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [chapters, setChapters] = useState<Chapter[]>([]);

    // Form State
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
    const [selectedChapterId, setSelectedChapterId] = useState<string>('');
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        if (!classId) return;
        academicAPI.getClass(parseInt(classId)).then(cls => {
            setAcademicClass(cls);
            if (cls.subjects && cls.subjects.length > 0) {
                setSubjects(cls.subjects);
                setSelectedSubjectId(cls.subjects[0].id.toString());
            }
        }).catch(err => console.error("Failed to load class", err));
    }, [classId]);

    useEffect(() => {
        if (!selectedSubjectId) return;
        academicAPI.getChapters(parseInt(selectedSubjectId)).then(data => {
            setChapters(data);
            if (data.length > 0) {
                setSelectedChapterId(data[0].id.toString());
            } else {
                setSelectedChapterId('');
            }
        }).catch(err => console.error("Failed to load chapters", err));
    }, [selectedSubjectId]);

    const handleAIGenerate = async (type: 'outline' | 'summary' | 'questions') => {
        setIsGenerating(true);
        try {
            const task = type === 'outline'
                ? 'Create a concise lesson outline with 5 points.'
                : type === 'summary'
                    ? 'Write a short summary paragraph for this lesson.'
                    : 'Generate 3 review questions for students.';
            const prompt = [
                `Task: ${task}`,
                `Class context: ${academicClass?.name || 'Class'}`,
                `Subject context: ${subjects.find((s) => s.id.toString() === selectedSubjectId)?.name || 'Subject'}`,
                `Lesson title: ${title || 'Untitled lesson'}`,
                `Current draft content: ${content || 'No draft content yet.'}`,
                'Return plain text only.',
            ].join('\n');

            const response = await aiAPI.chat(prompt, '', []);
            const generated = String(response?.response || '').trim();
            if (!generated) {
                toast.error('AI returned empty content.');
                return;
            }

            setContent((prev) => `${prev}${prev ? '\n\n' : ''}${generated}`);
            toast.success(`AI ${type} generated`);
        } catch (error) {
            console.error('AI generation failed', error);
            toast.error('Failed to generate AI content.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSave = async () => {
        if (!selectedSubjectId || !selectedChapterId || !title) {
            toast.error("Please fill in title, subject and chapter");
            return;
        }

        setLoading(true);
        try {
            const newLesson = await academicAPI.createLesson({
                chapter: parseInt(selectedChapterId),
                title: title,
                content: content,
                is_published: true, // Default to true for demo
                order: 0
            });
            toast.success("Lesson created! Opening advanced editor...");
            // Redirect to the unified course lesson editor
            router.push(`/teacher/courses/${selectedSubjectId}/lessons/${newLesson.id}`);
        } catch (error) {
            console.error("Failed to create lesson", error);
            toast.error("Failed to create lesson.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6 md:p-8 min-h-screen bg-gray-50/50">
            <Link href={`/teacher/classes/${classId}`} className="inline-flex items-center text-sm text-slate-500 hover:text-indigo-600 mb-6 transition-colors">
                <ChevronLeft className="h-4 w-4 mr-1" /> Back to Class
            </Link>

            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Create New Lesson</h1>
                    <p className="text-muted-foreground mt-1">Design content, upload resources, and use AI to enhance your lesson.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
                    <Button onClick={handleSave} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
                        <Save className="h-4 w-4 mr-2" /> {loading ? 'Saving...' : 'Publish Lesson'}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Content Editor */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Lesson Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Lesson Title</Label>
                                <Input
                                    id="title"
                                    placeholder="e.g., Understanding Motion"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <Label htmlFor="content">Content & Notes</Label>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-xs text-indigo-600 h-auto py-1"
                                        onClick={() => handleAIGenerate('outline')}
                                        disabled={isGenerating}
                                    >
                                        <Sparkles className="h-3 w-3 mr-1" /> Generate Outline
                                    </Button>
                                </div>
                                <Textarea
                                    id="content"
                                    placeholder="Start typing your lesson plan, or generate one with AI..."
                                    className="min-h-[300px]"
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Resources</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center hover:bg-slate-50 transition-colors cursor-pointer">
                                <div className="mx-auto h-12 w-12 text-slate-400 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                                    <Upload className="h-6 w-6" />
                                </div>
                                <h3 className="text-sm font-semibold text-gray-900">Upload Materials</h3>
                                <p className="text-xs text-slate-500 mt-1">Drag and drop PDF, PPTX, or Video files here</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: AI Tools & Settings */}
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
                            <Button variant="outline" className="w-full justify-start text-slate-700" onClick={() => handleAIGenerate('summary')} disabled={isGenerating}>
                                <FileText className="h-4 w-4 mr-2 text-indigo-500" />
                                {isGenerating ? 'Working...' : 'Summarize Last Class'}
                            </Button>
                            <Button variant="outline" className="w-full justify-start text-slate-700" onClick={() => handleAIGenerate('questions')} disabled={isGenerating}>
                                <ListChecks className="h-4 w-4 mr-2 text-indigo-500" />
                                Create Practice Questions
                            </Button>
                            <Button variant="outline" className="w-full justify-start text-slate-700" disabled={isGenerating}>
                                <LayoutTemplate className="h-4 w-4 mr-2 text-indigo-500" />
                                Create Slide Outline
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Settings</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Subject</Label>
                                <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Subject" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {subjects.map(s => (
                                            <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                                        ))}
                                        {subjects.length === 0 && <SelectItem value="none" disabled>No subjects found</SelectItem>}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Syllabus Mapping (Chapter)</Label>
                                <Select value={selectedChapterId} onValueChange={setSelectedChapterId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Chapter" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {chapters.map(c => (
                                            <SelectItem key={c.id} value={c.id.toString()}>{c.title}</SelectItem>
                                        ))}
                                        {chapters.length === 0 && <SelectItem value="none" disabled>No chapters found</SelectItem>}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Release Schedule</Label>
                                <Select defaultValue="immediate">
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Schedule" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="immediate">Publish Immediately</SelectItem>
                                        <SelectItem value="scheduled">Schedule for Later</SelectItem>
                                        <SelectItem value="draft">Save as Draft</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
