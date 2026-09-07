export type RequestStatus = 'pending' | 'accepted' | 'playing' | 'played' | 'rejected';

export interface SongRequest {
  id: string;
  partyCode: string;
  title: string;
  artist: string;
  guestName: string;
  dedication?: string;
  genre?: string;
  status: RequestStatus;
  rejectReason?: string;
  votes: number;
  voters: string[];
  timestamp: number;
  playedAt?: number;
}

export interface PartySettings {
  allowRequests: boolean;
  allowVoting: boolean;
  allowDedications: boolean;
  maxRequestsPerGuest: number;
  announcement?: string;
}

export interface Party {
  id: string;
  code: string; // e.g. "BEAT-90"
  name: string;
  djName: string;
  genre: string;
  location?: string;
  createdAt: number;
  settings: PartySettings;
  nowPlaying?: SongRequest | null;
}

export interface PartyState {
  party: Party;
  requests: SongRequest[];
}

export type WSMessage =
  | { type: 'join'; partyCode: string; role: 'dj' | 'guest'; clientId?: string }
  | { type: 'init'; party: Party; requests: SongRequest[] }
  | { type: 'request:created'; request: SongRequest }
  | { type: 'request:updated'; request: SongRequest }
  | { type: 'request:deleted'; requestId: string }
  | { type: 'party:updated'; party: Party }
  | { type: 'ping' }
  | { type: 'pong' };
