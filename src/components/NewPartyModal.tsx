import { useState, useEffect, type FormEvent } from 'react';
import { Sparkles, X, Plus, Radio, ArrowRight } from 'lucide-react';
import { Party } from '../types';
import { MovilDjLogo } from './MovilDjLogo';
import { getLocalParties, createLocalParty } from '../lib/localStore';

interface NewPartyModalProps {
  isOpen: boolean;
  currentPartyCode: string;
  onClose: () => void;
  onSelectParty: (code: string) => void;
}

export function NewPartyModal({ isOpen, currentPartyCode, onClose, onSelectParty }: NewPartyModalProps) {
  const [existingParties, setExistingParties] = useState<(Party & { requestsCount?: number })[]>([]);
  const [name, setName] = useState('');
  const [djName, setDjName] = useState('');
  const [genre, setGenre] = useState('');
  const [location, setLocation] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/parties')
        .then((res) => {
          const contentType = res.headers.get('content-type') || '';
          if (res.ok && contentType.includes('application/json')) {
            return res.json();
          }
          throw new Error('Not JSON');
        })
        .then((data) => {
          if (data.parties && data.parties.length > 0) {
            setExistingParties(data.parties);
          } else {
            setExistingParties(getLocalParties());
          }
        })
        .catch(() => {
          // Fallback to local parties
          setExistingParties(getLocalParties());
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Por favor indica el nombre de la fiesta o evento.');
      return;
    }

    try {
      setIsCreating(true);
      const payload = {
        name: name.trim(),
        djName: djName.trim() || 'DJ',
        genre: genre.trim() || 'Open Format',
        location: location.trim() || 'Pista Principal',
        customCode: customCode.trim() || undefined,
      };

      try {
        const res = await fetch('/api/parties', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          if (data && data.party) {
            onSelectParty(data.party.code);
            onClose();
            return;
          }
        }
      } catch {
        // Backend unavailable, fallback to localStore
      }

      // LocalStore fallback
      const localParty = createLocalParty(payload);
      onSelectParty(localParty.code);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error al crear la fiesta');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div
        id="new-party-modal"
        className="bg-slate-900 border border-slate-700 text-slate-100 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden relative animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="bg-slate-800/80 px-6 py-4 border-b border-slate-700 flex items-center justify-between">
          <MovilDjLogo size="sm" subtitle="Gestionar Fiestas & Eventos" />
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs rounded-xl">
              {error}
            </div>
          )}

          {/* Create new party form */}
          <form onSubmit={handleCreate} className="space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              Crear Nueva Fiesta con Código QR Exclusivo
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nombre del Evento o Fiesta <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Boda de Laura & Mateo, Noche de Club Friday..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre del DJ</label>
                <input
                  type="text"
                  placeholder="Ej: DJ Spark, DJ Alan..."
                  value={djName}
                  onChange={(e) => setDjName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Código Personalizado (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: BODA24, DISCO-VIP"
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Estilo Musical</label>
                <input
                  type="text"
                  placeholder="Ej: Reggaeton & Cumbia, House, 90s..."
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Lugar / Salón</label>
                <input
                  type="text"
                  placeholder="Ej: Terraza VIP, Sala 1..."
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isCreating}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>{isCreating ? 'Creando evento...' : 'Crear Fiesta y Generar Código QR'}</span>
            </button>
          </form>

          {/* Existing Parties List */}
          {existingParties.length > 0 && (
            <div className="pt-3 border-t border-slate-800 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-slate-400" />
                Fiestas Existentes
              </h4>
              <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                {existingParties.map((p) => (
                  <div
                    key={p.code}
                    onClick={() => {
                      onSelectParty(p.code);
                      onClose();
                    }}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                      p.code === currentPartyCode
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                        : 'bg-slate-850 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-white truncate">{p.name}</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-amber-400 font-bold">
                          {p.code}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">
                        DJ {p.djName} • {p.requestsCount || 0} peticiones
                      </p>
                    </div>

                    <ArrowRight className="w-4 h-4 text-slate-500 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
