import { useState, useMemo, type FormEvent } from 'react';
import {
  Music,
  Send,
  Flame,
  Heart,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Volume2,
  XCircle,
  Radio,
  Search,
  MessageSquare,
  User,
  PartyPopper,
} from 'lucide-react';
import { Party, SongRequest } from '../types';
import { getClientId } from '../lib/socket';
import { MovilDjLogo } from './MovilDjLogo';

interface GuestViewProps {
  party: Party;
  requests: SongRequest[];
  onSubmitRequest: (data: {
    title: string;
    artist: string;
    guestName?: string;
    dedication?: string;
    genre?: string;
  }) => Promise<any>;
  onVote: (requestId: string) => Promise<any>;
  onSwitchToDj: () => void;
}

const GENRE_PILLS = [
  'Reggaeton',
  'Electrónica / House',
  'Pop Latino',
  'Cumbia / Salsa',
  'Pop Internacional',
  'Rock / Indie',
  'Hip-Hop / Trap',
  'Clásicos 80s / 90s',
];

export function GuestView({ party, requests, onSubmitRequest, onVote, onSwitchToDj }: GuestViewProps) {
  const clientId = getClientId();

  // Form State
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [guestName, setGuestName] = useState(localStorage.getItem('dj_guest_name') || '');
  const [dedication, setDedication] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Tabs: 'request' | 'my-requests' | 'party-requests'
  const [activeTab, setActiveTab] = useState<'request' | 'my-requests' | 'party-requests'>('request');
  const [filterQuery, setFilterQuery] = useState('');
  const [sortBy, setSortBy] = useState<'votes' | 'recent'>('votes');

  // Filter requests submitted by this client
  const myRequests = useMemo(() => {
    return requests.filter((r) => r.voters.includes(clientId));
  }, [requests, clientId]);

  // All active/queued party requests
  const filteredPartyRequests = useMemo(() => {
    return requests
      .filter((r) => {
        if (!filterQuery) return true;
        const q = filterQuery.toLowerCase();
        return (
          r.title.toLowerCase().includes(q) ||
          r.artist.toLowerCase().includes(q) ||
          r.guestName.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortBy === 'votes') {
          return b.votes - a.votes;
        }
        return b.timestamp - a.timestamp;
      });
  }, [requests, filterQuery, sortBy]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!title.trim() || !artist.trim()) {
      setFormError('Por favor indica el título de la canción y el artista.');
      return;
    }

    if (!party.settings.allowRequests) {
      setFormError('El DJ ha pausado las peticiones temporalmente.');
      return;
    }

    try {
      setIsSubmitting(true);
      if (guestName.trim()) {
        localStorage.setItem('dj_guest_name', guestName.trim());
      }
      await onSubmitRequest({
        title: title.trim(),
        artist: artist.trim(),
        guestName: guestName.trim() || undefined,
        dedication: dedication.trim() || undefined,
        genre: selectedGenre || undefined,
      });

      // Clear form
      setTitle('');
      setArtist('');
      setDedication('');
      setSelectedGenre('');
      setSuccessMessage('¡Petición enviada al DJ en tiempo real!');
      setTimeout(() => setSuccessMessage(null), 4000);
      setActiveTab('my-requests');
    } catch (err: any) {
      setFormError(err?.message || 'Error al enviar petición');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVoteClick = async (requestId: string) => {
    try {
      await onVote(requestId);
    } catch (err) {
      console.error('Error upvoting', err);
    }
  };

  const getStatusBadge = (status: SongRequest['status']) => {
    switch (status) {
      case 'playing':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
            <Volume2 className="w-3.5 h-3.5" /> ¡Sonando ahora!
          </span>
        );
      case 'accepted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" /> Aceptada en la cola
          </span>
        );
      case 'played':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-700 text-slate-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" /> Ya sonó
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/20 text-rose-300 border border-rose-500/30">
            <XCircle className="w-3.5 h-3.5" /> No disponible
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <Clock className="w-3.5 h-3.5" /> En espera
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-16">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3.5">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <MovilDjLogo size="sm" showText={false} />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-sm tracking-tight text-white">{party.name}</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-amber-400 font-bold border border-slate-700">
                  {party.code}
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <span>DJ {party.djName}</span>
                <span>•</span>
                <span className="text-cyan-400 font-semibold">MOVILDJ</span>
              </p>
            </div>
          </div>

          <button
            id="switch-dj-mode-btn"
            onClick={onSwitchToDj}
            className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-lg border border-slate-700 hover:bg-slate-800 transition"
          >
            Modo DJ
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-xl mx-auto w-full px-4 py-4 space-y-4">
        {/* Status / Announcement Banner */}
        {party.settings.announcement && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-amber-200 text-xs">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-amber-300 font-bold">Mensaje del DJ:</strong>{' '}
              {party.settings.announcement}
            </div>
          </div>
        )}

        {/* Live Reception Status */}
        <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                party.settings.allowRequests ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
              }`}
            ></span>
            <span className="text-slate-300 font-medium">
              {party.settings.allowRequests ? 'Recepción de canciones en vivo' : 'Peticiones en pausa por el DJ'}
            </span>
          </div>
          <span className="text-slate-400 text-[11px]">{requests.length} peticiones</span>
        </div>

        {/* NOW PLAYING CARD IF ANY */}
        {party.nowPlaying && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-emerald-500/40 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                Sonando Ahora
              </span>
              <div className="flex items-end gap-0.5 h-3">
                <span className="w-0.5 bg-emerald-400 h-2 animate-pulse"></span>
                <span className="w-0.5 bg-emerald-400 h-3 animate-pulse delay-75"></span>
                <span className="w-0.5 bg-emerald-400 h-1.5 animate-pulse delay-150"></span>
              </div>
            </div>
            <p className="text-base font-black text-white truncate">{party.nowPlaying.title}</p>
            <p className="text-xs text-emerald-300 font-medium truncate">{party.nowPlaying.artist}</p>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800 text-xs font-semibold">
          <button
            id="tab-request-btn"
            onClick={() => setActiveTab('request')}
            className={`py-2 px-1 rounded-lg transition text-center flex items-center justify-center gap-1.5 ${
              activeTab === 'request'
                ? 'bg-amber-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Pedir</span>
          </button>
          <button
            id="tab-my-requests-btn"
            onClick={() => setActiveTab('my-requests')}
            className={`py-2 px-1 rounded-lg transition text-center flex items-center justify-center gap-1.5 ${
              activeTab === 'my-requests'
                ? 'bg-amber-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Mis Temas ({myRequests.length})</span>
          </button>
          <button
            id="tab-party-requests-btn"
            onClick={() => setActiveTab('party-requests')}
            className={`py-2 px-1 rounded-lg transition text-center flex items-center justify-center gap-1.5 ${
              activeTab === 'party-requests'
                ? 'bg-amber-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Votaciones ({requests.length})</span>
          </button>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <PartyPopper className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* TAB 1: SUBMIT REQUEST FORM */}
        {activeTab === 'request' && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Music className="w-5 h-5 text-amber-400" />
                Pide tu canción al DJ
              </h2>
              <p className="text-xs text-slate-400">
                Tu solicitud aparecerá instantáneamente en la pantalla del DJ.
              </p>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Song Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nombre de la Canción <span className="text-amber-400">*</span>
                </label>
                <input
                  id="song-title-input"
                  type="text"
                  required
                  placeholder="Ej: Danza Kuduro, Titanium, Despacito..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
                />
              </div>

              {/* Artist */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Artista o Grupo <span className="text-amber-400">*</span>
                </label>
                <input
                  id="song-artist-input"
                  type="text"
                  required
                  placeholder="Ej: Don Omar, David Guetta, Bad Bunny..."
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
                />
              </div>

              {/* Guest Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tu Nombre o Apodo (Opcional)
                </label>
                <input
                  id="guest-name-input"
                  type="text"
                  placeholder="Ej: Carlos, Mesa 4, Las Chicas de Cumple..."
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
                />
              </div>

              {/* Dedication / Message */}
              {party.settings.allowDedications && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                    <span>Dedicatoria o Mensaje para el DJ</span>
                    <span className="text-[10px] text-slate-400 font-normal">Opcional</span>
                  </label>
                  <div className="relative">
                    <input
                      id="song-dedication-input"
                      type="text"
                      maxLength={120}
                      placeholder="Ej: ¡Para la cumpleañera!, ¡Para prender la pista!"
                      value={dedication}
                      onChange={(e) => setDedication(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition pr-10"
                    />
                    <MessageSquare className="w-4 h-4 text-slate-500 absolute right-3 top-3 pointer-events-none" />
                  </div>
                </div>
              )}

              {/* Quick Genre Pills */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Género o Vibra Musical (Opcional)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {GENRE_PILLS.map((genre) => (
                    <button
                      key={genre}
                      type="button"
                      onClick={() => setSelectedGenre(selectedGenre === genre ? '' : genre)}
                      className={`px-2.5 py-1 rounded-lg text-xs transition border ${
                        selectedGenre === genre
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-semibold'
                          : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <button
                id="submit-song-request-btn"
                type="submit"
                disabled={isSubmitting || !party.settings.allowRequests}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-[0.99] text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? 'Enviando petición...' : 'Enviar Petición al DJ'}</span>
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: MY REQUESTS */}
        {activeTab === 'my-requests' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <User className="w-4 h-4 text-amber-400" />
                Mis Canciones Solicitadas
              </h2>
              <span className="text-xs text-slate-400 font-medium">
                {myRequests.length} {myRequests.length === 1 ? 'canción' : 'canciones'}
              </span>
            </div>

            {myRequests.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3">
                <Music className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-sm font-semibold text-slate-300">Aún no has solicitado canciones</p>
                <p className="text-xs text-slate-400">
                  Usa la pestaña "Pedir" para solicitar tu tema favorito al DJ.
                </p>
                <button
                  id="go-to-request-tab-btn"
                  onClick={() => setActiveTab('request')}
                  className="px-4 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-amber-400 transition"
                >
                  Pedir canción ahora
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {myRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">{req.title}</p>
                        <p className="text-xs text-slate-400 truncate">{req.artist}</p>
                      </div>
                      <div className="shrink-0">{getStatusBadge(req.status)}</div>
                    </div>

                    {/* Status Feedback Notice from DJ */}
                    {req.status === 'playing' && (
                      <div className="p-2.5 rounded-xl bg-emerald-950/50 border border-emerald-800/50 text-xs text-emerald-200 flex items-center gap-2 animate-pulse">
                        <Volume2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="font-bold">¡El DJ ha puesto tu canción a sonar ahora en la pista! 🎉</span>
                      </div>
                    )}

                    {req.status === 'accepted' && (
                      <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-800/40 text-xs text-cyan-200 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                        <span>¡El DJ aceptó tu canción! Está añadida a la cola de reproducción.</span>
                      </div>
                    )}

                    {req.status === 'rejected' && (
                      <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-900/60 text-xs text-rose-200 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="font-bold text-[11px] uppercase tracking-wider text-rose-300">
                            {req.rejectReason ? 'Notificación del DJ:' : 'Canción no disponible'}
                          </p>
                          <p className="text-rose-100 font-medium mt-0.5">
                            {req.rejectReason ? `"${req.rejectReason}"` : 'El DJ no pudo añadir esta canción a la lista en este momento.'}
                          </p>
                        </div>
                      </div>
                    )}

                    {req.dedication && (
                      <p className="text-xs text-slate-300 italic bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                        "{req.dedication}"
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                      <span>{new Date(req.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <div className="flex items-center gap-1 text-amber-400 font-bold">
                        <Flame className="w-3.5 h-3.5 fill-amber-400" />
                        <span>{req.votes} {req.votes === 1 ? 'voto' : 'votos'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: PARTY REQUESTS & VOTING */}
        {activeTab === 'party-requests' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-1.5">
                  <Flame className="w-4 h-4 fill-amber-400 text-amber-400" />
                  Peticiones de la Fiesta
                </h2>
                <p className="text-xs text-slate-400">Vota por las canciones que quieres escuchar</p>
              </div>

              {/* Sort pills */}
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs">
                <button
                  onClick={() => setSortBy('votes')}
                  className={`px-2 py-1 rounded-md text-[11px] font-semibold transition ${
                    sortBy === 'votes' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
                  }`}
                >
                  Más votadas
                </button>
                <button
                  onClick={() => setSortBy('recent')}
                  className={`px-2 py-1 rounded-md text-[11px] font-semibold transition ${
                    sortBy === 'recent' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
                  }`}
                >
                  Recientes
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar por canción, artista o invitado..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            </div>

            {filteredPartyRequests.length === 0 ? (
              <div className="p-6 text-center bg-slate-900/60 border border-slate-800 rounded-2xl text-xs text-slate-400">
                No hay peticiones que coincidan con la búsqueda.
              </div>
            ) : (
              <div className="space-y-2">
                {filteredPartyRequests.map((req) => {
                  const hasVoted = req.voters.includes(clientId);
                  return (
                    <div
                      key={req.id}
                      className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-bold text-white truncate">{req.title}</p>
                          {req.status === 'playing' && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0 animate-pulse">
                              Sonando
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 truncate">
                          {req.artist} • <span className="text-slate-500">{req.guestName}</span>
                        </p>
                        {req.dedication && (
                          <p className="text-[11px] text-slate-400 italic truncate mt-1">
                            "{req.dedication}"
                          </p>
                        )}
                      </div>

                      {/* Upvote Button */}
                      <button
                        id={`vote-req-${req.id}-btn`}
                        onClick={() => handleVoteClick(req.id)}
                        disabled={!party.settings.allowVoting}
                        className={`px-3 py-2 rounded-xl flex items-center gap-1.5 text-xs font-bold transition shrink-0 ${
                          hasVoted
                            ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                        }`}
                      >
                        <Flame
                          className={`w-3.5 h-3.5 ${
                            hasVoted ? 'fill-slate-950 text-slate-950' : 'text-amber-400'
                          }`}
                        />
                        <span>{req.votes}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
