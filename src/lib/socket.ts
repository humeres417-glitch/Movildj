import { useEffect, useState, useRef, useCallback } from 'react';
import { Party, SongRequest, WSMessage } from '../types';

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

  // Fetch initial REST data
  const fetchPartyData = useCallback(async (code: string) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/parties/${encodeURIComponent(code)}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError(`La fiesta "${code}" no existe.`);
        } else {
          setError('Error al cargar la fiesta.');
        }
        setIsLoading(false);
        return false;
      }
      const data = await res.json();
      setParty(data.party);
      setRequests(data.requests || []);
      setError(null);
      setIsLoading(false);
      return true;
    } catch (err: any) {
      console.error('Fetch party error:', err);
      setError('No se pudo conectar con el servidor.');
      setIsLoading(false);
      return false;
    }
  }, []);

  // Connect WebSocket with SSE fallback
  useEffect(() => {
    if (!partyCode) return;
    const normalizedCode = partyCode.toUpperCase();
    let isCancelled = false;

    // Fetch initial state first
    fetchPartyData(normalizedCode);

    function setupWebSocket() {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws?partyCode=${encodeURIComponent(normalizedCode)}&role=${role}`;
        
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (isCancelled) return;
          setIsConnected(true);
          ws.send(JSON.stringify({
            type: 'join',
            partyCode: normalizedCode,
            role,
            clientId: getClientId(),
          }));
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
          setIsConnected(false);
          // Try reconnecting in 3 seconds
          reconnectTimeoutRef.current = window.setTimeout(setupWebSocket, 3000);
        };

        ws.onerror = () => {
          // If WS fails, setup SSE fallback
          if (!sseRef.current) {
            setupSSE();
          }
        };
      } catch (err) {
        console.error('WS setup error:', err);
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
          if (!isCancelled) setIsConnected(false);
        };
      } catch (err) {
        console.error('SSE setup error:', err);
      }
    }

    function handleIncomingMessage(msg: any) {
      if (msg.type === 'init') {
        if (msg.party) setParty(msg.party);
        if (msg.requests) setRequests(msg.requests);
      } else if (msg.type === 'party:updated') {
        setParty(msg.party);
      } else if (msg.type === 'request:created') {
        setRequests(prev => {
          if (prev.some(r => r.id === msg.request.id)) return prev;
          return [msg.request, ...prev];
        });
      } else if (msg.type === 'request:updated') {
        setRequests(prev => prev.map(r => (r.id === msg.request.id ? msg.request : r)));
        // Also update nowPlaying in party if relevant
        if (msg.request.status === 'playing') {
          setParty(prev => prev ? { ...prev, nowPlaying: msg.request } : null);
        }
      } else if (msg.type === 'request:deleted') {
        setRequests(prev => prev.filter(r => r.id !== msg.requestId));
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

  // Actions
  const submitRequest = async (payload: { title: string; artist: string; guestName?: string; dedication?: string; genre?: string }) => {
    const res = await fetch(`/api/parties/${encodeURIComponent(partyCode)}/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, clientId: getClientId() }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Error al enviar petición');
    }
    const data = await res.json();
    return data.request as SongRequest;
  };

  const voteRequest = async (requestId: string) => {
    const res = await fetch(`/api/parties/${encodeURIComponent(partyCode)}/requests/${requestId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: getClientId() }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Error al votar');
    }
    const data = await res.json();
    return data;
  };

  const updateRequestStatus = async (requestId: string, status: SongRequest['status'], rejectReason?: string) => {
    const res = await fetch(`/api/parties/${encodeURIComponent(partyCode)}/requests/${requestId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, rejectReason }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Error al actualizar estado');
    }
    const data = await res.json();
    return data.request as SongRequest;
  };

  const deleteRequest = async (requestId: string) => {
    const res = await fetch(`/api/parties/${encodeURIComponent(partyCode)}/requests/${requestId}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Error al eliminar petición');
    }
    return true;
  };

  const updateParty = async (updates: Partial<Party>) => {
    const res = await fetch(`/api/parties/${encodeURIComponent(partyCode)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Error al actualizar fiesta');
    }
    const data = await res.json();
    setParty(data.party);
    return data.party as Party;
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
