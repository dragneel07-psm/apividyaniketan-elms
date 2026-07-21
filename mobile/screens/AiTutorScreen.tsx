// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { academicAPI, aiAPI, TutorChatMessage, TutorChatSource } from '../lib/api';
import { Colors, Radius, Shadows, Spacing } from '../constants/theme';

interface UiMessage {
    role: 'user' | 'assistant';
    content: string;
    sources?: TutorChatSource[];
    tokens?: number;
    isDemo?: boolean;
    error?: boolean;
}

const STORAGE_KEY = 'ai-tutor-conversation';
const EXAMPLES = [
    'Explain photosynthesis in simple terms',
    'Help me solve: 2x + 5 = 15',
    'Main causes of World War I?',
    'Tips for writing a good essay intro',
];

export default function AiTutorScreen() {
    const [messages, setMessages] = useState<UiMessage[]>([]);
    const [input, setInput] = useState('');
    const [studentId, setStudentId] = useState<string>('');
    const [sending, setSending] = useState(false);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const listRef = useRef<FlatList<UiMessage>>(null);

    useEffect(() => {
        (async () => {
            try {
                const saved = await AsyncStorage.getItem(STORAGE_KEY);
                if (saved) {
                    const parsed = JSON.parse(saved);
                    if (Array.isArray(parsed?.messages)) setMessages(parsed.messages);
                }
            } catch {
                // ignore
            }
            try {
                const me = await academicAPI.getMyStudent();
                setStudentId(me.student_id || me.id || '');
            } catch {
                // Non-student accounts can still use general chat with an empty studentId.
            } finally {
                setLoadingProfile(false);
            }
        })();
    }, []);

    const persist = useCallback(async (msgs: UiMessage[]) => {
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ messages: msgs }));
        } catch {
            // ignore
        }
    }, []);

    const scrollToBottom = useCallback(() => {
        // FlatList with inverted=false: scroll to end.
        requestAnimationFrame(() => {
            listRef.current?.scrollToEnd({ animated: true });
        });
    }, []);

    const history: TutorChatMessage[] = useMemo(
        () => messages.map((m) => ({ role: m.role, content: m.content })),
        [messages]
    );

    const handleSend = async (prompt?: string) => {
        const question = (prompt ?? input).trim();
        if (!question || sending) return;

        const userMsg: UiMessage = { role: 'user', content: question };
        const next = [...messages, userMsg];
        setMessages(next);
        setInput('');
        setSending(true);
        persist(next);
        scrollToBottom();

        try {
            const res = await aiAPI.tutorChat(question, studentId, history);
            const assistantMsg: UiMessage = {
                role: 'assistant',
                content: res.answer || 'I could not generate a reply.',
                sources: res.sources,
                tokens: res.tokens_used,
                isDemo: res.is_demo,
            };
            const updated = [...next, assistantMsg];
            setMessages(updated);
            persist(updated);
            scrollToBottom();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Request failed';
            const fallback: UiMessage = {
                role: 'assistant',
                content: 'Something went wrong reaching the AI tutor. Please try again.',
                error: true,
            };
            const updated = [...next, fallback];
            setMessages(updated);
            persist(updated);
            Alert.alert('AI tutor error', message);
        } finally {
            setSending(false);
        }
    };

    const clearConversation = () => {
        Alert.alert('Clear conversation', 'This will erase all messages. Continue?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Clear',
                style: 'destructive',
                onPress: async () => {
                    setMessages([]);
                    await AsyncStorage.removeItem(STORAGE_KEY);
                },
            },
        ]);
    };

    const renderMessage = ({ item }: { item: UiMessage }) => {
        const isUser = item.role === 'user';
        return (
            <View style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
                <View
                    style={[
                        styles.bubble,
                        isUser ? styles.bubbleUser : styles.bubbleAssistant,
                        item.error && styles.bubbleError,
                    ]}
                >
                    <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextAssistant]}>
                        {item.content}
                    </Text>

                    {!isUser && Array.isArray(item.sources) && item.sources.length > 0 && (
                        <View style={styles.sources}>
                            <Text style={styles.sourcesLabel}>Sources</Text>
                            {item.sources.slice(0, 4).map((s, idx) => (
                                <View key={idx} style={styles.sourceChip}>
                                    <Text style={styles.sourceTitle} numberOfLines={1}>
                                        {s.lesson_title || s.chapter_title || `Source ${idx + 1}`}
                                    </Text>
                                    {s.snippet ? (
                                        <Text style={styles.sourceSnippet} numberOfLines={2}>{s.snippet}</Text>
                                    ) : null}
                                </View>
                            ))}
                        </View>
                    )}

                    {!isUser && item.isDemo && (
                        <Text style={styles.demoTag}>Fallback mode — configure AI provider for full quality.</Text>
                    )}
                </View>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={90}
        >
            <View style={styles.header}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.title}>✨ AI Tutor</Text>
                    <Text style={styles.subtitle}>Your personal learning assistant</Text>
                </View>
                {messages.length > 0 && (
                    <TouchableOpacity style={styles.clearBtn} onPress={clearConversation}>
                        <Text style={styles.clearBtnText}>Clear</Text>
                    </TouchableOpacity>
                )}
            </View>

            {loadingProfile ? (
                <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>
            ) : messages.length === 0 ? (
                <View style={styles.empty}>
                    <Text style={styles.emptyEmoji}>🧠</Text>
                    <Text style={styles.emptyTitle}>Start a conversation</Text>
                    <Text style={styles.emptySub}>Ask me anything about your studies.</Text>

                    <View style={styles.examples}>
                        {EXAMPLES.map((q) => (
                            <TouchableOpacity
                                key={q}
                                style={styles.exampleChip}
                                onPress={() => handleSend(q)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.exampleText}>{q}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            ) : (
                <FlatList
                    ref={listRef}
                    data={messages}
                    keyExtractor={(_, idx) => String(idx)}
                    renderItem={renderMessage}
                    contentContainerStyle={styles.list}
                    onContentSizeChange={scrollToBottom}
                    ListFooterComponent={
                        sending ? (
                            <View style={[styles.row, styles.rowAssistant]}>
                                <View style={[styles.bubble, styles.bubbleAssistant]}>
                                    <ActivityIndicator color={Colors.primary} />
                                </View>
                            </View>
                        ) : null
                    }
                />
            )}

            <View style={styles.composer}>
                <TextInput
                    style={styles.input}
                    placeholder="Ask me anything…"
                    placeholderTextColor={Colors.gray400}
                    value={input}
                    onChangeText={setInput}
                    editable={!sending}
                    multiline
                    maxLength={1000}
                />
                <TouchableOpacity
                    style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
                    onPress={() => handleSend()}
                    disabled={!input.trim() || sending}
                >
                    {sending ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.sendText}>Send</Text>}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.gray50 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.lg,
        backgroundColor: Colors.white,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray200,
    },
    title: { fontSize: 20, fontWeight: '800', color: Colors.gray900 },
    subtitle: { fontSize: 12, color: Colors.gray500, marginTop: 2 },
    clearBtn: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: Radius.full,
        backgroundColor: Colors.gray100,
    },
    clearBtnText: { fontSize: 12, fontWeight: '700', color: Colors.gray700 },

    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
    emptyEmoji: { fontSize: 54, marginBottom: Spacing.md },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.gray900 },
    emptySub: { fontSize: 14, color: Colors.gray500, marginTop: 4, textAlign: 'center' },
    examples: { marginTop: Spacing.xl, gap: Spacing.sm, alignSelf: 'stretch' },
    exampleChip: {
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: Colors.gray200,
        borderRadius: Radius.lg,
        padding: Spacing.md,
        ...Shadows.sm,
    },
    exampleText: { color: Colors.gray700, fontSize: 13, fontWeight: '600' },

    list: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xl },
    row: { flexDirection: 'row', marginBottom: Spacing.md },
    rowUser: { justifyContent: 'flex-end' },
    rowAssistant: { justifyContent: 'flex-start' },
    bubble: {
        maxWidth: '82%',
        padding: Spacing.md,
        borderRadius: Radius.lg,
    },
    bubbleUser: { backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
    bubbleAssistant: { backgroundColor: Colors.white, borderBottomLeftRadius: 4, ...Shadows.sm },
    bubbleError: { backgroundColor: Colors.errorLight },
    bubbleText: { fontSize: 14, lineHeight: 21 },
    bubbleTextUser: { color: Colors.white },
    bubbleTextAssistant: { color: Colors.gray800 },

    sources: {
        marginTop: Spacing.md,
        paddingTop: Spacing.sm,
        borderTopWidth: 1,
        borderTopColor: Colors.gray100,
        gap: Spacing.sm,
    },
    sourcesLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: Colors.gray500,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    sourceChip: {
        backgroundColor: Colors.gray50,
        borderRadius: Radius.sm,
        padding: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.gray100,
    },
    sourceTitle: { fontSize: 12, fontWeight: '700', color: Colors.gray800 },
    sourceSnippet: { fontSize: 11, color: Colors.gray500, marginTop: 2, lineHeight: 16 },
    demoTag: { marginTop: Spacing.sm, fontSize: 11, color: Colors.warning, fontWeight: '600' },

    composer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        padding: Spacing.md,
        backgroundColor: Colors.white,
        borderTopWidth: 1,
        borderTopColor: Colors.gray200,
        gap: Spacing.sm,
    },
    input: {
        flex: 1,
        backgroundColor: Colors.gray50,
        borderRadius: Radius.lg,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        fontSize: 14,
        color: Colors.gray900,
        maxHeight: 120,
    },
    sendBtn: {
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderRadius: Radius.lg,
        minWidth: 72,
        alignItems: 'center',
    },
    sendBtnDisabled: { backgroundColor: Colors.gray300 },
    sendText: { color: Colors.white, fontWeight: '800', fontSize: 14 },
});
