// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Award, Trophy, Star,
    ChevronRight, Zap, Target
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { gamificationAPI, StudentBadge } from '@/lib/api';
import { useGamification } from '@/components/providers/gamification-provider';
import { ProgressRing } from '@/components/interactive/progress-ring';
import { StreakBadge } from '@/components/interactive/streak-badge';
import { useConfetti } from '@/components/interactive/use-confetti';

export function GamificationWidget() {
    const { streak, currentXP, currentLevel, nextLevelXP, isLoading: statsLoading } = useGamification();
    const [badges, setBadges] = useState<StudentBadge[]>([]);
    const [badgesLoading, setBadgesLoading] = useState(true);
    const fireConfetti = useConfetti();
    const prevLevel = useRef<number | null>(null);

    // Celebrate level-ups (skip the initial load so mounting never fires confetti).
    useEffect(() => {
        if (statsLoading) return;
        if (prevLevel.current !== null && currentLevel > prevLevel.current) {
            void fireConfetti();
        }
        prevLevel.current = currentLevel;
    }, [currentLevel, statsLoading, fireConfetti]);

    useEffect(() => {
        async function loadBadges() {
            try {
                const data = await gamificationAPI.getStudentBadges();
                setBadges(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error('Failed to load badges:', error);
                setBadges([]);
            } finally {
                setBadgesLoading(false);
            }
        }
        loadBadges();
    }, []); // Badges are less real-time critical, but could also be moved to context if needed

    // Logic for "Next Level" progress
    const levelProgress = Math.min(100, Math.max(0, (currentXP / nextLevelXP) * 100));

    return (
        <Card className="border-none shadow-md bg-gradient-to-br from-indigo-50 to-white overflow-hidden">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-black text-indigo-900 flex items-center gap-2">
                    <Zap className="h-5 w-5 text-indigo-600" />
                    Student Achievement
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Stats Row */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-sm flex flex-col items-center text-center">
                        <StreakBadge streak={streak} />
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Day Streak</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-sm flex flex-col items-center text-center">
                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center mb-2">
                            <Star className="h-6 w-6 text-indigo-600" />
                        </div>
                        <p className="text-2xl font-black text-slate-800">{currentXP}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total XP</p>
                    </div>
                </div>

                {/* Badges Section */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-slate-400">
                        <span>Unlocked Badges</span>
                        <span className="text-indigo-600 cursor-pointer hover:underline">View All</span>
                    </div>

                    {badgesLoading ? (
                        <div className="h-12 w-full animate-pulse bg-slate-100 rounded-xl" />
                    ) : badges.length === 0 ? (
                        <div className="p-4 border-2 border-dashed border-slate-100 rounded-2xl text-center">
                            <Award className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                            <p className="text-xs text-slate-400">Start learning to earn badges!</p>
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {badges.slice(0, 4).map((sb) => (
                                <div
                                    key={sb.id}
                                    className="h-12 w-12 rounded-xl bg-white border border-indigo-50 shadow-sm flex items-center justify-center relative group"
                                    title={sb.badge_details?.name}
                                >
                                    <Trophy className="h-6 w-6 text-amber-500" />
                                    <div className="absolute -top-1 -right-1 h-3 w-3 bg-indigo-600 rounded-full border-2 border-white" />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Next Milestone / Level Progress */}
                <div className="p-4 bg-indigo-600 rounded-2xl text-white relative overflow-hidden group">
                    <div className="absolute top-0 right-0 -mr-4 -mt-4 h-16 w-16 bg-white/10 rounded-full blur-xl group-hover:bg-white/20 transition-all" />
                    <div className="relative z-10">
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">Next Level</p>
                        <h4 className="font-bold flex items-center gap-1.5 mb-2">
                            <Target className="h-4 w-4" />
                            Level {currentLevel + 1}
                        </h4>
                        <div className="flex items-center gap-4">
                            <ProgressRing value={levelProgress} size={56} strokeWidth={6} ringClassName="text-white">
                                <span className="text-[10px] font-black">{Math.round(levelProgress)}%</span>
                            </ProgressRing>
                            <div className="text-[10px] font-black uppercase tracking-widest">
                                {Math.floor(currentXP)} / {nextLevelXP} XP
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
