// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import QuestionPlayer from '../components/QuestionPlayer';
import { academicAPI, Assessment, Question } from '../lib/api';
import { Colors, Radius, Shadows, Spacing } from '../constants/theme';

type Params = { assessmentId: string; title?: string };

export default function TakeAssessmentScreen({ route, navigation }: any) {
    const { assessmentId, title }: Params = route.params || {};
    const draftKey = `assessment-draft:${assessmentId}`;

    const [assessment, setAssessment] = useState<Assessment | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [answers, setAnswers] = useState<Record<string, unknown>>({});
    const [currentIndex, setCurrentIndex] = useState(0);
    const [timeLeft, setTimeLeft] = useState(0);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submittedRef = useRef(false);
    const startTimeRef = useRef(Date.now());

    useEffect(() => {
        navigation.setOptions({ title: title || 'Assessment', headerBackVisible: !submitting });
    }, [navigation, title, submitting]);

    const loadData = useCallback(async () => {
        try {
            const [assessmentData, questionsData, draftRaw] = await Promise.all([
                academicAPI.getAssessment(assessmentId),
                academicAPI.getQuestionsByAssessment(assessmentId),
                AsyncStorage.getItem(draftKey),
            ]);
            setAssessment(assessmentData);
            const sorted = [...questionsData].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
            setQuestions(sorted);
            setTimeLeft(Math.max(0, (assessmentData.duration_minutes || 30) * 60));
            if (draftRaw) {
                try {
                    const draft = JSON.parse(draftRaw);
                    if (draft && typeof draft === 'object' && draft.answers) {
                        setAnswers(draft.answers);
                    }
                } catch {
                    // Bad draft — ignore.
                }
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to load assessment');
        } finally {
            setLoading(false);
        }
    }, [assessmentId, draftKey]);

    useEffect(() => { loadData(); }, [loadData]);

    const submitAssessment = useCallback(async () => {
        if (submittedRef.current) return;
        submittedRef.current = true;
        setSubmitting(true);

        try {
            const timeTakenMin = Math.floor((Date.now() - startTimeRef.current) / 60000);
            const res = await academicAPI.submitExam(assessmentId, answers, timeTakenMin);
            await AsyncStorage.removeItem(draftKey);
            navigation.replace('AssessmentResults', {
                submissionId: res.result_id,
                score: res.score,
                maxScore: res.max_score,
                title: assessment?.title ?? title,
            });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Submission failed';
            Alert.alert('Submission failed', message);
            submittedRef.current = false;
            setSubmitting(false);
        }
    }, [answers, assessment?.title, assessmentId, draftKey, navigation, title]);

    useEffect(() => {
        if (loading || timeLeft <= 0) return;
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    submitAssessment();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [loading, timeLeft, submitAssessment]);

    const saveDraft = useCallback(async (next: Record<string, unknown>) => {
        try {
            await AsyncStorage.setItem(draftKey, JSON.stringify({ answers: next }));
        } catch {
            // Non-fatal.
        }
    }, [draftKey]);

    const handleAnswer = (questionId: string, value: unknown) => {
        setAnswers((prev) => {
            const next = { ...prev, [questionId]: value };
            saveDraft(next);
            return next;
        });
    };

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        const pad = (n: number) => n.toString().padStart(2, '0');
        return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
    };

    const answeredCount = useMemo(
        () => questions.filter((q) => {
            const a = answers[q.question_id];
            return a !== undefined && a !== '' && a !== null;
        }).length,
        [questions, answers]
    );

    const confirmSubmit = () => {
        const unanswered = questions.length - answeredCount;
        const message =
            unanswered > 0
                ? `You have ${unanswered} unanswered question${unanswered === 1 ? '' : 's'}. Submit anyway?`
                : 'Are you sure you want to submit?';
        Alert.alert('Submit Assessment', message, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Submit', style: 'destructive', onPress: submitAssessment },
        ]);
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator color={Colors.primary} size="large" />
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.center}>
                <Text style={styles.errorTitle}>Could not load</Text>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); setError(null); loadData(); }}>
                    <Text style={styles.retryText}>Try again</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (!assessment || questions.length === 0) {
        return (
            <View style={styles.center}>
                <Text style={styles.errorTitle}>No questions</Text>
                <Text style={styles.errorText}>This assessment has no questions yet.</Text>
            </View>
        );
    }

    const current = questions[currentIndex];
    const progress = ((currentIndex + 1) / questions.length) * 100;
    const timeCritical = timeLeft > 0 && timeLeft < 300;

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={80}
        >
            <View style={styles.topBar}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.topTitle} numberOfLines={1}>{assessment.title}</Text>
                    <Text style={styles.topMeta}>
                        Q {currentIndex + 1} of {questions.length} · {answeredCount} answered
                    </Text>
                </View>
                <View style={[styles.timer, timeCritical && styles.timerCritical]}>
                    <Text style={[styles.timerText, timeCritical && styles.timerTextCritical]}>
                        {formatTime(timeLeft)}
                    </Text>
                </View>
            </View>

            <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress}%` as any }]} />
            </View>

            <View style={styles.body}>
                <QuestionPlayer
                    question={current}
                    answer={answers[current.question_id]}
                    onAnswer={(v) => handleAnswer(current.question_id, v)}
                    disabled={submitting}
                />
            </View>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.navigator}
                contentContainerStyle={styles.navigatorContent}
            >
                {questions.map((q, idx) => {
                    const isCurrent = idx === currentIndex;
                    const isAnswered = answers[q.question_id] !== undefined && answers[q.question_id] !== '';
                    return (
                        <TouchableOpacity
                            key={q.question_id}
                            style={[
                                styles.navChip,
                                isAnswered && !isCurrent && styles.navChipAnswered,
                                isCurrent && styles.navChipCurrent,
                            ]}
                            onPress={() => setCurrentIndex(idx)}
                            activeOpacity={0.7}
                        >
                            <Text
                                style={[
                                    styles.navChipText,
                                    isAnswered && !isCurrent && styles.navChipTextAnswered,
                                    isCurrent && styles.navChipTextCurrent,
                                ]}
                            >
                                {idx + 1}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.navBtn, currentIndex === 0 && styles.navBtnDisabled]}
                    disabled={currentIndex === 0 || submitting}
                    onPress={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                >
                    <Text style={[styles.navBtnText, currentIndex === 0 && styles.navBtnTextDisabled]}>← Prev</Text>
                </TouchableOpacity>

                {currentIndex === questions.length - 1 ? (
                    <TouchableOpacity
                        style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                        onPress={confirmSubmit}
                        disabled={submitting}
                    >
                        {submitting
                            ? <ActivityIndicator color={Colors.white} />
                            : <Text style={styles.submitText}>Submit</Text>}
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={styles.nextBtn}
                        onPress={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
                        disabled={submitting}
                    >
                        <Text style={styles.nextText}>Next →</Text>
                    </TouchableOpacity>
                )}
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.gray50 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.md },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.lg,
        backgroundColor: Colors.white,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray200,
        gap: Spacing.md,
    },
    topTitle: { fontSize: 15, fontWeight: '700', color: Colors.gray900 },
    topMeta: { fontSize: 12, color: Colors.gray500, marginTop: 2 },
    timer: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: Radius.full,
        backgroundColor: Colors.primarySurface,
    },
    timerCritical: { backgroundColor: Colors.errorLight },
    timerText: {
        fontSize: 14,
        fontWeight: '800',
        color: Colors.primary,
        fontVariant: ['tabular-nums'],
    },
    timerTextCritical: { color: Colors.error },
    progressTrack: { height: 3, backgroundColor: Colors.gray200 },
    progressFill: { height: '100%', backgroundColor: Colors.primary },
    body: { flex: 1, backgroundColor: Colors.gray50 },
    navigator: { flexGrow: 0, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.gray100 },
    navigatorContent: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.sm },
    navChip: {
        width: 36,
        height: 36,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: Colors.gray200,
        backgroundColor: Colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.sm,
    },
    navChipAnswered: { backgroundColor: Colors.primarySurface, borderColor: Colors.primary },
    navChipCurrent: { backgroundColor: Colors.primary, borderColor: Colors.primary, ...Shadows.sm },
    navChipText: { fontSize: 13, fontWeight: '700', color: Colors.gray400 },
    navChipTextAnswered: { color: Colors.primary },
    navChipTextCurrent: { color: Colors.white },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: Spacing.lg,
        backgroundColor: Colors.white,
        borderTopWidth: 1,
        borderTopColor: Colors.gray200,
        gap: Spacing.md,
    },
    navBtn: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderRadius: Radius.lg,
        backgroundColor: Colors.gray100,
    },
    navBtnDisabled: { backgroundColor: Colors.gray100, opacity: 0.5 },
    navBtnText: { color: Colors.gray700, fontWeight: '700', fontSize: 14 },
    navBtnTextDisabled: { color: Colors.gray400 },
    nextBtn: {
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.md,
        borderRadius: Radius.lg,
        backgroundColor: Colors.primary,
        ...Shadows.sm,
    },
    nextText: { color: Colors.white, fontWeight: '800', fontSize: 14 },
    submitBtn: {
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.md,
        borderRadius: Radius.lg,
        backgroundColor: Colors.success,
        minWidth: 120,
        alignItems: 'center',
        ...Shadows.sm,
    },
    submitBtnDisabled: { opacity: 0.6 },
    submitText: { color: Colors.white, fontWeight: '800', fontSize: 14 },
    errorTitle: { fontSize: 18, fontWeight: '700', color: Colors.gray900 },
    errorText: { fontSize: 14, color: Colors.gray500, textAlign: 'center' },
    retryBtn: {
        marginTop: Spacing.md,
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.md,
        backgroundColor: Colors.primary,
        borderRadius: Radius.lg,
    },
    retryText: { color: Colors.white, fontWeight: '700' },
});
