// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { usersAPI } from '@/lib/api';
import { toast } from 'sonner';
import { KeyRound, ArrowLeft, Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react';

function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const uidb64 = searchParams.get('uidb64');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [resolvedRole, setResolvedRole] = useState<string | null>(null);

    const loginHref = resolvedRole === 'saas_admin' ? '/saas-login' : '/login';

    if (!token || !uidb64) {
        return (
            <div className="text-center py-6 text-red-600">
                Invalid or missing reset token. Please request a new link.
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        if (password.length < 8) {
            toast.error("Password must be at least 8 characters");
            return;
        }

        setIsLoading(true);

        try {
            const result = await usersAPI.confirmPasswordReset({
                password,
                token,
                uidb64
            });
            const nextRole = (result?.role ?? null) as string | null;
            setResolvedRole(nextRole);
            setIsSubmitted(true);
            toast.success('Password reset successfully!');
            const target = nextRole === 'saas_admin' ? '/saas-login' : '/login';
            setTimeout(() => router.push(target), 2000);
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Failed to reset password. Link may be expired.');
        } finally {
            setIsLoading(false);
        }
    };

    if (isSubmitted) {
        return (
            <div className="text-center py-6 space-y-4">
                <div className="h-16 w-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="h-8 w-8" />
                </div>
                <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-slate-900">Password Reset Complete</h3>
                    <p className="text-slate-500 text-sm">
                        Your password has been successfully updated. You can now login with your new password.
                    </p>
                </div>
                <Button
                    className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700"
                    onClick={() => router.push(loginHref)}
                >
                    Go to Login
                </Button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                    <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="pr-10"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                />
            </div>
            <Button className="w-full h-11 bg-indigo-600 hover:bg-indigo-700" type="submit" disabled={isLoading}>
                {isLoading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Resetting...
                    </>
                ) : (
                    'Reset Password'
                )}
            </Button>
        </form>
    );
}

export default function ResetPasswordPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <Card className="w-full max-w-md shadow-lg border-slate-200">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold flex items-center gap-2">
                        <KeyRound className="h-6 w-6 text-indigo-600" /> Reset Password
                    </CardTitle>
                    <CardDescription>
                        Create a strong password for your account.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Suspense fallback={<div className="text-center py-4">Loading...</div>}>
                        <ResetPasswordForm />
                    </Suspense>
                </CardContent>
                <CardFooter className="flex justify-center border-t p-4 bg-slate-50/50 rounded-b-xl">
                    <Link href="/login" className="text-sm text-slate-600 hover:text-indigo-600 flex items-center gap-1 transition-colors">
                        <ArrowLeft className="h-4 w-4" /> Back to Login
                    </Link>
                </CardFooter>
            </Card>
        </div>
    );
}
