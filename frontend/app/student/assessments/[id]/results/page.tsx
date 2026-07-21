// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
    Trophy, CheckCircle2, XCircle, Info,
    ChevronLeft, RefreshCw, BarChart3, MessageSquare,
    Zap, Target, Award, ClipboardList, BrainCircuit
} from 'lucide-react';
import { academicAPI, Result, Assessment } from '@/lib/api';
import confetti from 'canvas-confetti';
import { useTranslation } from '@/lib/localization';
import { formatNumber, formatDate } from '@/lib/i18n/format';

export default function AssessmentResultsPage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const { t, locale } = useTranslation();
    const assessmentId = params.id as string;
    const resultId = searchParams.get('result_id');

    const [loading, setLoading] = useState(true);
    const [result, setResult] = useState<Result | null>(null);
    const [assessment, setAssessment] = useState<Assessment | null>(null);

    useEffect(() => {
        async function loadResults() {
            if (!resultId) return;
            try {
                const [resultData, assessmentData] = await Promise.all([
                    academicAPI.getResult(resultId),
                    academicAPI.getAssessment(assessmentId)
                ]);
                setResult(resultData);
                setAssessment(assessmentData);
                setLoading(false);

                // Celebrate if passing
                const percentage = (resultData.score / assessmentData.total_marks) * 100;
                if (percentage >= 50) {
                    confetti({
                        particleCount: 150,
                        spread: 70,
                        origin: { y: 0.6 },
                        colors: ['#6366f1', '#10b981', '#f59e0b']
                    });
                }
            } catch (error) {
                console.error('Failed to load results', error);
                setLoading(false);
            }
        }
        loadResults();
    }, [resultId, assessmentId]);

    if (loading) return <div className="p-8 text-center text-slate-400">{t('student.assessmentResults.loading')}</div>;
    if (!result || !assessment) return <div className="p-8 text-center text-slate-400">{t('student.assessmentResults.notFound')}</div>;

    const percentage = Math.round((result.score / assessment.total_marks) * 100);
    const isPassing = percentage >= assessment.passing_marks;

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 space-y-8 animate-in zoom-in-95 duration-500">
            {/* Summary Hero */}
            <div className={`p-8 rounded-3xl border text-white relative overflow-hidden ${isPassing ? 'bg-indigo-600 border-indigo-500 shadow-indigo-200' : 'bg-slate-800 border-slate-700'} shadow-2xl`}>
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Trophy className="h-48 w-48" />
                </div>

                <div className="relative z-10 space-y-6">
                    <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="bg-white/20 text-white border-none backdrop-blur-md">
                            {assessment.type.toUpperCase()} {t('student.assessmentResults.badgeCompleted')}
                        </Badge>
                        <div className="text-white/60 text-sm font-medium">
                            {result.submitted_at ? formatDate(new Date(result.submitted_at), locale) : ''}
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="space-y-2">
                            <h1 className="text-3xl md:text-5xl font-black">{assessment.title}</h1>
                            <p className="text-white/80 text-lg">{t('student.assessmentResults.heroSubtitle')}</p>
                        </div>
                        <div className="flex flex-col items-center bg-white/10 backdrop-blur-xl p-6 rounded-2xl border border-white/20">
                            <div className="text-5xl font-black tabular-nums">{percentage}%</div>
                            <div className="text-xs font-bold uppercase tracking-tighter text-white/60 mt-1">{t('student.assessmentResults.accuracyScore')}</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                                <Award className="h-5 w-5" />
                            </div>
                            <div>
                                <div className="text-xl font-bold">{formatNumber(result.score, locale)} / {formatNumber(assessment.total_marks, locale)}</div>
                                <div className="text-[10px] uppercase text-white/60 font-medium">{t('student.assessmentResults.totalMarksEarned')}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                                <Zap className="h-5 w-5" />
                            </div>
                            <div>
                                <div className="text-xl font-bold">+{formatNumber(Math.floor(result.score * 1.5), locale)} XP</div>
                                <div className="text-[10px] uppercase text-white/60 font-medium">{t('student.assessmentResults.rewardsEarned')}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                                <Target className="h-5 w-5" />
                            </div>
                            <div>
                                <div className="text-xl font-bold">{formatNumber(result.time_taken_minutes, locale)} min</div>
                                <div className="text-[10px] uppercase text-white/60 font-medium">{t('student.assessmentResults.timeTaken')}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Performance Analysis */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* AI Insights */}
                <Card className="md:col-span-2 border-slate-200 shadow-sm overflow-hidden">
                    <CardHeader className="bg-indigo-50/50 border-b border-indigo-100">
                        <CardTitle className="text-lg flex items-center gap-2 text-indigo-900 font-bold">
                            <BrainCircuit className="h-4 w-4 text-indigo-600" /> {t('student.assessmentResults.aiAnalysisTitle')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                        <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 italic text-indigo-900 leading-relaxed relative">
                            <MessageSquare className="absolute -top-3 -left-3 h-8 w-8 text-indigo-200" />
                            &quot;{result.ai_feedback || "You showed strong grasp of concepts. Focus on improving accuracy in descriptive questions for even better results next time!"}&quot;
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                <BarChart3 className="h-4 w-4" /> {t('student.assessmentResults.masteryByTopic')}
                            </h4>
                            <div className="space-y-4">
                                {['Core Concepts', 'Problem Solving', 'Theory', 'Practical Application'].map((topic, i) => (
                                    <div key={topic} className="space-y-1.5">
                                        <div className="flex justify-between text-xs font-medium">
                                            <span className="text-slate-600">{topic}</span>
                                            <span className="text-slate-900">{85 - (i * 10)}%</span>
                                        </div>
                                        <Progress value={85 - (i * 10)} className="h-1.5 bg-slate-100" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Right Actions */}
                <div className="space-y-6">
                    <Card className="border-slate-200 shadow-sm bg-slate-50/50">
                        <CardHeader>
                            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">{t('student.assessmentResults.quickLinks')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Button className="w-full bg-white text-slate-900 border-border hover:bg-slate-50 shadow-sm" variant="outline" onClick={() => window.scrollTo({ top: 800, behavior: 'smooth' })}>
                                <ClipboardList className="mr-2 h-4 w-4" /> {t('student.assessmentResults.reviewAnswers')}
                            </Button>
                            <Button className="w-full bg-white text-slate-900 border-border hover:bg-slate-50 shadow-sm" variant="outline">
                                <Info className="mr-2 h-4 w-4" /> {t('student.assessmentResults.studyPlan')}
                            </Button>
                            <Button className="w-full bg-indigo-600 hover:bg-indigo-700" onClick={() => router.push('/student/assessments')}>
                                {t('student.assessmentResults.assessmentsHub')}
                            </Button>
                        </CardContent>
                    </Card>

                    <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100 flex flex-col items-center text-center space-y-4">
                        <div className="h-16 w-16 bg-emerald-100 rounded-full flex items-center justify-center">
                            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                        </div>
                        <div className="space-y-1">
                            <h4 className="font-bold text-emerald-900">{t('student.assessmentResults.requirementMet')}</h4>
                            <p className="text-xs text-emerald-700">{t('student.assessmentResults.requirementMetDesc')}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Question Breakdown */}
            <div className="space-y-6 pt-8">
                <h3 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <ClipboardList className="h-6 w-6 text-indigo-600" /> {t('student.assessmentResults.detailedAnswerReview')}
                </h3>

                <div className="grid grid-cols-1 gap-6">
                    {assessment.questions?.map((q, idx) => {
                        const answerInfo = result.answers_data?.[q.question_id || q.id];
                        const isCorrect = answerInfo?.correct;

                        return (
                            <Card key={q.id} className={`border-l-4 ${isCorrect ? 'border-l-emerald-500' : 'border-l-red-500'} shadow-sm bg-white overflow-hidden`}>
                                <CardHeader className="pb-3 border-b bg-slate-50/30">
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="flex gap-3">
                                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-600">
                                                {idx + 1}
                                            </span>
                                            <div className="space-y-1">
                                                <CardTitle className="text-base font-bold text-slate-800 leading-snug">{q.text}</CardTitle>
                                                <Badge variant="outline" className="text-[10px] uppercase font-bold text-slate-400 border-slate-200 bg-white">
                                                    {q.type.replace('_', ' ')}
                                                </Badge>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className={`text-lg font-black ${isCorrect ? 'text-emerald-600' : 'text-red-600'}`}>
                                                {answerInfo?.points_earned || 0} / {q.points}
                                            </div>
                                            <div className="text-[10px] uppercase font-bold text-slate-400">{t('student.assessmentResults.scoreLabel')}</div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-5 space-y-5">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{t('student.assessmentResults.yourResponse')}</p>
                                            <p className={`text-sm font-semibold ${isCorrect ? 'text-emerald-700' : 'text-slate-800'}`}>
                                                {answerInfo?.answer || t('student.assessmentResults.noAnswerProvided')}
                                            </p>
                                        </div>
                                        {!isCorrect && q.correct_answer && (
                                            <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 space-y-2">
                                                <p className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">{t('student.assessmentResults.correctSolution')}</p>
                                                <p className="text-sm font-semibold text-indigo-900">{q.correct_answer}</p>
                                            </div>
                                        )}
                                    </div>

                                    {answerInfo?.ai_feedback && (
                                        <div className="p-4 bg-indigo-600/5 rounded-xl border border-indigo-100 flex items-start gap-3">
                                            <BrainCircuit className="h-5 w-5 text-indigo-600 mt-0.5 shrink-0" />
                                            <div className="space-y-1">
                                                <p className="text-[10px] uppercase font-black text-indigo-600 tracking-tight">{t('student.assessmentResults.aiInsightsLabel')}</p>
                                                <p className="text-sm text-slate-700 italic leading-relaxed">{answerInfo.ai_feedback}</p>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>

            <div className="flex justify-center pt-8 border-t border-slate-100">
                <Button variant="ghost" onClick={() => router.back()} className="text-slate-500 gap-2">
                    <ChevronLeft className="h-4 w-4" /> {t('student.assessmentResults.backToList')}
                </Button>
            </div>
        </div>
    );
}
