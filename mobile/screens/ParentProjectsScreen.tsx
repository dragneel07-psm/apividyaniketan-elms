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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function ParentProjectsScreen({ navigation }: any) {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string>('');

    const load = useCallback(async () => {
        try {
            setError('');
            const data = await projectsAPI.list('all');
            setProjects(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load projects');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
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
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <FlatList
                data={projects}
                keyExtractor={(p) => p.project_id}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => {
                            setRefreshing(true);
                            load();
                        }}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Text style={styles.emptyTitle}>No active projects</Text>
                        <Text style={styles.emptyDesc}>Your children have no projects right now.</Text>
                    </View>
                }
                contentContainerStyle={projects.length === 0 ? styles.emptyContent : styles.listContent}
                renderItem={({ item }) => {
                    const tone = STATUS_COLOR[item.status];
                    const clamped = Math.max(0, Math.min(100, Math.round(item.progress_percent)));
                    return (
                        <TouchableOpacity
                            style={styles.card}
                            onPress={() => navigation.navigate('ProjectDetail', { id: item.project_id })}
                        >
                            <View style={styles.cardHeader}>
                                <Text style={styles.cardTitle}>{item.title}</Text>
                                <View style={[styles.badge, { backgroundColor: tone.bg }]}>
                                    <Text style={[styles.badgeText, { color: tone.fg }]}>
                                        {tone.label}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.progressTrack}>
                                <View
                                    style={[
                                        styles.progressFill,
                                        {
                                            width: `${clamped}%`,
                                            backgroundColor: progressColor(item.progress_percent),
                                        },
                                    ]}
                                />
                            </View>
                            <View style={styles.cardFooter}>
                                <Text style={styles.muted}>{item.progress_label}</Text>
                                {item.final_grade != null ? (
                                    <Text style={styles.grade}>Grade: {item.final_grade}</Text>
                                ) : item.due_date ? (
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
    listContent: { padding: 12, gap: 12 },
    emptyContent: { flexGrow: 1, justifyContent: 'center' },
    empty: { padding: 32, alignItems: 'center' },
    emptyTitle: { fontWeight: '700' as const, fontSize: 16, color: Colors.gray500 },
    emptyDesc: { color: Colors.gray400, marginTop: 4, textAlign: 'center' },
    card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, gap: 8, ...Shadows.sm },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardTitle: { fontSize: 16, fontWeight: '700' as const, color: Colors.gray800, flex: 1, marginRight: 8 },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
    badgeText: { fontSize: 11, fontWeight: '600' as const, textTransform: 'uppercase' as const },
    muted: { color: Colors.gray500, fontSize: 12 },
    grade: { color: Colors.gray700, fontWeight: '600' as const, fontSize: 12 },
    progressTrack: { height: 6, borderRadius: 999, backgroundColor: Colors.gray200, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 999 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
    error: { color: Colors.error, padding: 12, textAlign: 'center' },
});
