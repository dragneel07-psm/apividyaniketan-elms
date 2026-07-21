// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import Link from 'next/link';
import { User, GraduationCap, ShieldCheck, ArrowRight, Building2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTenantIdentity } from '@/hooks/use-tenant-identity';

// Tenant login roles — SaaS admin has its own dedicated page at /saas-login
const roles = [
    {
        id: 'admin',
        title: 'Administrator',
        description: 'Manage school system and settings',
        icon: ShieldCheck,
        href: '/login/admin',
        color: 'from-red-500 to-orange-500',
        hover: 'hover:shadow-orange-500/20 hover:border-orange-500/50',
    },
    {
        id: 'teacher',
        title: 'Teacher',
        description: 'Manage classes and grading',
        icon: User,
        href: '/login/teacher',
        color: 'from-green-500 to-emerald-500',
        hover: 'hover:shadow-emerald-500/20 hover:border-emerald-500/50',
    },
    {
        id: 'student',
        title: 'Student',
        description: 'Access courses and learning materials',
        icon: GraduationCap,
        href: '/login/student',
        color: 'from-blue-500 to-cyan-500',
        hover: 'hover:shadow-cyan-500/20 hover:border-cyan-500/50',
    },
];

export const dynamic = 'force-dynamic';

export default function LoginPortalPage() {
    const { tenantName, tenantSchema, isTenantContext } = useTenantIdentity();

    return (
        <div className="relative flex items-center justify-center min-h-screen overflow-hidden bg-[#0a0a0c] p-4">
            {/* Ambient Background Effects */}
            <div className="absolute inset-0 w-full h-full overflow-hidden">
                <div className="absolute top-[20%] left-[20%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[100px] animate-pulse" />
                <div className="absolute bottom-[20%] right-[20%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[100px] animate-pulse" />
                <div
                    className="absolute inset-0 bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"
                    style={{
                        backgroundImage:
                            'linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
                        backgroundSize: '50px 50px',
                    }}
                />
            </div>

            <div className="relative z-10 w-full max-w-4xl">
                <div className="text-center mb-12 space-y-4">
                    <h1 className="text-4xl md:text-5xl font-bold text-white bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70 tracking-tight">
                        Select Your Portal
                    </h1>
                    <p className="text-slate-400 text-lg max-w-lg mx-auto">
                        Choose your account type to securely sign in to your dashboard
                    </p>
                    {isTenantContext && (
                        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-100">
                            <Building2 className="h-4 w-4" />
                            <span>
                                Tenant: <strong>{tenantName || tenantSchema || 'Unknown'}</strong>
                            </span>
                        </div>
                    )}
                </div>

                <div className={`grid grid-cols-1 gap-6 ${roles.length > 1 ? 'md:grid-cols-2 lg:grid-cols-3' : 'max-w-sm mx-auto'}`}>
                    {roles.map((role, index) => (
                        <motion.div
                            key={role.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Link href={role.href} className="block h-full">
                                <div className={`relative h-full bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-6 group transition-all duration-300 ${role.hover} hover:-translate-y-1`}>
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl" />

                                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${role.color} flex items-center justify-center mb-6 shadow-lg`}>
                                        <role.icon className="w-7 h-7 text-white" />
                                    </div>

                                    <h3 className="text-xl font-bold text-white mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-white/80 transition-all">
                                        {role.title}
                                    </h3>

                                    <p className="text-slate-400 text-sm mb-6 group-hover:text-slate-300 transition-colors">
                                        {role.description}
                                    </p>

                                    <div className="flex items-center text-sm font-medium text-white/50 group-hover:text-white transition-colors">
                                        Sign In <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                                    </div>
                                </div>
                            </Link>
                        </motion.div>
                    ))}
                </div>

                <div className="mt-12 text-center">
                    <p className="text-slate-500 text-sm">
                        Need assistance?{' '}
                        <a href="#" className="text-slate-400 hover:text-white transition-colors underline underline-offset-4">
                            Contact IT Support
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}
