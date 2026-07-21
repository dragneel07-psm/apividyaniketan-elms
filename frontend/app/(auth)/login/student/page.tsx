// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoginForm } from '@/components/auth/login-form';
import { getLoginPortalContext } from '@/lib/tenant';

export default function StudentLoginPage() {
    const router = useRouter();
    const portalContext = getLoginPortalContext(
        typeof window !== 'undefined' ? window.location.hostname : 'localhost'
    );

    useEffect(() => {
        if (portalContext === 'public') {
            router.replace('/login');
        }
    }, [portalContext, router]);

    if (portalContext === 'public') return null;

    return (
        <div className="relative flex items-center justify-center min-h-screen overflow-hidden bg-[#0a0a0c]">
            {/* Ambient Background Effects */}
            <div className="absolute inset-0 w-full h-full overflow-hidden">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse duration-[4s]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-cyan-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse duration-[5s]" />

                {/* Subtle Grid Pattern */}
                <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" style={{ backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)', backgroundSize: '50px 50px' }}></div>
            </div>

            <Suspense fallback={<div className="text-white animate-pulse">Loading secure portal...</div>}>
                <div className="w-full flex justify-center px-4 sm:px-6">
                    <LoginForm role="student" title="Student Access" subtitle="Welcome to your learning journey" />
                </div>
            </Suspense>
        </div>
    );
}
