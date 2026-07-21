// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

/**
 * SaasLoginForm — multi-step login for SaaS admin accounts.
 *
 * Step 1: email + password
 *   → success (has tokens)          → redirect to /saas
 *   → {action: "enter_totp"}        → Step 3 (enter TOTP code)
 *   → {action: "setup_2fa"}         → Step 2 (set up authenticator)
 *
 * Step 2: 2FA setup (QR code + secret)
 *   → POST /api/users/2fa/setup/    → display QR URI
 *   → user scans, enters code
 *   → POST /api/users/2fa/activate/ → login success
 *
 * Step 3: enter TOTP
 *   → POST /api/users/login/ with totp_code → login success
 */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Lock, Mail, ShieldCheck, KeyRound, ArrowLeft, Copy, CheckCheck } from 'lucide-react';
import { authService } from '@/services/auth';
import { setSessionUser } from '@/lib/auth';
import api from '@/services/api';
import type { LoginResponse } from '@/types/auth';

// ── Schemas ──────────────────────────────────────────────────────────────────

const credSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(1, 'Password is required'),
});

const totpSchema = z.object({
    totp_code: z
        .string()
        .min(6, 'Code must be 6 digits')
        .max(6, 'Code must be 6 digits')
        .regex(/^\d{6}$/, 'Code must be 6 digits'),
});

type Credentials = z.infer<typeof credSchema>;
type TotpInput = z.infer<typeof totpSchema>;
type Step = 'credentials' | 'enter_totp' | 'setup_2fa';

// ── Helpers ───────────────────────────────────────────────────────────────────

