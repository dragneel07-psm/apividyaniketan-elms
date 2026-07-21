// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { AdminSidebar } from '@/components/admin-sidebar';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useState, useEffect } from 'react';
import { usersAPI, User as UserType } from '@/lib/api';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import { DashboardProfileMenu } from '@/components/dashboard-profile-menu';
import { getUser } from '@/lib/auth';
import { getRoleLabel } from '@/lib/rbac';
import type { StaffRole } from '@/lib/auth';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [user, setUser] = useState<UserType | null>(null);
    const [jwtUser, setJwtUser] = useState<ReturnType<typeof getUser>>(null);

    useEffect(() => {
        setJwtUser(getUser());
        usersAPI.getMe().then(setUser).catch(console.error);
    }, []);

    const roleLabel = getRoleLabel(
        jwtUser?.role ?? user?.role ?? 'staff',
        (jwtUser?.staff_role ?? '') as StaffRole,
    );

    return (
        <div className="flex min-h-screen bg-slate-50">
            {/* Sidebar */}
            <aside className="fixed inset-y-0 left-0 z-50 w-64 hidden lg:block">
                <AdminSidebar />
            </aside>

            {/* Main Content */}
            <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
                {/* Top Header */}
                <header className="sticky top-0 z-40 bg-white border-b px-6 py-3 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-4 flex-1">
                        <div className="relative w-full max-w-md hidden md:block" suppressHydrationWarning>
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search students, teachers, reports..."
                                className="pl-9 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <NotificationCenter />
                        <DashboardProfileMenu
                            firstName={user?.first_name ?? jwtUser?.first_name}
                            lastName={user?.last_name ?? jwtUser?.last_name}
                            roleLabel={roleLabel}
                            profileHref="/admin/profile"
                            settingsHref="/admin/settings"
                            logoutHref="/login"
                            className="border-l pl-4"
                        />
                    </div>
                </header>

                <main className="flex-1 p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
