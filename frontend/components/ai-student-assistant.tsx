// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
    BrainCircuit, Sparkles, Send, X, MessageSquare,
    BookOpen, Lightbulb, Zap, Loader2, RefreshCw
} from 'lucide-react';
import { api, ChatMessage, Lesson } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AIStudentAssistantProps {
    lesson?: Lesson;
    context?: string;
}

export function AIStudentAssistant({ lesson, context }: AIStudentAssistantProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Initial greeting
    useEffect(() => {
        if (messages.length === 0) {
            setMessages([
                {
                    role: 'assistant',
                    content: `Hi! I'm your AI Study Buddy. ${lesson ? `I see you're learning about "${lesson.title}". ` : ""}How can I help you today?`
                }
            ]);
        }
    }, [lesson, messages.length]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, loading]);

    const handleSendMessage = async (content: string) => {
        if (!content.trim() || loading) return;

        const userMsg: ChatMessage = { role: 'user', content };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            // Enrich prompt with lesson context if available
            let prompt = content;
            if (lesson) {
                prompt = `(Context: I am studying the lesson "${lesson.title}". ${lesson.content ? "Here is the content: " + lesson.content.substring(0, 500) : ""}) ${content}`;
            }

            const response = await api.ai.tutorChat({
                message: prompt,
                history: messages.slice(-5) // Send last 5 messages for context
            });

            setMessages(prev => [...prev, { role: 'assistant', content: response.response }]);
        } catch (error) {
            console.error('Chat failed:', error);
            toast.error("AI is currently unavailable. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

    const quickActions = [
        { label: 'Summarize', icon: BookOpen, prompt: 'Can you summarize this lesson in 3 key points?' },
        { label: 'Explain', icon: Lightbulb, prompt: 'Explain the main concept of this lesson in simple terms.' },
        { label: 'Quiz Me', icon: Zap, prompt: 'Ask me 2 questions to check my understanding of this lesson.' },
    ];

    return (
        <>
            {/* Floating Trigger Button */}
            <Button
                onClick={() => setIsOpen(true)}
                className={cn(
                    "fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl z-50 transition-all duration-300",
                    isOpen ? "scale-0 opacity-0" : "scale-100 opacity-100",
                    "bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                )}
            >
                <BrainCircuit className="h-7 w-7 text-white" />
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-purple-500 border-2 border-white"></span>
                </span>
            </Button>

            {/* Chat Panel */}
            <div className={cn(
                "fixed right-6 bottom-6 w-[90vw] md:w-[400px] h-[600px] max-h-[80vh] bg-white rounded-3xl shadow-2xl z-50 flex flex-col overflow-hidden border border-slate-200 transition-all duration-300 origin-bottom-right",
                isOpen ? "translate-y-0 opacity-100 scale-100" : "translate-y-12 opacity-0 scale-90 pointer-events-none"
            )}>
                {/* Header */}
                <div className="p-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-xl">
                            <BrainCircuit className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="font-bold text-sm">AI Study Buddy</div>
                            <div className="text-[10px] opacity-80 flex items-center gap-1">
                                <span className="h-1.5 w-1.5 bg-green-400 rounded-full animate-pulse"></span>
                                Online & Ready to help
                            </div>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" className="hover:bg-white/10 text-white" onClick={() => setIsOpen(false)}>
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                {/* Messages Container */}
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30"
                >
                    {messages.map((msg, i) => (
                        <div key={i} className={cn(
                            "flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300",
                            msg.role === 'user' ? "items-end" : "items-start"
                        )}>
                            <div className={cn(
                                "max-w-[85%] p-3 rounded-2xl text-sm shadow-sm",
                                msg.role === 'user'
                                    ? "bg-indigo-600 text-white rounded-tr-none"
                                    : "bg-white border border-slate-200 text-slate-800 rounded-tl-none"
                            )}>
                                {msg.content.includes('(Context:') ? msg.content.split(') ').pop() : msg.content}
                            </div>
                            <span className="text-[10px] text-slate-400 mt-1 px-1">
                                {msg.role === 'assistant' ? 'AI Buddy' : 'You'}
                            </span>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex justify-start">
                            <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                                <span className="text-xs text-slate-500 italic">Thinking...</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Quick Actions Footer */}
                <div className="px-4 py-2 border-t bg-white">
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                        {quickActions.map((action) => (
                            <Button
                                key={action.label}
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs whitespace-nowrap bg-slate-50 border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 rounded-full shrink-0"
                                onClick={() => handleSendMessage(action.prompt)}
                                disabled={loading}
                            >
                                <action.icon className="h-3 w-3 mr-1.5" />
                                {action.label}
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Input Area */}
                <form
                    onSubmit={(e) => { e.preventDefault(); handleSendMessage(input); }}
                    className="p-4 bg-white border-t flex gap-2"
                >
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask a question..."
                        className="flex-1 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-indigo-500"
                        disabled={loading}
                    />
                    <Button
                        type="submit"
                        size="icon"
                        disabled={!input.trim() || loading}
                        className="bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md h-10 w-10 shrink-0"
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
            </div>
        </>
    );
}
