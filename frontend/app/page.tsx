// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import Link from 'next/link';
import {
    BrainCircuit, ShieldCheck, ArrowRight, Sparkles, Zap,
    CheckCircle2, Star, Lock, GraduationCap, Building2,
    Database, Bell, LineChart, Calendar, Award, ChevronDown,
} from 'lucide-react';
import { motion, AnimatePresence, useInView, useScroll, useTransform, useMotionValue, useSpring, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { saasApi, SubscriptionPlan } from '@/lib/api';

// ─── Google Fonts ────────────────────────────────────────────────────────────
function FontLoader() {
    useEffect(() => {
        const id = 'neo-learn-fonts';
        if (document.getElementById(id)) return;
        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href =
            'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,300;1,400;1,600;1,700&family=Outfit:wght@300;400;500;600;700;800;900&display=swap';
        document.head.appendChild(link);
    }, []);
    return null;
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const features = [
    {
        num: '01', title: 'AI-Powered Adaptive Learning',
        desc: 'Proprietary engine analyses every student interaction in real-time, dynamically adjusting difficulty, pacing, and content delivery.',
        tag: '98% prediction accuracy', icon: BrainCircuit,
    },
    {
        num: '02', title: 'Multi-Tenant Architecture',
        desc: 'Isolated database schemas per school with custom branding, custom domains, and granular admin controls — all from one platform.',
        tag: 'Enterprise-grade isolation', icon: Database,
    },
    {
        num: '03', title: 'Smart Study Planner',
        desc: 'AI schedules study sessions using spaced repetition (SM-2), BKT skill mastery data, and upcoming exam timelines.',
        tag: 'Spaced repetition built-in', icon: Calendar,
    },
    {
        num: '04', title: 'Real-Time Analytics',
        desc: 'Live dashboards for admins, teachers, and parents with at-risk detection, attendance heatmaps, and predictive grade forecasting.',
        tag: 'Predictive risk alerts', icon: LineChart,
    },
    {
        num: '05', title: 'AI Progress Reports',
        desc: 'Auto-generated weekly reports customised for students, parents, and teachers — each with the right level of detail.',
        tag: '3 report flavours', icon: Award,
    },
    {
        num: '06', title: 'Unified Communications',
        desc: 'Integrated notices, messaging, and push notifications keep every stakeholder — students, parents, teachers — perfectly in sync.',
        tag: 'Real-time WebSocket push', icon: Bell,
    },
];

const stats = [
    { value: 50, suffix: '+', label: 'Institutions Onboarded' },
    { value: 10000, suffix: '+', label: 'Active Students' },
    { value: 4800000, suffix: '', label: 'AI Responses Served', display: '4.8M+' },
    { value: 98, suffix: '%', label: 'Satisfaction Rate' },
];

const steps = [
    { num: '01', title: 'Register', desc: 'Create your tenant account, pick a plan, and get a dedicated subdomain provisioned in seconds.' },
    { num: '02', title: 'Configure', desc: 'Upload your logo, add teachers and students, configure AI settings to match your curriculum.' },
    { num: '03', title: 'Launch', desc: 'Go live the same day. AI adapts to each learner and you get real-time analytics from day one.' },
];

const testimonials = [
    {
        quote: 'Neo-Learn transformed how our teachers track student progress. The AI progress reports alone save days of manual work every month.',
        name: 'Dr. Sarah Jenkins', role: 'Principal, Global Academy',
    },
    {
        quote: 'Scaling to 20+ branches was seamless. The multi-tenant architecture is rock-solid and tenant isolation is exactly what enterprise demands.',
        name: 'Mark Thompson', role: 'EdTech Director, TechSchools Group',
    },
    {
        quote: "My students\u2019 retention scores went up 34% in the first semester. The AI study planner uses spaced repetition automatically.",
        name: 'Elena Rodriguez', role: 'Advanced Mathematics Teacher',
    },
];

const faqs = [
    { q: 'How does multi-tenancy work?', a: 'Each school gets a completely isolated database schema, file storage bucket, and subdomain (e.g. school.neo-learn.com). There is zero data crossover between tenants. Provisioning happens in seconds after signup.' },
    { q: 'Is our student data used to train your AI?', a: 'No — never. Your data is private, encrypted, and used exclusively for your own institution\'s analytics and student guidance. We are GDPR and FERPA compliant.' },
    { q: 'Can we integrate with our existing systems?', a: 'Yes. We expose a full REST API and WebSocket layer, plus webhooks for grade sync, attendance feeds, and notification delivery to third-party platforms.' },
    { q: 'What AI models power the tutoring?', a: 'We use OpenAI\'s GPT-4 family with Retrieval-Augmented Generation (RAG) grounded in your school\'s own curriculum materials. Confidence scoring ensures factual accuracy.' },
    { q: 'Do you offer offline / mobile access?', a: 'Yes. Our Expo-based mobile apps support offline content access and sync automatically when connectivity is restored. Available on iOS and Android.' },
    { q: 'What does onboarding look like?', a: 'After you register, your tenant is provisioned automatically. A guided setup wizard helps you add subjects, classes, teachers and students. Most schools go live within 24 hours.' },
];

// ─── Type helpers ─────────────────────────────────────────────────────────────
type LandingCard = { name: string; price: string; description: string; features: string[]; button: string; popular: boolean; note?: string; };
const fallbackPricing: LandingCard[] = [
    { name: 'Starter', price: '$49/mo', description: 'Perfect for small training centres and tutoring academies.', features: ['Up to 100 students', 'Basic AI Analytics', 'Single tenant', 'Standard support', 'Mobile app access'], button: 'Start Free Trial', popular: false },
    { name: 'Professional', price: '$199/mo', description: 'The sweet spot for growing schools and academies.', features: ['Up to 1,000 students', 'Advanced AI Tutoring', 'Custom domain', 'Priority 24/7 support', 'AI Progress Reports', 'Parent portal'], button: 'Get Started', popular: true },
    { name: 'Enterprise', price: 'Custom', description: 'For large institutions, university groups, and chains.', features: ['Unlimited students', 'Custom AI models', 'Full white-labelling', 'Dedicated success manager', 'SLA guarantees', 'On-premise option'], button: 'Contact Sales', popular: false },
];
const getCurrencyPrefix = (c?: string) => { const u = (c || 'USD').toUpperCase(); if (u === 'NPR') return 'Rs. '; if (u === 'USD') return '$'; return `${u} `; };
const fmtAmount = (v: number | string, c?: string) => `${getCurrencyPrefix(c)}${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const toLimit = (v: number, l: string) => !Number.isFinite(v) || v <= 0 ? `Unlimited ${l}` : `Up to ${v.toLocaleString('en-US')} ${l}`;
const mapPlan = (plan: SubscriptionPlan, i: number, total: number): LandingCard => {
    const f = [toLimit(Number(plan.student_limit), 'students'), toLimit(Number(plan.teacher_limit), 'teachers'), `${Number(plan.storage_limit_gb) || 0} GB storage`];
    if ((Number(plan.ai_token_limit) || 0) > 0) f.push(`${Number(plan.ai_token_limit).toLocaleString()} AI tokens/month`);
    if (plan.has_ai_tutor) f.push('AI Tutor included');
    if (plan.has_ai_eval) f.push('AI Evaluation included');
    if (plan.has_parent_portal) f.push('Parent Portal included');
    if (plan.has_analytics) f.push('Advanced Analytics included');
    const n = plan.name || 'Plan';
    const popular = /professional|pro|business|growth/i.test(n) || (total > 1 && i === Math.floor((total - 1) / 2));
    return { name: n, description: plan.description || 'Core LMS with plan-based limits.', features: f.slice(0, 6), price: `${fmtAmount(plan.price_monthly, plan.currency)}/mo`, popular, button: popular ? 'Get Started' : 'Start Free Trial', note: plan.price_yearly ? `or ${fmtAmount(plan.price_yearly, plan.currency)}/year` : undefined };
};

// ─── Micro-components ─────────────────────────────────────────────────────────
function AnimatedCounter({ value, display }: { value: number; display?: string }) {
    const [count, setCount] = useState(0);
    const ref = useRef<HTMLSpanElement>(null);
    const inView = useInView(ref, { once: true, margin: '-80px' });
    useEffect(() => {
        if (!inView) return;
        let start = 0;
        const steps = 60;
        const inc = value / steps;
        const timer = setInterval(() => {
            start += inc;
            if (start >= value) { setCount(value); clearInterval(timer); }
            else setCount(start);
        }, 1800 / steps);
        return () => clearInterval(timer);
    }, [inView, value]);
    if (display) return <span ref={ref}>{inView ? display : '0'}</span>;
    const shown = value >= 1000000 ? `${(count / 1000000).toFixed(1)}M` : value >= 1000 ? `${(count / 1000).toFixed(0)}K` : value % 1 !== 0 ? count.toFixed(1) : Math.round(count).toString();
    return <span ref={ref}>{shown}</span>;
}

function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true, margin: '-60px' });
    return (
        <motion.div ref={ref} initial={{ opacity: 0, y: 36 }} animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }} className={className}>
            {children}
        </motion.div>
    );
}

function Magnetic({ children, strength = 0.3, className = '' }: { children: React.ReactNode; strength?: number; className?: string }) {
    const reduced = useReducedMotion();
    const ref = useRef<HTMLDivElement>(null);
    const mx = useMotionValue(0);
    const my = useMotionValue(0);
    const x = useSpring(mx, { stiffness: 220, damping: 18, mass: 0.6 });
    const y = useSpring(my, { stiffness: 220, damping: 18, mass: 0.6 });
    const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (reduced || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        mx.set((e.clientX - (r.left + r.width / 2)) * strength);
        my.set((e.clientY - (r.top + r.height / 2)) * strength);
    };
    const onLeave = () => { mx.set(0); my.set(0); };
    return (
        <motion.div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} style={{ x, y }} className={`inline-block ${className}`}>
            {children}
        </motion.div>
    );
}

function FaqItem({ q, a }: { q: string; a: string }) {
    const [open, setOpen] = useState(false);
    return (
        <div onClick={() => setOpen(o => !o)} className="border-b cursor-pointer group" style={{ borderColor: 'rgba(212,163,76,0.12)' }}>
            <div className="flex items-start justify-between gap-4 py-6">
                <h4 className="font-medium leading-snug transition-colors text-[15px]" style={{ color: open ? '#d4a34c' : '#e8dcc8', fontFamily: "'Outfit', sans-serif" }}>{q}</h4>
                <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }} className="flex-shrink-0 mt-0.5">
                    <ChevronDown className="w-4 h-4" style={{ color: '#d4a34c' }} />
                </motion.div>
            </div>
            <AnimatePresence initial={false}>
                {open && (
                    <motion.div key="body" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: 'easeInOut' }}>
                        <p className="pb-6 leading-relaxed text-sm" style={{ color: '#9a8a74', fontFamily: "'Outfit', sans-serif" }}>{a}</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function SaaSLandingPage() {
    const [plans, setPlans] = useState<LandingCard[]>(fallbackPricing);
    const heroRef = useRef(null);
    const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
    const heroY = useTransform(scrollYProgress, [0, 1], [0, -120]);
    const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
    const reduced = useReducedMotion();
    const tiltX = useMotionValue(0);
    const tiltY = useMotionValue(0);
    const rotateX = useSpring(tiltX, { stiffness: 150, damping: 20 });
    const rotateY = useSpring(tiltY, { stiffness: 150, damping: 20 });
    const onHeroMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (reduced) return;
        const r = e.currentTarget.getBoundingClientRect();
        tiltX.set(((e.clientY - r.top) / r.height - 0.5) * -8);
        tiltY.set(((e.clientX - r.left) / r.width - 0.5) * 10);
    };
    const onHeroMouseLeave = () => { tiltX.set(0); tiltY.set(0); };
    const featuresRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress: featProgress } = useScroll({ target: featuresRef, offset: ['start 0.8', 'end 0.35'] });
    const featLine = useSpring(featProgress, { stiffness: 90, damping: 24 });

    useEffect(() => {
        saasApi.getPublicPlans().then(data => {
            const active = data.filter(p => p.is_active !== false).sort((a, b) => Number(a.price_monthly) - Number(b.price_monthly));
            if (active.length) setPlans(active.map((p, i) => mapPlan(p, i, active.length)));
        }).catch(() => { });
    }, []);

    const S = { bg: '#0c0a08', cream: '#f0e6d3', muted: '#7a6a58', amber: '#d4a34c', amberLight: '#f0c06a', border: 'rgba(212,163,76,0.14)', dim: '#2a2318' };

    return (
        <div style={{ background: S.bg, color: S.cream, fontFamily: "'Outfit', sans-serif" }} className="min-h-screen overflow-x-hidden selection:bg-amber-500/20">
            <FontLoader />

            {/* ── Nav ───────────────────────────────────────────────────── */}
            <nav className="fixed top-0 w-full z-50 backdrop-blur-xl" style={{ background: 'rgba(12,10,8,0.82)', borderBottom: `1px solid ${S.border}` }}>
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    {/* Logo */}
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#d4a34c,#a07030)' }}>
                            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, fontSize: 14, color: '#0c0a08' }}>N</span>
                        </div>
                        <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, letterSpacing: '-0.03em', fontSize: 18, color: S.cream }}>NEO<span style={{ color: S.amber }}>·</span>LEARN</span>
                    </div>

                    {/* Links pill */}
                    <div className="hidden lg:flex items-center gap-1 px-2 py-1 rounded-full" style={{ background: 'rgba(212,163,76,0.06)', border: `1px solid ${S.border}` }}>
                        {[['Features', '#features'], ['Intelligence', '#intelligence'], ['Pricing', '#pricing'], ['FAQ', '#faq']].map(([l, h]) => (
                            <a key={l} href={h} className="px-4 py-1.5 rounded-full text-sm font-medium transition-all hover:text-amber-300" style={{ color: S.muted }}>
                                {l}
                            </a>
                        ))}
                    </div>

                    <div className="flex items-center gap-3">
                        <Link href="/saas-login" className="hidden sm:block text-sm font-medium px-4 py-2 rounded-full transition-all hover:text-amber-300" style={{ color: S.muted }}>Sign In</Link>
                        <Link href="/contact">
                            <button className="px-5 py-2 rounded-full text-sm font-bold transition-all hover:brightness-110" style={{ background: 'linear-gradient(135deg,#d4a34c,#b07a28)', color: '#0c0a08', boxShadow: '0 4px 24px rgba(212,163,76,0.25)' }}>
                                Request a Demo →
                            </button>
                        </Link>
                    </div>
                </div>
            </nav>

            {/* ── Hero ──────────────────────────────────────────────────── */}
            <section ref={heroRef} className="relative min-h-screen flex items-center pt-16 overflow-hidden">
                {/* Atmospheric background */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-[-10%] right-[-5%] w-[800px] h-[800px] rounded-full opacity-20" style={{ background: 'radial-gradient(circle,#d4a34c 0%,transparent 70%)', filter: 'blur(80px)' }} />
                    <div className="absolute bottom-0 left-[-10%] w-[600px] h-[600px] rounded-full opacity-10" style={{ background: 'radial-gradient(circle,#8b6540 0%,transparent 70%)', filter: 'blur(100px)' }} />
                    {/* Grid lines */}
                    <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: `linear-gradient(${S.amber} 1px,transparent 1px),linear-gradient(90deg,${S.amber} 1px,transparent 1px)`, backgroundSize: '80px 80px' }} />
                </div>

                <motion.div style={{ y: heroY, opacity: heroOpacity }} className="max-w-7xl mx-auto px-6 pt-20 pb-32 relative z-10 w-full">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        {/* Left: Text */}
                        <div>
                            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}
                                className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-[0.18em] mb-10"
                                style={{ background: 'rgba(212,163,76,0.08)', border: `1px solid rgba(212,163,76,0.2)`, color: S.amber }}>
                                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#4ade80' }} />
                                AI Education Platform · Live
                            </motion.div>

                            <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1 }}
                                className="leading-none mb-8"
                                style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(56px,8vw,104px)', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 0.92 }}>
                                The{' '}
                                <em style={{ color: S.amber, fontStyle: 'italic' }}>Intelligent</em>
                                <br />
                                School<br />
                                <span style={{ fontWeight: 300, opacity: 0.45 }}>Management</span><br />
                                Platform.
                            </motion.h1>

                            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.25 }}
                                className="text-lg font-light leading-relaxed mb-10 max-w-md" style={{ color: S.muted }}>
                                Multi-tenant SaaS infrastructure for institutions that demand excellence.
                                Deploy, brand, and scale your AI learning platform in under 24 hours.
                            </motion.p>

                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.35 }}
                                className="flex flex-col sm:flex-row items-start gap-4">
                                <Magnetic>
                                    <Link href="/contact">
                                        <button className="group flex items-center gap-2 px-8 py-4 rounded-full text-base font-bold transition-all hover:brightness-110 hover:scale-[1.02]"
                                            style={{ background: 'linear-gradient(135deg,#d4a34c,#a07030)', color: '#0c0a08', boxShadow: '0 8px 40px rgba(212,163,76,0.3)' }}>
                                            Request a Demo
                                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    </Link>
                                </Magnetic>
                                <Magnetic>
                                    <a href="#intelligence">
                                        <button className="flex items-center gap-2 px-8 py-4 rounded-full text-base font-medium transition-all hover:brightness-110"
                                            style={{ background: 'rgba(212,163,76,0.07)', border: `1px solid rgba(212,163,76,0.2)`, color: S.cream }}>
                                            See AI in Action
                                        </button>
                                    </a>
                                </Magnetic>
                            </motion.div>

                            {/* Trust badges */}
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                                className="flex items-center gap-6 mt-12">
                                {[['50+', 'Schools'], ['10K+', 'Students'], ['4.8M+', 'AI Responses']].map(([v, l]) => (
                                    <div key={l}>
                                        <div className="text-xl font-black" style={{ color: S.amber }}>{v}</div>
                                        <div className="text-xs font-medium" style={{ color: S.muted }}>{l}</div>
                                    </div>
                                ))}
                            </motion.div>
                        </div>

                        {/* Right: Visual card cluster */}
                        <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.9, delay: 0.3 }}
                            onMouseMove={onHeroMouseMove} onMouseLeave={onHeroMouseLeave}
                            style={{ rotateX, rotateY, transformPerspective: 900 }}
                            className="relative hidden lg:block">
                            {/* Main dashboard card */}
                            <div className="rounded-3xl p-6 relative" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${S.border}`, backdropFilter: 'blur(20px)', boxShadow: '0 40px 80px rgba(0,0,0,0.5)' }}>
                                {/* Header */}
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: S.amber }}>Student Analytics</p>
                                        <p className="text-2xl font-black" style={{ color: S.cream }}>Westside Academy</p>
                                    </div>
                                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(212,163,76,0.12)' }}>
                                        <BrainCircuit className="w-5 h-5" style={{ color: S.amber }} />
                                    </div>
                                </div>

                                {/* Mini stat row */}
                                <div className="grid grid-cols-3 gap-3 mb-6">
                                    {[['284', 'Students', '#4ade80'], ['94%', 'Attendance', S.amber], ['3.8M', 'AI Tokens', '#60a5fa']].map(([v, l, c]) => (
                                        <div key={l} className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid rgba(255,255,255,0.05)` }}>
                                            <div className="text-xl font-black mb-0.5" style={{ color: c }}>{v}</div>
                                            <div className="text-xs font-medium" style={{ color: S.muted }}>{l}</div>
                                        </div>
                                    ))}
                                </div>

                                {/* Progress bars */}
                                <div className="space-y-3 mb-6">
                                    <p className="text-xs font-bold uppercase tracking-widest" style={{ color: S.muted }}>Subject Mastery</p>
                                    {[['Mathematics', 82], ['Biology', 71], ['Literature', 93]].map(([s, pct]) => (
                                        <div key={s}>
                                            <div className="flex justify-between text-xs font-medium mb-1">
                                                <span style={{ color: S.cream }}>{s}</span>
                                                <span style={{ color: S.amber }}>{pct}%</span>
                                            </div>
                                            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                                <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, delay: 0.8 }}
                                                    className="h-full rounded-full" style={{ background: `linear-gradient(90deg,${S.amber},${S.amberLight})` }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* AI insight pill */}
                                <div className="flex items-center gap-3 rounded-2xl p-3.5" style={{ background: 'rgba(212,163,76,0.08)', border: `1px solid rgba(212,163,76,0.15)` }}>
                                    <Sparkles className="w-4 h-4 flex-shrink-0" style={{ color: S.amber }} />
                                    <p className="text-xs font-medium" style={{ color: '#c8b080' }}>3 students are at risk of falling behind in Biology — AI suggests extra review sessions.</p>
                                </div>
                            </div>

                            {/* Floating badges */}
                            <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 3.5, repeat: Infinity }}
                                className="absolute -top-6 -right-6 rounded-2xl px-5 py-3.5 flex items-center gap-3"
                                style={{ background: 'rgba(18,15,10,0.9)', border: `1px solid ${S.border}`, backdropFilter: 'blur(20px)', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(74,222,128,0.12)' }}>
                                    <CheckCircle2 className="w-4 h-4" style={{ color: '#4ade80' }} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: S.muted }}>Live Students</p>
                                    <p className="text-base font-black" style={{ color: S.cream }}>124,582</p>
                                </div>
                            </motion.div>

                            <motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 4, repeat: Infinity, delay: 1 }}
                                className="absolute -bottom-6 -left-6 rounded-2xl px-5 py-3.5 flex items-center gap-3"
                                style={{ background: 'rgba(18,15,10,0.9)', border: `1px solid ${S.border}`, backdropFilter: 'blur(20px)', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(212,163,76,0.12)' }}>
                                    <Award className="w-4 h-4" style={{ color: S.amber }} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: S.muted }}>Satisfaction</p>
                                    <p className="text-base font-black" style={{ color: S.cream }}>98% ★</p>
                                </div>
                            </motion.div>
                        </motion.div>
                    </div>
                </motion.div>
            </section>

            {/* ── Marquee ───────────────────────────────────────────────── */}
            <div className="py-10 overflow-hidden" style={{ borderTop: `1px solid ${S.border}`, borderBottom: `1px solid ${S.border}`, background: 'rgba(212,163,76,0.02)' }}>
                <div className="flex gap-16 whitespace-nowrap" style={{ animation: 'marquee 28s linear infinite' }}>
                    {[...Array(3)].map((_, r) => (
                        <div key={r} className="flex items-center gap-16 flex-shrink-0">
                            {['STANFORD AFFILIATED', 'MIT TECHNOLOGY', 'GOOGLE EDUCATION', 'OXFORD ACADEMY', 'CAMBRIDGE ONLINE', 'IVY LEAGUE CONSORTIUM', 'HARVARD NETWORK'].map(n => (
                                <span key={n} className="text-xs font-black uppercase tracking-[0.3em]" style={{ color: S.dim, letterSpacing: '0.3em' }}>{n}</span>
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Stats ─────────────────────────────────────────────────── */}
            <section className="py-28 relative" style={{ borderBottom: `1px solid ${S.border}` }}>
                <div className="max-w-6xl mx-auto px-6">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
                        {stats.map((s, i) => (
                            <Reveal key={s.label} delay={i * 0.08}>
                                <div className="relative">
                                    <div className="text-5xl lg:text-6xl font-black mb-2 tabular-nums" style={{ color: S.amber, fontFamily: "'Outfit', sans-serif" }}>
                                        <AnimatedCounter value={s.value} display={s.display} />{!s.display && s.suffix}
                                    </div>
                                    <div className="text-xs font-bold uppercase tracking-widest" style={{ color: S.muted }}>{s.label}</div>
                                    <div className="absolute -top-2 -left-2 text-6xl font-black opacity-5 select-none" style={{ color: S.amber, fontFamily: "'Cormorant Garamond', serif" }}>{String(i + 1).padStart(2, '0')}</div>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Features ──────────────────────────────────────────────── */}
            <section id="features" className="py-32 lg:py-48 relative">
                <div className="max-w-7xl mx-auto px-6">
                    <Reveal>
                        <div className="grid lg:grid-cols-2 gap-4 items-end mb-20">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.25em] mb-5" style={{ color: S.amber }}>Platform Capabilities</p>
                                <h2 className="leading-none" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(44px,6vw,80px)', fontWeight: 600, letterSpacing: '-0.02em' }}>
                                    Built for the<br />
                                    <em style={{ fontStyle: 'italic', color: S.amber }}>next generation</em><br />
                                    of educators.
                                </h2>
                            </div>
                            <p className="lg:text-right text-base font-light leading-relaxed max-w-sm lg:ml-auto" style={{ color: S.muted }}>
                                We've re-engineered the LMS from the ground up, placing AI at the heart of every interaction — from lesson delivery to performance prediction.
                            </p>
                        </div>
                    </Reveal>

                    <div ref={featuresRef} className="relative">
                        <div className="hidden lg:block absolute -left-8 top-0 bottom-0 w-px pointer-events-none" style={{ background: 'rgba(212,163,76,0.12)' }} />
                        <motion.div className="hidden lg:block absolute -left-8 top-0 bottom-0 w-px origin-top pointer-events-none"
                            style={{ background: `linear-gradient(180deg,${S.amber},${S.amberLight})`, scaleY: reduced ? 1 : featLine, boxShadow: '0 0 12px rgba(212,163,76,0.5)' }} />
                        <div className="space-y-0">
                            {features.map((f, i) => (
                            <Reveal key={f.num} delay={i * 0.06}>
                                <motion.div whileHover={{ x: 8 }} transition={{ duration: 0.2 }}
                                    className="grid lg:grid-cols-[120px_1fr_240px] gap-8 items-start py-8 group cursor-default"
                                    style={{ borderBottom: `1px solid ${S.border}` }}>
                                    <div className="font-black text-5xl lg:text-6xl tabular-nums group-hover:opacity-100 transition-opacity"
                                        style={{ color: 'transparent', WebkitTextStroke: `1px rgba(212,163,76,0.25)`, fontFamily: "'Outfit', sans-serif", opacity: 0.6 }}>
                                        {f.num}
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-xl font-bold leading-snug transition-colors group-hover:text-amber-300" style={{ color: S.cream }}>{f.title}</h3>
                                        <p className="font-light leading-relaxed text-sm max-w-xl" style={{ color: S.muted }}>{f.desc}</p>
                                    </div>
                                    <div className="flex items-center gap-2 lg:justify-end">
                                        <f.icon className="w-4 h-4" style={{ color: S.amber }} />
                                        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: S.amber }}>{f.tag}</span>
                                    </div>
                                </motion.div>
                            </Reveal>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── How It Works ──────────────────────────────────────────── */}
            <section className="py-28 relative overflow-hidden" style={{ background: 'rgba(212,163,76,0.025)', borderTop: `1px solid ${S.border}`, borderBottom: `1px solid ${S.border}` }}>
                <div className="max-w-7xl mx-auto px-6">
                    <Reveal>
                        <div className="text-center mb-16">
                            <p className="text-xs font-black uppercase tracking-[0.25em] mb-4" style={{ color: S.amber }}>Simple Onboarding</p>
                            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(40px,5vw,72px)', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 0.95 }}>
                                Live in <em style={{ color: S.amber, fontStyle: 'italic' }}>three steps</em>.
                            </h2>
                        </div>
                    </Reveal>

                    <div className="grid lg:grid-cols-3 gap-8 relative">
                        {/* Connecting line */}
                        <div className="hidden lg:block absolute top-12 left-[calc(33.3%-60px)] right-[calc(33.3%-60px)] h-px" style={{ background: `linear-gradient(90deg,transparent,${S.amber},transparent)`, opacity: 0.3 }} />
                        {steps.map((s, i) => (
                            <Reveal key={s.num} delay={i * 0.12}>
                                <div className="relative text-center p-8 rounded-3xl transition-all group" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${S.border}` }}>
                                    <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 transition-all group-hover:scale-110"
                                        style={{ background: 'rgba(212,163,76,0.08)', border: `1px solid rgba(212,163,76,0.2)`, boxShadow: '0 0 40px rgba(212,163,76,0.08)' }}>
                                        <span className="text-2xl font-black" style={{ color: S.amber, fontFamily: "'Outfit', sans-serif" }}>{s.num}</span>
                                    </div>
                                    <h3 className="text-2xl font-bold mb-3" style={{ fontFamily: "'Cormorant Garamond', serif", color: S.cream }}>{s.title}</h3>
                                    <p className="text-sm font-light leading-relaxed" style={{ color: S.muted }}>{s.desc}</p>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── AI Tutor Preview ──────────────────────────────────────── */}
            <section id="intelligence" className="py-32 lg:py-48 relative overflow-hidden">
                <div className="absolute right-0 top-0 w-[600px] h-[600px] pointer-events-none opacity-15" style={{ background: 'radial-gradient(circle,#d4a34c,transparent 70%)', filter: 'blur(80px)' }} />
                <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-20 items-center">
                    <Reveal>
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.25em] mb-6" style={{ color: S.amber }}>Real-Time AI Guidance</p>
                            <h2 className="mb-6 leading-none" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(44px,5.5vw,80px)', fontWeight: 600, letterSpacing: '-0.02em' }}>
                                An AI tutor<br />
                                that <em style={{ fontStyle: 'italic', color: S.amber }}>never sleeps</em>.
                            </h2>
                            <p className="text-base font-light leading-relaxed mb-8 max-w-sm" style={{ color: S.muted }}>
                                Identifies learning gaps, generates custom study schedules, and provides 24/7 support tailored to each student's exact curriculum.
                            </p>
                            <div className="space-y-3">
                                {['Individualised progress tracking per student', 'Automated lesson planning for teachers', 'Predictive analytics for performance risk', 'Spaced repetition — SM-2 algorithm', 'Bayesian Knowledge Tracing for skill mastery'].map(item => (
                                    <div key={item} className="flex items-center gap-3">
                                        <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: S.amber }} />
                                        <span className="text-sm font-medium" style={{ color: '#b8a080' }}>{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Reveal>

                    <Reveal delay={0.15}>
                        <div className="relative">
                            <div className="rounded-3xl p-6 relative" style={{ background: '#0f0d0a', border: `1px solid ${S.border}`, boxShadow: `0 0 80px rgba(212,163,76,0.08), 0 40px 80px rgba(0,0,0,0.5)` }}>
                                {/* Terminal header */}
                                <div className="flex items-center gap-2 mb-5 pb-4" style={{ borderBottom: `1px solid ${S.border}` }}>
                                    <div className="flex gap-1.5">
                                        <div className="w-3 h-3 rounded-full" style={{ background: '#ff5f56' }} />
                                        <div className="w-3 h-3 rounded-full" style={{ background: '#ffbd2e' }} />
                                        <div className="w-3 h-3 rounded-full" style={{ background: '#27c93f' }} />
                                    </div>
                                    <div className="flex-1 text-center">
                                        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: S.muted }}>Neo-Learn AI Tutor</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#4ade80' }} />
                                        <span className="text-[10px] font-bold" style={{ color: '#4ade80' }}>Online</span>
                                    </div>
                                </div>

                                {/* Messages */}
                                <div className="space-y-4 mb-5">
                                    <div className="flex gap-3 items-end">
                                        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-black" style={{ background: 'rgba(212,163,76,0.15)', color: S.amber }}>S</div>
                                        <div className="rounded-2xl rounded-bl-none px-4 py-3 text-sm max-w-[80%]" style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid rgba(255,255,255,0.07)`, color: '#c8b890' }}>
                                            Can you explain the difference between Mitochondria and Chloroplasts?
                                        </div>
                                    </div>
                                    <div className="flex gap-3 items-end justify-end">
                                        <div className="rounded-2xl rounded-br-none px-4 py-3 text-sm max-w-[80%]" style={{ background: 'rgba(212,163,76,0.12)', border: `1px solid rgba(212,163,76,0.2)`, color: S.cream }}>
                                            Great question! Mitochondria are the "power plants" — they break down glucose to make ATP energy. Chloroplasts are "solar panels" — they use sunlight to create glucose. 🔋☀️
                                            <div className="mt-2 text-xs" style={{ color: S.muted }}>Based on your Biology Unit 3 materials</div>
                                        </div>
                                        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg,#d4a34c,#8b6030)' }}>
                                            <Sparkles className="w-3.5 h-3.5" style={{ color: '#0c0a08' }} />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 pl-10">
                                        {[0, 100, 200].map(d => (
                                            <div key={d} className="w-2 h-2 rounded-full animate-bounce" style={{ background: S.amber, opacity: 0.6, animationDelay: `${d}ms` }} />
                                        ))}
                                    </div>
                                </div>

                                {/* Input bar */}
                                <div className="flex gap-2.5 mt-4 pt-4" style={{ borderTop: `1px solid ${S.border}` }}>
                                    <div className="flex-1 rounded-xl px-4 h-10 flex items-center text-xs" style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${S.border}`, color: S.muted }}>
                                        Ask anything about your curriculum…
                                    </div>
                                    <button className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all hover:brightness-110" style={{ background: 'linear-gradient(135deg,#d4a34c,#a07030)' }}>
                                        <Zap className="w-4 h-4" style={{ color: '#0c0a08' }} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </Reveal>
                </div>
            </section>

            {/* ── Pricing ───────────────────────────────────────────────── */}
            <section id="pricing" className="py-32 lg:py-48 relative" style={{ borderTop: `1px solid ${S.border}` }}>
                <div className="max-w-7xl mx-auto px-6">
                    <Reveal>
                        <div className="text-center mb-16">
                            <p className="text-xs font-black uppercase tracking-[0.25em] mb-5" style={{ color: S.amber }}>Pricing</p>
                            <h2 className="mb-4" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(40px,5vw,72px)', fontWeight: 600, letterSpacing: '-0.02em' }}>
                                Built for <em style={{ fontStyle: 'italic', color: S.amber }}>every scale</em>.
                            </h2>
                            <p className="text-sm font-light" style={{ color: S.muted }}>No hidden fees. Core AI engine included in every plan.</p>
                        </div>
                    </Reveal>

                    <div className="grid md:grid-cols-3 gap-6">
                        {plans.map((plan, i) => (
                            <Reveal key={plan.name} delay={i * 0.1}>
                                <div className="relative flex flex-col h-full rounded-3xl p-8 transition-all"
                                    style={plan.popular ? {
                                        background: 'linear-gradient(145deg,rgba(212,163,76,0.12),rgba(212,163,76,0.04))',
                                        border: `1.5px solid rgba(212,163,76,0.45)`,
                                        boxShadow: '0 0 60px rgba(212,163,76,0.08)'
                                    } : {
                                        background: 'rgba(255,255,255,0.02)',
                                        border: `1px solid ${S.border}`
                                    }}>
                                    {plan.popular && (
                                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-5 py-1.5 rounded-full text-xs font-black uppercase tracking-widest"
                                            style={{ background: 'linear-gradient(135deg,#d4a34c,#a07030)', color: '#0c0a08' }}>
                                            Most Popular
                                        </div>
                                    )}

                                    <div className="mb-6">
                                        <h3 className="text-xl font-bold mb-1" style={{ color: S.cream }}>{plan.name}</h3>
                                        <p className="text-xs font-medium mb-5" style={{ color: S.muted }}>{plan.description}</p>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-4xl font-black" style={{ color: plan.popular ? S.amberLight : S.cream, fontFamily: "'Outfit', sans-serif" }}>{plan.price.split('/')[0]}</span>
                                            {plan.price.includes('/') && <span className="text-xs font-medium" style={{ color: S.muted }}>/{plan.price.split('/')[1]}</span>}
                                        </div>
                                        {plan.note && <p className="text-xs mt-1" style={{ color: S.muted }}>{plan.note}</p>}
                                    </div>

                                    <div className="space-y-3 mb-8 flex-1">
                                        {plan.features.map(f => (
                                            <div key={f} className="flex items-start gap-2.5">
                                                <div className="w-1 h-1 rounded-full mt-2 flex-shrink-0" style={{ background: S.amber }} />
                                                <span className="text-sm font-medium" style={{ color: plan.popular ? '#d8c4a0' : S.muted }}>{f}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <Link href="/contact">
                                        <button className="w-full py-3.5 rounded-2xl text-sm font-bold transition-all hover:brightness-110"
                                            style={plan.popular ? {
                                                background: 'linear-gradient(135deg,#d4a34c,#a07030)',
                                                color: '#0c0a08',
                                                boxShadow: '0 8px 24px rgba(212,163,76,0.2)'
                                            } : {
                                                background: 'rgba(212,163,76,0.08)',
                                                border: `1px solid rgba(212,163,76,0.2)`,
                                                color: S.amber
                                            }}>
                                            Request a Demo
                                        </button>
                                    </Link>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Testimonials ──────────────────────────────────────────── */}
            <section className="py-32 relative" style={{ borderTop: `1px solid ${S.border}`, background: 'rgba(212,163,76,0.015)' }}>
                <div className="max-w-7xl mx-auto px-6">
                    <Reveal>
                        <div className="mb-16">
                            <p className="text-xs font-black uppercase tracking-[0.25em] mb-5" style={{ color: S.amber }}>Testimonials</p>
                            <h2 className="leading-none" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(40px,5vw,72px)', fontWeight: 600 }}>
                                Loved by <em style={{ fontStyle: 'italic', color: S.amber }}>educators</em>.
                            </h2>
                        </div>
                    </Reveal>

                    <div className="grid lg:grid-cols-3 gap-8">
                        {testimonials.map((t, i) => (
                            <Reveal key={t.name} delay={i * 0.1}>
                                <motion.div whileHover={{ y: -6, transition: { duration: 0.2 } }}
                                    className="p-8 rounded-3xl h-full flex flex-col"
                                    style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${S.border}` }}>
                                    {/* Large quote mark */}
                                    <div className="text-7xl leading-none mb-4 select-none" style={{ fontFamily: "'Cormorant Garamond', serif", color: S.amber, opacity: 0.35 }}>"</div>
                                    <p className="text-base font-light leading-relaxed flex-1 mb-8 italic" style={{ color: '#c0a87a', fontFamily: "'Cormorant Garamond', serif", fontSize: 18 }}>
                                        {t.quote}
                                    </p>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                                            style={{ background: 'linear-gradient(135deg,rgba(212,163,76,0.3),rgba(160,112,48,0.3))', color: S.amber, border: `1px solid rgba(212,163,76,0.2)` }}>
                                            {t.name.split(' ').map(n => n[0]).join('')}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold" style={{ color: S.cream }}>{t.name}</p>
                                            <p className="text-xs" style={{ color: S.muted }}>{t.role}</p>
                                        </div>
                                    </div>
                                </motion.div>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── FAQ ───────────────────────────────────────────────────── */}
            <section id="faq" className="py-28 relative" style={{ borderTop: `1px solid ${S.border}` }}>
                <div className="max-w-3xl mx-auto px-6">
                    <Reveal>
                        <div className="text-center mb-14">
                            <p className="text-xs font-black uppercase tracking-[0.25em] mb-5" style={{ color: S.amber }}>FAQ</p>
                            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(36px,4.5vw,64px)', fontWeight: 600 }}>
                                Common <em style={{ fontStyle: 'italic', color: S.amber }}>questions</em>.
                            </h2>
                        </div>
                    </Reveal>
                    <div>
                        {faqs.map((f, i) => (
                            <Reveal key={i} delay={i * 0.04}>
                                <FaqItem q={f.q} a={f.a} />
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA ───────────────────────────────────────────────────── */}
            <section className="py-40 relative overflow-hidden" style={{ borderTop: `1px solid ${S.border}` }}>
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 100%,rgba(212,163,76,0.1),transparent)' }} />
                    <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg,transparent,${S.amber},transparent)`, opacity: 0.4 }} />
                </div>
                <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
                    <Reveal>
                        <h2 className="leading-none mb-8" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(60px,10vw,140px)', fontWeight: 700, letterSpacing: '-0.02em' }}>
                            Build the<br />
                            <em style={{ fontStyle: 'italic', color: S.amber }}>future</em>.
                        </h2>
                    </Reveal>
                    <Reveal delay={0.1}>
                        <p className="text-lg font-light mb-12 max-w-md mx-auto" style={{ color: S.muted }}>
                            Join 50+ institutions already transforming how their students learn with AI.
                        </p>
                    </Reveal>
                    <Reveal delay={0.2}>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-5 mb-14">
                            <Magnetic>
                                <Link href="/contact">
                                    <button className="px-10 py-5 rounded-full text-lg font-bold transition-all hover:brightness-110 hover:scale-[1.03]"
                                        style={{ background: 'linear-gradient(135deg,#d4a34c,#a07030)', color: '#0c0a08', boxShadow: '0 16px 64px rgba(212,163,76,0.35)' }}>
                                        Request a Demo →
                                    </button>
                                </Link>
                            </Magnetic>
                            <Magnetic>
                                <Link href="/saas-login">
                                    <button className="px-10 py-5 rounded-full text-lg font-medium transition-all hover:brightness-110"
                                        style={{ background: 'rgba(212,163,76,0.06)', border: `1px solid rgba(212,163,76,0.2)`, color: S.cream }}>
                                        Admin Sign In
                                    </button>
                                </Link>
                            </Magnetic>
                        </div>
                    </Reveal>
                    <Reveal delay={0.3}>
                        <div className="flex flex-wrap justify-center gap-8 text-xs font-bold uppercase tracking-widest" style={{ color: S.dim }}>
                            <span className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5" style={{ color: S.amber }} /> No Credit Card</span>
                            <span className="flex items-center gap-2"><Lock className="w-3.5 h-3.5" style={{ color: S.amber }} /> 256-bit Encryption</span>
                            <span className="flex items-center gap-2"><ShieldCheck className="w-3.5 h-3.5" style={{ color: S.amber }} /> GDPR Compliant</span>
                        </div>
                    </Reveal>
                </div>
            </section>

            {/* ── Footer ────────────────────────────────────────────────── */}
            <footer className="py-16" style={{ borderTop: `1px solid ${S.border}`, background: '#08060400' }}>
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-10 mb-14">
                        <div className="lg:col-span-2 space-y-5">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#d4a34c,#a07030)' }}>
                                    <span style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, fontSize: 14, color: '#0c0a08' }}>N</span>
                                </div>
                                <span className="text-lg font-black" style={{ fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.03em' }}>NEO<span style={{ color: S.amber }}>·</span>LEARN</span>
                            </div>
                            <p className="text-sm font-light leading-relaxed max-w-xs" style={{ color: S.muted }}>
                                Next-generation AI education infrastructure for institutions that demand excellence and scale.
                            </p>
                            <div className="flex gap-2.5">
                                {['𝕏', 'in', 'gh'].map(s => (
                                    <div key={s} className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black cursor-pointer transition-all hover:scale-110"
                                        style={{ background: 'rgba(212,163,76,0.08)', border: `1px solid ${S.border}`, color: S.amber }}>
                                        {s}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {[
                            { title: 'Platform', links: ['AI Tutoring', 'Study Planner', 'Analytics Engine', 'Progress Reports', 'Mobile App'] },
                            { title: 'Company', links: ['About Us', 'Careers', 'Privacy Policy', 'Terms of Service', 'Ethical AI'] },
                            { title: 'Resources', links: ['Documentation', 'Help Centre', 'API Reference', 'Status Page'] },
                        ].map(col => (
                            <div key={col.title} className="space-y-4">
                                <h5 className="text-xs font-black uppercase tracking-widest" style={{ color: '#5a4a38' }}>{col.title}</h5>
                                <ul className="space-y-2.5">
                                    {col.links.map(l => (
                                        <li key={l} className="text-sm font-medium cursor-pointer transition-colors hover:text-amber-300" style={{ color: S.muted }}>{l}</li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-8" style={{ borderTop: `1px solid ${S.border}` }}>
                        <p className="text-xs font-bold tracking-widest" style={{ color: '#3a2e24' }}>© 2026 NEO-LEARN · AN APEESYS LABS PRODUCTION</p>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#4ade80' }} />
                            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#4ade80' }}>All Systems Operational</span>
                        </div>
                    </div>
                </div>
            </footer>

            {/* ── Global Styles ──────────────────────────────────────────── */}
            <style jsx global>{`
                html { scroll-behavior: smooth; }
                * { -webkit-font-smoothing: antialiased; }
                @keyframes marquee {
                    0%   { transform: translateX(0); }
                    100% { transform: translateX(-33.333%); }
                }
            `}</style>
        </div>
    );
}
