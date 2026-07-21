// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    GamificationStats,
    LeaderboardEntry,
    LeaderboardResponse,
    LearningNode,
    LearningPath,
    StudentBadge,
    gamificationAPI,
    learningPathAPI,
} from '../lib/api';
import { Colors, Shadows } from '../constants/theme';

type LeaderScope = 'class' | 'school';

const NODE_STATUS_COLORS: Record<string, { color: string; bg: string }> = {
    completed: { color: Colors.success, bg: Colors.successLight },
    in_progress: { color: Colors.info, bg: Colors.infoLight },
    pending: { color: Colors.gray500, bg: Colors.gray100 },
};

function statusLabel(status?: string) {
    if (!status) return 'Pending';
    return status.replace('_', ' ').toUpperCase();
}

export default function ProgressScreen() {
    const [stats, setStats] = useState<GamificationStats | null>(null);
    const [badges, setBadges] = useState<StudentBadge[]>([]);
    const [paths, setPaths] = useState<LearningPath[]>([]);
    const [nodes, setNodes] = useState<LearningNode[]>([]);
    const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
    const [scope, setScope] = useState<LeaderScope>('class');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');

    const load = useCallback(
        async (currentScope: LeaderScope) => {
            try {
                setError('');
                const [statRes, badgeRes, pathRes, leaderRes] = await Promise.all([
                    gamificationAPI.getMyStats().catch(() => null),
                    gamificationAPI.getMyBadges().catch(() => []),
                    learningPathAPI.getPaths().catch(() => []),
                    gamificationAPI.getLeaderboard(currentScope).catch(() => null),
                ]);
                setStats(statRes);
                setBadges(badgeRes);
                setPaths(pathRes);
                setLeaderboard(leaderRes);

                // If path has embedded nodes, prefer those; else fetch first path's nodes separately.
                const embedded = pathRes.find((p) => Array.isArray(p.nodes) && p.nodes!.length > 0);
                if (embedded && embedded.nodes) {
                    setNodes(embedded.nodes);
                } else if (pathRes.length > 0) {
                    const nodeRes = await learningPathAPI.getNodes(pathRes[0].id).catch(() => []);
                    setNodes(nodeRes);
                } else {
                    setNodes([]);
                }
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : 'Failed to load progress';
                setError(msg);
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        []
    );

    useEffect(() => {
        load(scope);
    }, [load, scope]);

    const onRefresh = () => {
        setRefreshing(true);
        load(scope);
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator color={Colors.primary} size="large" />
                <Text style={styles.loadingText}>Loading your progress...</Text>
            </View>
        );
    }

    const xpTowardsNext = stats
        ? Math.max(0, Math.min(100, Math.round((stats.current_xp / Math.max(stats.next_level_xp, 1)) * 100)))
        : 0;

    return (
        <ScrollView
            style={styles.screen}
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            <View style={styles.heroCard}>
                <Text style={styles.heroBadge}>MY PROGRESS</Text>
                <Text style={styles.heroTitle}>Level {stats?.current_level ?? 1}</Text>
                <Text style={styles.heroSubtitle}>
                    {stats?.total_xp ?? 0} total XP · {stats?.current_streak ?? 0}-day streak
                </Text>

                <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${xpTowardsNext}%` }]} />
                </View>
                <Text style={styles.progressCaption}>
                    {stats ? `${stats.current_xp} / ${stats.next_level_xp} XP to next level` : '—'}
                </Text>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.statGrid}>
                <StatCard label="Longest Streak" value={`${stats?.longest_streak ?? 0} days`} tint={Colors.warning} bg={Colors.warningLight} />
                <StatCard label="Badges" value={String(badges.length)} tint={Colors.secondary} bg="#f3e8ff" />
                <StatCard label="Paths" value={String(paths.length)} tint={Colors.info} bg={Colors.infoLight} />
            </View>

            <SectionHeader title="Badges Earned" caption={`${badges.length} total`} />
            {badges.length === 0 ? (
                <View style={styles.emptyCard}>
                    <Text style={styles.emptyCardText}>No badges yet — keep learning to unlock some!</Text>
                </View>
            ) : (
                <View style={styles.badgeGrid}>
                    {badges.map((b) => (
                        <View key={b.id} style={styles.badgeCard}>
                            <Text style={styles.badgeIcon}>{b.badge_details?.icon || '🏅'}</Text>
                            <Text style={styles.badgeName} numberOfLines={2}>
                                {b.badge_details?.name || 'Badge'}
                            </Text>
                            {b.badge_details?.description ? (
                                <Text style={styles.badgeDesc} numberOfLines={2}>
                                    {b.badge_details.description}
                                </Text>
                            ) : null}
                        </View>
                    ))}
                </View>
            )}

            <SectionHeader title="Leaderboard" caption={leaderboard?.my_rank ? `Your rank: #${leaderboard.my_rank}` : ''} />
            <View style={styles.scopeRow}>
                <TouchableOpacity
                    onPress={() => setScope('class')}
                    style={[styles.scopeBtn, scope === 'class' && styles.scopeBtnActive]}
                >
                    <Text style={[styles.scopeText, scope === 'class' && styles.scopeTextActive]}>My Class</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setScope('school')}
                    style={[styles.scopeBtn, scope === 'school' && styles.scopeBtnActive]}
                >
                    <Text style={[styles.scopeText, scope === 'school' && styles.scopeTextActive]}>School</Text>
                </TouchableOpacity>
            </View>

            {!leaderboard || leaderboard.entries.length === 0 ? (
                <View style={styles.emptyCard}>
                    <Text style={styles.emptyCardText}>Leaderboard is empty.</Text>
                </View>
            ) : (
                leaderboard.entries.map((e) => <LeaderRow key={`${e.rank}-${e.student_id}`} entry={e} />)
            )}

            <SectionHeader title="Learning Path" caption={paths[0]?.title || ''} />
            {nodes.length === 0 ? (
                <View style={styles.emptyCard}>
                    <Text style={styles.emptyCardText}>
                        No learning path yet. Your teacher or the AI tutor can generate one.
                    </Text>
                </View>
            ) : (
                nodes
                    .slice()
                    .sort((a, b) => (a.order || 0) - (b.order || 0))
                    .map((n, idx) => {
                        const tone = NODE_STATUS_COLORS[n.status || 'pending'] || NODE_STATUS_COLORS.pending;
                        return (
                            <View key={n.id} style={styles.nodeCard}>
                                <View style={styles.nodeIndexBadge}>
                                    <Text style={styles.nodeIndexText}>{idx + 1}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <View style={styles.nodeHeader}>
                                        <Text style={styles.nodeTitle} numberOfLines={2}>{n.title}</Text>
                                        <View style={[styles.statusPill, { backgroundColor: tone.bg }]}>
                                            <Text style={[styles.statusText, { color: tone.color }]}>
                                                {statusLabel(n.status)}
                                            </Text>
                                        </View>
                                    </View>
                                    {n.subject_name ? (
                                        <Text style={styles.nodeSubject}>{n.subject_name}</Text>
                                    ) : null}
                                    {n.description ? (
                                        <Text style={styles.nodeDesc} numberOfLines={2}>{n.description}</Text>
                                    ) : null}
                                </View>
                            </View>
                        );
                    })
            )}
        </ScrollView>
    );
}

