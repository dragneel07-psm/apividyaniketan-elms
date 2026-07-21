// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { academicAPI, Subject } from '../lib/api';
import { Colors, Shadows } from '../constants/theme';

interface CoursesScreenProps {
    navigation: any;
    route: any;
}

export default function CoursesScreen({ navigation, route }: CoursesScreenProps) {
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadSubjects = useCallback(async () => {
        try {
            const student = await academicAPI.getMyStudent();
            const data = await academicAPI.getSubjects(student.id, student.academic_class);
            setSubjects(data);
        } catch (err) {
            console.warn('Failed to load subjects', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { loadSubjects(); }, [loadSubjects]);

    const subjectColor = (index: number) => Colors.subjects[index % Colors.subjects.length];

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator color={Colors.primary} size="large" />
            </View>
        );
    }

    return (
        <FlatList
            style={styles.container}
            data={subjects}
            keyExtractor={item => String(item.id)}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.content}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadSubjects(); }} />
            }
            ListHeaderComponent={
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>My Subjects</Text>
                    <Text style={styles.headerSub}>{subjects.length} subjects enrolled</Text>
                </View>
            }
            ListEmptyComponent={
                <View style={styles.empty}>
                    <Text style={styles.emptyIcon}>📚</Text>
                    <Text style={styles.emptyTitle}>No Subjects Yet</Text>
                    <Text style={styles.emptySub}>Your teacher will add subjects soon.</Text>
                </View>
            }
            renderItem={({ item, index }) => {
                const color = subjectColor(index);
                const progress = item.progress_percentage || 0;
                return (
                    <TouchableOpacity
                        style={[styles.card, { borderTopColor: color }]}
                        onPress={() => navigation.navigate('Lessons', { subject: item })}
                        activeOpacity={0.85}
                    >
                        <View style={[styles.iconBg, { backgroundColor: color + '20' }]}>
                            <Text style={styles.icon}>📖</Text>
                        </View>
                        <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
                        {item.code && <Text style={styles.code}>{item.code}</Text>}
                        <Text style={styles.teacher} numberOfLines={1}>
                            {item.teacher_name || 'Assigned teacher'}
                        </Text>
                        <View style={styles.progressBg}>
                            <View style={[styles.progressFill, { width: `${progress}%` as any, backgroundColor: color }]} />
                        </View>
                        <View style={styles.cardFooter}>
                            <Text style={styles.lessons}>{item.total_lessons || 0} lessons</Text>
                            <Text style={[styles.percent, { color }]}>{progress}%</Text>
                        </View>
                    </TouchableOpacity>
                );
            }}
        />
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.gray50 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    content: { padding: 16 },
    row: { gap: 12, marginBottom: 12 },
    header: { marginBottom: 20 },
    headerTitle: { fontSize: 26, fontWeight: '800', color: Colors.gray900 },
    headerSub: { fontSize: 14, color: Colors.gray500, marginTop: 2 },
    card: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 16,
        borderTopWidth: 4,
        ...Shadows.md,
    },
    iconBg: {
        width: 44, height: 44, borderRadius: 14,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 12,
    },
    icon: { fontSize: 22 },
    name: { fontSize: 14, fontWeight: '700', color: Colors.gray900, marginBottom: 4, lineHeight: 20 },
    code: { fontSize: 11, color: Colors.primary, fontWeight: '700', marginBottom: 4, letterSpacing: 0.5 },
    teacher: { fontSize: 11, color: Colors.gray400, marginBottom: 12 },
    progressBg: {
        height: 5, backgroundColor: Colors.gray100,
        borderRadius: 3, overflow: 'hidden', marginBottom: 8,
    },
    progressFill: { height: '100%', borderRadius: 3 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    lessons: { fontSize: 11, color: Colors.gray400 },
    percent: { fontSize: 13, fontWeight: '800' },
    empty: { alignItems: 'center', paddingVertical: 60 },
    emptyIcon: { fontSize: 48, marginBottom: 16 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.gray700, marginBottom: 8 },
    emptySub: { fontSize: 14, color: Colors.gray400, textAlign: 'center' },
});
