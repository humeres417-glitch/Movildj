import { Party, SongRequest, WSMessage } from '../types';

export const DEFAULT_PARTY_CODE = 'FIESTA-VIP';

export const DEFAULT_PARTY: Party = {
  id: 'party-seed-01',
  code: DEFAULT_PARTY_CODE,
  name: 'Noche de Fiesta & Club DJ',
  djName: 'DJ Alan Spark',
  genre: 'Hits Urbanos, Pop & Electrónica',
  location: 'Pista Central / Terraza VIP',
  createdAt: Date.now() - 3600000,
  settings: {
    allowRequests: true,
    allowVoting: true,
    allowDedications: true,
    maxRequestsPerGuest: 5,
    announcement: '¡Bienvenidos a MOVILDJ! Pidan sus canciones favoritas y voten por las mejores de la noche.',
  },
  nowPlaying: {
    id: 'req-2',
    partyCode: DEFAULT_PARTY_CODE,
    title: 'Pepas',
    artist: 'Farruko',
    guestName: 'Martín',
    dedication: '¡Que suba la energía del club!',
    genre: 'Electrónica / Tribal',
    status: 'playing',
    votes: 8,
    voters: ['guest-1', 'guest-2', 'guest-3', 'guest-4'],
    timestamp: Date.now() - 300000,
  },
};

export const DEFAULT_REQUESTS: SongRequest[] = [
  {
    id: 'req-1',
    partyCode: DEFAULT_PARTY_CODE,
    title: 'Danza Kuduro',
    artist: 'Don Omar & Lucenzo',
    guestName: 'Camila & Andrea',
    dedication: '¡Para la mesa de las chicas que estamos de fiesta!',
    genre: 'Reggaeton / Latino',
    status: 'pending',
    votes: 7,
    voters: ['guest-1', 'guest-2', 'guest-3', 'guest-4', 'guest-5', 'guest-6', 'guest-7'],
    timestamp: Date.now() - 600000,
  },
  {
    id: 'req-2',
    partyCode: DEFAULT_PARTY_CODE,
    title: 'Pepas',
    artist: 'Farruko',
    guestName: 'Martín',
    dedication: '¡Que suba la energía del club!',
    genre: 'Electrónica / Tribal',
    status: 'playing',
    votes: 8,
    voters: ['guest-1', 'guest-8', 'guest-9', 'guest-10', 'guest-11'],
    timestamp: Date.now() - 350000,
  },
  {
    id: 'req-3',
    partyCode: DEFAULT_PARTY_CODE,
    title: 'Tití Me Preguntó',
    artist: 'Bad Bunny',
    guestName: 'Diego F.',
    dedication: '¡Para bailar en la pista!',
    genre: 'Reggaeton',
    status: 'accepted',
    votes: 6,
    voters: ['guest-3', 'guest-4', 'guest-12'],
    timestamp: Date.now() - 250000,
  },
  {
    id: 'req-4',
    partyCode: DEFAULT_PARTY_CODE,
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    guestName: 'Sebastián R.',
    dedication: 'Dedicada a Valeria en su cumpleaños 🎂',
    genre: 'Synthpop',
    status: 'pending',
    votes: 4,
    voters: ['guest-3', 'guest-4', 'guest-12', 'guest-13'],
    timestamp: Date.now() - 180000,
  },
  {
    id: 'req-5',
    partyCode: DEFAULT_PARTY_CODE,
    title: 'Despacito',
    artist: 'Luis Fonsi & Daddy Yankee',
    guestName: 'Javier',
    dedication: '',
    genre: 'Pop Latino',
    status: 'played',
    playedAt: Date.now() - 600000,
    votes: 3,
    voters: ['guest-5', 'guest-6', 'guest-7'],
    timestamp: Date.now() - 900000,
  },
];

const PARTIES_STORAGE_KEY = 'movildj_parties_list';
const REQUESTS_PREFIX = 'movildj_requests_';

// BroadcastChannel for cross-tab realtime sync when backend is absent
let channel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    channel = new BroadcastChannel('movildj_sync_bus');
  }
} catch {
  // BroadcastChannel unavailable
}

