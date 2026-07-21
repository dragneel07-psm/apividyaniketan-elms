// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    RefreshControl,
    ActivityIndicator,
    Dimensions,
    StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { academicAPI, usersAPI, User, Subject, Assessment, Notice, Student } from '../lib/api';
import { useOffline } from '../hooks/use-offline';
import { Colors, Typography, Spacing, Radius, Shadows } from '../constants/theme';
import OfflineBanner from '../components/OfflineBanner';

const { width } = Dimensions.get('window');

interface DashboardScreenProps {
    navigation: any;
}

export default function DashboardScreen({ navigation }: DashboardScreenProps) {
    const { isOnline, connectionQuality } = useOffline();
    const [user, setUser] = useState<User | null>(null);
    const [student, setStudent] = useState<Student | null>(null);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [notices, setNotices] = useState<Notice[]>([]);
    const [upcomingExams, setUpcomingExams] = useState<Assessment[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');

    const loadData = useCallback(async () => {
        try {
            setError('');
            const [me, studentData] = await Promise.all([
                usersAPI.getMe(),
                academicAPI.getMyStudent(),
            ]);
            setUser(me);
            setStudent(studentData);

            const [subjectsData, assessmentsData, noticesData] = await Promise.all([
                academicAPI.getSubjects(studentData.id, studentData.academic_class),
                academicAPI.getAssessments().catch(() => []),
                academicAPI.getNotices().catch(() => []),
            ]);

            setSubjects(subjectsData);
            setNotices(noticesData.slice(0, 3));

            const now = new Date();
            const upcoming = assessmentsData.filter(a =>
                a.due_date && new Date(a.due_date) > now
            ).slice(0, 3);
            setUpcomingExams(upcoming);
        } catch (err: any) {
            setError(err.message || 'Failed to load dashboard');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const subjectColor = (index: number) =>
        Colors.subjects[index % Colors.subjects.length];

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Loading your dashboard...</Text>
            </View>
        );
    }

    const greeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
            <OfflineBanner />

            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={Colors.primary}
                    />
                }
            >
                {/* Hero Header */}
                <LinearGradient
                    colors={['#4f46e5', '#7c3aed']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.header}
                >
                    <View style={styles.headerContent}>
                        <View>
                            <Text style={styles.greeting}>{greeting()}! 👋</Text>
                            <Text style={styles.userName}>{user?.first_name || 'Student'}</Text>
                            {!isOnline && (
                                <View style={styles.offlinePill}>
                                    <Text style={styles.offlinePillText}>📴 Offline Mode</Text>
                                </View>
                            )}
                        </View>
                        {/* Avatar */}
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                                {(user?.first_name?.[0] || 'S').toUpperCase()}
                            </Text>
                        </View>
                    </View>

                    {/* Quick Stats */}
                    <View style={styles.statsRow}>
                        {[
                            { label: 'Streak', value: `${student?.current_streak || 0}🔥`, color: '#fbbf24' },
                            { label: 'Minutes', value: `${student?.total_minutes_learned || 0}`, color: '#34d399' },
                            { label: 'Exams', value: `${upcomingExams.length}`, color: '#60a5fa' },
                        ].map(stat => (
                            <View key={stat.label} style={styles.statCard}>
                                <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                                <Text style={styles.statLabel}>{stat.label}</Text>
                            </View>
                        ))}
                    </View>
                </LinearGradient>

                <View style={styles.body}>
                    {/* Error */}
                    {error ? (
                        <View style={styles.errorBox}>
                            <Text style={styles.errorText}>⚠️ {error}</Text>
                            <TouchableOpacity onPress={loadData}>
                                <Text style={styles.retryText}>Retry</Text>
                            </TouchableOpacity>
                        </View>
                    ) : null}

                    {/* My Subjects */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>My Subjects</Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Courses')}>
                                <Text style={styles.seeAll}>See all →</Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subjectsScroll}>
                            {subjects.slice(0, 5).map((subject, idx) => (
                                <TouchableOpacity
                                    key={subject.id}
                                    style={[styles.subjectCard, { borderTopColor: subjectColor(idx) }]}
                                    onPress={() => navigation.navigate('Lessons', { subject })}
                                    activeOpacity={0.85}
                                >
                                    <View style={[styles.subjectIcon, { backgroundColor: subjectColor(idx) + '20' }]}>
                                        <Text style={styles.subjectIconText}>📚</Text>
                                    </View>
                                    <Text style={styles.subjectName} numberOfLines={2}>{subject.name}</Text>
                                    <View style={styles.progressBarBg}>
                                        <View
                                            style={[
                                                styles.progressBarFill,
                                                {
                                                    width: `${subject.progress_percentage || 0}%` as any,
                                                    backgroundColor: subjectColor(idx),
                                                }
                                            ]}
                                        />
                                    </View>
                                    <Text style={[styles.progressText, { color: subjectColor(idx) }]}>
                                        {subject.progress_percentage || 0}%
                                    </Text>
                                </TouchableOpacity>
                            ))}
                            {subjects.length === 0 && (
                                <View style={styles.emptyCard}>
                                    <Text style={styles.emptyText}>No subjects assigned yet</Text>
                                </View>
                            )}
                        </ScrollView>
                    </View>

                    {/* Upcoming Exams */}
                    {upcomingExams.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>📅 Upcoming Exams</Text>
                            {upcomingExams.map(exam => (
                                <View key={exam.id} style={styles.examCard}>
                                    <View style={styles.examLeft}>
                                        <Text style={styles.examType}>{exam.type.toUpperCase()}</Text>
                                        <Text style={styles.examTitle} numberOfLines={1}>{exam.title}</Text>
                                        <Text style={styles.examDue}>
                                            Due: {exam.due_date ? new Date(exam.due_date).toLocaleDateString('en-US', {
                                                month: 'short', day: 'numeric'
                                            }) : 'TBD'}
                                        </Text>
                                    </View>
                                    <View style={styles.examRight}>
                                        <Text style={styles.examMarks}>{exam.total_marks}</Text>
                                        <Text style={styles.examMarksLabel}>marks</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Notices */}
                    {notices.length > 0 && (
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>📢 Notice Board</Text>
                                <Text style={styles.seeAll}>Recent</Text>
                            </View>
                            {notices.map((notice, idx) => (
                                <View
                                    key={idx}
                                    style={[
                                        styles.noticeCard,
                                        notice.priority === 'high' && styles.noticeCardHigh
                                    ]}
                                >
                                    <View style={styles.noticeHeader}>
                                        <Text style={styles.noticeTitle} numberOfLines={1}>{notice.title}</Text>
                                        {notice.priority === 'high' && (
                                            <View style={styles.urgentBadge}>
                                                <Text style={styles.urgentText}>URGENT</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={styles.noticeBody} numberOfLines={2}>{notice.content}</Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Offline Study CTA */}
                    <TouchableOpacity
                        style={styles.offlineCTA}
                        onPress={() => navigation.navigate('Offline')}
                        activeOpacity={0.85}
                    >
                        <LinearGradient
                            colors={['#10b981', '#059669']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.offlineCTAGradient}
                        >
                            <View>
                                <Text style={styles.offlineCTATitle}>📥 Offline Learning</Text>
                                <Text style={styles.offlineCTABody}>
                                    Download lessons to study without internet
                                </Text>
                            </View>
                            <Text style={styles.offlineCTAArrow}>→</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.gray50 },
    loadingContainer: {
        flex: 1, alignItems: 'center', justifyContent: 'center',
        backgroundColor: Colors.gray50,
    },
    loadingText: { marginTop: 16, color: Colors.gray500, fontSize: 15 },
    header: {
        paddingTop: 55,
        paddingHorizontal: 20,
        paddingBottom: 24,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24,
    },
    greeting: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
    userName: { fontSize: 26, fontWeight: '800', color: '#fff', marginTop: 2 },
    offlinePill: {
        marginTop: 8,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignSelf: 'flex-start',
        paddingHorizontal: 10, paddingVertical: 4,
        borderRadius: 100,
    },
    offlinePillText: { color: '#fff', fontSize: 11, fontWeight: '600' },
    avatar: {
        width: 52, height: 52,
        backgroundColor: 'rgba(255,255,255,0.25)',
        borderRadius: 26,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)',
    },
    avatarText: { color: '#fff', fontSize: 22, fontWeight: '800' },
    statsRow: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 18,
        padding: 16,
        gap: 0,
    },
    statCard: {
        flex: 1,
        alignItems: 'center',
        borderRightWidth: 1,
        borderRightColor: 'rgba(255,255,255,0.2)',
    },
    statValue: { fontSize: 22, fontWeight: '800' },
    statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2, fontWeight: '600' },
    body: { padding: 20 },
    errorBox: {
        backgroundColor: Colors.errorLight,
        borderRadius: 14,
        padding: 14,
        marginBottom: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    errorText: { color: Colors.error, fontSize: 13, flex: 1 },
    retryText: { color: Colors.error, fontWeight: '700', fontSize: 13 },
    section: { marginBottom: 24 },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.gray900 },
    seeAll: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
    subjectsScroll: { marginHorizontal: -4 },
    subjectCard: {
        width: 140,
        backgroundColor: '#fff',
        borderRadius: 18,
        padding: 16,
        marginHorizontal: 6,
        borderTopWidth: 4,
        ...Shadows.md,
    },
    subjectIcon: {
        width: 40, height: 40, borderRadius: 12,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 10,
    },
    subjectIconText: { fontSize: 20 },
    subjectName: {
        fontSize: 13, fontWeight: '700',
        color: Colors.gray800, marginBottom: 10, lineHeight: 18,
    },
    progressBarBg: {
        height: 5, backgroundColor: Colors.gray100,
        borderRadius: 3, overflow: 'hidden', marginBottom: 4,
    },
    progressBarFill: { height: '100%', borderRadius: 3 },
    progressText: { fontSize: 11, fontWeight: '700' },
    emptyCard: {
        width: 200,
        backgroundColor: Colors.gray100,
        borderRadius: 16,
        padding: 20,
        marginHorizontal: 6,
        alignItems: 'center', justifyContent: 'center',
    },
    emptyText: { fontSize: 13, color: Colors.gray400, textAlign: 'center' },
    examCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        ...Shadows.sm,
    },
    examLeft: { flex: 1 },
    examType: {
        fontSize: 10, fontWeight: '800',
        color: Colors.primary, letterSpacing: 1,
        marginBottom: 3,
    },
    examTitle: { fontSize: 15, fontWeight: '700', color: Colors.gray900 },
    examDue: { fontSize: 12, color: Colors.gray400, marginTop: 3 },
    examRight: { alignItems: 'center', marginLeft: 16 },
    examMarks: { fontSize: 24, fontWeight: '800', color: Colors.primary },
    examMarksLabel: { fontSize: 10, color: Colors.gray400, fontWeight: '600' },
    noticeCard: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        borderLeftWidth: 4,
        borderLeftColor: Colors.gray200,
        ...Shadows.sm,
    },
    noticeCardHigh: {
        borderLeftColor: Colors.error,
        backgroundColor: Colors.errorLight,
    },
    noticeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    noticeTitle: {
        fontSize: 14, fontWeight: '700',
        color: Colors.gray900, flex: 1,
    },
    urgentBadge: {
        backgroundColor: Colors.error,
        paddingHorizontal: 8, paddingVertical: 2,
        borderRadius: 100, marginLeft: 8,
    },
    urgentText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
    noticeBody: { fontSize: 13, color: Colors.gray600, lineHeight: 18 },
    offlineCTA: { borderRadius: 20, overflow: 'hidden', marginBottom: 24 },
    offlineCTAGradient: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
    },
    offlineCTATitle: { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 4 },
    offlineCTABody: { fontSize: 13, color: 'rgba(255,255,255,0.85)' },
    offlineCTAArrow: { fontSize: 28, color: '#fff' },
});
