// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { academicAPI, AcademicClass, Section, Student, reportsAPI, downloadReport } from '@/lib/api';
import { toast } from 'sonner';
import { FileText, Download, Loader2, Users } from 'lucide-react';

export default function ReportCardGenerator() {
    const [classes, setClasses] = useState<AcademicClass[]>([]);
    const [sections, setSections] = useState<Section[]>([]);
    const [students, setStudents] = useState<Student[]>([]);

    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [selectedSectionId, setSelectedSectionId] = useState<string>('');
    const [selectedStudentId, setSelectedStudentId] = useState<string>('');

    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        loadClasses();
    }, []);

    useEffect(() => {
        if (selectedClassId) {
            const cls = classes.find(c => c.id.toString() === selectedClassId);
            setSections(cls?.sections || []);
            setSelectedSectionId('');
            setStudents([]);
        }
    }, [selectedClassId]);

    useEffect(() => {
        if (selectedSectionId) {
            loadStudents(selectedSectionId);
        }
    }, [selectedSectionId]);

    const loadClasses = async () => {
        try {
            const data = await academicAPI.getClasses();
            setClasses(data);
        } catch (error) {
            toast.error('Failed to load classes');
        }
    };

    const loadStudents = async (sectionId: string) => {
        setLoading(true);
        try {
            const data = await academicAPI.getStudents({ section_id: sectionId });
            setStudents(data);
        } catch (error) {
            toast.error('Failed to load students');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        if (!selectedStudentId) {
            toast.error('Please select a student');
            return;
        }

        setGenerating(true);
        try {
            await downloadReport(
                reportsAPI.getStudentPerformancePDF(selectedStudentId),
                `report_card_${selectedStudentId}.pdf`,
            );
            toast.success('Report downloaded');
        } catch (error) {
            console.error(error);
            toast.error('Failed to generate report');
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-indigo-100 rounded-lg">
                    <FileText className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Report Card Generator</h1>
                    <p className="text-slate-500">Generate AI-enhanced student performance reports.</p>
                </div>
            </div>

            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle>Select Student</CardTitle>
                    <CardDescription>Choose a class and section to find students.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Class</label>
                            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                                <SelectTrigger>
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
                            <label className="text-sm font-medium text-slate-700">Section</label>
                            <Select
                                value={selectedSectionId}
                                onValueChange={setSelectedSectionId}
                                disabled={!selectedClassId || sections.length === 0}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Section" />
                                </SelectTrigger>
                                <SelectContent>
                                    {sections.map(s => (
                                        <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Student</label>
                        <Select
                            value={selectedStudentId}
                            onValueChange={setSelectedStudentId}
                            disabled={!selectedSectionId}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder={loading ? "Loading students..." : "Select Student"} />
                            </SelectTrigger>
                            <SelectContent>
                                {students.map(s => (
                                    <SelectItem key={s.id} value={s.id}>
                                        {s.first_name} {s.last_name} ({s.student_id || 'No ID'})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="pt-4 flex justify-end">
                        <Button
                            onClick={handleGenerate}
                            disabled={!selectedStudentId || generating}
                            className="bg-indigo-600 hover:bg-indigo-700"
                        >
                            {generating ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...
                                </>
                            ) : (
                                <>
                                    <Download className="mr-2 h-4 w-4" /> Download Report Card (PDF)
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
