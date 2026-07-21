// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { Progress } from '@/components/ui/progress';

interface ProjectProgressBarProps {
    value: number;
    label?: string;
    showPercent?: boolean;
}

function colorFor(value: number): string {
    if (value >= 70) return 'bg-emerald-500';
    if (value >= 40) return 'bg-amber-500';
    return 'bg-rose-500';
}

export function ProjectProgressBar({ value, label, showPercent = true }: ProjectProgressBarProps) {
    const clamped = Math.max(0, Math.min(100, Math.round(value || 0)));
    return (
        <div
            className="space-y-1.5"
            role="progressbar"
            aria-valuenow={clamped}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={label ? `${label}: ${clamped}%` : `Progress: ${clamped}%`}
        >
            <div className="flex items-center justify-between text-xs text-slate-600">
                <span>{label ?? 'Progress'}</span>
                {showPercent && <span className="font-medium tabular-nums">{clamped}%</span>}
            </div>
            <Progress
                value={clamped}
                className="h-2 bg-slate-200"
                indicatorClassName={`${colorFor(clamped)} transition-all duration-500 ease-out`}
            />
        </div>
    );
}
