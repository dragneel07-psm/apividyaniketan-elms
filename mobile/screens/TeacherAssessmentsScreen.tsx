// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { academicAPI, Assessment } from '../lib/api';
import { Colors, Shadows } from '../constants/theme';

type TypeFilter = 'all' | 'quiz' | 'exam' | 'assignment';

const TYPE_FILTERS: Array<{ value: TypeFilter; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'quiz', label: 'Quizzes' },
    { value: 'exam', label: 'Exams' },
    { value: 'assignment', label: 'Assignments' },
];

const TYPE_COLORS: Record<string, { color: string; bg: string }> = {
    quiz: { color: Colors.info, bg: Colors.infoLight },
    exam: { color: Colors.error, bg: Colors.errorLight },
    assignment: { color: Colors.warning, bg: Colors.warningLight },
};

function formatDate(value?: string): string {
    if (!value) return 'No due date';
    try {
        return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
        return value;
    }
}

export default function TeacherAssessmentsScreen({ navigation }: any) {
    const [assessments, setAssessments] = useState<Assessment[]>([]);
    const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        try {
            setError('');
            const data = await academicAPI.getAssessments();
            setAssessments(data);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to load assessments';
            setError(msg);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        const unsubscribe = navigation?.addListener?.('focus', load);
        load();
        return unsubscribe;
    }, [navigation, load]);

    const onRefresh = () => {
        setRefreshing(true);
        load();
    };

    const confirmDelete = (assessment: Assessment) => {
        Alert.alert(
            'Delete Assessment',
            `Delete "${assessment.title}"? This cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await academicAPI.deleteAssessment(assessment.id);
                            setAssessments((prev) => prev.filter((a) => a.id !== assessment.id));
                        } catch (err: unknown) {
                            const msg = err instanceof Error ? err.message : 'Failed to delete';
                            Alert.alert('Delete Failed', msg);
                        }
                    },
                },
            ]
        );
    };

    const filtered = typeFilter === 'all'
        ? assessments
        : assessments.filter((a) => a.type === typeFilter);

    const stats = {
        quiz: assessments.filter((a) => a.type === 'quiz').length,
        exam: assessments.filter((a) => a.type === 'exam').length,
        assignment: assessments.filter((a) => a.type === 'assignment').length,
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator color={Colors.primary} size="large" />
                <Text style={styles.loadingText}>Loading assessments...</Text>
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.screen}
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            <View style={styles.heroCard}>
                <Text style={styles.heroBadge}>TEACHER</Text>
                <Text style={styles.heroTitle}>Assessments</Text>
                <Text style={styles.heroSubtitle}>Create and manage quizzes, exams, and assignments.</Text>
            </View>

            <View style={styles.statGrid}>
                <StatCard label="Quizzes" value={stats.quiz} tint={Colors.info} bg={Colors.infoLight} />
                <StatCard label="Exams" value={stats.exam} tint={Colors.error} bg={Colors.errorLight} />
                <StatCard label="Assignments" value={stats.assignment} tint={Colors.warning} bg={Colors.warningLight} />
            </View>

            <TouchableOpacity
                style={styles.createBtn}
                onPress={() => navigation.navigate('CreateAssessment')}
            >
                <Text style={styles.createBtnText}>＋  Create Assessment</Text>
            </TouchableOpacity>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.filterRow}>
                {TYPE_FILTERS.map((f) => {
                    const isActive = typeFilter === f.value;
                    return (
                        <TouchableOpacity
                            key={f.value}
                            onPress={() => setTypeFilter(f.value)}
                            style={[styles.chip, isActive && styles.chipActive]}
                        >
                            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                                {f.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {filtered.length === 0 ? (
                <View style={styles.emptyCard}>
                    <Text style={styles.emptyCardText}>
                        {typeFilter === 'all'
                            ? 'No assessments yet. Tap Create Assessment to start.'
                            : `No ${typeFilter}s found.`}
                    </Text>
                </View>
            ) : (
                filtered.map((a) => {
                    const badge = TYPE_COLORS[a.type] || TYPE_COLORS.quiz;
                    return (
                        <TouchableOpacity
                            key={a.id}
                            activeOpacity={0.85}
                            style={styles.assessmentCard}
                            onPress={() => navigation.navigate('ManageQuestions', { assessmentId: a.id })}
                        >
                            <View style={styles.assessmentHeader}>
                                <Text style={styles.assessmentTitle} numberOfLines={2}>{a.title}</Text>
                                <View style={[styles.typePill, { backgroundColor: badge.bg }]}>
                                    <Text style={[styles.typePillText, { color: badge.color }]}>
                                        {a.type.toUpperCase()}
                                    </Text>
                                </View>
                            </View>
                            {a.description ? (
                                <Text style={styles.assessmentDesc} numberOfLines={2}>{a.description}</Text>
                            ) : null}
                            <View style={styles.metaRow}>
                                <Text style={styles.metaText}>{a.total_marks} marks</Text>
                                <Text style={styles.metaDot}>·</Text>
                                <Text style={styles.metaText}>{a.duration_minutes} min</Text>
                                <Text style={styles.metaDot}>·</Text>
                                <Text style={styles.metaText}>Due {formatDate(a.due_date)}</Text>
                            </View>
                            <View style={styles.actionRow}>
                                <Text style={styles.manageHint}>Tap to manage questions →</Text>
                                <TouchableOpacity
                                    style={styles.deleteBtn}
                                    onPress={() => confirmDelete(a)}
                                >
                                    <Text style={styles.deleteBtnText}>Delete</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableOpacity>
                    );
                })
            )}
        </ScrollView>
    );
}

function StatCard({ label, value, tint, bg }: { label: string; value: number; tint: string; bg: string }) {
    return (
        <View style={[styles.statCard, { backgroundColor: bg }]}>
            <Text style={styles.statLabel}>{label}</Text>
            <Text style={[styles.statValue, { color: tint }]}>{value}</Text>
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
    heroTitle: { color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 4 },
    heroSubtitle: { color: 'rgba(255,255,255,0.9)', marginTop: 4, fontSize: 13 },
    statGrid: { flexDirection: 'row', gap: 10, marginBottom: 12 },
    statCard: { flex: 1, borderRadius: 14, padding: 14 },
    statLabel: { fontSize: 11, fontWeight: '700', color: Colors.gray500, letterSpacing: 0.8 },
    statValue: { fontSize: 22, fontWeight: '800', marginTop: 4 },
    createBtn: {
        backgroundColor: Colors.primary,
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        marginBottom: 14,
        ...Shadows.sm,
    },
    createBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
    filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
    chip: {
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
        borderWidth: 1, borderColor: Colors.gray200, backgroundColor: '#fff',
    },
    chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    chipText: { color: Colors.gray700, fontSize: 12, fontWeight: '700' },
    chipTextActive: { color: '#fff' },
    emptyCard: {
        backgroundColor: '#fff',
        borderRadius: 14,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: Colors.gray200,
        paddingVertical: 40,
        alignItems: 'center',
    },
    emptyCardText: { color: Colors.gray400, fontSize: 13, fontWeight: '600', textAlign: 'center', paddingHorizontal: 16 },
    assessmentCard: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        ...Shadows.sm,
    },
    assessmentHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 },
    assessmentTitle: { color: Colors.gray900, fontSize: 15, fontWeight: '800', flex: 1, marginRight: 8 },
    typePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
    typePillText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
    assessmentDesc: { color: Colors.gray500, fontSize: 13, marginTop: 4, lineHeight: 18 },
    metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, flexWrap: 'wrap' },
    metaText: { color: Colors.gray600, fontSize: 12, fontWeight: '600' },
    metaDot: { color: Colors.gray400, fontSize: 12, marginHorizontal: 6 },
    actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, borderTopWidth: 1, borderTopColor: Colors.gray100, paddingTop: 8 },
    manageHint: { color: Colors.primary, fontSize: 11, fontWeight: '700' },
    deleteBtn: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: Colors.errorLight,
    },
    deleteBtnText: { color: Colors.error, fontSize: 12, fontWeight: '800' },
});
