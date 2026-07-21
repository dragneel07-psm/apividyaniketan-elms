// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import React, { useEffect, useState } from 'react';
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
import { academicAPI, Subject } from '../lib/api';
import { Colors, Shadows } from '../constants/theme';

type AssessmentType = 'quiz' | 'exam' | 'assignment';

const TYPE_OPTIONS: Array<{ value: AssessmentType; label: string }> = [
    { value: 'quiz', label: 'Quiz' },
    { value: 'exam', label: 'Exam' },
    { value: 'assignment', label: 'Assignment' },
];

export default function CreateAssessmentScreen({ navigation }: any) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState<AssessmentType>('quiz');
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [subjectId, setSubjectId] = useState<string>('');
    const [totalMarks, setTotalMarks] = useState('20');
    const [duration, setDuration] = useState('30');
    const [dueDate, setDueDate] = useState('');
    const [loadingSubjects, setLoadingSubjects] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const data = await academicAPI.getAllSubjects();
                setSubjects(data);
                if (data.length > 0) setSubjectId(String(data[0].id));
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : 'Failed to load subjects';
                Alert.alert('Load Failed', msg);
            } finally {
                setLoadingSubjects(false);
            }
        })();
    }, []);

    const submit = async () => {
        if (!title.trim()) {
            Alert.alert('Missing Title', 'Enter an assessment title.');
            return;
        }
        if (!subjectId) {
            Alert.alert('Missing Subject', 'Select a subject.');
            return;
        }
        const marksNum = Number(totalMarks);
        const durationNum = Number(duration);
        if (Number.isNaN(marksNum) || marksNum <= 0) {
            Alert.alert('Invalid Marks', 'Total marks must be a positive number.');
            return;
        }
        if (Number.isNaN(durationNum) || durationNum <= 0) {
            Alert.alert('Invalid Duration', 'Duration must be a positive number of minutes.');
            return;
        }
        if (dueDate && !/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/.test(dueDate.trim())) {
            Alert.alert('Invalid Date', 'Due date must be YYYY-MM-DD or YYYY-MM-DDTHH:MM.');
            return;
        }

        setSubmitting(true);
        try {
            const payload: any = {
                title: title.trim(),
                description: description.trim(),
                type,
                subject: Number(subjectId),
                total_marks: marksNum,
                duration_minutes: durationNum,
            };
            if (dueDate.trim()) payload.due_date = dueDate.trim();

            await academicAPI.createAssessment(payload);
            Alert.alert('Success', 'Assessment created.', [
                { text: 'OK', onPress: () => navigation.goBack() },
            ]);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to create assessment';
            Alert.alert('Create Failed', msg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
            <View style={styles.heroCard}>
                <Text style={styles.heroBadge}>NEW ASSESSMENT</Text>
                <Text style={styles.heroTitle}>Create Assessment</Text>
                <Text style={styles.heroSubtitle}>Set the basics now — add questions after.</Text>
            </View>

            <View style={styles.sectionCard}>
                <Text style={styles.label}>Title</Text>
                <TextInput
                    style={styles.input}
                    value={title}
                    onChangeText={setTitle}
                    placeholder="e.g. Mid-term Physics Quiz"
                />

                <Text style={styles.label}>Description (optional)</Text>
                <TextInput
                    style={[styles.input, styles.multiInput]}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Brief instructions for students"
                    multiline
                />

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

                <Text style={styles.label}>Subject</Text>
                {loadingSubjects ? (
                    <ActivityIndicator color={Colors.primary} />
                ) : subjects.length === 0 ? (
                    <Text style={styles.mutedText}>No subjects available.</Text>
                ) : (
                    <View style={styles.chipRow}>
                        {subjects.map((s) => {
                            const sid = String(s.id);
                            const isActive = sid === subjectId;
                            return (
                                <TouchableOpacity
                                    key={sid}
                                    onPress={() => setSubjectId(sid)}
                                    style={[styles.chip, isActive && styles.chipActive]}
                                >
                                    <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                                        {s.name}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}

                <View style={styles.rowSplit}>
                    <View style={styles.colSplit}>
                        <Text style={styles.label}>Total Marks</Text>
                        <TextInput
                            style={styles.input}
                            value={totalMarks}
                            onChangeText={setTotalMarks}
                            keyboardType="numeric"
                            placeholder="20"
                        />
                    </View>
                    <View style={styles.colSplit}>
                        <Text style={styles.label}>Duration (min)</Text>
                        <TextInput
                            style={styles.input}
                            value={duration}
                            onChangeText={setDuration}
                            keyboardType="numeric"
                            placeholder="30"
                        />
                    </View>
                </View>

                <Text style={styles.label}>Due Date (optional, YYYY-MM-DD)</Text>
                <TextInput
                    style={styles.input}
                    value={dueDate}
                    onChangeText={setDueDate}
                    placeholder="2026-06-15"
                    autoCapitalize="none"
                />
            </View>

            <TouchableOpacity
                style={styles.submitBtn}
                onPress={submit}
                disabled={submitting}
            >
                {submitting ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.submitBtnText}>Create Assessment</Text>
                )}
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: Colors.gray50 },
    content: { padding: 16, paddingBottom: 32 },
    heroCard: {
        backgroundColor: Colors.primary,
        borderRadius: 18,
        padding: 18,
        marginBottom: 14,
        ...Shadows.md,
    },
    heroBadge: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
    heroTitle: { color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 4 },
    heroSubtitle: { color: 'rgba(255,255,255,0.9)', marginTop: 4, fontSize: 13 },
    sectionCard: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 14,
        marginBottom: 14,
        ...Shadows.sm,
    },
    label: { color: Colors.gray700, fontSize: 12, fontWeight: '700', marginTop: 8, marginBottom: 6, letterSpacing: 0.5 },
    mutedText: { color: Colors.gray500, fontSize: 13 },
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
    multiInput: { minHeight: 80, textAlignVertical: 'top' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
        borderWidth: 1, borderColor: Colors.gray200, backgroundColor: '#fff',
    },
    chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    chipText: { color: Colors.gray700, fontSize: 12, fontWeight: '700' },
    chipTextActive: { color: '#fff' },
    rowSplit: { flexDirection: 'row', gap: 12 },
    colSplit: { flex: 1 },
    submitBtn: {
        backgroundColor: Colors.primary,
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        ...Shadows.sm,
    },
    submitBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
