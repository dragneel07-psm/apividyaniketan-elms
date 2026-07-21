// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { Flame } from 'lucide-react';

type StreakBadgeProps = { streak: number; className?: string };

/** Flame + count visual. Labels/text stay in the consumer (keeps i18n untouched). */
export function StreakBadge({ streak, className = '' }: StreakBadgeProps) {
    const safe = Number.isFinite(streak) && streak > 0 ? Math.floor(streak) : 0;
    const hot = safe >= 3;
    return (
        <div className={`flex flex-col items-center ${className}`}>
            <div className={`h-10 w-10 rounded-full flex items-center justify-center mb-2 ${hot ? 'bg-orange-100 animate-pulse' : 'bg-orange-50'}`}>
                <Flame className={`h-6 w-6 ${safe > 0 ? 'text-orange-600' : 'text-orange-300'}`} />
            </div>
            <p className="text-2xl font-black text-slate-800">{safe}</p>
        </div>
    );
}
