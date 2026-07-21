// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Award, Zap, Star, Trophy, Calendar, Footprints, Flame, GraduationCap } from 'lucide-react';

export interface BadgeType {
    name: string;
    description: string;
    icon_name: string;
    earned_at?: string; // If present, badge is earned
}

interface BadgeCardProps {
    badge: BadgeType;
}

const Icons: { [key: string]: any } = {
    award: Award,
    zap: Zap,
    star: Star,
    trophy: Trophy,
    calendar: Calendar,
    footprints: Footprints,
    flame: Flame,
    'graduation-cap': GraduationCap
};

export function BadgeCard({ badge }: BadgeCardProps) {
    const Icon = Icons[badge.icon_name] || Award;
    const isEarned = !!badge.earned_at;

    return (
        <Card className={`p-4 flex flex-col items-center text-center transition-all ${isEarned ? 'bg-white border-yellow-400 shadow-md scale-105' : 'bg-slate-50 border-slate-200 opacity-60 grayscale'}`}>
            <div className={`p-3 rounded-full mb-3 ${isEarned ? 'bg-yellow-100 text-yellow-600' : 'bg-slate-200 text-slate-400'}`}>
                <Icon className="h-8 w-8" />
            </div>
            <h3 className="font-bold text-slate-800">{badge.name}</h3>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{badge.description}</p>

            {isEarned && (
                <Badge variant="secondary" className="mt-3 bg-yellow-50 text-yellow-700 hover:bg-yellow-100">
                    Earned {new Date(badge.earned_at!).toLocaleDateString()}
                </Badge>
            )}
        </Card>
    );
}
