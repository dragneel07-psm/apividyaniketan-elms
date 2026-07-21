// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { academicAPI, Lesson } from '../lib/api';
import { Colors, Shadows } from '../constants/theme';

export default function LessonDetailScreen({ route, navigation }: any) {
    const { lesson, subject } = route.params as { lesson: Lesson; subject: { id: number; name: string } };
    const [completed, setCompleted] = useState(Boolean(lesson.completed));
    const [saving, setSaving] = useState(false);
    const hasQuiz = lesson.content_type === 'quiz' && !!lesson.assessment;

    const cleanContent = (lesson.content || '').replace(/<[^>]*>/g, '').trim();

    const toggleProgress = async () => {
        setSaving(true);
        try {
            const result = await academicAPI.toggleLessonProgress(lesson.id);
            setCompleted(Boolean(result.completed));
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to update lesson progress';
            Alert.alert('Progress Update Failed', message);
        } finally {
            setSaving(false);
        }
    };

    const openVideo = async () => {
        if (!lesson.video_url) return;
        const supported = await Linking.canOpenURL(lesson.video_url);
        if (!supported) {
            Alert.alert('Cannot Open Video', 'The video URL is invalid or unsupported on this device.');
            return;
        }
        await Linking.openURL(lesson.video_url);
    };

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
            <View style={styles.headerCard}>
                <Text style={styles.subjectName}>{subject.name}</Text>
                <Text style={styles.lessonTitle}>{lesson.title}</Text>
                <Text style={styles.lessonMeta}>
                    {lesson.duration_minutes} min • {lesson.content_type}
                </Text>
            </View>

            <View style={styles.bodyCard}>
                <Text style={styles.bodyTitle}>Lesson Content</Text>
                {cleanContent ? (
                    <Text style={styles.bodyText}>{cleanContent}</Text>
                ) : (
                    <Text style={styles.emptyText}>No text content is available for this lesson yet.</Text>
                )}

                {lesson.video_url ? (
                    <TouchableOpacity style={styles.videoButton} onPress={openVideo}>
                        <Text style={styles.videoButtonText}>▶ Watch Video</Text>
                    </TouchableOpacity>
                ) : null}

                {hasQuiz ? (
                    <TouchableOpacity
                        style={styles.quizButton}
                        onPress={() => navigation.navigate('TakeQuiz', {
                            assessmentId: lesson.assessment,
                            title: lesson.title,
                        })}
                    >
                        <Text style={styles.quizButtonText}>🧠  Take Quiz</Text>
                    </TouchableOpacity>
                ) : null}
            </View>

            <TouchableOpacity
                style={[styles.progressButton, completed && styles.progressButtonDone]}
                onPress={toggleProgress}
                disabled={saving}
            >
                {saving ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.progressButtonText}>
                        {completed ? 'Mark as Not Completed' : 'Mark as Completed'}
                    </Text>
                )}
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: Colors.gray50 },
    content: { padding: 16, paddingBottom: 32 },
    headerCard: {
        backgroundColor: Colors.primary,
        borderRadius: 18,
        padding: 16,
        marginBottom: 12,
        ...Shadows.md,
    },
    subjectName: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '700' },
    lessonTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 4 },
    lessonMeta: { color: 'rgba(255,255,255,0.9)', marginTop: 6, fontSize: 13 },
    bodyCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 14,
        ...Shadows.sm,
    },
    bodyTitle: { color: Colors.gray900, fontWeight: '800', fontSize: 15, marginBottom: 10 },
    bodyText: { color: Colors.gray700, fontSize: 14, lineHeight: 22 },
    emptyText: { color: Colors.gray500, fontSize: 13 },
    videoButton: {
        marginTop: 16,
        backgroundColor: Colors.primarySurface,
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
    },
    videoButtonText: { color: Colors.primary, fontWeight: '700', fontSize: 14 },
    quizButton: {
        marginTop: 12,
        backgroundColor: Colors.secondary,
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
        ...Shadows.sm,
    },
    quizButtonText: { color: '#fff', fontWeight: '800', fontSize: 14 },
    progressButton: {
        marginTop: 14,
        backgroundColor: Colors.primary,
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        ...Shadows.sm,
    },
    progressButtonDone: { backgroundColor: Colors.success },
    progressButtonText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
