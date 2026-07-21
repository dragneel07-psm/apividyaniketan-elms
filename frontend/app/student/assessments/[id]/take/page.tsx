// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
    Clock, ChevronLeft, ChevronRight, Send,
    AlertCircle, Save, Info
} from 'lucide-react';
import { useGamification } from '@/components/providers/gamification-provider';
import { academicAPI, Assessment, Question } from '@/lib/api';
import { useTranslation } from '@/lib/localization';
import { formatNumber } from '@/lib/i18n/format';

export default function TakeAssessmentPage() {
    const router = useRouter();
    const params = useParams();
    const assessmentId = params.id as string;
    const { awardXP } = useGamification();
    const { t, locale } = useTranslation();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [assessment, setAssessment] = useState<Assessment | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);

    // Quiz State
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [timeLeft, setTimeLeft] = useState(0); // in seconds
    const [startTime] = useState(Date.now());
    // Ref guard wins the race between manual submit and auto-submit timer.
    const submittedRef = useRef(false);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [assessmentData, questionsData] = await Promise.all([
                    academicAPI.getAssessment(assessmentId),
                    academicAPI.getQuestionsByAssessment(assessmentId)
                ]);
                setAssessment(assessmentData);
                setQuestions(questionsData);
                setTimeLeft(assessmentData.duration_minutes * 60);
            } catch (error) {
                console.error("Failed to load assessment", error);
                toast.error(t('student.assessmentTake.errorLoad'));
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [assessmentId]);

    // Timer
    useEffect(() => {
        if (!loading && timeLeft > 0) {
            const timer = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        submitAssessment(); // Auto submit
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [loading, timeLeft]);

    const handleAnswerChange = (questionId: string, value: any) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
    };

    const submitAssessment = async () => {
        if (submittedRef.current) return;
        submittedRef.current = true;
        setSubmitting(true);

        try {
            const timeTaken = Math.floor((Date.now() - startTime) / 60000); // minutes
            const res = await academicAPI.submitExam(assessmentId, answers, timeTaken);

            // Calculate XP based on score (e.g., 10 XP per point) or flat bonus
            const earnedXP = res.score ? res.score * 10 : 100;
            awardXP(earnedXP, `Assessment Completed`);

            toast.success(`Assessment submitted! Score: ${res.score}/${res.max_score}`);
            router.push(`/student/assessments/${assessmentId}/results?result_id=${res.result_id}`);
        } catch (error) {
            console.error('Submission failed', error);
            toast.error(t('student.assessmentTake.errorSubmit'));
            submittedRef.current = false;
            setSubmitting(false);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (loading) return <div className="p-8 text-center text-slate-400">{t('student.assessmentTake.loading')}</div>;
    if (!assessment) return <div className="p-8 text-center text-red-400">{t('student.assessmentTake.notFound')}</div>;
    if (questions.length === 0) return <div className="p-8 text-center text-slate-400">{t('student.assessmentTake.noQuestions')}</div>;

    const currentQuestion = questions[currentIndex];
    const progress = ((currentIndex + 1) / questions.length) * 100;
    const isLastQuestion = currentIndex === questions.length - 1;

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
            {/* Header / Timer */}
            <div className="flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10 py-4 border-b border-slate-100">
                <div className="space-y-1">
                    <h1 className="text-xl font-bold text-slate-900">{assessment.title}</h1>
                    <div className="flex items-center gap-3 text-sm">
                        <Badge variant="outline" className="text-slate-500">{assessment.type.toUpperCase()}</Badge>
                        <span className="text-slate-400">|</span>
                        <span className="text-slate-500 font-medium">{t('student.assessmentTake.questionOf', { current: formatNumber(currentIndex + 1, locale), total: formatNumber(questions.length, locale) })}</span>
                    </div>
                </div>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${timeLeft < 300 ? 'bg-red-50 border-red-100 text-red-600 animate-pulse' : 'bg-indigo-50 border-indigo-100 text-indigo-600'}`}>
                    <Clock className="h-4 w-4" />
                    <span className="font-mono font-bold text-lg">{formatTime(timeLeft)}</span>
                </div>
            </div>

            <Progress value={progress} className="h-2 bg-slate-100" />

            {/* Question Area */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="md:col-span-3 space-y-6">
                    <Card className="border-slate-200 shadow-sm min-h-[400px] flex flex-col">
                        <CardHeader className="pb-4">
                            <div className="flex items-center justify-between">
                                <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-none">
                                    {t('student.assessmentTake.pointsBadge', { points: formatNumber(currentQuestion.points, locale) })}
                                </Badge>
                                <span className="text-xs text-slate-400 uppercase tracking-wider">{currentQuestion.type.replace('_', ' ')}</span>
                            </div>
                            <CardTitle className="text-xl pt-4 font-semibold text-slate-800 leading-relaxed">
                                {currentQuestion.text}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1">
                            {currentQuestion.type === 'mcq' && (
                                <RadioGroup
                                    value={answers[currentQuestion.question_id] || ''}
                                    onValueChange={(val) => handleAnswerChange(currentQuestion.question_id, val)}
                                    className="space-y-4 pt-4"
                                >
                                    {currentQuestion.options.map((option, idx) => (
                                        <Label
                                            key={idx}
                                            className={`flex items-center space-x-3 p-4 rounded-xl border cursor-pointer transition-all ${answers[currentQuestion.question_id] === option ? 'border-indigo-500 bg-indigo-50/50 ring-1 ring-indigo-500' : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'}`}
                                        >
                                            <RadioGroupItem value={option} id={`q${currentQuestion.question_id}-opt${idx}`} />
                                            <span className="text-slate-700">{option}</span>
                                        </Label>
                                    ))}
                                </RadioGroup>
                            )}

                            {(currentQuestion.type === 'short_answer' || currentQuestion.type === 'long_answer' || currentQuestion.type === 'code') && (
                                <div className="pt-4 space-y-2">
                                    <Label className="text-slate-500">{t('student.assessmentTake.labelYourAnswer')}</Label>
                                    <Textarea
                                        placeholder={t('student.assessmentTake.placeholderAnswer')}
                                        className={`min-h-[200px] text-base ${currentQuestion.type === 'code' ? 'font-mono bg-slate-900 text-slate-100 focus:bg-slate-900' : ''}`}
                                        value={answers[currentQuestion.question_id] || ''}
                                        onChange={(e) => handleAnswerChange(currentQuestion.question_id, e.target.value)}
                                    />
                                    {currentQuestion.type === 'code' && (
                                        <p className="text-[10px] text-slate-400 flex items-center gap-1">
                                            <Info className="h-3 w-3" /> {t('student.assessmentTake.syntaxHint')}
                                        </p>
                                    )}
                                </div>
                            )}
                        </CardContent>
                        <CardFooter className="border-t border-slate-50 flex items-center justify-between p-6">
                            <Button
                                variant="ghost"
                                size="lg"
                                onClick={() => setCurrentIndex(prev => prev - 1)}
                                disabled={currentIndex === 0}
                                className="text-slate-500"
                            >
                                <ChevronLeft className="mr-2 h-4 w-4" /> {t('student.assessmentTake.btnPrevious')}
                            </Button>

                            {isLastQuestion ? (
                                <Button
                                    size="lg"
                                    className="bg-emerald-600 hover:bg-emerald-700 min-w-[140px]"
                                    onClick={submitAssessment}
                                    disabled={submitting}
                                >
                                    {submitting ? t('student.assessmentTake.submitting') : (
                                        <>
                                            {t('student.assessmentTake.btnSubmitQuiz')} <Send className="ml-2 h-4 w-4" />
                                        </>
                                    )}
                                </Button>
                            ) : (
                                <Button
                                    size="lg"
                                    onClick={() => setCurrentIndex(prev => prev + 1)}
                                    className="bg-indigo-600 hover:bg-indigo-700 min-w-[140px]"
                                >
                                    {t('student.assessmentTake.btnNextQuestion')} <ChevronRight className="ml-2 h-4 w-4" />
                                </Button>
                            )}
                        </CardFooter>
                    </Card>
                </div>

                {/* Question Navigator */}
                <div className="md:col-span-1 space-y-6">
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">{t('student.assessmentTake.navigatorTitle')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-4 gap-2">
                                {questions.map((q, idx) => (
                                    <Button
                                        key={idx}
                                        variant={currentIndex === idx ? 'default' : answers[q.question_id] ? 'secondary' : 'outline'}
                                        size="sm"
                                        className={`h-10 w-10 p-0 rounded-lg ${currentIndex === idx ? 'bg-indigo-600' : answers[q.question_id] ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'text-slate-400'}`}
                                        onClick={() => setCurrentIndex(idx)}
                                    >
                                        {idx + 1}
                                    </Button>
                                ))}
                            </div>
                            <div className="mt-6 space-y-2">
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <div className="h-3 w-3 rounded-sm bg-indigo-600"></div>
                                    {t('student.assessmentTake.legendCurrent')}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <div className="h-3 w-3 rounded-sm bg-indigo-50 border border-indigo-100"></div>
                                    {t('student.assessmentTake.legendAnswered')}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <div className="h-3 w-3 rounded-sm border border-slate-200"></div>
                                    {t('student.assessmentTake.legendRemaining')}
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-0">
                            <Button variant="ghost" className="w-full text-xs text-slate-400 group hover:text-indigo-600" onClick={() => toast.success(t('student.assessmentTake.draftSaved'))}>
                                <Save className="h-3 w-3 mr-2 group-hover:animate-bounce" /> {t('student.assessmentTake.saveDraft')}
                            </Button>
                        </CardFooter>
                    </Card>

                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
                        <div className="space-y-1">
                            <h4 className="text-sm font-bold text-amber-800">{t('student.assessmentTake.proctoringTitle')}</h4>
                            <p className="text-xs text-amber-700 leading-relaxed">{t('student.assessmentTake.proctoringDesc')}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
