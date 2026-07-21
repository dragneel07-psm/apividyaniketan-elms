// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function QuickAIButton() {
    const router = useRouter();

    return (
        <Button
            onClick={() => router.push('/student/ai-tutor')}
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 z-50"
            size="icon"
        >
            <Sparkles className="h-6 w-6 text-white" />
        </Button>
    );
}
