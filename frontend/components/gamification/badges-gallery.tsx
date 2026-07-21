// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Badge as BadgeType, StudentBadge, gamificationAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Lock } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Helper to look up Lucide icons dynamically
const Icon = ({ name, className }: { name: string; className?: string }) => {
    // @ts-ignore
    const LucideIcon = LucideIcons[name.charAt(0).toUpperCase() + name.slice(1).replace(/-([a-z])/g, g => g[1].toUpperCase())] as LucideIcons.LucideIcon;
    // Fallback if icon name doesn't match perfectly or isn't found
    const DefaultIcon = LucideIcons.Award;

    if (!LucideIcon) return <DefaultIcon className={className} />;
    return <LucideIcon className={className} />;
};

export function BadgesGallery() {
    const [badges, setBadges] = useState<BadgeType[]>([]);
    const [earnedBadges, setEarnedBadges] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadBadges = async () => {
            try {
                const [allBadges, myBadges] = await Promise.all([
                    gamificationAPI.getBadges(),
                    gamificationAPI.getMyBadges()
                ]);
                setBadges(allBadges);
                setEarnedBadges(new Set(myBadges.map(b => b.badge))); // Assuming b.badge is the ID
            } catch (error) {
                console.error("Failed to load badges", error);
            } finally {
                setLoading(false);
            }
        };
        loadBadges();
    }, []);

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8 text-indigo-500" /></div>;
    }

    if (badges.length === 0) {
        return <div className="text-center p-8 text-slate-500">No achievements available yet.</div>;
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {badges.map((badge, idx) => {
                const isEarned = earnedBadges.has(badge.id);
                return (
                    <TooltipProvider key={badge.id}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className={cn(
                                        "relative group flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all duration-300",
                                        isEarned
                                            ? "bg-gradient-to-br from-indigo-50 to-white border-indigo-100 shadow-sm hover:shadow-md hover:border-indigo-200"
                                            : "bg-slate-50 border-slate-100 opacity-70 grayscale hover:grayscale-0 hover:opacity-100"
                                    )}
                                >
                                    <div className={cn(
                                        "h-16 w-16 rounded-full flex items-center justify-center mb-4 transition-all duration-500",
                                        isEarned
                                            ? "bg-indigo-100 text-indigo-600 shadow-inner"
                                            : "bg-slate-200 text-slate-400"
                                    )}>
                                        <Icon name={badge.icon_name || 'award'} className="h-8 w-8" />
                                    </div>

                                    <h3 className={cn(
                                        "text-center font-bold mb-1",
                                        isEarned ? "text-slate-900" : "text-slate-500"
                                    )}>
                                        {badge.name}
                                    </h3>

                                    {!isEarned && (
                                        <div className="absolute top-3 right-3">
                                            <Lock className="h-4 w-4 text-slate-300" />
                                        </div>
                                    )}

                                    {/* XP Reward Chip */}
                                    <div className={cn(
                                        "mt-2 text-xs font-bold px-2 py-1 rounded-full",
                                        isEarned ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-400"
                                    )}>
                                        {badge.xp_reward} XP
                                    </div>

                                </motion.div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="p-4 max-w-[200px] text-center">
                                <p className="font-semibold text-sm mb-1">{badge.description}</p>
                                <p className="text-xs text-slate-400">
                                    {isEarned ? "Completed!" : `Requirement: ${badge.criteria_value} ${badge.criteria_type.replace(/_/g, ' ')}`}
                                </p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                );
            })}
        </div>
    );
}
