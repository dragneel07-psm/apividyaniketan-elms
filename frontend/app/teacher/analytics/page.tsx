// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
    TrendingUp, Users, AlertTriangle,
    CheckCircle2, ChevronRight, BarChart3,
    Calendar, BrainCircuit, Sparkles, Lock, Loader2
} from 'lucide-react';
import { aiAPI, academicAPI, usersAPI, Subject } from '@/lib/api';
import {
    BarChart, Bar, XAxis, YAxis,
    CartesianGrid, Tooltip, LineChart, Line, AreaChart, Area
} from 'recharts';
import { SafeResponsiveContainer } from '@/components/ui/safe-responsive-container';
import { toast } from 'sonner';

interface IndividualReport {
    student_name?: string;
    metrics?: {
        avg_score?: number;
        attendance?: number;
        streak?: number;
        focus?: number;
        class?: string;
        mastery?: Array<{ subject: string; score: number }>;
    };
    ai_report?: {
        summary?: string;
        strengths?: string[];
        weaknesses?: string[];
        recommendations?: string[];
    };
    generated_at?: string;
    error?: string;
}

interface AnalyticsData {
    at_risk_count: number;
    at_risk_students: any[];
    performance_trends: any[];
    topic_mastery: any[];
    ai_insights: string[];
}