export function broadcastLocalEvent(msg: WSMessage) {
  if (channel) {
    try {
      channel.postMessage(msg);
    } catch (e) {
      console.warn('BroadcastChannel error', e);
    }
  }
}

export function subscribeToLocalEvents(callback: (msg: WSMessage) => void): () => void {
  const handleMessage = (event: MessageEvent) => {
    if (event.data && typeof event.data === 'object' && event.data.type) {
      callback(event.data);
    }
  };

  if (channel) {
    channel.addEventListener('message', handleMessage);
  }

  // Also listen to storage events for browsers that don't support BroadcastChannel
  const handleStorage = (e: StorageEvent) => {
    if (e.key && (e.key === PARTIES_STORAGE_KEY || e.key.startsWith(REQUESTS_PREFIX))) {
      try {
        if (e.newValue) {
          const parsed = JSON.parse(e.newValue);
          if (parsed && parsed.__event) {
            callback(parsed.__event);
          }
        }
      } catch {
        // ignore parse error
      }
    }
  };
  window.addEventListener('storage', handleStorage);

  return () => {
    if (channel) {
      channel.removeEventListener('message', handleMessage);
    }
    window.removeEventListener('storage', handleStorage);
  };
}

export function getLocalParties(): Party[] {
  try {
    const raw = localStorage.getItem(PARTIES_STORAGE_KEY);
    if (!raw) {
      // Seed default party
      localStorage.setItem(PARTIES_STORAGE_KEY, JSON.stringify([DEFAULT_PARTY]));
      localStorage.setItem(REQUESTS_PREFIX + DEFAULT_PARTY_CODE, JSON.stringify(DEFAULT_REQUESTS));
      return [DEFAULT_PARTY];
    }
    const parties: Party[] = JSON.parse(raw);
    if (!parties.some(p => p.code === DEFAULT_PARTY_CODE)) {
      parties.push(DEFAULT_PARTY);
      localStorage.setItem(PARTIES_STORAGE_KEY, JSON.stringify(parties));
    }
    return parties;
  } catch {
    return [DEFAULT_PARTY];
  }
}

export function getLocalParty(code: string): { party: Party; requests: SongRequest[] } | null {
  const normalized = code.toUpperCase();
  const parties = getLocalParties();
  let party = parties.find(p => p.code === normalized);

  if (!party && normalized === DEFAULT_PARTY_CODE) {
    party = DEFAULT_PARTY;
    parties.push(party);
    try {
      localStorage.setItem(PARTIES_STORAGE_KEY, JSON.stringify(parties));
    } catch {}
  }

  if (!party) return null;

  let requests: SongRequest[] = [];
  try {
    const rawRequests = localStorage.getItem(REQUESTS_PREFIX + normalized);
    if (rawRequests) {
      requests = JSON.parse(rawRequests);
    } else if (normalized === DEFAULT_PARTY_CODE) {
      requests = [...DEFAULT_REQUESTS];
      localStorage.setItem(REQUESTS_PREFIX + normalized, JSON.stringify(requests));
    }
  } catch {
    requests = normalized === DEFAULT_PARTY_CODE ? [...DEFAULT_REQUESTS] : [];
  }

  return { party, requests };
}

export function createLocalParty(payload: {
  name: string;
  djName?: string;
  genre?: string;
  location?: string;
  customCode?: string;
}): Party {
  const parties = getLocalParties();
  const code = (payload.customCode || 'DJ-' + Math.random().toString(36).substring(2, 6).toUpperCase()).trim().toUpperCase();

  const newParty: Party = {
    id: 'party-' + Date.now(),
    code,
    name: payload.name,
    djName: payload.djName || 'DJ Anfitrión',
    genre: payload.genre || 'Variado / All Hits',
    location: payload.location || 'Pista Principal',
    createdAt: Date.now(),
    settings: {
      allowRequests: true,
      allowVoting: true,
      allowDedications: true,
      maxRequestsPerGuest: 5,
      announcement: `¡Bienvenidos a ${payload.name}! Pidan sus temas favoritos.`,
    },
    nowPlaying: null,
  };

  const updatedParties = [...parties.filter(p => p.code !== code), newParty];
  localStorage.setItem(PARTIES_STORAGE_KEY, JSON.stringify(updatedParties));
  localStorage.setItem(REQUESTS_PREFIX + code, JSON.stringify([]));

  broadcastLocalEvent({ type: 'party:updated', party: newParty });
  return newParty;
}

