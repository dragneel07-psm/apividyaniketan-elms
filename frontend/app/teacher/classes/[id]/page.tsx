// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Users, BookOpen, ClipboardList, BarChart2, Plus, BrainCircuit, AlertCircle, FileText, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { academicAPI, AcademicClass, Subject, Student, Assessment, Lesson, Attendance, Result } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line } from 'recharts';
import { SafeResponsiveContainer } from '@/components/ui/safe-responsive-container';

type StudentRow = {
    student: Student;
    attendancePct: number;
    averageScorePct: number | null;
    completedAssignments: number;
    totalAssignments: number;
    risk: 'high' | 'medium' | 'low';
};

type LessonRow = Lesson & {
    subjectId: number;
    subjectName: string;
};

type MetricsState = {
    classAverage: number;
    highestScore: number;
    atRiskCount: number;
    distribution: { range: string; count: number; fill: string }[];
    trend: { name: string; avg: number }[];
};

function toList<T>(payload: unknown): T[] {
    if (Array.isArray(payload)) return payload as T[];
    if (payload && typeof payload === 'object' && Array.isArray((payload as { results?: unknown[] }).results)) {
        return (payload as { results: T[] }).results;
    }
    return [];
}

export default function ClassDetailPage() {
    const params = useParams();
    const id = params.id as string;
    const classId = Number(id);

    const [loading, setLoading] = useState(true);
    const [classroom, setClassroom] = useState<AcademicClass | null>(null);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [studentRows, setStudentRows] = useState<StudentRow[]>([]);
    const [lessons, setLessons] = useState<LessonRow[]>([]);
    const [assessments, setAssessments] = useState<Assessment[]>([]);
    const [metrics, setMetrics] = useState<MetricsState>({
        classAverage: 0,
        highestScore: 0,
        atRiskCount: 0,
        distribution: [],
        trend: [],
    });

    useEffect(() => {
        async function loadData() {
            if (Number.isNaN(classId)) {
                setClassroom(null);
                setLoading(false);
                return;
            }

            try {
                setLoading(true);

                const [classRaw, allSubjectsRaw, allStudentsRaw, allAssessmentsRaw, allResultsRaw, allAttendanceRaw] = await Promise.all([
                    academicAPI.getClass(classId).catch(() => null),
                    academicAPI.getSubjects().catch(() => []),
                    academicAPI.getStudents().catch(() => []),
                    academicAPI.getAssessments().catch(() => []),
                    academicAPI.getResults().catch(() => []),
                    academicAPI.getAttendance().catch(() => []),
                ]);

                if (!classRaw) {
                    setClassroom(null);
                    setSubjects([]);
                    setStudents([]);
                    setAssessments([]);
                    setLessons([]);
                    setStudentRows([]);
                    setMetrics({ classAverage: 0, highestScore: 0, atRiskCount: 0, distribution: [], trend: [] });
                    return;
                }

                const classData = classRaw as AcademicClass;
                setClassroom(classData);

                const allSubjects = toList<Subject>(allSubjectsRaw);
                const classSubjects = (classData.subjects && classData.subjects.length > 0)
                    ? classData.subjects
                    : allSubjects.filter((subject) => Number(subject.academic_class) === classId);
                setSubjects(classSubjects);

                const allStudents = toList<Student>(allStudentsRaw);
                const classStudents = allStudents.filter((student) => Number(student.academic_class) === classId);
                setStudents(classStudents);
                const studentIdSet = new Set(classStudents.map((student) => String(student.id || student.student_id || '')));

                const subjectIdSet = new Set(classSubjects.map((subject) => Number(subject.id)));
                const allAssessments = toList<Assessment>(allAssessmentsRaw);
                const classAssessments = allAssessments.filter((assessment) => subjectIdSet.has(Number(assessment.subject)));
                setAssessments(classAssessments);

                const assessmentById = new Map<string, Assessment>();
                classAssessments.forEach((assessment) => assessmentById.set(String(assessment.assessment_id), assessment));
                const assessmentIdSet = new Set(classAssessments.map((assessment) => String(assessment.assessment_id)));
                const assignmentIdSet = new Set(
                    classAssessments
                        .filter((assessment) => assessment.type === 'assignment')
                        .map((assessment) => String(assessment.assessment_id))
                );

                const allResults = toList<Result>(allResultsRaw);
                const classResults = allResults.filter((result) =>
                    assessmentIdSet.has(String(result.assessment))
                    && studentIdSet.has(String(result.student))
                );

                const scoresByStudent = new Map<string, number[]>();
                const completedAssignmentsByStudent = new Map<string, Set<string>>();
                const normalizedScores: number[] = [];

                classResults.forEach((result) => {
                    const studentId = String(result.student);
                    const linkedAssessment = assessmentById.get(String(result.assessment));
                    const totalMarks = Number(linkedAssessment?.total_marks || 0);
                    if (totalMarks > 0) {
                        const normalized = (Number(result.score || 0) / totalMarks) * 100;
                        normalizedScores.push(normalized);
                        const currentScores = scoresByStudent.get(studentId) || [];
                        currentScores.push(normalized);
                        scoresByStudent.set(studentId, currentScores);
                    }

                    if (assignmentIdSet.has(String(result.assessment))) {
                        const completed = completedAssignmentsByStudent.get(studentId) || new Set<string>();
                        completed.add(String(result.assessment));
                        completedAssignmentsByStudent.set(studentId, completed);
                    }
                });

                const allAttendance = toList<Attendance>(allAttendanceRaw);
                const classAttendance = allAttendance.filter((record) => studentIdSet.has(String(record.student)));
                const attendanceByStudent = new Map<string, { total: number; presentLike: number }>();
                classAttendance.forEach((record) => {
                    const studentId = String(record.student);
                    const current = attendanceByStudent.get(studentId) || { total: 0, presentLike: 0 };
                    current.total += 1;
                    if (record.status === 'present' || record.status === 'late') current.presentLike += 1;
                    attendanceByStudent.set(studentId, current);
                });

                const rows: StudentRow[] = classStudents.map((student) => {
                    const studentId = String(student.id || student.student_id || '');
                    const attendanceStats = attendanceByStudent.get(studentId);
                    const attendancePct = attendanceStats && attendanceStats.total > 0
                        ? Math.round((attendanceStats.presentLike / attendanceStats.total) * 100)
                        : 0;

                    const scores = scoresByStudent.get(studentId) || [];
                    const averageScorePct = scores.length > 0
                        ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
                        : null;

                    const completedAssignments = completedAssignmentsByStudent.get(studentId)?.size || 0;
                    const totalAssignments = assignmentIdSet.size;
                    const completionRatio = totalAssignments > 0 ? completedAssignments / totalAssignments : 1;

                    let risk: StudentRow['risk'] = 'low';
                    if (
                        (averageScorePct !== null && averageScorePct < 60)
                        || attendancePct < 75
                        || completionRatio < 0.5
                    ) {
                        risk = 'high';
                    } else if (
                        (averageScorePct !== null && averageScorePct < 75)
                        || attendancePct < 85
                        || completionRatio < 0.8
                    ) {
                        risk = 'medium';
                    }

                    return {
                        student,
                        attendancePct,
                        averageScorePct,
                        completedAssignments,
                        totalAssignments,
                        risk,
                    };
                });
                setStudentRows(rows);

                const lessonBatches = await Promise.all(
                    classSubjects.map(async (subject) => {
                        const subjectLessons = toList<Lesson>(
                            await academicAPI.getLessons(undefined, Number(subject.id)).catch(() => [])
                        );
                        return subjectLessons.map((lesson) => ({
                            ...lesson,
                            subjectId: Number(subject.id),
                            subjectName: subject.name,
                        }));
                    })
                );
                const lessonMap = new Map<number, LessonRow>();
                lessonBatches.flat().forEach((lesson) => lessonMap.set(lesson.id, lesson));
                setLessons(Array.from(lessonMap.values()));

                if (normalizedScores.length > 0) {
                    const classAverage = Math.round(normalizedScores.reduce((sum, score) => sum + score, 0) / normalizedScores.length);
                    const highestScore = Math.round(Math.max(...normalizedScores));
                    const atRiskCount = rows.filter((row) => row.risk === 'high').length;

                    const distribution = [
                        { range: 'A (90-100)', count: normalizedScores.filter((score) => score >= 90).length, fill: '#4ade80' },
                        { range: 'B (80-89)', count: normalizedScores.filter((score) => score >= 80 && score < 90).length, fill: '#60a5fa' },
                        { range: 'C (70-79)', count: normalizedScores.filter((score) => score >= 70 && score < 80).length, fill: '#facc15' },
                        { range: 'D (60-69)', count: normalizedScores.filter((score) => score >= 60 && score < 70).length, fill: '#fb923c' },
                        { range: 'F (<60)', count: normalizedScores.filter((score) => score < 60).length, fill: '#f87171' },
                    ];

                    const trend = classAssessments
                        .map((assessment) => {
                            const scores = classResults
                                .filter((result) => String(result.assessment) === String(assessment.assessment_id))
                                .map((result) => {
                                    const total = Number(assessment.total_marks || 0);
                                    return total > 0 ? (Number(result.score || 0) / total) * 100 : null;
                                })
                                .filter((score): score is number => typeof score === 'number' && Number.isFinite(score));
                            if (scores.length === 0) return null;
                            return {
                                name: assessment.title,
                                avg: Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length),
                            };
                        })
                        .filter((item): item is { name: string; avg: number } => item !== null)
                        .slice(0, 8);

                    setMetrics({ classAverage, highestScore, atRiskCount, distribution, trend });
                } else {
                    setMetrics({
                        classAverage: 0,
                        highestScore: 0,
                        atRiskCount: rows.filter((row) => row.risk === 'high').length,
                        distribution: [],
                        trend: [],
                    });
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, [classId]);

    const activeLessons = useMemo(() => lessons.filter((lesson) => lesson.is_published).length, [lessons]);
    const subjectMap = useMemo(() => new Map(subjects.map((subject) => [Number(subject.id), subject.name])), [subjects]);

    if (loading) return <div className="p-8 text-center text-muted-foreground">Loading class details...</div>;
    if (!classroom) return <div className="p-8">Class not found or not assigned to you.</div>;

    return (
        <div className="p-6 md:p-8 min-h-screen bg-gray-50/50">
            <Link href="/teacher/classes" className="inline-flex items-center text-sm text-slate-500 hover:text-indigo-600 mb-6 transition-colors">
                <ChevronLeft className="h-4 w-4 mr-1" /> Back to Classes
            </Link>

            <header className="flex justify-between items-start mb-8">
                <div>
                    <Badge variant="outline" className="mb-2 bg-white text-slate-600 font-normal border-slate-200">
                        Assigned Class
                    </Badge>
                    <h1 className="text-3xl font-bold text-gray-900">{classroom.name}</h1>
                    <p className="text-muted-foreground mt-1">
                        {students.length} students • {subjects.length} subjects • {activeLessons}/{lessons.length} lessons published
                    </p>
                </div>
                <div className="flex gap-2">
                    <Link href="/teacher/analytics">
                        <Button variant="outline"><BrainCircuit className="h-4 w-4 mr-2" /> AI Analytics</Button>
                    </Link>
                </div>
            </header>

            <Tabs defaultValue="students" className="space-y-6">
                <TabsList className="bg-white p-1 border shadow-sm rounded-lg h-auto">
                    <TabsTrigger value="students" className="px-4 py-2 text-sm data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700">
                        <Users className="h-4 w-4 mr-2" /> Students
                    </TabsTrigger>
                    <TabsTrigger value="lessons" className="px-4 py-2 text-sm data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700">
                        <BookOpen className="h-4 w-4 mr-2" /> Lessons
                    </TabsTrigger>
                    <TabsTrigger value="assignments" className="px-4 py-2 text-sm data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700">
                        <ClipboardList className="h-4 w-4 mr-2" /> Work & Assessments
                    </TabsTrigger>
                    <TabsTrigger value="analytics" className="px-4 py-2 text-sm data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700">
                        <BarChart2 className="h-4 w-4 mr-2" /> Analytics
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="students" className="animate-in fade-in-50">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-lg">Class Roster ({studentRows.length})</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-500 border-b">
                                        <tr>
                                            <th className="p-4 font-medium">Student Name</th>
                                            <th className="p-4 font-medium">Attendance</th>
                                            <th className="p-4 font-medium">Avg Score</th>
                                            <th className="p-4 font-medium">Assignments</th>
                                            <th className="p-4 font-medium">Risk Level</th>
                                            <th className="p-4 font-medium text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {studentRows.map((row) => (
                                            <tr key={row.student.id} className="hover:bg-slate-50/50">
                                                <td className="p-4 font-medium text-gray-900">{row.student.first_name} {row.student.last_name}</td>
                                                <td className="p-4 text-slate-600">{row.attendancePct > 0 ? `${row.attendancePct}%` : '-'}</td>
                                                <td className="p-4 text-slate-600">
                                                    {row.averageScorePct !== null ? `${row.averageScorePct}%` : '-'}
                                                </td>
                                                <td className="p-4 text-slate-600">
                                                    {row.totalAssignments > 0
                                                        ? `${row.completedAssignments}/${row.totalAssignments}`
                                                        : '-'}
                                                </td>
                                                <td className="p-4">
                                                    {row.risk === 'high' ? (
                                                        <div className="flex items-center text-red-600 gap-1 text-xs font-bold">
                                                            <AlertCircle className="h-3 w-3" /> High Risk
                                                        </div>
                                                    ) : row.risk === 'medium' ? (
                                                        <div className="flex items-center text-orange-600 gap-1 text-xs font-bold">
                                                            <AlertCircle className="h-3 w-3" /> Medium Risk
                                                        </div>
                                                    ) : (
                                                        <span className="text-emerald-600 text-xs font-semibold">Low Risk</span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-right">
                                                    <Link href="/teacher/students">
                                                        <Button variant="ghost" size="sm" className="text-indigo-600">View</Button>
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                        {studentRows.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="p-8 text-center text-slate-500">No students assigned to this class.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="lessons">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-lg">Lessons & Content</CardTitle>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm"><BrainCircuit className="h-3.5 w-3.5 mr-2 text-indigo-500" /> AI Outline</Button>
                                <Link href={`/teacher/classes/${id}/lessons/new`}>
                                    <Button size="sm"><Plus className="h-4 w-4 mr-2" /> Create Lesson</Button>
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {lessons.map((lesson) => (
                                    <div key={lesson.id} className="flex items-center justify-between p-4 border rounded-lg hover:border-indigo-300 transition-colors bg-white">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                                                <FileText className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-gray-900">{lesson.title}</h4>
                                                <p className="text-xs text-muted-foreground">
                                                    {lesson.subjectName} • Updated {new Date(lesson.updated_at || lesson.created_at || '').toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <Badge variant={lesson.is_published ? 'default' : 'secondary'}>
                                                {lesson.is_published ? 'Published' : 'Draft'}
                                            </Badge>
                                            <Link href={`/teacher/courses/${lesson.subjectId}/lessons/${lesson.id}`}>
                                                <Button variant="ghost" size="sm">Edit</Button>
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                                {lessons.length === 0 && (
                                    <div className="p-8 text-center text-muted-foreground border rounded-lg border-dashed">
                                        No lessons created for this class yet.
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="assignments">
                    {assessments.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground border rounded-lg border-dashed">
                            <p className="mb-4">No assessments or assignments published for this class.</p>
                            <Link href={`/teacher/classes/${id}/assignments/new`}>
                                <Button className="bg-indigo-600 hover:bg-indigo-700">
                                    <Plus className="h-4 w-4 mr-2" /> Create Assignment
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="text-lg">Assigned Work & Assessments</CardTitle>
                                <Link href={`/teacher/classes/${id}/assignments/new`}>
                                    <Button size="sm"><Plus className="h-4 w-4 mr-2" /> Create Assignment</Button>
                                </Link>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {assessments.map((assessment) => (
                                        <div key={assessment.id} className="flex items-center justify-between p-4 border rounded-lg hover:border-indigo-300 transition-colors bg-white">
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                                                    <ClipboardList className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-gray-900">{assessment.title}</h4>
                                                    <p className="text-xs text-muted-foreground">
                                                        {subjectMap.get(Number(assessment.subject)) || 'Subject'} • {assessment.type} • Marks: {assessment.total_marks}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <Badge variant="outline" className="capitalize">{assessment.type}</Badge>
                                                <Link href={`/teacher/grading/list?assessmentId=${assessment.assessment_id}`}>
                                                    <Button variant="ghost" size="sm">Grade</Button>
                                                </Link>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value="analytics">
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card>
                                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Class Average</CardTitle></CardHeader>
                                <CardContent><div className="text-2xl font-bold">{metrics.classAverage}%</div><p className="text-xs text-green-600 flex items-center mt-1"><TrendingUp className="h-3 w-3 mr-1" /> Across {assessments.length} items</p></CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Highest Score</CardTitle></CardHeader>
                                <CardContent><div className="text-2xl font-bold">{metrics.highestScore}%</div><p className="text-xs text-muted-foreground mt-1">Best class performance</p></CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">At Risk Students</CardTitle></CardHeader>
                                <CardContent><div className="text-2xl font-bold text-red-600">{metrics.atRiskCount}</div><p className="text-xs text-muted-foreground mt-1">Needs intervention</p></CardContent>
                            </Card>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Grade Distribution</CardTitle>
                                </CardHeader>
                                <CardContent className="h-[300px]">
                                    <SafeResponsiveContainer width="100%" height="100%">
                                        <BarChart data={metrics.distribution.length > 0 ? metrics.distribution : [{ range: 'No Data', count: 0, fill: '#eee' }]}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="range" fontSize={12} tickLine={false} axisLine={false} />
                                            <YAxis fontSize={12} tickLine={false} axisLine={false} />
                                            <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                            <Bar dataKey="count" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </SafeResponsiveContainer>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Performance Trend</CardTitle>
                                </CardHeader>
                                <CardContent className="h-[300px]">
                                    <SafeResponsiveContainer width="100%" height="100%">
                                        <LineChart data={metrics.trend.length > 0 ? metrics.trend : [{ name: 'No Data', avg: 0 }]}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                            <YAxis domain={[0, 100]} fontSize={12} tickLine={false} axisLine={false} />
                                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                            <Line type="monotone" dataKey="avg" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                                        </LineChart>
                                    </SafeResponsiveContainer>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
