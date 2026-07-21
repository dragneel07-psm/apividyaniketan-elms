// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useRef, useState } from 'react';
import { ResponsiveContainer, type ResponsiveContainerProps } from 'recharts';

type SafeResponsiveContainerProps = ResponsiveContainerProps & {
    fallbackHeight?: number;
    fallbackClassName?: string;
};

export function SafeResponsiveContainer({
    children,
    fallbackHeight = 280,
    fallbackClassName = 'w-full',
    ...props
}: SafeResponsiveContainerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
        if (!containerRef.current || typeof ResizeObserver === 'undefined') return;

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) return;

            const width = Math.floor(entry.contentRect.width);
            const height = Math.floor(entry.contentRect.height);
            setSize((prev) => {
                if (prev.width === width && prev.height === height) {
                    return prev;
                }
                return { width, height };
            });
        });

        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    const resolvedWidth = typeof props.width === 'number' ? props.width : size.width;
    const resolvedHeight = typeof props.height === 'number' ? props.height : size.height;
    const canRenderChart = resolvedWidth > 0 && resolvedHeight > 0;

    return (
        <div ref={containerRef} className={fallbackClassName} style={{ minHeight: fallbackHeight, height: '100%' }}>
            {canRenderChart ? (
                <ResponsiveContainer
                    {...props}
                    width={resolvedWidth}
                    height={resolvedHeight}
                    minWidth={props.minWidth ?? 0}
                    minHeight={props.minHeight ?? 1}
                >
                    {children}
                </ResponsiveContainer>
            ) : (
                <div style={{ height: fallbackHeight }} aria-hidden="true" />
            )}
        </div>
    );
}
