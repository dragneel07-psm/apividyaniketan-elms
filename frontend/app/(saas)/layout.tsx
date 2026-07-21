// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import { SaasSidebar } from '@/components/saas/sidebar';
import { Bell, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/theme-toggle';
import { DashboardProfileMenu } from '@/components/dashboard-profile-menu';

export default function SaasLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="h-full relative">
            <div className="hidden h-full md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-[80] bg-gray-900">
                <SaasSidebar />
            </div>
            <main className="md:ml-72 h-full bg-slate-50 dark:bg-slate-950">
                {/* Top Navigation Bar */}
                <div className="flex items-center justify-between p-4 border-b h-16 bg-white dark:bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
                    <div className="w-full max-w-sm">
                        <div className="relative" suppressHydrationWarning>
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search schools, users..."
                                className="pl-9 bg-slate-100 dark:bg-slate-800 border-none"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-x-4">
                        <ThemeToggle />
                        <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full relative">
                            <Bell className="h-5 w-5 text-slate-300" />
                            <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full"></span>
                        </button>
                        <DashboardProfileMenu
                            firstName="SaaS"
                            lastName="Admin"
                            roleLabel="SaaS Admin"
                            settingsHref="/saas/settings"
                            logoutHref="/saas-login"
                            showName={false}
                        />
                    </div>
                </div>

                <div className="h-[calc(100%-4rem)] overflow-y-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
