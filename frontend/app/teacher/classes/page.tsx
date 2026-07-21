// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, TrendingDown, Clock, Search, ChevronRight, ClipboardList, BookOpenCheck, AlertTriangle } from 'lucide-react';
import { academicAPI, AcademicClass, Subject, Assessment, Result, Student, Attendance } from '@/lib/api';
import Link from 'next/link';
import { Input } from '@/components/ui/input';

interface EnrichedClass extends AcademicClass {
    studentCount: number;
    assignmentCount: number;
    assessmentCount: number;
    avgPerformance: number;
    hasPerformanceData: boolean;
    atRiskCount: number;
    attendanceTrend: 'up' | 'down' | 'stable';
    status: 'on-track' | 'needs-attention' | 'intervention';
}

function toList<T>(payload: unknown): T[] {
    if (Array.isArray(payload)) return payload as T[];
    if (payload && typeof payload === 'object' && Array.isArray((payload as any).results)) {
        return (payload as any).results as T[];
    }
    return [];
}

function rateForRange(records: Attendance[], from: Date, to: Date): number {
    const filtered = records.filter((record) => {
        const d = new Date(record.date);
        return d >= from && d < to;
    });
    if (filtered.length === 0) return 0;
    const presentLike = filtered.filter((record) => record.status === 'present' || record.status === 'late').length;
    return (presentLike / filtered.length) * 100;
}

