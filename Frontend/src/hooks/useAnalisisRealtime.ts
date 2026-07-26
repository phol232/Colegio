import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import api from '../services/api';

const FALLBACK_POLL_MS = 60_000;

function socketBaseUrl(): string {
  const configured = import.meta.env.VITE_API_URL?.trim();
  if (configured) {
    // VITE_API_URL suele ser "/api" o "http://host/api"
    return configured.replace(/\/api\/?$/, '') || window.location.origin;
  }
  return window.location.origin;
}

interface AnalisisActualizadoPayload {
  version: number;
  cursoId?: number;
  docenteId?: number;
}

/**
 * Conecta al namespace /analisis y recarga datos cuando llega analisis:actualizado.
 * Fallback: polling largo de /analisis/version si el socket no conecta.
 */
export function useAnalisisRealtime(
  onRefresh: () => void,
  versionRef: React.MutableRefObject<number | null>,
) {
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    let socket: Socket | null = null;
    let fallbackInterval: number | null = null;
    let connected = false;

    const applyVersion = (next: number) => {
      if (versionRef.current == null) {
        versionRef.current = next;
        return;
      }
      if (next !== versionRef.current) {
        versionRef.current = next;
        onRefreshRef.current();
      }
    };

    const startFallbackPoll = () => {
      if (fallbackInterval != null) return;
      fallbackInterval = window.setInterval(async () => {
        if (document.visibilityState !== 'visible') return;
        try {
          const res = await api.get('/analisis/version');
          applyVersion(Number(res.data?.data?.version ?? 0));
        } catch {
          // silencioso
        }
      }, FALLBACK_POLL_MS);
    };

    const stopFallbackPoll = () => {
      if (fallbackInterval != null) {
        window.clearInterval(fallbackInterval);
        fallbackInterval = null;
      }
    };

    socket = io(`${socketBaseUrl()}/analisis`, {
      path: '/api/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });

    socket.on('connect', () => {
      connected = true;
      stopFallbackPoll();
    });

    socket.on('disconnect', () => {
      connected = false;
      startFallbackPoll();
    });

    socket.on('connect_error', () => {
      if (!connected) startFallbackPoll();
    });

    socket.on('analisis:actualizado', (payload: AnalisisActualizadoPayload) => {
      applyVersion(Number(payload?.version ?? 0));
    });

    // Si no conecta en 3s, arrancar fallback
    const connectTimeout = window.setTimeout(() => {
      if (!connected) startFallbackPoll();
    }, 3000);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        onRefreshRef.current();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.clearTimeout(connectTimeout);
      stopFallbackPoll();
      document.removeEventListener('visibilitychange', onVisibility);
      socket?.disconnect();
    };
  }, [versionRef]);
}
