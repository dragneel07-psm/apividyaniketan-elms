// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
    BrainCircuit, Sparkles, ChevronRight, CheckCircle2,
    Lock, PlayCircle, Clock, RefreshCw, AlertCircle,
    BookOpen, Video, FileText, HelpCircle
} from 'lucide-react';
import { aiAPI, learningPathsAPI, academicAPI, usersAPI, LearningPath, LearningNode } from '@/lib/api';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/localization';
import { formatNumber } from '@/lib/i18n/format';

export default function LearningPathPage() {
    const router = useRouter();
    const { t, locale } = useTranslation();
    const [path, setPath] = useState<LearningPath | null>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [studentId, setStudentId] = useState('');
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [student, currentUser] = await Promise.all([
                academicAPI.getMyStudent(),
                usersAPI.getMe().catch(() => null)
            ]);
            setStudentId(student.id);
            setUser(currentUser);

            const activePath = await aiAPI.getActivePath();
            setPath(activePath);
        } catch (error: any) {
            console.error("Path load error:", error);
            if (error.status !== 404) {
                toast.error(t('student.learningPath.toastLoadFail'));
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        if (!studentId) return;
        try {
            setGenerating(true);
            const newPath = await learningPathsAPI.generatePath({ student_id: studentId });
            setPath(newPath);
            toast.success(t('student.learningPath.toastGenerateSuccess'));
        } catch (error) {
            toast.error(t('student.learningPath.toastGenerateFail'));
        } finally {
            setGenerating(false);
        }
    };

    const handleNodeComplete = async (nodeId: string) => {
        try {
            const result = await learningPathsAPI.updateNodeStatus(nodeId, 'completed');

            // Refresh path data
            const activePath = await aiAPI.getActivePath();
            setPath(activePath);

            if (result.next_node_unlocked) {
                toast.success(t('student.learningPath.toastCompleteUnlocked'));
            } else {
                toast.success(t('student.learningPath.toastCompleteAll'));
            }
        } catch (error) {
            toast.error(t('student.learningPath.toastUpdateFail'));
        }
    };

    const getIconForType = (type: string) => {
        switch (type) {
            case 'video': return <Video className="h-5 w-5" />;
            case 'quiz': return <HelpCircle className="h-5 w-5" />;
            case 'assignment': return <FileText className="h-5 w-5" />;
            case 'article': return <BookOpen className="h-5 w-5" />;
            default: return <BrainCircuit className="h-5 w-5" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-emerald-500';
            case 'unlocked': return 'bg-indigo-500';
            case 'in_progress': return 'bg-amber-500';
            default: return 'bg-slate-300';
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">{t('student.learningPath.loading')}</div>;

    if (user?.tenant_features?.student_ai_chatbot === false) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center h-[60vh]">
                <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                    <BrainCircuit className="h-8 w-8 text-slate-400" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">{t('student.learningPath.lockedTitle')}</h2>
                <p className="text-slate-500 max-w-md mx-auto">{t('student.learningPath.lockedDesc')}</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-6 w-6 text-indigo-600" />
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{t('student.learningPath.pageTitle')}</h1>
                    </div>
                    <p className="text-slate-500">{t('student.learningPath.subtitle')}</p>
                </div>
                <Button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200"
                >
                    {generating ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    {generating ? t('student.learningPath.regenerating') : t('student.learningPath.regenerate')}
                </Button>
            </div>

            {!path ? (
                <Card className="border-dashed border-2 bg-slate-50/50">
                    <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
                        <div className="h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center">
                            <BrainCircuit className="h-8 w-8 text-indigo-600" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-xl font-bold text-slate-900">{t('student.learningPath.noPathTitle')}</h3>
                            <p className="text-slate-500 max-w-sm mt-2">
                                {t('student.learningPath.noPathDesc')}
                            </p>
                        </div>
                        <Button onClick={handleGenerate} disabled={generating}>
                            {t('student.learningPath.getStarted')}
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-6">
                    {/* Path Info Card */}
                    <Card className="border-none shadow-sm overflow-hidden">
                        <div className="h-2 bg-indigo-600"></div>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <Badge variant="outline" className="mb-2 bg-indigo-50 text-indigo-700 border-indigo-100">
                                        {t('student.learningPath.badgePersonalized')}
                                    </Badge>
                                    <CardTitle className="text-2xl">{path.title}</CardTitle>
                                    <CardDescription className="mt-2">{path.description}</CardDescription>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('student.learningPath.progressLabel')}</p>
                                    <p className="text-2xl font-black text-slate-900">
                                        {formatNumber(Math.round((path.nodes.filter(n => n.status === 'completed').length / path.nodes.length) * 100), locale)}%
                                    </p>
                                </div>
                            </div>
                            <Progress
                                value={(path.nodes.filter(n => n.status === 'completed').length / path.nodes.length) * 100}
                                className="h-2 mt-4"
                            />
                        </CardHeader>
                    </Card>

                    {/* Roadmap Timeline */}
                    <div className="space-y-6 relative">
                        {/* Connecting Line */}
                        <div className="absolute left-[2.25rem] top-8 bottom-8 w-1 bg-slate-100 -z-10"></div>

                        {path.nodes.map((node, index) => (
                            <div key={node.id} className="flex gap-6 group">
                                {/* Node Indicator */}
                                <div className="relative shrink-0 flex flex-col items-center">
                                    <div className={`h-12 w-12 rounded-full border-4 flex items-center justify-center z-10 transition-all
                                        ${node.status === 'completed' ? 'bg-emerald-500 border-emerald-100 shadow-lg shadow-emerald-100' :
                                            node.status === 'locked' ? 'bg-slate-100 border-white text-slate-400' :
                                                'bg-white border-indigo-600 text-indigo-600 shadow-lg shadow-indigo-100'}
                                    `}>
                                        {node.status === 'completed' ? (
                                            <CheckCircle2 className="h-6 w-6 text-white" />
                                        ) : node.status === 'locked' ? (
                                            <Lock className="h-5 w-5" />
                                        ) : (
                                            <span className="font-bold">{index + 1}</span>
                                        )}
                                    </div>
                                    {index === 0 && node.status !== 'completed' && (
                                        <Badge className="absolute -top-6 whitespace-nowrap bg-amber-500 shadow-lg animate-bounce">
                                            {t('student.learningPath.startHere')}
                                        </Badge>
                                    )}
                                </div>

                                {/* Node Content Card */}
                                <Card className={`flex-1 transition-all border-none ${node.status === 'locked' ? 'bg-slate-50/50 opacity-80' : 'bg-white shadow-sm hover:shadow-md'
                                    }`}>
                                    <CardContent className="p-6">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="flex gap-4">
                                                <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0
                                                    ${node.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                                                        node.status === 'locked' ? 'bg-slate-50 text-slate-400' : 'bg-indigo-50 text-indigo-600'}
                                                `}>
                                                    {getIconForType(node.resource_type)}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h4 className={`font-bold text-lg ${node.status === 'locked' ? 'text-slate-400' : 'text-slate-900'}`}>
                                                            {node.title}
                                                        </h4>
                                                        {node.status === 'in_progress' && (
                                                            <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200">
                                                                {t('student.learningPath.badgeRecent')}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className={`text-sm ${node.status === 'locked' ? 'text-slate-400' : 'text-slate-500'} line-clamp-2`}>
                                                        {node.description}
                                                    </p>
                                                    <div className="flex items-center gap-4 mt-3">
                                                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                                                            <Clock className="h-3.5 w-3.5" />
                                                            {t('student.learningPath.estMins', { mins: formatNumber(node.estimated_minutes, locale) })}
                                                        </div>
                                                        <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-wider
                                                            ${node.resource_type === 'video' ? 'text-blue-600 bg-blue-50' :
                                                                node.resource_type === 'quiz' ? 'text-purple-600 bg-purple-50' : 'text-slate-600 bg-slate-50'}
                                                        `}>
                                                            {node.resource_type}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {node.status === 'locked' ? (
                                                    <Button variant="ghost" disabled size="sm" className="text-slate-400">
                                                        {t('student.learningPath.btnLocked')}
                                                    </Button>
                                                ) : node.status === 'completed' ? (
                                                    <Button variant="ghost" size="sm" className="text-emerald-600 font-semibold cursor-default">
                                                        <CheckCircle2 className="h-4 w-4 mr-2" />
                                                        {t('student.learningPath.btnDone')}
                                                    </Button>
                                                ) : (
                                                    <div className="flex gap-2 w-full md:w-auto">
                                                        {node.lesson && (
                                                            <Button
                                                                variant="outline"
                                                                className="flex-1 md:flex-none border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                                                                onClick={() => router.push(`/student/courses/${node.lesson}/view`)}
                                                            >
                                                                {t('student.learningPath.btnGoToLesson')}
                                                            </Button>
                                                        )}
                                                        <Button
                                                            className="flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-700"
                                                            onClick={() => handleNodeComplete(node.id)}
                                                        >
                                                            {t('student.learningPath.btnMarkComplete')}
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
