// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { ReactNode } from 'react';
import { Card } from '@/components/ui/card';

type MotionCardProps = {
    children: ReactNode;
    className?: string;
    onClick?: () => void;
    /** Position in a grid/list — staggers the entrance by 60 ms per index. */
    index?: number;
};

export function MotionCard({ children, className, onClick, index = 0 }: MotionCardProps) {
    const reduced = useReducedMotion();
    if (reduced) {
        return <Card className={`h-full ${className ?? ''}`} onClick={onClick}>{children}</Card>;
    }
    return (
        <motion.div
            className="h-full"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            whileHover={{ y: -4 }}
            whileTap={onClick ? { scale: 0.98 } : undefined}
            transition={{ duration: 0.4, delay: index * 0.06, ease: 'easeOut' }}
        >
            <Card className={`h-full ${className ?? ''}`} onClick={onClick}>{children}</Card>
        </motion.div>
    );
}
