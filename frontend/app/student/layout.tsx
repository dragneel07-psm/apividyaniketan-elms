// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    LayoutDashboard, BookOpen, FileText, Calendar,
    User as UserIcon, LogOut, Menu, X, MessageSquare,
    GraduationCap, Clock, FileBarChart, CreditCard,
    BrainCircuit, Trophy, Award, WifiOff, Download, Brain,
    CalendarClock, Info, MessageSquareWarning, ChevronRight, Video, Wifi,
    FolderKanban
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { removeTokens } from '@/lib/auth';
import { usersAPI, liveSessionAPI, LiveSession, User } from '@/lib/api';
import { NotificationBell } from '@/components/notification-bell';
import { LanguageSelector } from '@/components/LanguageSelector';
import { GamificationProvider } from '@/components/providers/gamification-provider';
import { HeaderStats } from '@/components/gamification/header-stats';
import { ConnectionIndicator } from '@/components/offline-banner';
import { useOffline } from '@/hooks/use-offline';
import { PWAInstallPrompt } from '@/components/pwa-install-prompt';
import { DashboardProfileMenu } from '@/components/dashboard-profile-menu';
import { ThemeToggle } from '@/components/theme-toggle';
import { useTranslation } from '@/lib/localization';
import { formatDate } from '@/lib/i18n/format';

type NavItem = {
    label: string;
    href: string;
    icon: React.ElementType;
    hidden?: boolean;
    offline?: boolean;
    badge?: string;
};

type NavGroup = {
    title: string;
    items: NavItem[];
};

