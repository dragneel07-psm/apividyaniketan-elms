// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useReducedMotion } from 'framer-motion';
import {
    Bar, BarChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

export type ChartPoint = { label: string; value: number };

type TrendChartProps = {
    data: ChartPoint[];
    type?: 'line' | 'bar';
    height?: number;
    className?: string;
    /** CSS color for the series. Defaults to the indigo brand color. */
    color?: string;
};

const tooltipStyle = {
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    fontSize: 12,
    boxShadow: '0 4px 12px rgba(79, 70, 229, 0.1)',
} as const;

export function TrendChart({ data, type = 'line', height = 240, className, color = '#4f46e5' }: TrendChartProps) {
    const reduced = useReducedMotion();
    if (!data.length) {
        return (
            <div
                data-testid="trendchart-empty"
                className={`flex items-center justify-center rounded-xl border-2 border-dashed border-slate-200 text-xs text-slate-400 ${className ?? ''}`}
                style={{ height }}
            >
                —
            </div>
        );
    }
    return (
        <div data-testid="trendchart" className={className} style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
                {type === 'bar' ? (
                    <BarChart data={data}>
                        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} width={32} />
                        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(79,70,229,0.06)' }} />
                        <Bar dataKey="value" fill={color} radius={[6, 6, 0, 0]} isAnimationActive={!reduced} />
                    </BarChart>
                ) : (
                    <LineChart data={data}>
                        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} width={32} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} isAnimationActive={!reduced} />
                    </LineChart>
                )}
            </ResponsiveContainer>
        </div>
    );
}
