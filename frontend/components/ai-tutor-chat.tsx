// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { aiAPI, ChatMessage, TutorChatSource, TutorChatUsage } from '@/lib/api';
import { describeFallback } from '@/lib/ai-fallback';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2, Bot, User } from 'lucide-react';
import { toast } from 'sonner';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    sources?: TutorChatSource[];
    usage?: TutorChatUsage;
}

interface AITutorChatProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    studentId: string;
}

export function AITutorChat({ open, onOpenChange, studentId }: AITutorChatProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);

    async function sendMessage() {
        if (!input.trim() || loading || !studentId) {
            if (!studentId) console.error("Student ID is missing!");
            return;
        }

        const userMessage: Message = { role: 'user', content: input };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInput('');
        setLoading(true);

        try {
            const data = await aiAPI.chat(input, studentId, newMessages as ChatMessage[]);

            const assistantMessage: Message = {
                role: 'assistant',
                content: data.answer,
                sources: data.sources,
                usage: data.usage,
            };

            setMessages(prev => [...prev, assistantMessage]);

            if (data.is_demo) {
                const { title, description } = describeFallback(data.fallback_reason, data.error);
                toast.info(title, description ? { description } : undefined);
            }
        } catch (error) {
            console.error('Failed to get AI response:', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Sorry, I encountered an error. Please try again.'
            }]);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] h-[600px] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Bot className="h-5 w-5" />
                        AI Tutor
                    </DialogTitle>
                </DialogHeader>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto space-y-4 py-4">
                    {messages.length === 0 && (
                        <div className="text-center text-muted-foreground py-12">
                            <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p className="text-lg font-medium">How can I help you learn today?</p>
                            <p className="text-sm mt-2">Ask me anything about your courses!</p>
                        </div>
                    )}

                    {messages.map((message, index) => (
                        <div
                            key={index}
                            className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            {message.role === 'assistant' && (
                                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                                    <Bot className="h-5 w-5 text-white" />
                                </div>
                            )}

                            <div
                                className={`rounded-lg px-4 py-3 max-w-[80%] ${message.role === 'user'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-900'
                                    }`}
                            >
                                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                {message.role === 'assistant' && Array.isArray(message.sources) && message.sources.length > 0 && (
                                    <div className="mt-3 border-t border-gray-300 pt-2 space-y-2">
                                        {message.sources.map((source, sourceIndex) => (
                                            <div key={`${source.source_type}-${source.source_id}-${sourceIndex}`} className="rounded border border-gray-300 bg-white px-2 py-1">
                                                <p className="text-[11px] font-medium text-gray-700">
                                                    {source.source_type} • {source.source_id}
                                                </p>
                                                <p className="text-[11px] text-gray-600">{source.snippet}</p>
                                            </div>
                                        ))}
                                        {message.usage && (
                                            <p className="text-[10px] text-gray-500">
                                                Model: {message.usage.model} • Prompt: {message.usage.prompt_tokens} • Completion: {message.usage.completion_tokens}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {message.role === 'user' && (
                                <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                                    <User className="h-5 w-5 text-gray-600" />
                                </div>
                            )}
                        </div>
                    ))}

                    {loading && (
                        <div className="flex gap-3">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                <Bot className="h-5 w-5 text-white" />
                            </div>
                            <div className="bg-gray-100 rounded-lg px-4 py-3">
                                <Loader2 className="h-5 w-5 animate-spin text-gray-600" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="border-t pt-4">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            sendMessage();
                        }}
                        className="flex gap-2"
                    >
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask me anything..."
                            disabled={loading}
                            className="flex-1"
                        />
                        <Button type="submit" disabled={loading || !input.trim()}>
                            {loading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                        </Button>
                    </form>
                    <p className="text-xs text-muted-foreground mt-2">
                        💡 Tip: Be specific about your question for better answers
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}

