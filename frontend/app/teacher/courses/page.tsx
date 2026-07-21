// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    BookOpen, Users, FileText, ChevronRight,
    Search, Filter, Plus, Clock,
    CheckCircle2, AlertCircle, LayoutGrid, List
} from 'lucide-react';
import { academicAPI, Subject } from '@/lib/api';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

export default function TeacherCoursesPage() {
    const router = useRouter();
    const [courses, setCourses] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    useEffect(() => {
        async function loadCourses() {
            try {
                setLoading(true);
                const data = await academicAPI.getSubjects();
                setCourses(data);
            } catch (error) {
                console.error('Failed to load courses:', error);
                toast.error('Failed to load your assigned courses');
            } finally {
                setLoading(false);
            }
        }
        loadCourses();
    }, []);

    const filteredCourses = courses.filter(course =>
        course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.code?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Your Courses</h1>
                    <p className="text-slate-500 font-medium">Manage curriculum and track student progress</p>
                </div>
                <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2 h-11 rounded-xl px-6">
                    <Plus className="h-5 w-5" />
                    Request New Course
                </Button>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search courses..."
                        className="pl-10 h-10 border-slate-200 rounded-xl"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex bg-slate-100 p-1 rounded-xl border">
                        <Button
                            variant={viewMode === 'grid' ? 'white' as any : 'ghost'}
                            size="sm"
                            className={`h-8 w-8 p-0 rounded-lg ${viewMode === 'grid' ? 'shadow-sm bg-white' : ''}`}
                            onClick={() => setViewMode('grid')}
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={viewMode === 'list' ? 'white' as any : 'ghost'}
                            size="sm"
                            className={`h-8 w-8 p-0 rounded-lg ${viewMode === 'list' ? 'shadow-sm bg-white' : ''}`}
                            onClick={() => setViewMode('list')}
                        >
                            <List className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Grid View */}
            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredCourses.map(course => (
                        <Card key={course.id} className="group overflow-hidden border-slate-200 hover:border-indigo-500 hover:shadow-2xl transition-all duration-300 rounded-3xl cursor-pointer"
                            onClick={() => Link}>
                            <Link href={`/teacher/courses/${course.id}`} className="block">
                                <div className="h-32 bg-gradient-to-br from-indigo-500 to-violet-600 p-6 flex flex-col justify-between">
                                    <Badge className="bg-white/20 text-white border-none backdrop-blur-md self-start">
                                        {course.code || 'SUBJ'}
                                    </Badge>
                                    <div className="bg-white/10 h-12 w-12 rounded-2xl backdrop-blur-md flex items-center justify-center">
                                        <BookOpen className="h-6 w-6 text-white" />
                                    </div>
                                </div>
                                <CardContent className="p-6">
                                    <h3 className="text-xl font-bold text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors">
                                        {course.name}
                                    </h3>
                                    <p className="text-sm text-slate-500 mb-6 line-clamp-2">
                                        {course.description || 'Comprehensive curriculum covering all syllabus requirements and advanced concepts.'}
                                    </p>

                                    <div className="space-y-4 pt-4 border-t border-slate-50">
                                        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                            <span className="flex items-center gap-1">
                                                <Users className="h-3 w-3" /> 24 Students
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <FileText className="h-3 w-3" /> {course.total_lessons} Lessons
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex -space-x-2">
                                                {[1, 2, 3, 4].map(i => (
                                                    <div key={i} className="h-7 w-7 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                                        U{i}
                                                    </div>
                                                ))}
                                                <div className="h-7 w-7 rounded-full border-2 border-white bg-indigo-50 flex items-center justify-center text-[10px] font-bold text-indigo-600">
                                                    +20
                                                </div>
                                            </div>
                                            <Button variant="ghost" size="sm" className="text-indigo-600 font-bold p-0 h-auto hover:bg-transparent">
                                                Manage <ChevronRight className="h-4 w-4 ml-0.5" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Link>
                        </Card>
                    ))}
                </div>
            ) : (
                /* List View */
                <Card className="border-slate-100 shadow-sm overflow-hidden rounded-2xl">
                    <CardContent className="p-0">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase tracking-widest border-b">
                                <tr>
                                    <th className="px-6 py-4">Course Name</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Students</th>
                                    <th className="px-6 py-4 text-center">Lessons</th>
                                    <th className="px-6 py-4">Avg. Progress</th>
                                    <th className="px-6 py-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredCourses.map(course => (
                                    <tr key={course.id} className="hover:bg-slate-50/80 transition-colors group cursor-pointer" onClick={() => router.push(`/teacher/courses/${course.id}`)}>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                                                    <BookOpen className="h-5 w-5 text-indigo-600" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800">{course.name}</p>
                                                    <p className="text-xs text-slate-400">{course.code}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none font-bold text-[10px]">
                                                ACTIVE
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                                            24
                                        </td>
                                        <td className="px-6 py-4 text-center text-sm text-slate-600">
                                            {course.total_lessons}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="w-32">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-[10px] font-bold text-slate-400">{course.progress_percentage}%</span>
                                                </div>
                                                <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-indigo-500" style={{ width: `${course.progress_percentage}%` }} />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button variant="ghost" size="icon" className="group-hover:text-indigo-600">
                                                <ChevronRight className="h-5 w-5" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>
            )}

            {filteredCourses.length === 0 && (
                <div className="p-20 text-center border-2 border-dashed rounded-3xl border-slate-200">
                    <AlertCircle className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-slate-800">No courses found</h3>
                    <p className="text-slate-500 mb-6 max-w-xs mx-auto">
                        We couldn't find any courses matching your search or your assigned profile.
                    </p>
                    <Button variant="outline" onClick={() => setSearchQuery('')}>
                        Clear Search
                    </Button>
                </div>
            )}
        </div>
    );
}
