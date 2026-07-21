// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { academicAPI, Assessment, Question } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Save, ArrowLeft, Plus } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { arrayMove } from '@dnd-kit/sortable';
import { QuestionList } from '@/components/quizzes/question-list';
import { QuestionEditorModal } from '@/components/quizzes/question-editor-modal';

export default function QuizEditorPage() {
    const params = useParams();
    const courseId = params.courseId as string;
    const quizId = params.quizId as string;
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [quiz, setQuiz] = useState<Assessment | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);

    // Form State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [duration, setDuration] = useState(30);
    const [passingMarks, setPassingMarks] = useState(40);
    const [totalMarks, setTotalMarks] = useState(10);
    const [quizType, setQuizType] = useState<'quiz' | 'exam' | 'assignment'>('quiz');
    const [bloomsLevel, setBloomsLevel] = useState('remember');
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<Question | undefined>(undefined);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [quizData, questionsData] = await Promise.all([
                    academicAPI.getAssessment(quizId),
                    academicAPI.getQuestionsByAssessment(quizId)
                ]);
                setQuiz(quizData);
                // Sort by order field
                setQuestions(questionsData.sort((a, b) => a.order - b.order));
                setTitle(quizData.title);
                setDescription(quizData.description);
                setDuration(quizData.duration_minutes);
                setPassingMarks(quizData.passing_marks);
                setTotalMarks(quizData.total_marks);
                setQuizType(quizData.type as any);
                setBloomsLevel(quizData.blooms_level || 'remember');
            } catch (error) {
                console.error("Failed to load quiz", error);
                toast.error("Failed to load quiz details");
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [quizId]);

    const handleSaveSettings = async () => {
        try {
            setSaving(true);
            await academicAPI.updateAssessment(quizId, {
                title,
                description,
                duration_minutes: duration,
                passing_marks: passingMarks,
                total_marks: totalMarks,
                type: quizType,
                blooms_level: bloomsLevel
            });
            toast.success("Quiz settings saved");
        } catch (error) {
            console.error("Failed to save quiz", error);
            toast.error("Failed to save settings");
        } finally {
            setSaving(false);
        }
    };

    const handleReorder = async (activeId: string, overId: string) => {
        const oldIndex = questions.findIndex(q => q.question_id === activeId);
        const newIndex = questions.findIndex(q => q.question_id === overId);

        if (oldIndex !== -1 && newIndex !== -1) {
            const newQuestions = arrayMove(questions, oldIndex, newIndex);
            setQuestions(newQuestions);

            try {
                const orders = newQuestions.map((q, idx) => ({
                    id: q.question_id,
                    order: idx + 1
                }));
                await academicAPI.reorderQuestions(orders);
                toast.success("Order updated");
            } catch (error) {
                console.error("Failed to reorder", error);
                toast.error("Failed to save new order");
                // Revert or reload
                const questionsData = await academicAPI.getQuestionsByAssessment(quizId);
                setQuestions(questionsData.sort((a, b) => a.order - b.order));
            }
        }
    };

    const handleQuestionSaved = () => {
        setIsEditorOpen(false);
        setEditingQuestion(undefined);
        // Reload questions
        academicAPI.getQuestionsByAssessment(quizId).then(data => {
            setQuestions(data.sort((a, b) => a.order - b.order));
        });
    };

    const handleEditQuestion = (q: Question) => {
        setEditingQuestion(q);
        setIsEditorOpen(true);
    };

    const handleDeleteQuestion = async (id: string) => {
        try {
            await academicAPI.deleteQuestion(id);
            setQuestions(prev => prev.filter(q => q.question_id !== id));
            toast.success("Question deleted");
        } catch (error) {
            toast.error("Failed to delete question");
        }
    };

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin h-8 w-8 text-indigo-500" /></div>;

    return (
        <div className="max-w-5xl mx-auto py-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between mb-8 sticky top-0 bg-slate-50/95 backdrop-blur z-20 py-4 border-b border-slate-200">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">{title || 'Untitled Quiz'}</h1>
                        <p className="text-sm text-slate-500">{questions.length} Questions • {duration} Mins</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button onClick={handleSaveSettings} disabled={saving} variant="outline">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                        Save Settings
                    </Button>
                    <Button onClick={() => { setEditingQuestion(undefined); setIsEditorOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700">
                        <Plus className="h-4 w-4 mr-2" /> Add Question
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Questions List */}
                <div className="lg:col-span-2 space-y-6">
                    <QuestionList
                        questions={questions}
                        onEdit={handleEditQuestion}
                        onDelete={handleDeleteQuestion}
                        onReorder={handleReorder}
                    />
                </div>

                {/* Settings Sidebar */}
                <div className="space-y-6">
                    <Card>
                        <CardContent className="p-6 space-y-4">
                            <h3 className="font-bold text-slate-900 border-b pb-2 mb-2">Quiz Settings</h3>
                            <div className="space-y-2">
                                <Label>Title</Label>
                                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Description</Label>
                                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
                            </div>
                            <div className="space-y-2">
                                <Label>Assessment Type</Label>
                                <Select value={quizType} onValueChange={(v: any) => setQuizType(v)}>
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
                                <Label>Blooms Level</Label>
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
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Duration (min)</Label>
                                    <Input type="number" value={duration} onChange={(e) => setDuration(parseInt(e.target.value))} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Passing Marks</Label>
                                    <Input type="number" value={passingMarks} onChange={(e) => setPassingMarks(parseInt(e.target.value))} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label>Total Marks</Label>
                                    <Button
                                        variant="link"
                                        size="sm"
                                        className="h-auto p-0 text-xs text-indigo-600"
                                        onClick={() => {
                                            const sum = questions.reduce((acc, q) => acc + (q.points || 0), 0);
                                            setTotalMarks(sum);
                                            toast.info(`Calculated total marks: ${sum}`);
                                        }}
                                    >
                                        Auto-sum from questions
                                    </Button>
                                </div>
                                <Input type="number" value={totalMarks} onChange={(e) => setTotalMarks(parseInt(e.target.value))} />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <QuestionEditorModal
                isOpen={isEditorOpen}
                onClose={() => setIsEditorOpen(false)}
                question={editingQuestion}
                assessmentId={quizId}
                onSaved={handleQuestionSaved}
                nextOrder={questions.length + 1}
            />
        </div>
    );
}
