// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Question {
    id: string;
    question: string;
    options: string[];
    correctIndex: number;
    explanation?: string;
}

interface QuizData {
    questions: Question[];
}

interface QuizBuilderProps {
    data?: QuizData;
    onChange: (data: QuizData) => void;
}

function makeQuestionId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `q-${Date.now().toString(36)}`;
}

export function QuizBuilder({ data, onChange }: QuizBuilderProps) {
    const [questions, setQuestions] = useState<Question[]>(() =>
        data?.questions && data.questions.length > 0 ? data.questions : [
            {
                id: makeQuestionId(),
                question: '',
                options: ['', '', '', ''],
                correctIndex: 0,
                explanation: ''
            }
        ]
    );

    const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(
        questions.length > 0 ? questions[0].id : null
    );

    const addQuestion = () => {
        const newId = makeQuestionId();
        const newQuestion: Question = {
            id: newId,
            question: '',
            options: ['', '', '', ''],
            correctIndex: 0,
            explanation: ''
        };
        const newQuestions = [...questions, newQuestion];
        setQuestions(newQuestions);
        setExpandedQuestionId(newId);
        onChange({ questions: newQuestions });
    };

    const removeQuestion = (id: string) => {
        const newQuestions = questions.filter(q => q.id !== id);
        setQuestions(newQuestions);
        if (expandedQuestionId === id) {
            setExpandedQuestionId(newQuestions.length > 0 ? newQuestions[0].id : null);
        }
        onChange({ questions: newQuestions });
    };

    const updateQuestion = (id: string, updates: Partial<Question>) => {
        const newQuestions = questions.map(q => q.id === id ? { ...q, ...updates } : q);
        setQuestions(newQuestions);
        onChange({ questions: newQuestions });
    };

    const updateOption = (questionId: string, optionIndex: number, value: string) => {
        const newQuestions = questions.map(q => {
            if (q.id === questionId) {
                const newOptions = [...q.options];
                newOptions[optionIndex] = value;
                return { ...q, options: newOptions };
            }
            return q;
        });
        setQuestions(newQuestions);
        onChange({ questions: newQuestions });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900">Quiz Questions</h3>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addQuestion}
                    className="bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100"
                >
                    <Plus className="h-4 w-4 mr-2" /> Add Question
                </Button>
            </div>

            <div className="space-y-4">
                <AnimatePresence initial={false}>
                    {questions.map((q, index) => (
                        <Card
                            key={q.id}
                            className={cn(
                                "border-slate-200 overflow-hidden transition-all",
                                expandedQuestionId === q.id ? "ring-2 ring-indigo-500 shadow-lg" : "hover:border-slate-300"
                            )}
                        >
                            <CardHeader
                                className="p-4 cursor-pointer flex flex-row items-center justify-between bg-slate-50/50"
                                onClick={() => setExpandedQuestionId(expandedQuestionId === q.id ? null : q.id)}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center h-6 w-6 rounded-full bg-slate-200 text-slate-600 text-[10px] font-black">
                                        {index + 1}
                                    </div>
                                    <span className={cn(
                                        "font-bold truncate max-w-[300px] md:max-w-[400px]",
                                        q.question ? "text-slate-800" : "text-slate-400 italic"
                                    )}>
                                        {q.question || "Untitled Question"}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-slate-400 hover:text-red-500"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeQuestion(q.id);
                                        }}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                    {expandedQuestionId === q.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </div>
                            </CardHeader>
                            {expandedQuestionId === q.id && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <CardContent className="p-6 border-t border-slate-100 space-y-6 bg-white">
                                        <div className="space-y-2">
                                            <Label>Question Text</Label>
                                            <Textarea
                                                value={q.question}
                                                onChange={(e) => updateQuestion(q.id, { question: e.target.value })}
                                                placeholder="Write your question here..."
                                                className="resize-none"
                                            />
                                        </div>

                                        <div className="space-y-4">
                                            <Label className="flex items-center gap-2 text-slate-700">
                                                <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Options (Select the correct one)
                                            </Label>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {q.options.map((option, optIdx) => (
                                                    <div key={optIdx} className="flex items-center gap-3">
                                                        <button
                                                            type="button"
                                                            className={cn(
                                                                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 transition-all",
                                                                q.correctIndex === optIdx
                                                                    ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-100"
                                                                    : "bg-slate-50 border-slate-100 text-slate-400 hover:border-emerald-200 hover:bg-emerald-50/50"
                                                            )}
                                                            onClick={() => updateQuestion(q.id, { correctIndex: optIdx })}
                                                        >
                                                            {q.correctIndex === optIdx ? (
                                                                <CheckCircle2 className="h-5 w-5" />
                                                            ) : (
                                                                <span className="font-bold">{String.fromCharCode(65 + optIdx)}</span>
                                                            )}
                                                        </button>
                                                        <Input
                                                            value={option}
                                                            onChange={(e) => updateOption(q.id, optIdx, e.target.value)}
                                                            placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                                                            className={cn(
                                                                "h-10",
                                                                q.correctIndex === optIdx && "border-emerald-200 bg-emerald-50/30"
                                                            )}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="flex items-center gap-2 text-slate-700">
                                                <AlertCircle className="h-4 w-4 text-indigo-500" /> Explanation (Optional)
                                            </Label>
                                            <Textarea
                                                value={q.explanation}
                                                onChange={(e) => updateQuestion(q.id, { explanation: e.target.value })}
                                                placeholder="Explain why the answer is correct..."
                                                className="resize-none h-20 text-sm"
                                            />
                                        </div>
                                    </CardContent>
                                </motion.div>
                            )}
                        </Card>
                    ))}
                </AnimatePresence>
            </div>

            {questions.length === 0 && (
                <div className="text-center p-12 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                    <p className="text-slate-500 font-medium">No questions added yet.</p>
                    <Button
                        type="button"
                        variant="link"
                        onClick={addQuestion}
                        className="text-indigo-600 font-bold"
                    >
                        Create your first question
                    </Button>
                </div>
            )}
        </div>
    );
}
