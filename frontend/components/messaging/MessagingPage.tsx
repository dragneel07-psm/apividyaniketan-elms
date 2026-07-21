// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
    Plus, Send, Search, MessageSquare, MoreVertical,
    Phone, Video, ArrowLeft, Loader2,
    Users as UsersIcon, BrainCircuit
} from 'lucide-react';
import {
    conversationsAPI, usersAPI,
    Conversation, Message, User as UserType
} from '@/lib/api';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface MessagingPageProps {
    emptyStateMessage?: string;
}

export default function MessagingPage({ emptyStateMessage = "Choose a chat from the sidebar to start messaging." }: MessagingPageProps) {
    const [loading, setLoading] = useState(true);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [sending, setSending] = useState(false);

    const [currentUser, setCurrentUser] = useState<UserType | null>(null);
    const [allUsers, setAllUsers] = useState<UserType[]>([]);
    const [showGroupDialog, setShowGroupDialog] = useState(false);
    const [groupTitle, setGroupTitle] = useState('');
    const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
    const [creatingGroup, setCreatingGroup] = useState(false);

    const [showSidebar, setShowSidebar] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    // Tracks which conversation the user is currently viewing so a slow
    // loadMessages response doesn't overwrite a newer conversation's data
    // after the user clicks away.
    const activeConversationRef = useRef<string | null>(null);

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        if (activeConversation) {
            const id = activeConversation.conversation_id;
            activeConversationRef.current = id;
            loadMessages(id);
            // Mark this conversation as read whenever the user opens it, and
            // zero the unread badge locally so the sidebar updates instantly.
            const hadUnread = activeConversation.unread_count > 0;
            if (hadUnread) {
                setConversations((prev) =>
                    prev.map((c) => (c.conversation_id === id ? { ...c, unread_count: 0 } : c)),
                );
                conversationsAPI.markAsRead(id).catch(() => {
                    // On failure, restore the badge so the user knows it didn't sync.
                    setConversations((prev) =>
                        prev.map((c) =>
                            c.conversation_id === id ? { ...c, unread_count: activeConversation.unread_count } : c,
                        ),
                    );
                });
            }
            const interval = setInterval(() => {
                loadMessages(id, true);
            }, 5000);
            return () => {
                clearInterval(interval);
                // Any responses that land after this cleanup will no longer
                // match the ref and will be dropped in loadMessages.
                if (activeConversationRef.current === id) {
                    activeConversationRef.current = null;
                }
            };
        }
    }, [activeConversation?.conversation_id]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const loadInitialData = async () => {
        try {
            setLoading(true);
            const [convs, me] = await Promise.all([
                conversationsAPI.getConversations(),
                usersAPI.getMe(),
            ]);
            setConversations(convs);
            setCurrentUser(me);
            // getAccounts is admin-only — skip it for non-admins so the
            // browser console isn't spammed with expected 403s. Teachers,
            // students and parents can't start arbitrary new conversations
            // through this UI today.
            if (me?.role === 'admin' || me?.role === 'saas_admin') {
                usersAPI.getAccounts().then(users =>
                    setAllUsers(users.filter((u: UserType) => u.user_id !== me.user_id))
                ).catch(() => {});
            }
        } catch {
            toast.error("Failed to load messages");
        } finally {
            setLoading(false);
        }
    };

    const loadMessages = async (id: string, isPolling = false) => {
        try {
            const data = await conversationsAPI.getMessages(id);
            // Drop the response if the user has switched conversations
            // since this request was issued.
            if (activeConversationRef.current !== id) return;
            if (!isPolling || data.length !== messages.length) {
                setMessages(data);
                if (data.length > messages.length) {
                    conversationsAPI.markAsRead(id);
                    // Zero the sidebar badge for this conversation in case new
                    // messages arrived via polling while it was open.
                    setConversations((prev) =>
                        prev.map((c) =>
                            c.conversation_id === id && c.unread_count > 0
                                ? { ...c, unread_count: 0 }
                                : c,
                        ),
                    );
                }
            }
        } catch {
            if (!isPolling) toast.error("Failed to load messages");
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeConversation || !newMessage.trim() || sending) return;
        setSending(true);
        try {
            const msg = await conversationsAPI.sendMessage(activeConversation.conversation_id, newMessage);
            setMessages([...messages, msg]);
            setNewMessage('');
            const convs = await conversationsAPI.getConversations();
            setConversations(convs);
        } catch {
            toast.error("Failed to send message");
        } finally {
            setSending(false);
        }
    };

    const handleCreateGroup = async () => {
        if (!groupTitle.trim()) { toast.error("Please enter a group title"); return; }
        if (selectedParticipants.length === 0) { toast.error("Please select at least one participant"); return; }
        setCreatingGroup(true);
        try {
            const newConv = await conversationsAPI.createGroup(groupTitle, selectedParticipants);
            setConversations([newConv, ...conversations]);
            setActiveConversation(newConv);
            setShowGroupDialog(false);
            setGroupTitle('');
            setSelectedParticipants([]);
            toast.success("Group created successfully");
        } catch {
            toast.error("Failed to create group");
        } finally {
            setCreatingGroup(false);
        }
    };

    const toggleParticipant = (userId: string) => {
        setSelectedParticipants(prev =>
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    const handleSelectConversation = (conv: Conversation) => {
        setActiveConversation(conv);
        setShowSidebar(false);
    };

    const filteredConversations = conversations.filter(c => {
        const other = c.participants.find(p => p.user_details.id !== currentUser?.user_id);
        const name = c.title || other?.user_details.full_name || "Unknown";
        return name.toLowerCase().includes(searchTerm.toLowerCase());
    });

    if (loading) return (
        <div className="flex items-center justify-center h-screen text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin mr-2" /> Loading Conversations...
        </div>
    );

    return (
        <div className="flex h-[calc(100vh-120px)] bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm m-4">

            {/* Sidebar */}
            <div className={`w-full md:w-80 border-r border-slate-100 flex flex-col bg-slate-50/30 ${!showSidebar && 'hidden md:flex'}`}>
                <div className="p-6 border-b border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <MessageSquare className="h-5 w-5 text-indigo-600" /> Messages
                        </h2>
                        <Dialog open={showGroupDialog} onOpenChange={setShowGroupDialog}>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-600 hover:bg-indigo-50">
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                    <DialogTitle>Create Group Chat</DialogTitle>
                                    <DialogDescription>Select participants and give your group a name.</DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="title">Group Name</Label>
                                        <Input
                                            id="title"
                                            placeholder="e.g. Staff Meeting"
                                            value={groupTitle}
                                            onChange={(e) => setGroupTitle(e.target.value)}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Select Participants</Label>
                                        <div className="max-h-[200px] overflow-y-auto border rounded-md p-2 space-y-2 bg-slate-50">
                                            {allUsers.map(user => (
                                                <div key={user.user_id} className="flex items-center space-x-2 p-2 hover:bg-white rounded transition-colors">
                                                    <Checkbox
                                                        id={`user-${user.user_id}`}
                                                        checked={selectedParticipants.includes(user.user_id)}
                                                        onCheckedChange={() => toggleParticipant(user.user_id)}
                                                    />
                                                    <Label htmlFor={`user-${user.user_id}`} className="flex-1 cursor-pointer flex items-center justify-between">
                                                        <span>{user.first_name} {user.last_name}</span>
                                                        <Badge variant="outline" className="text-[10px] scale-90">{user.role}</Badge>
                                                    </Label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button
                                        onClick={handleCreateGroup}
                                        disabled={creatingGroup || !groupTitle.trim() || selectedParticipants.length === 0}
                                        className="bg-indigo-600 hover:bg-indigo-700"
                                    >
                                        {creatingGroup ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UsersIcon className="h-4 w-4 mr-2" />}
                                        Create Group
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search chats..."
                            className="pl-10 h-10 bg-white border-slate-200"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {filteredConversations.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-sm">No conversations found.</div>
                    ) : (
                        filteredConversations.map(conv => {
                            const other = conv.participants.find(p => p.user_details.id !== currentUser?.user_id);
                            const name = conv.title || other?.user_details.full_name || "Direct Message";
                            const isActive = activeConversation?.conversation_id === conv.conversation_id;
                            return (
                                <div
                                    key={conv.conversation_id}
                                    onClick={() => handleSelectConversation(conv)}
                                    className={`p-4 flex gap-3 cursor-pointer hover:bg-slate-50 transition-colors border-b border-slate-50 ${isActive ? 'bg-indigo-50/50 border-r-4 border-r-indigo-500' : ''}`}
                                >
                                    <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                                        <AvatarFallback className={conv.type === 'group' ? "bg-amber-100 text-amber-700 font-bold" : "bg-indigo-100 text-indigo-700 font-bold"}>
                                            {conv.type === 'group' ? <UsersIcon className="h-5 w-5" /> : name.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className="font-bold text-slate-800 text-sm truncate flex items-center gap-1">
                                                {name}
                                                {conv.type === 'group' && <Badge className="h-4 px-1 text-[8px] bg-amber-100 text-amber-700 hover:bg-amber-100 border-none">GROUP</Badge>}
                                            </h4>
                                            {conv.last_message && (
                                                <span className="text-[10px] text-slate-400">
                                                    {formatDistanceToNow(new Date(conv.last_message.created_at), { addSuffix: false })}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                                            {conv.last_message ? (
                                                <>
                                                    {conv.type === 'group' && <span className="font-semibold">{conv.last_message.sender_details.full_name.split(' ')[0]}:</span>}
                                                    {conv.last_message.content}
                                                </>
                                            ) : "No messages yet"}
                                        </p>
                                    </div>
                                    {conv.unread_count > 0 && (
                                        <div className="h-5 w-5 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold">
                                            {conv.unread_count}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className={`flex-1 flex flex-col bg-white ${showSidebar && 'hidden md:flex'}`}>
                {activeConversation ? (
                    <>
                        <div className="p-4 md:p-6 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setShowSidebar(true)}>
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                                <Avatar className="h-10 w-10">
                                    <AvatarFallback className="bg-indigo-100 text-indigo-700 font-bold">
                                        {(activeConversation.title || "D").charAt(0)}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <h3 className="font-bold text-slate-900">{activeConversation.title || "Chat"}</h3>
                                    <p className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                        Online
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-indigo-600"><Phone className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-indigo-600"><Video className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" className="text-slate-400"><MoreVertical className="h-4 w-4" /></Button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/20">
                            {messages.map((msg) => {
                                const isMe = String(msg.sender) === String(currentUser?.user_id);
                                return (
                                    <div key={msg.message_id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`flex gap-3 max-w-[80%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                            {!isMe && (
                                                <Avatar className="h-8 w-8 mt-auto">
                                                    <AvatarFallback className="text-[10px]">{msg.sender_details.full_name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                            )}
                                            <div className="space-y-1">
                                                <div className={`p-4 rounded-2xl text-sm shadow-sm ${isMe
                                                    ? 'bg-indigo-600 text-white rounded-br-none'
                                                    : 'bg-white text-slate-800 border border-slate-100 rounded-bl-none'
                                                }`}>
                                                    {msg.content}
                                                </div>
                                                <p className={`text-[10px] text-slate-400 ${isMe ? 'text-right' : 'text-left'}`}>
                                                    {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        <form onSubmit={handleSendMessage} className="p-6 border-t border-slate-100 space-y-4">
                            <div className="flex gap-4">
                                <Input
                                    placeholder={activeConversation.type === 'group' ? "Type message... (use @ai for bot)" : "Type your message..."}
                                    className="flex-1 h-12 bg-slate-50 border-none focus-visible:ring-indigo-500"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                />
                                <Button
                                    type="submit"
                                    className="h-12 w-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 shadow-lg"
                                    disabled={!newMessage.trim() || sending}
                                >
                                    {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                                </Button>
                            </div>
                            {activeConversation.type === 'group' && !newMessage.startsWith('@ai') && (
                                <div className="flex justify-start">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="text-[10px] h-7 gap-1.5 border-indigo-100 text-indigo-600 hover:bg-indigo-50"
                                        onClick={() => setNewMessage('@ai ' + newMessage)}
                                    >
                                        <BrainCircuit className="h-3 w-3" />
                                        Ask AI about this
                                    </Button>
                                </div>
                            )}
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-12 text-center">
                        <div className="h-20 w-20 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
                            <MessageSquare className="h-10 w-10 text-indigo-200" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-600 mb-2">Select a Conversation</h3>
                        <p className="max-w-xs text-sm">{emptyStateMessage}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
