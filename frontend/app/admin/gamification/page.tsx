// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge as UIBadge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem,
    SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
    Trophy, Star, Award, Plus, Edit2, Trash2,
    Flame, BookOpen, Target, Zap, Clock, Users
} from 'lucide-react';
import { gamificationAPI, api } from '@/lib/api';
import { toast } from 'sonner';

interface Badge {
    id: string;
    name: string;
    description: string;
    icon_name: string;
    criteria_type: string;
    criteria_value: number;
    xp_reward: number;
    created_at: string;
}

interface LeaderboardEntry {
    rank: number;
    student_id: string;
    student_name: string;
    total_xp: number;
    current_level: number;
    current_streak: number;
    badges_count: number;
    is_me: boolean;
}

const CRITERIA_TYPES = [
    { value: 'lessons_completed', label: 'Lessons Completed' },
    { value: 'assessments_passed', label: 'Assessments Passed' },
    { value: 'streak_days', label: 'Streak Days' },
    { value: 'perfect_score', label: 'Perfect Score on Assessment' },
    { value: 'early_bird', label: 'Early Submission' },
];

const ICON_OPTIONS = [
    { value: 'award', label: 'Award', Icon: Award },
    { value: 'trophy', label: 'Trophy', Icon: Trophy },
    { value: 'star', label: 'Star', Icon: Star },
    { value: 'flame', label: 'Flame', Icon: Flame },
    { value: 'book-open', label: 'Book', Icon: BookOpen },
    { value: 'target', label: 'Target', Icon: Target },
    { value: 'zap', label: 'Zap', Icon: Zap },
    { value: 'clock', label: 'Clock', Icon: Clock },
];

function BadgeIcon({ name, className }: { name: string; className?: string }) {
    const found = ICON_OPTIONS.find(o => o.value === name);
    const Icon = found?.Icon || Award;
    return <Icon className={className} />;
}

const EMPTY_FORM = {
    name: '',
    description: '',
    icon_name: 'award',
    criteria_type: 'lessons_completed',
    criteria_value: 1,
    xp_reward: 100,
};