export default function TeacherAnalyticsPage() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [generatingFor, setGeneratingFor] = useState<string | null>(null);
    const [report, setReport] = useState<IndividualReport | null>(null);
    const [reportOpen, setReportOpen] = useState(false);

    const handleGenerateReport = async (student: { id: string; name: string }) => {
        setGeneratingFor(student.id);
        try {
            const result = await aiAPI.generateStudentReport(student.id) as IndividualReport;
            if (result?.error) {
                toast.error(result.error || 'Failed to generate report.');
                return;
            }
            setReport(result);
            setReportOpen(true);
            toast.success(`Report generated for ${student.name}.`);
        } catch (err: any) {
            toast.error(err?.message || 'Failed to generate report.');
        } finally {
            setGeneratingFor(null);
        }
    };

    useEffect(() => {
        async function loadAnalytics() {
            try {
                const [results, userData] = await Promise.all([
                    aiAPI.getTeacherAnalytics(),
                    usersAPI.getMe().catch(() => null)
                ]);
                setData(results);
                setUser(userData);
            } catch (err) {
                console.error("Failed to load analytics:", err);
                setError("Unable to load predictive analytics.");
            } finally {
                setLoading(false);
            }
        }
        loadAnalytics();
    }, []);

    if (loading) return <div className="p-8 text-center text-slate-500">Calculating analytics...</div>;

    if (user?.tenant_features?.teacher_reports === false) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center h-[60vh]">
                <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 mt-12 mx-auto">
                    <Lock className="h-8 w-8 text-slate-400" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Advanced Reports Locked</h2>
                <p className="text-slate-500 max-w-md mx-auto">Your school's current plan does not include access to AI-powered predictive analytics and advanced reporting features.</p>
            </div>
        );
    }

    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Class Predictive Analytics</h1>
                    <p className="text-slate-500 font-medium">Data-driven insights for your assigned classes.</p>
                </div>
                <div className="flex gap-2">
                    <div className="px-4 py-2 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-indigo-600" />
                        <span className="text-sm font-bold text-indigo-900">Term 2 - Week 8</span>
                    </div>
                </div>
            </header>

            {/* AI Insight Bar */}
            <div className="grid grid-cols-1 gap-4">
                {data?.ai_insights.map((insight, i) => (
                    <div key={i} className="p-1 rounded-3xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
                        <div className="bg-white rounded-[22px] p-4 flex items-center gap-4">
                            <div className="h-10 w-10 rounded-2xl bg-indigo-100 flex items-center justify-center shrink-0">
                                <Sparkles className="h-5 w-5 text-indigo-600" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-bold text-slate-900 leading-snug">
                                    {insight}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
                {(!data || data.ai_insights.length === 0) && (
                    <div className="p-1 rounded-3xl bg-slate-100">
                        <div className="bg-white rounded-[22px] p-4 flex items-center gap-4">
                            <div className="h-10 w-10 rounded-2xl bg-slate-50 flex items-center justify-center shrink-0">
                                <Sparkles className="h-5 w-5 text-slate-300" />
                            </div>
                            <div className="flex-1 text-slate-400 text-sm font-medium">
                                AI is analyzing your class performance trends...
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Score Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard
                    title="Students at Risk"
                    value={data?.at_risk_count || 0}
                    icon={<AlertTriangle className="text-amber-500" />}
                    trend="+2 from last week"
                    color="amber"
                />
                <StatCard
                    title="Average Attendance"
                    value="88%"
                    icon={<Users className="text-indigo-500" />}
                    trend="Stable"
                    color="indigo"
                />
                <StatCard
                    title="Topic Mastery"
                    value="74%"
                    icon={<CheckCircle2 className="text-emerald-500" />}
                    trend="+5% improvement"
                    color="emerald"
                />
                <StatCard
                    title="Participation"
                    value="High"
                    icon={<TrendingUp className="text-blue-500" />}
                    trend="Top in Grade 10"
                    color="blue"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Performance Trends Chart */}
                <Card className="lg:col-span-2 border-none shadow-sm rounded-3xl">
                    <CardHeader>
                        <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-800">
                            <BarChart3 className="h-5 w-5 text-indigo-600" />
                            Weekly Performance Trend
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                        <SafeResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data?.performance_trends}>
                                <defs>
                                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                />
                                <Area type="monotone" dataKey="avgScore" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorScore)" />
                                <Line type="monotone" dataKey="classAvg" stroke="#94a3b8" strokeDasharray="5 5" dot={false} />
                            </AreaChart>
                        </SafeResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Students at Risk List */}
                <Card className="border-none shadow-sm rounded-3xl border-l-4 border-amber-400 overflow-hidden">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-bold text-slate-800">Priority Alerts</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-slate-100">
                            {data?.at_risk_students.map((student) => (
                                <div key={student.id} className="p-4 flex flex-col gap-2 hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-slate-900">{student.name}</span>
                                        <Badge className={`${student.risk_level === 'High' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'} border-none shadow-none`}>
                                            {student.risk_level} Risk
                                        </Badge>
                                    </div>
                                    <div className="space-y-1">
                                        {student.reasons.map((reason: string, i: number) => (
                                            <p key={i} className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                                                <div className="h-1 w-1 rounded-full bg-slate-300" />
                                                {reason}
                                            </p>
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleGenerateReport({ id: student.id, name: student.name })}
                                        disabled={generatingFor === student.id}
                                        className="mt-2 text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:underline flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {generatingFor === student.id ? (
                                            <>
                                                <Loader2 className="h-3 w-3 animate-spin" /> Generating…
                                            </>
                                        ) : (
                                            <>
                                                Generate Individual Report <ChevronRight className="h-3 w-3" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            ))}
                        </div>
                        {data?.at_risk_students.length === 0 && (
                            <div className="p-10 text-center">
                                <CheckCircle2 className="h-10 w-10 text-emerald-200 mx-auto mb-2" />
                                <p className="text-sm text-slate-400 font-medium">No urgent risks detected!</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Topic Mastery Section */}
            <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
                <CardHeader>
                    <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-800">
                        <BrainCircuit className="h-5 w-5 text-indigo-600" />
                        Topic Mastery Progress
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                    {data?.topic_mastery.map((topic) => (
                        <div key={topic.topic} className="space-y-3">
                            <div className="flex justify-between items-end">
                                <span className="text-xs font-black text-slate-500 uppercase tracking-widest truncate">{topic.topic}</span>
                                <span className="text-sm font-black text-slate-900">{topic.score}%</span>
                            </div>
                            <div className="h-10 w-full bg-slate-100 rounded-2xl p-1 relative overflow-hidden">
                                <div
                                    className={`h-full rounded-xl transition-all duration-1000 ${topic.score >= 70 ? 'bg-emerald-500' : topic.score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                    style={{ width: `${topic.score}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            <Dialog open={reportOpen} onOpenChange={setReportOpen}>
                <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <BrainCircuit className="h-5 w-5 text-indigo-600" />
                            {report?.student_name ? `AI Report — ${report.student_name}` : 'AI Report'}
                        </DialogTitle>
                        {report?.metrics?.class && (
                            <DialogDescription>
                                Class: {report.metrics.class}
                                {report.generated_at && (
                                    <> · Generated {new Date(report.generated_at).toLocaleString()}</>
                                )}
                            </DialogDescription>
                        )}
                    </DialogHeader>

                    {report && (
                        <div className="space-y-4">
                            {report.ai_report?.summary && (
                                <section>
                                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-1">Summary</h4>
                                    <p className="text-sm leading-relaxed text-slate-800">{report.ai_report.summary}</p>
                                </section>
                            )}

                            {report.metrics && (
                                <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <StatTile label="Avg Score" value={`${(report.metrics.avg_score ?? 0).toFixed(1)}%`} />
                                    <StatTile label="Attendance" value={`${(report.metrics.attendance ?? 0).toFixed(1)}%`} />
                                    <StatTile label="Streak" value={`${report.metrics.streak ?? 0}d`} />
                                    <StatTile label="Focus" value={`${report.metrics.focus ?? 0}%`} />
                                </section>
                            )}

                            {report.metrics?.mastery && report.metrics.mastery.length > 0 && (
                                <section>
                                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Subject Mastery</h4>
                                    <ul className="space-y-1.5">
                                        {report.metrics.mastery.map((m) => (
                                            <li key={m.subject} className="flex items-center justify-between text-sm">
                                                <span className="text-slate-700">{m.subject}</span>
                                                <span className="font-mono font-semibold text-slate-900">{m.score}%</span>
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            )}

                            {report.ai_report?.strengths && report.ai_report.strengths.length > 0 && (
                                <ListSection title="Strengths" items={report.ai_report.strengths} tone="emerald" />
                            )}
                            {report.ai_report?.weaknesses && report.ai_report.weaknesses.length > 0 && (
                                <ListSection title="Areas to Improve" items={report.ai_report.weaknesses} tone="amber" />
                            )}
                            {report.ai_report?.recommendations && report.ai_report.recommendations.length > 0 && (
                                <ListSection title="Recommendations" items={report.ai_report.recommendations} tone="indigo" />
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

function StatTile({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
            <p className="text-lg font-black text-slate-900">{value}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">{label}</p>
        </div>
    );
}

function ListSection({ title, items, tone }: { title: string; items: string[]; tone: 'emerald' | 'amber' | 'indigo' }) {
    const toneClass = {
        emerald: 'text-emerald-700 bg-emerald-50 border-emerald-100',
        amber: 'text-amber-700 bg-amber-50 border-amber-100',
        indigo: 'text-indigo-700 bg-indigo-50 border-indigo-100',
    }[tone];
    return (
        <section>
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">{title}</h4>
            <ul className="space-y-1.5">
                {items.map((item, i) => (
                    <li key={i} className={`text-sm rounded-lg border px-3 py-2 ${toneClass}`}>
                        {item}
                    </li>
                ))}
            </ul>
        </section>
    );
}

function StatCard({ title, value, icon, trend, color }: any) {
    return (
        <Card className="border-none shadow-sm rounded-3xl overflow-hidden group hover:shadow-md transition-shadow">
            <CardContent className="p-6 relative">
                <div className={`absolute top-0 right-0 -tr-2 -tr-2 opacity-5 scale-150 rotate-12 group-hover:scale-110 transition-transform`}>
                    {icon}
                </div>
                <div className="space-y-1 relative z-10">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{title}</p>
                    <div className="flex items-center gap-3">
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">{value}</h2>
                        <div className={`h-8 w-8 rounded-xl bg-${color}-100 flex items-center justify-center shrink-0`}>
                            {icon}
                        </div>
                    </div>
                    <p className="text-[10px] font-bold text-slate-500">{trend}</p>
                </div>
            </CardContent>
        </Card>
    );
}

function Badge({ children, className }: any) {
    return (
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${className}`}>
            {children}
        </span>
    );
}
