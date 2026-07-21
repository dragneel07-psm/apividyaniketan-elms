// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
    ChildAttendanceResponse,
    ParentMeResponse,
    StudentListItem,
} from '../lib/api';
import { Colors, Shadows } from '../constants/theme';

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string; icon: string }> = {
    present: { label: 'Present', color: Colors.success, bg: Colors.successLight, icon: '✓' },
    absent: { label: 'Absent', color: Colors.error, bg: Colors.errorLight, icon: '✕' },
    late: { label: 'Late', color: Colors.warning, bg: Colors.warningLight, icon: '⏱' },
    excused: { label: 'Excused', color: Colors.gray500, bg: Colors.gray100, icon: '–' },
};

function formatChildName(student: StudentListItem): string {
    const full = `${student.first_name || ''} ${student.last_name || ''}`.trim();
    return full || student.email || 'Student';
}

function formatDate(date: string): string {
    try {
        return new Date(date).toLocaleDateString(undefined, {
            weekday: 'short', day: 'numeric', month: 'short',
        });
    } catch {
        return date;
    }
}

export default function ParentAttendanceScreen() {
    const now = useMemo(() => new Date(), []);
    const [parent, setParent] = useState<ParentMeResponse | null>(null);
    const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
    const [attendance, setAttendance] = useState<ChildAttendanceResponse | null>(null);
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [loading, setLoading] = useState(true);
    const [attLoading, setAttLoading] = useState(false);
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

    const loadAttendance = useCallback(async () => {
        if (!selectedChildId) return;
        try {
            setAttLoading(true);
            setError('');
            const data = await academicAPI.getChildAttendance(selectedChildId, month, year);
            setAttendance(data);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to load attendance.';
            setError(msg);
            setAttendance(null);
        } finally {
            setAttLoading(false);
            setRefreshing(false);
        }
    }, [selectedChildId, month, year]);

    useEffect(() => {
        loadAttendance();
    }, [loadAttendance]);

    const onRefresh = () => {
        setRefreshing(true);
        loadAttendance();
    };

    const goPrev = () => {
        if (month === 1) { setMonth(12); setYear((y) => y - 1); }
        else setMonth((m) => m - 1);
    };

    const goNext = () => {
        if (month === 12) { setMonth(1); setYear((y) => y + 1); }
        else setMonth((m) => m + 1);
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

    const summary = attendance?.summary;
    const records = attendance?.records || [];
    const percentage = Math.round(summary?.percentage ?? 0);

    return (
        <ScrollView
            style={styles.screen}
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            <View style={styles.heroCard}>
                <Text style={styles.heroBadge}>PARENT PORTAL</Text>
                <Text style={styles.heroTitle}>Attendance</Text>
                <Text style={styles.heroSubtitle}>Monthly attendance for your children.</Text>
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

            <View style={styles.monthNavRow}>
                <TouchableOpacity style={styles.navBtn} onPress={goPrev}>
                    <Text style={styles.navBtnText}>‹</Text>
                </TouchableOpacity>
                <Text style={styles.monthText}>{MONTH_NAMES[month - 1]} {year}</Text>
                <TouchableOpacity style={styles.navBtn} onPress={goNext}>
                    <Text style={styles.navBtnText}>›</Text>
                </TouchableOpacity>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {attLoading ? (
                <View style={styles.centeredInline}>
                    <ActivityIndicator color={Colors.primary} />
                </View>
            ) : (
                <>
                    <View style={styles.statGrid}>
                        <StatCard label="Present" value={summary?.present ?? 0} tint={Colors.success} bg={Colors.successLight} />
                        <StatCard label="Absent" value={summary?.absent ?? 0} tint={Colors.error} bg={Colors.errorLight} />
                        <StatCard label="Late" value={summary?.late ?? 0} tint={Colors.warning} bg={Colors.warningLight} />
                        <StatCard label="Attendance %" value={`${percentage}%`} tint={Colors.primary} bg={Colors.primarySurface} />
                    </View>

                    <View style={styles.progressCard}>
                        <View style={styles.progressHeader}>
                            <Text style={styles.progressTitle}>Monthly Attendance Rate</Text>
                            <Text style={[
                                styles.progressValue,
                                { color: percentage >= 75 ? Colors.success : Colors.error },
                            ]}>
                                {percentage}%
                            </Text>
                        </View>
                        <View style={styles.progressTrack}>
                            <View style={[
                                styles.progressFill,
                                {
                                    width: `${Math.min(percentage, 100)}%`,
                                    backgroundColor: percentage >= 75 ? Colors.success : Colors.error,
                                },
                            ]} />
                        </View>
                        {percentage < 75 && (
                            <Text style={styles.warningText}>
                                ⚠ Below 75% threshold — please contact the school.
                            </Text>
                        )}
                    </View>

                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>Daily Records</Text>
                        {records.length === 0 ? (
                            <Text style={styles.emptyInline}>No records for this month.</Text>
                        ) : (
                            records.map((record, idx) => {
                                const cfg = STATUS_STYLES[record.status] || STATUS_STYLES.excused;
                                return (
                                    <View key={`${record.date}-${idx}`} style={styles.recordRow}>
                                        <Text style={styles.recordDate}>{formatDate(record.date)}</Text>
                                        <View style={[styles.recordPill, { backgroundColor: cfg.bg }]}>
                                            <Text style={[styles.recordPillText, { color: cfg.color }]}>
                                                {cfg.icon} {cfg.label}
                                            </Text>
                                        </View>
                                    </View>
                                );
                            })
                        )}
                    </View>

                    <View style={styles.legendRow}>
                        {Object.entries(STATUS_STYLES).map(([key, cfg]) => (
                            <View key={key} style={styles.legendItem}>
                                <View style={[styles.legendDot, { backgroundColor: cfg.color }]} />
                                <Text style={styles.legendText}>{cfg.label}</Text>
                            </View>
                        ))}
                    </View>
                </>
            )}
        </ScrollView>
    );
}

function StatCard({ label, value, tint, bg }: { label: string; value: string | number; tint: string; bg: string }) {
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
    centeredInline: { paddingVertical: 32, alignItems: 'center' },
    loadingText: { color: Colors.gray600, marginTop: 8 },
    emptyText: { color: Colors.gray500, fontSize: 14, textAlign: 'center' },
    emptyInline: { color: Colors.gray500, fontSize: 13, paddingVertical: 12 },
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
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: Colors.gray200,
        backgroundColor: '#fff',
    },
    childChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    childChipText: { color: Colors.gray700, fontSize: 12, fontWeight: '700' },
    childChipTextActive: { color: '#fff' },
    monthNavRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: '#fff',
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 10,
        marginBottom: 14,
        ...Shadows.sm,
    },
    navBtn: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: Colors.gray100,
        alignItems: 'center', justifyContent: 'center',
    },
    navBtnText: { fontSize: 22, color: Colors.gray700, fontWeight: '800', lineHeight: 24 },
    monthText: { color: Colors.gray900, fontSize: 15, fontWeight: '800' },
    statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
    statCard: {
        flexGrow: 1,
        minWidth: '47%',
        borderRadius: 14,
        padding: 14,
    },
    statLabel: { fontSize: 11, fontWeight: '700', color: Colors.gray500, letterSpacing: 0.8 },
    statValue: { fontSize: 22, fontWeight: '800', marginTop: 4 },
    progressCard: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 14,
        marginBottom: 12,
        ...Shadows.sm,
    },
    progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    progressTitle: { color: Colors.gray800, fontWeight: '700', fontSize: 13 },
    progressValue: { fontSize: 15, fontWeight: '800' },
    progressTrack: {
        height: 10,
        backgroundColor: Colors.gray100,
        borderRadius: 999,
        overflow: 'hidden',
    },
    progressFill: { height: 10, borderRadius: 999 },
    warningText: { color: Colors.error, fontSize: 12, fontWeight: '600', marginTop: 8 },
    sectionCard: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 14,
        marginBottom: 12,
        ...Shadows.sm,
    },
    sectionTitle: { fontWeight: '800', color: Colors.gray900, fontSize: 15, marginBottom: 8 },
    recordRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray100,
    },
    recordDate: { color: Colors.gray700, fontSize: 13, fontWeight: '600' },
    recordPill: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
    },
    recordPillText: { fontSize: 12, fontWeight: '700' },
    legendRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginTop: 4,
        padding: 12,
        backgroundColor: '#fff',
        borderRadius: 12,
        ...Shadows.sm,
    },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 10, height: 10, borderRadius: 999 },
    legendText: { fontSize: 12, color: Colors.gray600, fontWeight: '600' },
});
