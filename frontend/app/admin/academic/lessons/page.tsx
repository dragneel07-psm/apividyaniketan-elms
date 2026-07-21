// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Trash2, Search, Loader2, Eye } from 'lucide-react';
import { academicAPI, Lesson, Subject } from '@/lib/api';
import Link from 'next/link';

export default function LessonPlanReviewPage() {
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const [lessonsData, subjectsData] = await Promise.all([
                academicAPI.getLessons(),
                academicAPI.getSubjects()
            ]);
            setLessons(lessonsData);
            setSubjects(subjectsData);
        } catch (error) {
            console.error('Failed to load data', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(id: number) {
        if (!confirm('Are you sure you want to delete this lesson?')) return;
        try {
            await academicAPI.deleteLesson(id);
            loadData();
        } catch (error) {
            console.error('Failed to delete lesson', error);
        }
    }

    const getSubjectName = (id: string | number) => {
        const s = subjects.find(sub => sub.id.toString() === id.toString());
        return s ? s.name : 'Unknown Subject';
    };

    const filteredLessons = lessons.filter(l =>
        l.title.toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen dark:bg-slate-900">
            {/* Header */}
            <header className="flex items-center justify-between border-b pb-6">
                <div className="flex items-center gap-4">
                    <Link href="/admin/academic">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Lesson Plans</h1>
                        <p className="text-slate-500 text-sm">Review teaching materials and content coverage.</p>
                    </div>
                </div>
            </header>

            {/* Content */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Submitted Lesson Plans</CardTitle>
                        <div className="relative w-72">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search lessons..."
                                className="pl-8"
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>Subject</TableHead>
                                <TableHead>Content Type</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8">
                                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-400" />
                                    </TableCell>
                                </TableRow>
                            ) : filteredLessons.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                        No lessons found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredLessons.map((l) => (
                                    <TableRow key={l.id}>
                                        <TableCell className="font-medium text-slate-800">
                                            {l.title}
                                        </TableCell>
                                        <TableCell>
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-800">
                                                {/* Lesson doesn't have direct course/subject link in the basic Lesson interface */}
                                                Chapter {l.chapter}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm text-slate-600">{l.duration_minutes} mins</span>
                                        </TableCell>
                                        <TableCell className="text-right flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600">
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => handleDelete(l.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
