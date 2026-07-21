// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    FileText, Sparkles, Download,
    Send, Filter, Search, ChevronRight,
    Printer, Loader2, CheckCircle2, BrainCircuit,
    Calendar, Users, Table as TableIcon
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { academicAPI, aiAPI, Student, AcademicClass, Section } from '@/lib/api';
import { toast } from 'sonner';
import { AttendanceTrends } from '@/components/attendance-trends';

export default function TeacherReportsPage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState<string | null>(null);
    const [reports, setReports] = useState<Record<string, any>>({});

    useEffect(() => {
        async function loadStudents() {
            try {
                // In a real app, we'd filter by the teacher's classes
                const results = await academicAPI.getStudents();
                setStudents(results);
            } catch (err) {
                console.error("Failed to load students:", err);
            } finally {
                setLoading(false);
            }
        }
        loadStudents();
    }, []);

    const generateReport = async (studentId: string) => {
        setGenerating(studentId);
        try {
            const report = await aiAPI.getStudentReport(studentId);
            setReports(prev => ({ ...prev, [studentId]: report }));
        } catch (err) {
            console.error("Failed to generate report:", err);
            toast.error("Failed to generate AI report");
        } finally {
            setGenerating(null);
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Report Manager</h1>
                    <p className="text-slate-500 font-medium">Generate professional academic and attendance summaries.</p>
                </div>
            </header>

            <Tabs defaultValue="ai-narrative" className="space-y-6">
                <TabsList className="bg-slate-100/50 p-1 rounded-2xl border border-slate-200">
                    <TabsTrigger value="ai-narrative" className="rounded-xl px-6 py-2 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <Sparkles className="h-4 w-4 mr-2 text-indigo-600" />
                        AI Narrative
                    </TabsTrigger>
                    <TabsTrigger value="attendance" className="rounded-xl px-6 py-2 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <FileText className="h-4 w-4 mr-2 text-emerald-600" />
                        Attendance Reports
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="ai-narrative">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Student List */}
                        <Card className="lg:col-span-1 border-none shadow-sm rounded-3xl overflow-hidden">
                            <CardHeader className="border-b border-slate-50">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input
                                        className="w-full pl-10 pr-4 py-2 bg-slate-50 rounded-xl text-sm border-none focus:ring-2 focus:ring-indigo-100 font-medium"
                                        placeholder="Search students..."
                                    />
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="max-h-[600px] overflow-y-auto divide-y divide-slate-100">
                                    {students.map((student) => (
                                        <div
                                            key={student.id}
                                            className="p-4 flex items-center justify-between group hover:bg-slate-50 transition-all cursor-pointer"
                                            onClick={() => generateReport(student.student_id)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center font-bold text-indigo-600">
                                                    {student.first_name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900">{student.first_name} {student.last_name}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Class {student.academic_class}</p>
                                                </div>
                                            </div>
                                            {reports[student.student_id] ? (
                                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                            ) : (
                                                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-600 transition-colors" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Report Preview */}
                        <div className="lg:col-span-2 space-y-6">
                            {Object.keys(reports).length === 0 && !generating ? (
                                <div className="h-full flex flex-col items-center justify-center py-20 bg-slate-50 rounded-[40px] border-4 border-dashed border-white">
                                    <div className="h-20 w-20 rounded-full bg-white flex items-center justify-center shadow-xl mb-6">
                                        <FileText className="h-10 w-10 text-slate-200" />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-800">Select a student to begin</h3>
                                    <p className="text-sm text-slate-500">AI will generate a narrative summary based on all academic data.</p>
                                </div>
                            ) : (
                                <ReportPreview
                                    student={students.find(s => s.student_id === Object.keys(reports)[0]) as any}
                                    report={reports[Object.keys(reports)[0]]}
                                    loading={!!generating}
                                />
                            )}
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="attendance">
                    <AttendanceReportSection />
                </TabsContent>
            </Tabs>
        </div>
    );
}

function AttendanceReportSection() {
    const [classes, setClasses] = useState<AcademicClass[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [sections, setSections] = useState<Section[]>([]);
    const [selectedSectionId, setSelectedSectionId] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [dates, setDates] = useState({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        async function loadClasses() {
            try {
                const data = await academicAPI.getClasses();
                setClasses(data);
                if (data.length > 0) {
                    setSelectedClassId(data[0].id.toString());
                }
            } catch (err) {
                console.error("Failed to load classes:", err);
            } finally {
                setLoading(false);
            }
        }
        loadClasses();
    }, []);

    useEffect(() => {
        if (selectedClassId) {
            const cls = classes.find(c => c.id.toString() === selectedClassId);
            if (cls && cls.sections) {
                setSections(cls.sections);
                if (cls.sections.length > 0) {
                    setSelectedSectionId(cls.sections[0].id.toString());
                } else {
                    setSelectedSectionId('');
                }
            }
        }
    }, [selectedClassId, classes]);

    const handleDownload = (format: 'pdf' | 'excel') => {
        if (!selectedSectionId) {
            toast.error("Please select a section");
            return;
        }

        const url = format === 'pdf'
            ? academicAPI.getAttendanceSummaryPdf(parseInt(selectedSectionId), dates.start, dates.end)
            : academicAPI.getAttendanceSummaryExcel(parseInt(selectedSectionId), dates.start, dates.end);

        window.open(url, '_blank');
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
                <CardHeader className="p-8 border-b border-slate-50 bg-emerald-50/30">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="h-12 w-12 rounded-2xl bg-emerald-100 flex items-center justify-center">
                            <Calendar className="h-6 w-6 text-emerald-600" />
                        </div>
                        <div>
                            <CardTitle className="text-xl font-black text-slate-900">Attendance Summary</CardTitle>
                            <p className="text-sm text-slate-500 font-medium">Generate point-in-time attendance availability reports.</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400">Class</label>
                            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                                <SelectTrigger className="rounded-xl border-slate-200">
                                    <SelectValue placeholder="Select Class" />
                                </SelectTrigger>
                                <SelectContent>
                                    {classes.map(c => (
                                        <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400">Section</label>
                            <Select value={selectedSectionId} onValueChange={setSelectedSectionId}>
                                <SelectTrigger className="rounded-xl border-slate-200">
                                    <SelectValue placeholder="Select Section" />
                                </SelectTrigger>
                                <SelectContent>
                                    {sections.map(s => (
                                        <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                                    ))}
                                    {sections.length === 0 && <SelectItem value="none" disabled>No sections</SelectItem>}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400">Start Date</label>
                            <input
                                type="date"
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-100"
                                value={dates.start}
                                onChange={(e) => setDates(prev => ({ ...prev, start: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400">End Date</label>
                            <input
                                type="date"
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-100"
                                value={dates.end}
                                onChange={(e) => setDates(prev => ({ ...prev, end: e.target.value }))}
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-4 pt-4">
                        <Button
                            onClick={() => handleDownload('pdf')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold px-8 h-12 flex gap-2 shadow-lg shadow-emerald-100"
                        >
                            <Download className="h-4 w-4" />
                            Download PDF Summary
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => handleDownload('excel')}
                            className="border-slate-200 hover:bg-slate-50 rounded-2xl font-bold px-8 h-12 flex gap-2"
                        >
                            <TableIcon className="h-4 w-4 text-emerald-600" />
                            Export to Excel
                        </Button>
                    </div>

                    <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                        <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                            <Users className="h-4 w-4 text-emerald-500" />
                            What's included in this report?
                        </h4>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {[
                                "Student-wise attendance percentages",
                                "Total present, absent, and late counts",
                                "Date range filtering",
                                "Formatted for professional printing",
                                "Excel compatible data export",
                                "Automated percentage calculations"
                            ].map((item, i) => (
                                <li key={i} className="text-xs text-slate-500 flex items-center gap-2 font-medium">
                                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                </CardContent>
            </Card>

            {selectedSectionId && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <AttendanceTrends sectionId={parseInt(selectedSectionId)} />
                    <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-[40px] p-10 text-white flex flex-col justify-center items-center text-center space-y-6">
                        <div className="h-16 w-16 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md">
                            <Sparkles className="h-8 w-8 text-indigo-300" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black italic">AI Attendance Insights</h3>
                            <p className="text-slate-400 font-medium max-w-xs">
                                Switch to the AI Narrative tab to see detailed behavioral analysis including attendance streaks and focus metrics.
                            </p>
                        </div>
                        <Button variant="outline" className="rounded-2xl border-white/20 hover:bg-white/10 text-white font-bold h-12 px-8">
                            View Behavioral AI
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

function ReportPreview({ student, report, loading }: any) {
    if (loading) {
        return (
            <div className="bg-white p-20 rounded-[40px] shadow-xl flex flex-col items-center justify-center gap-4 text-center">
                <div className="relative">
                    <BrainCircuit className="h-16 w-16 text-indigo-100" />
                    <Loader2 className="absolute top-0 left-0 h-16 w-16 text-indigo-600 animate-spin" />
                </div>
                <div>
                    <h3 className="text-xl font-black text-slate-900 mt-4">Generating AI Narrative...</h3>
                    <p className="text-slate-500 max-w-xs mx-auto">Analyzing scores, attendance, streaks, and teacher feedback.</p>
                </div>
            </div>
        );
    }

    if (!report) return null;

    return (
        <div className="bg-white rounded-[40px] shadow-2xl shadow-indigo-100 overflow-hidden border border-indigo-50">
            {/* Header */}
            <div className="p-8 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white">
                <div className="flex justify-between items-start mb-10">
                    <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                        <FileText className="h-8 w-8 text-white" />
                    </div>
                    <div className="flex gap-2">
                        <Button className="bg-white/10 hover:bg-white/20 border-white/20 text-white rounded-xl h-10 px-4">
                            <Printer className="h-4 w-4 mr-2" />
                            Print
                        </Button>
                        <Button className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl h-10 px-4">
                            <Download className="h-4 w-4 mr-2" />
                            Export PDF
                        </Button>
                    </div>
                </div>
                <div className="space-y-1">
                    <h2 className="text-4xl font-black tracking-tight">{report.student_name}</h2>
                    <p className="text-indigo-100 font-bold opacity-80 uppercase tracking-widest text-xs">Progress Report • {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-4 border-b border-slate-50">
                <MetricBox label="Avg Score" value={`${Math.round(report.metrics.avg_score)}%`} color="indigo" />
                <MetricBox label="Attendance" value={`${Math.round(report.metrics.attendance)}%`} color="emerald" />
                <MetricBox label="Streak" value={`${report.metrics.streak} Days`} color="orange" />
                <MetricBox label="Focus" value={`${report.metrics.focus}%`} color="purple" />
            </div>

            {/* Narrative Sections */}
            <div className="p-10 space-y-8">
                <section className="space-y-4">
                    <div className="flex items-center gap-2 text-indigo-600 ring-offset-2">
                        <Sparkles className="h-5 w-5 fill-indigo-100" />
                        <h3 className="text-sm font-black uppercase tracking-widest">Executive Summary</h3>
                    </div>
                    <p className="text-lg text-slate-600 leading-relaxed font-medium">
                        {report.ai_report.summary}
                    </p>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <section className="space-y-4">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Strengths</h3>
                        <div className="space-y-2">
                            {report.ai_report.strengths.map((s: string, i: number) => (
                                <div key={i} className="flex items-start gap-2 bg-emerald-50/50 p-3 rounded-xl border border-emerald-50">
                                    <div className="h-5 w-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                                    </div>
                                    <p className="text-sm text-emerald-900 font-bold">{s}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Areas for Focus</h3>
                        <div className="space-y-3">
                            {report.ai_report.weaknesses.map((w: string, i: number) => (
                                <div key={i} className="flex items-start gap-2 bg-amber-50/50 p-3 rounded-xl border border-amber-50">
                                    <div className="h-5 w-5 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                                        <div className="h-1.5 w-1.5 rounded-full bg-amber-600" />
                                    </div>
                                    <p className="text-sm text-amber-900 font-bold">{w}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                <div className="pt-6 border-t border-slate-50">
                    <div className="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-50">
                        <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-3">AI Support Advice</h3>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {report.ai_report.recommendations.map((rec: string, i: number) => (
                                <li key={i} className="text-sm text-slate-700 font-bold flex items-center gap-2">
                                    <ChevronRight className="h-4 w-4 text-indigo-400" />
                                    {rec}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            <div className="p-6 bg-slate-50 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Generated by AI E-Learning Platform • Teacher Verified</p>
            </div>
        </div>
    );
}

function MetricBox({ label, value, color }: { label: string, value: string, color: string }) {
    return (
        <div className="p-6 text-center border-r border-slate-50 last:border-0">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
            <p className={`text-2xl font-black text-${color}-600`}>{value}</p>
        </div>
    );
}
