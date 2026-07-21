// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
// app/unauthorized/page.tsx
'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function UnauthorizedPage() {
    const router = useRouter();

    return (
        <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
            <h1 className="text-4xl font-bold text-red-600">403 - Unauthorized</h1>
            <p className="text-gray-600">You do not have permission to access this page.</p>
            <div className="space-x-4">
                <Button variant="outline" onClick={() => router.back()}>
                    Go Back
                </Button>
                <Button onClick={() => router.push('/login')}>
                    Login
                </Button>
            </div>
        </div>
    );
}
