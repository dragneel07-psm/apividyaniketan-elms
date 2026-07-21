// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Search, User,
    GraduationCap, MoreHorizontal
} from 'lucide-react';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { academicAPI, Student } from '@/lib/api';
import { StudentProfileOverviewDialog } from '@/components/student/student-profile-overview-dialog';

export default function TeacherStudentsPage() {
    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState<Student[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

    useEffect(() => {
        loadStudents();
    }, []);

    const loadStudents = async () => {
        try {
            setLoading(true);
            const data = await academicAPI.getStudents();
            setStudents(data);
        } catch (error) {
            console.error('Failed to load students:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredStudents = students.filter(student =>
        (student.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
        (student.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) || '')
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Students</h1>
                    <p className="text-slate-500">Manage and view profiles of students in your assigned classes.</p>
                </div>
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search by name or ID..."
                        className="pl-9 bg-white"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-12 text-slate-400">Loading students...</div>
            ) : filteredStudents.length === 0 ? (
                <div className="text-center p-12 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50">
                    <User className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-slate-900">No students found</h3>
                    <p className="text-slate-500 max-w-sm mx-auto mt-1">
                        {searchTerm ? 'Try adjusting your search terms.' : 'You don&apos;t have any students assigned yet.'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredStudents.map((student) => (
                        <Card key={student.id} className="group hover:shadow-md transition-all duration-200 border-slate-200">
                            <CardContent className="p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center border-2 border-white shadow-sm overflow-hidden">
                                        <User className="h-8 w-8 text-slate-400" />
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-slate-400 hover:text-indigo-600">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => setSelectedStudent(student)}>
                                                View Profile
                                            </DropdownMenuItem>
                                            <DropdownMenuItem>Message Parent</DropdownMenuItem>
                                            <DropdownMenuItem>View Attendance</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                <div className="mb-4">
                                    <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                        {student.first_name} {student.last_name}
                                    </h3>
                                    <p className="text-xs text-slate-500 font-mono mt-0.5">ID: {student.id?.substring(0, 8)}</p>
                                </div>

                                <div className="space-y-2 text-sm text-slate-600">
                                    <div className="flex items-center gap-2">
                                        <GraduationCap className="h-4 w-4 text-slate-400" />
                                        <span>Class: {student.academic_class || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant={student.is_active ? 'default' : 'secondary'} className={student.is_active ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-600'}>
                                            {student.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </div>
                                </div>

                                <Button
                                    className="w-full mt-6 bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 hover:border-indigo-200"
                                    onClick={() => setSelectedStudent(student)}
                                >
                                    View Profile
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <StudentProfileOverviewDialog
                student={selectedStudent}
                open={!!selectedStudent}
                onOpenChange={(open) => {
                    if (!open) setSelectedStudent(null);
                }}
            />
        </div>
    );
}
