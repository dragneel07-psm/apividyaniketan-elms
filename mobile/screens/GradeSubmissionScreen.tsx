// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    academicAPI,
    Assessment,
    Student,
    Submission,
} from '../lib/api';
import { Colors, Shadows } from '../constants/theme';

export default function GradeSubmissionScreen({ route, navigation }: any) {
    const { submissionId } = route.params as { submissionId: string };

    const [submission, setSubmission] = useState<Submission | null>(null);
    const [assessment, setAssessment] = useState<Assessment | null>(null);
    const [student, setStudent] = useState<Student | null>(null);
    const [score, setScore] = useState<string>('0');
    const [feedback, setFeedback] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        try {
            setError('');
            const sub = await academicAPI.getSubmission(submissionId);
            setSubmission(sub);

            const [assessmentData, studentData] = await Promise.all([
                academicAPI.getAssessment(sub.assessment).catch(() => null),
                academicAPI.getStudent(sub.student).catch(() => null),
            ]);
            setAssessment(assessmentData);
            setStudent(studentData);

            if (sub.result) {
                setScore(String(sub.result.score ?? 0));
                setFeedback(sub.feedback || '');
            } else {
                setScore('0');
                setFeedback('');
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to load submission';
            setError(msg);
        } finally {
            setLoading(false);
        }
    }, [submissionId]);

    useEffect(() => {
        load();
    }, [load]);

    const save = async () => {
        const numericScore = Number(score);
        const maxScore = assessment?.total_marks ?? 100;
        if (Number.isNaN(numericScore) || numericScore < 0 || numericScore > maxScore) {
            Alert.alert('Invalid Score', `Score must be between 0 and ${maxScore}.`);
            return;
        }

        setSaving(true);
        try {
            await academicAPI.gradeSubmission(submissionId, {
                score: numericScore,
                teacher_feedback: feedback.trim(),
            });
            Alert.alert('Success', 'Grade saved successfully.', [
                { text: 'OK', onPress: () => navigation.goBack() },
            ]);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to save grade';
            Alert.alert('Save Failed', msg);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator color={Colors.primary} size="large" />
                <Text style={styles.loadingText}>Loading submission...</Text>
            </View>
        );
    }

    if (!submission) {
        return (
            <View style={styles.centered}>
                <Text style={styles.emptyText}>{error || 'Submission not found.'}</Text>
            </View>
        );
    }

    const maxScore = assessment?.total_marks ?? 100;
    const studentName = student
        ? `${student.first_name || ''} ${student.last_name || ''}`.trim() || student.email || 'Student'
        : `Student ${submission.student.slice(0, 8)}`;

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
            <View style={styles.heroCard}>
                <Text style={styles.heroBadge}>
                    {submission.is_graded ? 'GRADED' : 'PENDING REVIEW'}
                </Text>
                <Text style={styles.heroTitle}>
                    {assessment?.title || 'Assessment'}
                </Text>
                <Text style={styles.heroSubtitle}>{studentName}</Text>
            </View>

            <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Student Response</Text>
                {submission.content ? (
                    <Text style={styles.responseText}>{submission.content}</Text>
                ) : (
                    <Text style={styles.mutedText}>No text response submitted.</Text>
                )}
            </View>

            <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Final Grade</Text>

                <Text style={styles.label}>Score (0-{maxScore})</Text>
                <View style={styles.scoreRow}>
                    <TextInput
                        style={styles.scoreInput}
                        value={score}
                        onChangeText={setScore}
                        keyboardType="numeric"
                        maxLength={4}
                    />
                    <Text style={styles.scoreSuffix}>/ {maxScore}</Text>
                </View>

                <Text style={styles.label}>Feedback & Remarks</Text>
                <TextInput
                    style={[styles.input, styles.multiInput]}
                    value={feedback}
                    onChangeText={setFeedback}
                    placeholder="Enter constructive feedback..."
                    multiline
                />

                <TouchableOpacity
                    style={styles.submitBtn}
                    onPress={save}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.submitBtnText}>Save & Release Grade</Text>
                    )}
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: Colors.gray50 },
    content: { padding: 16, paddingBottom: 32 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: Colors.gray50 },
    loadingText: { color: Colors.gray600, marginTop: 8 },
    emptyText: { color: Colors.gray500, fontSize: 14, textAlign: 'center' },
    heroCard: {
        backgroundColor: Colors.primary,
        borderRadius: 18,
        padding: 18,
        marginBottom: 14,
        ...Shadows.md,
    },
    heroBadge: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
    heroTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 4 },
    heroSubtitle: { color: 'rgba(255,255,255,0.9)', marginTop: 4, fontSize: 13 },
    sectionCard: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 14,
        marginBottom: 12,
        ...Shadows.sm,
    },
    sectionTitle: { fontWeight: '800', color: Colors.gray900, fontSize: 15, marginBottom: 10 },
    responseText: { color: Colors.gray700, fontSize: 14, lineHeight: 22 },
    mutedText: { color: Colors.gray500, fontSize: 13 },
    label: { color: Colors.gray700, fontSize: 12, fontWeight: '700', marginTop: 8, marginBottom: 6, letterSpacing: 0.5 },
    scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
    scoreInput: {
        borderWidth: 1,
        borderColor: Colors.gray200,
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: Colors.gray900,
        fontSize: 18,
        fontWeight: '800',
        width: 90,
        textAlign: 'center',
    },
    scoreSuffix: { color: Colors.gray600, fontSize: 14, fontWeight: '700' },
    input: {
        borderWidth: 1,
        borderColor: Colors.gray200,
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 11,
        color: Colors.gray900,
        fontSize: 14,
    },
    multiInput: { minHeight: 120, textAlignVertical: 'top' },
    submitBtn: {
        marginTop: 14,
        backgroundColor: Colors.primary,
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        ...Shadows.sm,
    },
    submitBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
