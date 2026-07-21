// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { BookIssue, LibraryBook, libraryAPI } from '../lib/api';
import { Colors, Shadows } from '../constants/theme';

type Tab = 'browse' | 'borrowed';

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
    issued: { color: Colors.info, bg: Colors.infoLight },
    returned: { color: Colors.success, bg: Colors.successLight },
    overdue: { color: Colors.error, bg: Colors.errorLight },
};

function formatDate(value?: string | null): string {
    if (!value) return '—';
    try {
        return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
        return value;
    }
}

export default function LibraryScreen() {
    const [tab, setTab] = useState<Tab>('browse');
    const [books, setBooks] = useState<LibraryBook[]>([]);
    const [issues, setIssues] = useState<BookIssue[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');

    const load = useCallback(async () => {
        try {
            setError('');
            const [bookData, issueData] = await Promise.all([
                libraryAPI.getBooks().catch(() => []),
                libraryAPI.getMyIssues().catch(() => []),
            ]);
            setBooks(bookData);
            setIssues(issueData);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to load library';
            setError(msg);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const onRefresh = () => {
        setRefreshing(true);
        load();
    };

    const filteredBooks = useMemo(() => {
        const needle = search.trim().toLowerCase();
        if (!needle) return books;
        return books.filter(
            (b) =>
                b.title.toLowerCase().includes(needle) ||
                b.author.toLowerCase().includes(needle) ||
                (b.category || '').toLowerCase().includes(needle)
        );
    }, [books, search]);

    const activeIssues = issues.filter((i) => i.status !== 'returned');

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator color={Colors.primary} size="large" />
                <Text style={styles.loadingText}>Loading library...</Text>
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.screen}
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            <View style={styles.heroCard}>
                <Text style={styles.heroBadge}>LIBRARY</Text>
                <Text style={styles.heroTitle}>School Library</Text>
                <Text style={styles.heroSubtitle}>
                    {books.length} books · {activeIssues.length} borrowed by you
                </Text>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.tabRow}>
                <TouchableOpacity
                    onPress={() => setTab('browse')}
                    style={[styles.tabBtn, tab === 'browse' && styles.tabBtnActive]}
                >
                    <Text style={[styles.tabText, tab === 'browse' && styles.tabTextActive]}>
                        Browse
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setTab('borrowed')}
                    style={[styles.tabBtn, tab === 'borrowed' && styles.tabBtnActive]}
                >
                    <Text style={[styles.tabText, tab === 'borrowed' && styles.tabTextActive]}>
                        My Borrowed ({issues.length})
                    </Text>
                </TouchableOpacity>
            </View>

            {tab === 'browse' ? (
                <>
                    <TextInput
                        style={styles.searchInput}
                        value={search}
                        onChangeText={setSearch}
                        placeholder="Search by title, author, or category"
                        autoCapitalize="none"
                    />

                    {filteredBooks.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <Text style={styles.emptyCardText}>
                                {search ? 'No books match your search.' : 'No books in the catalogue yet.'}
                            </Text>
                        </View>
                    ) : (
                        filteredBooks.map((b) => (
                            <View key={b.book_id} style={styles.bookCard}>
                                <View style={styles.bookHeader}>
                                    <Text style={styles.bookTitle} numberOfLines={2}>{b.title}</Text>
                                    <View
                                        style={[
                                            styles.availabilityPill,
                                            {
                                                backgroundColor:
                                                    b.available_copies > 0 ? Colors.successLight : Colors.errorLight,
                                            },
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.availabilityText,
                                                {
                                                    color:
                                                        b.available_copies > 0 ? Colors.success : Colors.error,
                                                },
                                            ]}
                                        >
                                            {b.available_copies > 0 ? `${b.available_copies} available` : 'Out'}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={styles.bookAuthor}>by {b.author}</Text>
                                <View style={styles.bookMetaRow}>
                                    <Text style={styles.bookMetaText}>
                                        {(b.category || 'other').replace('_', ' ').toUpperCase()}
                                    </Text>
                                    {b.published_year ? (
                                        <>
                                            <Text style={styles.metaDot}>·</Text>
                                            <Text style={styles.bookMetaText}>{b.published_year}</Text>
                                        </>
                                    ) : null}
                                    <Text style={styles.metaDot}>·</Text>
                                    <Text style={styles.bookMetaText}>
                                        {b.available_copies}/{b.total_copies} copies
                                    </Text>
                                </View>
                                {b.description ? (
                                    <Text style={styles.bookDesc} numberOfLines={3}>{b.description}</Text>
                                ) : null}
                            </View>
                        ))
                    )}
                </>
            ) : issues.length === 0 ? (
                <View style={styles.emptyCard}>
                    <Text style={styles.emptyCardText}>You haven&apos;t borrowed any books yet.</Text>
                </View>
            ) : (
                issues.map((i) => {
                    const status = STATUS_COLORS[i.status] || STATUS_COLORS.issued;
                    return (
                        <View key={i.issue_id} style={styles.bookCard}>
                            <View style={styles.bookHeader}>
                                <Text style={styles.bookTitle} numberOfLines={2}>
                                    {i.book_title || 'Book'}
                                </Text>
                                <View style={[styles.availabilityPill, { backgroundColor: status.bg }]}>
                                    <Text style={[styles.availabilityText, { color: status.color }]}>
                                        {i.status.toUpperCase()}
                                    </Text>
                                </View>
                            </View>
                            {i.book_author ? (
                                <Text style={styles.bookAuthor}>by {i.book_author}</Text>
                            ) : null}
                            <View style={styles.bookMetaRow}>
                                <Text style={styles.bookMetaText}>Issued {formatDate(i.issued_date)}</Text>
                                <Text style={styles.metaDot}>·</Text>
                                <Text style={styles.bookMetaText}>Due {formatDate(i.due_date)}</Text>
                            </View>
                            {i.return_date ? (
                                <Text style={styles.returnedText}>
                                    Returned on {formatDate(i.return_date)}
                                </Text>
                            ) : null}
                            {Number(i.fine_amount || 0) > 0 ? (
                                <Text style={styles.fineText}>Fine: ₹{i.fine_amount}</Text>
                            ) : null}
                        </View>
                    );
                })
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
    heroTitle: { color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 4 },
    heroSubtitle: { color: 'rgba(255,255,255,0.9)', marginTop: 4, fontSize: 13 },
    tabRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    tabBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.gray200,
        backgroundColor: '#fff',
        alignItems: 'center',
    },
    tabBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    tabText: { color: Colors.gray700, fontSize: 13, fontWeight: '700' },
    tabTextActive: { color: '#fff' },
    searchInput: {
        borderWidth: 1,
        borderColor: Colors.gray200,
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 10,
        fontSize: 14,
        color: Colors.gray900,
    },
    emptyCard: {
        backgroundColor: '#fff',
        borderRadius: 14,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: Colors.gray200,
        paddingVertical: 40,
        alignItems: 'center',
    },
    emptyCardText: { color: Colors.gray400, fontSize: 13, fontWeight: '600', textAlign: 'center', paddingHorizontal: 16 },
    bookCard: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        ...Shadows.sm,
    },
    bookHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 2 },
    bookTitle: { color: Colors.gray900, fontSize: 15, fontWeight: '800', flex: 1, marginRight: 8 },
    bookAuthor: { color: Colors.gray600, fontSize: 13, marginTop: 2 },
    bookMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, flexWrap: 'wrap' },
    bookMetaText: { color: Colors.gray500, fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
    metaDot: { color: Colors.gray400, fontSize: 12, marginHorizontal: 6 },
    bookDesc: { color: Colors.gray500, fontSize: 12, marginTop: 8, lineHeight: 17 },
    availabilityPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
    availabilityText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
    returnedText: { color: Colors.success, fontSize: 12, fontWeight: '700', marginTop: 6 },
    fineText: { color: Colors.error, fontSize: 12, fontWeight: '800', marginTop: 4 },
});
