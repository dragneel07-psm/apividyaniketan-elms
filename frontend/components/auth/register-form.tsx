// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { authService } from '@/services/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Lock, Mail, User as UserIcon, ArrowRight, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import Link from 'next/link';

const registerSchema = z.object({
    first_name: z.string().min(2, "First name must be at least 2 characters"),
    last_name: z.string().min(2, "Last name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    password_confirm: z.string(),
    role: z.enum(['student', 'teacher', 'parent']).optional(),
}).refine((data) => data.password === data.password_confirm, {
    message: "Passwords don't match",
    path: ["password_confirm"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterForm() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema)
    });

    const onSubmit = async (data: RegisterFormData) => {
        setIsLoading(true);
        try {
            await authService.register(data);
            toast.success('Account created. Please verify your email before signing in.');
            router.push('/login/saas');
        } catch (err: any) {
            console.error("Register Error Details:", err.response?.data || err);
            // Handle Django REST Framework error structure
            let msg = 'Registration failed. Please try again.';
            if (err.response?.data) {
                const d = err.response.data;
                if (typeof d === 'object' && d !== null) {
                    // Collect all values from the object
                    const allErrors = Object.values(d).flat();
                    if (allErrors.length > 0 && typeof allErrors[0] === 'string') {
                        msg = allErrors[0];
                    }
                } else if (typeof d === 'string') {
                    msg = d;
                }
            }
            toast.error(msg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full max-w-lg relative z-10"
        >
            <div className="bg-black/40 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_0_40px_-10px_rgba(0,0,0,0.5)] overflow-hidden">

                {/* Purple/Blue Gradient for Registration */}
                <div className="absolute top-0 left-0 w-full h-1 opacity-80 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500" />

                <div className="p-8 sm:p-10 space-y-8">
                    <div className="space-y-2 text-center">
                        <motion.div
                            initial={{ y: -10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-white/10 to-white/5 rounded-2xl mb-4 ring-1 ring-white/10"
                        >
                            <Sparkles className="w-6 h-6 text-purple-400" />
                        </motion.div>
                        <h1 className="text-3xl font-bold tracking-tight text-white bg-clip-text text-transparent bg-gradient-to-br from-white to-white/70">
                            SaaS Admin
                        </h1>
                        <p className="text-slate-400 text-sm tracking-wide">
                            Register as a platform administrator
                        </p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" autoComplete="off">

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="first_name" className="text-slate-300 text-xs uppercase tracking-wider font-semibold ml-1">First Name</Label>
                                <Input
                                    id="first_name"
                                    placeholder="John"
                                    className={`bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:bg-white/10 focus:border-white/20 rounded-xl ${errors.first_name ? 'border-red-500/50' : ''}`}
                                    {...register('first_name')}
                                />
                                {errors.first_name && <p className="text-red-400 text-xs ml-1">{errors.first_name.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="last_name" className="text-slate-300 text-xs uppercase tracking-wider font-semibold ml-1">Last Name</Label>
                                <Input
                                    id="last_name"
                                    placeholder="Doe"
                                    className={`bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:bg-white/10 focus:border-white/20 rounded-xl ${errors.last_name ? 'border-red-500/50' : ''}`}
                                    {...register('last_name')}
                                />
                                {errors.last_name && <p className="text-red-400 text-xs ml-1">{errors.last_name.message}</p>}
                            </div>
                        </div>

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
                                    className={`pl-11 h-12 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:bg-white/10 focus:border-white/20 focus:ring-4 focus:ring-white/5 transition-all duration-300 rounded-xl ${errors.email ? 'border-red-500/50' : ''}`}
                                    {...register('email')}
                                />
                            </div>
                            {errors.email && <p className="text-red-400 text-xs ml-1">{errors.email.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-slate-300 text-xs uppercase tracking-wider font-semibold ml-1">Password</Label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-slate-500 group-focus-within:text-white transition-colors duration-300" />
                                </div>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    autoComplete="new-password"
                                    className={`pl-11 h-12 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:bg-white/10 focus:border-white/20 focus:ring-4 focus:ring-white/5 transition-all duration-300 rounded-xl ${errors.password ? 'border-red-500/50' : ''}`}
                                    {...register('password')}
                                />
                            </div>
                            {errors.password && <p className="text-red-400 text-xs ml-1">{errors.password.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password_confirm" className="text-slate-300 text-xs uppercase tracking-wider font-semibold ml-1">Confirm Password</Label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-slate-500 group-focus-within:text-white transition-colors duration-300" />
                                </div>
                                <Input
                                    id="password_confirm"
                                    type="password"
                                    placeholder="••••••••"
                                    autoComplete="new-password"
                                    className={`pl-11 h-12 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:bg-white/10 focus:border-white/20 focus:ring-4 focus:ring-white/5 transition-all duration-300 rounded-xl ${errors.password_confirm ? 'border-red-500/50' : ''}`}
                                    {...register('password_confirm')}
                                />
                            </div>
                            {errors.password_confirm && <p className="text-red-400 text-xs ml-1">{errors.password_confirm.message}</p>}
                        </div>

                        <Button
                            className="w-full h-12 text-white font-bold rounded-xl transition-all duration-300 shadow-lg hover:scale-[1.01] active:scale-[0.99] bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 shadow-purple-900/20"
                            type="submit"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    Create Account <ArrowRight className="h-4 w-4" />
                                </span>
                            )}
                        </Button>
                    </form>
                </div>
                <div className="py-5 px-8 bg-white/5 border-t border-white/5 flex items-center justify-center space-x-1">
                    <p className="text-xs text-slate-500">
                        Already have an account?
                    </p>
                    <Link href="/login" className="text-xs text-white hover:underline font-medium">
                        Sign in here
                    </Link>
                </div>
            </div>
            <p className="text-center mt-8 text-slate-500 text-sm">
                Protected by enterprise-grade security encryption
            </p>
        </motion.div>
    );
}
