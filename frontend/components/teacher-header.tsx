// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';
import { User, usersAPI, academicAPI } from '@/lib/api';
import { NotificationBell } from './notification-bell';

export function TeacherHeader() {
    const [user, setUser] = useState<User | null>(null);
    const [academicYear, setAcademicYear] = useState<string>('N/A');

    useEffect(() => {
        usersAPI.getMe()
            .then((me) => setUser(me))
            .catch((err) => console.error('Failed to load teacher profile for header', err));

        academicAPI.getAcademicYears()
            .then((years) => {
                const current = years.find((year) => year.is_current);
                if (current?.name) setAcademicYear(current.name);
            })
            .catch((err) => console.error('Failed to load academic year for header', err));
    }, []);

    const quarter = useMemo(() => {
        const month = new Date().getMonth();
        return `Q${Math.floor(month / 3) + 1}`;
    }, []);

    const displayName = user?.first_name || 'T';

    return (
        <header className="sticky top-0 z-30 bg-white border-b h-16 px-6 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-8">
                <Link href="/teacher" className="font-bold text-xl text-indigo-700 hidden md:block">Teacher Portal</Link>
                <nav className="hidden md:flex items-center gap-1.5 p-1 bg-slate-100/50 backdrop-blur-sm rounded-full border border-slate-200/60 max-w-fit">
                    {[
                        { name: 'Dashboard', href: '/teacher', exact: true },
                        { name: 'Classes', href: '/teacher/classes' },
                        { name: 'Analytics', href: '/teacher/analytics' },
                    ].map((item) => (
                        <Link
                            key={item.name}
                            href={item.href}
                            className="px-4 py-1.5 rounded-full text-sm font-medium text-slate-600 hover:text-indigo-700 hover:bg-white hover:shadow-sm transition-all duration-200"
                        >
                            {item.name}
                        </Link>
                    ))}
                </nav>
            </div>

            <div className="flex items-center gap-6">
                <div className="hidden md:flex items-center gap-2 text-sm bg-slate-50 px-3 py-1.5 rounded-md border">
                    <span className="text-muted-foreground">Year:</span>
                    <span className="font-medium">{academicYear}</span>
                </div>
                <div className="hidden md:flex items-center gap-2 text-sm bg-slate-50 px-3 py-1.5 rounded-md border">
                    <span className="text-muted-foreground">Term:</span>
                    <span className="font-medium">{quarter}</span>
                </div>

                <div className="h-6 w-px bg-slate-200 hidden md:block"></div>

                <div className="flex items-center gap-3">
                    <NotificationBell />
                    <Button variant="ghost" size="sm" className="hidden md:flex gap-1 text-slate-600">
                        <Globe className="h-4 w-4" /> EN
                    </Button>
                    <div className="h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center border-2 border-white shadow-sm cursor-pointer">
                        <span className="font-bold text-indigo-700">{displayName[0] || 'T'}</span>
                    </div>
                </div>
            </div>
        </header>
    );
}
