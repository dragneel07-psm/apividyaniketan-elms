// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { academicAPI, Subject, Assessment, Result, Student } from '@/lib/api';
import { BarChart3, TrendingUp, Presentation, Lightbulb, Users, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

function toList<T>(payload: unknown): T[] {
    if (Array.isArray(payload)) return payload as T[];
    if (payload && typeof payload === 'object' && Array.isArray((payload as any).results)) {
        return (payload as any).results as T[];
    }
    return [];
}

export default function CourseAnalyticsPage() {
    const params = useParams();
    const courseId = params.courseId as string;

    const [subject, setSubject] = useState<Subject | null>(null);
    const [loading, setLoading] = useState(true);
    const [analytics, setAnalytics] = useState({
        avgScore: 0,
        passRate: 0,
        totalAssessments: 0,
        insights: [] as string[],
        assessmentPerformance: [] as { title: string; score: number }[],
    });

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [subjectData, assessmentsRaw, resultsRaw, studentsRaw] = await Promise.all([
                academicAPI.getSubject(parseInt(courseId)),
                academicAPI.getAssessments().catch(() => []),
                academicAPI.getResults().catch(() => []),
                academicAPI.getStudents().catch(() => []),
            ]);

            const allAssessments = toList<Assessment>(assessmentsRaw);
            const allResults = toList<Result>(resultsRaw);
            const allStudents = toList<Student>(studentsRaw);

            setSubject(subjectData);

            // Filter for current subject/course
            const courseAssessments = allAssessments.filter(
                (a) => Number(a.subject) === Number(subjectData.id)
            );
            
            const assessmentIds = new Set(courseAssessments.map(a => String(a.assessment_id)));
            const courseResults = allResults.filter(r => assessmentIds.has(String(r.assessment)));

            // Calculate overall averages
            let totalPercentage = 0;
            let passingResults = 0;
            let validResultsCount = 0;

            const assessmentPerformanceMap = new Map<string, { totalScore: number, maxScore: number, count: number, title: string }>();

            courseAssessments.forEach(a => {
                assessmentPerformanceMap.set(String(a.assessment_id), {
                    totalScore: 0,
                    maxScore: Number(a.total_marks || 100),
                    count: 0,
                    title: a.title || 'Untitled Assessment'
                });
            });

            courseResults.forEach(r => {
                const assessmentData = assessmentPerformanceMap.get(String(r.assessment));
                if (assessmentData && r.score !== undefined && r.score !== null) {
                    const score = Number(r.score);
                    const percentage = (score / assessmentData.maxScore) * 100;
                    
                    totalPercentage += percentage;
                    validResultsCount++;
                    
                    if (percentage >= 40) { // Assuming 40% is pass threshold
                        passingResults++;
                    }

                    assessmentData.totalScore += score;
                    assessmentData.count++;
                }
            });

            const avgScore = validResultsCount > 0 ? Math.round(totalPercentage / validResultsCount) : 0;
            const passRate = validResultsCount > 0 ? Math.round((passingResults / validResultsCount) * 100) : 0;

            // Generate assessment performance array for charts
            const assessmentPerformance = Array.from(assessmentPerformanceMap.values())
                .filter(data => data.count > 0)
                .map(data => ({
                    title: data.title,
                    score: Math.round((data.totalScore / (data.maxScore * data.count)) * 100)
                }));

            // Generate AI-like insights
            const insights: string[] = [];
            if (avgScore > 75) {
                insights.push("The class is performing exceptionally well overall. Consider introducing advanced or bonus materials.");
            } else if (avgScore > 50) {
                insights.push("Performance is steady, but there's room for improvement in recent modules.");
            } else if (validResultsCount > 0) {
                insights.push("Warning: Class average is below expected targets. Immediate remedial sessions are recommended.");
            }

            if (courseAssessments.length === 0) {
                insights.push("No assessments have been published yet. Create an assessment to gather analytics.");
            }

            if (passRate < 60 && validResultsCount > 0) {
                insights.push("The current pass rate is concerning. A significant portion of the class may be struggling with the baseline curriculum.");
            }

            setAnalytics({
                avgScore,
                passRate,
                totalAssessments: courseAssessments.length,
                insights,
                assessmentPerformance,
            });

        } catch (error) {
            console.error('Failed to load analytics', error);
        } finally {
            setLoading(false);
        }
    }, [courseId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-6 animate-in fade-in duration-500">
            <div className="mb-8 flex flex-col justify-between items-start md:flex-row md:items-end gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 mb-2">Performance Analytics</h2>
                    <p className="text-slate-500">Data-driven performance insights for {subject?.name}</p>
                </div>
            </div>

            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card className="border-none shadow-sm bg-indigo-50/50">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-indigo-600 font-bold uppercase text-[10px] tracking-widest flex items-center gap-1">
                            <Target className="h-3 w-3"/> Class Average
                        </CardDescription>
                        <CardTitle className="text-3xl font-black text-slate-900">{analytics.avgScore}%</CardTitle>
                    </CardHeader>
                </Card>
                <Card className="border-none shadow-sm bg-emerald-50/50">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-emerald-600 font-bold uppercase text-[10px] tracking-widest flex items-center gap-1">
                            <TrendingUp className="h-3 w-3"/> Pass Rate
                        </CardDescription>
                        <CardTitle className="text-3xl font-black text-slate-900">{analytics.passRate}%</CardTitle>
                    </CardHeader>
                </Card>
                <Card className="border-none shadow-sm bg-purple-50/50">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-purple-600 font-bold uppercase text-[10px] tracking-widest flex items-center gap-1">
                            <Presentation className="h-3 w-3"/> Total Assessments
                        </CardDescription>
                        <CardTitle className="text-3xl font-black text-slate-900">{analytics.totalAssessments}</CardTitle>
                    </CardHeader>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Insights Panel */}
                <Card className="lg:col-span-1 shadow-lg border-slate-100 flex flex-col">
                    <CardHeader className="border-b bg-slate-50/50 pb-4">
                        <div className="flex items-center gap-2">
                            <Lightbulb className="h-5 w-5 text-amber-500" />
                            <CardTitle className="text-lg">AI Insights</CardTitle>
                        </div>
                        <CardDescription>Automated interpretations of class progress</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 p-6 space-y-4">
                        {analytics.insights.length === 0 ? (
                            <p className="text-slate-500 text-sm">Not enough data to generate insights yet.</p>
                        ) : (
                            analytics.insights.map((insight, idx) => (
                                <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-sm text-slate-700 leading-relaxed">
                                    <span className="font-bold text-slate-900 mr-2">Observation:</span>
                                    {insight}
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

                {/* Assessment Chart Area */}
                <Card className="lg:col-span-2 shadow-lg border-slate-100">
                    <CardHeader className="border-b bg-slate-50/50 pb-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-lg">Assessment Averages</CardTitle>
                                <CardDescription>Score progression across class tests</CardDescription>
                            </div>
                            <BarChart3 className="h-5 w-5 text-slate-400" />
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        {analytics.assessmentPerformance.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-slate-400 p-8 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                                <BarChart3 className="h-10 w-10 mb-2 opacity-50" />
                                <p>No completed assessments available to chart.</p>
                            </div>
                        ) : (
                            <div className="space-y-6 pt-2">
                                {analytics.assessmentPerformance.map((item, idx) => (
                                    <div key={idx}>
                                        <div className="flex justify-between items-end mb-2">
                                            <span className="text-sm font-bold text-slate-700">{item.title}</span>
                                            <span className="text-xs font-bold text-slate-500">{item.score}% AVG</span>
                                        </div>
                                        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full rounded-full ${
                                                    item.score >= 70 ? 'bg-emerald-500' :
                                                    item.score >= 40 ? 'bg-amber-500' :
                                                    'bg-rose-500'
                                                }`}
                                                style={{ width: `${item.score}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
