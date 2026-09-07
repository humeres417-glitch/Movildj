import { useEffect, useState, useRef, useCallback } from 'react';
import { Party, SongRequest, WSMessage } from '../types';
import {
  getLocalParty,
  getLocalParties,
  addLocalRequest,
  voteLocalRequest,
  updateLocalRequestStatus,
  deleteLocalRequest,
  updateLocalParty,
  subscribeToLocalEvents,
  DEFAULT_PARTY_CODE,
} from './localStore';

export function getClientId(): string {
  let id = localStorage.getItem('dj_client_id');
  if (!id) {
    id = 'guest_' + Math.random().toString(36).substring(2, 10);
    localStorage.setItem('dj_client_id', id);
  }
  return id;
}

interface UsePartyRealtimeProps {
  partyCode: string;
  role: 'dj' | 'guest';
}

export function usePartyRealtime({ partyCode, role }: UsePartyRealtimeProps) {
  const [party, setParty] = useState<Party | null>(null);
  const [requests, setRequests] = useState<SongRequest[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const sseRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  // Fetch initial REST data with automatic fallback to LocalStore for Vercel / offline deployments
  const fetchPartyData = useCallback(async (code: string) => {
    const normalized = (code || DEFAULT_PARTY_CODE).trim().toUpperCase();
    try {
      setIsLoading(true);
      const res = await fetch(`/api/parties/${encodeURIComponent(normalized)}`);
      const contentType = res.headers.get('content-type') || '';

      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data && data.party) {
          setParty(data.party);
          setRequests(data.requests || []);
          setError(null);
          setIsLoading(false);
          // Keep local store updated in background
          updateLocalParty(data.party.code, data.party);
          return true;
        }
      }

      // If server returned 404, HTML (Vercel SPA fallback), or error: check local store
      const local = getLocalParty(normalized);
      if (local && local.party) {
        setParty(local.party);
        setRequests(local.requests || []);
        setError(null);
        setIsLoading(false);
        setIsConnected(true);
        return true;
      }

      // If normalized is default and not found, localStore auto-seeds it
      if (normalized === DEFAULT_PARTY_CODE) {
        const seeded = getLocalParty(DEFAULT_PARTY_CODE);
        if (seeded) {
          setParty(seeded.party);
          setRequests(seeded.requests);
          setError(null);
          setIsLoading(false);
          setIsConnected(true);
          return true;
        }
      }

      setError(`La fiesta "${normalized}" no existe.`);
      setIsLoading(false);
      return false;
    } catch (err: any) {
      console.warn('Network fetch failed, activating local storage fallback:', err);
      // Fallback seamlessly to local storage
      const local = getLocalParty(normalized);
      if (local && local.party) {
        setParty(local.party);
        setRequests(local.requests || []);
        setError(null);
        setIsLoading(false);
        setIsConnected(true);
        return true;
      }

      setError('No se pudo conectar con el servidor.');
      setIsLoading(false);
      return false;
    }
  }, []);

  // Connect WebSocket & SSE with Local Events fallback
  useEffect(() => {
    if (!partyCode) return;
    const normalizedCode = partyCode.toUpperCase();
    let isCancelled = false;

    // Fetch initial state first
    fetchPartyData(normalizedCode);

    // Listen to cross-tab / local events for Vercel / offline environments
    const unsubscribeLocal = subscribeToLocalEvents((msg) => {
      if (isCancelled) return;
      handleIncomingMessage(msg);
    });

    function setupWebSocket() {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws?partyCode=${encodeURIComponent(normalizedCode)}&role=${role}`;

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (isCancelled) return;
          setIsConnected(true);
          ws.send(
            JSON.stringify({
              type: 'join',
              partyCode: normalizedCode,
              role,
              clientId: getClientId(),
            })
          );
        };

        ws.onmessage = (event) => {
          if (isCancelled) return;
          try {
            const data: WSMessage = JSON.parse(event.data);
            handleIncomingMessage(data);
          } catch (e) {
            console.error('Failed to parse WS data', e);
          }
        };

        ws.onclose = () => {
          if (isCancelled) return;
          // If WS closes, we might be on Vercel or disconnected, keep local connected flag
          reconnectTimeoutRef.current = window.setTimeout(setupWebSocket, 5000);
        };

        ws.onerror = () => {
          if (!sseRef.current) {
            setupSSE();
          }
        };
      } catch {
        setupSSE();
      }
    }

    function setupSSE() {
      try {
        if (sseRef.current) return;
        const sse = new EventSource(`/api/parties/${encodeURIComponent(normalizedCode)}/events`);
        sseRef.current = sse;

        sse.onopen = () => {
          if (!isCancelled) setIsConnected(true);
        };

        sse.onmessage = (event) => {
          if (isCancelled) return;
          try {
            const data = JSON.parse(event.data);
            handleIncomingMessage(data);
          } catch (e) {
            console.error('Failed to parse SSE data', e);
          }
        };

        sse.onerror = () => {
          // SSE failed or not supported by host (e.g. Vercel static)
          if (!isCancelled) {
            // Keep connected via local BroadcastChannel
            setIsConnected(true);
          }
        };
      } catch {
        setIsConnected(true);
      }
    }

    function handleIncomingMessage(msg: any) {
      if (msg.type === 'init') {
        if (msg.party) setParty(msg.party);
        if (msg.requests) setRequests(msg.requests);
      } else if (msg.type === 'party:updated') {
        setParty(msg.party);
      } else if (msg.type === 'request:created') {
        setRequests((prev) => {
          if (prev.some((r) => r.id === msg.request.id)) return prev;
          return [msg.request, ...prev];
        });
      } else if (msg.type === 'request:updated') {
        setRequests((prev) => prev.map((r) => (r.id === msg.request.id ? msg.request : r)));
        if (msg.request.status === 'playing') {
          setParty((prev) => (prev ? { ...prev, nowPlaying: msg.request } : null));
        }
      } else if (msg.type === 'request:deleted') {
        setRequests((prev) => prev.filter((r) => r.id !== msg.requestId));
      }
    }

    setupWebSocket();

    // Heartbeat ping interval
    const pingInterval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 25000);

    return () => {
      isCancelled = true;
      unsubscribeLocal();
      clearInterval(pingInterval);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (sseRef.current) {
        sseRef.current.close();
      }
    };
  }, [partyCode, role, fetchPartyData]);

  // Actions with automatic LocalStore Fallback
  const submitRequest = async (payload: {
    title: string;
    artist: string;
    guestName?: string;
    dedication?: string;
    genre?: string;
  }) => {
    try {
      const res = await fetch(`/api/parties/${encodeURIComponent(partyCode)}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, clientId: getClientId() }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        return data.request as SongRequest;
      }
    } catch {
      // Backend unavailable, fallback to local store
    }

    // LocalStore fallback
    const localReq = addLocalRequest(partyCode, { ...payload, clientId: getClientId() });
    setRequests((prev) => [localReq, ...prev]);
    return localReq;
  };

  const voteRequest = async (requestId: string) => {
    try {
      const res = await fetch(
        `/api/parties/${encodeURIComponent(partyCode)}/requests/${requestId}/vote`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId: getClientId() }),
        }
      );
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        return data;
      }
    } catch {
      // Backend unavailable
    }

    // LocalStore fallback
    const result = voteLocalRequest(partyCode, requestId, getClientId());
    setRequests((prev) => prev.map((r) => (r.id === requestId ? result.request : r)));
    return result;
  };

  const updateRequestStatus = async (
    requestId: string,
    status: SongRequest['status'],
    rejectReason?: string
  ) => {
    try {
      const res = await fetch(`/api/parties/${encodeURIComponent(partyCode)}/requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, rejectReason }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        return data.request as SongRequest;
      }
    } catch {
      // Backend unavailable
    }

    // LocalStore fallback
    const updated = updateLocalRequestStatus(partyCode, requestId, status, rejectReason);
    setRequests((prev) => prev.map((r) => (r.id === requestId ? updated : r)));
    if (status === 'playing') {
      setParty((prev) => (prev ? { ...prev, nowPlaying: updated } : null));
    }
    return updated;
  };

  const deleteRequest = async (requestId: string) => {
    try {
      const res = await fetch(`/api/parties/${encodeURIComponent(partyCode)}/requests/${requestId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        return true;
      }
    } catch {
      // Backend unavailable
    }

    deleteLocalRequest(partyCode, requestId);
    setRequests((prev) => prev.filter((r) => r.id !== requestId));
    return true;
  };

  const updateParty = async (updates: Partial<Party>) => {
    try {
      const res = await fetch(`/api/parties/${encodeURIComponent(partyCode)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        setParty(data.party);
        return data.party as Party;
      }
    } catch {
      // Backend unavailable
    }

    const updated = updateLocalParty(partyCode, updates);
    setParty(updated);
    return updated;
  };

  return {
    party,
    requests,
    isConnected,
    isLoading,
    error,
    reload: () => fetchPartyData(partyCode),
    submitRequest,
    voteRequest,
    updateRequestStatus,
    deleteRequest,
    updateParty,
  };
}