function inputCls(hasError?: boolean) {
    return [
        'pl-11 h-12 bg-white/5 border-white/10 text-white placeholder:text-slate-600',
        'focus:bg-white/10 focus:border-white/20 focus:ring-4 focus:ring-white/5',
        'transition-all duration-300 rounded-xl',
        hasError ? 'border-red-500/50 focus:border-red-500/50' : '',
    ].join(' ');
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SaasLoginForm() {
    const router = useRouter();

    const [step, setStep] = useState<Step>('credentials');
    const [isLoading, setIsLoading] = useState(false);
    const [creds, setCreds] = useState<Credentials>({ email: '', password: '' });
    const [qrUri, setQrUri] = useState('');
    const [secret, setSecret] = useState('');
    const [copied, setCopied] = useState(false);

    const credForm = useForm<Credentials>({ resolver: zodResolver(credSchema) });
    const totpForm = useForm<TotpInput>({ resolver: zodResolver(totpSchema) });

    // ── Login success handler ─────────────────────────────────────────────

    function handleLoginSuccess(data: Pick<LoginResponse, 'user'>) {
        // Session cookies (httpOnly) were already set by the /api/auth route
        // handler — only the non-secret identity cache is written here.
        if (typeof window !== 'undefined') {
            if (data.user) {
                setSessionUser(data.user);
            }
            localStorage.setItem('tenant_id', 'public');
            document.cookie = `tenant_id=public; path=/; samesite=lax`;
            // Full page navigation ensures the newly-set cookie is included in
            // the next request to the middleware — client-side router.replace
            // can race with cookie propagation in some browsers.
            window.location.href = '/saas';
        } else {
            router.replace('/saas');
        }
        toast.success('Welcome back! Signed in to SaaS Admin.');
    }

    // ── Step 1: email + password ──────────────────────────────────────────

    async function onSubmitCredentials(data: Credentials) {
        setIsLoading(true);
        setCreds(data);
        try {
            const result = await authService.login({
                email: data.email,
                password: data.password,
                school_code: 'public',
            });

            // Session established → login success
            if (result.ok) {
                handleLoginSuccess(result);
                return;
            }

            // 2FA required
            const r = result as unknown as { two_factor_required?: boolean; action?: string };
            if (r.two_factor_required) {
                if (r.action === 'setup_2fa') {
                    await fetchSetup(data.email, data.password);
                } else {
                    setStep('enter_totp');
                }
                return;
            }

            toast.error('Unexpected response. Please try again.');
        } catch (err: unknown) {
            const msg = extractApiError(err, 'Invalid credentials. Please check your email and password.');
            toast.error(msg);
        } finally {
            setIsLoading(false);
        }
    }

    // ── Step 2: fetch setup (QR code + secret) ────────────────────────────

    async function fetchSetup(email: string, password: string) {
        try {
            const res = await api.post<{ secret: string; qr_uri: string }>(
                '/api/users/2fa/setup/',
                { email, password },
                { headers: { 'x-tenant-id': 'public' } }
            );
            setQrUri(res.data.qr_uri);
            setSecret(res.data.secret);
            setStep('setup_2fa');
        } catch (err) {
            toast.error(extractApiError(err, 'Failed to start 2FA setup. Please try again.'));
            setIsLoading(false);
        }
    }

    // ── Step 2 → activate ────────────────────────────────────────────────

    async function onActivate(data: TotpInput) {
        setIsLoading(true);
        try {
            // Same-origin route handler: stores the issued token pair in
            // httpOnly cookies instead of returning it to the browser.
            const res = await api.post<LoginResponse>(
                '/api/auth/2fa-activate',
                { email: creds.email, password: creds.password, totp_code: data.totp_code },
                { baseURL: '', headers: { 'x-tenant-id': 'public' } }
            );
            if (!res.data.ok) {
                toast.error('Unexpected response. Please try again.');
                return;
            }
            handleLoginSuccess(res.data);
        } catch (err) {
            toast.error(extractApiError(err, 'Invalid code. Check your authenticator app and try again.'));
        } finally {
            setIsLoading(false);
        }
    }

    // ── Step 3: enter TOTP ────────────────────────────────────────────────

    async function onSubmitTotp(data: TotpInput) {
        setIsLoading(true);
        try {
            const result = await authService.login({
                email: creds.email,
                password: creds.password,
                school_code: 'public',
                totp_code: data.totp_code,
            } as Parameters<typeof authService.login>[0] & { totp_code?: string });

            if (result.ok) {
                handleLoginSuccess(result);
            } else {
                toast.error('Unexpected response. Please try again.');
            }
        } catch (err) {
            toast.error(extractApiError(err, 'Invalid or expired code. Please try again.'));
        } finally {
            setIsLoading(false);
        }
    }

    // ── Copy secret ───────────────────────────────────────────────────────

    function copySecret() {
        navigator.clipboard.writeText(secret).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }

    // ── Render ────────────────────────────────────────────────────────────

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="w-full max-w-md relative z-10"
        >
            <div className="bg-black/40 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_0_40px_-10px_rgba(0,0,0,0.5)] overflow-hidden">
                {/* Top accent line */}
                <div className="absolute top-0 left-0 w-full h-1 opacity-80 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500" />

                <div className="p-8 sm:p-10 space-y-8">
                    <AnimatePresence mode="wait">

                        {/* ── Step 1: Credentials ── */}
                        {step === 'credentials' && (
                            <motion.div
                                key="credentials"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="space-y-2 text-center">
                                    <div className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-white/10 to-white/5 rounded-2xl mb-4 ring-1 ring-white/10">
                                        <ShieldCheck className="w-6 h-6 text-indigo-400" />
                                    </div>
                                    <h1 className="text-3xl font-bold tracking-tight text-white">SaaS Master Control</h1>
                                    <p className="text-slate-400 text-sm">Authorized Personnel Only</p>
                                </div>

                                <form onSubmit={credForm.handleSubmit(onSubmitCredentials)} className="space-y-4" autoComplete="off">
                                    <div className="space-y-2">
                                        <Label htmlFor="email" className="text-slate-300 text-xs uppercase tracking-wider font-semibold ml-1">Email</Label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <Mail className="h-5 w-5 text-slate-500 group-focus-within:text-white transition-colors" />
                                            </div>
                                            <Input
                                                id="email"
                                                type="email"
                                                placeholder="admin@example.com"
                                                autoComplete="email"
                                                className={inputCls(!!credForm.formState.errors.email)}
                                                {...credForm.register('email')}
                                            />
                                        </div>
                                        {credForm.formState.errors.email && (
                                            <p className="text-red-400 text-xs ml-1">{credForm.formState.errors.email.message}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="password" className="text-slate-300 text-xs uppercase tracking-wider font-semibold ml-1">Password</Label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <Lock className="h-5 w-5 text-slate-500 group-focus-within:text-white transition-colors" />
                                            </div>
                                            <Input
                                                id="password"
                                                type="password"
                                                placeholder="••••••••"
                                                autoComplete="current-password"
                                                className={inputCls(!!credForm.formState.errors.password)}
                                                {...credForm.register('password')}
                                            />
                                        </div>
                                        {credForm.formState.errors.password && (
                                            <p className="text-red-400 text-xs ml-1">{credForm.formState.errors.password.message}</p>
                                        )}
                                    </div>

                                    <Button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full h-12 text-white font-bold rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 transition-all duration-300 shadow-lg hover:scale-[1.01] active:scale-[0.99]"
                                    >
                                        {isLoading
                                            ? <Loader2 className="h-5 w-5 animate-spin" />
                                            : 'Continue'}
                                    </Button>

                                    <div className="text-center">
                                        <Link
                                            href="/forgot-password"
                                            className="text-xs text-slate-400 hover:text-indigo-300 transition-colors"
                                        >
                                            Forgot password?
                                        </Link>
                                    </div>
                                </form>
                            </motion.div>
                        )}

                        {/* ── Step 2: Setup 2FA ── */}
                        {step === 'setup_2fa' && (
                            <motion.div
                                key="setup_2fa"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="space-y-2 text-center">
                                    <div className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-white/10 to-white/5 rounded-2xl mb-4 ring-1 ring-white/10">
                                        <KeyRound className="w-6 h-6 text-violet-400" />
                                    </div>
                                    <h1 className="text-2xl font-bold text-white">Set Up Authenticator</h1>
                                    <p className="text-slate-400 text-sm">
                                        Scan the QR code with Google Authenticator, Authy, or 1Password.
                                        Then enter the 6-digit code below.
                                    </p>
                                </div>

                                {/* QR Code (via Google Charts — no extra dependency) */}
                                {qrUri && (
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="bg-white p-3 rounded-xl">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrUri)}`}
                                                alt="2FA QR Code"
                                                width={180}
                                                height={180}
                                            />
                                        </div>
                                        <p className="text-slate-500 text-xs">Can't scan? Enter the secret manually:</p>
                                        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2 w-full">
                                            <code className="text-indigo-300 text-sm font-mono tracking-widest flex-1 break-all">{secret}</code>
                                            <button
                                                type="button"
                                                onClick={copySecret}
                                                className="text-slate-400 hover:text-white transition-colors shrink-0"
                                                title="Copy secret"
                                            >
                                                {copied ? <CheckCheck className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <form onSubmit={totpForm.handleSubmit(onActivate)} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-slate-300 text-xs uppercase tracking-wider font-semibold ml-1">
                                            Authenticator Code
                                        </Label>
                                        <Input
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={6}
                                            placeholder="000000"
                                            autoComplete="one-time-code"
                                            className="h-12 bg-white/5 border-white/10 text-white text-center text-2xl tracking-[0.5em] placeholder:text-slate-600 focus:bg-white/10 focus:border-white/20 focus:ring-4 focus:ring-white/5 transition-all duration-300 rounded-xl font-mono"
                                            {...totpForm.register('totp_code')}
                                        />
                                        {totpForm.formState.errors.totp_code && (
                                            <p className="text-red-400 text-xs ml-1">{totpForm.formState.errors.totp_code.message}</p>
                                        )}
                                    </div>
                                    <Button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full h-12 text-white font-bold rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 transition-all duration-300 shadow-lg"
                                    >
                                        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Activate 2FA & Sign In'}
                                    </Button>
                                    <button
                                        type="button"
                                        onClick={() => setStep('credentials')}
                                        className="w-full text-slate-500 hover:text-slate-300 text-sm transition-colors flex items-center justify-center gap-1"
                                    >
                                        <ArrowLeft className="h-3 w-3" /> Back
                                    </button>
                                </form>
                            </motion.div>
                        )}

                        {/* ── Step 3: Enter TOTP ── */}
                        {step === 'enter_totp' && (
                            <motion.div
                                key="enter_totp"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="space-y-2 text-center">
                                    <div className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-white/10 to-white/5 rounded-2xl mb-4 ring-1 ring-white/10">
                                        <KeyRound className="w-6 h-6 text-indigo-400" />
                                    </div>
                                    <h1 className="text-2xl font-bold text-white">Two-Factor Authentication</h1>
                                    <p className="text-slate-400 text-sm">
                                        Enter the 6-digit code from your authenticator app.
                                    </p>
                                </div>

                                <form onSubmit={totpForm.handleSubmit(onSubmitTotp)} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-slate-300 text-xs uppercase tracking-wider font-semibold ml-1">
                                            Authenticator Code
                                        </Label>
                                        <Input
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={6}
                                            placeholder="000000"
                                            autoComplete="one-time-code"
                                            autoFocus
                                            className="h-12 bg-white/5 border-white/10 text-white text-center text-2xl tracking-[0.5em] placeholder:text-slate-600 focus:bg-white/10 focus:border-white/20 focus:ring-4 focus:ring-white/5 transition-all duration-300 rounded-xl font-mono"
                                            {...totpForm.register('totp_code')}
                                        />
                                        {totpForm.formState.errors.totp_code && (
                                            <p className="text-red-400 text-xs ml-1">{totpForm.formState.errors.totp_code.message}</p>
                                        )}
                                    </div>
                                    <Button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full h-12 text-white font-bold rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 transition-all duration-300 shadow-lg"
                                    >
                                        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Verify & Sign In'}
                                    </Button>
                                    <button
                                        type="button"
                                        onClick={() => { setStep('credentials'); totpForm.reset(); }}
                                        className="w-full text-slate-500 hover:text-slate-300 text-sm transition-colors flex items-center justify-center gap-1"
                                    >
                                        <ArrowLeft className="h-3 w-3" /> Back
                                    </button>
                                </form>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="py-5 px-8 bg-white/5 border-t border-white/5 text-center">
                    <p className="text-xs text-slate-500">
                        Access to this portal is restricted to authorised platform administrators.
                    </p>
                </div>
            </div>

            <p className="text-center mt-8 text-slate-500 text-sm">
                Protected by TOTP two-factor authentication
            </p>
        </motion.div>
    );
}

// ── Utility ───────────────────────────────────────────────────────────────────

function extractApiError(err: unknown, fallback: string): string {
    const e = err as {
        response?: { data?: { detail?: string; error?: string; message?: string; non_field_errors?: string[] } };
    };
    const d = e?.response?.data;
    return d?.detail || d?.error || d?.message || d?.non_field_errors?.[0] || fallback;
}
