// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { academicAPI, reportsAPI, downloadReport, AcademicClass, Section, Student } from '@/lib/api';
import { toast } from 'sonner';
import {
    FileText, Download, Loader2, CalendarDays, Wallet,
    AlertTriangle, Ticket, BarChart3, FileSpreadsheet,
    GraduationCap, BookOpen,
} from 'lucide-react';

function getSelectValue(value: string | number | null | undefined): string | null {
    if (value == null) return null;
    const normalized = typeof value === 'string' ? value : String(value);
    return normalized.trim().length > 0 ? normalized : null;
}

async function downloadUrl(url: string, filename: string) {
    try {
        await downloadReport(url, filename);
    } catch {
        toast.error('Failed to download report');
    }
}

function SectionHeader({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
    return (
        <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-indigo-50 rounded-xl">{icon}</div>
            <div>
                <h2 className="text-lg font-black text-slate-900">{title}</h2>
                <p className="text-sm text-slate-500">{description}</p>
            </div>
        </div>
    );
}

function DownloadBtn({ label, icon, onClick, disabled }: { label: string; icon: React.ReactNode; onClick: () => void; disabled?: boolean }) {
    return (
        <Button variant="outline" size="sm" onClick={onClick} disabled={disabled} className="h-9 gap-2 rounded-xl font-bold text-xs">
            {icon} {label}
        </Button>
    );
}

// ── Student Performance ───────────────────────────────────────────────────────
function StudentPerformanceReport() {
    const [classes, setClasses] = useState<AcademicClass[]>([]);
    const [sections, setSections] = useState<Section[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [classId, setClassId] = useState('');
    const [sectionId, setSectionId] = useState('');
    const [studentId, setStudentId] = useState('');
    const [loading, setLoading] = useState(false);
    const [busy, setBusy] = useState(false);

    useEffect(() => { academicAPI.getClasses().then(setClasses).catch(() => null); }, []);

    useEffect(() => {
        if (!classId) return;
        const cls = classes.find(c => c.id.toString() === classId);
        setSections(cls?.sections || []);
        setSectionId(''); setStudents([]); setStudentId('');
    }, [classId, classes]);

    useEffect(() => {
        if (!sectionId) return;
        setLoading(true);
        academicAPI.getStudents({ section_id: sectionId }).then(setStudents).catch(() => null).finally(() => setLoading(false));
    }, [sectionId]);

    const generate = (format: 'pdf' | 'excel') => {
        if (!studentId) { toast.error('Please select a student'); return; }
        setBusy(true);
        const url = format === 'pdf' ? reportsAPI.getStudentPerformancePDF(studentId) : reportsAPI.getStudentPerformanceExcel(studentId);
        const s = students.find(x => x.id === studentId);
        downloadUrl(url, `performance_${s ? `${s.first_name}_${s.last_name}` : studentId}.${format === 'pdf' ? 'pdf' : 'xlsx'}`);
        toast.success(`Downloading ${format.toUpperCase()}…`);
        setTimeout(() => setBusy(false), 1500);
    };

    return (
        <div className="space-y-5">
            <SectionHeader icon={<GraduationCap className="h-5 w-5 text-indigo-600" />} title="Student Performance Report" description="Individual academic performance with grades and progress." />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Class</Label>
                    <Select value={classId} onValueChange={setClassId}>
                        <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select class" /></SelectTrigger>
                        <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Section</Label>
                    <Select value={sectionId} onValueChange={setSectionId} disabled={!classId}>
                        <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select section" /></SelectTrigger>
                        <SelectContent>{sections.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Student</Label>
                    <Select value={studentId} onValueChange={setStudentId} disabled={!sectionId || loading}>
                        <SelectTrigger className="rounded-xl"><SelectValue placeholder={loading ? 'Loading…' : 'Select student'} /></SelectTrigger>
                        <SelectContent>{students.map(s => <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
            </div>
            <div className="flex gap-3 pt-1">
                <DownloadBtn label="Download PDF" icon={<FileText className="h-3.5 w-3.5" />} onClick={() => generate('pdf')} disabled={!studentId || busy} />
                <DownloadBtn label="Download Excel" icon={<FileSpreadsheet className="h-3.5 w-3.5" />} onClick={() => generate('excel')} disabled={!studentId || busy} />
            </div>
        </div>
    );
}

// ── Attendance Summary ────────────────────────────────────────────────────────
function AttendanceSummaryReport() {
    const [classes, setClasses] = useState<AcademicClass[]>([]);
    const [sections, setSections] = useState<Section[]>([]);
    const [classId, setClassId] = useState('');
    const [sectionId, setSectionId] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => { academicAPI.getClasses().then(setClasses).catch(() => null); }, []);

    useEffect(() => {
        if (!classId) return;
        const cls = classes.find(c => c.id.toString() === classId);
        setSections(cls?.sections || []); setSectionId('');
    }, [classId, classes]);

    const generate = (format: 'pdf' | 'excel') => {
        if (!sectionId) { toast.error('Please select a section'); return; }
        setBusy(true);
        const url = format === 'pdf' ? reportsAPI.getAttendanceSummaryPDF(sectionId) : reportsAPI.getAttendanceSummaryExcel(sectionId);
        downloadUrl(url, `attendance_section_${sectionId}.${format === 'pdf' ? 'pdf' : 'xlsx'}`);
        toast.success(`Downloading ${format.toUpperCase()}…`);
        setTimeout(() => setBusy(false), 1500);
    };

    return (
        <div className="space-y-5">
            <SectionHeader icon={<CalendarDays className="h-5 w-5 text-indigo-600" />} title="Attendance Summary Report" description="Class/section-level attendance overview." />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg">
                <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Class</Label>
                    <Select value={classId} onValueChange={setClassId}>
                        <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select class" /></SelectTrigger>
                        <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Section</Label>
                    <Select value={sectionId} onValueChange={setSectionId} disabled={!classId}>
                        <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select section" /></SelectTrigger>
                        <SelectContent>{sections.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
            </div>
            <div className="flex gap-3 pt-1">
                <DownloadBtn label="PDF Report" icon={<FileText className="h-3.5 w-3.5" />} onClick={() => generate('pdf')} disabled={!sectionId || busy} />
                <DownloadBtn label="Excel Export" icon={<FileSpreadsheet className="h-3.5 w-3.5" />} onClick={() => generate('excel')} disabled={!sectionId || busy} />
            </div>
        </div>
    );
}

// ── Fee Reports ───────────────────────────────────────────────────────────────
function FeeReports() {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [busy, setBusy] = useState(false);

    const generate = (type: 'collection' | 'pending', format: 'pdf' | 'excel') => {
        setBusy(true);
        const url = type === 'collection'
            ? (format === 'pdf' ? reportsAPI.getFeeCollectionPDF(startDate || undefined, endDate || undefined) : reportsAPI.getFeeCollectionExcel(startDate || undefined, endDate || undefined))
            : (format === 'pdf' ? reportsAPI.getPendingFeesPDF() : reportsAPI.getPendingFeesExcel());
        downloadUrl(url, `${type}_fees.${format === 'pdf' ? 'pdf' : 'xlsx'}`);
        toast.success(`Downloading ${format.toUpperCase()}…`);
        setTimeout(() => setBusy(false), 1500);
    };

    return (
        <div className="space-y-8">
            <div className="space-y-5">
                <SectionHeader icon={<Wallet className="h-5 w-5 text-indigo-600" />} title="Fee Collection Report" description="Revenue collected within a date range. Leave blank for all-time." />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg">
                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Start Date</Label>
                        <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="rounded-xl" />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">End Date</Label>
                        <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="rounded-xl" />
                    </div>
                </div>
                <div className="flex gap-3">
                    <DownloadBtn label="PDF" icon={<FileText className="h-3.5 w-3.5" />} onClick={() => generate('collection', 'pdf')} disabled={busy} />
                    <DownloadBtn label="Excel" icon={<FileSpreadsheet className="h-3.5 w-3.5" />} onClick={() => generate('collection', 'excel')} disabled={busy} />
                </div>
            </div>
            <div className="border-t border-slate-100 pt-8 space-y-5">
                <SectionHeader icon={<AlertTriangle className="h-5 w-5 text-red-500" />} title="Pending Fees Report" description="All students with outstanding balances." />
                <div className="flex gap-3">
                    <DownloadBtn label="PDF" icon={<FileText className="h-3.5 w-3.5" />} onClick={() => generate('pending', 'pdf')} disabled={busy} />
                    <DownloadBtn label="Excel" icon={<FileSpreadsheet className="h-3.5 w-3.5" />} onClick={() => generate('pending', 'excel')} disabled={busy} />
                </div>
            </div>
        </div>
    );
}

// ── Exam Reports ──────────────────────────────────────────────────────────────
function ExamReports() {
    const [classes, setClasses] = useState<AcademicClass[]>([]);
    const [sections, setSections] = useState<Section[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [exams, setExams] = useState<any[]>([]);
    const [classId, setClassId] = useState('');
    const [sectionId, setSectionId] = useState('');
    const [studentId, setStudentId] = useState('');
    const [examId, setExamId] = useState('');
    const [loading, setLoading] = useState(false);
    const [busy, setBusy] = useState(false);
    const examOptions = exams.flatMap((exam) => {
        const value = getSelectValue(exam.exam_id ?? exam.id);
        if (!value) return [];

        return [{
            key: value,
            value,
            label: exam.assessment?.title || exam.title || `Exam ${value}`,
        }];
    });

    useEffect(() => {
        academicAPI.getClasses().then(setClasses).catch(() => null);
        academicAPI.getExams().then((data: any) => setExams(Array.isArray(data) ? data : data?.results ?? [])).catch(() => null);
    }, []);

    useEffect(() => {
        if (!classId) return;
        const cls = classes.find(c => c.id.toString() === classId);
        setSections(cls?.sections || []); setSectionId(''); setStudents([]); setStudentId('');
    }, [classId, classes]);

    useEffect(() => {
        if (!sectionId) return;
        setLoading(true);
        academicAPI.getStudents({ section_id: sectionId }).then(setStudents).catch(() => null).finally(() => setLoading(false));
    }, [sectionId]);

    const downloadBulk = async () => {
        if (!examId) { toast.error('Select an exam'); return; }
        const exam = exams.find((entry) => getSelectValue(entry.exam_id ?? entry.id) === examId);
        const seatings = (exam as any)?.seating_arrangements;
        if (Array.isArray(seatings) && seatings.length === 0) {
            toast.error('No hall tickets generated yet. Open the Exams page → Allocate Seats first.');
            return;
        }
        setBusy(true);
        try {
            await downloadReport(
                reportsAPI.getBulkHallTicketsZIP(examId),
                `hall_tickets_${exam?.assessment?.title?.replace(/\s+/g, '_') ?? examId}.zip`,
            );
            toast.success('Hall tickets ZIP downloaded');
        } catch (e: any) {
            toast.error(e?.message || 'Failed to download hall tickets');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="space-y-8">
            <div className="space-y-5">
                <SectionHeader icon={<BookOpen className="h-5 w-5 text-indigo-600" />} title="Student Result Card" description="Performance PDF for a specific student." />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Class</Label>
                        <Select value={classId} onValueChange={setClassId}>
                            <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select class" /></SelectTrigger>
                            <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Section</Label>
                        <Select value={sectionId} onValueChange={setSectionId} disabled={!classId}>
                            <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select section" /></SelectTrigger>
                            <SelectContent>{sections.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Student</Label>
                        <Select value={studentId} onValueChange={setStudentId} disabled={!sectionId || loading}>
                            <SelectTrigger className="rounded-xl"><SelectValue placeholder={loading ? 'Loading…' : 'Select student'} /></SelectTrigger>
                            <SelectContent>{students.map(s => <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                </div>
                <DownloadBtn
                    label="Download Performance PDF"
                    icon={<FileText className="h-3.5 w-3.5" />}
                    onClick={() => {
                        if (!studentId) { toast.error('Select a student'); return; }
                        setBusy(true);
                        downloadUrl(reportsAPI.getStudentPerformancePDF(studentId), `result_${studentId}.pdf`);
                        toast.success('Downloading…');
                        setTimeout(() => setBusy(false), 1500);
                    }}
                    disabled={!studentId || busy}
                />
            </div>

            <div className="border-t border-slate-100 pt-8 space-y-5">
                <SectionHeader icon={<Ticket className="h-5 w-5 text-indigo-600" />} title="Bulk Hall Tickets" description="All hall tickets for an exam as a ZIP file." />
                <div className="max-w-sm space-y-1.5">
                    <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Exam</Label>
                    <Select value={examId} onValueChange={setExamId}>
                        <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select exam" /></SelectTrigger>
                        <SelectContent>
                            {examOptions.map((exam) => (
                                <SelectItem key={exam.key} value={exam.value}>
                                    {exam.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <DownloadBtn label="Download Hall Tickets (ZIP)" icon={<Download className="h-3.5 w-3.5" />} onClick={downloadBulk} disabled={!examId || busy} />
            </div>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
type Tab = 'student' | 'attendance' | 'fees' | 'exams';

const TABS: { id: Tab; label: string; icon: React.ReactNode; sub: string }[] = [
    { id: 'student',    label: 'Student',    icon: <GraduationCap className="h-4 w-4" />, sub: 'Performance · Results' },
    { id: 'attendance', label: 'Attendance', icon: <CalendarDays className="h-4 w-4" />, sub: 'Class · Section' },
    { id: 'fees',       label: 'Fees',       icon: <Wallet className="h-4 w-4" />,       sub: 'Collection · Pending' },
    { id: 'exams',      label: 'Exams',      icon: <Ticket className="h-4 w-4" />,       sub: 'Hall Tickets · Cards' },
];

export default function AdminReportsPage() {
    const [tab, setTab] = useState<Tab>('student');

    return (
        <div className="max-w-5xl mx-auto py-8 px-4 md:px-6 space-y-8">
            <div>
                <div className="flex items-center gap-2 text-indigo-600 font-bold mb-1">
                    <BarChart3 className="h-4 w-4" />
                    <span className="text-[10px] uppercase tracking-[0.2em]">School ERP</span>
                </div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tight">Reports Center</h1>
                <p className="text-slate-500 mt-1">Generate PDF and Excel reports for students, attendance, fees, and exams.</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {TABS.map(({ id, label, icon, sub }) => (
                    <button
                        key={id}
                        onClick={() => setTab(id)}
                        className={`p-4 rounded-2xl border text-left transition-all ${
                            tab === id
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200'
                                : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50'
                        }`}
                    >
                        <div className={`mb-2 ${tab === id ? 'text-white' : 'text-indigo-600'}`}>{icon}</div>
                        <p className={`text-xs font-black uppercase tracking-wider ${tab === id ? 'text-white' : 'text-slate-700'}`}>{label}</p>
                        <p className={`text-[10px] mt-0.5 ${tab === id ? 'text-indigo-200' : 'text-slate-400'}`}>{sub}</p>
                    </button>
                ))}
            </div>

            <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-6 md:p-8">
                    {tab === 'student'    && <StudentPerformanceReport />}
                    {tab === 'attendance' && <AttendanceSummaryReport />}
                    {tab === 'fees'       && <FeeReports />}
                    {tab === 'exams'      && <ExamReports />}
                </CardContent>
            </Card>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-red-400" /> PDF — formatted, printable</span>
                <span className="flex items-center gap-1.5"><FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" /> Excel — editable data</span>
                <span className="flex items-center gap-1.5"><Download className="h-3.5 w-3.5 text-indigo-400" /> ZIP — bundled files</span>
            </div>
        </div>
    );
}
