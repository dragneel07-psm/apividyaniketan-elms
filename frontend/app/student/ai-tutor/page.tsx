// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Send, Sparkles, Trash2, Loader2, Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { TutorChatSource, TutorChatUsage } from '@/lib/api';
import { describeFallback } from '@/lib/ai-fallback';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTutorWebSocket, TutorDonePayload } from '@/hooks/useTutorWebSocket';
import { useTranslation } from '@/lib/localization';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    sources?: TutorDonePayload['sources'];
    usage?: TutorChatUsage;
    confidence?: number;
    confidence_label?: string;
    is_demo?: boolean;
}

export default function AITutorPage() {
    const { t } = useTranslation();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [conversationId, setConversationId] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const { sendMessage, status, streamingContent, budgetError } = useTutorWebSocket();
    const isStreaming = streamingContent.length > 0;
    const isLoading = status === 'connecting' || isStreaming;

    useEffect(() => {
        loadConversation();
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, streamingContent]);

    const loadConversation = () => {
        const saved = localStorage.getItem('ai-tutor-conversation');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed?.messages) {
                    setMessages(Array.isArray(parsed.messages) ? parsed.messages : []);
                    setConversationId(parsed.conversationId ?? null);
                }
            } catch {
                setMessages([]);
            }
        }
    };

    const saveConversation = (msgs: Message[], convId: string | null) => {
        localStorage.setItem('ai-tutor-conversation', JSON.stringify({ messages: msgs, conversationId: convId }));
    };

    const scrollToBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    };

    const handleSend = () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = { role: 'user', content: input };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInput('');

        sendMessage(
            { message: input, conversationId },
            {
                onDone: (payload: TutorDonePayload) => {
                    const assistantMessage: Message = {
                        role: 'assistant',
                        content: payload.answer,
                        sources: payload.sources,
                        usage: {
                            model: 'gpt-4o-mini',
                            prompt_tokens: payload.usage.prompt_tokens,
                            completion_tokens: payload.usage.completion_tokens,
                        },
                        confidence: payload.confidence,
                        confidence_label: payload.confidence_label,
                        is_demo: payload.is_demo,
                    };
                    const updated = [...newMessages, assistantMessage];
                    setMessages(updated);
                    setConversationId(payload.conversation_id);
                    saveConversation(updated, payload.conversation_id);

                    if (payload.is_demo) {
                        const { title, description } = describeFallback(
                            payload.fallback_reason ?? undefined,
                            payload.error ?? undefined,
                        );
                        toast.info(title, description ? { description } : undefined);
                    }
                    if (payload.budget && payload.budget.daily_limit > 0) {
                        const pct = Math.round((payload.budget.used_today / payload.budget.daily_limit) * 100);
                        if (pct >= 90) toast.warning(t('student.aiTutor.budgetWarning', { pct: String(pct) }));
                    }
                },
                onError: (detail: string) => {
                    toast.error(detail || t('student.aiTutor.errorResponse'));
                    const failureReply: Message = {
                        role: 'assistant',
                        content: t('student.aiTutor.failureReply'),
                    };
                    const updated = [...newMessages, failureReply];
                    setMessages(updated);
                    saveConversation(updated, conversationId);
                },
            }
        );
    };

    const handleClearConversation = () => {
        if (confirm(t('student.aiTutor.clearConfirm'))) {
            setMessages([]);
            setConversationId(null);
            localStorage.removeItem('ai-tutor-conversation');
            toast.success(t('student.aiTutor.clearedSuccess'));
        }
    };

    const confidenceBadgeVariant = (label?: string) => {
        if (label === 'high') return 'default';
        if (label === 'moderate') return 'secondary';
        return 'outline';
    };

    const exampleQuestions = [
        "Explain photosynthesis in simple terms",
        "Help me solve this math problem: 2x + 5 = 15",
        "What are the main causes of World War I?",
        "How do I write a good essay introduction?"
    ];

    return (
        <div className="h-[calc(100vh-8rem)] max-w-5xl mx-auto flex flex-col">
            {/* Header */}
            <div className="mb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                            <Sparkles className="h-8 w-8 text-indigo-600" />
                            {t('student.aiTutor.pageTitle')}
                        </h1>
                        <p className="text-muted-foreground">{t('student.aiTutor.tagline')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* WebSocket status indicator */}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            {status === 'open' ? (
                                <><Wifi className="h-3 w-3 text-green-500" /><span className="hidden sm:inline">{t('student.aiTutor.statusLive')}</span></>
                            ) : status === 'connecting' ? (
                                <><Loader2 className="h-3 w-3 animate-spin text-yellow-500" /><span className="hidden sm:inline">{t('student.aiTutor.statusConnecting')}</span></>
                            ) : (
                                <><WifiOff className="h-3 w-3 text-slate-400" /><span className="hidden sm:inline">{t('student.aiTutor.statusOffline')}</span></>
                            )}
                        </div>
                        {messages.length > 0 && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleClearConversation}
                                className="gap-2"
                            >
                                <Trash2 className="h-4 w-4" />
                                {t('student.aiTutor.clearChat')}
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Budget exceeded banner */}
            {budgetError && (
                <div className="mb-3 flex items-start gap-2 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div>
                        <span className="font-medium">{t('student.aiTutor.budgetTitle')}</span>{' '}
                        {budgetError.detail} {t('student.aiTutor.budgetResetsAt', { time: new Date(budgetError.resets_at).toLocaleTimeString() })}
                    </div>
                </div>
            )}

            {/* Chat Area */}
            <Card className="flex-1 flex flex-col overflow-hidden">
                <ScrollArea className="flex-1 p-6" ref={scrollRef}>
                    {messages.length === 0 && !isStreaming ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <Sparkles className="h-16 w-16 text-indigo-600 mb-4 opacity-20" />
                            <h3 className="text-lg font-semibold mb-2">{t('student.aiTutor.emptyTitle')}</h3>
                            <p className="text-muted-foreground mb-6 max-w-md">
                                {t('student.aiTutor.emptyHint')}
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-2xl">
                                {exampleQuestions.map((question, index) => (
                                    <Button
                                        key={index}
                                        variant="outline"
                                        className="text-left h-auto py-3 px-4 whitespace-normal"
                                        onClick={() => setInput(question)}
                                    >
                                        {question}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {messages.map((message, index) => (
                                <div
                                    key={index}
                                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[80%] rounded-lg p-4 ${message.role === 'user'
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-slate-100 text-slate-900'
                                            }`}
                                    >
                                        {message.role === 'assistant' ? (
                                            <div className="prose prose-sm max-w-none">
                                                <ReactMarkdown
                                                    components={{
                                                        code({ inline, className, children, ...props }: any) {
                                                            const match = /language-(\w+)/.exec(className || '');
                                                            return !inline && match ? (
                                                                <SyntaxHighlighter
                                                                    style={vscDarkPlus as any}
                                                                    language={match[1]}
                                                                    PreTag="div"
                                                                    {...props}
                                                                >
                                                                    {String(children).replace(/\n$/, '')}
                                                                </SyntaxHighlighter>
                                                            ) : (
                                                                <code className={className} {...props}>
                                                                    {children}
                                                                </code>
                                                            );
                                                        }
                                                    }}
                                                >
                                                    {message.content}
                                                </ReactMarkdown>

                                                {/* Confidence badge */}
                                                {message.confidence_label && (
                                                    <div className="mt-2 flex items-center gap-2">
                                                        <Badge variant={confidenceBadgeVariant(message.confidence_label)} className="text-[10px]">
                                                            {message.confidence_label} {t('student.aiTutor.confidenceSuffix')}
                                                            {message.confidence !== undefined && ` (${Math.round(message.confidence * 100)}%)`}
                                                        </Badge>
                                                    </div>
                                                )}

                                                {/* Sources */}
                                                {Array.isArray(message.sources) && message.sources.length > 0 && (
                                                    <div className="mt-3 border-t border-slate-200 pt-2">
                                                        <p className="text-[11px] font-semibold text-slate-600 mb-2">{t('student.aiTutor.sourcesLabel')}</p>
                                                        <div className="space-y-2">
                                                            {message.sources.map((source, sourceIndex) => (
                                                                <div key={`${source.source_type}-${source.source_id}-${sourceIndex}`} className="rounded border border-slate-200 bg-white px-2 py-1">
                                                                    <p className="text-[11px] font-medium text-slate-700">
                                                                        {source.source_type} • {source.source_id}
                                                                        {source.similarity !== undefined && (
                                                                            <span className="ml-1 text-slate-400">({Math.round(source.similarity * 100)}%)</span>
                                                                        )}
                                                                    </p>
                                                                    <p className="text-[11px] text-slate-600">{source.text_span || source.snippet}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        {message.usage && (
                                                            <p className="mt-2 text-[10px] text-slate-500">
                                                                Prompt: {message.usage.prompt_tokens} • Completion: {message.usage.completion_tokens} tokens
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <p className="whitespace-pre-wrap">{message.content}</p>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {/* Streaming in-flight response */}
                            {isStreaming && (
                                <div className="flex justify-start">
                                    <div className="max-w-[80%] rounded-lg p-4 bg-slate-100 text-slate-900">
                                        <div className="prose prose-sm max-w-none">
                                            <ReactMarkdown>{streamingContent}</ReactMarkdown>
                                        </div>
                                        <span className="inline-block w-1.5 h-4 bg-indigo-500 animate-pulse ml-0.5 align-middle" />
                                    </div>
                                </div>
                            )}

                            {/* Waiting for first token */}
                            {isLoading && !isStreaming && (
                                <div className="flex justify-start">
                                    <div className="bg-slate-100 rounded-lg p-4 flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span className="text-sm text-muted-foreground">{t('student.aiTutor.thinking')}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </ScrollArea>

                {/* Input Area */}
                <div className="border-t p-4">
                    <div className="flex gap-2">
                        <Input
                            placeholder={t('student.aiTutor.inputPlaceholder')}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                            disabled={isLoading || !!budgetError}
                            className="flex-1"
                        />
                        <Button onClick={handleSend} disabled={isLoading || !input.trim() || !!budgetError}>
                            {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}
