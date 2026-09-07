import { useState, useMemo } from 'react';
import {
  Music,
  Radio,
  QrCode,
  Settings,
  Flame,
  Clock,
  Play,
  CheckCircle2,
  XCircle,
  Trash2,
  ExternalLink,
  Search,
  Filter,
  Volume2,
  Tv,
  PlusCircle,
  RefreshCw,
  Users,
  Sparkles,
  MessageSquare,
  BarChart3,
  ListOrdered,
  SkipForward,
  Youtube,
  Headphones,
} from 'lucide-react';
import { Party, SongRequest } from '../types';
import { RejectReasonModal } from './RejectReasonModal';
import { MovilDjLogo } from './MovilDjLogo';

interface DjDashboardProps {
  party: Party;
  requests: SongRequest[];
  isConnected: boolean;
  onUpdateRequestStatus: (requestId: string, status: SongRequest['status'], rejectReason?: string) => Promise<any>;
  onDeleteRequest: (requestId: string) => Promise<any>;
  onOpenQr: () => void;
  onOpenStage: () => void;
  onOpenSettings: () => void;
  onOpenNewParty: () => void;
  onReload: () => void;
}

export function DjDashboard({
  party,
  requests,
  isConnected,
  onUpdateRequestStatus,
  onDeleteRequest,
  onOpenQr,
  onOpenStage,
  onOpenSettings,
  onOpenNewParty,
  onReload,
}: DjDashboardProps) {
  // Tabs: 'pending' | 'accepted' | 'played' | 'rejected' | 'all'
  const [activeTab, setActiveTab] = useState<'pending' | 'accepted' | 'played' | 'rejected' | 'all'>('pending');
  const [sortBy, setSortBy] = useState<'votes' | 'recent'>('votes');
  const [searchQuery, setSearchQuery] = useState('');
  const [rejectModalReq, setRejectModalReq] = useState<SongRequest | null>(null);

  // Filtered requests based on active tab, search, and sort
  const filteredRequests = useMemo(() => {
    return requests
      .filter((r) => {
        // Tab filter
        if (activeTab === 'pending' && r.status !== 'pending') return false;
        if (activeTab === 'accepted' && r.status !== 'accepted') return false;
        if (activeTab === 'played' && r.status !== 'played') return false;
        if (activeTab === 'rejected' && r.status !== 'rejected') return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            r.title.toLowerCase().includes(q) ||
            r.artist.toLowerCase().includes(q) ||
            r.guestName.toLowerCase().includes(q) ||
            (r.dedication && r.dedication.toLowerCase().includes(q))
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'votes') {
          return b.votes - a.votes;
        }
        return b.timestamp - a.timestamp;
      });
  }, [requests, activeTab, searchQuery, sortBy]);

  // Counts
  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const acceptedCount = requests.filter((r) => r.status === 'accepted').length;
  const playedCount = requests.filter((r) => r.status === 'played').length;
  const rejectedCount = requests.filter((r) => r.status === 'rejected').length;
  const totalVotes = requests.reduce((acc, r) => acc + r.votes, 0);

  // Playback queue sorted by votes then time
  const queuedRequests = useMemo(() => {
    return requests
      .filter((r) => r.status === 'accepted')
      .sort((a, b) => b.votes - a.votes || a.timestamp - b.timestamp);
  }, [requests]);

  const nextInQueue = queuedRequests.length > 0 ? queuedRequests[0] : null;

  const handlePlayNow = async (req: SongRequest) => {
    await onUpdateRequestStatus(req.id, 'playing');
  };

  const handleMarkPlayed = async (req: SongRequest) => {
    await onUpdateRequestStatus(req.id, 'played');
  };

  const handleAccept = async (req: SongRequest) => {
    await onUpdateRequestStatus(req.id, 'accepted');
  };

  const handleConfirmReject = async (requestId: string, reason?: string) => {
    await onUpdateRequestStatus(requestId, 'rejected', reason);
  };

  const openSpotifySearch = (req: SongRequest) => {
    const q = encodeURIComponent(`${req.title} ${req.artist}`);
    window.open(`https://open.spotify.com/search/${q}`, '_blank', 'noreferrer');
  };

  const openYoutubeSearch = (req: SongRequest) => {
    const q = encodeURIComponent(`${req.title} ${req.artist}`);
    window.open(`https://www.youtube.com/results?search_query=${q}`, '_blank', 'noreferrer');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top DJ Bar */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 lg:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Party and DJ Details */}
          <div className="flex items-center gap-3">
            <MovilDjLogo size="md" showText={false} />

            <div>
              <div className="flex items-center flex-wrap gap-2">
                <h1 className="font-black text-base lg:text-lg text-white tracking-tight">{party.name}</h1>
                <div className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-mono font-bold tracking-wider">
                  {party.code}
                </div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-slate-800 text-cyan-400 border border-slate-700">
                  MOVILDJ Pro
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="font-semibold text-slate-300">DJ {party.djName}</span>
                <span>•</span>
                <span>{party.genre}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                    }`}
                  ></span>
                  {isConnected ? 'En Vivo (Sincronizado)' : 'Reconectando...'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center flex-wrap gap-2">
            <button
              id="dj-qr-btn"
              onClick={onOpenQr}
              className="px-3 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-1.5 transition"
            >
              <QrCode className="w-4 h-4" />
              <span>Código QR Fiesta</span>
            </button>

            <button
              id="dj-stage-btn"
              onClick={onOpenStage}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition"
            >
              <Tv className="w-4 h-4 text-cyan-400" />
              <span>Pantalla Proyector</span>
            </button>

            <button
              id="dj-settings-btn"
              onClick={onOpenSettings}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition"
              title="Ajustes de fiesta"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              id="dj-new-party-btn"
              onClick={onOpenNewParty}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition"
              title="Gestionar / Nueva Fiesta"
            >
              <PlusCircle className="w-4 h-4" />
            </button>

            <button
              id="dj-reload-btn"
              onClick={onReload}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition"
              title="Refrescar lista"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main DJ Control Room */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 lg:px-6 py-6 space-y-6">
        {/* NOW PLAYING STRIP (CABINA EN VIVO) */}
        <div className="p-4 lg:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 shadow-xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                <Volume2 className="w-6 h-6 animate-pulse" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                    Reproduciendo Ahora en Cabina
                  </span>
                  {/* Equalizer animation */}
                  <div className="flex items-end gap-1 h-3">
                    <span className="w-0.5 bg-emerald-400 h-2 rounded-full animate-pulse"></span>
                    <span className="w-0.5 bg-emerald-400 h-3 rounded-full animate-pulse delay-75"></span>
                    <span className="w-0.5 bg-emerald-400 h-1.5 rounded-full animate-pulse delay-150"></span>
                  </div>
                </div>

                {party.nowPlaying ? (
                  <div className="mt-1">
                    <h2 className="text-lg lg:text-xl font-black text-white truncate">
                      {party.nowPlaying.title}
                    </h2>
                    <p className="text-xs text-emerald-300 font-medium truncate">
                      {party.nowPlaying.artist} • Pedida por: <strong className="text-white">{party.nowPlaying.guestName}</strong>
                    </p>
                    {party.nowPlaying.dedication && (
                      <p className="text-[11px] text-slate-300 italic truncate mt-0.5">
                        "{party.nowPlaying.dedication}"
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="mt-1">
                    <p className="text-sm text-slate-300 font-medium">
                      No hay canción activa como "Reproduciendo ahora".
                    </p>
                    <p className="text-xs text-slate-400">
                      Haz clic en "Reproducir Ahora" en cualquiera de las peticiones abajo.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Now Playing Quick Actions */}
            <div className="flex items-center flex-wrap gap-2 shrink-0">
              {party.nowPlaying && (
                <>
                  <button
                    id="mark-completed-nowplaying-btn"
                    onClick={() => handleMarkPlayed(party.nowPlaying!)}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-lg shadow-emerald-950/40"
                    title="Marcar canción como cumplida y pasarla al historial de tocadas"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Marcar Tocada</span>
                  </button>

                  <button
                    onClick={() => openSpotifySearch(party.nowPlaying!)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-xl border border-slate-700 transition"
                    title="Buscar pista en Spotify"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => openYoutubeSearch(party.nowPlaying!)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-rose-400 rounded-xl border border-slate-700 transition"
                    title="Buscar pista en YouTube"
                  >
                    <Youtube className="w-4 h-4" />
                  </button>
                </>
              )}

              {/* Next in queue fast trigger */}
              {nextInQueue && (
                <button
                  id="play-next-queue-btn"
                  onClick={() => handlePlayNow(nextInQueue)}
                  className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-lg shadow-cyan-950/40"
                  title={`Cargar siguiente en cola: ${nextInQueue.title} - ${nextInQueue.artist}`}
                >
                  <SkipForward className="w-4 h-4" />
                  <span className="hidden sm:inline">Siguiente de Cola:</span>
                  <span className="max-w-[120px] truncate">{nextInQueue.title}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* STATS OVERVIEW CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Pendientes</p>
              <p className="text-xl font-black text-amber-400">{pendingCount}</p>
            </div>
            <Clock className="w-5 h-5 text-amber-500/50" />
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">En Cola Aceptadas</p>
              <p className="text-xl font-black text-cyan-400">{acceptedCount}</p>
            </div>
            <CheckCircle2 className="w-5 h-5 text-cyan-500/50" />
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Ya Tocadas</p>
              <p className="text-xl font-black text-emerald-400">{playedCount}</p>
            </div>
            <Volume2 className="w-5 h-5 text-emerald-500/50" />
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Votos del Público</p>
              <p className="text-xl font-black text-rose-400">{totalVotes}</p>
            </div>
            <Flame className="w-5 h-5 text-rose-500/50" />
          </div>
        </div>

        {/* TABS & SEARCH BAR */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800 text-xs font-semibold">
              <button
                id="filter-pending-tab-btn"
                onClick={() => setActiveTab('pending')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                  activeTab === 'pending'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Nuevas Peticiones</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800/80 text-amber-300 font-mono">
                  {pendingCount}
                </span>
              </button>

              <button
                id="filter-accepted-tab-btn"
                onClick={() => setActiveTab('accepted')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                  activeTab === 'accepted'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Aceptadas / Cola</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800/80 text-cyan-300 font-mono">
                  {acceptedCount}
                </span>
              </button>

              <button
                id="filter-played-tab-btn"
                onClick={() => setActiveTab('played')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                  activeTab === 'played'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Historial Tocadas</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800/80 text-slate-300 font-mono">
                  {playedCount}
                </span>
              </button>

              <button
                id="filter-rejected-tab-btn"
                onClick={() => setActiveTab('rejected')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                  activeTab === 'rejected'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Rechazadas</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800/80 text-rose-300 font-mono">
                  {rejectedCount}
                </span>
              </button>

              <button
                id="filter-all-tab-btn"
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'all'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Todas ({requests.length})
              </button>
            </div>

            {/* Sort toggles and Search */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5 text-xs">
                <button
                  onClick={() => setSortBy('votes')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                    sortBy === 'votes' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>Más Votadas</span>
                </button>
                <button
                  onClick={() => setSortBy('recent')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                    sortBy === 'recent' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Más Recientes</span>
                </button>
              </div>

              <div className="relative flex-1 md:w-64">
                <input
                  type="text"
                  placeholder="Buscar canción, artista..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
                />
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              </div>
            </div>
          </div>

          {/* REQUESTS LIST */}
          {filteredRequests.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/50 border border-slate-800 rounded-2xl space-y-3">
              <Music className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-slate-300">No hay canciones en esta sección</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {activeTab === 'pending'
                  ? 'Todas las peticiones recibidas han sido atendidas o no ha entrado ninguna todavía.'
                  : 'No hay peticiones que coincidan con los filtros seleccionados.'}
              </p>
              <button
                onClick={onOpenQr}
                className="px-4 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-amber-400 transition"
              >
                Mostrar Código QR a la fiesta
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredRequests.map((req) => {
                const isPlaying = party.nowPlaying?.id === req.id;
                const queueIdx = queuedRequests.findIndex((q) => q.id === req.id);
                return (
                  <div
                    key={req.id}
                    className={`p-4 rounded-2xl border transition relative overflow-hidden flex flex-col justify-between gap-3 ${
                      isPlaying
                        ? 'bg-slate-900 border-emerald-500/60 shadow-lg shadow-emerald-500/10'
                        : req.status === 'accepted'
                        ? 'bg-slate-900/90 border-cyan-500/40 shadow-sm'
                        : req.status === 'rejected'
                        ? 'bg-slate-900/40 border-rose-900/40 opacity-80'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Top row: title, artist, votes, and status badge */}
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center flex-wrap gap-2 mb-1">
                            <h3 className="font-black text-sm lg:text-base text-white truncate">
                              {req.title}
                            </h3>
                            {isPlaying && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse flex items-center gap-1">
                                <Volume2 className="w-3 h-3" />
                                Sonando Ahora
                              </span>
                            )}
                            {req.status === 'accepted' && queueIdx !== -1 && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1">
                                <ListOrdered className="w-3 h-3" />
                                #{queueIdx + 1} en Cola
                              </span>
                            )}
                            {req.status === 'played' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-slate-800 text-slate-400 border border-slate-700">
                                Tocada
                              </span>
                            )}
                            {req.status === 'rejected' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                Rechazada
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-amber-300 font-semibold truncate">
                            {req.artist}
                          </p>
                        </div>

                        {/* Vote Pill */}
                        <div
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold shrink-0 ${
                            req.votes > 1
                              ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          <Flame className="w-3.5 h-3.5 fill-current" />
                          <span>{req.votes} {req.votes === 1 ? 'voto' : 'votos'}</span>
                        </div>
                      </div>

                      {/* Dedication or Note */}
                      {req.dedication && (
                        <div className="mt-2.5 p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 flex items-start gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <span className="italic">"{req.dedication}"</span>
                        </div>
                      )}

                      {/* Reject Reason Note if present */}
                      {req.status === 'rejected' && req.rejectReason && (
                        <div className="mt-2 p-2 rounded-xl bg-rose-950/40 border border-rose-900/50 text-xs text-rose-300 flex items-start gap-1.5">
                          <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <span className="text-[10px] uppercase font-bold text-rose-400 block">Notificación al solicitante:</span>
                            <span className="italic">"{req.rejectReason}"</span>
                          </div>
                        </div>
                      )}

                      {/* Guest and timestamp metadata */}
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2.5 pt-2 border-t border-slate-800/80">
                        <span className="flex items-center gap-1 truncate">
                          <Users className="w-3 h-3 text-slate-500" />
                          Por: <strong className="text-slate-300">{req.guestName}</strong>
                          {req.genre && (
                            <span className="text-slate-500 ml-1">({req.genre})</span>
                          )}
                        </span>
                        <span className="shrink-0 text-slate-500">
                          {new Date(req.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {/* DJ Action Controls Bar */}
                    <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-800/60 flex-wrap">
                      <div className="flex items-center flex-wrap gap-1.5">
                        {/* Play now button (marcarla como 'reproduciendo ahora') */}
                        {!isPlaying && (
                          <button
                            id={`play-req-${req.id}-btn`}
                            onClick={() => handlePlayNow(req)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
                            title="Marcarla como 'reproduciendo ahora' inmediatamente"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Reproducir Ahora</span>
                          </button>
                        )}

                        {/* Accept to queue button (aceptar para añadirla a la cola de reproducción) */}
                        {req.status !== 'accepted' && !isPlaying && (
                          <button
                            id={`accept-req-${req.id}-btn`}
                            onClick={() => handleAccept(req)}
                            className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
                            title="Aceptar canción y añadirla a la cola de reproducción"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{req.status === 'rejected' ? 'Reactivar a Cola' : 'Aceptar a Cola'}</span>
                          </button>
                        )}

                        {/* Mark played (marcar como cumplida) */}
                        {req.status !== 'played' && (
                          <button
                            id={`played-req-${req.id}-btn`}
                            onClick={() => handleMarkPlayed(req)}
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition border border-slate-700"
                            title="Marcar como canción ya tocada"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Tocada</span>
                          </button>
                        )}

                        {/* Reject button with optional notification (rechazarla con notificación opcional) */}
                        {req.status !== 'rejected' && req.status !== 'played' && (
                          <button
                            id={`reject-req-${req.id}-btn`}
                            onClick={() => setRejectModalReq(req)}
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-200 rounded-lg text-xs transition border border-slate-700 flex items-center gap-1"
                            title="Rechazar petición (con notificación opcional al solicitante)"
                          >
                            <XCircle className="w-3.5 h-3.5 text-rose-400" />
                            <span>Rechazar...</span>
                          </button>
                        )}
                      </div>

                      {/* Right side tools: external audio search & delete */}
                      <div className="flex items-center gap-1">
                        {/* Search on Spotify */}
                        <button
                          onClick={() => openSpotifySearch(req)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-emerald-400 rounded-lg text-xs transition border border-slate-700"
                          title="Buscar en Spotify para cargar audio"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>

                        {/* Search on YouTube */}
                        <button
                          onClick={() => openYoutubeSearch(req)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 rounded-lg text-xs transition border border-slate-700"
                          title="Buscar en YouTube"
                        >
                          <Youtube className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete permanently */}
                        <button
                          id={`delete-req-${req.id}-btn`}
                          onClick={() => onDeleteRequest(req.id)}
                          className="p-1.5 bg-slate-800 hover:bg-rose-900/50 text-slate-500 hover:text-rose-400 rounded-lg text-xs transition border border-slate-700"
                          title="Eliminar de la lista de cabina"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Reject Reason Modal (with optional notification to guest) */}
      <RejectReasonModal
        request={rejectModalReq}
        isOpen={!!rejectModalReq}
        onClose={() => setRejectModalReq(null)}
        onConfirmReject={handleConfirmReject}
      />
    </div>
  );
}
