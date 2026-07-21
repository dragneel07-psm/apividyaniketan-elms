// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Clock, Calendar, CheckCircle, BrainCircuit, ArrowRight, TrendingUp
} from 'lucide-react';
import { academicAPI, Assessment, Result, Subject } from '@/lib/api';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
    RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { SafeResponsiveContainer } from '@/components/ui/safe-responsive-container';
import Link from 'next/link';
import { ResultList } from '@/components/student/ResultList';
import { useTranslation } from '@/lib/localization';
import { formatNumber } from '@/lib/i18n/format';

function toList<T>(payload: unknown): T[] {
    if (Array.isArray(payload)) return payload as T[];
    if (payload && typeof payload === 'object' && Array.isArray((payload as any).results)) {
        return (payload as any).results as T[];
    }
    return [];
}

export default function AssessmentDashboard() {
    const { t, locale } = useTranslation();
    const [loading, setLoading] = useState(true);

    type ResultWithDetails = Result & {
        assessmentDetails?: Assessment;
        subjectDetails?: Subject;
        percentage?: number;
    };

    const [results, setResults] = useState<ResultWithDetails[]>([]);
    const [upcomingTests, setUpcomingTests] = useState<Assessment[]>([]);
    const [trendData, setTrendData] = useState<Array<{ name: string; score: number; avg: number }>>([]);
    const [skillData, setSkillData] = useState<Array<{ subject: string; A: number; fullMark: number }>>([]);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const [myStudent, allAssessmentsRaw, allResultsRaw, allSubjectsRaw] = await Promise.all([
                academicAPI.getMyStudent(),
                academicAPI.getAssessments(),
                academicAPI.getResults().catch(() => []),
                academicAPI.getSubjects().catch(() => []),
            ]);

            const allAssessments = toList<Assessment>(allAssessmentsRaw);
            const allResults = toList<Result>(allResultsRaw);
            const allSubjects = toList<Subject>(allSubjectsRaw);

            const assessmentMap = new Map(allAssessments.map((assessment) => [String(assessment.assessment_id), assessment]));
            const subjectMap = new Map(allSubjects.map((subject) => [Number(subject.id), subject]));

            const myResults = allResults.filter((result) => String(result.student) === String(myStudent.id));
            const enrichedResults = myResults.map((result) => {
                const assessmentDetails = assessmentMap.get(String(result.assessment));
                const subjectDetails = assessmentDetails ? subjectMap.get(Number(assessmentDetails.subject)) : undefined;
                const totalMarks = Number(assessmentDetails?.total_marks || 0);
                const percentage = totalMarks > 0
                    ? Math.round((Number(result.score || 0) / totalMarks) * 100)
                    : Number(result.score || 0);
                return {
                    ...result,
                    assessmentDetails,
                    subjectDetails,
                    percentage,
                };
            }).sort((a, b) => new Date(b.submitted_at || '').getTime() - new Date(a.submitted_at || '').getTime());

            setResults(enrichedResults);

            const attempted = new Set(enrichedResults.map((result) => String(result.assessment)));
            const upcoming = allAssessments
                .filter((assessment) => !attempted.has(String(assessment.assessment_id)))
                .filter((assessment) => !assessment.due_date || new Date(assessment.due_date) >= new Date())
                .sort((a, b) => new Date(a.due_date || '').getTime() - new Date(b.due_date || '').getTime());
            setUpcomingTests(upcoming);

            const assessmentAverageMap = new Map<string, number>();
            allAssessments.forEach((assessment) => {
                const totalMarks = Number(assessment.total_marks || 0);
                if (!totalMarks) return;
                const cohort = allResults.filter((result) => String(result.assessment) === String(assessment.assessment_id));
                if (cohort.length === 0) return;
                const avg = cohort.reduce((sum, result) => sum + ((Number(result.score || 0) / totalMarks) * 100), 0) / cohort.length;
                assessmentAverageMap.set(String(assessment.assessment_id), Math.round(avg));
            });

            const trend = [...enrichedResults]
                .reverse()
                .slice(-6)
                .map((result) => ({
                    name: result.assessmentDetails?.title?.slice(0, 14) || 'Assessment',
                    score: result.percentage || 0,
                    avg: assessmentAverageMap.get(String(result.assessment)) || 0,
                }));
            setTrendData(trend);

            const bloomsGroups = new Map<string, number[]>();
            enrichedResults.forEach((result) => {
                const blooms = result.assessmentDetails?.blooms_level || 'general';
                const label = blooms.charAt(0).toUpperCase() + blooms.slice(1);
                const bucket = bloomsGroups.get(label) || [];
                bucket.push(result.percentage || 0);
                bloomsGroups.set(label, bucket);
            });
            const skill = Array.from(bloomsGroups.entries()).map(([subject, scores]) => ({
                subject,
                A: Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length),
                fullMark: 100,
            }));
            setSkillData(skill.slice(0, 6));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) return <div className="p-8">{t('student.assessments.loading')}</div>;

    return (
        <div className="space-y-8 p-8 max-w-7xl mx-auto bg-gray-50/50 min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">{t('student.assessments.pageTitle')}</h1>
                    <p className="text-muted-foreground mt-1">{t('student.assessments.subtitle')}</p>
                </div>
            </div>

            <div>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-indigo-600" />
                    {t('student.assessments.upcomingAssessments')}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {upcomingTests.length > 0 ? upcomingTests.slice(0, 3).map((test) => (
                        <Card key={test.assessment_id} className="border-l-4 border-l-indigo-500 hover:shadow-md transition-shadow">
                            <CardContent className="p-5">
                                <div className="flex justify-between items-start mb-2">
                                    <Badge variant="secondary" className="uppercase text-xs font-bold">{test.type}</Badge>
                                    <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                                        <Clock className="h-3 w-3" /> {test.duration_minutes || 60} mins
                                    </span>
                                </div>
                                <h3 className="font-bold text-lg mb-1">{test.title}</h3>
                                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{test.description || t('student.assessments.noDescription')}</p>
                                <div className="flex items-center justify-between mt-auto">
                                    <span className="text-xs font-medium bg-indigo-50 text-indigo-700 px-2 py-1 rounded">{formatNumber(Number(test.total_marks), locale)} {t('student.assessments.marks')}</span>
                                    <Link href={test.type === 'assignment' ? `/student/assignments/${test.assessment_id}` : `/student/quizzes/${test.assessment_id}`}>
                                        <Button size="sm" className="gap-1">{t('student.assessments.start')} <ArrowRight className="h-3 w-3" /></Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    )) : (
                        <div className="col-span-3 p-8 text-center bg-white rounded-lg border border-dashed">
                            <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                            <p className="text-muted-foreground">{t('student.assessments.allCaughtUp')}</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-green-600" /> {t('student.assessments.performanceTrend')}</CardTitle>
                            <CardDescription>{t('student.assessments.performanceTrendDesc')}</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            {trendData.length > 0 ? (
                                <SafeResponsiveContainer width="100%" height="100%">
                                    <LineChart data={trendData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                        <YAxis axisLine={false} tickLine={false} domain={[0, 100]} />
                                        <RechartsTooltip />
                                        <Line type="monotone" dataKey="score" stroke="#4f46e5" strokeWidth={3} activeDot={{ r: 8 }} name={t('student.assessments.yourScore')} />
                                        <Line type="monotone" dataKey="avg" stroke="#94a3b8" strokeDasharray="5 5" name={t('student.assessments.classAvg')} />
                                    </LineChart>
                                </SafeResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-slate-500">{t('student.assessments.notEnoughResults')}</div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>{t('student.assessments.recentResults')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <ResultList results={results} />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('student.assessments.skillBreakdown')}</CardTitle>
                            <CardDescription>{t('student.assessments.skillBreakdownDesc')}</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            {skillData.length > 0 ? (
                                <SafeResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={skillData}>
                                        <PolarGrid />
                                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                        <Radar name="Student" dataKey="A" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                                    </RadarChart>
                                </SafeResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-slate-500">{t('student.assessments.noSkillData')}</div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-indigo-50 to-white">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-indigo-900"><BrainCircuit className="h-5 w-5 text-indigo-600" /> {t('student.assessments.aiInsight')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-indigo-800 leading-relaxed mb-4">
                                &ldquo;{t('student.assessments.aiInsightText')}&rdquo;
                            </p>
                            <Button variant="outline" className="w-full text-indigo-700 border-indigo-200 hover:bg-indigo-50">{t('student.assessments.viewDetailedReport')}</Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
