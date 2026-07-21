// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';
import { academicAPI, Grade, Attendance } from '../lib/api';
import { Colors, Shadows } from '../constants/theme';

export default function GradesScreen() {
    const [grades, setGrades] = useState<Grade[]>([]);
    const [attendance, setAttendance] = useState<Attendance[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'grades' | 'attendance'>('grades');

    useEffect(() => {
        const load = async () => {
            try {
                const [g, a] = await Promise.all([
                    academicAPI.getGrades().catch(() => []),
                    academicAPI.getAttendance().catch(() => []),
                ]);
                setGrades(g);
                setAttendance(a);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const attendanceRate = () => {
        if (!attendance.length) return 0;
        const present = attendance.filter(a => a.status === 'present').length;
        return Math.round((present / attendance.length) * 100);
    };

    if (loading) {
        return <View style={styles.center}><ActivityIndicator color={Colors.primary} size="large" /></View>;
    }

    return (
        <View style={styles.container}>
            {/* Tabs */}
            <View style={styles.tabs}>
                {(['grades', 'attendance'] as const).map(t => (
                    <TouchableOpacity
                        key={t}
                        style={[styles.tab, tab === t && styles.tabActive]}
                        onPress={() => setTab(t)}
                    >
                        <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                            {t === 'grades' ? '📊 Grades' : '📅 Attendance'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {tab === 'grades' ? (
                    <>
                        {grades.length === 0 ? (
                            <View style={styles.empty}>
                                <Text style={{ fontSize: 48 }}>📊</Text>
                                <Text style={styles.emptyText}>No grades available yet.</Text>
                            </View>
                        ) : (
                            grades.map((grade, idx) => {
                                const pct = grade.total_marks ? Math.round((grade.score / grade.total_marks) * 100) : 0;
                                const color = pct >= 80 ? Colors.success : pct >= 60 ? Colors.warning : Colors.error;
                                return (
                                    <View key={idx} style={styles.gradeCard}>
                                        <View style={styles.gradeLeft}>
                                            <Text style={styles.gradeTitle} numberOfLines={1}>{grade.assessment_title || 'Assessment'}</Text>
                                            <Text style={styles.gradeDate}>
                                                {new Date(grade.submitted_at).toLocaleDateString()}
                                            </Text>
                                            {grade.ai_feedback && (
                                                <Text style={styles.gradeFeedback} numberOfLines={2}>
                                                    🤖 {grade.ai_feedback}
                                                </Text>
                                            )}
                                        </View>
                                        <View style={[styles.gradeBadge, { backgroundColor: color + '20' }]}>
                                            <Text style={[styles.gradeScore, { color }]}>{grade.score}</Text>
                                            {grade.total_marks && (
                                                <Text style={[styles.gradeTotal, { color }]}>/{grade.total_marks}</Text>
                                            )}
                                            <Text style={[styles.gradePct, { color }]}>{pct}%</Text>
                                        </View>
                                    </View>
                                );
                            })
                        )}
                    </>
                ) : (
                    <>
                        <View style={styles.attendanceSummary}>
                            <View style={[styles.attStat, { backgroundColor: Colors.successLight }]}>
                                <Text style={[styles.attStatValue, { color: Colors.success }]}>{attendanceRate()}%</Text>
                                <Text style={styles.attStatLabel}>Attendance Rate</Text>
                            </View>
                            <View style={[styles.attStat, { backgroundColor: Colors.primarySurface }]}>
                                <Text style={[styles.attStatValue, { color: Colors.primary }]}>
                                    {attendance.filter(a => a.status === 'present').length}
                                </Text>
                                <Text style={styles.attStatLabel}>Days Present</Text>
                            </View>
                            <View style={[styles.attStat, { backgroundColor: Colors.errorLight }]}>
                                <Text style={[styles.attStatValue, { color: Colors.error }]}>
                                    {attendance.filter(a => a.status === 'absent').length}
                                </Text>
                                <Text style={styles.attStatLabel}>Days Absent</Text>
                            </View>
                        </View>
                        {attendance.slice(0, 20).map((att, idx) => (
                            <View key={idx} style={styles.attCard}>
                                <Text style={styles.attDate}>{new Date(att.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
                                <Text style={styles.attSubject} numberOfLines={1}>{att.subject_name || 'Class'}</Text>
                                <View style={[
                                    styles.attBadge,
                                    att.status === 'present' ? styles.attPresent : att.status === 'late' ? styles.attLate : styles.attAbsent
                                ]}>
                                    <Text style={styles.attBadgeText}>{att.status.toUpperCase()}</Text>
                                </View>
                            </View>
                        ))}
                        {attendance.length === 0 && (
                            <View style={styles.empty}>
                                <Text style={{ fontSize: 48 }}>📅</Text>
                                <Text style={styles.emptyText}>No attendance records yet.</Text>
                            </View>
                        )}
                    </>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.gray50 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    tabs: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray200,
    },
    tab: {
        flex: 1, paddingVertical: 14,
        alignItems: 'center',
        borderBottomWidth: 3,
        borderBottomColor: 'transparent',
    },
    tabActive: { borderBottomColor: Colors.primary },
    tabText: { fontSize: 14, fontWeight: '600', color: Colors.gray400 },
    tabTextActive: { color: Colors.primary },
    content: { padding: 16 },
    gradeCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        ...Shadows.sm,
    },
    gradeLeft: { flex: 1, marginRight: 12 },
    gradeTitle: { fontSize: 14, fontWeight: '700', color: Colors.gray900 },
    gradeDate: { fontSize: 11, color: Colors.gray400, marginTop: 3 },
    gradeFeedback: { fontSize: 12, color: Colors.gray500, marginTop: 6, fontStyle: 'italic' },
    gradeBadge: { padding: 12, borderRadius: 14, alignItems: 'center', minWidth: 72 },
    gradeScore: { fontSize: 22, fontWeight: '900' },
    gradeTotal: { fontSize: 12, fontWeight: '600' },
    gradePct: { fontSize: 11, fontWeight: '700', marginTop: 2 },
    attendanceSummary: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 20,
    },
    attStat: {
        flex: 1, borderRadius: 16, padding: 14,
        alignItems: 'center',
    },
    attStatValue: { fontSize: 24, fontWeight: '900' },
    attStatLabel: { fontSize: 10, fontWeight: '600', color: Colors.gray500, marginTop: 2, textAlign: 'center' },
    attCard: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 14,
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        ...Shadows.sm,
    },
    attDate: { fontSize: 12, fontWeight: '700', color: Colors.gray700, width: 52 },
    attSubject: { flex: 1, fontSize: 13, color: Colors.gray800, marginHorizontal: 8 },
    attBadge: {
        paddingHorizontal: 10, paddingVertical: 4,
        borderRadius: 100,
    },
    attPresent: { backgroundColor: Colors.successLight },
    attLate: { backgroundColor: Colors.warningLight },
    attAbsent: { backgroundColor: Colors.errorLight },
    attBadgeText: { fontSize: 10, fontWeight: '800', color: Colors.gray700 },
    empty: { alignItems: 'center', paddingVertical: 60 },
    emptyText: { fontSize: 15, color: Colors.gray400, marginTop: 12 },
});
