// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    ArrowLeft, Save, Sparkles,
    Clock, Calendar, User,
    BookOpen, CheckCircle, AlertCircle,
    Loader2
} from 'lucide-react';
import { academicAPI, Result } from '@/lib/api';
import { toast } from 'sonner';

export default function StudentResultDetailPage() {
    const params = useParams();
    const courseId = params.courseId as string;
    const resultId = params.resultId as string;
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [generatingAI, setGeneratingAI] = useState(false);
    const [result, setResult] = useState<Result | null>(null);

    // Edit State
    const [score, setScore] = useState<string>('0');
    const [feedback, setFeedback] = useState('');

    useEffect(() => {
        const loadResult = async () => {
            try {
                const data = await academicAPI.getResult(resultId);
                setResult(data);
                setScore(data.score.toString());
                setFeedback(data.teacher_feedback || '');
            } catch (error) {
                console.error("Failed to load result", error);
                toast.error("Failed to load result details");
            } finally {
                setLoading(false);
            }
        };
        loadResult();
    }, [resultId]);

    const handleSave = async () => {
        try {
            setSaving(true);
            const updated = await academicAPI.updateResult(resultId, {
                score: parseInt(score),
                teacher_feedback: feedback
            });
            setResult(updated);
            toast.success("Result updated successfully");
        } catch (error) {
            toast.error("Failed to update result");
        } finally {
            setSaving(false);
        }
    };

    const handleGenerateAI = async () => {
        try {
            setGeneratingAI(true);
            const response = await academicAPI.generateAIFeedback(resultId);

            if (result) {
                setResult({
                    ...result,
                    ai_feedback: response.ai_feedback
                });
            }

            toast.success("AI Analysis complete!");
        } catch (error) {
            console.error("AI Generation Error:", error);
            toast.error("Failed to generate AI feedback");
        } finally {
            setGeneratingAI(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center p-20"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;
    }

    if (!result) return <div>Result not found</div>;

    return (
        <div className="max-w-5xl mx-auto py-8 px-4 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={() => router.back()} className="text-slate-500 hover:text-slate-900">
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back to Gradebook
                </Button>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={handleGenerateAI}
                        disabled={generatingAI}
                        className="text-indigo-600 border-indigo-100 hover:bg-indigo-50"
                    >
                        {generatingAI ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                        AI Feedback
                    </Button>
                    <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 shadow-sm">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                        Save Changes
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Student & Assessment Info */}
                <div className="lg:col-span-1 space-y-6">
                    <Card className="border-slate-200">
                        <CardHeader>
                            <CardTitle className="text-lg">Submission Info</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                    <User className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-900">{result.student_name}</p>
                                    <p className="text-xs text-slate-500">ID: {result.student}</p>
                                </div>
                            </div>
                            <div className="space-y-3 pt-4 border-t border-slate-100">
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2 text-slate-500">
                                        <BookOpen className="h-4 w-4" /> Assessment
                                    </div>
                                    <span className="font-medium">{result.assessment_title}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2 text-slate-500">
                                        <Calendar className="h-4 w-4" /> Submitted
                                    </div>
                                    <span className="font-medium">{new Date(result.submitted_at).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2 text-slate-500">
                                        <Clock className="h-4 w-4" /> Time Taken
                                    </div>
                                    <span className="font-medium font-mono">{result.time_taken_minutes}m</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 bg-slate-50/50">
                        <CardHeader>
                            <CardTitle className="text-lg text-indigo-900">Grading</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="score">Current Score</Label>
                                <div className="flex items-center gap-3">
                                    <Input
                                        id="score"
                                        type="number"
                                        value={score}
                                        onChange={(e) => setScore(e.target.value)}
                                        className="text-lg font-bold bg-white"
                                    />
                                    <span className="text-slate-400 font-medium">Points</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="feedback">Teacher Feedback</Label>
                                <Textarea
                                    id="feedback"
                                    placeholder="Write your constructive feedback here..."
                                    rows={5}
                                    value={feedback}
                                    onChange={(e) => setFeedback(e.target.value)}
                                    className="bg-white"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Column: Answer Breakdown & AI Analysis */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Answer Breakdown */}
                    <Card className="border-slate-200">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-emerald-500" /> Answer Breakdown
                            </CardTitle>
                            <CardDescription>Question-by-question performance analysis</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {result.answers_data && Object.entries(result.answers_data as Record<string, any>).map(([qId, data], index) => (
                                <div key={qId} className="p-4 rounded-xl border border-slate-100 bg-slate-50/30 flex items-start gap-4">
                                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-600 mt-1 shrink-0">
                                        {index + 1}
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-slate-800">Question ID: {qId}</p>
                                            <Badge variant={data.correct ? "secondary" : "outline"} className={data.correct ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-red-50 text-red-600 border-red-100"}>
                                                {data.points_earned} / {data.max_points} pts
                                            </Badge>
                                        </div>
                                        <div className="text-sm">
                                            <span className="text-slate-500 mr-2">Student Answer:</span>
                                            <span className="font-medium font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-xs">
                                                {String(data.answer || 'No answer')}
                                            </span>
                                        </div>
                                        {data.ai_feedback && (
                                            <div className="text-xs text-indigo-600 bg-indigo-50/50 p-2 rounded-lg border border-indigo-100/50 italic">
                                                <strong>AI Critique:</strong> {data.ai_feedback}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {(!result.answers_data || Object.keys(result.answers_data).length === 0) && (
                                <div className="text-center py-8 text-slate-400">
                                    <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                    No detailed answer data available for this submission.
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* AI Feedback Section */}
                    {result.ai_feedback && (
                        <Card className="border-indigo-100 bg-indigo-50/30 overflow-hidden">
                            <CardHeader className="bg-indigo-50/50 border-b border-indigo-100">
                                <CardTitle className="text-indigo-900 flex items-center gap-2">
                                    <Sparkles className="h-5 w-5" /> AI Insight & Feedback
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 prose prose-indigo max-w-none prose-sm">
                                {result.ai_feedback.split('\n').map((para, i) => (
                                    <p key={i} className="text-indigo-800">{para}</p>
                                ))}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
