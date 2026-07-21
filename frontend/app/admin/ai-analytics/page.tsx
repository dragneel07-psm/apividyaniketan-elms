// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, TrendingUp, Users, DollarSign, Clock } from 'lucide-react';
import { aiAPI } from '@/lib/api';
import { toast } from 'sonner';

interface AILog {
    log_id: string;
    user: string;
    feature_used: string;
    total_tokens: number;
    cost_estimated: number;
    timestamp: string;
}

export default function AIAnalyticsPage() {
    const [logs, setLogs] = useState<AILog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadLogs();
    }, []);

    const loadLogs = async () => {
        try {
            const data = await aiAPI.getAILogs();
            setLogs(data);
        } catch (error) {
            console.error('Failed to load AI logs:', error);
            toast.error('Failed to load AI analytics');
        } finally {
            setLoading(false);
        }
    };

    // Calculate statistics
    const totalTokens = logs.reduce((sum, log) => sum + log.total_tokens, 0);
    const totalCost = logs.reduce((sum, log) => sum + parseFloat(log.cost_estimated.toString()), 0);
    const uniqueUsers = new Set(logs.map(log => log.user)).size;
    const tutorLogs = logs.filter(log => log.feature_used === 'tutor');

    // Group by date for chart
    const logsByDate = logs.reduce((acc, log) => {
        const date = new Date(log.timestamp).toLocaleDateString();
        acc[date] = (acc[date] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    // Most active users
    const userActivity = logs.reduce((acc, log) => {
        acc[log.user] = (acc[log.user] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const topUsers = Object.entries(userActivity)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    <Sparkles className="h-8 w-8 text-indigo-600" />
                    AI Analytics Dashboard
                </h1>
                <p className="text-muted-foreground">Monitor AI usage, token consumption, and student engagement</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Interactions</p>
                                <h3 className="text-2xl font-bold mt-2">{logs.length}</h3>
                                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                    <TrendingUp className="h-3 w-3" />
                                    {tutorLogs.length} tutor chats
                                </p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-indigo-50 flex items-center justify-center">
                                <Sparkles className="h-6 w-6 text-indigo-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Tokens</p>
                                <h3 className="text-2xl font-bold mt-2">{totalTokens.toLocaleString()}</h3>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Avg: {Math.round(totalTokens / (logs.length || 1))} per chat
                                </p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center">
                                <Clock className="h-6 w-6 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                                <h3 className="text-2xl font-bold mt-2">{uniqueUsers}</h3>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Students using AI
                                </p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center">
                                <Users className="h-6 w-6 text-green-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Estimated Cost</p>
                                <h3 className="text-2xl font-bold mt-2">${totalCost.toFixed(2)}</h3>
                                <p className="text-xs text-muted-foreground mt-1">
                                    This month
                                </p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center">
                                <DollarSign className="h-6 w-6 text-amber-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Usage Over Time */}
                <Card>
                    <CardHeader>
                        <CardTitle>Usage Over Time</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {Object.entries(logsByDate).slice(-7).map(([date, count]) => (
                                <div key={date} className="flex items-center gap-4">
                                    <span className="text-sm text-muted-foreground w-24">{date}</span>
                                    <div className="flex-1 bg-slate-100 rounded-full h-8 overflow-hidden">
                                        <div
                                            className="bg-indigo-600 h-full flex items-center justify-end px-2 text-white text-xs font-medium"
                                            style={{ width: `${(count / Math.max(...Object.values(logsByDate))) * 100}%` }}
                                        >
                                            {count}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Top Users */}
                <Card>
                    <CardHeader>
                        <CardTitle>Most Active Students</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {topUsers.map(([userId, count], index) => (
                                <div key={userId} className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                                        #{index + 1}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium">User {userId.substring(0, 8)}...</p>
                                        <p className="text-xs text-muted-foreground">{count} interactions</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-indigo-600">{count}</p>
                                    </div>
                                </div>
                            ))}
                            {topUsers.length === 0 && (
                                <p className="text-center text-muted-foreground py-8">No activity yet</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Activity */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent AI Interactions</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {logs.slice(-10).reverse().map((log) => (
                            <div key={log.log_id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                <div className="flex items-center gap-4">
                                    <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                                        <Sparkles className="h-4 w-4 text-indigo-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium capitalize">{log.feature_used}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {new Date(log.timestamp).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-medium">{log.total_tokens} tokens</p>
                                    <p className="text-xs text-muted-foreground">${parseFloat(log.cost_estimated.toString()).toFixed(4)}</p>
                                </div>
                            </div>
                        ))}
                        {logs.length === 0 && (
                            <p className="text-center text-muted-foreground py-8">No AI interactions yet</p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