export function updateLocalParty(code: string, updates: Partial<Party>): Party {
  const normalized = code.toUpperCase();
  const parties = getLocalParties();
  const index = parties.findIndex(p => p.code === normalized);
  let currentParty: Party;

  if (index >= 0) {
    currentParty = { ...parties[index], ...updates };
    parties[index] = currentParty;
  } else {
    currentParty = { ...DEFAULT_PARTY, code: normalized, ...updates };
    parties.push(currentParty);
  }

  localStorage.setItem(PARTIES_STORAGE_KEY, JSON.stringify(parties));
  broadcastLocalEvent({ type: 'party:updated', party: currentParty });
  return currentParty;
}

export function addLocalRequest(code: string, payload: {
  title: string;
  artist: string;
  guestName?: string;
  dedication?: string;
  genre?: string;
  clientId: string;
}): SongRequest {
  const normalized = code.toUpperCase();
  const { party, requests } = getLocalParty(normalized) || { party: DEFAULT_PARTY, requests: [] };

  const newRequest: SongRequest = {
    id: 'req-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    partyCode: normalized,
    title: payload.title.trim(),
    artist: payload.artist.trim(),
    guestName: (payload.guestName || 'Invitado').trim(),
    dedication: (payload.dedication || '').trim(),
    genre: payload.genre || '',
    status: 'pending',
    votes: 1,
    voters: [payload.clientId],
    timestamp: Date.now(),
  };

  const updatedRequests = [newRequest, ...requests];
  localStorage.setItem(REQUESTS_PREFIX + normalized, JSON.stringify(updatedRequests));

  broadcastLocalEvent({ type: 'request:created', request: newRequest });
  return newRequest;
}

export function voteLocalRequest(code: string, requestId: string, clientId: string): { request: SongRequest; voted: boolean } {
  const normalized = code.toUpperCase();
  const { party, requests } = getLocalParty(normalized) || { party: DEFAULT_PARTY, requests: [] };
  const target = requests.find(r => r.id === requestId);

  if (!target) throw new Error('Petición no encontrada');

  const voterIndex = target.voters.indexOf(clientId);
  let voted = false;
  if (voterIndex >= 0) {
    target.voters.splice(voterIndex, 1);
    target.votes = Math.max(0, target.votes - 1);
    voted = false;
  } else {
    target.voters.push(clientId);
    target.votes += 1;
    voted = true;
  }

  localStorage.setItem(REQUESTS_PREFIX + normalized, JSON.stringify(requests));
  broadcastLocalEvent({ type: 'request:updated', request: target });
  return { request: target, voted };
}

export function updateLocalRequestStatus(
  code: string,
  requestId: string,
  status: SongRequest['status'],
  rejectReason?: string
): SongRequest {
  const normalized = code.toUpperCase();
  const { party, requests } = getLocalParty(normalized) || { party: DEFAULT_PARTY, requests: [] };
  const target = requests.find(r => r.id === requestId);

  if (!target) throw new Error('Petición no encontrada');

  target.status = status;
  if (status === 'played') {
    target.playedAt = Date.now();
  }
  if (rejectReason !== undefined) {
    target.rejectReason = rejectReason;
  }

  localStorage.setItem(REQUESTS_PREFIX + normalized, JSON.stringify(requests));

  if (status === 'playing') {
    updateLocalParty(normalized, { nowPlaying: target });
  } else if (party.nowPlaying?.id === requestId) {
    updateLocalParty(normalized, { nowPlaying: null });
  }

  broadcastLocalEvent({ type: 'request:updated', request: target });
  return target;
}

export function deleteLocalRequest(code: string, requestId: string): boolean {
  const normalized = code.toUpperCase();
  const { requests } = getLocalParty(normalized) || { party: DEFAULT_PARTY, requests: [] };
  const updated = requests.filter(r => r.id !== requestId);
  localStorage.setItem(REQUESTS_PREFIX + normalized, JSON.stringify(updated));

  broadcastLocalEvent({ type: 'request:deleted', requestId });
  return true;
}
