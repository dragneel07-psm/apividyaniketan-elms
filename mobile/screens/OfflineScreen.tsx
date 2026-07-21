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
    FlatList,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { getOfflineLessons, removeOfflineLesson, getOfflineStorageSize, useOffline, OfflineLesson } from '../hooks/use-offline';
import { Colors, Shadows } from '../constants/theme';

interface OfflineScreenProps {
    navigation: any;
    route?: {
        params?: {
            browseRoute?: string;
        };
    };
}

export default function OfflineScreen({ navigation, route }: OfflineScreenProps) {
    const { isOnline, connectionQuality } = useOffline();
    const [lessons, setLessons] = useState<OfflineLesson[]>([]);
    const [totalSize, setTotalSize] = useState('0 KB');
    const [selectedLesson, setSelectedLesson] = useState<OfflineLesson | null>(null);
    const [loading, setLoading] = useState(true);
    const browseRoute = route?.params?.browseRoute;

    const refresh = async () => {
        const data = await getOfflineLessons();
        const size = await getOfflineStorageSize();
        setLessons(data);
        setTotalSize(size);
        setLoading(false);
    };

    useEffect(() => { refresh(); }, []);

    const handleRemove = (lesson: OfflineLesson) => {
        Alert.alert(
            'Remove Download',
            `Remove "${lesson.title}" from offline storage?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        await removeOfflineLesson(lesson.id);
                        setSelectedLesson(null);
                        refresh();
                    },
                },
            ]
        );
    };

    const handleClearAll = () => {
        Alert.alert(
            'Clear All Downloads',
            'Remove all offline content? You will need internet to download again.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear All',
                    style: 'destructive',
                    onPress: async () => {
                        for (const lesson of lessons) {
                            await removeOfflineLesson(lesson.id);
                        }
                        setSelectedLesson(null);
                        refresh();
                    },
                },
            ]
        );
    };

    // Group by subject
    const grouped = lessons.reduce<Record<string, OfflineLesson[]>>((acc, lesson) => {
        const sub = lesson.subjectName || 'General';
        if (!acc[sub]) acc[sub] = [];
        acc[sub].push(lesson);
        return acc;
    }, {});

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator color={Colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, !isOnline && styles.headerOffline]}>
                <View>
                    <Text style={styles.headerTitle}>
                        {isOnline ? '📥 Offline Content' : '📴 Studying Offline'}
                    </Text>
                    <Text style={styles.headerSub}>
                        {lessons.length} lessons • {totalSize} stored
                    </Text>
                </View>
                <View style={[
                    styles.statusPill,
                    isOnline ? styles.statusOnline : styles.statusOffline
                ]}>
                    <Text style={styles.statusText}>
                        {isOnline ? (connectionQuality === 'slow' ? '🐢 Slow' : '🟢 Online') : '🔴 Offline'}
                    </Text>
                </View>
            </View>

            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Tips Banner */}
                <View style={styles.tipBanner}>
                    <Text style={styles.tipTitle}>💡 Rural Study Tips</Text>
                    <Text style={styles.tipItem}>• Download while on Wi-Fi or 4G</Text>
                    <Text style={styles.tipItem}>• Study downloaded content without internet</Text>
                    <Text style={styles.tipItem}>• Progress syncs when back online</Text>
                </View>

                {/* Clear All */}
                {lessons.length > 0 && (
                    <TouchableOpacity style={styles.clearBtn} onPress={handleClearAll}>
                        <Text style={styles.clearBtnText}>🗑️ Clear All Downloads</Text>
                    </TouchableOpacity>
                )}

                {/* Grouped Lessons */}
                {Object.keys(grouped).length > 0 ? (
                    Object.entries(grouped).map(([subject, subLessons]) => (
                        <View key={subject} style={styles.group}>
                            <View style={styles.groupHeader}>
                                <Text style={styles.groupTitle}>📚 {subject}</Text>
                                <View style={styles.groupBadge}>
                                    <Text style={styles.groupBadgeText}>{subLessons.length}</Text>
                                </View>
                            </View>
                            {subLessons.map(lesson => (
                                <TouchableOpacity
                                    key={lesson.id}
                                    style={[
                                        styles.lessonCard,
                                        selectedLesson?.id === lesson.id && styles.lessonCardSelected
                                    ]}
                                    onPress={() => setSelectedLesson(selectedLesson?.id === lesson.id ? null : lesson)}
                                    activeOpacity={0.8}
                                >
                                    <View style={styles.lessonInfo}>
                                        <View style={styles.lessonIcon}>
                                            <Text style={{ fontSize: 20 }}>📗</Text>
                                        </View>
                                        <View style={styles.lessonText}>
                                            <Text style={styles.lessonTitle} numberOfLines={2}>{lesson.title}</Text>
                                            <Text style={styles.lessonMeta}>
                                                {new Date(lesson.downloadedAt).toLocaleDateString('en-US', {
                                                    month: 'short', day: 'numeric', year: 'numeric'
                                                })} • {lesson.sizeKB > 1024
                                                    ? `${(lesson.sizeKB / 1024).toFixed(1)} MB`
                                                    : `${lesson.sizeKB} KB`}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.savedBadge}>
                                        <Text style={styles.savedText}>✓ Saved</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    ))
                ) : (
                    <View style={styles.empty}>
                        <Text style={styles.emptyIcon}>{isOnline ? '📥' : '📴'}</Text>
                        <Text style={styles.emptyTitle}>
                            {isOnline ? 'No Content Downloaded' : 'No Offline Content'}
                        </Text>
                        <Text style={styles.emptySub}>
                            {isOnline
                                ? 'Go to My Subjects and tap ⬇️ on any lesson to save it for offline study.'
                                : 'Connect to internet to download lessons.'}
                        </Text>
                        {isOnline && browseRoute && (
                            <TouchableOpacity
                                style={styles.browseBtn}
                                onPress={() => navigation.navigate(browseRoute)}
                            >
                                <Text style={styles.browseBtnText}>Browse Subjects →</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {/* Selected Lesson Viewer */}
                {selectedLesson && (
                    <View style={styles.viewer}>
                        <View style={styles.viewerHeader}>
                            <Text style={styles.viewerTitle}>{selectedLesson.title}</Text>
                            <TouchableOpacity onPress={() => handleRemove(selectedLesson)}>
                                <Text style={styles.removeBtn}>🗑️ Remove</Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.viewerSubject}>{selectedLesson.subjectName}</Text>
                        {selectedLesson.content ? (
                            <Text style={styles.viewerContent}>{selectedLesson.content.replace(/<[^>]*>/g, '')}</Text>
                        ) : (
                            <Text style={styles.viewerEmpty}>
                                Lesson content is saved and available offline. Open the lesson to view it.
                            </Text>
                        )}
                    </View>
                )}

                <View style={{ height: 32 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.gray50 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    scroll: { flex: 1 },
    header: {
        backgroundColor: Colors.primary,
        paddingTop: 16,
        paddingHorizontal: 20,
        paddingBottom: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerOffline: { backgroundColor: '#374151' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
    headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
    statusPill: {
        paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: 100,
    },
    statusOnline: { backgroundColor: 'rgba(255,255,255,0.2)' },
    statusOffline: { backgroundColor: 'rgba(239,68,68,0.3)' },
    statusText: { color: '#fff', fontSize: 12, fontWeight: '700' },
    tipBanner: {
        margin: 16,
        backgroundColor: Colors.primarySurface,
        borderRadius: 16,
        padding: 16,
        borderLeftWidth: 4,
        borderLeftColor: Colors.primary,
    },
    tipTitle: { fontSize: 14, fontWeight: '700', color: Colors.primary, marginBottom: 8 },
    tipItem: { fontSize: 13, color: Colors.gray600, marginBottom: 3, lineHeight: 18 },
    clearBtn: {
        marginHorizontal: 16,
        marginBottom: 16,
        backgroundColor: Colors.errorLight,
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
    },
    clearBtnText: { color: Colors.error, fontWeight: '700', fontSize: 14 },
    group: { marginHorizontal: 16, marginBottom: 20 },
    groupHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray200,
    },
    groupTitle: { fontSize: 15, fontWeight: '700', color: Colors.gray700, flex: 1 },
    groupBadge: {
        backgroundColor: Colors.gray200,
        paddingHorizontal: 8, paddingVertical: 2,
        borderRadius: 100,
    },
    groupBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.gray600 },
    lessonCard: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 14,
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1.5,
        borderColor: 'transparent',
        ...Shadows.sm,
    },
    lessonCardSelected: { borderColor: Colors.primary, backgroundColor: Colors.primarySurface },
    lessonInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
    lessonIcon: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: Colors.successLight,
        alignItems: 'center', justifyContent: 'center',
    },
    lessonText: { flex: 1 },
    lessonTitle: { fontSize: 13, fontWeight: '700', color: Colors.gray900, lineHeight: 18 },
    lessonMeta: { fontSize: 11, color: Colors.gray400, marginTop: 3 },
    savedBadge: {
        backgroundColor: Colors.successLight,
        paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: 100, marginLeft: 8,
    },
    savedText: { fontSize: 10, fontWeight: '700', color: Colors.success },
    viewer: {
        margin: 16,
        backgroundColor: '#fff',
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        borderColor: Colors.gray200,
        ...Shadows.md,
    },
    viewerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 4,
    },
    viewerTitle: { fontSize: 16, fontWeight: '800', color: Colors.gray900, flex: 1, marginRight: 8 },
    removeBtn: { fontSize: 13, color: Colors.error, fontWeight: '600' },
    viewerSubject: { fontSize: 12, color: Colors.primary, fontWeight: '600', marginBottom: 12 },
    viewerContent: { fontSize: 14, color: Colors.gray700, lineHeight: 22 },
    viewerEmpty: { fontSize: 14, color: Colors.gray400, fontStyle: 'italic' },
    empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24 },
    emptyIcon: { fontSize: 64, marginBottom: 16 },
    emptyTitle: { fontSize: 20, fontWeight: '800', color: Colors.gray700, marginBottom: 8 },
    emptySub: { fontSize: 14, color: Colors.gray400, textAlign: 'center', lineHeight: 20 },
    browseBtn: {
        marginTop: 24,
        backgroundColor: Colors.primary,
        paddingHorizontal: 24, paddingVertical: 12,
        borderRadius: 100,
    },
    browseBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
