// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { gamificationAPI } from "@/lib/api";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trophy, Medal, Crown, Users, School, Flame, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/localization";
import { formatNumber } from "@/lib/i18n/format";

interface LeaderboardEntry {
    student_id: string;
    student_name: string;
    total_xp: number;
    current_level: number;
    current_streak: number;
    badges_count: number;
    rank: number;
    is_me: boolean;
}

interface LeaderboardData {
    scope: string;
    total_participants: number;
    my_rank: number | null;
    entries: LeaderboardEntry[];
}

export default function LeaderboardPage() {
    const { t, locale } = useTranslation();
    const [scope, setScope] = useState<"class" | "school">("class");
    const [data, setData] = useState<LeaderboardData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        gamificationAPI.getLeaderboard(scope)
            .then(setData)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [scope]);

    const getRankIcon = (rank: number) => {
        if (rank === 1) return <Crown className="w-5 h-5 text-yellow-500 fill-yellow-400" />;
        if (rank === 2) return <Medal className="w-5 h-5 text-slate-400 fill-slate-300" />;
        if (rank === 3) return <Medal className="w-5 h-5 text-amber-600 fill-amber-500" />;
        return <span className="text-sm font-bold text-slate-500 w-5 text-center">{rank}</span>;
    };

    const getRowStyle = (entry: LeaderboardEntry) => {
        if (entry.is_me) return "bg-indigo-50 border-indigo-300 ring-1 ring-indigo-200";
        if (entry.rank === 1) return "bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200";
        if (entry.rank === 2) return "bg-slate-50 border-slate-200";
        if (entry.rank === 3) return "bg-amber-50/40 border-amber-100";
        return "bg-white border-slate-100 hover:bg-slate-50";
    };

    return (
        <div className="container mx-auto p-6 max-w-3xl space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
                        {t('student.leaderboard.pageTitle')}
                    </h1>
                    <p className="text-slate-500 text-sm">
                        {data
                            ? (data.my_rank
                                ? t('student.leaderboard.subtitleRank', { total: formatNumber(data.total_participants, locale), rank: formatNumber(data.my_rank, locale) })
                                : t('student.leaderboard.subtitleData', { total: formatNumber(data.total_participants, locale) }))
                            : t('student.leaderboard.subtitleDefault')}
                    </p>
                </div>
                <Tabs value={scope} onValueChange={(v) => setScope(v as "class" | "school")}>
                    <TabsList>
                        <TabsTrigger value="class" className="gap-2">
                            <Users className="w-4 h-4" /> {t('student.leaderboard.tabClass')}
                        </TabsTrigger>
                        <TabsTrigger value="school" className="gap-2">
                            <School className="w-4 h-4" /> {t('student.leaderboard.tabSchool')}
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* My rank banner */}
            {data?.my_rank && (
                <div className="bg-indigo-600 text-white rounded-xl px-5 py-3 flex items-center justify-between shadow-md">
                    <div className="flex items-center gap-3">
                        <Trophy className="h-5 w-5 text-yellow-300" />
                        <span className="font-semibold">{t('student.leaderboard.myRankLabel')}</span>
                    </div>
                    <span className="text-2xl font-bold">#{data.my_rank}</span>
                </div>
            )}

            <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-4">
                    {loading ? (
                        <div className="py-16 text-center text-slate-400">{t('student.leaderboard.loading')}</div>
                    ) : !data || data.entries.length === 0 ? (
                        <div className="py-16 text-center text-slate-400">
                            {t('student.leaderboard.noEntries')}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {data.entries.map((entry, idx) => (
                                <motion.div
                                    key={entry.student_id}
                                    initial={{ opacity: 0, x: -16 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.04 }}
                                    className={cn(
                                        "flex items-center gap-4 p-4 rounded-xl border transition-all",
                                        getRowStyle(entry)
                                    )}
                                >
                                    <div className="w-8 flex justify-center flex-shrink-0">
                                        {getRankIcon(entry.rank)}
                                    </div>

                                    <Avatar className="h-10 w-10 border-2 border-white shadow-sm flex-shrink-0">
                                        <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white font-bold text-sm">
                                            {entry.student_name.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>

                                    <div className="flex-grow min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-slate-800 truncate">{entry.student_name}</h3>
                                            {entry.is_me && (
                                                <Badge variant="secondary" className="text-[10px] bg-indigo-100 text-indigo-700 shrink-0">{t('student.leaderboard.badgeYou')}</Badge>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                                            <span className="flex items-center gap-1">
                                                <Star className="h-3 w-3 text-yellow-500" />
                                                {t('student.leaderboard.levelPrefix', { level: formatNumber(entry.current_level, locale) })}
                                            </span>
                                            {entry.current_streak > 0 && (
                                                <span className="flex items-center gap-1">
                                                    <Flame className="h-3 w-3 text-orange-500" />
                                                    {t('student.leaderboard.streakSuffix', { days: formatNumber(entry.current_streak, locale) })}
                                                </span>
                                            )}
                                            {entry.badges_count > 0 && (
                                                <span>{t('student.leaderboard.badgesCount', { count: formatNumber(entry.badges_count, locale) })}</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="text-right flex-shrink-0">
                                        <span className="block font-bold text-indigo-600 text-lg leading-tight">
                                            {formatNumber(entry.total_xp, locale)}
                                        </span>
                                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{t('student.leaderboard.xpLabel')}</span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
