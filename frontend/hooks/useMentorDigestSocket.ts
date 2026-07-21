// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

/**
 * useMentorDigestSocket
 *
 * Subscribes to ws://<host>/ws/projects/digest/?token=<jwt> and invalidates
 * the mentor-dashboard React Query on every digest event so the at-risk
 * widget on /teacher/projects updates without polling. One WebSocket per
 * mentor, regardless of how many projects they guide.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { projectKeys } from '@/services/projects';
import { fetchWsTicket } from '@/lib/ws-ticket';

export type MentorDigestStatus = 'connecting' | 'open' | 'closed' | 'error';

export interface MentorDigestEvent {
    type: 'project.summary';
    project_id: string;
    status: string;
    progress_percent: number;
    overdue_task_count: number;
    is_at_risk: boolean;
}

function getWsBase(): string {
    if (typeof window === 'undefined') return '';
    const pageProto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const raw = (process.env.NEXT_PUBLIC_WS_HOST || window.location.host).trim();
    const protoMatch = raw.match(/^(wss?|https?):\/\//i);
    const host = raw.replace(/^(wss?:\/\/|https?:\/\/)/i, '').replace(/\/+$/, '');
    const proto = protoMatch
        ? (protoMatch[1].toLowerCase().startsWith('ws') ? protoMatch[1].toLowerCase() : (protoMatch[1].toLowerCase() === 'https' ? 'wss' : 'ws'))
        : pageProto;
    return `${proto}://${host}`;
}

interface Options {
    enabled?: boolean;
    onEvent?: (event: MentorDigestEvent) => void;
}

export function useMentorDigestSocket(opts?: Options) {
    const enabled = opts?.enabled ?? true;
    const wsRef = useRef<WebSocket | null>(null);
    const pingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const onEventRef = useRef(opts?.onEvent);
    onEventRef.current = opts?.onEvent;
    const connectRef = useRef<() => void>(() => {});

    const [status, setStatus] = useState<MentorDigestStatus>('closed');
    const qc = useQueryClient();

    const connect = useCallback(async () => {
        if (typeof window === 'undefined' || !enabled) return;
        // Exchange the httpOnly cookie session for a short-lived WS ticket.
        const token = await fetchWsTicket();
        if (!token) return;

        if (wsRef.current && wsRef.current.readyState < WebSocket.CLOSING) {
            wsRef.current.close();
        }

        const url = `${getWsBase()}/ws/projects/digest/?token=${token}`;
        const ws = new WebSocket(url);
        wsRef.current = ws;
        setStatus('connecting');

        ws.onopen = () => {
            setStatus('open');
            pingTimerRef.current = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'ping' }));
                }
            }, 30_000);
        };

        ws.onmessage = (evt) => {
            try {
                const msg = JSON.parse(evt.data as string) as MentorDigestEvent;
                if (msg.type === 'project.summary') {
                    onEventRef.current?.(msg);
                    qc.invalidateQueries({ queryKey: projectKeys.mentorDashboard() });
                    qc.invalidateQueries({ queryKey: projectKeys.detail(msg.project_id) });
                }
            } catch {
                // ignore malformed
            }
        };

        ws.onerror = () => setStatus('error');

        ws.onclose = (e) => {
            setStatus('closed');
            if (pingTimerRef.current) {
                clearInterval(pingTimerRef.current);
                pingTimerRef.current = null;
            }
            if (e.code !== 1000 && e.code !== 4001 && e.code !== 4403) {
                reconnectTimerRef.current = setTimeout(() => connectRef.current(), 5000);
            }
        };
    }, [enabled, qc]);

    useEffect(() => {
        connectRef.current = connect;
    }, [connect]);

    useEffect(() => {
        if (!enabled) return;
        connect();
        return () => {
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
            if (pingTimerRef.current) clearInterval(pingTimerRef.current);
            if (wsRef.current && wsRef.current.readyState < WebSocket.CLOSING) {
                wsRef.current.close(1000);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled]);

    return { status };
}