function SectionHeader({ title, caption }: { title: string; caption?: string }) {
    return (
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {caption ? <Text style={styles.sectionCaption}>{caption}</Text> : null}
        </View>
    );
}

function StatCard({ label, value, tint, bg }: { label: string; value: string; tint: string; bg: string }) {
    return (
        <View style={[styles.statCard, { backgroundColor: bg }]}>
            <Text style={styles.statLabel}>{label}</Text>
            <Text style={[styles.statValue, { color: tint }]}>{value}</Text>
        </View>
    );
}

function LeaderRow({ entry }: { entry: LeaderboardEntry }) {
    return (
        <View style={[styles.leaderRow, entry.is_me && styles.leaderRowMe]}>
            <Text style={[styles.leaderRank, entry.is_me && styles.leaderMeText]}>#{entry.rank}</Text>
            <View style={{ flex: 1 }}>
                <Text style={[styles.leaderName, entry.is_me && styles.leaderMeText]} numberOfLines={1}>
                    {entry.is_me ? 'You' : entry.student_name}
                </Text>
                <Text style={[styles.leaderMeta, entry.is_me && styles.leaderMeText]}>
                    Lv {entry.current_level} · {entry.total_xp} XP · {entry.badges_count} badges
                </Text>
            </View>
            <Text style={[styles.leaderStreak, entry.is_me && styles.leaderMeText]}>
                🔥 {entry.current_streak}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: Colors.gray50 },
    content: { padding: 16, paddingBottom: 32 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: Colors.gray50 },
    loadingText: { color: Colors.gray600, marginTop: 8 },
    errorText: { color: Colors.error, fontSize: 13, marginBottom: 10 },
    heroCard: {
        backgroundColor: Colors.primary,
        borderRadius: 18,
        padding: 18,
        marginBottom: 14,
        ...Shadows.md,
    },
    heroBadge: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
    heroTitle: { color: '#fff', fontSize: 28, fontWeight: '800', marginTop: 4 },
    heroSubtitle: { color: 'rgba(255,255,255,0.9)', marginTop: 4, fontSize: 13 },
    progressTrack: {
        height: 8,
        backgroundColor: 'rgba(255,255,255,0.25)',
        borderRadius: 999,
        marginTop: 14,
        overflow: 'hidden',
    },
    progressFill: { height: '100%', backgroundColor: '#fff', borderRadius: 999 },
    progressCaption: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '600', marginTop: 6 },
    statGrid: { flexDirection: 'row', gap: 10, marginBottom: 12 },
    statCard: { flex: 1, borderRadius: 14, padding: 14 },
    statLabel: { fontSize: 11, fontWeight: '700', color: Colors.gray500, letterSpacing: 0.8 },
    statValue: { fontSize: 18, fontWeight: '800', marginTop: 4 },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginTop: 8,
        marginBottom: 10,
    },
    sectionTitle: { color: Colors.gray900, fontSize: 16, fontWeight: '800' },
    sectionCaption: { color: Colors.gray500, fontSize: 12, fontWeight: '600' },
    emptyCard: {
        backgroundColor: '#fff',
        borderRadius: 14,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: Colors.gray200,
        paddingVertical: 30,
        alignItems: 'center',
    },
    emptyCardText: { color: Colors.gray400, fontSize: 13, fontWeight: '600', textAlign: 'center', paddingHorizontal: 16 },
    badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 6 },
    badgeCard: {
        width: '31%',
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 10,
        alignItems: 'center',
        ...Shadows.sm,
    },
    badgeIcon: { fontSize: 28, marginBottom: 4 },
    badgeName: { color: Colors.gray900, fontSize: 11, fontWeight: '800', textAlign: 'center' },
    badgeDesc: { color: Colors.gray500, fontSize: 10, textAlign: 'center', marginTop: 2 },
    scopeRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
    scopeBtn: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: Colors.gray200,
        backgroundColor: '#fff',
        alignItems: 'center',
    },
    scopeBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    scopeText: { color: Colors.gray700, fontSize: 12, fontWeight: '700' },
    scopeTextActive: { color: '#fff' },
    leaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 12,
        marginBottom: 6,
        gap: 10,
        ...Shadows.sm,
    },
    leaderRowMe: { backgroundColor: Colors.primary },
    leaderRank: { color: Colors.gray700, fontSize: 14, fontWeight: '800', width: 38 },
    leaderName: { color: Colors.gray900, fontSize: 13, fontWeight: '700' },
    leaderMeta: { color: Colors.gray500, fontSize: 11, marginTop: 2 },
    leaderStreak: { color: Colors.warning, fontSize: 13, fontWeight: '800' },
    leaderMeText: { color: '#fff' },
    nodeCard: {
        flexDirection: 'row',
        gap: 12,
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 12,
        marginBottom: 8,
        ...Shadows.sm,
    },
    nodeIndexBadge: {
        width: 32,
        height: 32,
        borderRadius: 999,
        backgroundColor: Colors.primarySurface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    nodeIndexText: { color: Colors.primary, fontWeight: '800' },
    nodeHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    nodeTitle: { color: Colors.gray900, fontSize: 14, fontWeight: '800', flex: 1, marginRight: 8 },
    nodeSubject: { color: Colors.gray500, fontSize: 11, fontWeight: '700', marginTop: 2 },
    nodeDesc: { color: Colors.gray600, fontSize: 12, marginTop: 4, lineHeight: 17 },
    statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
    statusText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
});
