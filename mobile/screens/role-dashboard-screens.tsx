// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    AcademicClass,
    academicAPI,
    billingAPI,
    Notice,
    ParentMeResponse,
    Section,
    StudentFee,
    StudentListItem,
    StudentProfileOverview,
    TeacherProfile,
    TeacherProfileOverview,
    TimetableEntry,
    User,
    UserRole,
    usersAPI,
} from '../lib/api';
import { Colors, Shadows } from '../constants/theme';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_ORDER: Record<string, number> = {
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
    Sunday: 7,
};

function sortedTimetable(entries: TimetableEntry[]): TimetableEntry[] {
    return [...entries].sort((a, b) => {
        const dayDiff = (DAY_ORDER[a.day_of_week] || 99) - (DAY_ORDER[b.day_of_week] || 99);
        if (dayDiff !== 0) return dayDiff;
        return a.start_time.localeCompare(b.start_time);
    });
}

function LoadingState({ message }: { message: string }) {
    return (
        <View style={styles.centered}>
            <ActivityIndicator color={Colors.primary} size="large" />
            <Text style={styles.loadingText}>{message}</Text>
        </View>
    );
}

function ErrorBox({ message }: { message: string }) {
    return (
        <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {message}</Text>
        </View>
    );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {children}
        </View>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>{message}</Text>
        </View>
    );
}

function ActionButton({
    title,
    onPress,
    variant = 'primary',
    loading = false,
    disabled = false,
}: {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'ghost' | 'danger' | 'success';
    loading?: boolean;
    disabled?: boolean;
}) {
    const styleMap = {
        primary: styles.primaryBtn,
        ghost: styles.ghostBtn,
        danger: styles.dangerBtn,
        success: styles.successBtn,
    };

    const textStyleMap = {
        primary: styles.primaryBtnText,
        ghost: styles.ghostBtnText,
        danger: styles.primaryBtnText,
        success: styles.primaryBtnText,
    };

    return (
        <TouchableOpacity
            style={[styleMap[variant], disabled && styles.disabledBtn]}
            onPress={onPress}
            disabled={loading || disabled}
        >
            {loading ? <ActivityIndicator color={variant === 'ghost' ? Colors.primary : '#fff'} size="small" /> : null}
            {!loading ? <Text style={textStyleMap[variant]}>{title}</Text> : null}
        </TouchableOpacity>
    );
}

function Tag({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
    return (
        <TouchableOpacity style={[styles.tag, active && styles.tagActive]} onPress={onPress}>
            <Text style={[styles.tagText, active && styles.tagTextActive]}>{label}</Text>
        </TouchableOpacity>
    );
}

function StatGrid({ stats }: { stats: Array<{ label: string; value: string | number }> }) {
    return (
        <View style={styles.grid}>
            {stats.map((item) => (
                <View key={item.label} style={styles.metricCard}>
                    <Text style={styles.metricValue}>{item.value}</Text>
                    <Text style={styles.metricLabel}>{item.label}</Text>
                </View>
            ))}
        </View>
    );
}

function useStandardRefresh(load: () => Promise<void>) {
    const [refreshing, setRefreshing] = useState(false);
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await load();
        } finally {
            setRefreshing(false);
        }
    }, [load]);
    return { refreshing, onRefresh };
}

function canComposeNotice(role: UserRole): boolean {
    return role === 'admin' || role === 'staff' || role === 'teacher' || role === 'saas_admin';
}

