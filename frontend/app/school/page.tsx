// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import {
    GraduationCap, Users, BookOpen, BarChart3, ArrowRight,
    Phone, Mail, Globe, MapPin, Bell, Calendar, Award,
    Shield, Zap, Brain, CheckCircle2, ChevronRight, Sparkles,
    Clock, Star, Building2, Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getTenantFromSubdomain, isTenantHost } from '@/lib/tenant';

// ── Types ──────────────────────────────────────────────────────────────────

interface SchoolProfile {
    name: string;
    id: string;
    address?: string;
    contact_email?: string;
    contact_phone?: string;
    website?: string;
    established_year?: number;
    logo?: string;
    primaryColor?: string;
    tagline?: string;
}

interface Notice {
    id: string | number;
    title: string;
    content?: string;
    created_at: string;
    category?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function getTenantIdFromHost(): string {
    if (typeof window === 'undefined') return 'school';
    const host = window.location.hostname;
    const cachedTenant = (localStorage.getItem('tenant_id') || '').trim().toLowerCase();
    return cachedTenant || getTenantFromSubdomain(host) || (isTenantHost(host) ? 'tenant' : 'school');
}

function formatSchoolName(id: string): string {
    return id.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true, margin: '-60px' });
    return (
        <motion.div ref={ref} className={className}
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.55, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
            {children}
        </motion.div>
    );
}

// ── Role Cards ─────────────────────────────────────────────────────────────

const roles = [
    {
        id: 'student',
        title: 'Student Portal',
        desc: 'Access your classes, assignments, AI tutor, and track your progress.',
        icon: GraduationCap,
        href: '/login/student',
        gradient: 'from-indigo-500 to-indigo-700',
        glow: 'shadow-indigo-500/25',
        features: ['AI-powered tutor', 'Study planner', 'Progress reports'],
    },
    {
        id: 'teacher',
        title: 'Teacher Portal',
        desc: 'Manage classes, grade assignments, generate quizzes, and track at-risk students.',
        icon: BookOpen,
        href: '/login/teacher',
        gradient: 'from-emerald-500 to-emerald-700',
        glow: 'shadow-emerald-500/25',
        features: ['AI grading assistant', 'Class analytics', 'Lesson planning'],
    },
    {
        id: 'parent',
        title: 'Parent Portal',
        desc: 'Stay connected with your child\'s progress, attendance, and upcoming events.',
        icon: Users,
        href: '/login',
        gradient: 'from-orange-500 to-orange-700',
        glow: 'shadow-orange-500/25',
        features: ['Progress reports', 'Attendance tracking', 'Direct messaging'],
    },
    {
        id: 'admin',
        title: 'Admin Portal',
        desc: 'Manage your school, monitor system health, and configure all settings.',
        icon: Shield,
        href: '/login/admin',
        gradient: 'from-slate-600 to-slate-800',
        glow: 'shadow-slate-500/25',
        features: ['User management', 'School settings', 'Analytics dashboard'],
    },
];

const platformFeatures = [
    { icon: Brain, title: 'AI-Powered Learning', desc: 'Adaptive AI tutor that adjusts to each student\'s pace and curriculum.', color: 'text-violet-600' },
    { icon: BarChart3, title: 'Real-time Analytics', desc: 'Live dashboards for performance tracking, attendance, and risk alerts.', color: 'text-sky-600' },
    { icon: Calendar, title: 'Smart Study Planner', desc: 'AI-generated schedules using spaced repetition and exam timelines.', color: 'text-emerald-600' },
    { icon: Bell, title: 'Instant Notifications', desc: 'Real-time notices, messages, and updates to all stakeholders.', color: 'text-orange-600' },
];

// ── Main Component ─────────────────────────────────────────────────────────

