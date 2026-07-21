// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Check, MoreVertical, Edit, Trash2, Users, GraduationCap, Zap as ZapIcon, CreditCard, Sparkles } from "lucide-react";
import Link from 'next/link';
import { saasApi, SubscriptionPlan } from '@/lib/api';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";


type PlanFeatureFlags = {
    has_ai_tutor?: boolean;
    has_analytics?: boolean;
};

type Plan = SubscriptionPlan & PlanFeatureFlags;

export default function SaasPlansPage() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [seeding, setSeeding] = useState(false);
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

    const getCurrencyPrefix = (currency?: string) => {
        const normalized = (currency || 'USD').toUpperCase();
        if (normalized === 'NPR') return 'Rs. ';
        if (normalized === 'USD') return '$';
        return `${normalized} `;
    };

    const formatAmount = (value: number | string, currency?: string) => {
        const numericValue = Number(value) || 0;
        return `${getCurrencyPrefix(currency)}${numericValue.toLocaleString('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        })}`;
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: {
                type: "spring" as const,
                stiffness: 100
            }
        }
    };

    useEffect(() => {
        loadPlans();
    }, []);

    const loadPlans = async () => {
        try {
            const data = await saasApi.getPlans();
            setPlans(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Failed to load plans", error);
            setPlans([]);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this plan?")) {
            try {
                await saasApi.deletePlan(id);
                loadPlans(); // Reload list
            } catch (error) {
                console.error("Failed to delete plan", error);
            }
        }
    };

    const handleSeedDefaults = async () => {
        try {
            setSeeding(true);
            const res = await saasApi.seedDefaultPlans();
            toast.success(
                `Default plans ready. Created: ${res.created}, Updated: ${res.updated}${res.used_fallback ? ' (fallback FX)' : ''}`
            );
            await loadPlans();
        } catch (error: unknown) {
            console.error("Failed to seed default plans", error);
            const message = error instanceof Error ? error.message : "Failed to create default plans.";
            toast.error(message);
        } finally {
            setSeeding(false);
        }
    };

    const maxStudentLimit = useMemo(
        () => Math.max(...plans.map((plan) => Number(plan.student_limit) || 0), 1),
        [plans]
    );
    const maxTeacherLimit = useMemo(
        () => Math.max(...plans.map((plan) => Number(plan.teacher_limit) || 0), 1),
        [plans]
    );
    const maxAiLimit = useMemo(
        () => Math.max(...plans.map((plan) => Number(plan.ai_token_limit) || 0), 1),
        [plans]
    );

    if (loading) return <div className="p-8">Loading plans...</div>;

    return (
        <div className="min-h-full p-8 space-y-12 font-sans relative overflow-hidden">
            {/* Background Mesh Gradient - Dark Mode Only or Subtle in Light */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20 dark:opacity-30">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-400/30 dark:bg-indigo-600/30 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-400/20 dark:bg-purple-600/20 blur-[120px] rounded-full animate-pulse-slow" />
            </div>

            <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-500 dark:from-white dark:to-slate-400">
                        Subscription Plans
                    </h2>
                    <p className="text-lg text-slate-500 dark:text-slate-400 max-w-xl">
                        Design and manage global pricing tiers. Configure limits and unlock advanced AI features for your tenants.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-6">
                    {/* Pricing Toggle */}
                    <div className="bg-slate-100 dark:bg-[#111114] border border-slate-200 dark:border-white/5 p-1 rounded-xl flex items-center shadow-lg dark:shadow-2xl">
                        <button
                            onClick={() => setBillingCycle('monthly')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${billingCycle === 'monthly' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setBillingCycle('yearly')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${billingCycle === 'yearly' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                        >
                            Yearly
                            <span className="text-[10px] bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 px-1.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/30">50%+ Benefit</span>
                        </button>
                    </div>

                    <Link href="/saas/plans/create">
                        <Button className="bg-indigo-600 hover:bg-indigo-700 h-11 px-6 font-bold shadow-lg shadow-indigo-600/20 text-white">
                            <Plus className="mr-2 h-5 w-5" />
                            Create Plan
                        </Button>
                    </Link>
                </div>
            </div>

            {plans.length === 0 ? (
                <div className="text-center py-24 text-slate-500 dark:text-slate-500 bg-slate-50 dark:bg-[#111114]/50 border border-slate-200 dark:border-white/5 rounded-[40px] backdrop-blur-xl">
                    <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="text-xl font-medium">No plans found.</p>
                    <p className="text-sm">Create your first pricing tier to start onboarding schools.</p>
                    <div className="mt-6">
                        <Button
                            onClick={handleSeedDefaults}
                            disabled={seeding}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                            <Sparkles className="mr-2 h-4 w-4" />
                            {seeding ? 'Generating Plans...' : 'Generate Default Plans'}
                        </Button>
                    </div>
                </div>
            ) : (
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 relative"
                >
                    {plans.map((plan) => (
                        <motion.div key={plan.plan_id} variants={itemVariants}>
                            <Card className="relative h-full flex flex-col bg-white/80 dark:bg-[#111114]/80 border-slate-200 dark:border-white/5 backdrop-blur-3xl overflow-hidden group hover:border-indigo-500/40 transition-all duration-500 rounded-[32px] shadow-xl dark:shadow-2xl">
                                {/* Glow Effect on Hover */}
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/0 via-indigo-600/0 to-indigo-600/0 group-hover:to-indigo-600/5 transition-all duration-500" />

                                <div className="absolute top-6 right-6 z-10">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:text-indigo-600 dark:hover:text-white bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full">
                                                <MoreVertical className="h-5 w-5" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="bg-white dark:bg-[#111114] border-slate-200 dark:border-white/10 text-slate-900 dark:text-white">
                                            <DropdownMenuLabel>Manage Plan</DropdownMenuLabel>
                                            <DropdownMenuItem asChild className="focus:bg-slate-100 dark:focus:bg-white/5 cursor-pointer">
                                                <Link href={`/saas/plans/${plan.plan_id}/edit`} className="flex items-center w-full">
                                                    <Edit className="mr-2 h-4 w-4 text-indigo-500 dark:text-indigo-400" /> Edit Details
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator className="bg-slate-100 dark:bg-white/5" />
                                            <DropdownMenuItem
                                                className="text-red-600 dark:text-red-500 focus:bg-red-50 dark:focus:bg-red-500/10 focus:text-red-600 dark:focus:text-red-500 cursor-pointer"
                                                onClick={() => handleDelete(plan.plan_id)}
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" /> Delete Plan
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                <CardHeader className="p-8 pb-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{plan.name}</CardTitle>
                                            {plan.is_active ? (
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                                            ) : (
                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-600" />
                                            )}
                                        </div>
                                        <CardDescription className="text-slate-500 dark:text-slate-400 line-clamp-2 min-h-[40px]">
                                            {plan.description || "Comprehensive scaling plan for growing educational institutions."}
                                        </CardDescription>
                                    </div>

                                    <div className="mt-8">
                                        <AnimatePresence mode="wait">
                                            <motion.div
                                                key={billingCycle}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                className="flex items-baseline gap-1"
                                            >
                                                <span className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter">
                                                    {billingCycle === 'monthly'
                                                        ? formatAmount(plan.price_monthly, plan.currency)
                                                        : formatAmount(plan.price_yearly, plan.currency)}
                                                </span>
                                                <span className="text-slate-500 dark:text-slate-500 text-lg font-medium">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                                            </motion.div>
                                        </AnimatePresence>
                                        <p className="text-[10px] text-indigo-500/80 dark:text-indigo-400/60 font-mono mt-2 uppercase tracking-[0.2em]">
                                            {billingCycle === 'monthly'
                                                ? `OR ${formatAmount(plan.price_yearly, plan.currency)} YEARLY`
                                                : `SAVING ${formatAmount((Number(plan.price_monthly) * 12) - Number(plan.price_yearly), plan.currency)} PER YEAR`}
                                        </p>
                                    </div>
                                </CardHeader>

                                <CardContent className="p-8 pt-0 flex-1 space-y-8">
                                    {/* Capacity Metrics */}
                                    <div className="space-y-6 mt-6">
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center text-xs">
                                                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                                    <Users className="w-4 h-4 text-sky-500 dark:text-sky-400" />
                                                    <span>Max Students</span>
                                                </div>
                                                <span className="font-bold text-slate-900 dark:text-white">{plan.student_limit.toLocaleString()}</span>
                                            </div>
                                            <Progress
                                                value={Math.max(0, Math.min(100, (Number(plan.student_limit) / maxStudentLimit) * 100))}
                                                className="h-1.5 bg-slate-100 dark:bg-white/5"
                                                indicatorClassName="bg-gradient-to-r from-sky-400 to-sky-600 shadow-[0_0_10px_rgba(56,189,248,0.4)]"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center text-xs">
                                                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                                    <GraduationCap className="w-4 h-4 text-violet-500 dark:text-violet-400" />
                                                    <span>Max Teachers</span>
                                                </div>
                                                <span className="font-bold text-slate-900 dark:text-white">{plan.teacher_limit.toLocaleString()}</span>
                                            </div>
                                            <Progress
                                                value={Math.max(0, Math.min(100, (Number(plan.teacher_limit) / maxTeacherLimit) * 100))}
                                                className="h-1.5 bg-slate-100 dark:bg-white/5"
                                                indicatorClassName="bg-gradient-to-r from-violet-400 to-violet-600 shadow-[0_0_10px_rgba(167,139,250,0.4)]"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center text-xs">
                                                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                                    <ZapIcon className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                                                    <span>AI Credits</span>
                                                </div>
                                                <span className="font-bold text-slate-900 dark:text-white">{plan.ai_token_limit.toLocaleString()}</span>
                                            </div>
                                            <Progress
                                                value={Math.max(0, Math.min(100, (Number(plan.ai_token_limit) / maxAiLimit) * 100))}
                                                className="h-1.5 bg-slate-100 dark:bg-white/5"
                                                indicatorClassName="bg-gradient-to-r from-amber-400 to-amber-600 shadow-[0_0_10px_rgba(251,191,36,0.4)]"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Included Features</p>
                                        <ul className="grid grid-cols-1 gap-3">
                                            <li className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                                                <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center border border-emerald-200 dark:border-emerald-500/20">
                                                    <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-500" />
                                                </div>
                                                Global Infrastructure
                                            </li>
                                            {plan.has_ai_tutor && (
                                                <li className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                                                    <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center border border-emerald-200 dark:border-emerald-500/20">
                                                        <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-500" />
                                                    </div>
                                                    AI Tutor Intelligence
                                                </li>
                                            )}
                                            {plan.has_analytics && (
                                                <li className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                                                    <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center border border-emerald-200 dark:border-emerald-500/20">
                                                        <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-500" />
                                                    </div>
                                                    Predictive Analytics
                                                </li>
                                            )}
                                        </ul>
                                    </div>
                                </CardContent>

                                <CardFooter className="p-8 pt-0">
                                    <Button
                                        variant="outline"
                                        className="w-full h-12 rounded-2xl border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-900 dark:text-white font-bold transition-all"
                                        asChild
                                    >
                                        <Link href={`/saas/plans/${plan.plan_id}/edit`}>
                                            Scaling Options & Limits
                                        </Link>
                                    </Button>
                                </CardFooter>
                            </Card>
                        </motion.div>
                    ))}
                </motion.div>
            )}
        </div>
    );
}
