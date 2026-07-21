// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { usersAPI } from '@/lib/api';
import { toast } from 'sonner';
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            await usersAPI.forgotPassword(email);
            setIsSubmitted(true);
            toast.success('Password reset link sent to your email.');
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Failed to send reset link. Please check the email.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <Card className="w-full max-w-md shadow-lg border-slate-200">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold flex items-center gap-2">
                        <Mail className="h-6 w-6 text-indigo-600" /> Forgot Password
                    </CardTitle>
                    <CardDescription>
                        Enter your email address to receive a password reset link.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isSubmitted ? (
                        <div className="text-center py-6 space-y-4">
                            <div className="h-16 w-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle2 className="h-8 w-8" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-lg font-semibold text-slate-900">Check your email</h3>
                                <p className="text-slate-500 text-sm">
                                    We have sent a password reset link to <span className="font-medium text-slate-900">{email}</span>.
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                className="w-full mt-4"
                                onClick={() => setIsSubmitted(false)}
                            >
                                Send another link
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="name@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={isLoading}
                                    className="h-11"
                                />
                            </div>
                            <Button className="w-full h-11 bg-indigo-600 hover:bg-indigo-700" type="submit" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending Link...
                                    </>
                                ) : (
                                    'Send Reset Link'
                                )}
                            </Button>
                        </form>
                    )}
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
