// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Plus, Save } from 'lucide-react';
import { academicAPI, Assessment, Question } from '@/lib/api';
import QuestionList from '@/components/teacher/QuestionList';
import QuestionEditor from '@/components/teacher/QuestionEditor';
import { toast } from 'sonner';

export default function AssessmentQuestionsPage() {
    const params = useParams();
    const router = useRouter();
    const assessmentId = params.id as string;

    const [assessment, setAssessment] = useState<Assessment | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<Question | undefined>(undefined);

    useEffect(() => {
        loadData();
    }, [assessmentId]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [assessmentData, questionsData] = await Promise.all([
                academicAPI.getAssessment(assessmentId),
                academicAPI.getQuestionsByAssessment(assessmentId)
            ]);
            setAssessment(assessmentData);
            setQuestions(Array.isArray(questionsData) ? questionsData : []);
        } catch (error) {
            console.error('Failed to load data:', error);
            toast.error('Failed to load assessment data');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveQuestion = async (data: Partial<Question>) => {
        try {
            if (editingQuestion) {
                await academicAPI.updateQuestion(editingQuestion.id, data);
            } else {
                await academicAPI.createQuestion({
                    ...data,
                    assessment: assessmentId,
                    order: questions.length + 1
                });
            }
            await loadData();
            setIsEditing(false);
            setEditingQuestion(undefined);
        } catch (error) {
            console.error('Failed to save question:', error);
            toast.error('Failed to save question');
        }
    };

    const handleDeleteQuestion = async (id: string) => {
        if (!confirm('Are you sure you want to delete this question?')) return;
        try {
            await academicAPI.deleteQuestion(id);
            await loadData();
            toast.success('Question deleted');
        } catch (error) {
            console.error('Failed to delete question:', error);
            toast.error('Failed to delete question');
        }
    };

    if (loading) return <div className="p-12 text-center text-slate-500">Loading assessment details...</div>;
    if (!assessment) return <div className="p-12 text-center text-red-500">Assessment not found</div>;

    const totalPoints = questions.reduce((sum, q) => sum + (q.points || 0), 0);

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/teacher/assignments')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">{assessment.title}</h1>
                        <p className="text-slate-500 text-sm">
                            {questions.length} Questions • {totalPoints} Total Marks
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => router.push('/teacher/assignments')}>
                        Save & Exit
                    </Button>
                    {!isEditing && (
                        <Button onClick={() => { setIsEditing(true); setEditingQuestion(undefined); }} className="bg-indigo-600 hover:bg-indigo-700">
                            <Plus className="h-4 w-4 mr-2" /> Add Question
                        </Button>
                    )}
                </div>
            </div>

            {/* Editor or List */}
            {isEditing ? (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-slate-800">
                            {editingQuestion ? 'Edit Question' : 'New Question'}
                        </h3>
                    </div>
                    <QuestionEditor
                        initialData={editingQuestion}
                        onSave={handleSaveQuestion}
                        onCancel={() => { setIsEditing(false); setEditingQuestion(undefined); }}
                    />
                </div>
            ) : (
                <QuestionList
                    questions={questions}
                    onEdit={(q) => { setEditingQuestion(q); setIsEditing(true); }}
                    onDelete={handleDeleteQuestion}
                />
            )}
        </div>
    );
}