export function NoticeBoardScreen({ role = 'student' }: { role?: UserRole }) {
    const [notices, setNotices] = useState<Notice[]>([]);
    const [classes, setClasses] = useState<AcademicClass[]>([]);
    const [loading, setLoading] = useState(true);
    const [posting, setPosting] = useState(false);
    const [error, setError] = useState('');

    const [showComposer, setShowComposer] = useState(false);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [category, setCategory] = useState('General');
    const [priority, setPriority] = useState<'low' | 'normal' | 'high'>('normal');
    const [audience, setAudience] = useState<'school' | 'class'>('school');
    const [targetClass, setTargetClass] = useState<number | null>(null);

    const load = useCallback(async () => {
        try {
            setError('');
            const [noticeData, classData] = await Promise.all([
                academicAPI.getNotices(),
                canComposeNotice(role) ? academicAPI.getClasses().catch(() => []) : Promise.resolve([]),
            ]);
            setNotices(noticeData);
            setClasses(classData);
            if (classData.length > 0 && !targetClass) {
                setTargetClass(classData[0].id);
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to load notices';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, [role, targetClass]);

    useEffect(() => {
        load();
    }, [load]);

    const { refreshing, onRefresh } = useStandardRefresh(load);

    const submitNotice = async () => {
        if (!title.trim() || !content.trim()) {
            Alert.alert('Missing Fields', 'Title and content are required.');
            return;
        }

        if (audience === 'class' && !targetClass) {
            Alert.alert('Missing Class', 'Select class for class notice.');
            return;
        }

        setPosting(true);
        try {
            const created = await academicAPI.createNotice({
                title: title.trim(),
                content: content.trim(),
                category: category.trim() || 'General',
                priority,
                target_audience: audience,
                target_class: audience === 'class' ? targetClass : null,
            });
            setNotices((prev) => [created, ...prev]);
            setTitle('');
            setContent('');
            setCategory('General');
            setPriority('normal');
            setAudience('school');
            Alert.alert('Success', 'Notice published.');
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to publish notice';
            Alert.alert('Publish Failed', message);
        } finally {
            setPosting(false);
        }
    };

    if (loading) return <LoadingState message="Loading notices..." />;

    return (
        <ScrollView
            style={styles.screen}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            contentContainerStyle={styles.scrollBody}
        >
            {error ? <ErrorBox message={error} /> : null}

            {canComposeNotice(role) ? (
                <SectionCard title="Compose Notice">
                    <View style={styles.rowBetween}>
                        <Text style={styles.mutedLabel}>Publish updates for your school users</Text>
                        <ActionButton
                            title={showComposer ? 'Hide' : 'New Notice'}
                            onPress={() => setShowComposer((prev) => !prev)}
                            variant="ghost"
                        />
                    </View>

                    {showComposer ? (
                        <View>
                            <Text style={styles.inputLabel}>Title</Text>
                            <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Notice title" />

                            <Text style={styles.inputLabel}>Content</Text>
                            <TextInput
                                style={[styles.input, styles.multiInput]}
                                value={content}
                                onChangeText={setContent}
                                placeholder="Write notice details"
                                multiline
                            />

                            <Text style={styles.inputLabel}>Category</Text>
                            <TextInput style={styles.input} value={category} onChangeText={setCategory} placeholder="General" />

                            <Text style={styles.inputLabel}>Priority</Text>
                            <View style={styles.tagRow}>
                                {(['low', 'normal', 'high'] as const).map((item) => (
                                    <Tag key={item} label={item.toUpperCase()} active={priority === item} onPress={() => setPriority(item)} />
                                ))}
                            </View>

                            <Text style={styles.inputLabel}>Audience</Text>
                            <View style={styles.tagRow}>
                                <Tag label="SCHOOL" active={audience === 'school'} onPress={() => setAudience('school')} />
                                <Tag label="CLASS" active={audience === 'class'} onPress={() => setAudience('class')} />
                            </View>

                            {audience === 'class' ? (
                                <>
                                    <Text style={styles.inputLabel}>Target Class</Text>
                                    <View style={styles.tagRow}>
                                        {classes.length === 0 ? <Text style={styles.smallText}>No classes found</Text> : null}
                                        {classes.map((item) => (
                                            <Tag
                                                key={item.id}
                                                label={item.name}
                                                active={targetClass === item.id}
                                                onPress={() => setTargetClass(item.id)}
                                            />
                                        ))}
                                    </View>
                                </>
                            ) : null}

                            <ActionButton title="Publish Notice" onPress={submitNotice} loading={posting} />
                        </View>
                    ) : null}
                </SectionCard>
            ) : null}

            <SectionCard title="School Notices">
                {notices.length === 0 ? (
                    <EmptyState message="No notices available right now." />
                ) : (
                    notices.slice(0, 30).map((notice, idx) => (
                        <View key={`${notice.id || idx}-${notice.title}`} style={styles.noticeCard}>
                            <View style={styles.noticeHead}>
                                <Text style={styles.noticeTitle} numberOfLines={1}>
                                    {notice.title}
                                </Text>
                                <Text style={styles.noticePriority}>{(notice.priority || 'normal').toUpperCase()}</Text>
                            </View>
                            <Text style={styles.noticeBody}>{notice.content}</Text>
                            <Text style={styles.noticeMeta}>
                                {(notice.category || 'General').toUpperCase()}
                                {notice.published_date ? ` • ${new Date(notice.published_date).toLocaleString()}` : ''}
                            </Text>
                        </View>
                    ))
                )}
            </SectionCard>
        </ScrollView>
    );
}

export function TimetableScreen({ role }: { role: UserRole }) {
    const [mainEntries, setMainEntries] = useState<TimetableEntry[]>([]);
    const [secondaryEntries, setSecondaryEntries] = useState<TimetableEntry[]>([]);
    const [classes, setClasses] = useState<AcademicClass[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const [dayOfWeek, setDayOfWeek] = useState('Monday');
    const [startTime, setStartTime] = useState('15:00');
    const [endTime, setEndTime] = useState('16:00');
    const [subjectName, setSubjectName] = useState('');
    const [roomNumber, setRoomNumber] = useState('');
    const [selectedClassId, setSelectedClassId] = useState<number | null>(null);

    const load = useCallback(async () => {
        try {
            setError('');
            if (role === 'admin' || role === 'staff' || role === 'saas_admin') {
                const pending = await academicAPI.getPendingTimetableRequests();
                setMainEntries(sortedTimetable(pending));
                setSecondaryEntries([]);
            } else if (role === 'teacher') {
                const [myTimetable, myRequests, classData] = await Promise.all([
                    academicAPI.getMyTimetable(),
                    academicAPI.getMyTimetableRequests(),
                    academicAPI.getClasses().catch(() => []),
                ]);
                setMainEntries(sortedTimetable(myTimetable));
                setSecondaryEntries(sortedTimetable(myRequests));
                setClasses(classData);
                if (!selectedClassId && classData.length > 0) setSelectedClassId(classData[0].id);
            } else {
                const myTimetable = await academicAPI.getMyTimetable();
                setMainEntries(sortedTimetable(myTimetable));
                setSecondaryEntries([]);
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to load timetable';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, [role, selectedClassId]);

    useEffect(() => {
        load();
    }, [load]);

    const { refreshing, onRefresh } = useStandardRefresh(load);

    const heading = useMemo(() => {
        if (role === 'teacher') return 'My Timetable';
        if (role === 'admin' || role === 'staff' || role === 'saas_admin') return 'Pending Extra Class Requests';
        return 'Class Timetable';
    }, [role]);

    const approveRequest = async (entry: TimetableEntry, status: 'approved' | 'rejected') => {
        try {
            await academicAPI.approveTimetableRequest(entry.timetable_id, status);
            setMainEntries((prev) => prev.filter((item) => item.timetable_id !== entry.timetable_id));
            Alert.alert('Updated', `Request ${status}.`);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : `Failed to ${status} request`;
            Alert.alert('Action Failed', message);
        }
    };

    const submitTeacherRequest = async () => {
        if (!selectedClassId || !subjectName.trim() || !startTime.trim() || !endTime.trim()) {
            Alert.alert('Missing Fields', 'Class, subject, start time, and end time are required.');
            return;
        }

        setSubmitting(true);
        try {
            const created = await academicAPI.createTimetableRequest({
                academic_class: selectedClassId,
                day_of_week: dayOfWeek,
                start_time: startTime.trim(),
                end_time: endTime.trim(),
                subject_name: subjectName.trim(),
                room_number: roomNumber.trim() || undefined,
                entry_type: 'extra',
            });
            setSecondaryEntries((prev) => sortedTimetable([created, ...prev]));
            setSubjectName('');
            setRoomNumber('');
            Alert.alert('Submitted', 'Extra class request submitted for approval.');
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to create request';
            Alert.alert('Submit Failed', message);
        } finally {
            setSubmitting(false);
        }
    };

    const deleteTeacherRequest = async (entry: TimetableEntry) => {
        try {
            await academicAPI.deleteTimetableEntry(entry.timetable_id);
            setSecondaryEntries((prev) => prev.filter((item) => item.timetable_id !== entry.timetable_id));
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to delete request';
            Alert.alert('Delete Failed', message);
        }
    };

    if (loading) return <LoadingState message="Loading timetable..." />;

    return (
        <ScrollView
            style={styles.screen}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            contentContainerStyle={styles.scrollBody}
        >
            {error ? <ErrorBox message={error} /> : null}

            {role === 'teacher' ? (
                <SectionCard title="Request Extra Class">
                    <Text style={styles.inputLabel}>Class</Text>
                    <View style={styles.tagRow}>
                        {classes.length === 0 ? <Text style={styles.smallText}>No classes available</Text> : null}
                        {classes.map((item) => (
                            <Tag
                                key={item.id}
                                label={item.name}
                                active={selectedClassId === item.id}
                                onPress={() => setSelectedClassId(item.id)}
                            />
                        ))}
                    </View>

                    <Text style={styles.inputLabel}>Day</Text>
                    <View style={styles.tagRow}>
                        {DAYS.map((day) => (
                            <Tag key={day} label={day.slice(0, 3).toUpperCase()} active={dayOfWeek === day} onPress={() => setDayOfWeek(day)} />
                        ))}
                    </View>

                    <Text style={styles.inputLabel}>Subject</Text>
                    <TextInput style={styles.input} value={subjectName} onChangeText={setSubjectName} placeholder="e.g. Mathematics" />

                    <View style={styles.formRow}>
                        <View style={styles.formCol}>
                            <Text style={styles.inputLabel}>Start (HH:MM)</Text>
                            <TextInput style={styles.input} value={startTime} onChangeText={setStartTime} placeholder="15:00" />
                        </View>
                        <View style={styles.formCol}>
                            <Text style={styles.inputLabel}>End (HH:MM)</Text>
                            <TextInput style={styles.input} value={endTime} onChangeText={setEndTime} placeholder="16:00" />
                        </View>
                    </View>

                    <Text style={styles.inputLabel}>Room (optional)</Text>
                    <TextInput style={styles.input} value={roomNumber} onChangeText={setRoomNumber} placeholder="Room 204" />

                    <ActionButton title="Submit Request" onPress={submitTeacherRequest} loading={submitting} />
                </SectionCard>
            ) : null}

            <SectionCard title={heading}>
                {mainEntries.length === 0 ? (
                    <EmptyState message="No timetable entries found." />
                ) : (
                    mainEntries.slice(0, 80).map((item) => (
                        <View key={item.timetable_id} style={styles.timetableCard}>
                            <View style={styles.timetableHead}>
                                <Text style={styles.timetableSubject}>{item.subject_name}</Text>
                                <Text style={styles.timetableStatus}>{item.status.toUpperCase()}</Text>
                            </View>
                            <Text style={styles.timetableMeta}>
                                {item.day_of_week} • {item.start_time} - {item.end_time}
                            </Text>
                            <Text style={styles.timetableMeta}>Class: {item.academic_class_name || 'N/A'}</Text>
                            {item.teacher_name ? <Text style={styles.timetableMeta}>Teacher: {item.teacher_name}</Text> : null}

                            {role === 'admin' || role === 'staff' || role === 'saas_admin' ? (
                                <View style={styles.inlineActions}>
                                    <ActionButton title="Approve" variant="success" onPress={() => approveRequest(item, 'approved')} />
                                    <ActionButton title="Reject" variant="danger" onPress={() => approveRequest(item, 'rejected')} />
                                </View>
                            ) : null}
                        </View>
                    ))
                )}
            </SectionCard>

            {role === 'teacher' ? (
                <SectionCard title="My Extra Class Requests">
                    {secondaryEntries.length === 0 ? (
                        <EmptyState message="No extra class requests yet." />
                    ) : (
                        secondaryEntries.slice(0, 40).map((item) => (
                            <View key={`request-${item.timetable_id}`} style={styles.timetableCardSecondary}>
                                <Text style={styles.timetableSubject}>{item.subject_name}</Text>
                                <Text style={styles.timetableMeta}>
                                    {item.day_of_week} • {item.start_time} - {item.end_time}
                                </Text>
                                <Text style={styles.timetableMeta}>Class: {item.academic_class_name || 'N/A'}</Text>
                                <Text style={styles.timetableMeta}>Status: {item.status.toUpperCase()}</Text>
                                {item.status === 'pending' ? (
                                    <View style={styles.inlineActions}>
                                        <ActionButton
                                            title="Delete"
                                            variant="danger"
                                            onPress={() => deleteTeacherRequest(item)}
                                        />
                                    </View>
                                ) : null}
                            </View>
                        ))
                    )}
                </SectionCard>
            ) : null}
        </ScrollView>
    );
}

export function TeacherDashboardScreen() {
    const [me, setMe] = useState<User | null>(null);
    const [overview, setOverview] = useState<TeacherProfileOverview | null>(null);
    const [myTimetable, setMyTimetable] = useState<TimetableEntry[]>([]);
    const [notices, setNotices] = useState<Notice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        try {
            setError('');
            const user = await usersAPI.getMe();
            setMe(user);

            const teachers = await academicAPI.getTeachers();
            const myTeacher = teachers.find((teacher) => {
                if (teacher.user_id && user.user_id) return teacher.user_id === user.user_id;
                return (teacher.email || '').toLowerCase() === (user.email || '').toLowerCase();
            });

            const [timetable, noticesData, profileOverview] = await Promise.all([
                academicAPI.getMyTimetable().catch(() => []),
                academicAPI.getNotices().catch(() => []),
                myTeacher ? academicAPI.getTeacherProfileOverview(myTeacher.id).catch(() => null) : Promise.resolve(null),
            ]);

            setMyTimetable(sortedTimetable(timetable));
            setNotices(noticesData);
            setOverview(profileOverview);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to load teacher dashboard';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const { refreshing, onRefresh } = useStandardRefresh(load);

    if (loading) return <LoadingState message="Loading teacher dashboard..." />;

    const summary = overview?.summary;

    return (
        <ScrollView
            style={styles.screen}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            contentContainerStyle={styles.scrollBody}
        >
            <View style={styles.heroCard}>
                <Text style={styles.heroRole}>Teacher Dashboard</Text>
                <Text style={styles.heroName}>
                    {me?.first_name || 'Teacher'} {me?.last_name || ''}
                </Text>
                <Text style={styles.heroMeta}>{overview?.designation || 'Subject teacher'} • Teaching overview</Text>
            </View>

            {error ? <ErrorBox message={error} /> : null}

            <SectionCard title="Teaching Summary">
                <StatGrid
                    stats={[
                        { label: 'Subjects', value: summary?.total_subjects || 0 },
                        { label: 'Classes', value: summary?.total_classes || 0 },
                        { label: 'Lessons Done', value: summary?.taught_lessons || 0 },
                        { label: 'Progress', value: `${summary?.progress_percentage || 0}%` },
                    ]}
                />
            </SectionCard>

            <SectionCard title="Subjects & Progress">
                {(overview?.subjects || []).length === 0 ? (
                    <EmptyState message="No assigned subjects found." />
                ) : (
                    (overview?.subjects || []).slice(0, 14).map((item) => (
                        <View key={item.subject_id} style={styles.listRow}>
                            <Text style={styles.listTitle}>{item.subject_name}</Text>
                            <Text style={styles.listMeta}>
                                {item.class_name} • {item.progress_percentage}% complete • {item.role.replace('_', ' ')}
                            </Text>
                        </View>
                    ))
                )}
            </SectionCard>

            <SectionCard title="Upcoming Timetable Slots">
                {myTimetable.length === 0 ? (
                    <EmptyState message="No timetable entries available." />
                ) : (
                    myTimetable.slice(0, 12).map((item) => (
                        <View key={item.timetable_id} style={styles.listRow}>
                            <Text style={styles.listTitle}>{item.subject_name}</Text>
                            <Text style={styles.listMeta}>
                                {item.day_of_week} • {item.start_time} - {item.end_time} • {item.academic_class_name || 'Class'}
                            </Text>
                        </View>
                    ))
                )}
            </SectionCard>

            <SectionCard title="Notice Board">
                {notices.length === 0 ? (
                    <EmptyState message="No notices available." />
                ) : (
                    notices.slice(0, 5).map((item, idx) => (
                        <View key={`${item.id || idx}-${item.title}`} style={styles.noticeInline}>
                            <Text style={styles.noticeInlineTitle}>{item.title}</Text>
                            <Text style={styles.noticeInlineBody} numberOfLines={2}>
                                {item.content}
                            </Text>
                        </View>
                    ))
                )}
            </SectionCard>
        </ScrollView>
    );
}

export function TeacherStudentsScreen() {
    const [students, setStudents] = useState<StudentListItem[]>([]);
    const [overviewMap, setOverviewMap] = useState<Record<string, StudentProfileOverview>>({});
    const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        try {
            setError('');
            const list = await academicAPI.getStudents();
            setStudents(list);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to load students';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const { refreshing, onRefresh } = useStandardRefresh(load);

    const filteredStudents = useMemo(() => {
        const needle = search.trim().toLowerCase();
        if (!needle) return students;
        return students.filter((item) => {
            const fullName = `${item.first_name || ''} ${item.last_name || ''}`.toLowerCase();
            return (
                fullName.includes(needle) ||
                (item.email || '').toLowerCase().includes(needle) ||
                (item.class_name || '').toLowerCase().includes(needle)
            );
        });
    }, [students, search]);

    const openStudentOverview = async (student: StudentListItem) => {
        const key = student.id || student.student_id;
        if (expandedStudentId === key) {
            setExpandedStudentId(null);
            return;
        }

        setExpandedStudentId(key);
        if (overviewMap[key]) return;

        try {
            const details = await academicAPI.getStudentProfileOverview(key);
            setOverviewMap((prev) => ({ ...prev, [key]: details }));
        } catch {
            // Keep row expanded without analytics.
        }
    };

    if (loading) return <LoadingState message="Loading student analytics..." />;

    return (
        <ScrollView
            style={styles.screen}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            contentContainerStyle={styles.scrollBody}
        >
            {error ? <ErrorBox message={error} /> : null}

            <SectionCard title="Student Directory">
                <TextInput
                    style={styles.input}
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search by student name, email, class"
                />

                <StatGrid
                    stats={[
                        { label: 'Students', value: students.length },
                        {
                            label: 'Avg Focus',
                            value:
                                students.length > 0
                                    ? Math.round(
                                          students.reduce((acc, item) => acc + (item.focus_score || 0), 0) / students.length
                                      )
                                    : 0,
                        },
                    ]}
                />
            </SectionCard>

            <SectionCard title="Progress Explorer">
                {filteredStudents.length === 0 ? (
                    <EmptyState message="No students found." />
                ) : (
                    filteredStudents.slice(0, 80).map((student) => {
                        const key = student.id || student.student_id;
                        const details = overviewMap[key];
                        const isOpen = expandedStudentId === key;

                        return (
                            <TouchableOpacity key={key} style={styles.expandCard} onPress={() => openStudentOverview(student)}>
                                <Text style={styles.listTitle}>
                                    {(student.first_name || '').trim()} {(student.last_name || '').trim()}
                                </Text>
                                <Text style={styles.listMeta}>
                                    {student.class_name || 'No class'} {student.section_name ? `• ${student.section_name}` : ''}
                                </Text>

                                {isOpen ? (
                                    <View style={styles.expandBody}>
                                        {details ? (
                                            <>
                                                <Text style={styles.smallText}>
                                                    Progress: {details.overall?.progress_percentage || 0}%
                                                </Text>
                                                <Text style={styles.smallText}>
                                                    Avg Score: {details.overall?.average_score_percentage || 0}%
                                                </Text>
                                                <Text style={styles.smallText}>
                                                    Pending Assignments: {details.overall?.pending_assignments || 0}
                                                </Text>
                                                {(details.subject_progress || []).slice(0, 6).map((item) => (
                                                    <Text key={`${key}-${item.subject_id}`} style={styles.smallText}>
                                                        • {item.subject_name}: {item.progress_percentage}% (Avg {item.average_score_percentage}%)
                                                    </Text>
                                                ))}
                                            </>
                                        ) : (
                                            <Text style={styles.smallText}>Loading student analytics...</Text>
                                        )}
                                    </View>
                                ) : null}
                            </TouchableOpacity>
                        );
                    })
                )}
            </SectionCard>
        </ScrollView>
    );
}

export function ParentDashboardScreen() {
    const [me, setMe] = useState<User | null>(null);
    const [parentData, setParentData] = useState<ParentMeResponse | null>(null);
    const [childOverviews, setChildOverviews] = useState<StudentProfileOverview[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        try {
            setError('');
            const [user, parent] = await Promise.all([usersAPI.getMe(), academicAPI.getParentMe()]);
            setMe(user);
            setParentData(parent);

            const students = parent.students || [];
            const overviews = await Promise.all(
                students.slice(0, 8).map((student) =>
                    academicAPI.getStudentProfileOverview(student.id || student.student_id).catch(() => null)
                )
            );
            setChildOverviews(overviews.filter((item): item is StudentProfileOverview => !!item));
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to load parent dashboard';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const { refreshing, onRefresh } = useStandardRefresh(load);

    if (loading) return <LoadingState message="Loading parent dashboard..." />;

    return (
        <ScrollView
            style={styles.screen}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            contentContainerStyle={styles.scrollBody}
        >
            <View style={styles.heroCard}>
                <Text style={styles.heroRole}>Parent Dashboard</Text>
                <Text style={styles.heroName}>
                    {me?.first_name || 'Parent'} {me?.last_name || ''}
                </Text>
                <Text style={styles.heroMeta}>Track children progress, assignments, and results.</Text>
            </View>

            {error ? <ErrorBox message={error} /> : null}

            <SectionCard title="Children Overview">
                <StatGrid
                    stats={[
                        { label: 'Children', value: (parentData?.students || []).length },
                        {
                            label: 'Avg Progress',
                            value:
                                childOverviews.length > 0
                                    ? `${Math.round(
                                          childOverviews.reduce((acc, item) => acc + (item.overall?.progress_percentage || 0), 0) /
                                              childOverviews.length
                                      )}%`
                                    : '0%',
                        },
                        {
                            label: 'Pending Assignments',
                            value: childOverviews.reduce((acc, item) => acc + (item.overall?.pending_assignments || 0), 0),
                        },
                    ]}
                />
            </SectionCard>

            <SectionCard title="Child Progress">
                {childOverviews.length === 0 ? (
                    <EmptyState message="No linked children found." />
                ) : (
                    childOverviews.map((item) => (
                        <View key={item.student.id} style={styles.childCard}>
                            <Text style={styles.childName}>
                                {item.student.first_name || ''} {item.student.last_name || ''}
                            </Text>
                            <Text style={styles.childMeta}>
                                {item.student.class_name || 'Class not assigned'}
                                {item.student.section_name ? ` • Section ${item.student.section_name}` : ''}
                            </Text>
                            <Text style={styles.childMeta}>
                                Progress: {item.overall?.progress_percentage || 0}% • Average Score:{' '}
                                {item.overall?.average_score_percentage || 0}%
                            </Text>
                            <Text style={styles.childMeta}>
                                Assignments: {item.overall?.submitted_assignments || 0} submitted /{' '}
                                {item.overall?.total_assignments || 0}
                            </Text>
                        </View>
                    ))
                )}
            </SectionCard>
        </ScrollView>
    );
}

export function ParentChildrenScreen() {
    const [childOverviews, setChildOverviews] = useState<StudentProfileOverview[]>([]);
    const [expandedChildId, setExpandedChildId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        try {
            setError('');
            const parent = await academicAPI.getParentMe();
            const overviews = await Promise.all(
                (parent.students || []).map((student) =>
                    academicAPI.getStudentProfileOverview(student.id || student.student_id).catch(() => null)
                )
            );
            setChildOverviews(overviews.filter((item): item is StudentProfileOverview => !!item));
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to load student analytics';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const { refreshing, onRefresh } = useStandardRefresh(load);

    if (loading) return <LoadingState message="Loading child analytics..." />;

    return (
        <ScrollView
            style={styles.screen}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            contentContainerStyle={styles.scrollBody}
        >
            {error ? <ErrorBox message={error} /> : null}

            {childOverviews.length === 0 ? (
                <SectionCard title="Child Analytics">
                    <EmptyState message="No student analytics available." />
                </SectionCard>
            ) : (
                childOverviews.map((overview) => {
                    const childId = overview.student.id;
                    const isOpen = expandedChildId === childId;
                    return (
                        <TouchableOpacity
                            key={childId}
                            style={styles.expandCard}
                            onPress={() => setExpandedChildId(isOpen ? null : childId)}
                        >
                            <Text style={styles.listTitle}>
                                {`${overview.student.first_name || ''} ${overview.student.last_name || ''}`.trim() || 'Student'}
                            </Text>
                            <Text style={styles.listMeta}>
                                Progress: {overview.overall?.progress_percentage || 0}% • Avg Score:{' '}
                                {overview.overall?.average_score_percentage || 0}%
                            </Text>

                            {isOpen ? (
                                <View style={styles.expandBody}>
                                    <Text style={styles.smallText}>
                                        Pending Assignments: {overview.overall?.pending_assignments || 0}
                                    </Text>

                                    <Text style={[styles.smallText, styles.sectionMiniTitle]}>Subject Progress</Text>
                                    {(overview.subject_progress || []).slice(0, 8).map((subject) => (
                                        <Text key={`${childId}-${subject.subject_id}`} style={styles.smallText}>
                                            • {subject.subject_name}: {subject.progress_percentage}% (Avg {subject.average_score_percentage}%)
                                        </Text>
                                    ))}

                                    <Text style={[styles.smallText, styles.sectionMiniTitle]}>Recent Results</Text>
                                    {(overview.recent_results || []).slice(0, 5).map((result, idx) => (
                                        <Text key={`${childId}-result-${idx}`} style={styles.smallText}>
                                            • {result.assessment_title}: {result.percentage}% ({result.subject_name})
                                        </Text>
                                    ))}

                                    <Text style={[styles.smallText, styles.sectionMiniTitle]}>Assignments</Text>
                                    {(overview.assignments || []).slice(0, 6).map((item, idx) => (
                                        <Text key={`${childId}-assign-${idx}`} style={styles.smallText}>
                                            • {item.title}: {item.status}
                                        </Text>
                                    ))}
                                </View>
                            ) : null}
                        </TouchableOpacity>
                    );
                })
            )}
        </ScrollView>
    );
}

// ─── Parent Fees Screen ────────────────────────────────────────
const FEE_STATUS_COLOR: Record<string, string> = {
    paid: Colors.success, partial: Colors.warning,
    pending: Colors.primary, overdue: Colors.error, waived: Colors.gray400,
};

export function ParentFeesScreen() {
    const [children, setChildren] = useState<Array<{ id: string; name: string }>>([]);
    const [feesByChild, setFeesByChild] = useState<Record<string, StudentFee[]>>({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            const parent = await academicAPI.getParentMe();
            const kids = (parent.students || []).map((s: any) => ({
                id: s.id || s.student_id,
                name: `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Student',
            }));
            setChildren(kids);

            const feesMap: Record<string, StudentFee[]> = {};
            await Promise.all(kids.map(async (kid: { id: string; name: string }) => {
                const fees = await billingAPI.getStudentFees(kid.id).catch(() => []);
                feesMap[kid.id] = fees;
            }));
            setFeesByChild(feesMap);
        } catch (err) {
            console.error('Failed to load fees', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);
    const onRefresh = () => { setRefreshing(true); load(); };

    if (loading) return (
        <View style={styles.centered}>
            <ActivityIndicator color={Colors.primary} size="large" />
            <Text style={styles.loadingText}>Loading fees...</Text>
        </View>
    );

    return (
        <ScrollView
            style={styles.screen}
            contentContainerStyle={styles.scrollBody}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            <Text style={{ fontSize: 22, fontWeight: '800', color: Colors.gray900, marginBottom: 14 }}>
                Children's Fees
            </Text>

            {children.length === 0 ? (
                <SectionCard title="Fees">
                    <EmptyState message="No children linked to your account." />
                </SectionCard>
            ) : children.map(kid => {
                const fees = feesByChild[kid.id] || [];
                const outstanding = fees.reduce((s, f) => s + (f.amount - f.amount_paid - f.discount_amount), 0);
                const isOpen = expandedId === kid.id;

                return (
                    <TouchableOpacity
                        key={kid.id}
                        style={styles.expandCard}
                        onPress={() => setExpandedId(isOpen ? null : kid.id)}
                    >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={styles.childName}>{kid.name}</Text>
                            <Text style={{ color: outstanding > 0 ? Colors.error : Colors.success, fontWeight: '800', fontSize: 13 }}>
                                {outstanding > 0 ? `Rs ${outstanding.toLocaleString()} due` : '✓ Clear'}
                            </Text>
                        </View>
                        <Text style={styles.childMeta}>{fees.length} fee record{fees.length !== 1 ? 's' : ''}</Text>

                        {isOpen && (
                            <View style={styles.expandBody}>
                                {fees.length === 0 ? (
                                    <Text style={styles.smallText}>No fee records found.</Text>
                                ) : fees.map(fee => {
                                    const color = FEE_STATUS_COLOR[fee.status] || Colors.gray400;
                                    return (
                                        <View key={fee.student_fee_id} style={{
                                            borderLeftWidth: 3, borderLeftColor: color,
                                            paddingLeft: 10, marginTop: 10,
                                        }}>
                                            <Text style={{ fontWeight: '700', color: Colors.gray900, fontSize: 13 }}>
                                                {fee.fee_name}
                                            </Text>
                                            <Text style={styles.smallText}>
                                                Due: {new Date(fee.due_date).toLocaleDateString()} • Total: Rs {fee.amount.toLocaleString()}
                                            </Text>
                                            <Text style={[styles.smallText, { color, fontWeight: '700' }]}>
                                                {fee.status.toUpperCase()} — Rs {fee.amount_paid.toLocaleString()} paid
                                            </Text>
                                        </View>
                                    );
                                })}
                            </View>
                        )}
                    </TouchableOpacity>
                );
            })}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: Colors.gray50 },
    scrollBody: { padding: 16, paddingBottom: 32 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.gray50 },
    loadingText: { marginTop: 10, color: Colors.gray500, fontWeight: '600' },

    heroCard: {
        backgroundColor: Colors.primary,
        borderRadius: 18,
        padding: 18,
        marginBottom: 14,
        ...Shadows.md,
    },
    heroRole: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
    heroName: { color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 4 },
    heroMeta: { color: 'rgba(255,255,255,0.9)', marginTop: 4, fontSize: 13 },

    sectionCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 14,
        marginBottom: 12,
        ...Shadows.sm,
    },
    sectionTitle: { color: Colors.gray900, fontWeight: '800', fontSize: 16, marginBottom: 10 },

    errorBox: {
        backgroundColor: Colors.errorLight,
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
    },
    errorText: { color: Colors.error, fontWeight: '600', fontSize: 13 },

    emptyWrap: {
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: Colors.gray300,
        borderRadius: 12,
        padding: 14,
    },
    emptyText: { color: Colors.gray500, textAlign: 'center', fontSize: 13 },

    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    metricCard: {
        width: '48%',
        borderWidth: 1,
        borderColor: Colors.gray200,
        borderRadius: 12,
        padding: 12,
        marginBottom: 10,
    },
    metricValue: { color: Colors.primary, fontSize: 20, fontWeight: '800' },
    metricLabel: { color: Colors.gray500, fontSize: 12, marginTop: 4 },

    inputLabel: { color: Colors.gray700, fontWeight: '700', fontSize: 12, marginBottom: 6, marginTop: 8 },
    input: {
        borderWidth: 1,
        borderColor: Colors.gray200,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: Colors.gray900,
        fontSize: 14,
        backgroundColor: '#fff',
    },
    multiInput: {
        minHeight: 90,
        textAlignVertical: 'top',
    },
    formRow: { flexDirection: 'row', justifyContent: 'space-between' },
    formCol: { width: '48%' },

    tagRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 2, marginBottom: 6 },
    tag: {
        borderWidth: 1,
        borderColor: Colors.gray300,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
        marginRight: 8,
        marginBottom: 8,
        backgroundColor: '#fff',
    },
    tagActive: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primarySurface,
    },
    tagText: { color: Colors.gray600, fontSize: 11, fontWeight: '700' },
    tagTextActive: { color: Colors.primary },

    primaryBtn: {
        marginTop: 12,
        backgroundColor: Colors.primary,
        borderRadius: 12,
        paddingVertical: 11,
        paddingHorizontal: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    successBtn: {
        marginTop: 10,
        backgroundColor: Colors.success,
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    dangerBtn: {
        marginTop: 10,
        backgroundColor: Colors.error,
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    ghostBtn: {
        borderWidth: 1,
        borderColor: Colors.primary,
        borderRadius: 12,
        paddingVertical: 8,
        paddingHorizontal: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    disabledBtn: { opacity: 0.6 },
    primaryBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
    ghostBtnText: { color: Colors.primary, fontSize: 13, fontWeight: '800' },

    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    mutedLabel: { color: Colors.gray500, fontSize: 12, flexShrink: 1, marginRight: 10 },

    listRow: {
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray100,
        paddingVertical: 10,
    },
    listTitle: { color: Colors.gray800, fontSize: 14, fontWeight: '700' },
    listMeta: { color: Colors.gray500, fontSize: 12, marginTop: 2 },

    noticeInline: {
        borderWidth: 1,
        borderColor: Colors.gray200,
        borderRadius: 12,
        padding: 10,
        marginBottom: 8,
    },
    noticeInlineTitle: { color: Colors.gray900, fontWeight: '700', fontSize: 13 },
    noticeInlineBody: { color: Colors.gray600, fontSize: 12, marginTop: 4 },

    timetableCard: {
        borderWidth: 1,
        borderColor: Colors.gray200,
        borderRadius: 12,
        padding: 10,
        marginBottom: 8,
    },
    timetableCardSecondary: {
        borderWidth: 1,
        borderColor: Colors.gray200,
        borderRadius: 12,
        padding: 10,
        marginBottom: 8,
        backgroundColor: Colors.primarySurface,
    },
    timetableHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    timetableSubject: { color: Colors.gray900, fontWeight: '700', fontSize: 13, flexShrink: 1, marginRight: 8 },
    timetableStatus: { color: Colors.primary, fontSize: 11, fontWeight: '700' },
    timetableMeta: { color: Colors.gray500, fontSize: 12, marginTop: 3 },
    inlineActions: { flexDirection: 'row', marginTop: 6 },

    noticeCard: {
        borderWidth: 1,
        borderColor: Colors.gray200,
        borderRadius: 14,
        padding: 12,
        marginBottom: 8,
    },
    noticeHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    noticeTitle: { color: Colors.gray900, fontWeight: '800', fontSize: 13, flexShrink: 1, marginRight: 8 },
    noticePriority: { color: Colors.primary, fontWeight: '700', fontSize: 11 },
    noticeBody: { color: Colors.gray600, fontSize: 12, marginTop: 4, lineHeight: 18 },
    noticeMeta: { color: Colors.gray400, fontSize: 11, marginTop: 6 },

    childCard: {
        borderWidth: 1,
        borderColor: Colors.gray200,
        borderRadius: 12,
        padding: 10,
        marginBottom: 8,
    },
    childName: { color: Colors.gray900, fontSize: 14, fontWeight: '800' },
    childMeta: { color: Colors.gray600, fontSize: 12, marginTop: 4 },

    expandCard: {
        borderWidth: 1,
        borderColor: Colors.gray200,
        borderRadius: 12,
        padding: 10,
        marginTop: 8,
    },
    expandBody: {
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: Colors.gray100,
    },
    smallText: { color: Colors.gray600, fontSize: 12, marginTop: 2 },
    sectionMiniTitle: { marginTop: 8, color: Colors.gray800, fontWeight: '700' },
});
