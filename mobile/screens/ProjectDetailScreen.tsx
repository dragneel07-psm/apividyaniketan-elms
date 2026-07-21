// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import React, { useCallback, useEffect, useState } from 'react';
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

import { Colors, Shadows } from '../constants/theme';
import { getCurrentUser, User } from '../lib/api';
import {
    Project,
    ProjectMember,
    ProjectStatus,
    ProjectTask,
    ProjectUpdate,
    TaskStatus,
    projectsAPI,
    useProjectSocket,
} from '../lib/projects';

const STATUS_OPTIONS: TaskStatus[] = ['todo', 'in_progress', 'review', 'done', 'blocked'];

const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
    todo: 'To Do',
    in_progress: 'In Progress',
    review: 'Review',
    done: 'Done',
    blocked: 'Blocked',
};

const PROJECT_STATUS_TONE: Record<ProjectStatus, { bg: string; fg: string }> = {
    draft: { bg: Colors.gray100, fg: Colors.gray500 },
    active: { bg: '#dbeafe', fg: '#1d4ed8' },
    submitted: { bg: '#fef3c7', fg: '#b45309' },
    graded: { bg: '#dcfce7', fg: '#15803d' },
    archived: { bg: Colors.gray100, fg: Colors.gray400 },
};

function progressColor(value: number): string {
    if (value >= 70) return '#10b981';
    if (value >= 40) return '#f59e0b';
    return '#f43f5e';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function ProjectDetailScreen({ route, navigation }: any) {
    const id: string = route.params.id;
    const [project, setProject] = useState<Project | null>(null);
    const [tasks, setTasks] = useState<ProjectTask[]>([]);
    const [members, setMembers] = useState<ProjectMember[]>([]);
    const [updates, setUpdates] = useState<ProjectUpdate[]>([]);
    const [me, setMe] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const load = useCallback(async () => {
        try {
            const [p, t, m, u, currentUser] = await Promise.all([
                projectsAPI.get(id),
                projectsAPI.tasks(id),
                projectsAPI.listMembers(id).catch(() => [] as ProjectMember[]),
                projectsAPI.updates(id),
                getCurrentUser(),
            ]);
            setProject(p);
            setTasks(t);
            setMembers(m);
            setUpdates(u);
            setMe(currentUser);
        } catch (err) {
            Alert.alert('Failed to load project', err instanceof Error ? err.message : 'Try again.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [id]);

    useEffect(() => {
        load();
    }, [load]);

    // Live updates: any server event triggers a refetch.
    useProjectSocket(id, () => load());

    const myFullName = me ? `${me.first_name} ${me.last_name}`.trim() : '';
    const isLeader = Boolean(
        project?.leader_detail && myFullName && project.leader_detail.name === myFullName,
    );

    const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
        try {
            const updated = await projectsAPI.setTaskStatus(taskId, newStatus);
            setTasks((prev) => prev.map((t) => (t.task_id === taskId ? updated : t)));
        } catch (err) {
            Alert.alert('Update failed', err instanceof Error ? err.message : 'Try again.');
        }
    };

    const handlePostComment = async () => {
        const trimmed = comment.trim();
        if (!trimmed || !project) return;
        try {
            await projectsAPI.comment(project.project_id, trimmed);
            setComment('');
            const fresh = await projectsAPI.updates(project.project_id);
            setUpdates(fresh);
        } catch {
            Alert.alert('Comment failed', 'Try again later.');
        }
    };

    const handleSubmitProject = () => {
        if (!project) return;
        Alert.alert(
            'Submit project?',
            'Once submitted, only the mentor can change anything.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Submit',
                    style: 'default',
                    onPress: async () => {
                        setSubmitting(true);
                        try {
                            await projectsAPI.submit(project.project_id);
                            await load();
                        } catch (err) {
                            Alert.alert(
                                'Submit failed',
                                err instanceof Error ? err.message : 'Try again.',
                            );
                        } finally {
                            setSubmitting(false);
                        }
                    },
                },
            ],
        );
    };

    if (loading || !project) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator color={Colors.primary} size="large" />
            </View>
        );
    }

    const tone = PROJECT_STATUS_TONE[project.status];

    return (
        <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={() => {
                        setRefreshing(true);
                        load();
                    }}
                />
            }
        >
            <View style={styles.headerCard}>
                <View style={styles.cardHeader}>
                    <Text style={styles.title}>{project.title}</Text>
                    <View style={[styles.badge, { backgroundColor: tone.bg }]}>
                        <Text style={[styles.badgeText, { color: tone.fg }]}>{project.status}</Text>
                    </View>
                </View>
                {project.mentor_detail ? (
                    <Text style={styles.muted}>Mentor: {project.mentor_detail.full_name}</Text>
                ) : null}
                <View style={styles.progressRow}>
                    <Text style={styles.muted}>{project.progress_label}</Text>
                    <Text style={styles.progressPercent}>
                        {Math.round(project.progress_percent)}%
                    </Text>
                </View>
                <View style={styles.progressTrack}>
                    <View
                        style={[
                            styles.progressFill,
                            {
                                width: `${Math.max(0, Math.min(100, project.progress_percent))}%`,
                                backgroundColor: progressColor(project.progress_percent),
                            },
                        ]}
                    />
                </View>
                {project.due_date ? (
                    <Text style={styles.muted}>
                        Due {new Date(project.due_date).toLocaleString()}
                    </Text>
                ) : null}
                {project.final_grade != null ? (
                    <Text style={styles.grade}>Final grade: {project.final_grade}</Text>
                ) : null}
                {isLeader && project.status === 'active' ? (
                    <TouchableOpacity
                        style={styles.submitButton}
                        onPress={handleSubmitProject}
                        disabled={submitting}
                    >
                        <Text style={styles.submitButtonText}>
                            {submitting ? 'Submitting…' : 'Submit project'}
                        </Text>
                    </TouchableOpacity>
                ) : null}
            </View>

            <Section title={`Members (${members.length})`}>
                {members.length === 0 ? (
                    <Text style={styles.muted}>No members yet.</Text>
                ) : (
                    members.map((m) => {
                        const isLeaderRow = m.role === 'leader' || m.student === project.leader;
                        return (
                            <View key={m.membership_id} style={styles.memberRow}>
                                <Text style={styles.memberName}>
                                    {m.student_detail?.name || m.student}
                                </Text>
                                {isLeaderRow ? (
                                    <View style={[styles.badge, styles.leaderBadge]}>
                                        <Text style={[styles.badgeText, { color: '#92400e' }]}>Leader</Text>
                                    </View>
                                ) : null}
                            </View>
                        );
                    })
                )}
            </Section>

            <Section title={`Tasks (${tasks.length})`}>
                {tasks.length === 0 ? (
                    <Text style={styles.muted}>No tasks yet.</Text>
                ) : (
                    tasks.map((t) => {
                        const canEdit = isLeader
                            || (t.assignee_detail && t.assignee_detail.name === myFullName);
                        return (
                            <View key={t.task_id} style={styles.taskRow}>
                                <View style={styles.taskRowHeader}>
                                    <Text style={styles.taskTitle}>{t.title}</Text>
                                    {t.is_overdue && t.status !== 'done' ? (
                                        <Text style={styles.overdue}>Overdue</Text>
                                    ) : null}
                                </View>
                                {t.assignee_detail ? (
                                    <Text style={styles.muted}>For: {t.assignee_detail.name}</Text>
                                ) : null}
                                <View style={styles.statusRow}>
                                    {STATUS_OPTIONS.map((opt) => {
                                        const isActive = t.status === opt;
                                        return (
                                            <TouchableOpacity
                                                key={opt}
                                                style={[
                                                    styles.statusPill,
                                                    isActive && styles.statusPillActive,
                                                    !canEdit && !isActive && styles.statusPillDisabled,
                                                ]}
                                                onPress={() =>
                                                    canEdit && !isActive
                                                        ? handleStatusChange(t.task_id, opt)
                                                        : undefined
                                                }
                                                disabled={!canEdit || isActive}
                                            >
                                                <Text
                                                    style={[
                                                        styles.statusPillText,
                                                        isActive && styles.statusPillTextActive,
                                                    ]}
                                                >
                                                    {TASK_STATUS_LABEL[opt]}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        );
                    })
                )}
            </Section>

            <Section title="Activity">
                <View style={styles.commentRow}>
                    <TextInput
                        style={styles.commentInput}
                        placeholder="Comment for the team…"
                        value={comment}
                        onChangeText={setComment}
                        multiline
                    />
                    <TouchableOpacity
                        style={[styles.commentButton, !comment.trim() && styles.commentButtonDisabled]}
                        onPress={handlePostComment}
                        disabled={!comment.trim()}
                    >
                        <Text style={styles.commentButtonText}>Post</Text>
                    </TouchableOpacity>
                </View>
                {updates.length === 0 ? (
                    <Text style={styles.muted}>No activity yet.</Text>
                ) : (
                    updates.map((u) => (
                        <View key={u.update_id} style={styles.updateRow}>
                            <View style={styles.updateHeader}>
                                <Text style={styles.updateAuthor}>
                                    {u.author_detail?.full_name || 'System'}
                                </Text>
                                <Text style={styles.muted}>
                                    {new Date(u.created_at).toLocaleString()}
                                </Text>
                            </View>
                            <Text style={styles.updateKind}>{u.kind}</Text>
                            {u.body ? <Text style={styles.updateBody}>{u.body}</Text> : null}
                        </View>
                    ))
                )}
            </Section>

            {project.description ? (
                <Section title="Description">
                    <Text style={styles.description}>{project.description}</Text>
                </Section>
            ) : null}

            <TouchableOpacity onPress={navigation.goBack} style={styles.backButton}>
                <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <View style={styles.sectionBody}>{children}</View>
        </View>
    );
}

const styles = StyleSheet.create({
    scroll: { flex: 1, backgroundColor: Colors.gray50 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    content: { padding: 12, gap: 12 },
    headerCard: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        gap: 8,
        ...Shadows.sm,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontSize: 18, fontWeight: '700' as const, color: Colors.gray800, flex: 1, marginRight: 8 },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
    badgeText: { fontSize: 11, fontWeight: '600' as const, textTransform: 'uppercase' as const },
    leaderBadge: { backgroundColor: '#fef3c7' },
    muted: { color: Colors.gray500, fontSize: 12 },
    progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
    progressPercent: { fontWeight: '700' as const, color: Colors.gray700 },
    progressTrack: { height: 6, borderRadius: 999, backgroundColor: Colors.gray200, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 999 },
    grade: { fontSize: 14, color: Colors.gray700, fontWeight: '600' as const },
    submitButton: {
        marginTop: 8,
        backgroundColor: Colors.primary,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    submitButtonText: { color: '#fff', fontWeight: '700' as const },
    section: {
        backgroundColor: '#fff',
        padding: 14,
        borderRadius: 12,
        ...Shadows.sm,
    },
    sectionTitle: { fontSize: 14, fontWeight: '700' as const, color: Colors.gray700, marginBottom: 8 },
    sectionBody: { gap: 10 },
    memberRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 6,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: Colors.gray200,
    },
    memberName: { color: Colors.gray700, fontWeight: '600' as const },
    taskRow: {
        paddingVertical: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: Colors.gray200,
        gap: 6,
    },
    taskRowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    taskTitle: { color: Colors.gray800, fontWeight: '600' as const, flex: 1, marginRight: 6 },
    overdue: { color: Colors.error, fontSize: 11, fontWeight: '700' as const },
    statusRow: { flexDirection: 'row', flexWrap: 'wrap' as const, gap: 6 },
    statusPill: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        backgroundColor: Colors.gray100,
    },
    statusPillActive: { backgroundColor: Colors.primary },
    statusPillDisabled: { opacity: 0.4 },
    statusPillText: { fontSize: 11, color: Colors.gray500, fontWeight: '600' as const },
    statusPillTextActive: { color: '#fff' },
    commentRow: { flexDirection: 'row', gap: 8 },
    commentInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: Colors.gray200,
        borderRadius: 8,
        padding: 10,
        minHeight: 40,
    },
    commentButton: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 14,
        borderRadius: 8,
        justifyContent: 'center',
    },
    commentButtonDisabled: { opacity: 0.4 },
    commentButtonText: { color: '#fff', fontWeight: '700' as const },
    updateRow: {
        paddingVertical: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: Colors.gray200,
    },
    updateHeader: { flexDirection: 'row', justifyContent: 'space-between' },
    updateAuthor: { fontWeight: '600' as const, color: Colors.gray700 },
    updateKind: { color: Colors.primary, fontSize: 11, textTransform: 'uppercase' as const },
    updateBody: { color: Colors.gray700, marginTop: 2 },
    description: { color: Colors.gray700, lineHeight: 20 },
    backButton: { padding: 12, alignItems: 'center' },
    backButtonText: { color: Colors.primary, fontWeight: '600' as const },
});
