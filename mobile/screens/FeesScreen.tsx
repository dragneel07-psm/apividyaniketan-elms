// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { billingAPI, MyFeesResponse, StudentFee } from '../lib/api';
import { Colors, Shadows } from '../constants/theme';

const STATUS_COLOR: Record<string, string> = {
    paid: '#10b981',
    partial: '#f59e0b',
    pending: '#6366f1',
    overdue: '#ef4444',
    waived: '#94a3b8',
};

function StatusBadge({ status }: { status: string }) {
    const color = STATUS_COLOR[status] || Colors.gray400;
    return (
        <View style={[styles.badge, { backgroundColor: color + '20', borderColor: color }]}>
            <Text style={[styles.badgeText, { color }]}>{status.toUpperCase()}</Text>
        </View>
    );
}

function SummaryCard({ summary }: { summary: MyFeesResponse['summary'] }) {
    return (
        <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
                <View style={[styles.summaryItem, { backgroundColor: '#f0fdf4' }]}>
                    <Text style={[styles.summaryAmount, { color: '#10b981' }]}>
                        Rs {summary.total_paid.toLocaleString()}
                    </Text>
                    <Text style={styles.summaryLabel}>Paid</Text>
                </View>
                <View style={[styles.summaryItem, { backgroundColor: '#fff7ed' }]}>
                    <Text style={[styles.summaryAmount, { color: '#f59e0b' }]}>
                        Rs {summary.outstanding.toLocaleString()}
                    </Text>
                    <Text style={styles.summaryLabel}>Outstanding</Text>
                </View>
                <View style={[styles.summaryItem, { backgroundColor: '#f8fafc' }]}>
                    <Text style={[styles.summaryAmount, { color: Colors.primary }]}>
                        Rs {summary.total_due.toLocaleString()}
                    </Text>
                    <Text style={styles.summaryLabel}>Total Due</Text>
                </View>
            </View>
        </View>
    );
}

function FeeCard({ fee }: { fee: StudentFee }) {
    const outstanding = fee.amount - fee.amount_paid - fee.discount_amount;
    const pct = fee.amount > 0 ? Math.min((fee.amount_paid / fee.amount) * 100, 100) : 0;

    return (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.feeName} numberOfLines={1}>{fee.fee_name}</Text>
                <StatusBadge status={fee.status} />
            </View>
            <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Due Date</Text>
                <Text style={styles.cardValue}>{new Date(fee.due_date).toLocaleDateString()}</Text>
            </View>
            <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Total</Text>
                <Text style={styles.cardValue}>Rs {fee.amount.toLocaleString()}</Text>
            </View>
            {fee.discount_amount > 0 && (
                <View style={styles.cardRow}>
                    <Text style={styles.cardLabel}>Discount</Text>
                    <Text style={[styles.cardValue, { color: '#10b981' }]}>
                        - Rs {fee.discount_amount.toLocaleString()}
                    </Text>
                </View>
            )}
            <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Paid</Text>
                <Text style={[styles.cardValue, { color: '#10b981' }]}>
                    Rs {fee.amount_paid.toLocaleString()}
                </Text>
            </View>
            {outstanding > 0 && (
                <View style={styles.cardRow}>
                    <Text style={styles.cardLabel}>Outstanding</Text>
                    <Text style={[styles.cardValue, { color: '#ef4444', fontWeight: '700' }]}>
                        Rs {outstanding.toLocaleString()}
                    </Text>
                </View>
            )}
            {/* Progress bar */}
            <View style={styles.progressBg}>
                <View style={[styles.progressFill, { width: `${pct}%` as any }]} />
            </View>
            <Text style={styles.progressLabel}>{Math.round(pct)}% paid</Text>
        </View>
    );
}

interface Props {
    /** If provided, loads fees for a specific student (parent view) */
    studentId?: string;
    studentName?: string;
}

export default function FeesScreen({ studentId, studentName }: Props) {
    const [data, setData] = useState<MyFeesResponse | null>(null);
    const [fees, setFees] = useState<StudentFee[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'paid'>('all');

    const load = useCallback(async () => {
        try {
            if (studentId) {
                // Parent view: load fees for specific student
                const studentFees = await billingAPI.getStudentFees(studentId);
                setFees(studentFees);
                const paid = studentFees.reduce((s, f) => s + f.amount_paid, 0);
                const due = studentFees.reduce((s, f) => s + f.amount, 0);
                setData({ fees: studentFees, payments: [], summary: { total_due: due, total_paid: paid, outstanding: due - paid } });
            } else {
                // Student view: load my fees
                const result = await billingAPI.getMyFees();
                setData(result);
                setFees(result.fees);
            }
        } catch (err) {
            console.error('Failed to load fees', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [studentId]);

    useEffect(() => { load(); }, [load]);

    const onRefresh = () => { setRefreshing(true); load(); };

    const filtered = fees.filter(f => {
        if (activeTab === 'pending') return ['pending', 'partial', 'overdue'].includes(f.status);
        if (activeTab === 'paid') return f.status === 'paid' || f.status === 'waived';
        return true;
    });

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator color={Colors.primary} size="large" />
                <Text style={styles.loadingText}>Loading fees...</Text>
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        >
            <Text style={styles.title}>
                {studentName ? `${studentName}'s Fees` : 'My Fees'}
            </Text>

            {data && <SummaryCard summary={data.summary} />}

            {/* Tab filter */}
            <View style={styles.tabs}>
                {(['all', 'pending', 'paid'] as const).map(t => (
                    <TouchableOpacity
                        key={t}
                        style={[styles.tab, activeTab === t && styles.tabActive]}
                        onPress={() => setActiveTab(t)}
                    >
                        <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {filtered.length === 0 ? (
                <View style={styles.empty}>
                    <Text style={styles.emptyText}>No fees found.</Text>
                </View>
            ) : (
                filtered.map(fee => (
                    <FeeCard key={fee.student_fee_id} fee={fee} />
                ))
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    content: { padding: 16, paddingBottom: 32 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    loadingText: { marginTop: 12, color: Colors.gray400, fontWeight: '600' },
    title: { fontSize: 24, fontWeight: '800', color: Colors.gray900, marginBottom: 16 },

    summaryCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        ...Shadows.md,
    },
    summaryRow: { flexDirection: 'row', gap: 8 },
    summaryItem: {
        flex: 1,
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
    },
    summaryAmount: { fontSize: 16, fontWeight: '800' },
    summaryLabel: { fontSize: 11, color: Colors.gray400, fontWeight: '600', marginTop: 2 },

    tabs: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    tab: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: '#e2e8f0',
        alignItems: 'center',
    },
    tabActive: { backgroundColor: Colors.primary },
    tabText: { fontSize: 13, fontWeight: '700', color: Colors.gray500 },
    tabTextActive: { color: '#fff' },

    card: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
        ...Shadows.sm,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    feeName: { fontSize: 15, fontWeight: '700', color: Colors.gray900, flex: 1, marginRight: 8 },
    cardRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    cardLabel: { fontSize: 13, color: Colors.gray400 },
    cardValue: { fontSize: 13, fontWeight: '600', color: Colors.gray700 },

    badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
    badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

    progressBg: { height: 6, backgroundColor: '#e2e8f0', borderRadius: 3, marginTop: 10 },
    progressFill: { height: 6, backgroundColor: Colors.primary, borderRadius: 3 },
    progressLabel: { fontSize: 11, color: Colors.gray400, marginTop: 4, fontWeight: '600' },

    empty: { alignItems: 'center', padding: 32 },
    emptyText: { color: Colors.gray400, fontWeight: '600' },
});
