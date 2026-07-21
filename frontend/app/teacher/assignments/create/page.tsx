// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { academicAPI, Subject, AcademicClass } from '@/lib/api';
import { toast } from 'sonner';

export default function CreateAssignmentPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [courses, setCourses] = useState<Subject[]>([]);
    const [classes, setClasses] = useState<AcademicClass[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>('');

    // Default to current date-time string for input
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const defaultDate = now.toISOString().slice(0, 16);

    type AssessmentType = 'assignment' | 'quiz' | 'exam';

    const [formData, setFormData] = useState<{
        title: string;
        description: string;
        subject: string;
        type: AssessmentType;
        total_marks: number;
        due_date: string;
        duration_minutes: number;
        blooms_level: string;
    }>({
        title: '',
        description: '',
        subject: '',
        type: 'assignment',
        total_marks: 100,
        due_date: defaultDate,
        duration_minutes: 60,
        blooms_level: 'apply'
    });

    useEffect(() => {
        const loadData = async () => {
            try {
                // 1. Get current user's teacher profile and all classes in parallel
                const [myTeacherProfile, allClasses] = await Promise.all([
                    academicAPI.getMyTeacherProfile(),
                    academicAPI.getClasses(),
                ]);

                const myClasses = allClasses.filter(c =>
                    myTeacherProfile.assigned_classes?.includes(c.id)
                );
                setClasses(myClasses);

                // 3. Get all courses (we'll filter them locally based on selected class)
                const allCourses = await academicAPI.getSubjects();
                setCourses(allCourses);

            } catch (error) {
                console.error("Failed to load initial data", error);
                toast.error('Failed to load classes and subjects');
            }
        };
        loadData();
    }, []);

    // Filter courses based on selected class
    const filteredCourses = selectedClassId
        ? courses.filter(c => c.academic_class.toString() === selectedClassId)
        : [];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedClassId || !formData.subject) {
            toast.error('Please select both class and subject');
            return;
        }
        setLoading(true);
        try {
            const response = await academicAPI.createAssessment({
                ...formData,
                due_date: new Date(formData.due_date).toISOString(),
                passing_marks: Math.round(formData.total_marks * 0.4) // Default 40%
            });
            toast.success('Assignment created successfully');

            if (formData.type === 'quiz' || formData.type === 'exam') {
                router.push(`/teacher/assignments/${response.assessment_id}/questions`);
            } else {
                router.push('/teacher/assignments');
            }
        } catch (error: unknown) {
            console.error('Failed to create assignment:', error);
            const message = error instanceof Error ? error.message : 'Failed to create assignment';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Create New Assignment</h1>
                    <p className="text-slate-500">Set up tasks, quizzes, or exams for your students.</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Assignment Details</CardTitle>
                    <CardDescription>Fill in the basic information for this assessment.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="title">Title <span className="text-red-500">*</span></Label>
                            <Input
                                id="title"
                                required
                                placeholder="E.g., Mid-term Physics Quiz"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Class Selection */}
                            <div className="space-y-2">
                                <Label htmlFor="class">Class <span className="text-red-500">*</span></Label>
                                <Select
                                    value={selectedClassId}
                                    onValueChange={(val) => {
                                        setSelectedClassId(val);
                                        setFormData({ ...formData, subject: '' }); // Reset course when class changes
                                    }}
                                    required
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Class" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {classes.length > 0 ? (
                                            classes.map(c => (
                                                <SelectItem key={c.id} value={c.id.toString()}>
                                                    {c.name}
                                                </SelectItem>
                                            ))
                                        ) : (
                                            <div className="p-2 text-sm text-muted-foreground">No classes assigned</div>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Course Selection */}
                            <div className="space-y-2">
                                <Label htmlFor="course">Course (Subject) <span className="text-red-500">*</span></Label>
                                <Select
                                    value={formData.subject}
                                    onValueChange={(val) => setFormData({ ...formData, subject: val })}
                                    required
                                    disabled={!selectedClassId}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={selectedClassId ? "Select Subject" : "Select Class First"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {filteredCourses.length > 0 ? (
                                            filteredCourses.map(c => (
                                                <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                                            ))
                                        ) : (
                                            <div className="p-2 text-sm text-muted-foreground">No courses found for this class</div>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="type">Type</Label>
                            <Select
                                value={formData.type}
                                onValueChange={(val) =>
                                    setFormData({ ...formData, type: val as AssessmentType })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="assignment">Assignment</SelectItem>
                                    <SelectItem value="quiz">Quiz</SelectItem>
                                    <SelectItem value="exam">Exam</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Instructions / Description</Label>
                            <Textarea
                                id="description"
                                placeholder="Provide clear instructions for the students..."
                                className="h-32"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <Label>Due Date</Label>
                                <Input
                                    type="datetime-local"
                                    value={formData.due_date}
                                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Total Marks</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    value={formData.total_marks}
                                    onChange={(e) => setFormData({ ...formData, total_marks: parseInt(e.target.value) })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Duration (Minutes)</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    value={formData.duration_minutes}
                                    onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                                />
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end gap-3">
                            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
                            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {formData.type === 'quiz' || formData.type === 'exam' ? 'Next: Add Questions' : 'Create Assignment'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
