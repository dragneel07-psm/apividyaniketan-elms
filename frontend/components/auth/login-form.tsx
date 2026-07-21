// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { authService } from '@/services/auth';
import type { LoginCredentials } from '@/types/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Lock, Mail, ArrowRight, Sparkles, Building2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import Link from 'next/link';
import { useTenantIdentity } from '@/hooks/use-tenant-identity';


interface LoginFormProps {
    role?: 'admin' | 'teacher' | 'student' | 'saas_admin';
    title?: string;
    subtitle?: string;
}

export function LoginForm({ role, title, subtitle }: LoginFormProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectPath = searchParams.get('redirect');
    const [isLoading, setIsLoading] = useState(false);
    const { tenantName, tenantSchema, isTenantContext, isLoading: isTenantLoading, tenantExists } = useTenantIdentity();

    const schema = z.object({
        email: z.string().email("Please enter a valid email address"),
        password: z.string().min(1, "Password is required"),
        school_code: role === 'saas_admin' ? z.string().optional() : z.string().min(1, "School code is required"),
    });

    const { register, handleSubmit, setValue, getValues, formState: { errors } } = useForm<z.infer<typeof schema>>({
        resolver: zodResolver(schema)
    });

    useEffect(() => {
        if (role === 'saas_admin') return;
        if (!isTenantContext || !tenantSchema) return;
        if (!getValues('school_code')) {
            setValue('school_code', tenantSchema, { shouldValidate: true });
        }
    }, [getValues, isTenantContext, role, setValue, tenantSchema]);

    const onSubmit = async (data: z.infer<typeof schema>) => {
        setIsLoading(true);
        try {
            if (role === 'saas_admin') {
                data.school_code = 'public';
            }
            const result = await authService.login(data as LoginCredentials);

            // Redirect based on role returned from API (most reliable)
            const userRole = (result.user?.role || role || '').toLowerCase();

            const rolePortalLabels: Record<string, string> = {
                admin: 'Admin Portal',
                teacher: 'Teacher Portal',
                student: 'Student Portal',
                saas_admin: 'SaaS Admin Portal',
            };

            const allowedRolesByPortal: Record<NonNullable<LoginFormProps['role']>, string[]> = {
                admin: ['admin', 'staff'],
                teacher: ['teacher'],
                student: ['student', 'parent'],
                saas_admin: ['saas_admin'],
            };

            if (role) {
                const allowedRoles = allowedRolesByPortal[role] || [];
                if (userRole && !allowedRoles.includes(userRole)) {
                    authService.logout();
                    toast.error(
                        `This account is '${userRole}'. Please sign in from ${rolePortalLabels[userRole] || 'the correct portal'}.`
                    );
                    setIsLoading(false);
                    return;
                }
            }

            toast.success('Welcome back! Sign in successful.');

            let targetPath = redirectPath;
            if (!targetPath) {
                switch (userRole) {
                    case 'saas_admin': targetPath = '/saas'; break;
                    case 'admin': targetPath = '/admin'; break;
                    case 'staff': targetPath = '/admin'; break;
                    case 'teacher': targetPath = '/teacher'; break;
                    case 'parent': targetPath = '/parent'; break;
                    default: targetPath = '/student'; break;
                }
            }

            router.replace(targetPath);
        } catch (err: unknown) {
            console.error("Login Error:", err);
            const axiosLike = err as {
                response?: {
                    status?: number;
                    data?: {
                        detail?: string;
                        message?: string;
                        code?: string;
                        non_field_errors?: string[];
                    };
                };
            };
            const apiData = axiosLike.response?.data;
            const apiStatus = axiosLike.response?.status;
            const msg = apiData?.detail
                || apiData?.message
                || apiData?.non_field_errors?.[0]
                || (apiStatus === 401
                    ? 'Invalid credentials. Check your email, password, and school code.'
                    : 'Login failed. Please try again.');
            toast.error(msg);
            setIsLoading(false);
        }
    };

    // Dynamic gradient based on role
    const getGradient = () => {
        switch (role) {
            case 'admin': return 'from-red-500 via-orange-500 to-yellow-500';
            case 'teacher': return 'from-green-500 via-emerald-500 to-teal-500';
            case 'student': return 'from-blue-500 via-cyan-500 to-sky-500';
            default: return 'from-blue-500 via-purple-500 to-pink-500';
        }
    };

    const getButtonClass = () => {
        switch (role) {
            case 'admin': return 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 shadow-orange-900/20';
            case 'teacher': return 'bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-500 hover:to-teal-500 shadow-green-900/20';
            case 'student': return 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 shadow-blue-900/20';
            default: return 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 shadow-blue-900/20';
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full max-w-md relative z-10"
        >
            <div className="bg-black/40 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_0_40px_-10px_rgba(0,0,0,0.5)] overflow-hidden">

                {/* Top Gradient Line */}
                <div className={`absolute top-0 left-0 w-full h-1 opacity-80 bg-gradient-to-r ${getGradient()}`} />

                <div className="p-8 sm:p-10 space-y-8">
                    <div className="space-y-2 text-center">
                        <motion.div
                            initial={{ y: -10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-white/10 to-white/5 rounded-2xl mb-4 ring-1 ring-white/10"
                        >
                            <Sparkles className={`w-6 h-6 ${role === 'admin' ? 'text-orange-400' : role === 'teacher' ? 'text-green-400' : role === 'student' ? 'text-blue-400' : 'text-purple-400'}`} />
                        </motion.div>
                        <h1 className="text-3xl font-bold tracking-tight text-white bg-clip-text text-transparent bg-gradient-to-br from-white to-white/70">
                            {title || 'Welcome Back'}
                        </h1>
                        <p className="text-slate-400 text-sm tracking-wide">
                            {subtitle || 'Sign in to access your account'}
                        </p>
                        {role !== 'saas_admin' && isTenantContext && (
                            tenantExists === false ? (
                                <div className="inline-flex items-center gap-2 rounded-full border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs text-red-300">
                                    <Building2 className="h-4 w-4 text-red-400" />
                                    <span>
                                        School <strong>&quot;{tenantSchema}&quot;</strong> is not registered.
                                        Contact your platform administrator.
                                    </span>
                                </div>
                            ) : (
                                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-xs text-cyan-100">
                                    <Building2 className="h-4 w-4" />
                                    <span>
                                        Tenant: <strong>{tenantName || tenantSchema || 'Unknown'}</strong>
                                        {isTenantLoading ? ' ...' : ''}
                                    </span>
                                </div>
                            )
                        )}
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" autoComplete="off">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-slate-300 text-xs uppercase tracking-wider font-semibold ml-1">Email Address</Label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-slate-500 group-focus-within:text-white transition-colors duration-300" />
                                    </div>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="name@example.com"
                                        autoComplete="email"
                                        className={`pl-11 h-12 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:bg-white/10 focus:border-white/20 focus:ring-4 focus:ring-white/5 transition-all duration-300 rounded-xl ${errors.email ? 'border-red-500/50 focus:border-red-500/50' : ''}`}
                                        {...register('email')}
                                    />
                                </div>
                                {errors.email && (
                                    <p className="text-red-400 text-xs ml-1">{errors.email.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between ml-1">
                                    <Label htmlFor="password" className="text-slate-300 text-xs uppercase tracking-wider font-semibold">Password</Label>
                                    <Link href="/forgot-password" className="text-xs text-slate-400 hover:text-white transition-colors">Forgot password?</Link>
                                </div>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-slate-500 group-focus-within:text-white transition-colors duration-300" />
                                    </div>
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        autoComplete="current-password"
                                        className={`pl-11 h-12 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:bg-white/10 focus:border-white/20 focus:ring-4 focus:ring-white/5 transition-all duration-300 rounded-xl ${errors.password ? 'border-red-500/50 focus:border-red-500/50' : ''}`}
                                        {...register('password')}
                                    />
                                </div>
                                {errors.password && (
                                    <p className="text-red-400 text-xs ml-1">{errors.password.message}</p>
                                )}
                            </div>
                        </div>
                        {role !== 'saas_admin' && (
                            <div className="space-y-2">
                                <Label htmlFor="school_code" className="text-slate-300 text-xs uppercase tracking-wider font-semibold ml-1">School Code</Label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Building2 className="h-5 w-5 text-slate-500 group-focus-within:text-white transition-colors duration-300" />
                                    </div>
                                    <Input
                                        id="school_code"
                                        type="text"
                                        placeholder="demo"
                                        autoComplete="off"
                                        className={`pl-11 h-12 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:bg-white/10 focus:border-white/20 focus:ring-4 focus:ring-white/5 transition-all duration-300 rounded-xl ${errors.school_code ? 'border-red-500/50 focus:border-red-500/50' : ''}`}
                                        {...register('school_code')}
                                    />
                                </div>
                                {errors.school_code && (
                                    <p className="text-red-400 text-xs ml-1">{errors.school_code.message}</p>
                                )}
                            </div>
                        )}

                        <Button
                            className={`w-full h-12 text-white font-bold rounded-xl transition-all duration-300 shadow-lg hover:scale-[1.01] active:scale-[0.99] ${getButtonClass()}`}
                            type="submit"
                            disabled={isLoading || (isTenantContext && tenantExists === false)}
                        >
                            {isLoading ? (
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    Sign In <ArrowRight className="h-4 w-4" />
                                </span>
                            )}
                        </Button>
                    </form>
                </div>

                <div className="py-5 px-8 bg-white/5 border-t border-white/5 flex items-center justify-center space-x-1">
                    <p className="text-xs text-slate-500">
                        Need help?{' '}
                        <a href="#" className="text-slate-400 hover:text-white transition-colors">
                            Contact your administrator
                        </a>
                    </p>
                </div>
            </div>
            <p className="text-center mt-8 text-slate-500 text-sm">
                Protected by enterprise-grade security encryption
            </p>
        </motion.div>
    );
}
