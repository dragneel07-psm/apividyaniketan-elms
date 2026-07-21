// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { BadgeCard, BadgeType } from '@/components/gamification/badge-card';
import { api } from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Trophy } from 'lucide-react';
import { useTranslation } from '@/lib/localization';
import { formatNumber } from '@/lib/i18n/format';

export default function AchievementsPage() {
    const { t, locale } = useTranslation();
    const [allBadges, setAllBadges] = useState<BadgeType[]>([]);
    const [myBadges, setMyBadges] = useState<any[]>([]);
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [badges, earned, leaders] = await Promise.all([
                api.gamification.getBadges(),
                api.gamification.getMyBadges(),
                api.gamification.getLeaderboard()
            ]);
            setAllBadges((badges as any).results || badges);
            setMyBadges((earned as any).results || earned);
            setLeaderboard((leaders as any)?.entries || leaders);
        } catch (error) {
            console.error("Failed to load gamification data", error);
        } finally {
            setLoading(false);
        }
    };

    // Calculate which badges are earned
    const badgesWithStatus = allBadges.map(badge => {
        // Find if user has this badge
        // Assuming matching by ID or name. Let's use name for demo if ID match complex
        // Ideally should match by ID.
        const earned = myBadges.find((mb: any) => mb.badge.id === (badge as any).id); // API structure dependent
        return {
            ...badge,
            earned_at: earned ? earned.earned_at : undefined
        };
    });

    // Sort: Earned first
    badgesWithStatus.sort((a, b) => (b.earned_at ? 1 : 0) - (a.earned_at ? 1 : 0));

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-8">
            <header>
                <h1 className="text-3xl font-bold text-slate-900">{t('student.achievements.pageTitle')}</h1>
                <p className="text-slate-500">{t('student.achievements.subtitle')}</p>
            </header>

            <Tabs defaultValue="badges">
                <TabsList>
                    <TabsTrigger value="badges">{t('student.achievements.tabBadges')}</TabsTrigger>
                    <TabsTrigger value="leaderboard">{t('student.achievements.tabLeaderboard')}</TabsTrigger>
                </TabsList>

                <TabsContent value="badges" className="mt-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {badgesWithStatus.map((badge, i) => (
                            <BadgeCard key={i} badge={badge} />
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="leaderboard" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Trophy className="text-yellow-500" /> {t('student.achievements.classLeaderboard')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {leaderboard.map((entry: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${entry.rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                                                entry.rank === 2 ? 'bg-slate-200 text-slate-700' :
                                                    entry.rank === 3 ? 'bg-orange-100 text-orange-700' : 'text-slate-500'
                                                }`}>
                                                {entry.rank}
                                            </div>
                                            <div>
                                                <p className="font-semibold">{entry.student_name}</p>
                                                <p className="text-xs text-slate-500">{t('student.achievements.badgesCount', { count: formatNumber(entry.badges_count, locale) })}</p>
                                            </div>
                                        </div>
                                        <div className="font-mono font-bold text-indigo-600">
                                            {t('student.achievements.xpPoints', { points: formatNumber(entry.total_points, locale) })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
