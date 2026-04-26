import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { useAuthStore } from '@/stores/authStore';
import { useSSEStore } from '@/stores/sseStore';
import { TASKS_KEY } from './useTasks';
import { apiGetSSETicket } from '@/api/endpoints';

const hostUri  = Constants.expoConfig?.hostUri;
const localIp  = hostUri ? hostUri.split(':')[0] : null;
const FALLBACK = localIp ? `http://${localIp}:3000/api` : 'http://10.0.2.2:3000/api';
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || FALLBACK;

const parseSSEChunk = (chunk: string): Array<{ event: string; data: string }> => {
  const events: Array<{ event: string; data: string }> = [];
  for (const msg of chunk.split('\n\n').filter(Boolean)) {
    let event = 'message', data = '';
    for (const line of msg.split('\n')) {
      if (line.startsWith('event: ')) event = line.slice(7).trim();
      if (line.startsWith('data: '))  data  = line.slice(6).trim();
    }
    if (data) events.push({ event, data });
  }
  return events;
};

const HIGHLIGHT_TTL = 1500;
const NOTIFICATION_TTL = 3000;

export const useSSE = () => {
  const qc           = useQueryClient();
  const accessToken  = useAuthStore((s) => s.accessToken);
  const {
    setConnected, setNotification, highlightTask, clearHighlight,
  } = useSSEStore.getState();
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;

    const connect = async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const ticket   = await apiGetSSETicket();
        const response = await fetch(`${BASE_URL}/sse?ticket=${ticket}`, {
          headers: { Accept: 'text/event-stream', 'Cache-Control': 'no-cache' },
          signal:  controller.signal,
        });

        if (!response.ok || !response.body) throw new Error('Connection failed');

        const reader  = response.body.getReader();
        const decoder = new TextDecoder();
        setConnected(true);

        while (true) {
          if (cancelled) break;
          const { done, value } = await reader.read();
          if (done) break;

          const text   = decoder.decode(value, { stream: true });
          const events = parseSSEChunk(text);

          for (const { event, data } of events) {
            if (event === 'connected') {
              setConnected(true);
            } else if (['task:assigned', 'task:updated', 'task:deleted'].includes(event)) {
              qc.invalidateQueries({ queryKey: TASKS_KEY });

              // Parse event payload safely
              let payload: Record<string, string> = {};
              try { payload = JSON.parse(data); } catch { /* noop */ }

              if (event === 'task:assigned') {
                setNotification(`New task: "${payload.title ?? 'Untitled'}"`);
                setTimeout(() => useSSEStore.getState().setNotification(null), NOTIFICATION_TTL);
              } else if (event === 'task:updated') {
                if (payload.taskId) {
                  highlightTask(payload.taskId);
                  setTimeout(() => clearHighlight(payload.taskId), HIGHLIGHT_TTL);
                }
                setNotification('Task updated');
                setTimeout(() => useSSEStore.getState().setNotification(null), NOTIFICATION_TTL);
              } else if (event === 'task:deleted') {
                setNotification(`Task "${payload.title ?? ''}" deleted`);
                setTimeout(() => useSSEStore.getState().setNotification(null), NOTIFICATION_TTL);
              }
            }
          }
        }
      } catch (err: unknown) {
        if ((err as Error)?.name === 'AbortError') return;
        setConnected(false);
        if (!cancelled) setTimeout(connect, 5000);
      }
    };

    connect();
    return () => {
      cancelled = true;
      setConnected(false);
      abortRef.current?.abort();
    };
  }, [accessToken]);
};
