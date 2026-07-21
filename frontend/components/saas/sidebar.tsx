// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    School,
    CreditCard,
    Receipt,
    BrainCircuit,
    Settings,
    ShieldCheck,
    LogOut,
    TrendingUp,
    HeartPulse,
    ClipboardList,
    Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { removeTokens, getUser } from '@/lib/auth';

export function SaasSidebar() {
    const pathname = usePathname();
    const currentUser = getUser();
    const isSuperAdmin = currentUser?.role === 'saas_admin';

    const routes = [
        {
            label: 'Overview',
            icon: LayoutDashboard,
            href: '/saas',
            color: 'text-sky-500',
            superAdminOnly: false,
        },
        {
            label: 'Schools',
            icon: School,
            href: '/saas/schools',
            color: 'text-violet-500',
            superAdminOnly: false,
        },
        {
            label: 'Growth Analytics',
            icon: TrendingUp,
            href: '/saas/growth',
            color: 'text-indigo-500',
            superAdminOnly: false,
        },
        {
            label: 'Health Monitor',
            icon: HeartPulse,
            href: '/saas/health',
            color: 'text-red-500',
            superAdminOnly: false,
        },
        {
            label: 'Subscription Plans',
            icon: CreditCard,
            href: '/saas/plans',
            color: 'text-pink-700',
            superAdminOnly: false,
        },
        {
            label: 'Billing & Revenue',
            icon: Receipt,
            href: '/saas/billing',
            color: 'text-orange-700',
            superAdminOnly: false,
        },
        {
            label: 'AI Usage',
            icon: BrainCircuit,
            href: '/saas/ai',
            color: 'text-emerald-500',
            superAdminOnly: false,
        },
        {
            label: 'Audit Log',
            icon: ClipboardList,
            href: '/saas/audit',
            color: 'text-slate-500',
            superAdminOnly: false,
        },
        {
            label: 'Staff Management',
            icon: Users,
            href: '/saas/staff',
            color: 'text-amber-500',
            superAdminOnly: true,
        },
        {
            label: 'System Settings',
            icon: Settings,
            href: '/saas/settings',
            color: 'text-gray-500',
            superAdminOnly: true,
        },
        {
            label: 'Profile & Security',
            icon: ShieldCheck,
            href: '/saas/profile',
            color: 'text-indigo-500',
            superAdminOnly: false,
        },
    ].filter(route => !route.superAdminOnly || isSuperAdmin);

    return (
        <div className="space-y-4 py-4 flex flex-col h-full bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800">
            <div className="px-3 py-2 flex-1">
                <Link href="/saas" className="flex items-center pl-3 mb-8">
                    <div className="relative w-8 h-8 mr-4">
                        <div className="absolute fill-current bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg w-full h-full flex items-center justify-center font-bold text-lg">
                            S
                        </div>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold leading-tight">SaaS Portal</h1>
                        <p className="text-xs text-slate-400 leading-tight">
                            {isSuperAdmin ? 'Super Admin' : 'Staff'}
                        </p>
                    </div>
                </Link>
                <div className="space-y-1">
                    {routes.map((route) => (
                        <Link
                            key={route.href}
                            href={route.href}
                            className={`text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition ${pathname === route.href
                                ? 'text-indigo-600 dark:text-white bg-slate-100 dark:bg-white/10'
                                : 'text-slate-600 dark:text-zinc-400'
                                }`}
                        >
                            <div className="flex items-center flex-1">
                                <route.icon className={`h-5 w-5 mr-3 ${route.color}`} />
                                {route.label}
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
            <div className="px-3 py-2">
                <Button
                    variant="ghost"
                    className="w-full justify-start text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10"
                    onClick={() => {
                        removeTokens();
                        window.location.href = '/saas-login';
                    }}
                >
                    <LogOut className="h-5 w-5 mr-3" />
                    Logout
                </Button>
            </div>
        </div>
    );
}
