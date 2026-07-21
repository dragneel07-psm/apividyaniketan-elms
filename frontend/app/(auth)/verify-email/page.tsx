// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { authService } from '@/services/auth';
import { toast } from 'sonner';
import { CheckCircle2, Loader2, MailCheck, XCircle } from 'lucide-react';

type VerificationState = 'loading' | 'success' | 'error';

function VerifyEmailContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const uidb64 = (searchParams.get('uidb64') || '').trim();
    const token = (searchParams.get('token') || '').trim();
    const [state, setState] = useState<VerificationState>('loading');

    useEffect(() => {
        let mounted = true;

        async function runVerification() {
            if (!uidb64 || !token) {
                if (!mounted) return;
                setState('error');
                return;
            }

            try {
                await authService.verifyEmail(uidb64, token);
                if (!mounted) return;
                setState('success');
                toast.success('Email verified. You can now sign in.');
            } catch (error: any) {
                if (!mounted) return;
                setState('error');
                const message =
                    error?.response?.data?.token?.[0] ||
                    error?.response?.data?.uid?.[0] ||
                    error?.message ||
                    'Verification link is invalid or expired.';
                toast.error(message);
            }
        }

        runVerification();

        return () => {
            mounted = false;
        };
    }, [uidb64, token]);

    return (
        <>
            {state === 'loading' && (
                <div className="text-center py-6 space-y-3">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto" />
                    <p className="text-slate-600 text-sm">Verifying your email...</p>
                </div>
            )}

            {state === 'success' && (
                <div className="text-center py-6 space-y-3">
                    <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
                    <h3 className="text-lg font-semibold text-slate-900">Email Verified</h3>
                    <p className="text-slate-500 text-sm">
                        Your account is now active. Continue to SaaS login.
                    </p>
                </div>
            )}

            {state === 'error' && (
                <div className="text-center py-6 space-y-3">
                    <XCircle className="h-12 w-12 text-red-600 mx-auto" />
                    <h3 className="text-lg font-semibold text-slate-900">Verification Failed</h3>
                    <p className="text-slate-500 text-sm">
                        This verification link is invalid or expired.
                    </p>
                </div>
            )}

            <div className="flex justify-center border-t p-4 bg-slate-50/50 rounded-b-xl">
                {state === 'success' ? (
                    <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => router.push('/login/saas')}>
                        Go to SaaS Login
                    </Button>
                ) : (
                    <Link href="/login/saas" className="text-sm text-slate-600 hover:text-indigo-600 transition-colors">
                        Back to SaaS Login
                    </Link>
                )}
            </div>
        </>
    );
}

export default function VerifyEmailPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <Card className="w-full max-w-md shadow-lg border-slate-200">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold flex items-center gap-2">
                        <MailCheck className="h-6 w-6 text-indigo-600" /> Verify Email
                    </CardTitle>
                    <CardDescription>
                        Confirming your SaaS admin account email address.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Suspense fallback={
                        <div className="text-center py-6 space-y-3">
                            <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto" />
                            <p className="text-slate-600 text-sm">Loading verification link...</p>
                        </div>
                    }>
                        <VerifyEmailContent />
                    </Suspense>
                </CardContent>
            </Card>
        </div>
    );
}
