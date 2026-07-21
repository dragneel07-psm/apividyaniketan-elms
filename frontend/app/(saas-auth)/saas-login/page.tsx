// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { Suspense } from 'react';
import { SaasLoginForm } from '@/components/auth/saas-login-form';

export default function SaasLoginPage() {
    return (
        <div className="relative flex items-center justify-center min-h-screen overflow-hidden bg-[#050505]">
            {/* SaaS-specific Ambient Background Effects */}
            <div className="absolute inset-0 w-full h-full overflow-hidden">
                <div className="absolute top-[-20%] left-[50%] transform -translate-x-1/2 w-[60%] h-[60%] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse" />
                <div
                    className="absolute inset-0 bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"
                    style={{
                        backgroundImage:
                            'linear-gradient(rgba(99, 102, 241, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(99, 102, 241, 0.05) 1px, transparent 1px)',
                        backgroundSize: '40px 40px',
                    }}
                />
            </div>

            <Suspense fallback={<div className="text-indigo-400 animate-pulse font-mono">Initializing System Core...</div>}>
                <div className="w-full flex justify-center px-4 sm:px-6 relative z-10">
                    <SaasLoginForm />
                </div>
            </Suspense>
        </div>
    );
}
