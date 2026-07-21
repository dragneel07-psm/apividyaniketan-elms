// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { Colors, Shadows } from '../constants/theme';
import { Project, ProjectStatus, projectsAPI } from '../lib/projects';

const STATUS_COLOR: Record<ProjectStatus, { bg: string; fg: string; label: string }> = {
    draft: { bg: Colors.gray100, fg: Colors.gray500, label: 'Draft' },
    active: { bg: '#dbeafe', fg: '#1d4ed8', label: 'Active' },
    submitted: { bg: '#fef3c7', fg: '#b45309', label: 'Submitted' },
    graded: { bg: '#dcfce7', fg: '#15803d', label: 'Graded' },
    archived: { bg: Colors.gray100, fg: Colors.gray400, label: 'Archived' },
};

function progressColor(value: number): string {
    if (value >= 70) return '#10b981';
    if (value >= 40) return '#f59e0b';
    return '#f43f5e';
}

function ProgressBar({ value }: { value: number }) {
    const clamped = Math.max(0, Math.min(100, Math.round(value || 0)));
    return (
        <View style={styles.progressTrack}>
            <View
                style={[
                    styles.progressFill,
                    { width: `${clamped}%`, backgroundColor: progressColor(clamped) },
                ]}
            />
        </View>
    );
}

interface ProjectsListProps {
    role?: 'student' | 'teacher';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function ProjectsListScreen({ navigation, role = 'student' }: ProjectsListProps & any) {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<'mine' | 'all'>(role === 'teacher' ? 'mine' : 'all');
    const [error, setError] = useState<string>('');

    const load = useCallback(async () => {
        try {
            setError('');
            const data = await projectsAPI.list(filter);
            setProjects(data);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load projects';
            setError(message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [filter]);

    useEffect(() => {
        load();
    }, [load]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        load();
    }, [load]);

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator color={Colors.primary} size="large" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {role === 'teacher' && (
                <View style={styles.tabRow}>
                    {(['mine', 'all'] as const).map((tab) => (
                        <TouchableOpacity
                            key={tab}
                            style={[styles.tab, filter === tab && styles.tabActive]}
                            onPress={() => setFilter(tab)}
                        >
                            <Text style={[styles.tabText, filter === tab && styles.tabTextActive]}>
                                {tab === 'mine' ? 'I mentor' : 'All'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <FlatList
                data={projects}
                keyExtractor={(p) => p.project_id}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
                }
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Text style={styles.emptyTitle}>No projects yet</Text>
                        <Text style={styles.emptyDesc}>
                            {role === 'teacher'
                                ? 'Create projects from the web dashboard.'
                                : 'You have no assigned projects right now.'}
                        </Text>
                    </View>
                }
                contentContainerStyle={projects.length === 0 ? styles.emptyContent : styles.listContent}
                renderItem={({ item }) => {
                    const tone = STATUS_COLOR[item.status];
                    return (
                        <TouchableOpacity
                            style={styles.card}
                            onPress={() => navigation.navigate('ProjectDetail', { id: item.project_id })}
                        >
                            <View style={styles.cardHeader}>
                                <Text style={styles.cardTitle}>{item.title}</Text>
                                <View style={[styles.badge, { backgroundColor: tone.bg }]}>
                                    <Text style={[styles.badgeText, { color: tone.fg }]}>{tone.label}</Text>
                                </View>
                            </View>
                            {item.mentor_detail && (
                                <Text style={styles.muted}>Mentor: {item.mentor_detail.full_name}</Text>
                            )}
                            <ProgressBar value={item.progress_percent} />
                            <View style={styles.cardFooter}>
                                <Text style={styles.muted}>{item.progress_label}</Text>
                                {item.due_date ? (
                                    <Text style={styles.muted}>
                                        Due {new Date(item.due_date).toLocaleDateString()}
                                    </Text>
                                ) : null}
                            </View>
                        </TouchableOpacity>
                    );
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.gray50 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    tabRow: {
        flexDirection: 'row',
        gap: 8,
        padding: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray200,
    },
    tab: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: Colors.gray100,
    },
    tabActive: { backgroundColor: Colors.primarySurface },
    tabText: { color: Colors.gray500, fontWeight: '600' as const, fontSize: 13 },
    tabTextActive: { color: Colors.primary },
    listContent: { padding: 12, gap: 12 },
    emptyContent: { flexGrow: 1, justifyContent: 'center' },
    empty: { padding: 32, alignItems: 'center' },
    emptyTitle: { fontWeight: '700' as const, fontSize: 16, color: Colors.gray500 },
    emptyDesc: { color: Colors.gray400, marginTop: 4, textAlign: 'center' },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        gap: 8,
        ...Shadows.sm,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardTitle: { fontSize: 16, fontWeight: '700' as const, color: Colors.gray800, flex: 1, marginRight: 8 },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
    badgeText: { fontSize: 11, fontWeight: '600' as const, textTransform: 'uppercase' as const },
    muted: { color: Colors.gray500, fontSize: 12 },
    progressTrack: {
        height: 6,
        borderRadius: 999,
        backgroundColor: Colors.gray200,
        overflow: 'hidden',
    },
    progressFill: { height: '100%', borderRadius: 999 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
    error: { color: Colors.error, padding: 12, textAlign: 'center' },
});
