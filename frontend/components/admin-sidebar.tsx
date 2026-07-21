// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
    LayoutDashboard, Users, GraduationCap, School, CreditCard, BarChart3,
    Settings, LogOut, Bell, BookOpen, Calendar, Library, Wallet, DollarSign,
    ClipboardList, FileText, MessageSquare, UserRoundPlus, ShieldAlert,
    Sparkles, Bus, Building2, UserCog, ChevronDown, Trophy, type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getUser } from '@/lib/auth';
import { getAllowedModules, getRoleLabel, type AdminModule } from '@/lib/rbac';
import type { StaffRole } from '@/lib/auth';

// ─── Types ───────────────────────────────────────────────────────────────────

type NavLeaf = {
    kind: 'leaf';
    name: string;
    href: AdminModule;
    icon: LucideIcon;
};

type NavGroup = {
    kind: 'group';
    name: string;
    icon: LucideIcon;
    /** The "root" href — used only for active-state matching, not navigation */
    matchPrefix: string;
    children: NavLeaf[];
};

type NavItem = NavLeaf | NavGroup;

// ─── Navigation definition ───────────────────────────────────────────────────

const NAV: NavItem[] = [
    { kind: 'leaf', name: 'Dashboard',        href: '/admin',           icon: LayoutDashboard },
    { kind: 'leaf', name: 'ERP Overview',     href: '/admin/erp',       icon: BarChart3 },
    { kind: 'leaf', name: 'Admissions',       href: '/admin/admissions',icon: UserRoundPlus },

    {
        kind: 'group',
        name: 'Academic',
        icon: School,
        matchPrefix: '/admin/academic',
        children: [
            { kind: 'leaf', name: 'Academic Years',       href: '/admin/academic/years',                icon: Calendar },
            { kind: 'leaf', name: 'Classes',              href: '/admin/academic/classes',              icon: School },
            { kind: 'leaf', name: 'Timetable',            href: '/admin/timetable',                     icon: Calendar },
            { kind: 'leaf', name: 'Subjects',             href: '/admin/academic/subjects',             icon: BookOpen },
            { kind: 'leaf', name: 'Assessments',          href: '/admin/academic/assessments',          icon: ClipboardList },
            { kind: 'leaf', name: 'Promotion Exceptions', href: '/admin/academic/promotion-exceptions', icon: ShieldAlert },
            { kind: 'leaf', name: 'Exams',                href: '/admin/exams',                         icon: ClipboardList },
            { kind: 'leaf', name: 'Students',             href: '/admin/academic/students',             icon: GraduationCap },
            { kind: 'leaf', name: 'Teachers',             href: '/admin/academic/teachers',             icon: Users },
        ],
    },

    { kind: 'leaf', name: 'Library',          href: '/admin/library',       icon: Library },
    { kind: 'leaf', name: 'Gamification',      href: '/admin/gamification',  icon: Trophy },

    {
        kind: 'group',
        name: 'Finance',
        icon: CreditCard,
        matchPrefix: '/admin/finance',
        children: [
            { kind: 'leaf', name: 'Overview',          href: '/admin/finance',         icon: CreditCard },
            { kind: 'leaf', name: 'Fee Structures',    href: '/admin/finance/fees',    icon: Wallet },
            { kind: 'leaf', name: 'Collect Payments',  href: '/admin/finance/collect', icon: DollarSign },
            { kind: 'leaf', name: 'Financial Reports', href: '/admin/finance/reports', icon: BarChart3 },
        ],
    },

    { kind: 'leaf', name: 'Calendar',         href: '/admin/calendar',  icon: Calendar },
    { kind: 'leaf', name: 'HR & Payroll',     href: '/admin/hr',        icon: Users },
    { kind: 'leaf', name: 'Student Info (SIS)', href: '/admin/sis',     icon: ShieldAlert },
    { kind: 'leaf', name: 'Hostel',           href: '/admin/hostel',    icon: Building2 },
    { kind: 'leaf', name: 'Transport',        href: '/admin/transport', icon: Bus },
    { kind: 'leaf', name: 'Inventory',        href: '/admin/inventory', icon: FileText },

    {
        kind: 'group',
        name: 'Analytics',
        icon: BarChart3,
        matchPrefix: '/admin/analytics',
        children: [
            { kind: 'leaf', name: 'Analytics',    href: '/admin/analytics',    icon: BarChart3 },
            { kind: 'leaf', name: 'AI Analytics', href: '/admin/ai-analytics', icon: Sparkles },
        ],
    },

    { kind: 'leaf', name: 'Reports', href: '/admin/reports', icon: BarChart3 },

    {
        kind: 'group',
        name: 'Communication',
        icon: Bell,
        matchPrefix: '/admin/communication',
        children: [
            { kind: 'leaf', name: 'Announcements', href: '/admin/communication', icon: Bell },
            { kind: 'leaf', name: 'Messages',      href: '/admin/messages',      icon: MessageSquare },
            { kind: 'leaf', name: 'Templates',     href: '/admin/communication/templates', icon: FileText },
            { kind: 'leaf', name: 'Notices',       href: '/admin/notices',       icon: Bell },
        ],
    },

    {
        kind: 'group',
        name: 'Settings',
        icon: Settings,
        matchPrefix: '/admin/settings',
        children: [
            { kind: 'leaf', name: 'System Settings', href: '/admin/settings',              icon: Settings },
            { kind: 'leaf', name: 'Staff Access',    href: '/admin/settings/staff-access', icon: UserCog },
        ],
    },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isLeafActive(href: AdminModule, pathname: string): boolean {
    if (href === '/admin') return pathname === '/admin';
    return pathname === href || pathname.startsWith(href + '/');
}

function isGroupActive(group: NavGroup, pathname: string): boolean {
    return group.children.some((c) => isLeafActive(c.href, pathname));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function LeafLink({ item, pathname }: { item: NavLeaf; pathname: string }) {
    const active = isLeafActive(item.href, pathname);
    return (
        <Link
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
        >
            <item.icon className={`h-4 w-4 shrink-0 ${active ? 'text-white' : 'text-slate-400'}`} />
            <span className="truncate">{item.name}</span>
        </Link>
    );
}

function GroupMenu({
    item,
    pathname,
    allowed,
}: {
    item: NavGroup;
    pathname: string;
    allowed: Set<AdminModule>;
}) {
    const visibleChildren = item.children.filter((c) => allowed.has(c.href));
    if (visibleChildren.length === 0) return null;

    const groupActive = isGroupActive({ ...item, children: visibleChildren }, pathname);
    const [open, setOpen] = useState(groupActive);

    // auto-open when navigating to a child route
    useEffect(() => {
        if (groupActive) setOpen(true);
    }, [pathname, groupActive]);

    return (
        <div>
            {/* Group header button */}
            <button
                onClick={() => setOpen((o) => !o)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    groupActive && !open
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
            >
                <item.icon className={`h-5 w-5 shrink-0 ${groupActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                <span className="flex-1 text-left truncate">{item.name}</span>
                <ChevronDown
                    className={`h-4 w-4 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Animated children */}
            <div
                className={`overflow-hidden transition-all duration-200 ease-in-out ${
                    open ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}
            >
                <div className="mt-1 ml-4 pl-3 border-l border-slate-700 space-y-0.5 pb-1">
                    {visibleChildren.map((child) => (
                        <LeafLink key={child.href} item={child} pathname={pathname} />
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── Main Sidebar ─────────────────────────────────────────────────────────────

export function AdminSidebar() {
    const pathname = usePathname();

    const user = getUser();
    const role = user?.role ?? 'staff';
    const staffRole = (user?.staff_role ?? '') as StaffRole;
    const roleLabel = getRoleLabel(role, staffRole);
    const allowed = getAllowedModules(role, staffRole);

    return (
        <div className="flex h-full bg-slate-900 text-white w-64 flex-col overflow-hidden">
            {/* Brand */}
            <div className="p-5 border-b border-slate-800">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-indigo-500 flex items-center justify-center shrink-0">
                        <School className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0">
                        <span className="font-bold text-base tracking-tight block leading-tight">School Admin</span>
                        <Badge className="mt-0.5 text-[10px] px-1.5 py-0 bg-indigo-700/60 text-indigo-200 border-0 truncate max-w-full">
                            {roleLabel}
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-0.5">
                {NAV.map((item) => {
                    if (item.kind === 'leaf') {
                        if (!allowed.has(item.href)) return null;
                        return <LeafLink key={item.href} item={item} pathname={pathname} />;
                    }
                    return (
                        <GroupMenu
                            key={item.name}
                            item={item}
                            pathname={pathname}
                            allowed={allowed}
                        />
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800 space-y-3">
                <div className="bg-slate-800 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Pro Plan</span>
                        <span className="text-[10px] text-slate-400">75%</span>
                    </div>
                    <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 w-[75%] h-full rounded-full" />
                    </div>
                </div>

                <Button
                    variant="ghost"
                    className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-900/20 gap-3 h-9"
                    onClick={() => (window.location.href = '/login')}
                >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                </Button>
            </div>
        </div>
    );
}
