// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Search, Plus, Filter, Trash2, Edit3,
    Database, Tag, Layers, ChevronRight,
    CheckCircle2, XCircle, HelpCircle,
    ListChecks, Type, FileText
} from 'lucide-react';
import { academicAPI, Question } from '@/lib/api';
import { toast } from 'sonner';

export default function QuestionBankPage() {
    const [loading, setLoading] = useState(true);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);

    useEffect(() => {
        async function fetchQuestions() {
            try {
                const data = await academicAPI.getQuestions();
                setQuestions(data);
            } catch (error) {
                console.error('Failed to fetch questions', error);
                toast.error('Failed to load question bank');
            } finally {
                setLoading(false);
            }
        }
        fetchQuestions();
    }, []);

    const filteredQuestions = questions.filter(q => {
        const matchesSearch = q.text.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDifficulty = selectedDifficulty ? (q as any).difficulty === selectedDifficulty : true;
        return matchesSearch && matchesDifficulty;
    });

    const getDifficultyColor = (difficulty?: string) => {
        switch (difficulty) {
            case 'easy': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'hard': return 'bg-rose-100 text-rose-700 border-rose-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'mcq': return <ListChecks className="h-4 w-4" />;
            case 'short_answer': return <Type className="h-4 w-4" />;
            case 'long_answer': return <FileText className="h-4 w-4" />;
            case 'code': return <Database className="h-4 w-4" />;
            default: return <HelpCircle className="h-4 w-4" />;
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <Database className="h-8 w-8 text-indigo-600" /> Question Bank
                    </h1>
                    <p className="text-slate-500">Manage and reuse questions across all your assessments</p>
                </div>
                <Button className="bg-indigo-600 hover:bg-indigo-700">
                    <Plus className="mr-2 h-4 w-4" /> Create stand-alone Question
                </Button>
            </div>

            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search questions..."
                                className="pl-10"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge
                                variant={selectedDifficulty === null ? 'default' : 'outline'}
                                className="cursor-pointer"
                                onClick={() => setSelectedDifficulty(null)}
                            >
                                All
                            </Badge>
                            <Badge
                                variant={selectedDifficulty === 'easy' ? 'default' : 'outline'}
                                className="cursor-pointer hover:bg-emerald-50"
                                onClick={() => setSelectedDifficulty('easy')}
                            >
                                Easy
                            </Badge>
                            <Badge
                                variant={selectedDifficulty === 'medium' ? 'default' : 'outline'}
                                className="cursor-pointer hover:bg-amber-50"
                                onClick={() => setSelectedDifficulty('medium')}
                            >
                                Medium
                            </Badge>
                            <Badge
                                variant={selectedDifficulty === 'hard' ? 'default' : 'outline'}
                                className="cursor-pointer hover:bg-rose-50"
                                onClick={() => setSelectedDifficulty('hard')}
                            >
                                Hard
                            </Badge>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {loading ? (
                            <div className="py-12 text-center text-slate-400">Loading questions...</div>
                        ) : filteredQuestions.length === 0 ? (
                            <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-2">
                                <Database className="h-12 w-12 text-slate-200" />
                                <p>No questions found matching your criteria</p>
                            </div>
                        ) : (
                            filteredQuestions.map(q => (
                                <div key={q.id} className="group p-4 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/10 transition-all">
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-2 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <Badge variant="outline" className={`${getDifficultyColor((q as any).difficulty)} uppercase text-[10px]`}>
                                                    {(q as any).difficulty || 'medium'}
                                                </Badge>
                                                <Badge variant="secondary" className="bg-indigo-50 text-indigo-600 border-indigo-100 uppercase text-[10px]">
                                                    {q.type.replace('_', ' ')}
                                                </Badge>
                                                <div className="flex items-center gap-1 text-slate-400 text-xs">
                                                    <Tag className="h-3 w-3" />
                                                    {(q as any).tags?.length > 0 ? (q as any).tags.join(', ') : 'No tags'}
                                                </div>
                                            </div>
                                            <h3 className="text-slate-800 font-medium leading-relaxed">{q.text}</h3>
                                            {q.type === 'mcq' && (
                                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
                                                    {q.options.map((opt, i) => (
                                                        <div key={i} className={`text-xs p-2 rounded border flex items-center gap-2 ${opt === q.correct_answer ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                                                            <div className={`h-4 w-4 rounded-full flex items-center justify-center text-[8px] font-bold ${opt === q.correct_answer ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                                                {String.fromCharCode(65 + i)}
                                                            </div>
                                                            <span className="truncate">{opt}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-indigo-600">
                                                <Edit3 className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-wider">
                                        <div className="flex items-center gap-4">
                                            <span className="flex items-center gap-1">
                                                <HelpCircle className="h-3 w-3" /> Points: {q.points}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Layers className="h-3 w-3" /> Used in: {q.assessment ? '1 Assessment' : '0 Assessments'}
                                            </span>
                                        </div>
                                        <Button variant="link" size="sm" className="h-auto p-0 text-indigo-600 text-[10px] font-bold">
                                            Preview Details <ChevronRight className="h-3 w-3 ml-0.5" />
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

