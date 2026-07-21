// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

/**
 * useNotificationWebSocket
 *
 * Maintains a persistent WebSocket connection to the live notification endpoint:
 *   ws://<host>/ws/notifications/?token=<jwt>
 *
 * Usage:
 *   const { latestNotification, markRead, wsStatus } = useNotificationWebSocket();
 *
 * - latestNotification: the most recently pushed notification (triggers UI badge bump).
 * - markRead(id): sends mark_read over the WebSocket.
 * - wsStatus: 'connecting' | 'open' | 'closed' | 'error'
 *
 * Callers should still load the initial list via the REST API on mount; this hook
 * only handles incremental live pushes after that.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchWsTicket } from '@/lib/ws-ticket';

export type WsStatus = 'connecting' | 'open' | 'closed' | 'error';

export interface LiveNotification {
  id: string;
  title: string;
  message: string;
  link: string;
  created_at: string;
}

function getWsBase(): string {
  if (typeof window === 'undefined') return '';
  const pageProto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const raw = (process.env.NEXT_PUBLIC_WS_HOST || window.location.host).trim();
  // Tolerate operators pasting in a full URL (https://host, wss://host, etc.).
  const protoMatch = raw.match(/^(wss?|https?):\/\//i);
  const host = raw.replace(/^(wss?:\/\/|https?:\/\/)/i, '').replace(/\/+$/, '');
  const proto = protoMatch
    ? (protoMatch[1].toLowerCase().startsWith('ws') ? protoMatch[1].toLowerCase() : (protoMatch[1].toLowerCase() === 'https' ? 'wss' : 'ws'))
    : pageProto;
  return `${proto}://${host}`;
}

export function useNotificationWebSocket(opts?: {
  onNotification?: (n: LiveNotification) => void;
}) {
  const wsRef = useRef<WebSocket | null>(null);
  const [wsStatus, setWsStatus] = useState<WsStatus>('closed');
  const [latestNotification, setLatestNotification] = useState<LiveNotification | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onNotificationRef = useRef(opts?.onNotification);
  onNotificationRef.current = opts?.onNotification;
  // Holds the latest `connect` so the close handler can schedule a
  // reconnect without referencing `connect` before its declaration.
  const connectRef = useRef<() => void>(() => {});

  const connect = useCallback(async () => {
    if (typeof window === 'undefined') return;
    // Exchange the httpOnly cookie session for a short-lived WS ticket.
    const token = await fetchWsTicket();
    if (!token) return;

    if (wsRef.current && wsRef.current.readyState < WebSocket.CLOSING) {
      wsRef.current.close();
    }

    const url = `${getWsBase()}/ws/notifications/?token=${token}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;
    setWsStatus('connecting');

    ws.onopen = () => {
      setWsStatus('open');
      // Send a ping every 30s to keep the connection alive
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30_000);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string);
        if (msg.type === 'notification') {
          const notif: LiveNotification = {
            id: msg.id,
            title: msg.title,
            message: msg.message,
            link: msg.link || '',
            created_at: msg.created_at,
          };
          setLatestNotification(notif);
          onNotificationRef.current?.(notif);
        }
      } catch {
        // ignore malformed frames
      }
    };

    ws.onerror = () => setWsStatus('error');

    ws.onclose = (e) => {
      setWsStatus('closed');
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      // Auto-reconnect unless normal close or auth failure
      if (e.code !== 1000 && e.code !== 4001) {
        setTimeout(() => connectRef.current(), 5000);
      }
    };
  }, []);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    connect();
    return () => {
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      wsRef.current?.close(1000, 'unmount');
    };
  }, [connect]);

  const markRead = useCallback((notificationId: string) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'mark_read', notification_id: notificationId }));
    }
  }, []);

  return { latestNotification, markRead, wsStatus };
}
