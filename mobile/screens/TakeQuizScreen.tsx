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
import QuestionPlayer from '../components/QuestionPlayer';
import { academicAPI, Assessment, Question, SubmitExamResponse } from '../lib/api';
import { Colors, Radius, Shadows, Spacing } from '../constants/theme';

type Stage = 'intro' | 'quiz' | 'result';

export default function TakeQuizScreen({ route, navigation }: any) {
    const { assessmentId, title } = route.params || {};

    const [assessment, setAssessment] = useState<Assessment | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [answers, setAnswers] = useState<Record<string, unknown>>({});
    const [currentIndex, setCurrentIndex] = useState(0);
    const [timeLeft, setTimeLeft] = useState(0);
    const [stage, setStage] = useState<Stage>('intro');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<SubmitExamResponse | null>(null);

    const submittedRef = useRef(false);
    const startTimeRef = useRef(0);

    useEffect(() => {
        navigation.setOptions({ title: title || 'Quiz' });
    }, [navigation, title]);

    const loadData = useCallback(async () => {
        try {
            const [assessmentData, questionsData] = await Promise.all([
                academicAPI.getAssessment(assessmentId),
                academicAPI.getQuestionsByAssessment(assessmentId),
            ]);
            setAssessment(assessmentData);
            setQuestions([...questionsData].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
            setTimeLeft(Math.max(0, (assessmentData.duration_minutes || 15) * 60));
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to load quiz');
        } finally {
            setLoading(false);
        }
    }, [assessmentId]);

    useEffect(() => { loadData(); }, [loadData]);

    const submitQuiz = useCallback(async () => {
        if (submittedRef.current) return;
        submittedRef.current = true;
        setSubmitting(true);
        try {
            const timeTakenMin = startTimeRef.current
                ? Math.max(0, Math.floor((Date.now() - startTimeRef.current) / 60000))
                : 0;
            const res = await academicAPI.submitExam(assessmentId, answers, timeTakenMin);
            setResult(res);
            setStage('result');
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Submission failed';
            Alert.alert('Submission failed', message);
            submittedRef.current = false;
        } finally {
            setSubmitting(false);
        }
    }, [answers, assessmentId]);

    useEffect(() => {
        if (stage !== 'quiz' || timeLeft <= 0) return;
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    submitQuiz();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [stage, timeLeft, submitQuiz]);

    const answeredCount = useMemo(
        () => questions.filter((q) => {
            const a = answers[q.question_id];
            return a !== undefined && a !== '' && a !== null;
        }).length,
        [questions, answers]
    );

    const handleStart = () => {
        startTimeRef.current = Date.now();
        setStage('quiz');
    };

    const handleAnswer = (qid: string, v: unknown) => {
        setAnswers((prev) => ({ ...prev, [qid]: v }));
    };

    const confirmSubmit = () => {
        const unanswered = questions.length - answeredCount;
        const message =
            unanswered > 0
                ? `You have ${unanswered} unanswered question${unanswered === 1 ? '' : 's'}. Submit anyway?`
                : 'Ready to submit?';
        Alert.alert('Submit Quiz', message, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Submit', style: 'destructive', onPress: submitQuiz },
        ]);
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    if (loading) {
        return <View style={styles.center}><ActivityIndicator color={Colors.primary} size="large" /></View>;
    }

    if (error || !assessment) {
        return (
            <View style={styles.center}>
                <Text style={styles.errorTitle}>Could not load quiz</Text>
                <Text style={styles.errorText}>{error || 'Quiz not found'}</Text>
            </View>
        );
    }

    if (stage === 'intro') {
        return (
            <ScrollView style={styles.screen} contentContainerStyle={styles.introContent}>
                <View style={styles.introCard}>
                    <View style={styles.introIcon}>
                        <Text style={styles.introEmoji}>🧠</Text>
                    </View>
                    <Text style={styles.introTitle}>{assessment.title}</Text>
                    {assessment.description ? (
                        <Text style={styles.introDesc}>{assessment.description}</Text>
                    ) : null}

                    <View style={styles.statsRow}>
                        <View style={styles.stat}>
                            <Text style={styles.statLabel}>Duration</Text>
                            <Text style={styles.statValue}>{assessment.duration_minutes} min</Text>
                        </View>
                        <View style={styles.stat}>
                            <Text style={styles.statLabel}>Questions</Text>
                            <Text style={styles.statValue}>{questions.length}</Text>
                        </View>
                        <View style={styles.stat}>
                            <Text style={styles.statLabel}>Marks</Text>
                            <Text style={styles.statValue}>{assessment.total_marks}</Text>
                        </View>
                    </View>

                    <View style={styles.warning}>
                        <Text style={styles.warningText}>
                            ⏱ The timer starts as soon as you tap Start. Closing the app may cost you time.
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={[styles.startBtn, questions.length === 0 && styles.startBtnDisabled]}
                        disabled={questions.length === 0}
                        onPress={handleStart}
                    >
                        <Text style={styles.startText}>
                            {questions.length === 0 ? 'No questions' : 'Start Quiz'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        );
    }

    if (stage === 'result' && result) {
        const pct = result.max_score > 0 ? Math.round((result.score / result.max_score) * 100) : 0;
        const passed = pct >= 50;
        return (
            <ScrollView style={styles.screen} contentContainerStyle={styles.introContent}>
                <View style={styles.introCard}>
                    <View style={[styles.introIcon, passed ? styles.resultIconPass : styles.resultIconFail]}>
                        <Text style={styles.introEmoji}>{passed ? '🎉' : '📘'}</Text>
                    </View>
                    <Text style={styles.introTitle}>
                        {passed ? 'Well done!' : 'Review and retry'}
                    </Text>
                    <Text style={styles.introDesc}>You completed {assessment.title}.</Text>

                    <View style={styles.resultScore}>
                        <Text style={styles.resultScoreBig}>{result.score}</Text>
                        <Text style={styles.resultScoreMax}>/ {result.max_score}</Text>
                    </View>
                    <Text style={styles.resultPct}>{pct}%</Text>

                    <View style={styles.progressTrack}>
                        <View
                            style={[
                                styles.progressFill,
                                { width: `${pct}%` as any, backgroundColor: passed ? Colors.success : Colors.error },
                            ]}
                        />
                    </View>

                    <TouchableOpacity style={styles.startBtn} onPress={() => navigation.goBack()}>
                        <Text style={styles.startText}>Back</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        );
    }

    const current = questions[currentIndex];
    const progress = ((currentIndex + 1) / questions.length) * 100;
    const timeCritical = timeLeft > 0 && timeLeft < 60;

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={80}
        >
            <View style={styles.topBar}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.topTitle} numberOfLines={1}>{assessment.title}</Text>
                    <Text style={styles.topMeta}>Q {currentIndex + 1} / {questions.length}</Text>
                </View>
                <View style={[styles.timer, timeCritical && styles.timerCritical]}>
                    <Text style={[styles.timerText, timeCritical && styles.timerTextCritical]}>
                        {formatTime(timeLeft)}
                    </Text>
                </View>
            </View>
            <View style={styles.progressTrackSlim}>
                <View style={[styles.progressFillSlim, { width: `${progress}%` as any }]} />
            </View>

            <View style={styles.body}>
                <QuestionPlayer
                    question={current}
                    answer={answers[current.question_id]}
                    onAnswer={(v) => handleAnswer(current.question_id, v)}
                    disabled={submitting}
                />
            </View>

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
    screen: { flex: 1, backgroundColor: Colors.gray50 },
    container: { flex: 1, backgroundColor: Colors.gray50 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.md },
    introContent: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
    introCard: {
        backgroundColor: Colors.white,
        borderRadius: Radius.xl,
        padding: Spacing.xxl,
        alignItems: 'center',
        ...Shadows.md,
    },
    introIcon: {
        width: 72,
        height: 72,
        borderRadius: 20,
        backgroundColor: Colors.primarySurface,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.lg,
    },
    resultIconPass: { backgroundColor: Colors.successLight },
    resultIconFail: { backgroundColor: Colors.errorLight },
    introEmoji: { fontSize: 36 },
    introTitle: { fontSize: 22, fontWeight: '800', color: Colors.gray900, textAlign: 'center' },
    introDesc: { fontSize: 14, color: Colors.gray500, textAlign: 'center', marginTop: Spacing.sm, lineHeight: 20 },
    statsRow: {
        flexDirection: 'row',
        alignSelf: 'stretch',
        marginTop: Spacing.xl,
        gap: Spacing.md,
    },
    stat: {
        flex: 1,
        backgroundColor: Colors.gray50,
        borderRadius: Radius.md,
        padding: Spacing.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.gray100,
    },
    statLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: Colors.gray400,
        letterSpacing: 1,
        marginBottom: 4,
    },
    statValue: { fontSize: 16, fontWeight: '800', color: Colors.gray800 },
    warning: {
        alignSelf: 'stretch',
        marginTop: Spacing.xl,
        padding: Spacing.md,
        backgroundColor: Colors.warningLight,
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: Colors.warning + '44',
    },
    warningText: { color: Colors.warning, fontSize: 12, fontWeight: '700', lineHeight: 18 },
    startBtn: {
        alignSelf: 'stretch',
        backgroundColor: Colors.primary,
        borderRadius: Radius.lg,
        paddingVertical: Spacing.lg,
        alignItems: 'center',
        marginTop: Spacing.xl,
        ...Shadows.sm,
    },
    startBtnDisabled: { backgroundColor: Colors.gray300 },
    startText: { color: Colors.white, fontSize: 15, fontWeight: '800' },
    resultScore: { flexDirection: 'row', alignItems: 'flex-end', marginTop: Spacing.xl, gap: 6 },
    resultScoreBig: { fontSize: 56, fontWeight: '900', color: Colors.gray900, letterSpacing: -1 },
    resultScoreMax: { fontSize: 20, fontWeight: '700', color: Colors.gray400, paddingBottom: 8 },
    resultPct: { fontSize: 14, fontWeight: '800', color: Colors.gray500, marginTop: 4 },
    progressTrack: {
        alignSelf: 'stretch',
        height: 10,
        backgroundColor: Colors.gray100,
        borderRadius: Radius.full,
        overflow: 'hidden',
        marginTop: Spacing.lg,
    },
    progressFill: { height: '100%', borderRadius: Radius.full },
    progressTrackSlim: { height: 3, backgroundColor: Colors.gray200 },
    progressFillSlim: { height: '100%', backgroundColor: Colors.primary },
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
    timerText: { fontSize: 14, fontWeight: '800', color: Colors.primary, fontVariant: ['tabular-nums'] },
    timerTextCritical: { color: Colors.error },
    body: { flex: 1 },
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
    navBtnDisabled: { opacity: 0.5 },
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
});
