import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { QrCode, Copy, Check, Download, ExternalLink, X, Printer, MonitorPlay, Sparkles } from 'lucide-react';
import { Party } from '../types';
import { MovilDjLogo } from './MovilDjLogo';

interface QrModalProps {
  party: Party;
  isOpen: boolean;
  onClose: () => void;
  onOpenStage: () => void;
}

export function QrModal({ party, isOpen, onClose, onOpenStage }: QrModalProps) {
  const [qrUrl, setQrUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const guestUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/?party=${encodeURIComponent(party.code)}`
    : `/?party=${party.code}`;

  useEffect(() => {
    if (isOpen && party.code) {
      QRCode.toDataURL(guestUrl, {
        width: 600,
        margin: 2,
        color: {
          dark: '#090d16',
          light: '#ffffff',
        },
      })
        .then((url) => setQrUrl(url))
        .catch((err) => console.error('Error creating QR', err));
    }
  }, [isOpen, party.code, guestUrl]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(guestUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!qrUrl) return;
    const a = document.createElement('a');
    a.href = qrUrl;
    a.download = `QR-${party.code}-${party.name.replace(/\s+/g, '_')}.png`;
    a.click();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div
        id="qr-modal-card"
        className="bg-slate-900 border border-slate-700 text-slate-100 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="bg-slate-800/80 px-6 py-4 border-b border-slate-700 flex items-center justify-between">
          <MovilDjLogo size="sm" subtitle="Código QR para Invitados" />
          <button
            id="close-qr-modal-btn"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 text-center space-y-4">
          <div className="inline-block px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-400 text-xs font-semibold uppercase tracking-wider">
            Código Fiesta: <span className="font-mono text-white text-sm ml-1">{party.code}</span>
          </div>

          <h2 className="text-xl font-black text-white tracking-tight">{party.name}</h2>
          <p className="text-xs text-slate-400 flex items-center justify-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            DJ en cabina: <strong className="text-slate-200">{party.djName}</strong>
          </p>

          {/* QR Container */}
          <div className="p-4 bg-white rounded-xl shadow-inner inline-block mx-auto border-4 border-amber-400/80">
            {qrUrl ? (
              <img
                src={qrUrl}
                alt={`QR ${party.code}`}
                className="w-56 h-56 mx-auto block object-contain"
              />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center text-slate-400">
                Generando QR...
              </div>
            )}
          </div>

          <p className="text-xs text-slate-300 max-w-xs mx-auto leading-relaxed">
            Los invitados pueden apuntar su cámara a este código para abrir la app y solicitar música sin descargar nada.
          </p>

          {/* Link bar */}
          <div className="flex items-center gap-2 p-2 bg-slate-800/80 rounded-xl border border-slate-700 text-left">
            <input
              type="text"
              readOnly
              value={guestUrl}
              className="bg-transparent text-xs text-slate-300 font-mono flex-1 outline-none px-2 truncate"
            />
            <button
              id="copy-party-url-btn"
              onClick={handleCopy}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-xs font-medium text-white rounded-lg flex items-center gap-1.5 transition shrink-0"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            <button
              id="download-qr-btn"
              onClick={handleDownload}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-medium text-slate-200 flex flex-col items-center justify-center gap-1 transition"
            >
              <Download className="w-4 h-4 text-cyan-400" />
              <span>Descargar</span>
            </button>
            <button
              id="print-qr-btn"
              onClick={handlePrint}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-medium text-slate-200 flex flex-col items-center justify-center gap-1 transition"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>Imprimir</span>
            </button>
            <button
              id="open-stage-btn"
              onClick={() => {
                onClose();
                onOpenStage();
              }}
              className="p-2.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded-xl text-xs font-medium text-amber-300 flex flex-col items-center justify-center gap-1 transition"
            >
              <MonitorPlay className="w-4 h-4 text-amber-400" />
              <span>Proyector</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-800/50 px-6 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Actualización en tiempo real activa</span>
          <a
            href={guestUrl}
            target="_blank"
            rel="noreferrer"
            className="text-amber-400 hover:underline flex items-center gap-1"
          >
            Abrir vista invitado <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