export default function ClassManagementPage() {
    const [loading, setLoading] = useState(true);
    const [classes, setClasses] = useState<EnrichedClass[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        async function loadClasses() {
            try {
                setLoading(true);
                const [classesRaw, subjectsRaw, studentsRaw, assessmentsRaw, resultsRaw, attendanceRaw] = await Promise.all([
                    academicAPI.getClasses().catch(() => []),
                    academicAPI.getSubjects().catch(() => []),
                    academicAPI.getStudents().catch(() => []),
                    academicAPI.getAssessments().catch(() => []),
                    academicAPI.getResults().catch(() => []),
                    academicAPI.getAttendance().catch(() => []),
                ]);

                const classRows = toList<AcademicClass>(classesRaw);
                const subjects = toList<Subject>(subjectsRaw);
                const students = toList<Student>(studentsRaw);
                const assessments = toList<Assessment>(assessmentsRaw);
                const results = toList<Result>(resultsRaw);
                const attendance = toList<Attendance>(attendanceRaw);
                const classIds = new Set(classRows.map((item) => Number(item.id)));
                const scopedSubjects = subjects.filter((subject) => classIds.has(Number(subject.academic_class)));

                const assessmentById = new Map<string, Assessment>();
                assessments.forEach((assessment) => {
                    assessmentById.set(String(assessment.assessment_id), assessment);
                });

                const now = new Date();
                const currentFrom = new Date(now);
                currentFrom.setDate(now.getDate() - 14);
                const previousFrom = new Date(now);
                previousFrom.setDate(now.getDate() - 28);

                const enriched = classRows.map((academicClass) => {
                    const classStudents = students.filter(
                        (student) => Number(student.academic_class) === Number(academicClass.id)
                    );
                    const studentIds = new Set(classStudents.map((student) => String(student.id || student.student_id || '')));

                    const classSubjects = scopedSubjects.filter(
                        (subject) => Number(subject.academic_class) === Number(academicClass.id)
                    );
                    const subjectIds = new Set(classSubjects.map((subject) => Number(subject.id)));

                    const classAssessments = assessments.filter((assessment) =>
                        subjectIds.has(Number(assessment.subject))
                    );
                    const classAssessmentIds = new Set(classAssessments.map((assessment) => String(assessment.assessment_id)));

                    const classResults = results.filter((result) =>
                        classAssessmentIds.has(String(result.assessment))
                        && studentIds.has(String(result.student))
                    );
                    const normalizedScores = classResults
                        .map((result) => {
                            const linkedAssessment = assessmentById.get(String(result.assessment));
                            const totalMarks = Number(linkedAssessment?.total_marks || 0);
                            if (!totalMarks) return null;
                            return (Number(result.score || 0) / totalMarks) * 100;
                        })
                        .filter((score): score is number => typeof score === 'number' && Number.isFinite(score));

                    const hasPerformanceData = normalizedScores.length > 0;
                    const avgPerformance = hasPerformanceData
                        ? Math.round(normalizedScores.reduce((sum, value) => sum + value, 0) / normalizedScores.length)
                        : 0;

                    const assignmentAssessmentIds = new Set(
                        classAssessments
                            .filter((assessment) => assessment.type === 'assignment')
                            .map((assessment) => String(assessment.assessment_id))
                    );
                    const studentScores = new Map<string, number[]>();
                    const completedAssignmentsByStudent = new Map<string, number>();
                    classResults.forEach((result) => {
                        const studentId = String(result.student);
                        const linkedAssessment = assessmentById.get(String(result.assessment));
                        const totalMarks = Number(linkedAssessment?.total_marks || 0);
                        if (totalMarks > 0) {
                            const existingScores = studentScores.get(studentId) || [];
                            existingScores.push((Number(result.score || 0) / totalMarks) * 100);
                            studentScores.set(studentId, existingScores);
                        }
                        if (assignmentAssessmentIds.has(String(result.assessment))) {
                            completedAssignmentsByStudent.set(studentId, (completedAssignmentsByStudent.get(studentId) || 0) + 1);
                        }
                    });

                    const classAttendance = attendance.filter((record) => studentIds.has(String(record.student)));
                    const currentRate = rateForRange(classAttendance, currentFrom, now);
                    const previousRate = rateForRange(classAttendance, previousFrom, currentFrom);
                    const delta = currentRate - previousRate;

                    let attendanceTrend: EnrichedClass['attendanceTrend'] = 'stable';
                    if (delta >= 2) attendanceTrend = 'up';
                    else if (delta <= -2) attendanceTrend = 'down';

                    const attendanceByStudent = new Map<string, { total: number; presentLike: number }>();
                    classAttendance.forEach((record) => {
                        const studentId = String(record.student);
                        const current = attendanceByStudent.get(studentId) || { total: 0, presentLike: 0 };
                        current.total += 1;
                        if (record.status === 'present' || record.status === 'late') current.presentLike += 1;
                        attendanceByStudent.set(studentId, current);
                    });

                    let atRiskCount = 0;
                    classStudents.forEach((student) => {
                        const studentId = String(student.id || student.student_id || '');
                        const scores = studentScores.get(studentId) || [];
                        const avgScore = scores.length > 0
                            ? scores.reduce((sum, score) => sum + score, 0) / scores.length
                            : null;
                        const attendanceStats = attendanceByStudent.get(studentId);
                        const attendancePct = attendanceStats && attendanceStats.total > 0
                            ? (attendanceStats.presentLike / attendanceStats.total) * 100
                            : 100;
                        const assignmentCompletion = assignmentAssessmentIds.size > 0
                            ? (completedAssignmentsByStudent.get(studentId) || 0) / assignmentAssessmentIds.size
                            : 1;

                        if (
                            (avgScore !== null && avgScore < 60)
                            || attendancePct < 75
                            || assignmentCompletion < 0.5
                        ) {
                            atRiskCount += 1;
                        }
                    });

                    let status: EnrichedClass['status'] = 'on-track';
                    if (
                        (hasPerformanceData && avgPerformance < 60)
                        || atRiskCount > Math.max(1, Math.round(classStudents.length * 0.25))
                    ) {
                        status = 'intervention';
                    } else if ((hasPerformanceData && avgPerformance < 75) || attendanceTrend === 'down' || atRiskCount > 0) {
                        status = 'needs-attention';
                    }

                    return {
                        ...academicClass,
                        studentCount: classStudents.length,
                        assignmentCount: classAssessments.filter((assessment) => assessment.type === 'assignment').length,
                        assessmentCount: classAssessments.length,
                        avgPerformance,
                        hasPerformanceData,
                        atRiskCount,
                        attendanceTrend,
                        status,
                    };
                });

                setClasses(enriched);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        }

        loadClasses();
    }, []);

    const filteredClasses = useMemo(
        () => classes.filter((academicClass) =>
            academicClass.name.toLowerCase().includes(searchTerm.toLowerCase())
            || String(academicClass.order).toLowerCase().includes(searchTerm.toLowerCase())
        ),
        [classes, searchTerm]
    );

    if (loading) return <div className="p-8 text-center text-muted-foreground">Loading classes...</div>;

    return (
        <div className="p-8 min-h-screen bg-gray-50/50 space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Class Management</h1>
                    <p className="text-muted-foreground">Only your assigned classes are shown with progress, risk, and workload overview.</p>
                </div>
            </div>

            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search assigned classes..."
                    className="pl-10 bg-white"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredClasses.map((cls) => (
                    <Link key={cls.id} href={`/teacher/classes/${cls.id}`} className="block transition-transform hover:-translate-y-1">
                        <Card className="h-full border-slate-200 hover:border-indigo-300 hover:shadow-md cursor-pointer group">
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <Badge variant="outline" className="mb-2 bg-slate-50 text-slate-600 font-normal">
                                            Class {cls.name}
                                        </Badge>
                                        <CardTitle className="text-lg text-gray-900 group-hover:text-indigo-700 transition-colors">
                                            Grade Order {cls.order}
                                        </CardTitle>
                                    </div>
                                    {cls.status === 'on-track' && <Badge className="bg-green-100 text-green-700 hover:bg-green-200">On Track</Badge>}
                                    {cls.status === 'needs-attention' && <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200">Attention</Badge>}
                                    {cls.status === 'intervention' && <Badge className="bg-red-100 text-red-700 hover:bg-red-200">Intervention</Badge>}
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4 pb-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-muted-foreground flex items-center gap-1">
                                            <Users className="h-3 w-3" /> Students
                                        </span>
                                        <span className="font-semibold text-gray-900">{cls.studentCount}</span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-muted-foreground flex items-center gap-1">
                                            <TrendingUp className="h-3 w-3" /> Average
                                        </span>
                                        <span className={`font-semibold ${cls.hasPerformanceData && cls.avgPerformance < 75 ? 'text-orange-600' : 'text-green-600'}`}>
                                            {cls.hasPerformanceData ? `${cls.avgPerformance}%` : 'No scores'}
                                        </span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-muted-foreground flex items-center gap-1">
                                            <BookOpenCheck className="h-3 w-3" /> Assessments
                                        </span>
                                        <span className="font-semibold text-gray-900">{cls.assessmentCount}</span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-muted-foreground flex items-center gap-1">
                                            <ClipboardList className="h-3 w-3" /> Assignments
                                        </span>
                                        <span className="font-semibold text-gray-900">{cls.assignmentCount}</span>
                                    </div>
                                </div>

                                <div className="p-3 bg-slate-50 rounded-lg flex items-center justify-between text-xs text-slate-600">
                                    <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" /> Attendance
                                    </span>
                                    <span className={`flex items-center gap-1 font-medium ${cls.attendanceTrend === 'up' ? 'text-green-600' : cls.attendanceTrend === 'down' ? 'text-orange-600' : 'text-slate-500'}`}>
                                        {cls.attendanceTrend === 'up' ? <TrendingUp className="h-3 w-3" /> : cls.attendanceTrend === 'down' ? <TrendingDown className="h-3 w-3" /> : null}
                                        {cls.attendanceTrend === 'up' ? 'Improving' : cls.attendanceTrend === 'down' ? 'Declining' : 'Stable'}
                                    </span>
                                </div>
                                <div className="p-3 bg-amber-50 rounded-lg flex items-center justify-between text-xs text-amber-700">
                                    <span className="flex items-center gap-1">
                                        <AlertTriangle className="h-3 w-3" /> At-risk students
                                    </span>
                                    <span className="font-semibold">{cls.atRiskCount}</span>
                                </div>
                            </CardContent>
                            <CardFooter className="pt-0 pb-4">
                                <div className="text-xs text-indigo-600 font-medium flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    View Class Details <ChevronRight className="h-3 w-3 ml-1" />
                                </div>
                            </CardFooter>
                        </Card>
                    </Link>
                ))}
                {filteredClasses.length === 0 && (
                    <div className="col-span-full border rounded-lg border-dashed bg-white p-8 text-center text-muted-foreground">
                        No assigned classes found.
                    </div>
                )}
            </div>
        </div>
    );
}
