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
    ActivityIndicator,
    Alert,
} from 'react-native';
import { academicAPI, Chapter, Lesson } from '../lib/api';
import { useOffline, saveOfflineLesson, removeOfflineLesson, isLessonDownloaded } from '../hooks/use-offline';
import { Colors, Shadows } from '../constants/theme';

interface LessonItem extends Lesson {
    isDownloaded: boolean;
    isDownloading: boolean;
}

export default function LessonsScreen({ navigation, route }: any) {
    const { subject } = route.params;
    const { isOnline } = useOffline();
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [lessonStates, setLessonStates] = useState<Record<number, { downloaded: boolean; downloading: boolean }>>({});
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        try {
            const chaptersData = await academicAPI.getChapters(subject.id);
            setChapters(chaptersData);

            // Check download state for each lesson
            const states: Record<number, { downloaded: boolean; downloading: boolean }> = {};
            for (const chapter of chaptersData) {
                for (const lesson of chapter.lessons || []) {
                    const downloaded = await isLessonDownloaded(String(lesson.id));
                    states[lesson.id] = { downloaded, downloading: false };
                }
            }
            setLessonStates(states);
        } catch (err) {
            console.warn('Failed to load chapters', err);
        } finally {
            setLoading(false);
        }
    }, [subject.id]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleDownload = async (lesson: Lesson) => {
        if (!isOnline) {
            Alert.alert('Offline', 'Connect to internet to download content.');
            return;
        }

        setLessonStates(prev => ({
            ...prev,
            [lesson.id]: { ...prev[lesson.id], downloading: true }
        }));

        try {
            await saveOfflineLesson({
                id: String(lesson.id),
                title: lesson.title,
                subjectName: subject.name,
                downloadedAt: new Date().toISOString(),
                sizeKB: lesson.duration_minutes * 50 || 200,
                content: lesson.content || '',
            });
            setLessonStates(prev => ({
                ...prev,
                [lesson.id]: { downloaded: true, downloading: false }
            }));
            Alert.alert('✅ Downloaded', `"${lesson.title}" saved for offline study!`);
        } catch {
            setLessonStates(prev => ({
                ...prev,
                [lesson.id]: { ...prev[lesson.id], downloading: false }
            }));
            Alert.alert('Error', 'Download failed. Please try again.');
        }
    };

    const handleRemove = async (lesson: Lesson) => {
        await removeOfflineLesson(String(lesson.id));
        setLessonStates(prev => ({
            ...prev,
            [lesson.id]: { downloaded: false, downloading: false }
        }));
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator color={Colors.primary} size="large" />
            </View>
        );
    }

    // Flatten chapters + lessons into a single list with section headers
    const data: Array<{ type: 'chapter'; item: Chapter } | { type: 'lesson'; item: Lesson; chapterTitle: string }> = [];
    chapters.forEach(chapter => {
        data.push({ type: 'chapter', item: chapter });
        (chapter.lessons || []).filter(l => l.is_published).forEach(lesson => {
            data.push({ type: 'lesson', item: lesson, chapterTitle: chapter.title });
        });
    });

    return (
        <View style={styles.container}>
            {/* Subject Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{subject.name}</Text>
                <Text style={styles.headerSub}>
                    {chapters.reduce((acc, c) => acc + (c.lessons?.filter(l => l.is_published).length || 0), 0)} lessons
                </Text>
            </View>

            <FlatList
                data={data}
                keyExtractor={(item, idx) => `${item.type}-${item.type === 'chapter' ? item.item.id : item.item.id}-${idx}`}
                contentContainerStyle={styles.list}
                renderItem={({ item }) => {
                    if (item.type === 'chapter') {
                        return (
                            <View style={styles.chapterHeader}>
                                <View style={styles.chapterBadge}>
                                    <Text style={styles.chapterBadgeText}>{item.item.order}</Text>
                                </View>
                                <Text style={styles.chapterTitle}>{item.item.title}</Text>
                            </View>
                        );
                    }

                    const lesson = item.item as Lesson;
                    const state = lessonStates[lesson.id] || { downloaded: false, downloading: false };
                    const typeIcon = lesson.content_type === 'video' ? '▶️' : lesson.content_type === 'quiz' ? '❓' : '📄';

                    return (
                        <TouchableOpacity
                            style={[styles.lessonCard, lesson.completed && styles.lessonCompleted]}
                            onPress={() => navigation.navigate('LessonDetail', { lesson, subject })}
                            activeOpacity={0.8}
                        >
                            <View style={styles.lessonLeft}>
                                <View style={[styles.typeIcon, lesson.completed && styles.typeIconDone]}>
                                    <Text style={styles.typeIconText}>{lesson.completed ? '✅' : typeIcon}</Text>
                                </View>
                                <View style={styles.lessonInfo}>
                                    <Text style={styles.lessonTitle} numberOfLines={2}>{lesson.title}</Text>
                                    <Text style={styles.lessonMeta}>
                                        {lesson.duration_minutes}min · {lesson.content_type}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.lessonActions}>
                                {state.downloaded ? (
                                    <TouchableOpacity
                                        style={[styles.dlBtn, styles.dlBtnDone]}
                                        onPress={() => handleRemove(lesson)}
                                    >
                                        <Text style={styles.dlBtnDoneText}>💾</Text>
                                    </TouchableOpacity>
                                ) : state.downloading ? (
                                    <ActivityIndicator size="small" color={Colors.primary} />
                                ) : (
                                    <TouchableOpacity
                                        style={styles.dlBtn}
                                        onPress={() => handleDownload(lesson)}
                                        disabled={!isOnline}
                                    >
                                        <Text style={[styles.dlBtnText, !isOnline && { opacity: 0.4 }]}>⬇️</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </TouchableOpacity>
                    );
                }}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Text style={{ fontSize: 36, marginBottom: 12 }}>📭</Text>
                        <Text style={styles.emptyText}>No lessons published yet.</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.gray50 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: {
        backgroundColor: Colors.primary,
        paddingTop: 16, paddingHorizontal: 20, paddingBottom: 20,
    },
    headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
    headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
    list: { padding: 16 },
    chapterHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 4,
        marginTop: 8,
        marginBottom: 4,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray200,
    },
    chapterBadge: {
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: Colors.gray900,
        alignItems: 'center', justifyContent: 'center',
        marginRight: 10,
    },
    chapterBadgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },
    chapterTitle: { fontSize: 16, fontWeight: '700', color: Colors.gray800 },
    lessonCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 14,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        ...Shadows.sm,
    },
    lessonCompleted: { backgroundColor: '#f0fdf4' },
    lessonLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
    typeIcon: {
        width: 44, height: 44, borderRadius: 14,
        backgroundColor: Colors.primarySurface,
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    typeIconDone: { backgroundColor: Colors.successLight },
    typeIconText: { fontSize: 20 },
    lessonInfo: { flex: 1 },
    lessonTitle: { fontSize: 14, fontWeight: '700', color: Colors.gray900, lineHeight: 20 },
    lessonMeta: { fontSize: 11, color: Colors.gray400, marginTop: 3 },
    lessonActions: { marginLeft: 8 },
    dlBtn: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: Colors.gray100,
        alignItems: 'center', justifyContent: 'center',
    },
    dlBtnDone: { backgroundColor: Colors.successLight },
    dlBtnText: { fontSize: 16 },
    dlBtnDoneText: { fontSize: 16 },
    empty: { alignItems: 'center', paddingVertical: 60 },
    emptyText: { fontSize: 15, color: Colors.gray400, textAlign: 'center' },
});
