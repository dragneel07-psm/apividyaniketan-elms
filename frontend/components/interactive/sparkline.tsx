// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useId } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Area, AreaChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { ChartPoint } from '@/components/interactive/trend-chart';

type SparklineProps = {
    data: ChartPoint[];
    height?: number;
    className?: string;
    /** CSS color for stroke/fill. Defaults to indigo. */
    color?: string;
    valueFormatter?: (value: number) => string;
};

export function Sparkline({ data, height = 40, className, color = '#4f46e5', valueFormatter }: SparklineProps) {
    const gradientId = useId();
    const reduced = useReducedMotion();
    if (!data.length) {
        return (
            <div
                data-testid="sparkline-empty"
                className={`rounded bg-slate-100 ${className ?? ''}`}
                style={{ height: 2, marginTop: height / 2, marginBottom: height / 2 - 2 }}
            />
        );
    }
    return (
        <div data-testid="sparkline" className={className} style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                    <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                            <stop offset="100%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <Tooltip
                        contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 11 }}
                        labelStyle={{ display: 'none' }}
                        formatter={(value) => (valueFormatter ? valueFormatter(Number(value)) : (value as number))}
                    />
                    <Area
                        type="monotone" dataKey="value"
                        stroke={color} strokeWidth={2}
                        fill={`url(#${gradientId})`}
                        isAnimationActive={!reduced}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
