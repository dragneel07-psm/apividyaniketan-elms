// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Users, GraduationCap, Clock, School } from 'lucide-react';
import { academicAPI, TeacherProfileOverview } from '@/lib/api';

export function TeacherAcademicDetails() {
    const [profile, setProfile] = useState<TeacherProfileOverview | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadProfile = async () => {
            try {
                // /teachers/me/ returns the bare Teacher row; the enriched
                // overview with subjects / class_sections_progress / summary
                // lives behind /teachers/:id/profile-overview/.
                const me = await academicAPI.getMyTeacherProfile();
                const overview = await academicAPI.getTeacherProfileOverview(me.id);
                setProfile(overview);
            } catch (error) {
                console.error("Failed to load teacher academic profile", error);
            } finally {
                setLoading(false);
            }
        };
        loadProfile();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!profile) {
        return null;
    }

    return (
        <div className="space-y-6 mt-8 animate-in fade-in duration-500">
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                <GraduationCap className="h-6 w-6 text-indigo-400" />
                Academic Assignments
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-white/5 border-white/10 text-white shadow-lg backdrop-blur-sm">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-slate-400 font-bold uppercase text-[10px] tracking-widest flex items-center gap-1">
                            <BookOpen className="h-3 w-3 text-indigo-400"/> Total Subjects
                        </CardDescription>
                        <CardTitle className="text-3xl font-black">{profile.summary?.total_subjects || 0}</CardTitle>
                    </CardHeader>
                </Card>
                <Card className="bg-white/5 border-white/10 text-white shadow-lg backdrop-blur-sm">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-slate-400 font-bold uppercase text-[10px] tracking-widest flex items-center gap-1">
                            <Users className="h-3 w-3 text-emerald-400"/> Assigned Classes
                        </CardDescription>
                        <CardTitle className="text-3xl font-black">{profile.summary?.total_classes || 0}</CardTitle>
                    </CardHeader>
                </Card>
                <Card className="bg-white/5 border-white/10 text-white shadow-lg backdrop-blur-sm">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-slate-400 font-bold uppercase text-[10px] tracking-widest flex items-center gap-1">
                            <Clock className="h-3 w-3 text-amber-400"/> Lessons Delivered
                        </CardDescription>
                        <CardTitle className="text-3xl font-black">{profile.summary?.taught_lessons || 0}</CardTitle>
                    </CardHeader>
                </Card>
                <Card className="bg-white/5 border-white/10 text-white shadow-lg backdrop-blur-sm">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-slate-400 font-bold uppercase text-[10px] tracking-widest flex items-center gap-1">
                            <School className="h-3 w-3 text-rose-400"/> Class Teacher Of
                        </CardDescription>
                        <CardTitle className="text-3xl font-black">{profile.summary?.total_classes_as_class_teacher || 0}</CardTitle>
                    </CardHeader>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-white/5 border-white/10 text-white shadow-lg backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-lg">Taught Subjects</CardTitle>
                        <CardDescription className="text-slate-400">All subjects you are currently instructing</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {(!profile.subjects || profile.subjects.length === 0) ? (
                            <p className="text-slate-500 text-sm">No subjects currently assigned.</p>
                        ) : (
                            profile.subjects.map((subj, idx) => (
                                <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between hover:bg-white/10 transition-colors">
                                    <div>
                                        <div className="font-bold text-white mb-1 flex items-center gap-2">
                                            {subj.subject_name}
                                            {subj.subject_code && <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded uppercase tracking-wider">{subj.subject_code}</span>}
                                        </div>
                                        <div className="text-sm text-slate-400">
                                            Class: <span className="text-slate-300">{subj.class_name} ({subj.section_names?.join(', ') || 'All Sections'})</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <Badge variant="outline" className="border-indigo-500/50 text-indigo-300 bg-indigo-500/10 uppercase text-[10px]">
                                            {subj.role === 'lead_teacher' ? 'Lead' : 'Assistant'}
                                        </Badge>
                                        <div className="text-[10px] text-slate-500 mt-1">
                                            {subj.taught_lessons}/{subj.total_lessons} Lessons
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10 text-white shadow-lg backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-lg">Class Sections</CardTitle>
                        <CardDescription className="text-slate-400">Classes and sections assigned to you</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {(!profile.class_sections_progress || profile.class_sections_progress.length === 0) ? (
                            <p className="text-slate-500 text-sm">No classes currently assigned.</p>
                        ) : (
                            profile.class_sections_progress.map((cls, idx) => (
                                <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="font-bold text-lg text-white">
                                            {cls.class_name} <span className="text-slate-400 text-sm font-normal">({cls.section_names?.join(', ') || 'All'})</span>
                                        </div>
                                        {cls.is_class_teacher && (
                                            <Badge className="bg-emerald-500/20 text-emerald-400 border-none hover:bg-emerald-500/30 text-[10px]">
                                                Class Teacher
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        {cls.subjects?.map((s, i) => (
                                            <Badge key={i} variant="outline" className="bg-slate-800/50 text-slate-300 border-slate-700">
                                                {s.subject_name}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
