// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

/**
 * useProjectSocket
 *
 * Connects to ws://<host>/ws/projects/<projectId>/?token=<jwt> and turns
 * server events into React Query cache invalidations so the kanban,
 * activity feed, and progress bar update in real time without polling.
 *
 * Emits an optional onEvent callback for callers that want to react in
 * place (e.g. show a "Mentor graded the project" toast).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { projectKeys } from '@/services/projects';
import { fetchWsTicket } from '@/lib/ws-ticket';

export type ProjectWsStatus = 'connecting' | 'open' | 'closed' | 'error';

export type ProjectEvent =
    | { type: 'project.task.created'; project_id: string; task: Record<string, unknown> }
    | { type: 'project.task.updated'; project_id: string; task: Record<string, unknown> }
    | { type: 'project.task.deleted'; project_id: string; task_id: string }
    | { type: 'project.update.created'; project_id: string; update: Record<string, unknown> }
    | { type: 'project.status.changed'; project_id: string; from: string; to: string }
    | { type: 'project.graded'; project_id: string; final_grade?: number }
    | { type: 'project.progress'; project_id: string; percent: number; label: string }
    | { type: 'pong' };

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

interface UseProjectSocketOptions {
    onEvent?: (event: ProjectEvent) => void;
}

export function useProjectSocket(
    projectId: string | undefined,
    opts?: UseProjectSocketOptions,
) {
    const wsRef = useRef<WebSocket | null>(null);
    const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const connectRef = useRef<() => void>(() => {});
    const onEventRef = useRef(opts?.onEvent);
    onEventRef.current = opts?.onEvent;

    const [status, setStatus] = useState<ProjectWsStatus>('closed');
    const qc = useQueryClient();

    const connect = useCallback(async () => {
        if (typeof window === 'undefined' || !projectId) return;
        // Exchange the httpOnly cookie session for a short-lived WS ticket.
        const token = await fetchWsTicket();
        if (!token) return;

        if (wsRef.current && wsRef.current.readyState < WebSocket.CLOSING) {
            wsRef.current.close();
        }

        const url = `${getWsBase()}/ws/projects/${projectId}/?token=${token}`;
        const ws = new WebSocket(url);
        wsRef.current = ws;
        setStatus('connecting');

        ws.onopen = () => {
            setStatus('open');
            pingIntervalRef.current = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'ping' }));
                }
            }, 30_000);
        };

        ws.onmessage = (evt) => {
            try {
                const msg = JSON.parse(evt.data as string) as ProjectEvent;
                onEventRef.current?.(msg);
                switch (msg.type) {
                    case 'project.task.created':
                    case 'project.task.updated':
                    case 'project.task.deleted':
                        qc.invalidateQueries({ queryKey: projectKeys.tasks(projectId) });
                        qc.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
                        qc.invalidateQueries({ queryKey: projectKeys.members(projectId) });
                        break;
                    case 'project.update.created':
                        qc.invalidateQueries({ queryKey: projectKeys.updates(projectId) });
                        break;
                    case 'project.status.changed':
                    case 'project.graded':
                    case 'project.progress':
                        qc.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
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
            if (pingIntervalRef.current) {
                clearInterval(pingIntervalRef.current);
                pingIntervalRef.current = null;
            }
            // Reconnect unless normal close, auth failure, or unauthorized.
            if (e.code !== 1000 && e.code !== 4001 && e.code !== 4403) {
                setTimeout(() => connectRef.current(), 5000);
            }
        };
    }, [projectId, qc]);

    useEffect(() => {
        connectRef.current = connect;
    }, [connect]);

    useEffect(() => {
        connect();
        return () => {
            if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
            if (wsRef.current && wsRef.current.readyState < WebSocket.CLOSING) {
                wsRef.current.close(1000);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId]);

    return { status };
}
