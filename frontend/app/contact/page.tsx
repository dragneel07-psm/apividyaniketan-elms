// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
    Mail, Phone, Building2, Users, MessageSquare,
    CheckCircle2, ArrowLeft, Send, Loader2, GraduationCap,
    BrainCircuit, ShieldCheck, Zap,
} from 'lucide-react';

const S = {
    bg: '#0c0a08',
    card: 'rgba(255,255,255,0.03)',
    border: 'rgba(212,163,76,0.15)',
    amber: '#d4a34c',
    cream: '#f5e6c8',
    muted: '#9d8e7a',
    dim: '#5c5246',
};

// ── Static style constants (avoid recreating objects on every render) ─────────
const SIZE_ACTIVE_STYLE = {
    background: 'linear-gradient(135deg,#d4a34c,#a07030)',
    color: '#0c0a08',
} as const;
const SIZE_INACTIVE_STYLE = {
    background: 'rgba(212,163,76,0.06)',
    border: `1px solid rgba(212,163,76,0.15)`,
    color: '#9d8e7a',
} as const;
const INTEREST_ACTIVE_STYLE = {
    background: 'rgba(212,163,76,0.12)',
    border: `1.5px solid rgba(212,163,76,0.5)`,
    color: '#f5e6c8',
} as const;
const INTEREST_INACTIVE_STYLE = {
    background: 'rgba(255,255,255,0.02)',
    border: `1px solid rgba(212,163,76,0.15)`,
    color: '#9d8e7a',
} as const;

const institutionSizes = [
    'Under 100 students',
    '100 – 500 students',
    '500 – 2,000 students',
    '2,000 – 10,000 students',
    '10,000+ students',
];

const interests = [
    { icon: BrainCircuit, label: 'AI Tutoring & Adaptive Learning' },
    { icon: GraduationCap, label: 'Student & Teacher Management' },
    { icon: ShieldCheck, label: 'Multi-Tenant School Network' },
    { icon: Zap, label: 'Analytics & Reporting' },
];

type FormState = 'idle' | 'submitting' | 'success' | 'error';

