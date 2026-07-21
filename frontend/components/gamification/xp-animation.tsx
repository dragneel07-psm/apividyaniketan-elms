// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Star } from "lucide-react";

interface XPAnimationProps {
    xp: number;
    reason?: string;
    onComplete?: () => void;
}

export function XPAnimation({ xp, reason, onComplete }: XPAnimationProps) {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            if (onComplete) onComplete();
        }, 2000);
        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.5 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -50 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="fixed bottom-10 right-10 z-50 flex items-center gap-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white px-6 py-3 rounded-full shadow-lg border-2 border-white/20"
                >
                    <Star className="w-5 h-5 fill-white" />
                    <div className="flex flex-col">
                        <span className="font-bold text-lg leading-none">+{xp} XP</span>
                        {reason && <span className="text-xs opacity-90">{reason}</span>}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
