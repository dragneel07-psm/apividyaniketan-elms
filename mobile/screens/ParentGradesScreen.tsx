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
    academicAPI,
    ChildResult,
    ParentMeResponse,
    StudentListItem,
} from '../lib/api';
import { Colors, Shadows } from '../constants/theme';

function gradeColor(pct: number): string {
    if (pct >= 80) return Colors.success;
    if (pct >= 60) return Colors.info;
    if (pct >= 40) return Colors.warning;
    return Colors.error;
}

function gradeBadge(pct: number): { label: string; color: string; bg: string } {
    if (pct >= 80) return { label: 'Excellent', color: Colors.success, bg: Colors.successLight };
    if (pct >= 60) return { label: 'Good', color: Colors.info, bg: Colors.infoLight };
    if (pct >= 40) return { label: 'Average', color: Colors.warning, bg: Colors.warningLight };
    return { label: 'Needs Help', color: Colors.error, bg: Colors.errorLight };
}

function formatChildName(student: StudentListItem): string {
    const full = `${student.first_name || ''} ${student.last_name || ''}`.trim();
    return full || student.email || 'Student';
}

function formatDate(value?: string): string {
    if (!value) return '';
    try {
        return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
        return value;
    }
}

export default function ParentGradesScreen() {
    const [parent, setParent] = useState<ParentMeResponse | null>(null);
    const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
    const [results, setResults] = useState<ChildResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [resultsLoading, setResultsLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');

    const loadParent = useCallback(async () => {
        try {
            setError('');
            const p = await academicAPI.getParentMe();
            setParent(p);
            const first = p.students?.[0];
            if (first && !selectedChildId) {
                setSelectedChildId(first.student_id || first.id);
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to load parent profile.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    }, [selectedChildId]);

    useEffect(() => {
        loadParent();
    }, [loadParent]);

    const loadResults = useCallback(async () => {
        if (!selectedChildId) return;
        try {
            setResultsLoading(true);
            setError('');
            const data = await academicAPI.getChildResults(selectedChildId);
            setResults(data);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to load results.';
            setError(msg);
            setResults([]);
        } finally {
            setResultsLoading(false);
            setRefreshing(false);
        }
    }, [selectedChildId]);

    useEffect(() => {
        loadResults();
    }, [loadResults]);

    const onRefresh = () => {
        setRefreshing(true);
        loadResults();
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator color={Colors.primary} size="large" />
                <Text style={styles.loadingText}>Loading parent profile...</Text>
            </View>
        );
    }

    const children = parent?.students || [];
    if (children.length === 0) {
        return (
            <View style={styles.centered}>
                <Text style={styles.emptyText}>No children linked to your account.</Text>
            </View>
        );
    }

    const bySubject: Record<string, ChildResult[]> = {};
    results.forEach((r) => {
        const subject = r.subject || r.subject_name || 'General';
        if (!bySubject[subject]) bySubject[subject] = [];
        bySubject[subject].push(r);
    });

    const overallAvg = results.length
        ? Math.round(results.reduce((s, r) => s + (r.percentage ?? 0), 0) / results.length)
        : 0;

    const subjectAverages = Object.entries(bySubject)
        .map(([subject, items]) => ({
            subject,
            avg: Math.round(items.reduce((s, r) => s + (r.percentage ?? 0), 0) / items.length),
            count: items.length,
        }))
        .sort((a, b) => b.avg - a.avg);

    return (
        <ScrollView
            style={styles.screen}
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            <View style={styles.heroCard}>
                <Text style={styles.heroBadge}>PARENT PORTAL</Text>
                <Text style={styles.heroTitle}>Grades & Results</Text>
                <Text style={styles.heroSubtitle}>Assessment scores and subject performance.</Text>
            </View>

            {children.length > 1 && (
                <View style={styles.childRow}>
                    {children.map((child) => {
                        const cid = child.student_id || child.id;
                        const isActive = cid === selectedChildId;
                        return (
                            <TouchableOpacity
                                key={cid}
                                onPress={() => setSelectedChildId(cid)}
                                style={[styles.childChip, isActive && styles.childChipActive]}
                            >
                                <Text style={[styles.childChipText, isActive && styles.childChipTextActive]}>
                                    {formatChildName(child)}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {resultsLoading ? (
                <View style={styles.centeredInline}>
                    <ActivityIndicator color={Colors.primary} />
                </View>
            ) : results.length === 0 ? (
                <View style={styles.emptyCard}>
                    <Text style={styles.emptyCardText}>No results available yet.</Text>
                </View>
            ) : (
                <>
                    <View style={styles.statGrid}>
                        <View style={styles.statCard}>
                            <Text style={styles.statLabel}>Overall Average</Text>
                            <Text style={[styles.statValueLarge, { color: gradeColor(overallAvg) }]}>
                                {overallAvg}%
                            </Text>
                            <View style={[styles.statPill, { backgroundColor: gradeBadge(overallAvg).bg }]}>
                                <Text style={[styles.statPillText, { color: gradeBadge(overallAvg).color }]}>
                                    {gradeBadge(overallAvg).label}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statLabel}>Total Assessments</Text>
                            <Text style={[styles.statValueLarge, { color: Colors.gray800 }]}>
                                {results.length}
                            </Text>
                            <Text style={styles.statSubtext}>
                                across {Object.keys(bySubject).length} subject{Object.keys(bySubject).length !== 1 ? 's' : ''}
                            </Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statLabel}>Best Subject</Text>
                            {subjectAverages[0] ? (
                                <>
                                    <Text
                                        numberOfLines={1}
                                        style={[styles.statValueSmall, { color: Colors.gray800 }]}
                                    >
                                        {subjectAverages[0].subject}
                                    </Text>
                                    <Text style={[styles.statValueLarge, { color: gradeColor(subjectAverages[0].avg) }]}>
                                        {subjectAverages[0].avg}%
                                    </Text>
                                </>
                            ) : (
                                <Text style={styles.statSubtext}>—</Text>
                            )}
                        </View>
                    </View>

                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>Subject Performance</Text>
                        <Text style={styles.sectionSubtitle}>Average score per subject</Text>

                        {subjectAverages.map(({ subject, avg, count }) => (
                            <View key={subject} style={styles.subjectRow}>
                                <View style={styles.subjectHeaderRow}>
                                    <Text style={styles.subjectName}>{subject}</Text>
                                    <Text style={[styles.subjectAvg, { color: gradeColor(avg) }]}>{avg}%</Text>
                                </View>
                                <Text style={styles.subjectMeta}>
                                    {count} assessment{count !== 1 ? 's' : ''}
                                </Text>
                                <View style={styles.progressTrack}>
                                    <View style={[
                                        styles.progressFill,
                                        { width: `${Math.min(avg, 100)}%`, backgroundColor: gradeColor(avg) },
                                    ]} />
                                </View>
                            </View>
                        ))}
                    </View>

                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>All Results</Text>

                        {[...results].reverse().map((r, idx) => {
                            const pct = r.percentage ?? 0;
                            const badge = gradeBadge(pct);
                            const date = formatDate(r.date || r.submitted_at);
                            return (
                                <View key={idx} style={styles.resultRow}>
                                    <View style={styles.resultMain}>
                                        <Text style={styles.resultTitle} numberOfLines={1}>
                                            {r.assessment_title || 'Assessment'}
                                        </Text>
                                        <Text style={styles.resultMeta} numberOfLines={1}>
                                            {(r.subject || r.subject_name || 'General')}
                                            {date ? ` · ${date}` : ''}
                                        </Text>
                                    </View>
                                    <View style={styles.resultRight}>
                                        <Text style={[styles.resultScore, { color: gradeColor(pct) }]}>
                                            {r.score ?? '—'}/{r.total_marks ?? '—'}
                                        </Text>
                                        <View style={[styles.resultBadge, { backgroundColor: badge.bg }]}>
                                            <Text style={[styles.resultBadgeText, { color: badge.color }]}>
                                                {pct}% · {badge.label}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                </>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: Colors.gray50 },
    content: { padding: 16, paddingBottom: 32 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: Colors.gray50 },
    centeredInline: { paddingVertical: 32, alignItems: 'center' },
    loadingText: { color: Colors.gray600, marginTop: 8 },
    emptyText: { color: Colors.gray500, fontSize: 14, textAlign: 'center' },
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
    childRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    childChip: {
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
        borderWidth: 1, borderColor: Colors.gray200, backgroundColor: '#fff',
    },
    childChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    childChipText: { color: Colors.gray700, fontSize: 12, fontWeight: '700' },
    childChipTextActive: { color: '#fff' },
    statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
    statCard: {
        flexGrow: 1,
        minWidth: '47%',
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 14,
        ...Shadows.sm,
    },
    statLabel: { fontSize: 11, fontWeight: '700', color: Colors.gray500, letterSpacing: 0.8 },
    statValueLarge: { fontSize: 28, fontWeight: '800', marginTop: 4 },
    statValueSmall: { fontSize: 14, fontWeight: '800', marginTop: 4 },
    statSubtext: { fontSize: 11, color: Colors.gray400, fontWeight: '600', marginTop: 4 },
    statPill: {
        alignSelf: 'flex-start',
        marginTop: 6,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
    },
    statPillText: { fontSize: 11, fontWeight: '700' },
    sectionCard: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 14,
        marginBottom: 12,
        ...Shadows.sm,
    },
    sectionTitle: { fontWeight: '800', color: Colors.gray900, fontSize: 15, marginBottom: 2 },
    sectionSubtitle: { fontSize: 12, color: Colors.gray500, marginBottom: 10 },
    subjectRow: { marginBottom: 12 },
    subjectHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    subjectName: { fontSize: 13, fontWeight: '800', color: Colors.gray800 },
    subjectAvg: { fontSize: 13, fontWeight: '800' },
    subjectMeta: { fontSize: 11, color: Colors.gray400, marginTop: 2 },
    progressTrack: {
        height: 8,
        backgroundColor: Colors.gray100,
        borderRadius: 999,
        overflow: 'hidden',
        marginTop: 6,
    },
    progressFill: { height: 8, borderRadius: 999 },
    resultRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: Colors.gray50,
        borderWidth: 1,
        borderColor: Colors.gray100,
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
    },
    resultMain: { flex: 1, marginRight: 10 },
    resultTitle: { fontSize: 13, fontWeight: '800', color: Colors.gray800 },
    resultMeta: { fontSize: 11, color: Colors.gray400, marginTop: 2 },
    resultRight: { alignItems: 'flex-end' },
    resultScore: { fontSize: 13, fontWeight: '800' },
    resultBadge: {
        marginTop: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
    },
    resultBadgeText: { fontSize: 10, fontWeight: '700' },
});
