// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { Question, academicAPI } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Plus, Trash, CheckCircle2, Circle } from 'lucide-react';

interface QuestionEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    question?: Question;
    assessmentId: string;
    onSaved: () => void;
    nextOrder?: number;
}

export function QuestionEditorModal({ isOpen, onClose, question, assessmentId, onSaved, nextOrder }: QuestionEditorModalProps) {
    const [saving, setSaving] = useState(false);

    // Form State
    const [text, setText] = useState('');
    const [type, setType] = useState<'mcq' | 'short_answer'>('mcq');
    const [points, setPoints] = useState(1);
    const [options, setOptions] = useState<string[]>(['', '', '', '']);
    const [correctOptionIndex, setCorrectOptionIndex] = useState<number | null>(null);
    const [correctAnswer, setCorrectAnswer] = useState(''); // Used for short_answer and as final payload

    useEffect(() => {
        if (isOpen) {
            if (question) {
                setText(question.text);
                setType(question.type as 'mcq' | 'short_answer');
                setPoints(question.points);
                if (question.type === 'mcq') {
                    setOptions(question.options);
                    const idx = question.options.indexOf(question.correct_answer || '');
                    setCorrectOptionIndex(idx !== -1 ? idx : null);
                } else {
                    setOptions(['', '', '', '']);
                    setCorrectAnswer(question.correct_answer || '');
                }
            } else {
                // Reset for new
                setText('');
                setType('mcq');
                setPoints(1);
                setOptions(['', '', '', '']);
                setCorrectOptionIndex(null);
                setCorrectAnswer('');
            }
        }
    }, [isOpen, question]);

    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
    };

    const handleSetCorrect = (index: number) => {
        setCorrectOptionIndex(index);
    };

    const handleAddOption = () => {
        setOptions([...options, '']);
    };

    const handleRemoveOption = (index: number) => {
        const newOptions = options.filter((_, i) => i !== index);
        setOptions(newOptions);
        if (correctOptionIndex === index) {
            setCorrectOptionIndex(null);
        } else if (correctOptionIndex !== null && correctOptionIndex > index) {
            setCorrectOptionIndex(correctOptionIndex - 1);
        }
    };

    const handleSave = async () => {
        if (!text) {
            toast.error("Question text is required");
            return;
        }

        let finalCorrectAnswer = correctAnswer;

        if (type === 'mcq') {
            const validOptions = options.filter(o => o.trim() !== '');
            if (validOptions.length < 2) {
                toast.error("MCQ must have at least 2 options");
                return;
            }
            if (correctOptionIndex === null || !options[correctOptionIndex]?.trim()) {
                toast.error("Please select a valid correct answer");
                return;
            }
            finalCorrectAnswer = options[correctOptionIndex];
        }

        try {
            setSaving(true);
            const payload = {
                assessment: assessmentId,
                text,
                type,
                points,
                options: type === 'mcq' ? options.filter(o => o.trim() !== '') : [],
                correct_answer: finalCorrectAnswer,
                order: question ? question.order : (nextOrder || 0),
            };

            if (question) {
                await academicAPI.updateQuestion(question.question_id, payload);
            } else {
                await academicAPI.createQuestion(payload);
            }

            toast.success("Question saved");
            onSaved();
        } catch (error) {
            console.error("Failed to save question", error);
            toast.error("Failed to save question");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{question ? 'Edit Question' : 'Add New Question'}</DialogTitle>
                    <DialogDescription>Create a question for your quiz.</DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="space-y-2">
                        <Label>Question Text</Label>
                        <Textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="What is the capital of France?"
                            rows={3}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Type</Label>
                            <Select value={type} onValueChange={(v: any) => setType(v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="mcq">Multiple Choice</SelectItem>
                                    <SelectItem value="short_answer">Short Answer</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Points</Label>
                            <Input
                                type="number"
                                min={0}
                                value={points}
                                onChange={(e) => setPoints(parseInt(e.target.value))}
                            />
                        </div>
                    </div>

                    {type === 'mcq' && (
                        <div className="space-y-3">
                            <Label>Options</Label>
                            {options.map((option, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleSetCorrect(index)}
                                        className={index === correctOptionIndex ? 'text-emerald-600' : 'text-slate-300'}
                                        title="Mark as correct"
                                    >
                                        {index === correctOptionIndex ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                                    </Button>
                                    <Input
                                        value={option}
                                        onChange={(e) => handleOptionChange(index, e.target.value)}
                                        placeholder={`Option ${index + 1}`}
                                        className={index === correctOptionIndex ? 'border-emerald-500 ring-1 ring-emerald-500' : ''}
                                    />
                                    <Button variant="ghost" size="icon" onClick={() => handleRemoveOption(index)} className="text-slate-400 hover:text-red-600">
                                        <Trash className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                            <Button variant="outline" size="sm" onClick={handleAddOption} className="mt-2 w-full border-dashed">
                                <Plus className="h-4 w-4 mr-2" /> Add Option
                            </Button>
                        </div>
                    )}

                    {type === 'short_answer' && (
                        <div className="space-y-2">
                            <Label>Correct Answer (Example)</Label>
                            <Input
                                value={correctAnswer}
                                onChange={(e) => setCorrectAnswer(e.target.value)}
                                placeholder="Enter the exact answer key"
                            />
                            <p className="text-xs text-slate-500">Students must match this answer (case-insensitive usually).</p>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
                        {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        Save Question
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
