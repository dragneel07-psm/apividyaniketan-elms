// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Save, Loader2, Trash2, Sparkles, X } from "lucide-react";
import Link from 'next/link';
import { saasApi } from '@/lib/api';
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function EditPlanPage() {
    const router = useRouter();
    const params = useParams();
    const planId = params.id as string;

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Initial State
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price_monthly: '',
        price_yearly: '',
        currency: 'NPR',
        student_limit: '',
        teacher_limit: '',
        ai_token_limit: '',
        storage_limit_gb: '',
        has_ai_tutor: false,
        has_ai_eval: false,
        has_parent_portal: false,
        has_analytics: false,
        has_career_guidance: false,
        is_active: true
    });

    useEffect(() => {
        if (planId) {
            loadPlan();
        }
    }, [planId]);

    const loadPlan = async () => {
        try {
            const plan = await saasApi.getPlan(planId);
            setFormData({
                name: plan.name,
                description: plan.description || '',
                price_monthly: plan.price_monthly.toString(),
                price_yearly: plan.price_yearly.toString(),
                currency: plan.currency || 'NPR',
                student_limit: plan.student_limit.toString(),
                teacher_limit: plan.teacher_limit.toString(),
                ai_token_limit: plan.ai_token_limit.toString(),
                storage_limit_gb: plan.storage_limit_gb.toString(),
                has_ai_tutor: plan.has_ai_tutor || false,
                has_ai_eval: plan.has_ai_eval || false,
                has_parent_portal: plan.has_parent_portal || false,
                has_analytics: plan.has_analytics || false,
                has_career_guidance: plan.has_career_guidance || false,
                is_active: plan.is_active
            });
        } catch (error) {
            console.error(error);
            toast.error("Failed to load plan details.");
            router.push('/saas/plans');
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handleSwitchChange = (id: string, checked: boolean) => {
        setFormData(prev => ({ ...prev, [id]: checked }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        const monthlyPrice = parseFloat(formData.price_monthly) || 0;
        const yearlyPrice = parseFloat(formData.price_yearly) || 0;
        const maxYearlyForBenefit = monthlyPrice * 6; // 50% benefit over 12 monthly payments

        if (monthlyPrice <= 0) {
            toast.error("Monthly price must be greater than zero.");
            setIsSaving(false);
            return;
        }

        if (yearlyPrice > maxYearlyForBenefit) {
            toast.error("Yearly price must provide at least 50% benefit over monthly billing.");
            setIsSaving(false);
            return;
        }

        const payload = {
            ...formData,
            price_monthly: monthlyPrice,
            price_yearly: yearlyPrice,
            student_limit: parseInt(formData.student_limit) || 0,
            teacher_limit: parseInt(formData.teacher_limit) || 0,
            ai_token_limit: parseInt(formData.ai_token_limit) || 0,
            storage_limit_gb: parseFloat(formData.storage_limit_gb) || 0,
        };

        try {
            await saasApi.updatePlan(planId, payload);
            toast.success("Subscription plan updated successfully.");
            router.push('/saas/plans');
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Failed to update plan.");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="p-8 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#08080a] text-white p-8 space-y-12 font-sans relative overflow-hidden">
            {/* Background Mesh Gradient */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/30 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/20 blur-[120px] rounded-full animate-pulse-slow" />
            </div>

            <div className="relative flex items-center justify-between max-w-4xl mx-auto">
                <div className="flex items-center gap-6">
                    <Link href="/saas/plans">
                        <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all">
                            <ArrowLeft className="h-6 w-6" />
                        </Button>
                    </Link>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <Sparkles className="w-5 h-5 text-indigo-400" />
                            <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Plan Configuration</span>
                        </div>
                        <h2 className="text-4xl font-extrabold tracking-tight text-white mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                            Edit Subscription Plan
                        </h2>
                        <p className="text-slate-400">Refine the scaling parameters and intelligence capabilities.</p>
                    </div>
                </div>
            </div>

            <motion.form
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                onSubmit={handleSubmit}
                className="relative grid gap-8 max-w-4xl mx-auto"
            >
                {/* PLAN DETAILS */}
                <Card className="bg-[#111114]/80 border-white/5 backdrop-blur-3xl rounded-[32px] overflow-hidden shadow-2xl">
                    <CardHeader className="p-8 pb-4">
                        <CardTitle className="text-xl font-bold text-white">Plan Foundations</CardTitle>
                        <CardDescription className="text-slate-400 text-sm">Update the identity and public pricing for this tier.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 pt-4 space-y-6">
                        <div className="space-y-3">
                            <Label htmlFor="name" className="text-sm font-bold text-slate-300">Plan Name</Label>
                            <Input id="name" required value={formData.name} onChange={handleChange} className="h-12 bg-white/5 border-white/5 rounded-xl focus:ring-indigo-500/50 text-white placeholder:text-slate-600" />
                        </div>
                        <div className="space-y-3">
                            <Label htmlFor="description" className="text-sm font-bold text-slate-300">Description</Label>
                            <Textarea id="description" value={formData.description} onChange={handleChange} className="bg-white/5 border-white/5 rounded-xl focus:ring-indigo-500/50 text-white placeholder:text-slate-600 min-h-[120px]" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-3">
                                <Label htmlFor="price_monthly" className="text-sm font-bold text-slate-300">Monthly Price ({formData.currency})</Label>
                                <Input id="price_monthly" type="number" step="0.01" required value={formData.price_monthly} onChange={handleChange} className="h-12 bg-white/5 border-white/5 rounded-xl focus:ring-indigo-500/50 text-white placeholder:text-slate-600" />
                            </div>
                            <div className="space-y-3">
                                <Label htmlFor="price_yearly" className="text-sm font-bold text-slate-300">Yearly Price ({formData.currency})</Label>
                                <Input id="price_yearly" type="number" step="0.01" required value={formData.price_yearly} onChange={handleChange} className="h-12 bg-white/5 border-white/5 rounded-xl focus:ring-indigo-500/50 text-white placeholder:text-slate-600" />
                            </div>
                            <div className="space-y-3">
                                <Label htmlFor="currency" className="text-sm font-bold text-slate-300 uppercase">Currency</Label>
                                <Input id="currency" value={formData.currency} disabled className="h-12 bg-white/5 border-white/5 rounded-xl text-slate-400 font-mono" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* LIMITS & FEATURES */}
                <Card className="bg-[#111114]/80 border-white/5 backdrop-blur-3xl rounded-[32px] overflow-hidden shadow-2xl">
                    <CardHeader className="p-8 pb-4">
                        <CardTitle className="text-xl font-bold text-white">Capacity & Intelligence</CardTitle>
                        <CardDescription className="text-slate-400 text-sm">Modify hard caps and toggle AI capabilities.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 pt-4 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <Label htmlFor="student_limit" className="text-sm font-bold text-slate-300">Maximum Students</Label>
                                <Input id="student_limit" type="number" required value={formData.student_limit} onChange={handleChange} className="h-12 bg-white/5 border-white/5 rounded-xl focus:ring-indigo-500/50 text-white placeholder:text-slate-600" />
                            </div>
                            <div className="space-y-3">
                                <Label htmlFor="teacher_limit" className="text-sm font-bold text-slate-300">Maximum Teachers</Label>
                                <Input id="teacher_limit" type="number" required value={formData.teacher_limit} onChange={handleChange} className="h-12 bg-white/5 border-white/5 rounded-xl focus:ring-indigo-500/50 text-white placeholder:text-slate-600" />
                            </div>
                            <div className="space-y-3">
                                <Label htmlFor="ai_token_limit" className="text-sm font-bold text-slate-300">AI Tokens / Month</Label>
                                <Input id="ai_token_limit" type="number" required value={formData.ai_token_limit} onChange={handleChange} className="h-12 bg-white/5 border-white/10 text-white" />
                            </div>
                            <div className="space-y-3">
                                <Label htmlFor="storage_limit_gb" className="text-sm font-bold text-slate-300">Storage Limit (GB)</Label>
                                <Input id="storage_limit_gb" type="number" required value={formData.storage_limit_gb} onChange={handleChange} className="h-12 bg-white/5 border-white/5 rounded-xl focus:ring-indigo-500/50 text-white placeholder:text-slate-600" />
                            </div>
                        </div>

                        <Separator className="bg-white/5" />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                { id: 'has_ai_tutor', label: 'AI Tutor Intelligence' },
                                { id: 'has_ai_eval', label: 'AI Exam Evaluation' },
                                { id: 'has_parent_portal', label: 'Parent Engagement Portal' },
                                { id: 'has_analytics', label: 'Advanced Predictive Analytics' },
                                { id: 'has_career_guidance', label: 'AI Career Path Guidance' },
                            ].map((item) => (
                                <div key={item.id} className="flex items-center justify-between p-4 border border-white/5 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors">
                                    <Label className="text-sm font-medium text-slate-200">{item.label}</Label>
                                    <Switch
                                        checked={(formData as any)[item.id]}
                                        onCheckedChange={(c) => handleSwitchChange(item.id, c)}
                                        className="data-[state=checked]:bg-indigo-600"
                                    />
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-between items-center pt-6">
                    <Button
                        type="button"
                        variant="ghost"
                        disabled={isDeleting || isSaving}
                        className="text-red-500 hover:text-red-400 hover:bg-red-500/10 h-12 px-6 font-bold transition-all rounded-xl disabled:opacity-50"
                        onClick={async () => {
                            if (!confirm("Are you sure? This will affect all tenants on this plan.")) return;
                            setIsDeleting(true);
                            try {
                                await saasApi.deletePlan(planId);
                                toast.success("Plan decommissioned successfully.");
                                router.push('/saas/plans');
                            } catch (error) {
                                console.error('Failed to decommission plan', error);
                                toast.error("Failed to decommission plan. Please try again.");
                                setIsDeleting(false);
                            }
                        }}
                    >
                        {isDeleting ? (
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        ) : (
                            <Trash2 className="mr-2 h-5 w-5" />
                        )}
                        {isDeleting ? 'Decommissioning…' : 'Decommission Plan'}
                    </Button>
                    <div className="flex items-center gap-6">
                        <Link href="/saas/plans">
                            <Button variant="ghost" type="button" className="text-slate-400 hover:text-white hover:bg-white/5 h-12 px-6 font-bold">
                                Discard
                            </Button>
                        </Link>
                        <Button type="submit" className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white h-12 px-10 font-bold rounded-2xl shadow-xl shadow-indigo-600/20 disabled:opacity-50 transition-all" disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                            {isSaving ? "Synchronizing..." : "Save Configuration"}
                        </Button>
                    </div>
                </div>
            </motion.form>
        </div>
    );
}
