// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    Conversation,
    ConversationMessage,
    conversationsAPI,
    getCurrentUser,
    User,
} from '../lib/api';
import { Colors, Shadows } from '../constants/theme';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
    if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function getConversationTitle(conv: Conversation, currentUserId?: number): string {
    if (conv.title) return conv.title;
    if (conv.type === 'direct') {
        const other = conv.participants.find(p => p.user.id !== currentUserId);
        if (other) return `${other.user.first_name} ${other.user.last_name}`;
    }
    return 'Group Chat';
}

function getInitials(name: string): string {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function avatarColor(id: string): string {
    const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i)) % colors.length;
    return colors[hash];
}

// ─── Conversation List ─────────────────────────────────────────────────────────

function ConversationList({
    conversations,
    onSelect,
    refreshing,
    onRefresh,
}: {
    conversations: Conversation[];
    onSelect: (c: Conversation) => void;
    refreshing: boolean;
    onRefresh: () => void;
}) {
    if (conversations.length === 0 && !refreshing) {
        return (
            <View style={styles.empty}>
                <Text style={styles.emptyIcon}>💬</Text>
                <Text style={styles.emptyTitle}>No conversations yet</Text>
                <Text style={styles.emptySub}>Messages with teachers and staff will appear here.</Text>
            </View>
        );
    }

    return (
        <FlatList
            data={conversations}
            keyExtractor={item => item.conversation_id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
            renderItem={({ item }) => {
                const title = getConversationTitle(item);
                const last = item.last_message;
                const color = avatarColor(item.conversation_id);
                const unread = (item.unread_count ?? 0) > 0;
                return (
                    <TouchableOpacity style={styles.convRow} onPress={() => onSelect(item)} activeOpacity={0.75}>
                        <View style={[styles.avatar, { backgroundColor: color }]}>
                            <Text style={styles.avatarText}>{getInitials(title)}</Text>
                        </View>
                        <View style={styles.convInfo}>
                            <View style={styles.convMeta}>
                                <Text style={[styles.convTitle, unread && styles.convTitleUnread]} numberOfLines={1}>
                                    {title}
                                </Text>
                                <Text style={styles.convTime}>
                                    {item.updated_at ? formatTime(item.updated_at) : ''}
                                </Text>
                            </View>
                            <View style={styles.convMeta}>
                                <Text style={[styles.convPreview, unread && styles.convPreviewUnread]} numberOfLines={1}>
                                    {last
                                        ? `${last.sender_name}: ${last.content}`
                                        : 'No messages yet'}
                                </Text>
                                {unread && (
                                    <View style={styles.unreadBadge}>
                                        <Text style={styles.unreadText}>{item.unread_count}</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    </TouchableOpacity>
                );
            }}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
    );
}

// ─── Message Thread ────────────────────────────────────────────────────────────

function MessageThread({
    conversation,
    currentUser,
    onBack,
}: {
    conversation: Conversation;
    currentUser: User | null;
    onBack: () => void;
}) {
    const [messages, setMessages] = useState<ConversationMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const flatRef = useRef<FlatList>(null);

    const title = getConversationTitle(
        conversation,
        currentUser?.id ? Number(currentUser.id) : undefined
    );

    const load = useCallback(async () => {
        try {
            const data = await conversationsAPI.getMessages(conversation.conversation_id);
            setMessages(data);
            await conversationsAPI.markAsRead(conversation.conversation_id).catch(() => {});
        } catch {
            /* silent */
        } finally {
            setLoading(false);
        }
    }, [conversation.conversation_id]);

    useEffect(() => { load(); }, [load]);

    const send = async () => {
        const trimmed = text.trim();
        if (!trimmed || sending) return;
        setSending(true);
        try {
            const msg = await conversationsAPI.sendMessage(conversation.conversation_id, trimmed);
            setMessages(prev => [...prev, msg]);
            setText('');
            setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
        } catch {
            /* silent */
        } finally {
            setSending(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.thread}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={90}
        >
            {/* Header */}
            <View style={styles.threadHeader}>
                <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                    <Text style={styles.backArrow}>←</Text>
                </TouchableOpacity>
                <View style={[styles.avatar, { backgroundColor: avatarColor(conversation.conversation_id), width: 36, height: 36, borderRadius: 10 }]}>
                    <Text style={[styles.avatarText, { fontSize: 13 }]}>{getInitials(title)}</Text>
                </View>
                <Text style={styles.threadTitle} numberOfLines={1}>{title}</Text>
            </View>

            {/* Messages */}
            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator color={Colors.primary} />
                </View>
            ) : (
                <FlatList
                    ref={flatRef}
                    data={messages}
                    keyExtractor={m => m.message_id}
                    contentContainerStyle={{ padding: 12, paddingBottom: 4 }}
                    onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
                    renderItem={({ item }) => {
                        const isMe = item.sender.id === currentUser?.id;
                        const senderName = `${item.sender.first_name} ${item.sender.last_name}`;
                        return (
                            <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
                                {!isMe && (
                                    <View style={[styles.msgAvatar, { backgroundColor: avatarColor(String(item.sender.id)) }]}>
                                        <Text style={[styles.avatarText, { fontSize: 11 }]}>{getInitials(senderName)}</Text>
                                    </View>
                                )}
                                <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
                                    {!isMe && (
                                        <Text style={styles.bubbleSender}>{senderName}</Text>
                                    )}
                                    <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>
                                        {item.content}
                                    </Text>
                                    <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>
                                        {formatTime(item.created_at)}
                                    </Text>
                                </View>
                            </View>
                        );
                    }}
                    ListEmptyComponent={
                        <View style={styles.emptyThread}>
                            <Text style={styles.emptyThreadText}>No messages yet. Say hello! 👋</Text>
                        </View>
                    }
                />
            )}

            {/* Input */}
            <View style={styles.inputRow}>
                <TextInput
                    style={styles.input}
                    placeholder="Type a message..."
                    placeholderTextColor={Colors.gray400}
                    value={text}
                    onChangeText={setText}
                    multiline
                    maxLength={2000}
                    returnKeyType="send"
                    onSubmitEditing={send}
                    blurOnSubmit={false}
                />
                <TouchableOpacity
                    style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
                    onPress={send}
                    disabled={!text.trim() || sending}
                >
                    {sending ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.sendArrow}>↑</Text>
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function MessagingScreen() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selected, setSelected] = useState<Conversation | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    const loadConversations = useCallback(async () => {
        try {
            const [convs, user] = await Promise.all([
                conversationsAPI.list(),
                getCurrentUser(),
            ]);
            setConversations(convs);
            setCurrentUser(user);
        } catch {
            /* silent — show empty state */
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { loadConversations(); }, [loadConversations]);

    const onRefresh = () => { setRefreshing(true); loadConversations(); };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator color={Colors.primary} size="large" />
            </View>
        );
    }

    if (selected) {
        return (
            <MessageThread
                conversation={selected}
                currentUser={currentUser}
                onBack={() => {
                    setSelected(null);
                    loadConversations(); // refresh unread counts on return
                }}
            />
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.listHeader}>
                <Text style={styles.listHeaderTitle}>Messages</Text>
                <Text style={styles.listHeaderSub}>{conversations.length} conversation{conversations.length !== 1 ? 's' : ''}</Text>
            </View>
            <ConversationList
                conversations={conversations}
                onSelect={setSelected}
                refreshing={refreshing}
                onRefresh={onRefresh}
            />
        </View>
    );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    // List header
    listHeader: {
        backgroundColor: Colors.primary,
        paddingTop: 16,
        paddingHorizontal: 20,
        paddingBottom: 18,
    },
    listHeaderTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
    listHeaderSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },

    // Conversation row
    convRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
    },
    separator: { height: 1, backgroundColor: '#f1f5f9', marginLeft: 76 },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    avatarText: { color: '#fff', fontSize: 15, fontWeight: '800' },
    convInfo: { flex: 1, minWidth: 0 },
    convMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    convTitle: { fontSize: 14, fontWeight: '600', color: '#1e293b', flex: 1, marginRight: 8 },
    convTitleUnread: { fontWeight: '800' },
    convTime: { fontSize: 11, color: Colors.gray400 },
    convPreview: { fontSize: 12, color: Colors.gray400, flex: 1, marginRight: 8, marginTop: 2 },
    convPreviewUnread: { color: '#334155', fontWeight: '600' },
    unreadBadge: {
        backgroundColor: Colors.primary,
        borderRadius: 100,
        minWidth: 18,
        height: 18,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 5,
    },
    unreadText: { color: '#fff', fontSize: 10, fontWeight: '800' },

    // Empty state
    empty: { alignItems: 'center', paddingVertical: 80, paddingHorizontal: 24 },
    emptyIcon: { fontSize: 64, marginBottom: 16 },
    emptyTitle: { fontSize: 20, fontWeight: '800', color: '#334155', marginBottom: 8 },
    emptySub: { fontSize: 14, color: Colors.gray400, textAlign: 'center', lineHeight: 20 },

    // Thread
    thread: { flex: 1, backgroundColor: '#f8fafc' },
    threadHeader: {
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
        paddingHorizontal: 12,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        ...Shadows.sm,
    },
    backBtn: { padding: 6 },
    backArrow: { fontSize: 22, color: Colors.primary, fontWeight: '700' },
    threadTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b', flex: 1 },

    // Messages
    msgRow: { flexDirection: 'row', marginBottom: 8, alignItems: 'flex-end', gap: 6 },
    msgRowMe: { flexDirection: 'row-reverse' },
    msgAvatar: {
        width: 28,
        height: 28,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 2,
    },
    bubble: {
        maxWidth: '75%',
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    bubbleThem: {
        backgroundColor: '#fff',
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    bubbleMe: {
        backgroundColor: Colors.primary,
        borderBottomRightRadius: 4,
    },
    bubbleSender: { fontSize: 10, fontWeight: '700', color: Colors.primary, marginBottom: 2 },
    bubbleText: { fontSize: 14, color: '#1e293b', lineHeight: 20 },
    bubbleTextMe: { color: '#fff' },
    bubbleTime: { fontSize: 10, color: Colors.gray400, marginTop: 4, textAlign: 'right' },
    bubbleTimeMe: { color: 'rgba(255,255,255,0.65)' },
    emptyThread: { alignItems: 'center', paddingVertical: 40 },
    emptyThreadText: { color: Colors.gray400, fontSize: 14 },

    // Input
    inputRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 12,
        paddingVertical: 8,
        paddingBottom: Platform.OS === 'ios' ? 28 : 10,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
        gap: 8,
    },
    input: {
        flex: 1,
        backgroundColor: '#f1f5f9',
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 14,
        color: '#1e293b',
        maxHeight: 120,
    },
    sendBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendBtnDisabled: { backgroundColor: Colors.gray300 },
    sendArrow: { color: '#fff', fontSize: 18, fontWeight: '800', marginTop: -2 },
});
