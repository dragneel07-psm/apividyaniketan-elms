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
import { academicAPI, Assessment } from '../lib/api';
import { Colors, Shadows } from '../constants/theme';

type FilterTab = 'all' | 'pending' | 'submitted' | 'overdue';

const FILTERS: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'overdue', label: 'Overdue' },
    { key: 'submitted', label: 'Submitted' },
];

function getDaysLeft(dueDate?: string): number | null {
    if (!dueDate) return null;
    const diff = new Date(dueDate).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function statusInfo(assignment: Assessment): { label: string; bg: string; text: string } {
    const days = getDaysLeft(assignment.due_date);
    if (days === null) return { label: 'No Due Date', bg: Colors.gray100, text: Colors.gray500 };
    if (days < 0) return { label: 'Overdue', bg: Colors.errorLight, text: Colors.error };
    if (days === 0) return { label: 'Due Today', bg: Colors.warningLight, text: Colors.warning };
    if (days <= 3) return { label: `Due in ${days}d`, bg: Colors.warningLight, text: Colors.warning };
    return { label: `Due in ${days}d`, bg: Colors.successLight, text: Colors.success };
}

function filterAssignment(a: Assessment, tab: FilterTab): boolean {
    if (a.type !== 'assignment') return false;
    if (tab === 'all') return true;
    const days = getDaysLeft(a.due_date);
    if (tab === 'overdue') return days !== null && days < 0;
    if (tab === 'pending') return days === null || days >= 0;
    if (tab === 'submitted') return false; // API doesn't return submission status yet; reserved
    return true;
}

export default function AssignmentsScreen({ navigation }: any) {
    const [assignments, setAssignments] = useState<Assessment[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<FilterTab>('all');

    const loadAssignments = useCallback(async () => {
        try {
            const data = await academicAPI.getAssessments();
            setAssignments(data.filter(a => a.type === 'assignment'));
        } catch (err) {
            console.warn('Failed to load assignments', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { loadAssignments(); }, [loadAssignments]);

    const filtered = assignments.filter(a => filterAssignment(a, filter));

    const counts: Record<FilterTab, number> = {
        all: assignments.length,
        pending: assignments.filter(a => filterAssignment(a, 'pending')).length,
        overdue: assignments.filter(a => filterAssignment(a, 'overdue')).length,
        submitted: 0,
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator color={Colors.primary} size="large" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Filter tabs */}
            <View style={styles.filterRow}>
                {FILTERS.map(f => (
                    <TouchableOpacity
                        key={f.key}
                        onPress={() => setFilter(f.key)}
                        style={[styles.filterTab, filter === f.key && styles.filterTabActive]}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.filterLabel, filter === f.key && styles.filterLabelActive]}>
                            {f.label}
                        </Text>
                        {counts[f.key] > 0 && (
                            <View style={[styles.badge, filter === f.key && styles.badgeActive]}>
                                <Text style={[styles.badgeText, filter === f.key && styles.badgeTextActive]}>
                                    {counts[f.key]}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                ))}
            </View>

            <FlatList
                data={filtered}
                keyExtractor={item => String(item.id || item.assessment_id)}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => { setRefreshing(true); loadAssignments(); }}
                        colors={[Colors.primary]}
                    />
                }
                ListHeaderComponent={
                    <View style={styles.listHeader}>
                        <Text style={styles.listHeaderTitle}>Assignments</Text>
                        <Text style={styles.listHeaderSub}>
                            {filtered.length} {filter === 'all' ? 'total' : filter}
                        </Text>
                    </View>
                }
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Text style={styles.emptyIcon}>📝</Text>
                        <Text style={styles.emptyTitle}>No Assignments</Text>
                        <Text style={styles.emptySub}>
                            {filter === 'all'
                                ? 'Your teachers haven\'t posted any assignments yet.'
                                : `No ${filter} assignments.`}
                        </Text>
                    </View>
                }
                renderItem={({ item }) => {
                    const status = statusInfo(item);
                    const days = getDaysLeft(item.due_date);
                    const overdue = days !== null && days < 0;
                    return (
                        <TouchableOpacity
                            style={styles.card}
                            activeOpacity={0.8}
                            disabled={overdue}
                            onPress={() => navigation.navigate('TakeAssessment', {
                                assessmentId: item.assessment_id || item.id,
                                title: item.title,
                            })}
                        >
                            <View style={styles.cardTop}>
                                <View style={styles.iconCircle}>
                                    <Text style={styles.iconText}>📄</Text>
                                </View>
                                <View style={styles.cardInfo}>
                                    <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                                    {item.subject_name && (
                                        <Text style={styles.cardSubject}>{item.subject_name}</Text>
                                    )}
                                </View>
                                <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                                    <Text style={[styles.statusText, { color: status.text }]}>
                                        {status.label}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.cardMeta}>
                                {item.due_date && (
                                    <View style={styles.metaChip}>
                                        <Text style={styles.metaIcon}>📅</Text>
                                        <Text style={styles.metaLabel}>
                                            {new Date(item.due_date).toLocaleDateString('en-US', {
                                                month: 'short', day: 'numeric', year: 'numeric',
                                            })}
                                        </Text>
                                    </View>
                                )}
                                {item.total_marks > 0 && (
                                    <View style={styles.metaChip}>
                                        <Text style={styles.metaIcon}>⭐</Text>
                                        <Text style={styles.metaLabel}>{item.total_marks} marks</Text>
                                    </View>
                                )}
                                {item.duration_minutes > 0 && (
                                    <View style={styles.metaChip}>
                                        <Text style={styles.metaIcon}>⏱</Text>
                                        <Text style={styles.metaLabel}>{item.duration_minutes} min</Text>
                                    </View>
                                )}
                            </View>

                            {item.description ? (
                                <Text style={styles.description} numberOfLines={2}>
                                    {item.description}
                                </Text>
                            ) : null}

                            {/* Urgency bar */}
                            {days !== null && days >= 0 && days <= 7 && (
                                <View style={styles.urgencyBar}>
                                    <View
                                        style={[
                                            styles.urgencyFill,
                                            {
                                                width: `${Math.max(10, 100 - (days / 7) * 100)}%` as any,
                                                backgroundColor: days <= 1 ? Colors.error : days <= 3 ? Colors.warning : Colors.success,
                                            },
                                        ]}
                                    />
                                </View>
                            )}

                            {!overdue && (
                                <Text style={styles.startHint}>Tap to start →</Text>
                            )}
                        </TouchableOpacity>
                    );
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.gray50 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    filterRow: {
        flexDirection: 'row',
        backgroundColor: Colors.white,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray200,
        paddingHorizontal: 12,
        paddingTop: 8,
        paddingBottom: 0,
    },
    filterTab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginRight: 4,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
        gap: 6,
    },
    filterTabActive: {
        borderBottomColor: Colors.primary,
    },
    filterLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.gray500,
    },
    filterLabelActive: {
        color: Colors.primary,
    },
    badge: {
        backgroundColor: Colors.gray200,
        borderRadius: 999,
        minWidth: 18,
        height: 18,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    badgeActive: {
        backgroundColor: Colors.primary,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: Colors.gray600,
    },
    badgeTextActive: {
        color: Colors.white,
    },

    list: { padding: 16, paddingBottom: 40 },
    listHeader: { marginBottom: 16 },
    listHeaderTitle: { fontSize: 22, fontWeight: '800', color: Colors.gray900 },
    listHeaderSub: { fontSize: 13, color: Colors.gray500, marginTop: 2 },

    empty: { alignItems: 'center', paddingVertical: 60 },
    emptyIcon: { fontSize: 48, marginBottom: 16 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.gray700, marginBottom: 8 },
    emptySub: { fontSize: 14, color: Colors.gray400, textAlign: 'center', paddingHorizontal: 40 },

    card: {
        backgroundColor: Colors.white,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        ...Shadows.md,
    },
    cardTop: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        marginBottom: 12,
    },
    iconCircle: {
        width: 42,
        height: 42,
        borderRadius: 12,
        backgroundColor: Colors.primarySurface,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    iconText: { fontSize: 20 },
    cardInfo: { flex: 1 },
    cardTitle: { fontSize: 14, fontWeight: '700', color: Colors.gray900, lineHeight: 20 },
    cardSubject: { fontSize: 12, color: Colors.primary, fontWeight: '600', marginTop: 2 },
    statusBadge: {
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 3,
        flexShrink: 0,
    },
    statusText: { fontSize: 10, fontWeight: '700' },

    cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
    metaChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: Colors.gray100,
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    metaIcon: { fontSize: 11 },
    metaLabel: { fontSize: 11, color: Colors.gray600, fontWeight: '600' },

    description: {
        fontSize: 13,
        color: Colors.gray500,
        lineHeight: 18,
        marginBottom: 8,
    },

    urgencyBar: {
        height: 4,
        backgroundColor: Colors.gray100,
        borderRadius: 2,
        overflow: 'hidden',
        marginTop: 4,
    },
    urgencyFill: {
        height: '100%',
        borderRadius: 2,
    },
    startHint: {
        marginTop: 8,
        fontSize: 11,
        fontWeight: '700',
        color: Colors.primary,
        textAlign: 'right',
    },
});
