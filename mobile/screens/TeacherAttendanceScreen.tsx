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
    AcademicClass,
    StudentListItem,
    Subject,
} from '../lib/api';
import { Colors, Shadows } from '../constants/theme';

type Status = 'present' | 'absent' | 'late';

const STATUS_OPTIONS: Array<{ value: Status; label: string; icon: string; color: string; bg: string }> = [
    { value: 'present', label: 'Present', icon: '✓', color: Colors.success, bg: Colors.successLight },
    { value: 'late', label: 'Late', icon: '⏱', color: Colors.warning, bg: Colors.warningLight },
    { value: 'absent', label: 'Absent', icon: '✕', color: Colors.error, bg: Colors.errorLight },
];

function formatStudentName(student: StudentListItem): string {
    const full = `${student.first_name || ''} ${student.last_name || ''}`.trim();
    return full || student.email || 'Student';
}

function todayISO(): string {
    return new Date().toISOString().slice(0, 10);
}

export default function TeacherAttendanceScreen() {
    const [classes, setClasses] = useState<AcademicClass[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
    const [students, setStudents] = useState<StudentListItem[]>([]);
    const [status, setStatus] = useState<Record<string, Status>>({});
    const [date, setDate] = useState<string>(todayISO());
    const [loadingClasses, setLoadingClasses] = useState(true);
    const [loadingRoster, setLoadingRoster] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const list = await academicAPI.getClasses();
                setClasses(list);
                if (list.length > 0) setSelectedClassId(String(list[0].id));
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Failed to load classes';
                Alert.alert('Load Failed', message);
            } finally {
                setLoadingClasses(false);
            }
        })();
    }, []);

    const loadRoster = useCallback(async () => {
        if (!selectedClassId) return;
        setLoadingRoster(true);
        try {
            const classIdNum = Number(selectedClassId);
            const [allStudents, classSubjects] = await Promise.all([
                academicAPI.getStudents(),
                academicAPI.getSubjectsByClass(classIdNum).catch(() => [] as Subject[]),
            ]);

            setSubjects(classSubjects);
            setSelectedSubjectId(classSubjects.length > 0 ? String(classSubjects[0].id) : '');

            // Mobile StudentListItem lacks academic_class, fall back to /students/{id}/ if needed.
            // For now show all students returned by the backend — backend filtering is preferred.
            setStudents(allStudents);
            const initial: Record<string, Status> = {};
            allStudents.forEach((s) => { initial[s.id || s.student_id] = 'present'; });
            setStatus(initial);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to load roster';
            Alert.alert('Load Failed', message);
        } finally {
            setLoadingRoster(false);
        }
    }, [selectedClassId]);

    useEffect(() => {
        loadRoster();
    }, [loadRoster]);

    const setStudentStatus = (studentId: string, next: Status) => {
        setStatus((prev) => ({ ...prev, [studentId]: next }));
    };

    const submit = async () => {
        if (!selectedSubjectId) {
            Alert.alert('Pick Subject', 'Please select a subject first.');
            return;
        }
        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            Alert.alert('Invalid Date', 'Date must be in YYYY-MM-DD format.');
            return;
        }
        if (students.length === 0) {
            Alert.alert('No Students', 'No students to mark in this class.');
            return;
        }

        setSubmitting(true);
        try {
            await Promise.all(
                students.map((student) =>
                    academicAPI.createAttendance({
                        student: student.id || student.student_id,
                        subject: Number(selectedSubjectId),
                        date,
                        status: status[student.id || student.student_id] || 'present',
                        remarks: '',
                    })
                )
            );
            Alert.alert('Success', 'Attendance submitted successfully.');
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to submit attendance';
            Alert.alert('Submit Failed', message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loadingClasses) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator color={Colors.primary} size="large" />
                <Text style={styles.loadingText}>Loading classes...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
            <View style={styles.heroCard}>
                <Text style={styles.heroBadge}>TEACHER</Text>
                <Text style={styles.heroTitle}>Daily Attendance</Text>
                <Text style={styles.heroSubtitle}>Mark attendance for your classes.</Text>
            </View>

            <View style={styles.sectionCard}>
                <Text style={styles.label}>Class</Text>
                <View style={styles.chipRow}>
                    {classes.map((c) => {
                        const cid = String(c.id);
                        const isActive = cid === selectedClassId;
                        return (
                            <TouchableOpacity
                                key={cid}
                                onPress={() => setSelectedClassId(cid)}
                                style={[styles.chip, isActive && styles.chipActive]}
                            >
                                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                                    {c.name}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <Text style={styles.label}>Subject</Text>
                {subjects.length === 0 ? (
                    <Text style={styles.mutedText}>No subjects for this class.</Text>
                ) : (
                    <View style={styles.chipRow}>
                        {subjects.map((s) => {
                            const sid = String(s.id);
                            const isActive = sid === selectedSubjectId;
                            return (
                                <TouchableOpacity
                                    key={sid}
                                    onPress={() => setSelectedSubjectId(sid)}
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

                <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
                <TextInput
                    style={styles.dateInput}
                    value={date}
                    onChangeText={setDate}
                    placeholder="YYYY-MM-DD"
                    autoCapitalize="none"
                />
            </View>

            <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Roster</Text>
                {loadingRoster ? (
                    <View style={styles.centeredInline}>
                        <ActivityIndicator color={Colors.primary} />
                    </View>
                ) : students.length === 0 ? (
                    <Text style={styles.mutedText}>No students in this class.</Text>
                ) : (
                    students.map((student) => {
                        const id = student.id || student.student_id;
                        const current = status[id] || 'present';
                        return (
                            <View key={id} style={styles.studentRow}>
                                <View style={styles.studentInfo}>
                                    <View style={styles.avatar}>
                                        <Text style={styles.avatarText}>
                                            {(student.first_name?.[0] || '?').toUpperCase()}
                                            {(student.last_name?.[0] || '').toUpperCase()}
                                        </Text>
                                    </View>
                                    <View style={styles.nameBlock}>
                                        <Text style={styles.studentName}>{formatStudentName(student)}</Text>
                                        {student.email ? (
                                            <Text style={styles.studentEmail}>{student.email}</Text>
                                        ) : null}
                                    </View>
                                </View>
                                <View style={styles.statusRow}>
                                    {STATUS_OPTIONS.map((opt) => {
                                        const isActive = current === opt.value;
                                        return (
                                            <TouchableOpacity
                                                key={opt.value}
                                                onPress={() => setStudentStatus(id, opt.value)}
                                                style={[
                                                    styles.statusBtn,
                                                    isActive && { backgroundColor: opt.bg, borderColor: opt.color },
                                                ]}
                                            >
                                                <Text style={[
                                                    styles.statusBtnText,
                                                    isActive && { color: opt.color },
                                                ]}>
                                                    {opt.icon}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        );
                    })
                )}
            </View>

            {students.length > 0 && (
                <TouchableOpacity
                    style={styles.submitBtn}
                    onPress={submit}
                    disabled={submitting}
                >
                    {submitting ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.submitBtnText}>Submit Attendance</Text>
                    )}
                </TouchableOpacity>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: Colors.gray50 },
    content: { padding: 16, paddingBottom: 32 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: Colors.gray50 },
    centeredInline: { paddingVertical: 24, alignItems: 'center' },
    loadingText: { color: Colors.gray600, marginTop: 8 },
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
        marginBottom: 12,
        ...Shadows.sm,
    },
    sectionTitle: { fontWeight: '800', color: Colors.gray900, fontSize: 15, marginBottom: 10 },
    label: { color: Colors.gray700, fontSize: 12, fontWeight: '700', marginTop: 4, marginBottom: 8, letterSpacing: 0.5 },
    mutedText: { color: Colors.gray500, fontSize: 13, marginBottom: 4 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
    chip: {
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
        borderWidth: 1, borderColor: Colors.gray200, backgroundColor: '#fff',
    },
    chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    chipText: { color: Colors.gray700, fontSize: 12, fontWeight: '700' },
    chipTextActive: { color: '#fff' },
    dateInput: {
        borderWidth: 1,
        borderColor: Colors.gray200,
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: Colors.gray900,
        fontSize: 14,
    },
    studentRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray100,
    },
    studentInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
    avatar: {
        width: 34, height: 34, borderRadius: 999,
        backgroundColor: Colors.primarySurface,
        alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { color: Colors.primary, fontWeight: '800', fontSize: 12 },
    nameBlock: { marginLeft: 10, flex: 1 },
    studentName: { color: Colors.gray900, fontSize: 13, fontWeight: '700' },
    studentEmail: { color: Colors.gray500, fontSize: 11, marginTop: 2 },
    statusRow: { flexDirection: 'row', gap: 6 },
    statusBtn: {
        width: 34, height: 34, borderRadius: 8,
        borderWidth: 1, borderColor: Colors.gray200,
        backgroundColor: '#fff',
        alignItems: 'center', justifyContent: 'center',
    },
    statusBtnText: { fontSize: 14, fontWeight: '800', color: Colors.gray500 },
    submitBtn: {
        backgroundColor: Colors.primary,
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        ...Shadows.sm,
    },
    submitBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
