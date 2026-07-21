// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

/**
 * useTutorWebSocket
 *
 * Manages a persistent WebSocket connection to the AI tutor streaming endpoint:
 *   ws://<host>/ws/tutor/chat/?token=<jwt>
 *
 * Usage:
 *   const { sendMessage, status, streamingContent, lastDone, budgetError } = useTutorWebSocket();
 *
 * - Call sendMessage() to send a chat message.
 * - streamingContent: accumulates the in-flight assistant response token by token.
 * - lastDone: populated once the done frame arrives (sources, confidence, budget, etc.).
 * - budgetError: set when the server returns a budget_exceeded frame.
 * - status: 'connecting' | 'open' | 'closed' | 'error'
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchWsTicket } from '@/lib/ws-ticket';

export type WsStatus = 'connecting' | 'open' | 'closed' | 'error';

export interface TutorDonePayload {
  conversation_id: string;
  answer: string;
  sources: Array<{
    source_type: string;
    source_id: string;
    text_span?: string;
    snippet?: string;
    similarity?: number;
    metadata?: Record<string, unknown>;
  }>;
  confidence: number;
  confidence_label: 'high' | 'moderate' | 'low';
  mode: string;
  usage: { prompt_tokens: number; completion_tokens: number };
  is_demo: boolean;
  fallback_reason?: string | null;
  error?: string | null;
  budget: {
    used_today: number;
    daily_limit: number;
    resets_at: string;
    is_active: boolean;
  } | null;
}

export interface BudgetError {
  detail: string;
  used_today: number;
  daily_limit: number;
  resets_at: string;
}

interface SendOptions {
  message: string;
  conversationId?: string | null;
  context?: Record<string, unknown>;
}

function getWsBase(): string {
  if (typeof window === 'undefined') return '';
  const pageProto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  // In development Next.js proxies API calls; for WS we connect directly to backend
  const raw = (process.env.NEXT_PUBLIC_WS_HOST || window.location.host).trim();
  const protoMatch = raw.match(/^(wss?|https?):\/\//i);
  const host = raw.replace(/^(wss?:\/\/|https?:\/\/)/i, '').replace(/\/+$/, '');
  const proto = protoMatch
    ? (protoMatch[1].toLowerCase().startsWith('ws') ? protoMatch[1].toLowerCase() : (protoMatch[1].toLowerCase() === 'https' ? 'wss' : 'ws'))
    : pageProto;
  return `${proto}://${host}`;
}

export function useTutorWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<WsStatus>('closed');
  const [streamingContent, setStreamingContent] = useState('');
  const [lastDone, setLastDone] = useState<TutorDonePayload | null>(null);
  const [budgetError, setBudgetError] = useState<BudgetError | null>(null);

  // Callbacks so callers can react to events
  const onDoneRef = useRef<((payload: TutorDonePayload) => void) | null>(null);
  const onErrorRef = useRef<((detail: string) => void) | null>(null);
  // Holds the latest `connect` so the close handler can schedule a
  // reconnect without referencing `connect` before its declaration.
  const connectRef = useRef<() => void>(() => {});

  const connect = useCallback(async () => {
    if (typeof window === 'undefined') return;
    // Exchange the httpOnly cookie session for a short-lived WS ticket.
    const token = await fetchWsTicket();
    if (!token) return;

    // Close existing connection if any
    if (wsRef.current && wsRef.current.readyState < WebSocket.CLOSING) {
      wsRef.current.close();
    }

    const url = `${getWsBase()}/ws/tutor/chat/?token=${token}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;
    setStatus('connecting');

    ws.onopen = () => setStatus('open');

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string);
        switch (msg.type) {
          case 'token':
            setStreamingContent((prev) => prev + (msg.content || ''));
            break;

          case 'done': {
            const payload = msg as TutorDonePayload & { type: string };
            setLastDone(payload);
            setStreamingContent('');
            onDoneRef.current?.(payload);
            break;
          }

          case 'budget_exceeded':
            setBudgetError({
              detail: msg.detail,
              used_today: msg.used_today,
              daily_limit: msg.daily_limit,
              resets_at: msg.resets_at,
            });
            setStreamingContent('');
            break;

          case 'error':
          case 'no_context':
            onErrorRef.current?.(msg.detail || 'AI error');
            setStreamingContent('');
            break;

          default:
            break;
        }
      } catch {
        // ignore malformed frames
      }
    };

    ws.onerror = () => setStatus('error');

    ws.onclose = (e) => {
      setStatus('closed');
      // Auto-reconnect on abnormal close (not 1000=normal or 4001=auth)
      if (e.code !== 1000 && e.code !== 4001) {
        setTimeout(() => connectRef.current(), 3000);
      }
    };
  }, []);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  // Connect once on mount; clean up on unmount
  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close(1000, 'unmount');
    };
  }, [connect]);

  const sendMessage = useCallback(
    (
      opts: SendOptions,
      callbacks?: {
        onDone?: (p: TutorDonePayload) => void;
        onError?: (detail: string) => void;
      }
    ) => {
      onDoneRef.current = callbacks?.onDone ?? null;
      onErrorRef.current = callbacks?.onError ?? null;
      setBudgetError(null);
      setStreamingContent('');
      setLastDone(null);

      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        // Reconnect then send once open
        connect();
        const retry = setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            clearInterval(retry);
            wsRef.current.send(
              JSON.stringify({
                type: 'chat',
                message: opts.message,
                conversation_id: opts.conversationId ?? null,
                context: opts.context ?? {},
              })
            );
          }
        }, 100);
        return;
      }

      ws.send(
        JSON.stringify({
          type: 'chat',
          message: opts.message,
          conversation_id: opts.conversationId ?? null,
          context: opts.context ?? {},
        })
      );
    },
    [connect]
  );

  return { sendMessage, status, streamingContent, lastDone, budgetError };
}
