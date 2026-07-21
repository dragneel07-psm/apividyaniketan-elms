// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    BookOpen,
    Users,
    ClipboardList,
    Calendar,
    FileText,
    MessageSquare,
    User,
    LogOut,
    GraduationCap,
    School,
    Bell,
    Award,
    CalendarClock,
    BookMarked,
    BarChart2,
    ClipboardCheck,
    HelpCircle,
    MessageCircle,
    Video,
    FolderKanban,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const navigation = [
    { name: 'Dashboard',      href: '/teacher',              icon: LayoutDashboard },
    { name: 'Courses',        href: '/teacher/courses',      icon: BookOpen },
    { name: 'My Classes',     href: '/teacher/classes',      icon: School },
    { name: 'Students',       href: '/teacher/students',     icon: Users },
    { name: 'Attendance',     href: '/teacher/attendance',   icon: ClipboardCheck },
    { name: 'Assessments',    href: '/teacher/assessments',  icon: ClipboardList },
    { name: 'Assignments',    href: '/teacher/assignments',  icon: FileText },
    { name: 'Projects',       href: '/teacher/projects',     icon: FolderKanban },
    { name: 'Grading',        href: '/teacher/grading',      icon: Award },
    { name: 'Gradebook',      href: '/teacher/grades',       icon: GraduationCap },
    { name: 'Question Bank',  href: '/teacher/questions',    icon: HelpCircle },
    { name: 'Live Classes',   href: '/teacher/timetable',    icon: Video },
    { name: 'Student Leaves', href: '/teacher/leaves',       icon: CalendarClock },
    { name: 'Library',        href: '/teacher/library',      icon: BookMarked },
    { name: 'Notices',        href: '/teacher/notices',      icon: Bell },
    { name: 'Messages',       href: '/teacher/messages',     icon: MessageSquare },
    { name: 'Communication',  href: '/teacher/communication', icon: MessageCircle },
    { name: 'Reports',        href: '/teacher/reports',      icon: BarChart2 },
    { name: 'Profile',        href: '/teacher/profile',      icon: User },
];

import { useState, useEffect } from 'react';
import { usersAPI, User as UserType } from '@/lib/api';

export function TeacherSidebar() {
    const pathname = usePathname();
    const [user, setUser] = useState<UserType | null>(null);

    useEffect(() => {
        usersAPI.getMe().then(setUser).catch(console.error);
    }, []);

    let filteredNavigation = [...navigation];

    // Hide Projects when the tenant has the projects feature disabled.
    if (user?.tenant_features?.projects === false) {
        filteredNavigation = filteredNavigation.filter(n => n.name !== 'Projects');
    }

    // Insert Analytics before Library when feature is available
    if (user?.tenant_features?.teacher_reports !== false) {
        const libraryIndex = filteredNavigation.findIndex(n => n.name === 'Library');
        if (libraryIndex !== -1) {
            filteredNavigation.splice(libraryIndex, 0, { name: 'Analytics', href: '/teacher/analytics', icon: BarChart2 });
        } else {
            filteredNavigation.push({ name: 'Analytics', href: '/teacher/analytics', icon: BarChart2 });
        }
    }

    return (
        <div className="flex bg-white border-r border-slate-200 text-slate-600 w-64 min-h-screen flex-col shadow-sm">
            <div className="p-6">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                        <GraduationCap className="h-5 w-5 text-white" />
                    </div>
                    <span className="font-bold text-lg tracking-tight text-slate-900">Teacher Portal</span>
                </div>
            </div>

            <nav className="flex-1 px-4 space-y-1">
                {filteredNavigation.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/teacher' && pathname.startsWith(item.href));
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                                ? 'bg-indigo-50 text-indigo-700'
                                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                                }`}
                        >
                            <item.icon className={`h-5 w-5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-slate-100">
                <Button
                    variant="ghost"
                    className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50 gap-3"
                    onClick={() => window.location.href = '/login'}
                >
                    <LogOut className="h-5 w-5" />
                    Sign Out
                </Button>
            </div>
        </div>
    );
}
