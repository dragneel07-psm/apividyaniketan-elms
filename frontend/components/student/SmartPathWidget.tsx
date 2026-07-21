// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    PlayCircle, Sparkles, BookOpen,
    Clock, ArrowRight, CheckCircle2
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Recommendation {
    id: number;
    title: string;
    subject: string;
    type: string;
    reason: string;
}

interface SmartPathWidgetProps {
    recommendation: Recommendation | null;
}

export function SmartPathWidget({ recommendation }: SmartPathWidgetProps) {
    const router = useRouter();

    if (!recommendation) return null;

    return (
        <Card className="border-none shadow-xl bg-gradient-to-r from-indigo-600 to-violet-700 text-white overflow-hidden relative">
            {/* Visual Decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-400/20 rounded-full -ml-16 -mb-16 blur-2xl" />

            <CardContent className="p-8 relative z-10 flex flex-col md:flex-row items-center gap-8">
                <div className="h-20 w-20 rounded-3xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30 shadow-2xl">
                    <Sparkles className="h-10 w-10 text-white animate-pulse" />
                </div>

                <div className="flex-1 text-center md:text-left space-y-2">
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-2">
                        <Badge className="bg-white/20 hover:bg-white/30 text-white border-none backdrop-blur-md font-black uppercase text-[10px] tracking-widest px-3">
                            AI Personalized
                        </Badge>
                        <Badge className="bg-emerald-400/20 text-emerald-300 border-none backdrop-blur-md font-black uppercase text-[10px] tracking-widest px-3">
                            {recommendation.type}
                        </Badge>
                    </div>

                    <h2 className="text-3xl font-black tracking-tight leading-tight">
                        {recommendation.title}
                    </h2>

                    <p className="text-indigo-100 font-medium opacity-90 leading-relaxed max-w-xl italic text-lg">
                        &quot;{recommendation.reason}&quot;
                    </p>

                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 pt-4">
                        <div className="flex items-center gap-2 text-sm font-bold opacity-80 uppercase tracking-widest">
                            <BookOpen className="h-4 w-4" />
                            {recommendation.subject}
                        </div>
                        <div className="flex items-center gap-2 text-sm font-bold opacity-80 uppercase tracking-widest">
                            <Clock className="h-4 w-4" />
                            ~15 mins
                        </div>
                    </div>
                </div>

                <div className="shrink-0 w-full md:w-auto">
                    <Button
                        size="lg"
                        className="w-full md:w-auto bg-white text-indigo-700 hover:bg-indigo-50 font-black rounded-2xl h-16 px-8 text-lg shadow-2xl hover:scale-105 transition-all group"
                        onClick={() => router.push(`/student/courses/${recommendation.id}/lessons`)}
                    >
                        <PlayCircle className="h-6 w-6 mr-3 fill-indigo-700 text-white" />
                        Start Now
                        <ArrowRight className="h-5 w-5 ml-2 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
