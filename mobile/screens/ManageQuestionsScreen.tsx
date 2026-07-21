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
import { academicAPI, Assessment, Question } from '../lib/api';
import { Colors, Shadows } from '../constants/theme';

type QuestionType = 'mcq' | 'short_answer' | 'long_answer' | 'code';

const TYPE_OPTIONS: Array<{ value: QuestionType; label: string }> = [
    { value: 'mcq', label: 'Multiple Choice' },
    { value: 'short_answer', label: 'Short Answer' },
    { value: 'long_answer', label: 'Long Answer' },
    { value: 'code', label: 'Code' },
];

const TYPE_LABELS: Record<string, string> = {
    mcq: 'Multiple Choice',
    short_answer: 'Short Answer',
    long_answer: 'Long Answer',
    code: 'Code',
};

export default function ManageQuestionsScreen({ route, navigation }: any) {
    const { assessmentId } = route.params as { assessmentId: string };

    const [assessment, setAssessment] = useState<Assessment | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Add form state
    const [formOpen, setFormOpen] = useState(false);
    const [type, setType] = useState<QuestionType>('mcq');
    const [text, setText] = useState('');
    const [options, setOptions] = useState<string[]>(['', '', '', '']);
    const [correctAnswer, setCorrectAnswer] = useState('');
    const [points, setPoints] = useState('1');
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        try {
            setError('');
            const [a, q] = await Promise.all([
                academicAPI.getAssessment(assessmentId),
                academicAPI.getQuestionsByAssessment(assessmentId),
            ]);
            setAssessment(a);
            setQuestions(q.sort((x, y) => x.order - y.order));
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to load questions';
            setError(msg);
        } finally {
            setLoading(false);
        }
    }, [assessmentId]);

    useEffect(() => {
        load();
    }, [load]);

    const resetForm = () => {
        setType('mcq');
        setText('');
        setOptions(['', '', '', '']);
        setCorrectAnswer('');
        setPoints('1');
    };

    const addQuestion = async () => {
        if (!text.trim()) {
            Alert.alert('Missing Text', 'Enter the question text.');
            return;
        }
        const pts = Number(points);
        if (Number.isNaN(pts) || pts <= 0) {
            Alert.alert('Invalid Points', 'Points must be a positive number.');
            return;
        }
        if (type === 'mcq') {
            const filled = options.map((o) => o.trim()).filter(Boolean);
            if (filled.length < 2) {
                Alert.alert('Need Options', 'Provide at least two options.');
                return;
            }
            if (!correctAnswer.trim() || !filled.includes(correctAnswer.trim())) {
                Alert.alert('Pick Correct', 'Tap an option to mark it correct.');
                return;
            }
        }

        setSaving(true);
        try {
            const payload: any = {
                assessment: assessmentId,
                text: text.trim(),
                type,
                points: pts,
                order: questions.length + 1,
                options: type === 'mcq' ? options.map((o) => o.trim()).filter(Boolean) : [],
                correct_answer: correctAnswer.trim(),
            };
            const created = await academicAPI.createQuestion(payload);
            setQuestions((prev) => [...prev, created]);
            resetForm();
            setFormOpen(false);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to add question';
            Alert.alert('Add Failed', msg);
        } finally {
            setSaving(false);
        }
    };

    const deleteQuestion = (question: Question) => {
        Alert.alert(
            'Delete Question',
            'Delete this question? This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await academicAPI.deleteQuestion(question.id);
                            setQuestions((prev) => prev.filter((q) => q.id !== question.id));
                        } catch (err: unknown) {
                            const msg = err instanceof Error ? err.message : 'Failed to delete';
                            Alert.alert('Delete Failed', msg);
                        }
                    },
                },
            ]
        );
    };

    const updateOption = (index: number, value: string) => {
        setOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator color={Colors.primary} size="large" />
                <Text style={styles.loadingText}>Loading questions...</Text>
            </View>
        );
    }

    const totalPoints = questions.reduce((acc, q) => acc + (q.points || 0), 0);

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
            <View style={styles.heroCard}>
                <Text style={styles.heroBadge}>ASSESSMENT</Text>
                <Text style={styles.heroTitle} numberOfLines={2}>
                    {assessment?.title || 'Assessment'}
                </Text>
                <Text style={styles.heroSubtitle}>
                    {questions.length} question{questions.length !== 1 ? 's' : ''} · {totalPoints} pts
                </Text>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {questions.length === 0 ? (
                <View style={styles.emptyCard}>
                    <Text style={styles.emptyCardText}>No questions yet. Add your first below.</Text>
                </View>
            ) : (
                questions.map((q, idx) => (
                    <View key={q.id} style={styles.questionCard}>
                        <View style={styles.questionHeader}>
                            <Text style={styles.questionIndex}>Q{idx + 1}</Text>
                            <Text style={styles.typeBadge}>{TYPE_LABELS[q.type] || q.type}</Text>
                            <Text style={styles.pointsBadge}>{q.points} pt{q.points !== 1 ? 's' : ''}</Text>
                        </View>
                        <Text style={styles.questionText}>{q.text}</Text>
                        {q.type === 'mcq' && q.options?.length > 0 && (
                            <View style={styles.optionList}>
                                {q.options.map((opt, i) => {
                                    const isCorrect = opt === q.correct_answer;
                                    return (
                                        <View key={i} style={[
                                            styles.optionRow,
                                            isCorrect && styles.optionRowCorrect,
                                        ]}>
                                            <Text style={[
                                                styles.optionLetter,
                                                isCorrect && styles.optionLetterCorrect,
                                            ]}>
                                                {String.fromCharCode(65 + i)}
                                            </Text>
                                            <Text style={[
                                                styles.optionText,
                                                isCorrect && styles.optionTextCorrect,
                                            ]}>
                                                {opt}
                                            </Text>
                                        </View>
                                    );
                                })}
                            </View>
                        )}
                        {q.type !== 'mcq' && q.correct_answer ? (
                            <Text style={styles.referenceText}>
                                Reference: {q.correct_answer}
                            </Text>
                        ) : null}
                        <TouchableOpacity
                            style={styles.deleteBtn}
                            onPress={() => deleteQuestion(q)}
                        >
                            <Text style={styles.deleteBtnText}>Delete</Text>
                        </TouchableOpacity>
                    </View>
                ))
            )}

            {!formOpen ? (
                <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => setFormOpen(true)}
                >
                    <Text style={styles.addBtnText}>＋  Add Question</Text>
                </TouchableOpacity>
            ) : (
                <View style={styles.formCard}>
                    <Text style={styles.formTitle}>New Question</Text>

                    <Text style={styles.label}>Type</Text>
                    <View style={styles.chipRow}>
                        {TYPE_OPTIONS.map((opt) => {
                            const isActive = type === opt.value;
                            return (
                                <TouchableOpacity
                                    key={opt.value}
                                    onPress={() => setType(opt.value)}
                                    style={[styles.chip, isActive && styles.chipActive]}
                                >
                                    <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                                        {opt.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <Text style={styles.label}>Question Text</Text>
                    <TextInput
                        style={[styles.input, styles.multiInput]}
                        value={text}
                        onChangeText={setText}
                        placeholder="What do you want to ask?"
                        multiline
                    />

                    {type === 'mcq' ? (
                        <>
                            <Text style={styles.label}>Options (tap to mark correct)</Text>
                            {options.map((opt, i) => {
                                const trimmed = opt.trim();
                                const isCorrect = trimmed !== '' && correctAnswer === trimmed;
                                return (
                                    <View key={i} style={styles.optionEditRow}>
                                        <TouchableOpacity
                                            onPress={() => trimmed && setCorrectAnswer(trimmed)}
                                            style={[
                                                styles.optionLetterBtn,
                                                isCorrect && styles.optionLetterBtnCorrect,
                                            ]}
                                        >
                                            <Text style={[
                                                styles.optionLetterBtnText,
                                                isCorrect && styles.optionLetterBtnTextCorrect,
                                            ]}>
                                                {String.fromCharCode(65 + i)}
                                            </Text>
                                        </TouchableOpacity>
                                        <TextInput
                                            style={[styles.input, styles.optionInput]}
                                            value={opt}
                                            onChangeText={(v) => updateOption(i, v)}
                                            placeholder={`Option ${i + 1}`}
                                        />
                                    </View>
                                );
                            })}
                        </>
                    ) : (
                        <>
                            <Text style={styles.label}>
                                {type === 'short_answer' ? 'Correct Answer (case-insensitive)' : 'Reference Answer / Guidelines'}
                            </Text>
                            <TextInput
                                style={[styles.input, styles.multiInput]}
                                value={correctAnswer}
                                onChangeText={setCorrectAnswer}
                                placeholder={type === 'short_answer' ? 'Correct keyword' : 'Reference for manual grading'}
                                multiline
                            />
                        </>
                    )}

                    <Text style={styles.label}>Points</Text>
                    <TextInput
                        style={styles.input}
                        value={points}
                        onChangeText={setPoints}
                        keyboardType="numeric"
                        placeholder="1"
                    />

                    <View style={styles.formActions}>
                        <TouchableOpacity
                            style={styles.cancelBtn}
                            onPress={() => { resetForm(); setFormOpen(false); }}
                            disabled={saving}
                        >
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.saveBtn}
                            onPress={addQuestion}
                            disabled={saving}
                        >
                            {saving ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.saveBtnText}>Save Question</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: Colors.gray50 },
    content: { padding: 16, paddingBottom: 32 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: Colors.gray50 },
    loadingText: { color: Colors.gray600, marginTop: 8 },
    errorText: { color: Colors.error, fontSize: 13, marginBottom: 10 },
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
    emptyCard: {
        backgroundColor: '#fff',
        borderRadius: 14,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: Colors.gray200,
        paddingVertical: 32,
        alignItems: 'center',
        marginBottom: 12,
    },
    emptyCardText: { color: Colors.gray400, fontSize: 13, fontWeight: '600' },
    questionCard: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        ...Shadows.sm,
    },
    questionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    questionIndex: {
        backgroundColor: Colors.primarySurface,
        color: Colors.primary,
        fontSize: 11,
        fontWeight: '800',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    typeBadge: {
        color: Colors.gray600,
        fontSize: 11,
        fontWeight: '700',
        backgroundColor: Colors.gray100,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    pointsBadge: {
        color: Colors.warning,
        fontSize: 11,
        fontWeight: '700',
        backgroundColor: Colors.warningLight,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        marginLeft: 'auto',
    },
    questionText: { color: Colors.gray900, fontSize: 14, fontWeight: '600', lineHeight: 20 },
    optionList: { marginTop: 10, gap: 6 },
    optionRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: Colors.gray50,
        borderWidth: 1,
        borderColor: Colors.gray100,
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 8,
        gap: 10,
    },
    optionRowCorrect: { backgroundColor: Colors.successLight, borderColor: Colors.success },
    optionLetter: { color: Colors.gray500, fontSize: 12, fontWeight: '800', width: 18 },
    optionLetterCorrect: { color: Colors.success },
    optionText: { color: Colors.gray700, fontSize: 13, flex: 1 },
    optionTextCorrect: { color: Colors.success, fontWeight: '700' },
    referenceText: { color: Colors.gray600, fontSize: 12, marginTop: 8, fontStyle: 'italic' },
    deleteBtn: {
        alignSelf: 'flex-end',
        marginTop: 10,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: Colors.errorLight,
    },
    deleteBtnText: { color: Colors.error, fontSize: 12, fontWeight: '800' },
    addBtn: {
        backgroundColor: Colors.primary,
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        ...Shadows.sm,
    },
    addBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
    formCard: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 14,
        ...Shadows.md,
    },
    formTitle: { color: Colors.gray900, fontSize: 15, fontWeight: '800', marginBottom: 4 },
    label: { color: Colors.gray700, fontSize: 12, fontWeight: '700', marginTop: 10, marginBottom: 6, letterSpacing: 0.5 },
    input: {
        borderWidth: 1,
        borderColor: Colors.gray200,
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: Colors.gray900,
        fontSize: 14,
    },
    multiInput: { minHeight: 70, textAlignVertical: 'top' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
        paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
        borderWidth: 1, borderColor: Colors.gray200, backgroundColor: '#fff',
    },
    chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    chipText: { color: Colors.gray700, fontSize: 11, fontWeight: '700' },
    chipTextActive: { color: '#fff' },
    optionEditRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    optionLetterBtn: {
        width: 32, height: 32, borderRadius: 999,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: Colors.gray100,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    optionLetterBtnCorrect: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    optionLetterBtnText: { color: Colors.gray500, fontWeight: '800', fontSize: 12 },
    optionLetterBtnTextCorrect: { color: '#fff' },
    optionInput: { flex: 1 },
    formActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
    cancelBtn: {
        flex: 1,
        borderWidth: 1, borderColor: Colors.gray200,
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    cancelBtnText: { color: Colors.gray700, fontWeight: '700', fontSize: 14 },
    saveBtn: {
        flex: 1,
        backgroundColor: Colors.primary,
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
    },
    saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
