import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import QRCode from 'qrcode';
import { createServer as createViteServer } from 'vite';

export interface SongRequest {
  id: string;
  partyCode: string;
  title: string;
  artist: string;
  guestName: string;
  dedication?: string;
  genre?: string;
  status: 'pending' | 'accepted' | 'playing' | 'played' | 'rejected';
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
  code: string;
  name: string;
  djName: string;
  genre: string;
  location?: string;
  createdAt: number;
  settings: PartySettings;
  nowPlaying?: SongRequest | null;
}

// In-memory persistent database for active parties & requests
const parties: Map<string, Party> = new Map();
const partyRequests: Map<string, SongRequest[]> = new Map();

// Real-time connections
interface ClientSession {
  ws: WebSocket;
  partyCode: string;
  role: 'dj' | 'guest';
}
const wsClients = new Set<ClientSession>();
const sseClients = new Map<string, Set<express.Response>>(); // partyCode -> Set of responses

// Seed initial default party for instant testing
const defaultPartyCode = 'FIESTA-VIP';
const defaultParty: Party = {
  id: 'party-seed-01',
  code: defaultPartyCode,
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
    announcement: '¡Bienvenidos! Pidan sus canciones favoritas y voten por las mejores de la noche.',
  },
  nowPlaying: {
    id: 'req-now-playing',
    partyCode: defaultPartyCode,
    title: 'Titanium',
    artist: 'David Guetta ft. Sia',
    guestName: 'DJ Alan (Setlist)',
    genre: 'Electrónica',
    status: 'playing',
    votes: 8,
    voters: ['dj'],
    timestamp: Date.now() - 120000,
  },
};