export default function StudentLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [activeSessions, setActiveSessions] = useState<LiveSession[]>([]);
    const { isOnline } = useOffline();
    const { t, locale } = useTranslation();

    const loadUser = useCallback(async () => {
        try {
            const me = await usersAPI.getMe();
            setUser(me);
        } catch (error) {
            console.error('Failed to load user', error);
        }
    }, []);

    const loadActiveSessions = useCallback(async () => {
        try {
            const sessions = await liveSessionAPI.getActive();
            setActiveSessions(sessions);
        } catch {
            // silently ignore
        }
    }, []);

    useEffect(() => {
        loadUser();
        loadActiveSessions();
        const interval = setInterval(loadActiveSessions, 30_000);
        return () => clearInterval(interval);
    }, [loadUser, loadActiveSessions]);

    const getTimeGreeting = () => {
        const h = new Date().getHours();
        if (h < 12) return t('student.nav.greetingMorning');
        if (h < 17) return t('student.nav.greetingAfternoon');
        return t('student.nav.greetingEvening');
    };

    const navGroups: NavGroup[] = [
        {
            title: t('student.nav.groupOverview'),
            items: [
                { label: t('student.nav.dashboard'), href: '/student', icon: LayoutDashboard },
                {
                    label: t('student.nav.learningPath'),
                    href: '/student/learning-path',
                    icon: BrainCircuit,
                    hidden: user?.tenant_features?.student_ai_chatbot === false,
                },
            ],
        },
        {
            title: t('student.nav.groupAcademics'),
            items: [
                { label: t('student.nav.myClasses'), href: '/student/classes', icon: BookOpen },
                { label: t('student.nav.courses'), href: '/student/courses', icon: GraduationCap },
                { label: t('student.nav.quizzes'), href: '/student/quizzes', icon: Brain },
                { label: t('student.nav.assignments'), href: '/student/assignments', icon: FileText },
                {
                    label: t('student.nav.projects'),
                    href: '/student/projects',
                    icon: FolderKanban,
                    hidden: user?.tenant_features?.projects === false,
                },
                { label: t('student.nav.assessments'), href: '/student/assessments', icon: Award },
                { label: t('student.nav.myGrades'), href: '/student/grades', icon: Award },
                { label: t('student.nav.library'), href: '/student/library', icon: BookOpen },
            ],
        },
        {
            title: t('student.nav.groupSchedule'),
            items: [
                { label: t('student.nav.timetable'), href: '/student/timetable', icon: Clock },
                { label: t('student.nav.attendance'), href: '/student/attendance', icon: Calendar },
                { label: t('student.nav.leaveRequests'), href: '/student/leaves', icon: CalendarClock },
            ],
        },
        {
            title: t('student.nav.groupFinanceLife'),
            items: [
                {
                    label: t('student.nav.feesPayments'),
                    href: '/student/fees',
                    icon: CreditCard,
                    hidden: user?.tenant_features?.parent_fees === false,
                },
                { label: t('student.nav.myHostelBus'), href: '/student/my-info', icon: Info },
                {
                    label: t('student.nav.leaderboard'),
                    href: '/student/leaderboard',
                    icon: Trophy,
                    hidden: user?.tenant_features?.student_gamification === false,
                },
            ],
        },
        {
            title: t('student.nav.groupCommunication'),
            items: [
                { label: t('student.nav.notices'), href: '/student/notices', icon: FileBarChart },
                { label: t('student.nav.messages'), href: '/student/messages', icon: MessageSquare },
                { label: t('student.nav.reportIssue'), href: '/student/complaints', icon: MessageSquareWarning },
            ],
        },
        {
            title: t('student.nav.groupAccount'),
            items: [
                { label: t('student.nav.profile'), href: '/student/profile', icon: UserIcon },
                { label: t('student.nav.offlineContent'), href: '/student/offline', icon: Download, offline: true },
            ],
        },
    ];

    const handleLogout = () => {
        removeTokens();
        router.push('/login');
    };

    const SidebarContent = () => (
        <div className="h-full flex flex-col bg-slate-900">
            {/* Brand */}
            <div className="h-16 flex items-center px-5 shrink-0 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                        <GraduationCap className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <p className="font-black text-white text-sm leading-none">{t('student.nav.studentRole')}</p>
                        <p className="text-[10px] text-indigo-400 font-semibold uppercase tracking-widest">{t('student.nav.portal')}</p>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className="ml-auto lg:hidden text-slate-400 hover:text-white hover:bg-white/10"
                    onClick={() => setSidebarOpen(false)}
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
                {navGroups.map((group) => {
                    const visibleItems = group.items.filter((item) => !item.hidden);
                    if (visibleItems.length === 0) return null;
                    return (
                        <div key={group.title}>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2">
                                {group.title}
                            </p>
                            <div className="space-y-0.5">
                                {visibleItems.map((item) => {
                                    const isActive = pathname === item.href;
                                    const isOfflineItem = item.offline;
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={() => setSidebarOpen(false)}
                                        >
                                            <div className={`
                                                flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group relative
                                                ${isActive
                                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                                                    : isOfflineItem && !isOnline
                                                        ? 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'
                                                        : 'text-slate-400 hover:text-white hover:bg-white/8'
                                                }
                                            `}>
                                                <item.icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : isOfflineItem && !isOnline ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                                                <span className={`text-sm font-medium truncate ${isActive ? 'text-white' : ''}`}>
                                                    {item.label}
                                                </span>
                                                {isActive && (
                                                    <ChevronRight className="h-3 w-3 ml-auto text-white/60" />
                                                )}
                                                {isOfflineItem && !isOnline && (
                                                    <span className="ml-auto text-[9px] bg-emerald-500 text-white px-1.5 py-0.5 rounded-full font-bold">
                                                        LIVE
                                                    </span>
                                                )}
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </nav>

            {/* User Card */}
            <div className="p-3 shrink-0 border-t border-white/5">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/8 hover:bg-white/8 transition-colors">
                    <Avatar className="h-9 w-9 border-2 border-indigo-500/50 shrink-0">
                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`} />
                        <AvatarFallback className="bg-indigo-600 text-white text-sm font-bold">
                            {user?.first_name?.[0]}{user?.last_name?.[0]}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-bold text-white truncate">
                            {user?.first_name} {user?.last_name}
                        </p>
                        <p className="text-[10px] text-indigo-400 font-medium uppercase tracking-wider">{t('student.nav.studentRole')}</p>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-slate-500 hover:text-red-400 hover:bg-red-500/10 shrink-0"
                        onClick={handleLogout}
                        title="Logout"
                    >
                        <LogOut className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>
        </div>
    );

    return (
        <GamificationProvider>
            <PWAInstallPrompt />
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
                {/* Mobile Overlay */}
                {sidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                {/* Sidebar */}
                <aside className={`
                    fixed lg:sticky top-0 left-0 z-50 h-screen w-64 shrink-0
                    transform transition-transform duration-200 ease-in-out
                    ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                `}>
                    <SidebarContent />
                </aside>

                {/* Main Content */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Mobile Header */}
                    <header className="lg:hidden h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 gap-2 sticky top-0 z-30">
                        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="text-slate-600">
                            <Menu className="h-5 w-5" />
                        </Button>
                        <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                <GraduationCap className="h-4 w-4 text-white" />
                            </div>
                            <span className="font-bold text-slate-900 dark:text-white text-sm">{t('student.nav.studentPortal')}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <ConnectionIndicator />
                            <ThemeToggle />
                            <NotificationBell />
                            <DashboardProfileMenu
                                firstName={user?.first_name}
                                lastName={user?.last_name}
                                roleLabel={t('student.nav.studentRole')}
                                settingsHref="/student/profile"
                                logoutHref="/login"
                                showName={false}
                            />
                        </div>
                    </header>

                    {/* Desktop Top Bar */}
                    <header className="hidden lg:flex h-14 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 items-center justify-between px-6 sticky top-0 z-30 shadow-sm dark:shadow-slate-900/50">
                        <div className="flex items-center gap-3">
                            <div>
                                <p className="text-sm font-bold text-slate-900 dark:text-white">
                                    {getTimeGreeting()}, <span className="text-indigo-600">{user?.first_name || t('student.nav.studentRole')}</span>! 👋
                                </p>
                                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                                    {formatDate(new Date(), locale)}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <ConnectionIndicator />
                            <HeaderStats />
                            <LanguageSelector />
                            <ThemeToggle />
                            <NotificationBell />
                            <DashboardProfileMenu
                                firstName={user?.first_name}
                                lastName={user?.last_name}
                                roleLabel={t('student.nav.studentRole')}
                                settingsHref="/student/profile"
                                logoutHref="/login"
                                showName={false}
                            />
                            {isOnline && activeSessions.length > 0 && (
                                <Button
                                    size="sm"
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-4 shadow-md shadow-emerald-200 gap-2"
                                    onClick={() => window.open(activeSessions[0].jitsi_url, '_blank', 'noopener,noreferrer')}
                                >
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                                    </span>
                                    {t('student.nav.joinClass', { subject: activeSessions[0].subject_name })}
                                </Button>
                            )}
                            {isOnline && activeSessions.length === 0 && (
                                <Button size="sm" disabled variant="outline" className="rounded-full px-4 text-slate-400 border-slate-200">
                                    <Video className="h-3.5 w-3.5 mr-1.5" />
                                    {t('student.nav.noLiveClass')}
                                </Button>
                            )}
                            {!isOnline && (
                                <Link href="/student/offline">
                                    <Button size="sm" className="bg-slate-700 hover:bg-slate-800 text-white rounded-full px-4 gap-2">
                                        <WifiOff className="h-3.5 w-3.5" />
                                        {t('student.nav.offlineMode')}
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </header>

                    <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
                        <div className="max-w-6xl mx-auto">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </GamificationProvider>
    );
}
