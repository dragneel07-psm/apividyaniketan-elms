// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle, XCircle, Clock, Save, ArrowLeft } from 'lucide-react';
import { academicAPI, AcademicClass, Student, Attendance, Subject } from '@/lib/api';
import Link from 'next/link';
import { toast } from 'sonner';

export default function AttendancePage() {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [classes, setClasses] = useState<AcademicClass[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
    const [students, setStudents] = useState<Student[]>([]);
    const [attendanceData, setAttendanceData] = useState<Record<string, 'present' | 'absent' | 'late'>>({});
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        async function loadClasses() {
            try {
                // In a real app, filtering by teacher's assigned classes would happen here or in backend
                const classList = await academicAPI.getClasses();
                setClasses(classList);
                if (classList.length > 0) {
                    setSelectedClassId(classList[0].id.toString());
                }
            } catch (error) {
                console.error("Failed to load classes", error);
                toast.error('Failed to load classes');
            } finally {
                setLoading(false);
            }
        }
        loadClasses();
    }, []);

    useEffect(() => {
        if (!selectedClassId) return;

        // Find selected class and set its subjects
        const cls = classes.find(c => c.id.toString() === selectedClassId);
        if (cls && cls.subjects) {
            setSubjects(cls.subjects);
            if (cls.subjects.length > 0) {
                setSelectedSubjectId(cls.subjects[0].id.toString());
            } else {
                setSelectedSubjectId('');
            }
        }

        async function loadStudents() {
            setLoading(true);
            try {
                // Fetch all students and filter by class (backend filtering preferred)
                const allStudents = await academicAPI.getStudents();
                const classStudents = allStudents.filter((s: Student) => s.academic_class?.toString() === selectedClassId);
                setStudents(classStudents);

                // Initialize attendance as 'present' for all
                const initialData: Record<string, 'present' | 'absent' | 'late'> = {};
                classStudents.forEach((s: Student) => {
                    initialData[s.id] = 'present';
                });
                setAttendanceData(initialData);
            } catch (error) {
                console.error("Failed to load students", error);
                toast.error('Failed to load students');
            } finally {
                setLoading(false);
            }
        }
        loadStudents();
    }, [selectedClassId, classes]);

    const handleStatusChange = (studentId: string, status: 'present' | 'absent' | 'late') => {
        setAttendanceData(prev => ({
            ...prev,
            [studentId]: status
        }));
    };

    const submitAttendance = async () => {
        setSubmitting(true);
        try {
            if (!selectedSubjectId) {
                toast.error('Please select a subject');
                setSubmitting(false);
                return;
            }

            const promises = students.map(student => {
                const payload = {
                    student: student.id,
                    subject: parseInt(selectedSubjectId),
                    date: date,
                    status: attendanceData[student.id],
                    remarks: ''
                };
                return academicAPI.createAttendance(payload);
            });

            await Promise.all(promises);
            toast.success('Attendance submitted successfully');
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            toast.error(`Failed to submit attendance: ${message}`);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto p-4">
            <div className="flex items-center gap-4 mb-6">
                <Link href="/teacher">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Daily Attendance</h1>
                    <p className="text-slate-500">Mark attendance for your classes</p>
                </div>
            </div>

            <Card className="border-none shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <CardTitle className="text-base font-semibold">
                        Select Class & Date
                    </CardTitle>
                    <div className="flex gap-4">
                        <input
                            type="date"
                            className="border rounded-md px-3 py-2 text-sm"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                        />
                        <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Select Class" />
                            </SelectTrigger>
                            <SelectContent>
                                {classes.map(c => (
                                    <SelectItem key={c.id} value={c.id.toString()}>
                                        {c.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Select Subject" />
                            </SelectTrigger>
                            <SelectContent>
                                {subjects.map(s => (
                                    <SelectItem key={s.id} value={s.id.toString()}>
                                        {s.name}
                                    </SelectItem>
                                ))}
                                {subjects.length === 0 && <SelectItem value="none" disabled>No subjects</SelectItem>}
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                        </div>
                    ) : students.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            No students found in this class.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border text-sm font-medium text-slate-600">
                                <span>Student Name</span>
                                <span>Status</span>
                            </div>

                            <div className="space-y-2">
                                {students.map(student => (
                                    <div key={student.id} className="flex justify-between items-center p-3 rounded-lg border hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                                                {student.first_name?.[0]}{student.last_name?.[0]}
                                            </div>
                                            <div>
                                                <div className="font-medium text-slate-900">{student.first_name} {student.last_name}</div>
                                                <div className="text-xs text-slate-500">{student.username}</div>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant={attendanceData[student.id] === 'present' ? 'default' : 'outline'}
                                                className={attendanceData[student.id] === 'present' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                                                onClick={() => handleStatusChange(student.id, 'present')}
                                            >
                                                <CheckCircle className="h-4 w-4 mr-1" /> Present
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant={attendanceData[student.id] === 'late' ? 'default' : 'outline'}
                                                className={attendanceData[student.id] === 'late' ? 'bg-amber-500 hover:bg-amber-600' : ''}
                                                onClick={() => handleStatusChange(student.id, 'late')}
                                            >
                                                <Clock className="h-4 w-4 mr-1" /> Late
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant={attendanceData[student.id] === 'absent' ? 'default' : 'outline'}
                                                className={attendanceData[student.id] === 'absent' ? 'bg-red-600 hover:bg-red-700' : ''}
                                                onClick={() => handleStatusChange(student.id, 'absent')}
                                            >
                                                <XCircle className="h-4 w-4 mr-1" /> Absent
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="pt-6 border-t mt-6 flex justify-end">
                                <Button size="lg" onClick={submitAttendance} disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700">
                                    {submitting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Save className="h-5 w-5 mr-2" />}
                                    Submit Attendance
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
