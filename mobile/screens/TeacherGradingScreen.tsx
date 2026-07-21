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
import { academicAPI, Assessment, Submission } from '../lib/api';
import { Colors, Shadows } from '../constants/theme';

type StatusFilter = 'all' | 'pending' | 'graded';

const FILTERS: Array<{ value: StatusFilter; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'graded', label: 'Graded' },
];

function formatDate(value?: string): string {
    if (!value) return '';
    try {
        return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
        return value;
    }
}

export default function TeacherGradingScreen({ navigation }: any) {
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [assessments, setAssessments] = useState<Assessment[]>([]);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
    const [assessmentFilter, setAssessmentFilter] = useState<string>('all');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        try {
            setError('');
            const [subs, asses] = await Promise.all([
                academicAPI.getSubmissions(),
                academicAPI.getAssessments(),
            ]);
            setSubmissions(subs);
            setAssessments(asses);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to load submissions';
            setError(msg);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const onRefresh = () => {
        setRefreshing(true);
        load();
    };

    const filtered = submissions.filter((s) => {
        const matchesStatus =
            statusFilter === 'all' ||
            (statusFilter === 'graded' && s.is_graded) ||
            (statusFilter === 'pending' && !s.is_graded);
        const matchesAssessment = assessmentFilter === 'all' || s.assessment === assessmentFilter;
        return matchesStatus && matchesAssessment;
    });

    const stats = {
        total: submissions.length,
        graded: submissions.filter((s) => s.is_graded).length,
        pending: submissions.filter((s) => !s.is_graded).length,
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator color={Colors.primary} size="large" />
                <Text style={styles.loadingText}>Loading submissions...</Text>
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
                <Text style={styles.heroTitle}>Grade Submissions</Text>
                <Text style={styles.heroSubtitle}>Review and grade student work.</Text>
            </View>

            <View style={styles.statGrid}>
                <StatCard label="Total" value={stats.total} tint={Colors.primary} bg={Colors.primarySurface} />
                <StatCard label="Pending" value={stats.pending} tint={Colors.warning} bg={Colors.warningLight} />
                <StatCard label="Graded" value={stats.graded} tint={Colors.success} bg={Colors.successLight} />
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.filterRow}>
                {FILTERS.map((f) => {
                    const isActive = statusFilter === f.value;
                    return (
                        <TouchableOpacity
                            key={f.value}
                            onPress={() => setStatusFilter(f.value)}
                            style={[styles.chip, isActive && styles.chipActive]}
                        >
                            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                                {f.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {assessments.length > 1 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.assessmentScroll}>
                    <TouchableOpacity
                        onPress={() => setAssessmentFilter('all')}
                        style={[styles.chip, assessmentFilter === 'all' && styles.chipActive]}
                    >
                        <Text style={[styles.chipText, assessmentFilter === 'all' && styles.chipTextActive]}>
                            All Assignments
                        </Text>
                    </TouchableOpacity>
                    {assessments.map((a) => {
                        const isActive = assessmentFilter === a.id;
                        return (
                            <TouchableOpacity
                                key={a.id}
                                onPress={() => setAssessmentFilter(a.id)}
                                style={[styles.chip, isActive && styles.chipActive]}
                            >
                                <Text
                                    style={[styles.chipText, isActive && styles.chipTextActive]}
                                    numberOfLines={1}
                                >
                                    {a.title}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            )}

            {filtered.length === 0 ? (
                <View style={styles.emptyCard}>
                    <Text style={styles.emptyCardText}>No submissions match these filters.</Text>
                </View>
            ) : (
                filtered.map((submission) => {
                    const assessment = assessments.find((a) => a.id === submission.assessment);
                    const studentLabel = `Student ${submission.student.slice(0, 8)}`;
                    const score = submission.result?.score;
                    const maxScore = submission.result?.max_score ?? assessment?.total_marks ?? 100;
                    return (
                        <TouchableOpacity
                            key={submission.id}
                            style={styles.submissionCard}
                            onPress={() =>
                                navigation.navigate('GradeSubmission', {
                                    submissionId: submission.id,
                                })
                            }
                        >
                            <View style={styles.submissionHeader}>
                                <Text style={styles.submissionTitle} numberOfLines={1}>
                                    {assessment?.title || 'Assessment'}
                                </Text>
                                <View style={[
                                    styles.statusPill,
                                    { backgroundColor: submission.is_graded ? Colors.successLight : Colors.warningLight },
                                ]}>
                                    <Text style={[
                                        styles.statusPillText,
                                        { color: submission.is_graded ? Colors.success : Colors.warning },
                                    ]}>
                                        {submission.is_graded ? 'Graded' : 'Pending'}
                                    </Text>
                                </View>
                            </View>
                            <Text style={styles.submissionMeta}>
                                {studentLabel} · Submitted {formatDate(submission.submitted_at)}
                            </Text>
                            {submission.is_graded && score != null ? (
                                <Text style={styles.scoreText}>
                                    Score: {score}/{maxScore}
                                </Text>
                            ) : (
                                <Text style={styles.ctaText}>Tap to grade →</Text>
                            )}
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
    statCard: {
        flex: 1,
        borderRadius: 14,
        padding: 14,
    },
    statLabel: { fontSize: 11, fontWeight: '700', color: Colors.gray500, letterSpacing: 0.8 },
    statValue: { fontSize: 22, fontWeight: '800', marginTop: 4 },
    filterRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
    assessmentScroll: { marginBottom: 12, flexGrow: 0 },
    chip: {
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
        borderWidth: 1, borderColor: Colors.gray200, backgroundColor: '#fff',
        marginRight: 8,
        maxWidth: 220,
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
    emptyCardText: { color: Colors.gray400, fontSize: 14, fontWeight: '600' },
    submissionCard: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        ...Shadows.sm,
    },
    submissionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    submissionTitle: { color: Colors.gray900, fontSize: 14, fontWeight: '800', flex: 1, marginRight: 8 },
    statusPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
    statusPillText: { fontSize: 11, fontWeight: '700' },
    submissionMeta: { color: Colors.gray500, fontSize: 12, marginTop: 6 },
    scoreText: { color: Colors.primary, fontSize: 13, fontWeight: '700', marginTop: 6 },
    ctaText: { color: Colors.primary, fontSize: 12, fontWeight: '700', marginTop: 6 },
});
