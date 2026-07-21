// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { academicAPI, Subject } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
    LayoutDashboard,
    BookOpen,
    Users,
    Settings,
    BarChart3,
    ArrowLeft,
    Eye
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function CourseLayout({ children }: { children: React.ReactNode }) {
    const params = useParams();
    const pathname = usePathname();
    const router = useRouter();
    const courseId = params.courseId as string;

    const [subject, setSubject] = useState<Subject | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadCourse = async () => {
            try {
                const data = await academicAPI.getSubject(parseInt(courseId));
                setSubject(data);
            } catch (error) {
                console.error("Failed to load course", error);
                // toast.error("Failed to load course details"); 
                // Don't toast here to avoid duplicates if page.tsx also loads it
            } finally {
                setLoading(false);
            }
        };
        loadCourse();
    }, [courseId]);

    const navItems = [
        { label: 'Overview', href: `/teacher/courses/${courseId}`, icon: LayoutDashboard, exact: true },
        { label: 'Curriculum', href: `/teacher/courses/${courseId}/curriculum`, icon: BookOpen },
        { label: 'Students', href: `/teacher/courses/${courseId}/students`, icon: Users },
        { label: 'Analytics', href: `/teacher/courses/${courseId}/analytics`, icon: BarChart3 },
        { label: 'Settings', href: `/teacher/courses/${courseId}/settings`, icon: Settings },
    ];

    const isActive = (href: string, exact: boolean = false) => {
        if (exact) return pathname === href;
        return pathname.startsWith(href);
    };

    return (
        <div className="flex flex-col min-h-screen bg-slate-50/50">
            {/* Course Header */}
            <header className="bg-white border-b px-6 py-4 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => router.push('/teacher/courses')}
                                className="rounded-full hover:bg-slate-100 text-slate-500"
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            <div>
                                {loading ? (
                                    <div className="h-8 w-48 bg-slate-100 animate-pulse rounded-md mb-1" />
                                ) : (
                                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                                        {subject?.name || 'Loading Course...'}
                                    </h1>
                                )}
                                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                                    <span className="uppercase tracking-wider">Course Studio</span>
                                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                                    <span className={subject?.is_active ? "text-emerald-600" : "text-amber-600"}>
                                        {subject?.is_active ? 'Published' : 'Draft'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Link href={`/student/courses/${courseId}/lessons`}>
                                <Button variant="outline" size="sm" className="gap-2 hidden sm:flex">
                                    <Eye className="h-4 w-4" /> Student View
                                </Button>
                            </Link>
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <nav className="flex items-center gap-1 overflow-x-auto pb-1 -mb-px">
                        {navItems.map((item) => (
                            <Link key={item.href} href={item.href}>
                                <div
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap",
                                        isActive(item.href, item.exact)
                                            ? "bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200"
                                            : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                                    )}
                                >
                                    <item.icon className={cn("h-4 w-4", isActive(item.href, item.exact) ? "text-indigo-600" : "text-slate-400")} />
                                    {item.label}
                                </div>
                            </Link>
                        ))}
                    </nav>
                </div>
            </header>

            {/* Content Area */}
            <main className="flex-1 max-w-7xl mx-auto w-full">
                {children}
            </main>
        </div>
    );
}
