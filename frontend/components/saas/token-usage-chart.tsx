// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
"use client";

import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    ComposedChart,
    Line,
    LineChart,
    Tooltip,
    XAxis,
    YAxis,
    Legend
} from "recharts";
import { SafeResponsiveContainer } from "@/components/ui/safe-responsive-container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTheme } from "next-themes";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BrainCircuit, DollarSign } from "lucide-react";

const data = [
    { name: "Jan", tokens: 400000, cost: 8 },
    { name: "Feb", tokens: 300000, cost: 6 },
    { name: "Mar", tokens: 200000, cost: 4 },
    { name: "Apr", tokens: 278000, cost: 5.56 },
    { name: "May", tokens: 189000, cost: 3.78 },
    { name: "Jun", tokens: 239000, cost: 4.78 },
    { name: "Jul", tokens: 349000, cost: 6.98 },
    { name: "Aug", tokens: 500000, cost: 10 },
    { name: "Sep", tokens: 450000, cost: 9 },
    { name: "Oct", tokens: 600000, cost: 12 },
    { name: "Nov", tokens: 750000, cost: 15 },
    { name: "Dec", tokens: 900000, cost: 18 },
];

const schoolData = [
    { name: "Tech High", tokens: 850000, students: 1200 },
    { name: "Greenwood", tokens: 450000, students: 800 },
    { name: "Sunrise", tokens: 300000, students: 600 },
    { name: "Oak Valley", tokens: 200000, students: 450 },
    { name: "Riverdale", tokens: 150000, students: 300 },
];

export function TokenUsageChart() {
    const { theme } = useTheme();
    const isDark = theme === "dark";

    // Colors matching "Deep Space" theme
    const colors = {
        tokens: isDark ? "#818cf8" : "#4f46e5", // Indigo 400/600
        cost: isDark ? "#34d399" : "#10b981",   // Emerald 400/500
        bar: isDark ? "#6366f1" : "#4338ca",    // Indigo 500/700
        grid: isDark ? "#ffffff10" : "#00000010",
        text: isDark ? "#94a3b8" : "#64748b",
        tooltipBg: isDark ? "#1e293b" : "#ffffff",
        tooltipBorder: isDark ? "#334155" : "#e2e8f0",
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div
                    className="rounded-lg border shadow-xl p-3 backdrop-blur-md"
                    style={{
                        backgroundColor: isDark ? 'rgba(17, 17, 20, 0.8)' : 'rgba(255, 255, 255, 0.9)',
                        borderColor: colors.tooltipBorder
                    }}
                >
                    <p className="font-bold mb-2 text-slate-900 dark:text-white">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center gap-2 text-xs font-medium mb-1">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span className="capitalize text-slate-600 dark:text-slate-300">
                                {entry.name}:
                            </span>
                            <span className="font-bold text-slate-900 dark:text-white">
                                {entry.name === 'cost' ? `$${Number(entry.value).toFixed(2)}` : entry.value.toLocaleString()}
                            </span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <Card className="col-span-4 bg-white dark:bg-[#111114] border-slate-200 dark:border-white/10 shadow-xl dark:shadow-none backdrop-blur-3xl">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                            <BrainCircuit className="w-5 h-5 text-indigo-500" />
                            Token Consumption Analytics
                        </CardTitle>
                        <CardDescription>
                            Historical usage trends and cost correlation across all tenants.
                        </CardDescription>
                    </div>
                    <Tabs defaultValue="trends" className="w-[300px]">
                        <TabsList className="grid w-full grid-cols-2 bg-slate-100 dark:bg-white/5">
                            <TabsTrigger value="trends" className="data-[state=active]:bg-white dark:data-[state=active]:bg-indigo-600 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-white data-[state=active]:shadow-md font-bold text-xs uppercase tracking-wider">Wait for Charts</TabsTrigger>
                            <TabsTrigger value="breakdown" className="data-[state=active]:bg-white dark:data-[state=active]:bg-indigo-600 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-white data-[state=active]:shadow-md font-bold text-xs uppercase tracking-wider">By School</TabsTrigger>
                        </TabsList>

                        {/* Hidden Content for Tabs triggers to work but render charts in main area */}
                        <div className="hidden">
                            <TabsContent value="trends"></TabsContent>
                            <TabsContent value="breakdown"></TabsContent>
                        </div>
                    </Tabs>
                </div>
            </CardHeader>
            <CardContent>
                <div className="h-[350px] w-full mt-4">
                    <Tabs defaultValue="trends" className="w-full">
                        <TabsContent value="trends" className="h-full mt-0">
                            <SafeResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={colors.tokens} stopOpacity={0.3} />
                                            <stop offset="95%" stopColor={colors.tokens} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.grid} />
                                    <XAxis
                                        dataKey="name"
                                        stroke={colors.text}
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        yAxisId="left"
                                        stroke={colors.text}
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                                    />
                                    <YAxis
                                        yAxisId="right"
                                        orientation="right"
                                        stroke={colors.cost}
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => `$${value}`}
                                    />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }} />
                                    <Legend iconType="circle" />
                                    <Area
                                        yAxisId="left"
                                        type="monotone"
                                        dataKey="tokens"
                                        name="Tokens Used"
                                        stroke={colors.tokens}
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorTokens)"
                                    />
                                    <Line
                                        yAxisId="right"
                                        type="monotone"
                                        dataKey="cost"
                                        name="Cost ($)"
                                        stroke={colors.cost}
                                        strokeWidth={3}
                                        dot={{ r: 4, strokeWidth: 2, fill: isDark ? '#111114' : '#fff' }}
                                        activeDot={{ r: 6, strokeWidth: 0 }}
                                    />
                                </ComposedChart>
                            </SafeResponsiveContainer>
                        </TabsContent>

                        <TabsContent value="breakdown" className="h-full mt-0">
                            <SafeResponsiveContainer width="100%" height="100%">
                                <BarChart data={schoolData} layout="vertical" margin={{ top: 10, right: 30, left: 40, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={colors.grid} />
                                    <XAxis type="number" stroke={colors.text} fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                                    <YAxis dataKey="name" type="category" stroke={colors.text} fontSize={12} tickLine={false} axisLine={false} width={80} />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }} />
                                    <Bar dataKey="tokens" name="Tokens" fill={colors.bar} radius={[0, 4, 4, 0]} barSize={32}>
                                        {/* Optional: Add labels on bars or varied colors */}
                                    </Bar>
                                </BarChart>
                            </SafeResponsiveContainer>
                        </TabsContent>
                    </Tabs>
                </div>
            </CardContent>
        </Card>
    );
}
