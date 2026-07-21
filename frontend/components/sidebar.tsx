// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, GraduationCap, Settings, LogOut, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const routes = [
    {
        label: 'Admin Dashboard',
        icon: Settings,
        href: '/admin',
        color: 'text-sky-500'
    },
    {
        label: 'Student Dashboard',
        icon: GraduationCap,
        href: '/student',
        color: 'text-violet-500'
    },
    {
        label: 'Teacher Dashboard',
        icon: Users,
        href: '/teacher',
        color: 'text-pink-700'
    },
];

export function Sidebar() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);

    // Don't show sidebar on auth pages
    if (pathname?.startsWith('/(auth)') || pathname === '/login' || pathname === '/') {
        return null;
    }

    return (
        <>
            {/* Mobile Menu Button */}
            <Button
                onClick={() => setIsOpen(!isOpen)}
                variant="outline"
                size="icon"
                className="md:hidden fixed top-4 left-4 z-50"
            >
                {isOpen ? <X /> : <Menu />}
            </Button>

            {/* Sidebar */}
            <div className={`
        fixed top-0 left-0 h-full bg-gray-900 text-white w-64 transform transition-transform duration-200 ease-in-out z-40
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
      `}>
                <div className="p-6">
                    <h2 className="text-2xl font-bold mb-8">E-Learning</h2>

                    <nav className="space-y-2">
                        {routes.map((route) => (
                            <Link
                                key={route.href}
                                href={route.href}
                                onClick={() => setIsOpen(false)}
                                className={`
                  flex items-center gap-x-2 text-sm font-medium p-3 rounded-lg transition-all
                  hover:bg-gray-800
                  ${pathname === route.href ? 'bg-gray-800 text-white' : 'text-gray-400'}
                `}
                            >
                                <route.icon className={`h-5 w-5 ${route.color}`} />
                                {route.label}
                            </Link>
                        ))}
                    </nav>

                    <div className="absolute bottom-6 left-6 right-6">
                        <Link
                            href="/login"
                            className="flex items-center gap-x-2 text-sm font-medium p-3 rounded-lg transition-all hover:bg-gray-800 text-gray-400"
                        >
                            <LogOut className="h-5 w-5" />
                            Logout
                        </Link>
                    </div>
                </div>
            </div>

            {/* Overlay for mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 md:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </>
    );
}
