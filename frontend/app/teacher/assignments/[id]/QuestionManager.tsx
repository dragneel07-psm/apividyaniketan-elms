// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, GripVertical, CheckCircle2, Circle } from 'lucide-react';
import { academicAPI, Question } from '@/lib/api';
import { toast } from 'sonner';

export default function QuestionManager({ assessmentId }: { assessmentId: string }) {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);

    const [newQuestion, setNewQuestion] = useState<Partial<Question>>({
        text: '',
        type: 'mcq',
        options: ['', '', '', ''],
        correct_answer: '',
        points: 5,
        order: 0
    });

    useEffect(() => {
        loadQuestions();
    }, [assessmentId]);

    const loadQuestions = async () => {
        try {
            setLoading(true);
            const data = await academicAPI.getQuestionsByAssessment(assessmentId);
            setQuestions(data);
        } catch (error) {
            console.error('Failed to load questions:', error);
            toast.error('Failed to load questions');
        } finally {
            setLoading(false);
        }
    };

    const handleAddQuestion = async () => {
        if (!newQuestion.text) {
            toast.error('Question text is required');
            return;
        }

        try {
            const data = await academicAPI.createQuestion({
                ...newQuestion,
                assessment: assessmentId,
                order: questions.length
            });
            setQuestions([...questions, data]);
            setIsAdding(false);
            setNewQuestion({
                text: '',
                type: 'mcq',
                options: ['', '', '', ''],
                correct_answer: '',
                points: 5,
                order: 0
            });
            toast.success('Question added');
        } catch (error) {
            console.error('Failed to add question:', error);
            toast.error('Failed to add question');
        }
    };

    const handleDeleteQuestion = async (id: string) => {
        try {
            await academicAPI.deleteQuestion(id);
            setQuestions(questions.filter(q => q.question_id !== id));
            toast.success('Question deleted');
        } catch (error) {
            console.error('Failed to delete question:', error);
            toast.error('Failed to delete question');
        }
    };

    const updateOption = (index: number, value: string) => {
        const newOptions = [...(newQuestion.options || [])];
        newOptions[index] = value;
        setNewQuestion({ ...newQuestion, options: newOptions });
    };

    if (loading) return <div className="p-8 text-center text-slate-400">Loading questions...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-800">Quiz Questions ({questions.length})</h3>
                <Button onClick={() => setIsAdding(true)} className="bg-indigo-600 hover:bg-indigo-700">
                    <Plus className="h-4 w-4 mr-2" /> Add Question
                </Button>
            </div>

            {isAdding && (
                <Card className="border-2 border-indigo-100 bg-indigo-50/10">
                    <CardHeader>
                        <CardTitle className="text-sm">New Question</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Question Text</Label>
                            <Textarea
                                placeholder="Enter your question here..."
                                value={newQuestion.text}
                                onChange={(e) => setNewQuestion({ ...newQuestion, text: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Type</Label>
                                <Select
                                    value={newQuestion.type}
                                    onValueChange={(val: any) => setNewQuestion({ ...newQuestion, type: val })}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="mcq">Multiple Choice</SelectItem>
                                        <SelectItem value="short_answer">Short Answer</SelectItem>
                                        <SelectItem value="long_answer">Essay</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Points</Label>
                                <Input
                                    type="number"
                                    value={newQuestion.points}
                                    onChange={(e) => setNewQuestion({ ...newQuestion, points: parseInt(e.target.value) })}
                                />
                            </div>
                        </div>

                        {newQuestion.type === 'mcq' && (
                            <div className="space-y-3 pt-2">
                                <Label>Options (Mark the correct one)</Label>
                                {(newQuestion.options || []).map((opt, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className={`rounded-full h-8 w-8 ${newQuestion.correct_answer === opt && opt !== '' ? 'text-emerald-600 bg-emerald-50' : 'text-slate-300'}`}
                                            onClick={() => setNewQuestion({ ...newQuestion, correct_answer: opt })}
                                        >
                                            {newQuestion.correct_answer === opt && opt !== '' ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                                        </Button>
                                        <Input
                                            placeholder={`Option ${i + 1}`}
                                            value={opt}
                                            onChange={(e) => updateOption(i, e.target.value)}
                                            className={newQuestion.correct_answer === opt && opt !== '' ? 'border-emerald-200 bg-emerald-50/30' : ''}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="pt-4 flex justify-end gap-2">
                            <Button variant="ghost" onClick={() => setIsAdding(false)}>Cancel</Button>
                            <Button onClick={handleAddQuestion} className="bg-indigo-600 hover:bg-indigo-700">Save Question</Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="space-y-4">
                {questions.map((q, idx) => (
                    <Card key={q.question_id} className="group hover:border-slate-300 transition-colors">
                        <CardContent className="p-6">
                            <div className="flex gap-4">
                                <div className="mt-1 text-slate-300 group-hover:text-slate-400">
                                    <GripVertical className="h-5 w-5" />
                                </div>
                                <div className="flex-1 space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                                Question {idx + 1} • {q.type.replace('_', ' ')} • {q.points} pts
                                            </span>
                                            <p className="font-bold text-slate-800 mt-2">{q.text}</p>
                                        </div>
                                        <Button variant="ghost" size="icon" className="text-slate-300 hover:text-red-500" onClick={() => handleDeleteQuestion(q.question_id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>

                                    {q.type === 'mcq' && (
                                        <div className="grid grid-cols-2 gap-2 mt-4">
                                            {q.options.map((opt, i) => (
                                                <div key={i} className={`p-2 rounded-lg text-sm flex items-center gap-2 ${opt === q.correct_answer ? 'bg-emerald-50 border border-emerald-100 text-emerald-700' : 'bg-slate-50 text-slate-600 border border-transparent'}`}>
                                                    {opt === q.correct_answer ? <CheckCircle2 className="h-4 w-4" /> : <div className="h-1 w-1 bg-slate-300 rounded-full" />}
                                                    {opt}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {questions.length === 0 && !isAdding && (
                    <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                        <p className="text-slate-500 italic">No questions added yet. Click &quot;Add Question&quot; to start.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
