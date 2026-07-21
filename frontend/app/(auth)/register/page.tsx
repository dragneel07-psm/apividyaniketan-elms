// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ShieldCheck, Mail, ArrowRight, Lock } from 'lucide-react';

/**
 * /register — Request Access page.
 *
 * Self-registration for SaaS admin accounts is disabled.
 * Platform administrators must be provisioned by a platform operator
 * using the `create_saas_admin` management command (CLI).
 *
 * This page informs prospective customers / admins of that and directs
 * existing admins back to the login page.
 */
export default function RegisterPage() {
    return (
        <div className="relative flex items-center justify-center min-h-screen overflow-hidden bg-[#0a0a0c] p-4">
            {/* Ambient background */}
            <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[10%] left-[20%] w-[50%] h-[50%] bg-violet-600/15 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[10%] right-[20%] w-[50%] h-[50%] bg-fuchsia-600/15 rounded-full blur-[120px] animate-pulse" />
                <div
                    className="absolute inset-0"
                    style={{
                        backgroundImage:
                            'linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)',
                        backgroundSize: '50px 50px',
                    }}
                />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="relative z-10 w-full max-w-md"
            >
                <div className="bg-black/40 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_0_40px_-10px_rgba(0,0,0,0.5)] overflow-hidden">
                    {/* Top accent */}
                    <div className="absolute top-0 left-0 w-full h-1 opacity-80 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500" />

                    <div className="p-8 sm:p-10 space-y-8 text-center">
                        <div className="space-y-4">
                            <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-white/10 to-white/5 rounded-2xl ring-1 ring-white/10">
                                <Lock className="w-7 h-7 text-violet-400" />
                            </div>
                            <h1 className="text-3xl font-bold text-white tracking-tight">
                                Access by Invitation Only
                            </h1>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                SaaS admin accounts are provisioned by platform operators —
                                self-registration is disabled for security reasons.
                            </p>
                        </div>

                        {/* What to do */}
                        <div className="space-y-3 text-left">
                            <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
                                <ShieldCheck className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-white text-sm font-medium">Existing admin?</p>
                                    <p className="text-slate-400 text-xs mt-0.5">
                                        Sign in using your credentials and 2FA code.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
                                <Mail className="w-5 h-5 text-fuchsia-400 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-white text-sm font-medium">Need access?</p>
                                    <p className="text-slate-400 text-xs mt-0.5">
                                        Contact the platform operator to have your account provisioned.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <Link href="/saas-login">
                            <button className="w-full h-12 flex items-center justify-center gap-2 text-white font-bold rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 transition-all duration-300 shadow-lg hover:scale-[1.01]">
                                Go to Admin Sign In <ArrowRight className="h-4 w-4" />
                            </button>
                        </Link>
                    </div>

                    <div className="py-5 px-8 bg-white/5 border-t border-white/5 text-center">
                        <p className="text-xs text-slate-500">
                            Platform operators: use{' '}
                            <code className="text-slate-400 bg-white/10 px-1.5 py-0.5 rounded text-xs">
                                python manage.py create_saas_admin
                            </code>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
