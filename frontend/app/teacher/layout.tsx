// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { TeacherSidebar } from '@/components/teacher-sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Menu } from 'lucide-react';
import { useState, useEffect } from 'react';
import { usersAPI, User as UserType } from '@/lib/api';
import { NotificationBell } from '@/components/notification-bell';
import { LanguageSelector } from '@/components/LanguageSelector';
import { DashboardProfileMenu } from '@/components/dashboard-profile-menu';

export default function TeacherLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [user, setUser] = useState<(UserType & { profile_image?: string }) | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        usersAPI.getMe().then(setUser).catch(console.error);
    }, []);

    return (
        <div className="flex min-h-screen bg-slate-50">
            {/* Sidebar (Desktop) */}
            <aside className="hidden lg:block fixed inset-y-0 left-0 z-50 w-64">
                <TeacherSidebar />
            </aside>

            {/* Sidebar (Mobile Overlay) */}
            {sidebarOpen && (
                <div className="lg:hidden fixed inset-0 z-50 flex">
                    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
                    <div className="relative bg-white w-64 h-full shadow-xl">
                        <TeacherSidebar />
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
                {/* Top Header */}
                <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-4 flex-1">
                        <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
                            <Menu className="h-5 w-5 text-slate-500" />
                        </Button>
                        <div className="relative w-full max-w-md hidden md:block" suppressHydrationWarning>
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search classes, students, assignments..."
                                className="pl-9 bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-full"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <LanguageSelector />
                        <NotificationBell />
                        <DashboardProfileMenu
                            firstName={user?.first_name}
                            lastName={user?.last_name}
                            roleLabel={user?.role || 'Educator'}
                            avatarUrl={user?.profile_image}
                            settingsHref="/teacher/profile"
                            profileHref="/teacher/profile"
                            logoutHref="/login"
                            className="border-l border-slate-100 pl-4"
                        />
                    </div>
                </header>

                <main className="flex-1 p-6 lg:p-8 space-y-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
