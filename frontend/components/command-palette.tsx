// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

/**
 * Global ⌘K / Ctrl+K command palette.
 *
 * Role-aware: shows only the destinations the signed-in user's portal
 * actually has. Renders nothing for anonymous visitors. Mounted once in
 * the root layout.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
    BarChart3,
    Bell,
    BookOpen,
    Bot,
    Building2,
    Calendar,
    ClipboardList,
    CreditCard,
    GraduationCap,
    LayoutDashboard,
    Library,
    LogOut,
    MessageSquare,
    Settings,
    Trophy,
    Users,
} from 'lucide-react';
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
} from '@/components/ui/command';
import { getUser, removeTokens } from '@/lib/auth';

type PaletteItem = {
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    keywords?: string;
};

const NAV_BY_ROLE: Record<string, PaletteItem[]> = {
    admin: [
        { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
        { label: 'Academic', href: '/admin/academic', icon: GraduationCap, keywords: 'classes subjects students teachers' },
        { label: 'Admissions', href: '/admin/admissions', icon: Users },
        { label: 'Exams', href: '/admin/exams', icon: ClipboardList },
        { label: 'Finance', href: '/admin/finance', icon: CreditCard, keywords: 'fees billing invoices' },
        { label: 'Library', href: '/admin/library', icon: Library },
        { label: 'Calendar', href: '/admin/calendar', icon: Calendar },
        { label: 'Notices', href: '/admin/notices', icon: Bell },
        { label: 'Messages', href: '/admin/messages', icon: MessageSquare },
        { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
        { label: 'AI Analytics', href: '/admin/ai-analytics', icon: Bot },
        { label: 'Settings', href: '/admin/settings', icon: Settings },
    ],
    teacher: [
        { label: 'Dashboard', href: '/teacher', icon: LayoutDashboard },
        { label: 'My Classes', href: '/teacher/classes', icon: Users },
        { label: 'Courses', href: '/teacher/courses', icon: BookOpen },
        { label: 'Assessments', href: '/teacher/assessments', icon: ClipboardList },
        { label: 'Grading', href: '/teacher/grading', icon: GraduationCap, keywords: 'submissions marks' },
        { label: 'Attendance', href: '/teacher/attendance', icon: Calendar },
        { label: 'Projects', href: '/teacher/projects', icon: ClipboardList },
        { label: 'Messages', href: '/teacher/messages', icon: MessageSquare },
        { label: 'Analytics', href: '/teacher/analytics', icon: BarChart3 },
        { label: 'Notifications', href: '/teacher/notifications', icon: Bell },
    ],
    student: [
        { label: 'Dashboard', href: '/student', icon: LayoutDashboard },
        { label: 'Courses', href: '/student/courses', icon: BookOpen },
        { label: 'AI Tutor', href: '/student/ai-tutor', icon: Bot, keywords: 'chat help ask' },
        { label: 'Learning Path', href: '/student/learning-path', icon: GraduationCap },
        { label: 'Assignments', href: '/student/assignments', icon: ClipboardList },
        { label: 'Exams', href: '/student/exams', icon: ClipboardList },
        { label: 'Grades', href: '/student/grades', icon: BarChart3, keywords: 'results marks' },
        { label: 'Attendance', href: '/student/attendance', icon: Calendar },
        { label: 'Library', href: '/student/library', icon: Library },
        { label: 'Leaderboard', href: '/student/leaderboard', icon: Trophy, keywords: 'gamification points' },
        { label: 'Achievements', href: '/student/achievements', icon: Trophy, keywords: 'badges' },
        { label: 'Messages', href: '/student/messages', icon: MessageSquare },
        { label: 'Fees', href: '/student/fees', icon: CreditCard },
    ],
    parent: [
        { label: 'Dashboard', href: '/parent', icon: LayoutDashboard },
        { label: 'My Children', href: '/parent/children', icon: Users },
        { label: 'Grades', href: '/parent/grades', icon: BarChart3, keywords: 'results marks' },
        { label: 'Attendance', href: '/parent/attendance', icon: Calendar },
        { label: 'Fees', href: '/parent/fees', icon: CreditCard },
        { label: 'Meetings', href: '/parent/meetings', icon: Calendar },
        { label: 'Messages', href: '/parent/messages', icon: MessageSquare },
        { label: 'Notices', href: '/parent/notices', icon: Bell },
    ],
    saas_admin: [
        { label: 'Dashboard', href: '/saas', icon: LayoutDashboard },
        { label: 'Schools', href: '/saas/schools', icon: Building2, keywords: 'tenants' },
        { label: 'Plans', href: '/saas/plans', icon: CreditCard, keywords: 'pricing subscriptions' },
        { label: 'Billing', href: '/saas/billing', icon: CreditCard },
        { label: 'Growth', href: '/saas/growth', icon: BarChart3 },
        { label: 'Platform Health', href: '/saas/health', icon: BarChart3, keywords: 'status monitoring' },
        { label: 'AI Settings', href: '/saas/ai', icon: Bot, keywords: 'provider openai' },
        { label: 'Staff', href: '/saas/staff', icon: Users },
        { label: 'Audit Log', href: '/saas/audit', icon: ClipboardList },
        { label: 'Settings', href: '/saas/settings', icon: Settings },
    ],
};
// Aliases: staff share the admin portal, saas_staff the saas portal
// (minus the saas_admin-only staff page, enforced by the middleware anyway).
NAV_BY_ROLE.staff = NAV_BY_ROLE.admin;
NAV_BY_ROLE.saas_staff = NAV_BY_ROLE.saas_admin.filter((item) => item.href !== '/saas/staff');

const PORTAL_PREFIXES = ['/admin', '/teacher', '/student', '/parent', '/saas'];

export function CommandPalette() {
    const router = useRouter();
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const [role, setRole] = useState<string | null>(null);

    // Resolve the role client-side after mount (localStorage-backed cache).
    useEffect(() => {
        setRole(getUser()?.role ?? null);
    }, [pathname]);

    const insidePortal = PORTAL_PREFIXES.some((prefix) => pathname.startsWith(prefix));
    const items = useMemo(() => (role ? NAV_BY_ROLE[role] ?? [] : []), [role]);
    const enabled = insidePortal && items.length > 0;

    useEffect(() => {
        if (!enabled) return;
        function onKeyDown(event: KeyboardEvent) {
            if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                setOpen((value) => !value);
            }
        }
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [enabled]);

    const navigate = useCallback(
        (href: string) => {
            setOpen(false);
            router.push(href);
        },
        [router],
    );

    function handleLogout() {
        setOpen(false);
        removeTokens();
        const loginPath = role === 'saas_admin' || role === 'saas_staff' ? '/saas-login' : '/login';
        window.location.href = loginPath;
    }

    if (!enabled) return null;

    return (
        <CommandDialog open={open} onOpenChange={setOpen} title="Command palette">
            <CommandInput placeholder="Where do you want to go?" />
            <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup heading="Navigate">
                    {items.map((item) => (
                        <CommandItem
                            key={item.href}
                            value={`${item.label} ${item.keywords ?? ''}`}
                            onSelect={() => navigate(item.href)}
                        >
                            <item.icon className="text-muted-foreground" />
                            <span>{item.label}</span>
                        </CommandItem>
                    ))}
                </CommandGroup>
                <CommandSeparator />
                <CommandGroup heading="Session">
                    <CommandItem value="log out sign out" onSelect={handleLogout}>
                        <LogOut className="text-muted-foreground" />
                        <span>Log out</span>
                        <CommandShortcut>⇧⌘Q</CommandShortcut>
                    </CommandItem>
                </CommandGroup>
            </CommandList>
        </CommandDialog>
    );
}
