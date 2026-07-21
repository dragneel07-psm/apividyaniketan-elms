// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { BrainCircuit, Sparkles, MessageSquare, ListChecks, FileText, X, Send, Search, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { aiAPI, ChatMessage } from '@/lib/api';

interface AIAction {
    label: string;
    icon: React.ElementType;
    prompt: string;
}

type AssistantMessage = { role: 'user' | 'ai'; content: string };

function toApiHistory(messages: AssistantMessage[]): ChatMessage[] {
    return messages.map((msg) => ({
        role: msg.role === 'ai' ? 'assistant' : 'user',
        content: msg.content,
    }));
}

export function AITeachingAssistant() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<AssistantMessage[]>([
        { role: 'ai', content: "Hello! I'm your AI Teaching Assistant. I can help you create quizzes, plan lessons, or analyze student performance. How can I assist you today?" }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const quickActions: AIAction[] = [
        { label: 'Generate Quiz', icon: ListChecks, prompt: 'Generate a 5-question multiple choice quiz on Algebra for Grade 10 with answers.' },
        { label: 'Create Homework', icon: FileText, prompt: 'Create a homework assignment for Class 10 Physics on Newton\'s Laws with 5 questions.' },
        { label: 'Summarize Class', icon: MessageSquare, prompt: 'Summarize key points from the last lesson on Algebra in bullet points.' },
        { label: 'Identify Weak Students', icon: Search, prompt: 'Based on recent results, suggest how to support weak students in the next class.' },
    ];

    const handleSubmit = async (prompt: string) => {
        if (!prompt.trim() || loading) return;

        const userMsg = prompt.trim();
        const currentMessages = [...messages, { role: 'user' as const, content: userMsg }];

        setMessages(currentMessages);
        setInput('');
        setLoading(true);
        setError(null);

        try {
            const response = await aiAPI.chat(userMsg, '', toApiHistory(messages));
            const reply = response?.response?.trim() || 'No response returned by AI service.';
            const suffix = response?.is_demo ? '\n\n[Demo mode response]' : '';
            const providerError = response?.error?.trim();

            if (response?.is_demo && providerError) {
                setError(providerError);
            }

            setMessages((prev) => [...prev, { role: 'ai', content: `${reply}${suffix}` }]);
        } catch (e: any) {
            const message = e?.message || 'AI request failed. Please verify API settings and try again.';
            setError(message);
            setMessages((prev) => [
                ...prev,
                {
                    role: 'ai',
                    content: `I could not complete that request right now. ${message}`,
                },
            ]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {!isOpen && (
                <div className="fixed right-0 top-1/2 transform -translate-y-1/2 z-40 hidden lg:block">
                    <Button
                        onClick={() => setIsOpen(true)}
                        className="h-auto py-4 rounded-l-xl rounded-r-none bg-indigo-600 hover:bg-indigo-700 shadow-lg flex flex-col gap-2 border-l border-white/20"
                    >
                        <BrainCircuit className="h-6 w-6" />
                        <span className="writing-mode-vertical text-xs font-bold tracking-wider" style={{ writingMode: 'vertical-rl' }}>AI ASSISTANT</span>
                    </Button>
                </div>
            )}

            <div className="fixed bottom-6 right-6 z-50 lg:hidden">
                <Button
                    onClick={() => setIsOpen(true)}
                    size="icon"
                    className="h-14 w-14 rounded-full bg-indigo-600 hover:bg-indigo-700 shadow-xl"
                >
                    <BrainCircuit className="h-8 w-8" />
                </Button>
            </div>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div
                        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
                        onClick={() => setIsOpen(false)}
                    />

                    <div className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                        <div className="p-4 border-b flex items-center justify-between bg-indigo-50/50">
                            <div className="flex items-center gap-2 text-indigo-700 font-bold text-lg">
                                <BrainCircuit className="h-6 w-6" />
                                AI Teaching Assistant
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                                <X className="h-5 w-5" />
                            </Button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                            {messages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] p-3 rounded-lg text-sm ${msg.role === 'user'
                                        ? 'bg-indigo-600 text-white rounded-tr-none'
                                        : 'bg-white border shadow-sm text-slate-800 rounded-tl-none'
                                        }`}>
                                        <div className="whitespace-pre-wrap">{msg.content}</div>
                                    </div>
                                </div>
                            ))}
                            {loading && (
                                <div className="flex justify-start">
                                    <div className="bg-white border p-3 rounded-lg rounded-tl-none shadow-sm flex gap-2 items-center text-sm text-muted-foreground">
                                        <Sparkles className="h-4 w-4 animate-spin text-indigo-500" />
                                        Thinking...
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t bg-white space-y-4">
                            {error && (
                                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 flex items-center gap-2">
                                    <AlertCircle className="h-3.5 w-3.5" />
                                    {error}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-2">
                                {quickActions.map((action) => (
                                    <Button
                                        key={action.label}
                                        variant="outline"
                                        size="sm"
                                        className="justify-start h-auto py-2 px-3 text-xs border-indigo-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200"
                                        onClick={() => void handleSubmit(action.prompt)}
                                        disabled={loading}
                                    >
                                        <action.icon className="h-3 w-3 mr-2 shrink-0" />
                                        {action.label}
                                    </Button>
                                ))}
                            </div>

                            <form
                                onSubmit={(e) => { e.preventDefault(); handleSubmit(input); }}
                                className="flex gap-2"
                            >
                                <Input
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Ask for help..."
                                    className="flex-1"
                                    autoFocus
                                />
                                <Button type="submit" size="icon" disabled={!input.trim() || loading} className="bg-indigo-600">
                                    <Send className="h-4 w-4" />
                                </Button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
