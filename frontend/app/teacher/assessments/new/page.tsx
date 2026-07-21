// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Plus, Trash2, Save, ArrowLeft, HelpCircle,
    BookOpen, Clock, Target, ListChecks, Type
} from 'lucide-react';
import { academicAPI, Subject, Section } from '@/lib/api';
import { toast } from 'sonner';

interface QuestionForm {
    text: string;
    type: 'mcq' | 'short_answer' | 'long_answer' | 'code';
    options: string[];
    correct_answer: string;
    points: number;
    order: number;
}

export default function NewAssessmentPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [sections, setSections] = useState<Section[]>([]);

    // Form State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState<'quiz' | 'exam' | 'assignment'>('quiz');
    const [subjectId, setSubjectId] = useState('');
    const [sectionId, setSectionId] = useState('all');
    const [totalMarks, setTotalMarks] = useState(0);
    const [passingMarks, setPassingMarks] = useState(40);
    const [duration, setDuration] = useState(60);
    const [bloomsLevel, setBloomsLevel] = useState('remember');
    const [dueDate, setDueDate] = useState('');

    const [questions, setQuestions] = useState<QuestionForm[]>([
        { text: '', type: 'mcq', options: ['', '', '', ''], correct_answer: '', points: 1, order: 1 }
    ]);

    useEffect(() => {
        async function fetchData() {
            try {
                const [subjectsData, classesData] = await Promise.all([
                    academicAPI.getSubjects(),
                    academicAPI.getClasses()
                ]);
                setSubjects(subjectsData);

                // Flatten sections for the dropdown
                const allSections: Section[] = [];
                classesData.forEach(cls => {
                    if (cls.sections) {
                        cls.sections.forEach(sec => {
                            allSections.push({ ...sec, name: `${cls.name} - ${sec.name}` });
                        });
                    }
                });
                setSections(allSections);
            } catch (error) {
                console.error('Failed to fetch subjects/sections', error);
                toast.error('Failed to load form data');
            }
        }
        fetchData();
    }, []);

    const addQuestion = () => {
        setQuestions([
            ...questions,
            { text: '', type: 'mcq', options: ['', '', '', ''], correct_answer: '', points: 1, order: questions.length + 1 }
        ]);
    };

    const removeQuestion = (index: number) => {
        const newQuestions = questions.filter((_, i) => i !== index);
        setQuestions(newQuestions);
    };

    const updateQuestion = (index: number, field: keyof QuestionForm, value: any) => {
        const newQuestions = [...questions];
        newQuestions[index] = { ...newQuestions[index], [field]: value };
        setQuestions(newQuestions);
    };

    const updateOption = (qIndex: number, oIndex: number, value: string) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].options[oIndex] = value;
        setQuestions(newQuestions);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // 1. Create Assessment
            const assessmentData = {
                title,
                description,
                type,
                subject: parseInt(subjectId),
                section: sectionId === 'all' ? undefined : parseInt(sectionId),
                total_marks: questions.reduce((acc, q) => acc + q.points, 0),
                passing_marks: passingMarks,
                duration_minutes: duration,
                blooms_level: bloomsLevel,
                due_date: dueDate || undefined
            };

            const assessment = await academicAPI.createAssessment(assessmentData as any);
            const assessmentId = assessment.id;

            // 2. Create Questions
            await Promise.all(questions.map(q =>
                academicAPI.createQuestion({
                    ...q,
                    assessment: assessmentId
                })
            ));

            toast.success('Assessment created successfully!');
            router.push('/teacher/assessments');
        } catch (error) {
            console.error('Failed to create assessment', error);
            toast.error('Failed to create assessment');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto py-8 px-4 space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Create New Assessment</h1>
                        <p className="text-slate-500">Design quizzes, exams, or assignments for your students</p>
                    </div>
                </div>
                <Button onClick={handleSubmit} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
                    {loading ? 'Creating...' : (
                        <>
                            <Save className="mr-2 h-4 w-4" /> Save Assessment
                        </>
                    )}
                </Button>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Assessment Settings */}
                <div className="lg:col-span-1 space-y-6">
                    <Card className="border-slate-200 shadow-sm sticky top-8">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Target className="h-4 w-4 text-indigo-500" /> General Settings
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Title</Label>
                                <Input
                                    id="title"
                                    placeholder="e.g. Mid-term Physics Quiz"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="subject">Subject</Label>
                                <Select value={subjectId} onValueChange={setSubjectId} required>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Subject" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {subjects.map(s => (
                                            <SelectItem key={s.id} value={s.id.toString()}>{s.name} ({s.academic_class})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="section">Assign to Section</Label>
                                <Select value={sectionId} onValueChange={setSectionId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Sections" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Sections (Class-wide)</SelectItem>
                                        {sections.map(s => (
                                            <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="type">Type</Label>
                                    <Select value={type} onValueChange={(v: any) => setType(v)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="quiz">Quiz</SelectItem>
                                            <SelectItem value="exam">Exam</SelectItem>
                                            <SelectItem value="assignment">Assignment</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="duration">Duration (min)</Label>
                                    <Input
                                        id="duration"
                                        type="number"
                                        value={duration}
                                        onChange={(e) => setDuration(parseInt(e.target.value))}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="passing">Passing Marks (%)</Label>
                                    <Input
                                        id="passing"
                                        type="number"
                                        value={passingMarks}
                                        onChange={(e) => setPassingMarks(parseInt(e.target.value))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="blooms">Difficulty Level</Label>
                                    <Select value={bloomsLevel} onValueChange={setBloomsLevel}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="remember">Remember</SelectItem>
                                            <SelectItem value="understand">Understand</SelectItem>
                                            <SelectItem value="apply">Apply</SelectItem>
                                            <SelectItem value="analyze">Analyze</SelectItem>
                                            <SelectItem value="evaluate">Evaluate</SelectItem>
                                            <SelectItem value="create">Create</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="due">Due Date (Optional)</Label>
                                <Input
                                    id="due"
                                    type="datetime-local"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                />
                            </div>

                            <div className="pt-4 flex items-center justify-between border-t border-slate-100">
                                <div className="text-sm font-medium text-slate-500">Total Marks:</div>
                                <div className="text-xl font-bold text-indigo-600">{questions.reduce((acc, q) => acc + q.points, 0)}</div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Questions List */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <HelpCircle className="h-5 w-5 text-indigo-500" /> Questions List
                        </h2>
                        <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
                            <Plus className="mr-2 h-4 w-4" /> Add Question
                        </Button>
                    </div>

                    {questions.map((q, qIndex) => (
                        <Card key={qIndex} className="border-slate-200 shadow-sm relative group overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                            <CardHeader className="pb-3 flex flex-row items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200">Q{qIndex + 1}</Badge>
                                    <Select value={q.type} onValueChange={(v: any) => updateQuestion(qIndex, 'type', v)}>
                                        <SelectTrigger className="w-[180px] h-8 text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="mcq">Multiple Choice</SelectItem>
                                            <SelectItem value="short_answer">Short Answer</SelectItem>
                                            <SelectItem value="long_answer">Long Answer / Essay</SelectItem>
                                            <SelectItem value="code">Code Snippet</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1">
                                        <Label className="text-[10px] uppercase text-slate-400">Points</Label>
                                        <Input
                                            type="number"
                                            className="w-16 h-8 text-sm"
                                            value={q.points}
                                            onChange={(e) => updateQuestion(qIndex, 'points', parseInt(e.target.value))}
                                        />
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="text-slate-400 hover:text-red-500 h-8 w-8"
                                        onClick={() => removeQuestion(qIndex)}
                                        disabled={questions.length === 1}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Textarea
                                    placeholder="Enter your question text here..."
                                    className="min-h-[80px]"
                                    value={q.text}
                                    onChange={(e) => updateQuestion(qIndex, 'text', e.target.value)}
                                    required
                                />

                                {q.type === 'mcq' && (
                                    <div className="space-y-3 pt-2">
                                        <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Options</Label>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {q.options.map((opt, oIndex) => (
                                                <div key={oIndex} className="flex items-center gap-2">
                                                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border ${q.correct_answer === opt && opt !== '' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                                                        {String.fromCharCode(65 + oIndex)}
                                                    </div>
                                                    <Input
                                                        placeholder={`Option ${oIndex + 1}`}
                                                        value={opt}
                                                        onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                                                        className={q.correct_answer === opt && opt !== '' ? 'border-indigo-300 ring-1 ring-indigo-300' : ''}
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className={`h-8 px-2 text-[10px] ${q.correct_answer === opt && opt !== '' ? 'text-indigo-600 font-bold' : 'text-slate-400'}`}
                                                        onClick={() => updateQuestion(qIndex, 'correct_answer', opt)}
                                                    >
                                                        Correct
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {(q.type === 'short_answer' || q.type === 'long_answer' || q.type === 'code') && (
                                    <div className="space-y-2 pt-2">
                                        <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                            {q.type === 'short_answer' ? 'Correct Answer (Case Insensitive)' : 'Reference Answer / Guidelines'}
                                        </Label>
                                        <Textarea
                                            placeholder={q.type === 'short_answer' ? 'Enter correct answer keyword...' : 'Enter reference answer for manual grading...'}
                                            value={q.correct_answer}
                                            onChange={(e) => updateQuestion(qIndex, 'correct_answer', e.target.value)}
                                        />
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}

                    <Button type="button" variant="outline" className="w-full h-16 border-dashed border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300" onClick={addQuestion}>
                        <Plus className="mr-2 h-5 w-5" /> Add Another Question
                    </Button>
                </div>
            </form>
        </div>
    );
}