const initialRequests: SongRequest[] = [
  {
    id: 'req-1',
    partyCode: defaultPartyCode,
    title: 'Danza Kuduro',
    artist: 'Don Omar & Lucenzo',
    guestName: 'Camila & Andrea',
    dedication: '¡Para la mesa de las chicas que estamos celebrando!',
    genre: 'Reggaeton / Latino',
    status: 'pending',
    votes: 7,
    voters: ['guest-1', 'guest-2', 'guest-3', 'guest-4', 'guest-5', 'guest-6', 'guest-7'],
    timestamp: Date.now() - 450000,
  },
  {
    id: 'req-2',
    partyCode: defaultPartyCode,
    title: 'Pepas',
    artist: 'Farruko',
    guestName: 'Martín',
    dedication: '¡Que suba la energía del club!',
    genre: 'Electrónica / Tribal',
    status: 'accepted',
    votes: 5,
    voters: ['guest-1', 'guest-8', 'guest-9', 'guest-10', 'guest-11'],
    timestamp: Date.now() - 350000,
  },
  {
    id: 'req-3',
    partyCode: defaultPartyCode,
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
    id: 'req-4',
    partyCode: defaultPartyCode,
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

parties.set(defaultPartyCode, defaultParty);
partyRequests.set(defaultPartyCode, initialRequests);

// Broadcast helper for WebSockets & SSE
function broadcastToParty(partyCode: string, payload: any) {
  const normalizedCode = partyCode.toUpperCase();
  const rawData = JSON.stringify(payload);

  // 1. WebSocket broadcast
  for (const client of wsClients) {
    if (client.partyCode === normalizedCode && client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(rawData);
      } catch (err) {
        console.error('Error sending WS message:', err);
      }
    }
  }

  // 2. SSE broadcast
  const sseSet = sseClients.get(normalizedCode);
  if (sseSet && sseSet.size > 0) {
    const sseFormatted = `data: ${rawData}\n\n`;
    for (const res of sseSet) {
      try {
        res.write(sseFormatted);
      } catch (err) {
        sseSet.delete(res);
      }
    }
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  const server = http.createServer(app);

  app.use(express.json());

  // WebSocket Server attached to same HTTP server on port 3000
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
    if (url.pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      // Let other upgrades pass or close
      socket.destroy();
    }
  });

  wss.on('connection', (ws, request) => {
    const url = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
    const partyCode = (url.searchParams.get('partyCode') || defaultPartyCode).toUpperCase();
    const role = (url.searchParams.get('role') === 'dj' ? 'dj' : 'guest') as 'dj' | 'guest';

    const session: ClientSession = { ws, partyCode, role };
    wsClients.add(session);

    // Send initial state to the client
    const currentParty = parties.get(partyCode);
    const requests = partyRequests.get(partyCode) || [];
    if (currentParty) {
      ws.send(JSON.stringify({
        type: 'init',
        party: currentParty,
        requests,
      }));
    }

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'join' && msg.partyCode) {
          session.partyCode = msg.partyCode.toUpperCase();
          session.role = msg.role || 'guest';
          const p = parties.get(session.partyCode);
          const r = partyRequests.get(session.partyCode) || [];
          if (p) {
            ws.send(JSON.stringify({ type: 'init', party: p, requests: r }));
          }
        } else if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
        }
      } catch (err) {
        console.error('Failed to parse WS client message', err);
      }
    });

    ws.on('close', () => {
      wsClients.delete(session);
    });

    ws.on('error', () => {
      wsClients.delete(session);
    });
  });

  // REST API Routes

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', partiesCount: parties.size, timestamp: Date.now() });
  });

  // Get list of parties
  app.get('/api/parties', (req, res) => {
    const list = Array.from(parties.values()).map(p => ({
      ...p,
      requestsCount: (partyRequests.get(p.code) || []).length,
    }));
    res.json({ parties: list });
  });

  // Create new party
  app.post('/api/parties', (req, res) => {
    const { name, djName, genre, location, customCode } = req.body;
    let code = (customCode || '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
    if (!code || code.length < 3) {
      const randNum = Math.floor(100 + Math.random() * 900);
      const prefix = (name ? name.slice(0, 3) : 'DJ').toUpperCase().replace(/[^A-Z]/g, 'SET');
      code = `${prefix}-${randNum}`;
    }

    if (parties.has(code)) {
      code = `${code}-${Math.floor(10 + Math.random() * 90)}`;
    }

    const newParty: Party = {
      id: 'party-' + Date.now(),
      code,
      name: (name || 'Fiesta DJ en Vivo').trim(),
      djName: (djName || 'DJ Principal').trim(),
      genre: (genre || 'Todos los géneros / Open Format').trim(),
      location: (location || 'Sala Principal').trim(),
      createdAt: Date.now(),
      settings: {
        allowRequests: true,
        allowVoting: true,
        allowDedications: true,
        maxRequestsPerGuest: 5,
        announcement: '¡Pide tu canción y vota por las mejores!',
      },
      nowPlaying: null,
    };

    parties.set(code, newParty);
    partyRequests.set(code, []);

    res.status(201).json({ party: newParty });
  });

  // Get party state
  app.get('/api/parties/:code', (req, res) => {
    const code = req.params.code.toUpperCase();
    const party = parties.get(code);
    if (!party) {
      res.status(404).json({ error: 'Fiesta no encontrada' });
      return;
    }
    const requests = partyRequests.get(code) || [];
    res.json({ party, requests });
  });

  // Update party details / settings
  app.patch('/api/parties/:code', (req, res) => {
    const code = req.params.code.toUpperCase();
    const party = parties.get(code);
    if (!party) {
      res.status(404).json({ error: 'Fiesta no encontrada' });
      return;
    }

    const { name, djName, genre, location, settings, nowPlaying } = req.body;
    if (name) party.name = name;
    if (djName) party.djName = djName;
    if (genre) party.genre = genre;
    if (location !== undefined) party.location = location;
    if (settings) party.settings = { ...party.settings, ...settings };
    if (nowPlaying !== undefined) party.nowPlaying = nowPlaying;

    parties.set(code, party);
    broadcastToParty(code, { type: 'party:updated', party });
    res.json({ party });
  });

  // Submit song request from guest
  app.post('/api/parties/:code/requests', (req, res) => {
    const code = req.params.code.toUpperCase();
    const party = parties.get(code);
    if (!party) {
      res.status(404).json({ error: 'Fiesta no encontrada' });
      return;
    }

    if (!party.settings.allowRequests) {
      res.status(403).json({ error: 'El DJ ha pausado la recepción de nuevas canciones temporalmente.' });
      return;
    }

    const { title, artist, guestName, dedication, genre, clientId } = req.body;
    if (!title || !artist) {
      res.status(400).json({ error: 'El título de la canción y el artista son obligatorios.' });
      return;
    }

    const currentList = partyRequests.get(code) || [];

    // Optional check for max requests from client
    if (clientId && party.settings.maxRequestsPerGuest) {
      const clientRequests = currentList.filter(r => r.voters.includes(clientId));
      if (clientRequests.length >= party.settings.maxRequestsPerGuest) {
        res.status(400).json({
          error: `Has alcanzado el límite máximo de ${party.settings.maxRequestsPerGuest} peticiones para esta fiesta.`,
        });
        return;
      }
    }

    const newRequest: SongRequest = {
      id: 'req-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      partyCode: code,
      title: title.trim(),
      artist: artist.trim(),
      guestName: (guestName || 'Invitado anónimo').trim(),
      dedication: (dedication || '').trim(),
      genre: (genre || '').trim(),
      status: 'pending',
      votes: 1,
      voters: clientId ? [clientId] : ['guest-' + Date.now()],
      timestamp: Date.now(),
    };

    currentList.unshift(newRequest);
    partyRequests.set(code, currentList);

    broadcastToParty(code, { type: 'request:created', request: newRequest });
    res.status(201).json({ request: newRequest });
  });

  // Vote on a request
  app.post('/api/parties/:code/requests/:requestId/vote', (req, res) => {
    const code = req.params.code.toUpperCase();
    const { requestId } = req.params;
    const { clientId } = req.body;

    const list = partyRequests.get(code);
    if (!list) {
      res.status(404).json({ error: 'Fiesta no encontrada' });
      return;
    }

    const target = list.find(r => r.id === requestId);
    if (!target) {
      res.status(404).json({ error: 'Petición no encontrada' });
      return;
    }

    const voterKey = clientId || 'anon-' + req.ip;
    const hasVoted = target.voters.includes(voterKey);

    if (hasVoted) {
      // Toggle unvote
      target.votes = Math.max(0, target.votes - 1);
      target.voters = target.voters.filter(v => v !== voterKey);
    } else {
      // Upvote
      target.votes += 1;
      target.voters.push(voterKey);
    }

    broadcastToParty(code, { type: 'request:updated', request: target });
    res.json({ request: target, hasVoted: !hasVoted });
  });

  // DJ updates request status (pending, accepted, playing, played, rejected)
  const handleUpdateStatus = (req: express.Request, res: express.Response) => {
    const code = req.params.code.toUpperCase();
    const { requestId } = req.params;
    const { status, rejectReason } = req.body;

    const party = parties.get(code);
    const list = partyRequests.get(code);
    if (!party || !list) {
      res.status(404).json({ error: 'Fiesta no encontrada' });
      return;
    }

    const target = list.find(r => r.id === requestId);
    if (!target) {
      res.status(404).json({ error: 'Petición no encontrada' });
      return;
    }

    if (status) {
      target.status = status;
      if (status === 'playing') {
        party.nowPlaying = target;
        broadcastToParty(code, { type: 'party:updated', party });
      } else if (status === 'played') {
        target.playedAt = Date.now();
        if (party.nowPlaying?.id === target.id) {
          party.nowPlaying = null;
          broadcastToParty(code, { type: 'party:updated', party });
        }
      }
    }
    if (rejectReason !== undefined) {
      target.rejectReason = rejectReason;
    }

    broadcastToParty(code, { type: 'request:updated', request: target });
    res.json({ request: target });
  };

  app.patch('/api/parties/:code/requests/:requestId', handleUpdateStatus);
  app.patch('/api/parties/:code/requests/:requestId/status', handleUpdateStatus);

  // DJ removes a request
  app.delete('/api/parties/:code/requests/:requestId', (req, res) => {
    const code = req.params.code.toUpperCase();
    const { requestId } = req.params;

    const list = partyRequests.get(code);
    if (!list) {
      res.status(404).json({ error: 'Fiesta no encontrada' });
      return;
    }

    const index = list.findIndex(r => r.id === requestId);
    if (index === -1) {
      res.status(404).json({ error: 'Petición no encontrada' });
      return;
    }

    list.splice(index, 1);
    broadcastToParty(code, { type: 'request:deleted', requestId });
    res.json({ success: true, requestId });
  });

  // Generate QR code image URL / data URL for specific party
  app.get('/api/parties/:code/qr', async (req, res) => {
    const code = req.params.code.toUpperCase();
    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    
    // Direct guest request link
    const targetUrl = `${protocol}://${host}/?party=${encodeURIComponent(code)}`;

    try {
      const qrDataUrl = await QRCode.toDataURL(targetUrl, {
        width: 400,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      });
      res.json({ targetUrl, qrDataUrl, partyCode: code });
    } catch (err: any) {
      res.status(500).json({ error: 'Error generating QR code', message: err?.message });
    }
  });

  // Server-Sent Events (SSE) for continuous real-time backup
  app.get('/api/parties/:code/events', (req, res) => {
    const code = req.params.code.toUpperCase();
    const party = parties.get(code);
    if (!party) {
      res.status(404).send('Party not found');
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    if (!sseClients.has(code)) {
      sseClients.set(code, new Set());
    }
    const clientSet = sseClients.get(code)!;
    clientSet.add(res);

    // Send initial snapshot
    const requests = partyRequests.get(code) || [];
    res.write(`data: ${JSON.stringify({ type: 'init', party, requests })}\n\n`);

    req.on('close', () => {
      clientSet.delete(res);
    });
  });

  // Vite middleware setup (development vs production)
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`DJ Song Request server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
