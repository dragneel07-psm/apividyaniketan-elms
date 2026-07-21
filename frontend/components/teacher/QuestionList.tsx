// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit2, Trash2, GripVertical } from 'lucide-react';
import { Question } from '@/lib/api';

interface QuestionListProps {
    questions: Question[];
    onEdit: (question: Question) => void;
    onDelete: (id: string) => void;
}

export default function QuestionList({ questions, onEdit, onDelete }: QuestionListProps) {
    if (questions.length === 0) {
        return (
            <div className="text-center p-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                <p className="text-slate-500 font-medium">No questions added yet.</p>
                <p className="text-sm text-slate-400 mt-1">Click the button above to add your first question.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {questions.map((q, index) => (
                <Card key={q.id} className="group border-slate-200 hover:border-indigo-200 transition-all">
                    <CardContent className="p-4 flex gap-4">
                        <div className="hidden sm:flex flex-col items-center justify-center text-slate-300 cursor-move">
                            <GripVertical className="h-5 w-5" />
                        </div>

                        <div className="flex-1 space-y-2">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-mono text-xs">
                                        Q{index + 1}
                                    </Badge>
                                    <Badge variant="outline" className="capitalize text-xs font-normal">
                                        {q.type.replace('_', ' ')}
                                    </Badge>
                                    <Badge className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-100">
                                        {q.points} pts
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="sm" onClick={() => onEdit(q)}>
                                        <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => onDelete(q.id)} className="hover:bg-red-50 hover:text-red-600">
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>

                            <p className="text-slate-900 font-medium">{q.text}</p>

                            {q.type === 'mcq' && q.options && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                                    {q.options.map((opt, i) => (
                                        <div
                                            key={i}
                                            className={`text-sm px-3 py-1.5 rounded-md border ${opt === q.correct_answer
                                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-medium'
                                                    : 'bg-white border-slate-100 text-slate-600'
                                                }`}
                                        >
                                            <span className="font-mono mr-2 opacity-50">{String.fromCharCode(65 + i)}.</span>
                                            {opt}
                                            {opt === q.correct_answer && <span className="ml-2 text-emerald-600">✓</span>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
