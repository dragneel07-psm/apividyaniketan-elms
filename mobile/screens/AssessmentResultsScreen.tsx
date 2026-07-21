// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { academicAPI, Submission } from '../lib/api';
import { Colors, Radius, Shadows, Spacing } from '../constants/theme';

type Params = {
    submissionId: string;
    score?: number;
    maxScore?: number;
    title?: string;
};

export default function AssessmentResultsScreen({ route, navigation }: any) {
    const { submissionId, score: initialScore, maxScore: initialMax, title }: Params = route.params || {};
    const [submission, setSubmission] = useState<Submission | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        navigation.setOptions({ title: title || 'Result', headerBackVisible: true });
    }, [navigation, title]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const data = await academicAPI.getSubmission(submissionId);
                if (!cancelled) setSubmission(data);
            } catch {
                // Non-fatal — we still have initial score from submit response.
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [submissionId]);

    const score = submission?.result?.score ?? submission?.score ?? initialScore ?? 0;
    const max = submission?.result?.max_score ?? submission?.max_score ?? initialMax ?? 0;
    const percentage = max > 0 ? Math.round((score / max) * 100) : 0;
    const feedback = submission?.result?.ai_feedback ?? submission?.feedback;
    const grade = submission?.result?.grade;

    const tone =
        percentage >= 80 ? { bg: Colors.successLight, fg: Colors.success, emoji: '🌟', label: 'Excellent' }
        : percentage >= 60 ? { bg: Colors.primarySurface, fg: Colors.primary, emoji: '👍', label: 'Good work' }
        : percentage >= 40 ? { bg: Colors.warningLight, fg: Colors.warning, emoji: '💡', label: 'Keep practicing' }
        : { bg: Colors.errorLight, fg: Colors.error, emoji: '📚', label: 'Needs review' };

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
            <View style={[styles.scoreCard, { backgroundColor: tone.bg }]}>
                <Text style={styles.emoji}>{tone.emoji}</Text>
                <Text style={[styles.scoreLabel, { color: tone.fg }]}>{tone.label}</Text>
                <View style={styles.scoreRow}>
                    <Text style={[styles.scoreBig, { color: tone.fg }]}>{score}</Text>
                    <Text style={[styles.scoreMax, { color: tone.fg }]}>/ {max}</Text>
                </View>
                <Text style={[styles.scorePct, { color: tone.fg }]}>{percentage}%</Text>
                {grade ? (
                    <View style={styles.gradePill}>
                        <Text style={styles.gradePillText}>Grade {grade}</Text>
                    </View>
                ) : null}
            </View>

            {loading ? (
                <View style={styles.loadingRow}>
                    <ActivityIndicator color={Colors.primary} />
                    <Text style={styles.loadingText}>Loading feedback…</Text>
                </View>
            ) : null}

            {feedback ? (
                <View style={styles.feedbackCard}>
                    <Text style={styles.feedbackTitle}>Feedback</Text>
                    <Text style={styles.feedbackBody}>{feedback}</Text>
                </View>
            ) : null}

            <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>What next?</Text>
                <Text style={styles.infoBody}>
                    Your teacher will review and may adjust the final score. Detailed
                    per-question breakdowns are available on the web portal.
                </Text>
            </View>

            <TouchableOpacity style={styles.doneBtn} onPress={() => navigation.popToTop()}>
                <Text style={styles.doneText}>Back to Assignments</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: Colors.gray50 },
    content: { padding: Spacing.lg, paddingBottom: Spacing.xxxl, gap: Spacing.lg },
    scoreCard: {
        borderRadius: Radius.xl,
        padding: Spacing.xxl,
        alignItems: 'center',
        ...Shadows.md,
    },
    emoji: { fontSize: 48 },
    scoreLabel: { fontSize: 13, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginTop: Spacing.sm },
    scoreRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: Spacing.md, gap: 6 },
    scoreBig: { fontSize: 64, fontWeight: '900', letterSpacing: -2 },
    scoreMax: { fontSize: 24, fontWeight: '700', paddingBottom: 10 },
    scorePct: { fontSize: 16, fontWeight: '700', marginTop: 4 },
    gradePill: {
        marginTop: Spacing.md,
        paddingHorizontal: Spacing.lg,
        paddingVertical: 6,
        borderRadius: Radius.full,
        backgroundColor: Colors.white,
    },
    gradePillText: { fontSize: 13, fontWeight: '800', color: Colors.gray800 },
    loadingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, justifyContent: 'center' },
    loadingText: { color: Colors.gray500, fontSize: 13 },
    feedbackCard: {
        backgroundColor: Colors.white,
        borderRadius: Radius.lg,
        padding: Spacing.lg,
        ...Shadows.sm,
    },
    feedbackTitle: {
        fontSize: 12,
        fontWeight: '800',
        color: Colors.gray500,
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginBottom: Spacing.sm,
    },
    feedbackBody: { fontSize: 14, color: Colors.gray800, lineHeight: 22 },
    infoCard: {
        backgroundColor: Colors.primarySurface,
        borderRadius: Radius.lg,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.primary + '22',
    },
    infoTitle: { fontSize: 14, fontWeight: '800', color: Colors.primaryDark, marginBottom: 4 },
    infoBody: { fontSize: 13, color: Colors.gray700, lineHeight: 20 },
    doneBtn: {
        backgroundColor: Colors.primary,
        borderRadius: Radius.lg,
        paddingVertical: Spacing.lg,
        alignItems: 'center',
        ...Shadows.sm,
    },
    doneText: { color: Colors.white, fontWeight: '800', fontSize: 15 },
});
