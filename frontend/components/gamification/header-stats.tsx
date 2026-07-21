// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
"use client";

import { useGamification } from "@/components/providers/gamification-provider";
import { Progress } from "@/components/ui/progress";
import { Trophy, Star, Flame } from "lucide-react";
import { motion } from "framer-motion";

export function HeaderStats() {
    const { currentLevel, currentXP, nextLevelXP, streak } = useGamification();

    // Calculate progress percentage
    const progress = Math.min(100, Math.max(0, (currentXP / nextLevelXP) * 100));

    return (
        <div className="flex items-center gap-4 bg-white/50 dark:bg-black/20 backdrop-blur-sm px-4 py-1.5 rounded-full border border-slate-200 dark:border-white/10">
            {/* Level Badge */}
            <div className="flex items-center gap-1.5">
                <div className="relative">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    <motion.div
                        className="absolute inset-0 bg-amber-400 rounded-full blur-sm opacity-50"
                        animate={{ opacity: [0.3, 0.6, 0.3] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    />
                </div>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    Lvl {currentLevel}
                </span>
            </div>

            {/* XP Bar */}
            <div className="flex flex-col w-24 sm:w-32 gap-0.5">
                <div className="flex justify-between text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
                    <span>XP</span>
                    <span>{currentXP}/{nextLevelXP}</span>
                </div>
                <Progress value={progress} className="h-1.5 bg-slate-200 dark:bg-white/10" />
            </div>

            {/* Streak */}
            <div className="flex items-center gap-1 border-l border-slate-200 dark:border-white/10 pl-3">
                <Flame className={`w-4 h-4 ${streak > 0 ? 'text-orange-500 fill-orange-500' : 'text-slate-400'}`} />
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{streak}</span>
            </div>
        </div>
    );
}
