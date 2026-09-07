import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Sparkles, Radio, Music, Flame, X, Maximize2, Minimize2, Users } from 'lucide-react';
import { Party, SongRequest } from '../types';
import { MovilDjLogo } from './MovilDjLogo';

interface StageDisplayProps {
  party: Party;
  requests: SongRequest[];
  onClose: () => void;
}

export function StageDisplay({ party, requests, onClose }: StageDisplayProps) {
  const [qrUrl, setQrUrl] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const guestUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/?party=${encodeURIComponent(party.code)}`
    : `/?party=${party.code}`;

  useEffect(() => {
    QRCode.toDataURL(guestUrl, {
      width: 700,
      margin: 2,
      color: {
        dark: '#030712',
        light: '#ffffff',
      },
    })
      .then((url) => setQrUrl(url))
      .catch((err) => console.error('Error generating stage QR', err));
  }, [guestUrl]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Top voted pending requests
  const topVoted = requests
    .filter((r) => r.status === 'pending' || r.status === 'accepted')
    .sort((a, b) => b.votes - a.votes)
    .slice(0, 4);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col overflow-hidden font-sans select-none">
      {/* Top Bar for Stage controls */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <MovilDjLogo size="sm" subtitle="Pantalla Gigante de Evento" />
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-rose-600/20 text-rose-400 border border-rose-500/30 rounded-full text-xs font-black tracking-widest uppercase animate-pulse">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
            En Vivo
          </div>
          <span className="text-sm font-semibold text-slate-300 hidden md:inline">
            {party.name} • DJ {party.djName}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="toggle-fullscreen-btn"
            onClick={toggleFullscreen}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition text-slate-200"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            {isFullscreen ? 'Salir' : 'Pantalla Completa'}
          </button>
          <button
            id="close-stage-btn"
            onClick={onClose}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Screen Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 lg:p-10 max-w-7xl mx-auto w-full items-center">
        {/* Left Column: Huge QR Code and Direct Action */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center text-center space-y-6">
          <div className="space-y-2 flex flex-col items-center">
            <MovilDjLogo size="md" subtitle="Sistema de Peticiones en Vivo" />
            <h1 className="text-3xl lg:text-5xl font-black text-white tracking-tight leading-none pt-2">
              Pide tu canción
            </h1>
            <p className="text-base lg:text-lg text-slate-300 font-medium">
              Escanea el código QR con tu móvil y vota por tus favoritas
            </p>
          </div>

          {/* Big QR Display */}
          <div className="relative group">
            <div className="absolute -inset-2 bg-gradient-to-r from-amber-500 to-rose-500 rounded-3xl blur-lg opacity-40 group-hover:opacity-75 transition duration-500"></div>
            <div className="relative p-6 bg-white rounded-2xl shadow-2xl border-4 border-amber-400">
              {qrUrl ? (
                <img
                  src={qrUrl}
                  alt={`QR Fiesta ${party.code}`}
                  className="w-64 h-64 lg:w-80 lg:h-80 object-contain mx-auto"
                />
              ) : (
                <div className="w-64 h-64 lg:w-80 lg:h-80 flex items-center justify-center text-slate-600">
                  Cargando QR...
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-700 px-6 py-3 rounded-2xl">
            <span className="text-sm text-slate-400">Código de la fiesta:</span>
            <span className="text-2xl font-black text-amber-400 font-mono tracking-wider">
              {party.code}
            </span>
          </div>
        </div>

        {/* Right Column: Now Playing + Crowd Favorites */}
        <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
          {/* NOW PLAYING CARD */}
          <div className="p-6 lg:p-7 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-emerald-500/50 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl"></div>

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></span>
                <span className="text-xs font-black tracking-widest text-emerald-400 uppercase">
                  Sonando Ahora en Vivo
                </span>
              </div>
              {/* Equalizer animation */}
              <div className="flex items-end gap-1 h-5">
                <span className="w-1 bg-emerald-400 h-4 rounded-full animate-pulse"></span>
                <span className="w-1 bg-emerald-400 h-6 rounded-full animate-pulse delay-75"></span>
                <span className="w-1 bg-emerald-400 h-3 rounded-full animate-pulse delay-150"></span>
                <span className="w-1 bg-emerald-400 h-5 rounded-full animate-pulse"></span>
              </div>
            </div>

            {party.nowPlaying ? (
              <div className="space-y-2">
                <h2 className="text-2xl lg:text-3xl font-black text-white leading-tight">
                  {party.nowPlaying.title}
                </h2>
                <p className="text-lg text-emerald-300 font-semibold">
                  {party.nowPlaying.artist}
                </p>
                {party.nowPlaying.dedication && (
                  <p className="text-sm text-slate-300 italic pt-1 border-t border-slate-700/60 mt-2">
                    "{party.nowPlaying.dedication}"
                  </p>
                )}
                {party.nowPlaying.guestName && (
                  <p className="text-xs text-slate-400 pt-1">
                    Pedida por: <strong className="text-slate-200">{party.nowPlaying.guestName}</strong>
                  </p>
                )}
              </div>
            ) : (
              <div className="text-slate-400 text-base py-4 flex items-center gap-3">
                <Music className="w-6 h-6 text-slate-500 animate-spin" />
                <span>DJ {party.djName} mezclando en vivo...</span>
              </div>
            )}
          </div>

          {/* TOP VOTED TRACKS */}
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400">
                <Flame className="w-5 h-5 fill-amber-400 text-amber-400" />
                <h3 className="font-black text-lg text-white">Más Votadas por el Público</h3>
              </div>
              <span className="text-xs text-slate-400 font-medium">Próximas en la cola</span>
            </div>

            <div className="space-y-2.5">
              {topVoted.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-800/40 text-center text-sm text-slate-400">
                  ¡Sé el primero en pedir una canción con el código QR!
                </div>
              ) : (
                topVoted.map((req, idx) => (
                  <div
                    key={req.id}
                    className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700/50 flex items-center justify-between gap-3 hover:border-slate-600 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-slate-700 text-xs font-bold text-slate-300 flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">{req.title}</p>
                        <p className="text-xs text-slate-400 truncate">{req.artist}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 text-xs font-bold shrink-0">
                      <Flame className="w-3.5 h-3.5 fill-amber-400" />
                      <span>{req.votes} {req.votes === 1 ? 'voto' : 'votos'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Footer note */}
          <div className="flex items-center justify-center gap-4 text-xs text-slate-400 text-center">
            <span className="flex items-center gap-1">
              <Radio className="w-3.5 h-3.5 text-emerald-400" /> Sistema en tiempo real
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-cyan-400" /> Peticiones directas a cabina
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