export default function AdminGamificationPage() {
    const [loading, setLoading] = useState(true);
    const [badges, setBadges] = useState<Badge[]>([]);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [leaderboardMeta, setLeaderboardMeta] = useState<{ total_participants: number } | null>(null);

    const [badgeDialog, setBadgeDialog] = useState<{ open: boolean; mode: 'add' | 'edit'; badge: Badge | null }>({
        open: false, mode: 'add', badge: null,
    });
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [badgesData, lbData] = await Promise.all([
                gamificationAPI.getBadges(),
                gamificationAPI.getLeaderboard('school').catch(() => null),
            ]);
            setBadges(badgesData as Badge[]);
            if (lbData) {
                setLeaderboard(lbData.entries || []);
                setLeaderboardMeta({ total_participants: lbData.total_participants });
            }
        } catch (error) {
            console.error('Failed to load gamification data', error);
            toast.error('Failed to load gamification data');
        } finally {
            setLoading(false);
        }
    };

    const openAdd = () => {
        setForm(EMPTY_FORM);
        setBadgeDialog({ open: true, mode: 'add', badge: null });
    };

    const openEdit = (badge: Badge) => {
        setForm({
            name: badge.name,
            description: badge.description,
            icon_name: badge.icon_name,
            criteria_type: badge.criteria_type,
            criteria_value: badge.criteria_value,
            xp_reward: badge.xp_reward,
        });
        setBadgeDialog({ open: true, mode: 'edit', badge });
    };

    const handleSave = async () => {
        if (!form.name || !form.description) {
            toast.error('Name and description are required');
            return;
        }
        setSaving(true);
        try {
            if (badgeDialog.mode === 'add') {
                await api.gamification.createBadge(form);
                toast.success('Badge created');
            } else if (badgeDialog.badge) {
                await api.gamification.updateBadge(badgeDialog.badge.id, form);
                toast.success('Badge updated');
            }
            setBadgeDialog(d => ({ ...d, open: false }));
            loadData();
        } catch (error: any) {
            toast.error(error.message || 'Failed to save badge');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (badge: Badge) => {
        if (!confirm(`Delete badge "${badge.name}"? Students who have earned it will keep it.`)) return;
        try {
            await api.gamification.deleteBadge(badge.id);
            toast.success('Badge deleted');
            loadData();
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete badge');
        }
    };

    const getRankColor = (rank: number) => {
        if (rank === 1) return 'text-yellow-600 font-bold';
        if (rank === 2) return 'text-slate-500 font-bold';
        if (rank === 3) return 'text-amber-600 font-bold';
        return 'text-slate-500';
    };

    if (loading) return <div className="p-8 text-center text-slate-400">Loading gamification data...</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <Trophy className="h-8 w-8 text-yellow-500" /> Gamification
                    </h1>
                    <p className="text-slate-500">Manage badges, XP rewards, and view school leaderboard</p>
                </div>
                <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={openAdd}>
                    <Plus className="mr-2 h-4 w-4" /> New Badge
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="bg-yellow-50 p-3 rounded-xl">
                            <Award className="h-5 w-5 text-yellow-600" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">Total Badges</p>
                            <p className="text-2xl font-bold text-slate-900">{badges.length}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="bg-indigo-50 p-3 rounded-xl">
                            <Users className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">Participants</p>
                            <p className="text-2xl font-bold text-slate-900">{leaderboardMeta?.total_participants ?? 0}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="bg-emerald-50 p-3 rounded-xl">
                            <Star className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">Total XP Pool</p>
                            <p className="text-2xl font-bold text-slate-900">
                                {badges.reduce((acc, b) => acc + b.xp_reward, 0).toLocaleString()}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="badges">
                <TabsList className="bg-slate-100 p-1">
                    <TabsTrigger value="badges" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <Award className="h-4 w-4 mr-2" /> Badge Catalog
                    </TabsTrigger>
                    <TabsTrigger value="leaderboard" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <Trophy className="h-4 w-4 mr-2" /> School Leaderboard
                    </TabsTrigger>
                </TabsList>

                {/* ─── Badge Catalog ─── */}
                <TabsContent value="badges" className="mt-6">
                    {badges.length === 0 ? (
                        <div className="text-center py-16 text-slate-400">
                            <Award className="h-12 w-12 mx-auto mb-4 opacity-20" />
                            <p>No badges created yet. Add your first badge!</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {badges.map(badge => (
                                <Card key={badge.id} className="border-slate-200 shadow-sm hover:shadow-md transition-all">
                                    <CardContent className="p-5">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-indigo-100 p-3 rounded-xl">
                                                    <BadgeIcon name={badge.icon_name} className="h-6 w-6 text-indigo-600" />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-slate-900">{badge.name}</h3>
                                                    <p className="text-xs text-slate-500 line-clamp-2">{badge.description}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-1 shrink-0">
                                                <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-indigo-600"
                                                    onClick={() => openEdit(badge)}>
                                                    <Edit2 className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-rose-600"
                                                    onClick={() => handleDelete(badge)}>
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            <UIBadge variant="outline" className="text-[10px] capitalize">
                                                {badge.criteria_type.replace(/_/g, ' ')} × {badge.criteria_value}
                                            </UIBadge>
                                            <UIBadge variant="secondary" className="text-[10px] text-yellow-700 bg-yellow-50">
                                                +{badge.xp_reward} XP
                                            </UIBadge>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* ─── Leaderboard ─── */}
                <TabsContent value="leaderboard" className="mt-6">
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase w-16">Rank</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Student</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Level</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Streak</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Badges</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-right">Total XP</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {leaderboard.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                                            No leaderboard data yet.
                                        </td>
                                    </tr>
                                ) : leaderboard.map(entry => (
                                    <tr key={entry.student_id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className={`px-6 py-4 ${getRankColor(entry.rank)}`}>
                                            #{entry.rank}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-medium text-slate-900">{entry.student_name}</span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            <span className="flex items-center gap-1">
                                                <Star className="h-3.5 w-3.5 text-yellow-500" />
                                                {entry.current_level}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {entry.current_streak > 0 ? (
                                                <span className="flex items-center gap-1 text-orange-600">
                                                    <Flame className="h-3.5 w-3.5" />
                                                    {entry.current_streak}d
                                                </span>
                                            ) : (
                                                <span className="text-slate-300">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">{entry.badges_count}</td>
                                        <td className="px-6 py-4 text-right font-bold text-indigo-600">
                                            {entry.total_xp.toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </TabsContent>
            </Tabs>

            {/* ─── Badge Dialog ─── */}
            <Dialog open={badgeDialog.open} onOpenChange={(open) => setBadgeDialog(d => ({ ...d, open }))}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{badgeDialog.mode === 'add' ? 'Create Badge' : 'Edit Badge'}</DialogTitle>
                        <DialogDescription>
                            Define the criteria students must meet to earn this badge.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Badge Name <span className="text-rose-500">*</span></Label>
                            <Input
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                                placeholder="e.g. Speed Reader"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Description <span className="text-rose-500">*</span></Label>
                            <Input
                                value={form.description}
                                onChange={e => setForm({ ...form, description: e.target.value })}
                                placeholder="e.g. Complete 10 lessons in a week"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Icon</Label>
                                <Select value={form.icon_name} onValueChange={v => setForm({ ...form, icon_name: v })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ICON_OPTIONS.map(o => (
                                            <SelectItem key={o.value} value={o.value}>
                                                <span className="flex items-center gap-2">
                                                    <o.Icon className="h-4 w-4" /> {o.label}
                                                </span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>XP Reward</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    value={form.xp_reward}
                                    onChange={e => setForm({ ...form, xp_reward: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2 col-span-2">
                                <Label>Criteria Type</Label>
                                <Select value={form.criteria_type} onValueChange={v => setForm({ ...form, criteria_type: v })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CRITERIA_TYPES.map(c => (
                                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2 col-span-2">
                                <Label>Criteria Value (threshold)</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    value={form.criteria_value}
                                    onChange={e => setForm({ ...form, criteria_value: parseInt(e.target.value) || 1 })}
                                    placeholder="e.g. 10"
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setBadgeDialog(d => ({ ...d, open: false }))}>Cancel</Button>
                        <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
                            {saving ? 'Saving...' : badgeDialog.mode === 'add' ? 'Create Badge' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