export default function SchoolLandingPage() {
    const [school, setSchool] = useState<SchoolProfile | null>(null);
    const [notices, setNotices] = useState<Notice[]>([]);
    const [loading, setLoading] = useState(true);
    const [tenantId, setTenantId] = useState('school');
    const reduced = useReducedMotion();

    useEffect(() => {
        const tid = getTenantIdFromHost();
        setTenantId(tid);

        // Fetch school info from public tenant-check endpoint
        fetch('/api/core/tenant-check/', {
            headers: tid && tid !== 'tenant' ? { 'Content-Type': 'application/json', 'x-tenant-id': tid } : { 'Content-Type': 'application/json' },
            cache: 'no-store',
        })
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (data?.exists) {
                    const resolvedSchema = String(data.schema_name || tid || '').trim().toLowerCase();
                    const resolvedName = String(data.name || formatSchoolName(tid)).trim();
                    localStorage.setItem('tenant_id', resolvedSchema);
                    localStorage.setItem('tenant_name', resolvedName);
                    setSchool({
                        id: resolvedSchema || tid,
                        name: resolvedName,
                        logo: localStorage.getItem('tenant_logo') || undefined,
                        primaryColor: localStorage.getItem('tenant_primary_color') || undefined,
                    });
                    if (resolvedSchema) {
                        setTenantId(resolvedSchema);
                    }
                } else {
                    setSchool({ id: tid, name: formatSchoolName(tid) });
                }
            })
            .catch(() => setSchool({ id: tid, name: formatSchoolName(tid) }))
            .finally(() => setLoading(false));

        // Try to fetch public notices (may fail, graceful fallback)
        fetch('/api/academic/notices/?limit=3', {
            headers: tid && tid !== 'tenant' ? { 'Content-Type': 'application/json', 'x-tenant-id': tid } : { 'Content-Type': 'application/json' },
            cache: 'no-store',
        })
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                const items = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
                setNotices(items.slice(0, 3));
            })
            .catch(() => setNotices([]));
    }, []);

    const schoolName = school?.name || formatSchoolName(tenantId);
    const schoolInitial = schoolName.charAt(0).toUpperCase();

    return (
        <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden">
            {/* ── Navbar ── */}
            <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-xl border-b border-slate-100 shadow-sm">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {school?.logo ? (
                            <img src={school.logo} alt={schoolName} className="h-9 w-auto rounded-lg object-contain" />
                        ) : (
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center shadow-md">
                                <span className="text-white font-black text-sm">{schoolInitial}</span>
                            </div>
                        )}
                        <div>
                            <span className="text-base font-black text-slate-900 leading-none block">{schoolName}</span>
                            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">Learning Management System</span>
                        </div>
                    </div>

                    <div className="hidden md:flex items-center gap-6 text-sm font-bold text-slate-500">
                        <a href="#portals" className="hover:text-indigo-600 transition-colors">Portals</a>
                        <a href="#features" className="hover:text-indigo-600 transition-colors">Features</a>
                        <a href="#notices" className="hover:text-indigo-600 transition-colors">Notices</a>
                        <a href="#contact" className="hover:text-indigo-600 transition-colors">Contact</a>
                    </div>

                    <Link href="/login">
                        <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6 font-bold shadow-md shadow-indigo-600/20">
                            Sign In
                        </Button>
                    </Link>
                </div>
            </nav>

            {/* ── Hero ── */}
            <section className="relative pt-28 pb-20 overflow-hidden">
                {/* Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50 pointer-events-none" />
                <motion.div
                    className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-100/60 rounded-full blur-[120px] pointer-events-none"
                    initial={false}
                    animate={reduced
                        ? { x: 200, y: -150, scale: 1 }
                        : { x: [200, 160, 220, 200], y: [-150, -110, -180, -150], scale: [1, 1.08, 0.96, 1] }}
                    transition={reduced ? { duration: 0 } : { duration: 22, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                    className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-100/40 rounded-full blur-[100px] pointer-events-none"
                    initial={false}
                    animate={reduced
                        ? { x: -100, y: 100, scale: 1 }
                        : { x: [-100, -60, -130, -100], y: [100, 140, 70, 100], scale: [1, 1.06, 0.95, 1] }}
                    transition={reduced ? { duration: 0 } : { duration: 26, repeat: Infinity, ease: 'easeInOut' }}
                />
                {/* Grid */}
                <div className="absolute inset-0 pointer-events-none opacity-30"
                    style={{ backgroundImage: `radial-gradient(circle, rgba(99,102,241,0.12) 1px, transparent 1px)`, backgroundSize: "40px 40px" }}
                />

                <div className="max-w-6xl mx-auto px-6 relative z-10">
                    <div className="text-center max-w-4xl mx-auto">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5 }}
                            className="flex items-center justify-center mb-8"
                        >
                            {school?.logo ? (
                                <img src={school.logo} alt={schoolName} className="h-20 w-auto rounded-2xl object-contain shadow-xl" />
                            ) : (
                                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center shadow-xl shadow-indigo-600/25">
                                    <span className="text-white font-black text-3xl">{schoolInitial}</span>
                                </div>
                            )}
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.1 }}
                            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-600 text-xs font-black uppercase tracking-widest mb-6"
                        >
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                            AI-Powered Learning Platform
                        </motion.div>

                        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.9] text-slate-900 mb-6">
                            {['Welcome', 'to'].map((word, i) => (
                                <motion.span
                                    key={word}
                                    className="inline-block"
                                    initial={reduced ? false : { opacity: 0, y: 24 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: 0.15 + i * 0.09, ease: 'easeOut' }}
                                >
                                    {word}{i === 0 ? ' ' : ''}
                                </motion.span>
                            ))}
                            <br />
                            <motion.span
                                className="inline-block bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-800"
                                initial={reduced ? false : { opacity: 0, y: 24 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: 0.35, ease: 'easeOut' }}
                            >
                                {schoolName}
                            </motion.span>
                        </h1>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.25 }}
                            className="text-lg md:text-xl text-slate-500 font-medium leading-relaxed max-w-2xl mx-auto mb-10"
                        >
                            Your school's AI-powered learning management system. Access your personalised portal to manage classes, track progress, and connect with your school community.
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.35 }}
                            className="flex flex-col sm:flex-row items-center justify-center gap-4"
                        >
                            <a href="#portals">
                                <Button size="lg" className="h-14 px-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-lg font-bold shadow-xl shadow-indigo-600/20 group">
                                    Go to My Portal <ChevronRight className="ml-1 w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                                </Button>
                            </a>
                            <a href="#notices">
                                <Button variant="outline" size="lg" className="h-14 px-10 border-slate-200 text-slate-600 hover:bg-slate-50 rounded-full text-lg font-bold">
                                    View Notices <Bell className="ml-2 w-4 h-4" />
                                </Button>
                            </a>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* ── Stats Strip ── */}
            <div className="border-y border-slate-100 bg-slate-50/70">
                <div className="max-w-5xl mx-auto px-6 py-10">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {[
                            { label: 'AI-Powered', desc: 'Tutor available 24/7', icon: Brain, color: 'text-violet-600', bg: 'bg-violet-50' },
                            { label: 'Real-time', desc: 'Progress tracking', icon: BarChart3, color: 'text-sky-600', bg: 'bg-sky-50' },
                            { label: 'Personalised', desc: 'Study schedules', icon: Calendar, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                            { label: 'Instant', desc: 'Notifications & alerts', icon: Zap, color: 'text-orange-600', bg: 'bg-orange-50' },
                        ].map((s, i) => (
                            <Reveal key={s.label} delay={i * 0.08}>
                                <div className="text-center">
                                    <div className={`w-12 h-12 rounded-2xl ${s.bg} flex items-center justify-center mx-auto mb-3`}>
                                        <s.icon className={`w-6 h-6 ${s.color}`} />
                                    </div>
                                    <p className={`text-xl font-black ${s.color}`}>{s.label}</p>
                                    <p className="text-sm text-slate-500 font-medium">{s.desc}</p>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Role Portals ── */}
            <section id="portals" className="py-24 px-6">
                <div className="max-w-6xl mx-auto">
                    <Reveal>
                        <div className="text-center mb-14">
                            <p className="text-indigo-600 font-black uppercase tracking-[0.25em] text-xs mb-3">Access Your Portal</p>
                            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900">Sign in as…</h2>
                            <p className="text-slate-500 font-medium mt-3 max-w-xl mx-auto">Select your role to access your personalised dashboard and tools.</p>
                        </div>
                    </Reveal>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
                        {roles.map((role, i) => (
                            <Reveal key={role.id} delay={i * 0.1}>
                                <Link href={role.href}>
                                    <motion.div
                                        whileHover={{ y: -6, scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        transition={{ duration: 0.2 }}
                                        className={`relative group rounded-3xl overflow-hidden border border-slate-100 hover:border-transparent shadow-sm hover:shadow-xl ${role.glow} transition-all cursor-pointer bg-white`}
                                    >
                                        {/* Gradient top bar */}
                                        <div className={`h-2 w-full bg-gradient-to-r ${role.gradient}`} />

                                        <div className="p-7">
                                            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${role.gradient} flex items-center justify-center mb-5 shadow-lg`}>
                                                <role.icon className="w-7 h-7 text-white" />
                                            </div>
                                            <h3 className="text-xl font-black text-slate-900 mb-2">{role.title}</h3>
                                            <p className="text-sm text-slate-500 font-medium leading-relaxed mb-5">{role.desc}</p>
                                            <div className="space-y-2 mb-6">
                                                {role.features.map(f => (
                                                    <div key={f} className="flex items-center gap-2 text-xs text-slate-600 font-semibold">
                                                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                                                        {f}
                                                    </div>
                                                ))}
                                            </div>
                                            <div className={`flex items-center gap-2 text-sm font-black bg-gradient-to-r ${role.gradient} bg-clip-text text-transparent group-hover:gap-3 transition-all`}>
                                                Sign In <ArrowRight className="w-4 h-4 opacity-70" />
                                            </div>
                                        </div>
                                    </motion.div>
                                </Link>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Platform Features ── */}
            <section id="features" className="py-20 bg-slate-50/80 border-y border-slate-100">
                <div className="max-w-6xl mx-auto px-6">
                    <Reveal>
                        <div className="text-center mb-14">
                            <p className="text-purple-600 font-black uppercase tracking-[0.25em] text-xs mb-3">Platform Capabilities</p>
                            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900">Everything your school needs.</h2>
                        </div>
                    </Reveal>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {platformFeatures.map((f, i) => (
                            <Reveal key={f.title} delay={i * 0.1}>
                                <div className="bg-white rounded-2xl p-6 border border-slate-100 hover:border-indigo-100 hover:shadow-md transition-all group">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-50 group-hover:bg-indigo-50 flex items-center justify-center mb-5 transition-colors">
                                        <f.icon className={`w-6 h-6 ${f.color}`} />
                                    </div>
                                    <h3 className="text-base font-black text-slate-900 mb-2">{f.title}</h3>
                                    <p className="text-sm text-slate-500 font-medium leading-relaxed">{f.desc}</p>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Notices ── */}
            <section id="notices" className="py-20 px-6">
                <div className="max-w-4xl mx-auto">
                    <Reveal>
                        <div className="flex items-center justify-between mb-10">
                            <div>
                                <p className="text-orange-500 font-black uppercase tracking-[0.25em] text-xs mb-2">Latest Updates</p>
                                <h2 className="text-3xl font-black tracking-tight text-slate-900">School Notices</h2>
                            </div>
                            <Link href="/login" className="text-sm font-bold text-indigo-600 hover:underline flex items-center gap-1">
                                View all <ChevronRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </Reveal>

                    {notices.length === 0 ? (
                        <Reveal>
                            <div className="space-y-4">
                                {/* Placeholder notices */}
                                {[
                                    { title: 'Welcome to the New Academic Year', date: '2026-01-15', tag: 'General' },
                                    { title: 'AI Tutor Now Available for All Students', date: '2026-01-20', tag: 'Technology' },
                                    { title: 'Parent-Teacher Meeting Scheduled', date: '2026-01-25', tag: 'Events' },
                                ].map((n, i) => (
                                    <Reveal key={i} delay={i * 0.08}>
                                        <div className="flex items-start gap-5 p-5 bg-white rounded-2xl border border-slate-100 hover:border-indigo-100 hover:shadow-sm transition-all group">
                                            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                                                <Bell className="w-5 h-5 text-indigo-500" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-xs font-black text-indigo-600 uppercase tracking-widest">{n.tag}</span>
                                                </div>
                                                <h4 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{n.title}</h4>
                                                <p className="text-xs text-slate-400 font-medium mt-1 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />{n.date}
                                                </p>
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-400 transition-colors flex-shrink-0 mt-0.5" />
                                        </div>
                                    </Reveal>
                                ))}
                                <p className="text-center text-xs text-slate-400 font-medium pt-2">Sign in to view all school notices and updates.</p>
                            </div>
                        </Reveal>
                    ) : (
                        <div className="space-y-4">
                            {notices.map((n, i) => (
                                <Reveal key={n.id} delay={i * 0.08}>
                                    <div className="flex items-start gap-5 p-5 bg-white rounded-2xl border border-slate-100 hover:border-indigo-100 hover:shadow-sm transition-all group">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                                            <Bell className="w-5 h-5 text-indigo-500" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            {n.category && <span className="text-xs font-black text-indigo-600 uppercase tracking-widest">{n.category}</span>}
                                            <h4 className="font-bold text-slate-800 mt-0.5 group-hover:text-indigo-600 transition-colors">{n.title}</h4>
                                            {n.content && <p className="text-sm text-slate-500 mt-1 line-clamp-2">{n.content}</p>}
                                            <p className="text-xs text-slate-400 font-medium mt-1 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />{new Date(n.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                                            </p>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-400 flex-shrink-0 mt-0.5" />
                                    </div>
                                </Reveal>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* ── CTA Banner ── */}
            <section className="py-20 px-6">
                <div className="max-w-5xl mx-auto">
                    <Reveal>
                        <div className="relative rounded-[32px] overflow-hidden bg-gradient-to-br from-indigo-600 to-purple-700 p-10 md:p-16 text-white text-center shadow-2xl shadow-indigo-600/20">
                            <div className="absolute inset-0 pointer-events-none opacity-10"
                                style={{ backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)`, backgroundSize: "32px 32px" }}
                            />
                            <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
                            <div className="relative z-10">
                                <div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center mx-auto mb-6">
                                    <Sparkles className="w-8 h-8 text-white" />
                                </div>
                                <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4">Ready to get started?</h2>
                                <p className="text-indigo-200 font-medium text-lg max-w-xl mx-auto mb-8">
                                    Sign in to your portal to access your AI tutor, study planner, progress reports, and more.
                                </p>
                                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                    <Link href="/login">
                                        <Button size="lg" className="h-13 px-10 bg-white text-indigo-700 hover:bg-slate-100 rounded-full font-black text-lg shadow-xl hover:scale-105 transition-all">
                                            Sign In Now <ArrowRight className="ml-2 w-5 h-5" />
                                        </Button>
                                    </Link>
                                </div>
                                <div className="flex flex-wrap justify-center gap-6 mt-8 opacity-60">
                                    <span className="text-xs font-bold flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> Secure & Private</span>
                                    <span className="text-xs font-bold flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> Data Encrypted</span>
                                    <span className="text-xs font-bold flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Always Available</span>
                                </div>
                            </div>
                        </div>
                    </Reveal>
                </div>
            </section>

            {/* ── Contact ── */}
            <section id="contact" className="py-20 px-6 bg-slate-50/80 border-t border-slate-100">
                <div className="max-w-4xl mx-auto">
                    <Reveal>
                        <div className="text-center mb-12">
                            <p className="text-slate-400 font-black uppercase tracking-[0.25em] text-xs mb-3">Get in Touch</p>
                            <h2 className="text-3xl font-black tracking-tight text-slate-900">Contact {schoolName}</h2>
                        </div>
                    </Reveal>

                    <Reveal delay={0.1}>
                        <div className="grid md:grid-cols-3 gap-6">
                            {[
                                {
                                    icon: Mail, label: 'Email', value: school?.contact_email || 'admin@' + tenantId + '.edu',
                                    href: `mailto:${school?.contact_email || 'admin@' + tenantId + '.edu'}`,
                                    color: 'text-indigo-600', bg: 'bg-indigo-50',
                                },
                                {
                                    icon: Phone, label: 'Phone', value: school?.contact_phone || '+1 (800) SCHOOL',
                                    href: `tel:${school?.contact_phone || ''}`,
                                    color: 'text-emerald-600', bg: 'bg-emerald-50',
                                },
                                {
                                    icon: Globe, label: 'Website', value: school?.website || `www.${tenantId}.edu`,
                                    href: school?.website ? (school.website.startsWith('http') ? school.website : `https://${school.website}`) : '#',
                                    color: 'text-purple-600', bg: 'bg-purple-50',
                                },
                            ].map(c => (
                                <a key={c.label} href={c.href} className="group flex flex-col items-center text-center p-7 bg-white rounded-2xl border border-slate-100 hover:border-indigo-100 hover:shadow-md transition-all">
                                    <div className={`w-12 h-12 rounded-2xl ${c.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                        <c.icon className={`w-6 h-6 ${c.color}`} />
                                    </div>
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{c.label}</p>
                                    <p className={`font-bold ${c.color} text-sm`}>{c.value}</p>
                                </a>
                            ))}
                        </div>
                    </Reveal>
                </div>
            </section>

            {/* ── Footer ── */}
            <footer className="py-10 px-6 bg-slate-900 text-white">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center">
                            <span className="text-white font-black text-sm">{schoolInitial}</span>
                        </div>
                        <span className="font-black text-sm">{schoolName}</span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                        © {new Date().getFullYear()} {schoolName}. Powered by{' '}
                        <span className="text-indigo-400 font-bold">Neo-Learn</span>.
                    </p>
                    <div className="flex items-center gap-4 text-xs text-slate-500 font-bold">
                        <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
                        <span className="text-slate-700">|</span>
                        <span className="flex items-center gap-1.5 text-emerald-400">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            System Online
                        </span>
                    </div>
                </div>
            </footer>
        </div>
    );
}