export default function ContactPage() {
    const [formState, setFormState] = useState<FormState>('idle');
    const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
    const [selectedSize, setSelectedSize] = useState('');
    const [form, setForm] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        institution: '',
        role: '',
        message: '',
    });

    function toggleInterest(label: string) {
        setSelectedInterests(prev =>
            prev.includes(label) ? prev.filter(i => i !== label) : [...prev, label]
        );
    }

    function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.first_name || !form.email || !form.institution) return;

        setFormState('submitting');

        // Compose a mailto — works without a backend form endpoint.
        // In production, replace with a real API call (e.g. Resend, Formspree).
        const body = [
            `Name: ${form.first_name} ${form.last_name}`,
            `Email: ${form.email}`,
            `Phone: ${form.phone || 'Not provided'}`,
            `Institution: ${form.institution}`,
            `Role: ${form.role || 'Not specified'}`,
            `Size: ${selectedSize || 'Not specified'}`,
            `Interests: ${selectedInterests.join(', ') || 'None selected'}`,
            `Message: ${form.message || 'None'}`,
        ].join('\n');

        // Show success screen, then open mailto so the user sees confirmation first.
        // In production, replace with a real API call (e.g. Resend, Formspree).
        setFormState('success');
        setTimeout(() => {
            window.location.href =
                `mailto:demo@manyaltech.com?subject=Demo Request — ${encodeURIComponent(form.institution)}&body=${encodeURIComponent(body)}`;
        }, 600);
    }

    return (
        <div className="min-h-screen" style={{ background: S.bg }}>
            {/* ── Nav ── */}
            <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 border-b"
                style={{ background: 'rgba(12,10,8,0.85)', backdropFilter: 'blur(20px)', borderColor: S.border }}>
                <Link href="/" className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg,#d4a34c,#a07030)' }}>
                        <GraduationCap className="w-4 h-4 text-[#0c0a08]" />
                    </div>
                    <span className="font-bold text-sm" style={{ color: S.cream }}>E-Learning</span>
                </Link>
                <Link href="/" className="flex items-center gap-1.5 text-sm transition-colors hover:text-amber-300"
                    style={{ color: S.muted }}>
                    <ArrowLeft className="w-4 h-4" /> Back to Home
                </Link>
            </nav>

            {/* ── Hero ── */}
            <section className="pt-32 pb-16 px-6 text-center relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full opacity-15"
                        style={{ background: `radial-gradient(circle,${S.amber} 0%,transparent 70%)`, filter: 'blur(80px)' }} />
                </div>
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="relative z-10 max-w-2xl mx-auto space-y-5"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border"
                        style={{ color: S.amber, borderColor: S.border, background: 'rgba(212,163,76,0.06)' }}>
                        <Zap className="w-3 h-3" /> Request a Demo
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold leading-tight" style={{ color: S.cream }}>
                        See E-Learning in Action
                    </h1>
                    <p className="text-lg leading-relaxed" style={{ color: S.muted }}>
                        Fill in the form and our team will reach out within 24 hours to schedule
                        a personalised walkthrough of the platform — no commitment required.
                    </p>
                </motion.div>
            </section>

            {/* ── Main Grid ── */}
            <section className="max-w-6xl mx-auto px-6 pb-24 grid lg:grid-cols-5 gap-10 items-start">

                {/* ── Left: highlights ── */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="lg:col-span-2 space-y-6"
                >
                    <div className="p-6 rounded-3xl border space-y-4"
                        style={{ background: S.card, borderColor: S.border }}>
                        <h2 className="text-lg font-bold" style={{ color: S.cream }}>What you&apos;ll get</h2>
                        {[
                            'Live platform walkthrough tailored to your institution',
                            'AI tutor & adaptive learning demo with real student data',
                            'Multi-tenant architecture overview',
                            'Pricing & onboarding timeline discussion',
                            'Answers to all your technical questions',
                        ].map(item => (
                            <div key={item} className="flex items-start gap-3">
                                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: S.amber }} />
                                <span className="text-sm leading-relaxed" style={{ color: S.muted }}>{item}</span>
                            </div>
                        ))}
                    </div>

                    <div className="p-6 rounded-3xl border space-y-4"
                        style={{ background: S.card, borderColor: S.border }}>
                        <h2 className="text-lg font-bold" style={{ color: S.cream }}>Get in touch directly</h2>
                        <a href="mailto:demo@manyaltech.com"
                            className="flex items-center gap-3 text-sm transition-colors hover:opacity-80"
                            style={{ color: S.muted }}>
                            <Mail className="w-4 h-4 shrink-0" style={{ color: S.amber }} />
                            demo@manyaltech.com
                        </a>
                        <a href="tel:+11234567890"
                            className="flex items-center gap-3 text-sm transition-colors hover:opacity-80"
                            style={{ color: S.muted }}>
                            <Phone className="w-4 h-4 shrink-0" style={{ color: S.amber }} />
                            +1 (123) 456-7890
                        </a>
                        <p className="flex items-center gap-3 text-sm" style={{ color: S.muted }}>
                            <MessageSquare className="w-4 h-4 shrink-0" style={{ color: S.amber }} />
                            Response within 24 hours
                        </p>
                    </div>

                    <div className="p-6 rounded-3xl border"
                        style={{ background: S.card, borderColor: S.border }}>
                        <p className="text-sm italic" style={{ color: S.muted }}>
                            &ldquo;We went from zero to fully deployed in under 48 hours.
                            The AI tutoring alone improved our average test scores by 23% in the first term.&rdquo;
                        </p>
                        <p className="text-xs mt-3 font-semibold" style={{ color: S.amber }}>
                            — Principal, Greenfield Academy
                        </p>
                    </div>
                </motion.div>

                {/* ── Right: form ── */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.15 }}
                    className="lg:col-span-3"
                >
                    {formState === 'success' ? (
                        <div className="p-10 rounded-3xl border text-center space-y-5"
                            style={{ background: S.card, borderColor: S.border }}>
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full"
                                style={{ background: 'rgba(212,163,76,0.1)', border: `1px solid ${S.border}` }}>
                                <CheckCircle2 className="w-8 h-8" style={{ color: S.amber }} />
                            </div>
                            <h2 className="text-2xl font-bold" style={{ color: S.cream }}>Request Submitted!</h2>
                            <p className="text-sm leading-relaxed" style={{ color: S.muted }}>
                                Thank you for your interest. Our team will reach out to{' '}
                                <strong style={{ color: S.amber }}>{form.email}</strong> within 24 hours
                                to schedule your personalised demo.
                            </p>
                            <Link href="/">
                                <button className="mt-4 px-8 py-3 rounded-full text-sm font-bold transition-all hover:brightness-110"
                                    style={{ background: 'linear-gradient(135deg,#d4a34c,#a07030)', color: '#0c0a08' }}>
                                    Back to Home
                                </button>
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit}
                            className="p-8 rounded-3xl border space-y-6"
                            style={{ background: S.card, borderColor: S.border }}>

                            {/* Name row */}
                            <div className="grid sm:grid-cols-2 gap-4">
                                <Field label="First Name *" name="first_name" placeholder="Jane" value={form.first_name} onChange={handleChange} required />
                                <Field label="Last Name" name="last_name" placeholder="Doe" value={form.last_name} onChange={handleChange} />
                            </div>

                            {/* Email + Phone */}
                            <div className="grid sm:grid-cols-2 gap-4">
                                <Field label="Work Email *" name="email" type="email" placeholder="jane@school.edu" value={form.email} onChange={handleChange} required />
                                <Field label="Phone" name="phone" type="tel" placeholder="+1 234 567 890" value={form.phone} onChange={handleChange} />
                            </div>

                            {/* Institution + Role */}
                            <div className="grid sm:grid-cols-2 gap-4">
                                <Field label="Institution / School Name *" name="institution" placeholder="Greenfield Academy" value={form.institution} onChange={handleChange} required />
                                <Field label="Your Role" name="role" placeholder="Principal, IT Director…" value={form.role} onChange={handleChange} />
                            </div>

                            {/* Institution size */}
                            <div className="space-y-2">
                                <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: S.muted }}>
                                    <Users className="inline w-3.5 h-3.5 mr-1.5" />Institution Size
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {institutionSizes.map(size => (
                                        <button
                                            key={size}
                                            type="button"
                                            onClick={() => setSelectedSize(size)}
                                            className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                                            style={selectedSize === size ? SIZE_ACTIVE_STYLE : SIZE_INACTIVE_STYLE}
                                        >
                                            {size}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Interests */}
                            <div className="space-y-2">
                                <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: S.muted }}>
                                    <Building2 className="inline w-3.5 h-3.5 mr-1.5" />Areas of Interest
                                </label>
                                <div className="grid sm:grid-cols-2 gap-2">
                                    {interests.map(({ icon: Icon, label }) => {
                                        const active = selectedInterests.includes(label);
                                        return (
                                            <button
                                                key={label}
                                                type="button"
                                                onClick={() => toggleInterest(label)}
                                                className="flex items-center gap-2 px-4 py-3 rounded-2xl text-sm text-left transition-all"
                                                style={active ? INTEREST_ACTIVE_STYLE : INTEREST_INACTIVE_STYLE}
                                            >
                                                <Icon className="w-4 h-4 shrink-0" style={{ color: active ? S.amber : S.dim }} />
                                                {label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Message */}
                            <div className="space-y-2">
                                <label htmlFor="message" className="block text-xs font-semibold uppercase tracking-wider" style={{ color: S.muted }}>
                                    Anything else you&apos;d like us to know?
                                </label>
                                <textarea
                                    id="message"
                                    name="message"
                                    rows={4}
                                    placeholder="Tell us about your current challenges, goals, or specific questions…"
                                    value={form.message}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-2xl text-sm resize-none outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                                    style={{
                                        background: 'rgba(255,255,255,0.04)',
                                        border: `1px solid ${S.border}`,
                                        color: S.cream,
                                        caretColor: S.amber,
                                    }}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={formState === 'submitting'}
                                className="w-full py-4 rounded-2xl text-base font-bold transition-all hover:brightness-110 hover:scale-[1.01] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                style={{ background: 'linear-gradient(135deg,#d4a34c,#a07030)', color: '#0c0a08', boxShadow: '0 8px 32px rgba(212,163,76,0.25)' }}
                            >
                                {formState === 'submitting' ? (
                                    <><Loader2 className="w-5 h-5 animate-spin" /> Sending Request…</>
                                ) : (
                                    <><Send className="w-4 h-4" /> Request My Demo</>
                                )}
                            </button>

                            <p className="text-center text-xs" style={{ color: S.dim }}>
                                No spam. No commitment. We&apos;ll only contact you about your demo request.
                            </p>
                        </form>
                    )}
                </motion.div>
            </section>
        </div>
    );
}

// ── Reusable field ────────────────────────────────────────────────────────────

function Field({
    label, name, type = 'text', placeholder, value, onChange, required,
}: {
    label: string;
    name: string;
    type?: string;
    placeholder?: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    required?: boolean;
}) {
    return (
        <div className="space-y-1.5">
            <label htmlFor={name} className="block text-xs font-semibold uppercase tracking-wider" style={{ color: S.muted }}>
                {label}
            </label>
            <input
                id={name}
                name={name}
                type={type}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                required={required}
                className="w-full h-11 px-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: `1px solid ${S.border}`,
                    color: S.cream,
                    caretColor: S.amber,
                }}
            />
        </div>
    );
}
