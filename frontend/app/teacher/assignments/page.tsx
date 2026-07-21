// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    ClipboardList, Plus, Search, Calendar, Clock,
    ChevronRight, MoreVertical, CheckCircle
} from 'lucide-react';
import Link from 'next/link';
import { academicAPI, Assessment, Subject } from '@/lib/api';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

export default function TeacherAssignmentsPage() {
    const [loading, setLoading] = useState(true);
    const [assessments, setAssessments] = useState<Assessment[]>([]);
    const [courses, setCourses] = useState<Subject[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [assessmentsData, coursesData] = await Promise.all([
                academicAPI.getAssessments().catch(() => []),
                academicAPI.getSubjects().catch(() => [])
            ]);
            setAssessments(assessmentsData);
            setCourses(coursesData);
        } catch (error) {
            console.error('Failed to load assignments:', error);
        } finally {
            setLoading(false);
        }
    };

    const getCourseName = (id: number | string) => {
        const c = courses.find(c => c.id.toString() === id.toString());
        return c ? c.name : 'Unknown Course';
    };

    const getStatusColor = (dueDate?: string) => {
        if (!dueDate) return 'bg-slate-100 text-slate-600';
        const due = new Date(dueDate);
        const now = new Date();
        if (due < now) return 'bg-slate-100 text-slate-500'; // Past due
        const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 2) return 'bg-amber-100 text-amber-700'; // Due soon
        return 'bg-emerald-100 text-emerald-700'; // Active
    };

    const getStatusText = (dueDate?: string) => {
        if (!dueDate) return 'No Due Date';
        const due = new Date(dueDate);
        const now = new Date();
        if (due < now) return 'Closed';
        return 'Active';
    };

    const filteredAssessments = assessments.filter(a =>
        a.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Assignments</h1>
                    <p className="text-slate-500">Manage quizzes, exams, and homework for your classes.</p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Link href="/teacher/assignments/create">
                        <Button className="bg-indigo-600 hover:bg-indigo-700 shadow-sm w-full sm:w-auto">
                            <Plus className="h-4 w-4 mr-2" />
                            Create Assignment
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search assignments..."
                        className="pl-9 border-none bg-transparent focus-visible:ring-0"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* List */}
            {loading ? (
                <div className="text-center p-12 text-slate-400">Loading assignments...</div>
            ) : filteredAssessments.length === 0 ? (
                <div className="text-center p-16 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                    <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ClipboardList className="h-6 w-6 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900">No assignments created</h3>
                    <p className="text-slate-500 max-w-sm mx-auto mt-2 mb-6">
                        Get started by creating your first assignment, quiz, or exam for your students.
                    </p>
                    <Link href="/teacher/assignments/create">
                        <Button variant="outline">Create Now</Button>
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredAssessments.map((assessment) => (
                        <Card key={assessment.assessment_id} className="group hover:shadow-md transition-all duration-200 border-slate-200">
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start">
                                    <Badge variant="outline" className={`capitalize ${getStatusColor(assessment.due_date)} border-transparent`}>
                                        {getStatusText(assessment.due_date)}
                                    </Badge>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-slate-400 hover:text-slate-600">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem>Edit Details</DropdownMenuItem>
                                            <DropdownMenuItem>View Submissions</DropdownMenuItem>
                                            <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                                <CardTitle className="text-lg font-bold text-slate-900 mt-2 line-clamp-1">
                                    {assessment.title}
                                </CardTitle>
                                <CardDescription className="line-clamp-1 flex items-center gap-1">
                                    <span className="font-medium text-indigo-600">{getCourseName(assessment.subject)}</span>
                                    <span>•</span>
                                    <span className="capitalize">{assessment.type}</span>
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3 text-sm text-slate-600">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-slate-400" />
                                            <span>Due: {assessment.due_date ? new Date(assessment.due_date).toLocaleDateString() : 'No date'}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle className="h-4 w-4 text-slate-400" />
                                            <span>{assessment.total_marks} Points</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Clock className="h-4 w-4 text-slate-400" />
                                            <span>{assessment.duration_minutes} mins</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                                    <div className="flex -space-x-2">
                                        {[1, 2, 3].map((_, i) => (
                                            <div key={i} className="h-6 w-6 rounded-full bg-slate-200 border-2 border-white" />
                                        ))}
                                        <div className="h-6 w-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] text-slate-500 font-bold">
                                            +12
                                        </div>
                                    </div>
                                    <Link href={`/teacher/assignments/${assessment.assessment_id}`}>
                                        <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-0">
                                            View Details <ChevronRight className="h-4 w-4 ml-1" />
                                        </Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
