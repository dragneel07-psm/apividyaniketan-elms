// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { academicAPI, Assessment, Subject } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Plus, FileQuestion, Calendar, Clock, MoreVertical, Edit, Trash } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';

export default function QuizListPage() {
    const params = useParams();
    const courseId = params.courseId as string;
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [assessments, setAssessments] = useState<Assessment[]>([]);
    const [subject, setSubject] = useState<Subject | null>(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [assessmentsData, subjectData] = await Promise.all([
                    academicAPI.getAssessments(), // TODO: Filter by subject in API
                    academicAPI.getSubject(parseInt(courseId))
                ]);

                // Client-side filter for now until API supports query param (or check api.ts)
                // api.ts getAssessments doesn't take args. I should update it later.
                // For now filter manually.
                const filtered = assessmentsData.filter(a => a.subject.toString() === courseId);
                setAssessments(filtered);
                setSubject(subjectData);
            } catch (error) {
                console.error("Failed to load quizzes", error);
                toast.error("Failed to load quizzes");
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [courseId]);

    const handleCreate = async () => {
        try {
            const newQuiz = await academicAPI.createAssessment({
                subject: parseInt(courseId),
                title: 'New Quiz',
                description: '',
                type: 'quiz',
                total_marks: 100,
                passing_marks: 40,
                duration_minutes: 30,
                blooms_level: 'remember',
                due_date: new Date().toISOString()
            });
            router.push(`/teacher/courses/${courseId}/quizzes/${newQuiz.assessment_id}`);
        } catch (error) {
            console.error("Failed to create quiz", error);
            toast.error("Failed to create quiz");
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await academicAPI.deleteAssessment(id);
            setAssessments(prev => prev.filter(a => a.assessment_id !== id));
            toast.success("Quiz deleted");
        } catch (error) {
            console.error("Failed to delete quiz", error);
            toast.error("Failed to delete quiz");
        }
    };

    if (loading) {
        return <div className="flex justify-center p-10"><Loader2 className="animate-spin h-8 w-8 text-indigo-500" /></div>;
    }

    return (
        <div className="max-w-6xl mx-auto py-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Quizzes & Assessments</h2>
                    <p className="text-slate-500">Manage tests for {subject?.name}</p>
                </div>
                <Button onClick={handleCreate} className="bg-indigo-600 hover:bg-indigo-700">
                    <Plus className="h-4 w-4 mr-2" /> Create Quiz
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {assessments.map((quiz) => (
                    <Card key={quiz.assessment_id} className="hover:shadow-md transition-shadow border-slate-200">
                        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                            <div className="space-y-1">
                                <CardTitle className="text-base font-bold line-clamp-1">{quiz.title}</CardTitle>
                                <CardDescription className="line-clamp-2 min-h-[40px]">
                                    {quiz.description || "No description provided."}
                                </CardDescription>
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                        <MoreVertical className="h-4 w-4 text-slate-400" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => router.push(`/teacher/courses/${courseId}/quizzes/${quiz.assessment_id}`)}>
                                        <Edit className="mr-2 h-4 w-4" /> Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDelete(quiz.assessment_id)} className="text-red-600 focus:text-red-600">
                                        <Trash className="mr-2 h-4 w-4" /> Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-4 text-sm text-slate-500 mt-4">
                                <div className="flex items-center gap-1">
                                    <Clock className="h-4 w-4" />
                                    <span>{quiz.duration_minutes}m</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <FileQuestion className="h-4 w-4" />
                                    <span>{quiz.questions?.length || 0} Qs</span>
                                </div>
                                <BatchBadge type={quiz.type} />
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {assessments.length === 0 && (
                    <div className="col-span-full text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                        <div className="mx-auto h-12 w-12 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
                            <FileQuestion className="h-6 w-6 text-indigo-400" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900">No quizzes yet</h3>
                        <p className="text-slate-500 mb-4">Create your first assessment to test student knowledge.</p>
                        <Button onClick={handleCreate} variant="outline">Create Quiz</Button>
                    </div>
                )}
            </div>
        </div>
    );
}

function BatchBadge({ type }: { type: string }) {
    const colors: Record<string, string> = {
        quiz: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
        exam: "bg-indigo-100 text-indigo-700 hover:bg-indigo-100",
        assignment: "bg-amber-100 text-amber-700 hover:bg-amber-100",
    };
    return <Badge className={colors[type] || "bg-slate-100 text-slate-700"}>{type.toUpperCase()}</Badge>;
}
