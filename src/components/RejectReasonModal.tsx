import { useState } from 'react';
import { X, AlertCircle, Check, Bell, BellOff, MessageSquare } from 'lucide-react';
import { SongRequest } from '../types';

interface RejectReasonModalProps {
  request: SongRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmReject: (requestId: string, reason?: string) => void;
}

const COMMON_REASONS = [
  'Esa canción ya sonó anteriormente en la fiesta',
  'No encaja con el estilo musical de este bloque',
  'No la tengo disponible en la biblioteca del DJ',
  'Contiene lenguaje o temática no apta para el público actual',
  'La pista ya está muy saturada, pídela más adelante',
  'El set del DJ terminará pronto',
];

export function RejectReasonModal({ request, isOpen, onClose, onConfirmReject }: RejectReasonModalProps) {
  const [notifyGuest, setNotifyGuest] = useState(true);
  const [selectedReason, setSelectedReason] = useState(COMMON_REASONS[0]);
  const [customReason, setCustomReason] = useState('');

  if (!isOpen || !request) return null;

  const finalReason = customReason.trim() || selectedReason;

  const handleConfirm = () => {
    if (notifyGuest) {
      onConfirmReject(request.id, finalReason);
    } else {
      onConfirmReject(request.id, undefined);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 text-slate-100 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-slate-850 px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-rose-400">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Rechazar Petición</h3>
              <p className="text-[11px] text-slate-400">Notificación al solicitante</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Song card */}
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">{request.title}</p>
              <p className="text-xs text-amber-400 font-medium truncate">{request.artist}</p>
              {request.guestName && (
                <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                  Solicitante: <strong className="text-slate-300">{request.guestName}</strong>
                </p>
              )}
            </div>
            {request.dedication && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
                Con dedicatoria
              </span>
            )}
          </div>

          {/* Toggle Notification */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center gap-2.5">
              {notifyGuest ? (
                <Bell className="w-4 h-4 text-amber-400" />
              ) : (
                <BellOff className="w-4 h-4 text-slate-500" />
              )}
              <div>
                <p className="text-xs font-bold text-slate-200">Notificar al solicitante</p>
                <p className="text-[11px] text-slate-400">
                  {notifyGuest
                    ? 'El invitado verá el motivo en su pantalla de teléfono'
                    : 'Rechazar silenciosamente sin mensaje'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setNotifyGuest(!notifyGuest)}
              className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                notifyGuest ? 'bg-rose-600' : 'bg-slate-800'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  notifyGuest ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Reason Selection (only if notifyGuest is active) */}
          {notifyGuest && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Selecciona un motivo rápido:
                </label>
                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  {COMMON_REASONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        setSelectedReason(r);
                        setCustomReason('');
                      }}
                      className={`w-full text-left p-2.5 rounded-xl text-xs transition border flex items-center justify-between gap-2 ${
                        selectedReason === r && !customReason
                          ? 'bg-rose-500/15 border-rose-500/40 text-rose-200 font-semibold'
                          : 'bg-slate-800/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      <span className="truncate">{r}</span>
                      {selectedReason === r && !customReason && (
                        <Check className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  O escribe un mensaje personalizado:
                </label>
                <input
                  type="text"
                  placeholder="Ej: La tocaremos en el bloque latino a las 2:00..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-400 transition"
                />
              </div>

              {/* Guest message preview */}
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs flex items-start gap-2 text-slate-400">
                <MessageSquare className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Vista previa para {request.guestName || 'el invitado'}:</span>
                  <span className="text-rose-300 italic truncate block">"{finalReason}"</span>
                </div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              Cancelar
            </button>
            <button
              id="confirm-reject-btn"
              onClick={handleConfirm}
              className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-lg shadow-rose-900/30 flex items-center justify-center gap-1.5"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{notifyGuest ? 'Rechazar y Notificar' : 'Rechazar sin Notificar'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
