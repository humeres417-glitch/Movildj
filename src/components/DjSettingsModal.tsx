import { useState, type FormEvent } from 'react';
import { Settings, X, Save, Radio, MessageSquare, Flame, Check } from 'lucide-react';
import { Party } from '../types';
import { MovilDjLogo } from './MovilDjLogo';

interface DjSettingsModalProps {
  party: Party;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: Partial<Party>) => Promise<any>;
}

export function DjSettingsModal({ party, isOpen, onClose, onSave }: DjSettingsModalProps) {
  const [name, setName] = useState(party.name);
  const [djName, setDjName] = useState(party.djName);
  const [genre, setGenre] = useState(party.genre);
  const [allowRequests, setAllowRequests] = useState(party.settings.allowRequests);
  const [allowVoting, setAllowVoting] = useState(party.settings.allowVoting);
  const [allowDedications, setAllowDedications] = useState(party.settings.allowDedications);
  const [announcement, setAnnouncement] = useState(party.settings.announcement || '');
  const [maxRequests, setMaxRequests] = useState(party.settings.maxRequestsPerGuest || 5);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await onSave({
        name,
        djName,
        genre,
        settings: {
          allowRequests,
          allowVoting,
          allowDedications,
          maxRequestsPerGuest: Number(maxRequests),
          announcement: announcement.trim() || undefined,
        },
      });
      onClose();
    } catch (err) {
      console.error('Error saving party settings', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 text-slate-100 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-slate-800/80 px-6 py-4 border-b border-slate-700 flex items-center justify-between">
          <MovilDjLogo size="sm" subtitle="Ajustes de la Fiesta & Cabina" />
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Party Details */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre del Evento</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre del DJ</label>
              <input
                type="text"
                value={djName}
                onChange={(e) => setDjName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Announcement banner */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
              Anuncio o Aviso en Vivo para los Invitados
            </label>
            <textarea
              rows={2}
              placeholder="Ej: ¡Últimos 15 minutos para pedir canciones de rock!"
              value={announcement}
              onChange={(e) => setAnnouncement(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Toggles */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            {/* Allow Requests Toggle */}
            <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
              <div>
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-emerald-400" />
                  Permitir Peticiones de Canciones
                </p>
                <p className="text-[11px] text-slate-400">Si lo desactivas, los invitados verán que está en pausa.</p>
              </div>
              <button
                type="button"
                onClick={() => setAllowRequests(!allowRequests)}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition duration-300 ${
                  allowRequests ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-300 ${
                    allowRequests ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Allow Voting Toggle */}
            <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
              <div>
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  Permitir Votación del Público (Upvotes)
                </p>
                <p className="text-[11px] text-slate-400">Los invitados pueden votar por canciones pedidas por otros.</p>
              </div>
              <button
                type="button"
                onClick={() => setAllowVoting(!allowVoting)}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition duration-300 ${
                  allowVoting ? 'bg-amber-500' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-300 ${
                    allowVoting ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Allow Dedications */}
            <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
              <div>
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                  Permitir Mensajes y Dedicatorias
                </p>
                <p className="text-[11px] text-slate-400">Los invitados pueden enviar una nota o dedicatoria al DJ.</p>
              </div>
              <button
                type="button"
                onClick={() => setAllowDedications(!allowDedications)}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition duration-300 ${
                  allowDedications ? 'bg-cyan-500' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-300 ${
                    allowDedications ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition flex items-center justify-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Guardando...' : 'Guardar Ajustes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
