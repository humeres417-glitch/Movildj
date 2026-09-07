import { useState, useEffect } from 'react';
import { usePartyRealtime } from './lib/socket';
import { DjDashboard } from './components/DjDashboard';
import { GuestView } from './components/GuestView';
import { StageDisplay } from './components/StageDisplay';
import { QrModal } from './components/QrModal';
import { DjSettingsModal } from './components/DjSettingsModal';
import { NewPartyModal } from './components/NewPartyModal';
import { MovilDjLogo } from './components/MovilDjLogo';
import { Headphones, Smartphone, MonitorPlay, QrCode, Radio, AlertCircle } from 'lucide-react';

export default function App() {
  // Read URL parameters for automatic role & party routing
  const getInitialState = () => {
    if (typeof window === 'undefined') {
      return { partyCode: 'FIESTA-VIP', mode: 'dj' as 'dj' | 'guest' | 'stage' };
    }
    const params = new URLSearchParams(window.location.search);
    const partyFromUrl = params.get('party');
    const isStage = params.get('stage') === 'true';
    const explicitMode = params.get('mode') as 'dj' | 'guest' | null;

    if (isStage) {
      return { partyCode: (partyFromUrl || 'FIESTA-VIP').toUpperCase(), mode: 'stage' as const };
    }

    if (partyFromUrl && explicitMode !== 'dj') {
      // Guest scanned QR code!
      return { partyCode: partyFromUrl.toUpperCase(), mode: 'guest' as const };
    }

    return { partyCode: (partyFromUrl || 'FIESTA-VIP').toUpperCase(), mode: 'dj' as const };
  };

  const [initial] = useState(getInitialState);
  const [partyCode, setPartyCode] = useState<string>(initial.partyCode);
  const [currentMode, setCurrentMode] = useState<'dj' | 'guest' | 'stage'>(initial.mode);

  // Modals state
  const [isQrOpen, setIsQrOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isNewPartyOpen, setIsNewPartyOpen] = useState<boolean>(false);

  // Real-time synchronization hook
  const {
    party,
    requests,
    isConnected,
    isLoading,
    error,
    reload,
    submitRequest,
    voteRequest,
    updateRequestStatus,
    deleteRequest,
    updateParty,
  } = usePartyRealtime({
    partyCode,
    role: currentMode === 'dj' ? 'dj' : 'guest',
  });

  // Keep URL query in sync when switching parties
  const handleSelectParty = (newCode: string) => {
    setPartyCode(newCode.toUpperCase());
    const url = new URL(window.location.href);
    url.searchParams.set('party', newCode.toUpperCase());
    window.history.replaceState({}, '', url.toString());
  };

  const handleModeSwitch = (newMode: 'dj' | 'guest' | 'stage') => {
    setCurrentMode(newMode);
    const url = new URL(window.location.href);
    if (newMode === 'guest') {
      url.searchParams.set('party', partyCode);
      url.searchParams.delete('mode');
      url.searchParams.delete('stage');
    } else if (newMode === 'stage') {
      url.searchParams.set('stage', 'true');
    } else {
      url.searchParams.set('mode', 'dj');
      url.searchParams.delete('stage');
    }
    window.history.replaceState({}, '', url.toString());
  };

  if (isLoading && !party) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4 font-sans">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 animate-spin">
          <Radio className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-slate-300">Conectando con la fiesta {partyCode}...</p>
      </div>
    );
  }

  if (error && !party) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4 font-sans">
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full text-center space-y-4 shadow-2xl">
          <div className="flex justify-center pb-2">
            <MovilDjLogo size="sm" subtitle="Peticiones en Vivo" />
          </div>
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">No se encontró la fiesta</h2>
          <p className="text-xs text-slate-400">{error}</p>
          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={() => handleSelectParty('FIESTA-VIP')}
              className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-bold text-xs rounded-xl hover:from-amber-400 hover:to-amber-300 transition shadow-lg shadow-amber-500/20"
            >
              Ir a Fiesta Principal (FIESTA-VIP)
            </button>
            <button
              onClick={() => setIsNewPartyOpen(true)}
              className="w-full py-2.5 bg-slate-800 text-slate-200 font-bold text-xs rounded-xl hover:bg-slate-700 transition border border-slate-700"
            >
              Crear Nueva Fiesta
            </button>
          </div>
        </div>

        <NewPartyModal
          isOpen={isNewPartyOpen}
          currentPartyCode={partyCode}
          onClose={() => setIsNewPartyOpen(false)}
          onSelectParty={handleSelectParty}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans">
      {/* Simulation / Switcher Top Navigation Bar (ideal for testing in single browser) */}
      <div className="bg-slate-900 border-b border-slate-800/80 px-4 py-1.5 text-xs text-slate-300 shrink-0 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-3">
            <MovilDjLogo size="xs" subtitle="Live Music Requests" />
            <span className="text-slate-600 hidden sm:inline">•</span>
            <div className="flex items-center gap-1.5 text-xs text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Fiesta:</span>
              <strong className="text-amber-400 font-mono tracking-wider">{partyCode}</strong>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              id="switch-mode-dj"
              onClick={() => handleModeSwitch('dj')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                currentMode === 'dj'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Headphones className="w-3.5 h-3.5" />
              <span>Panel DJ</span>
            </button>

            <button
              id="switch-mode-guest"
              onClick={() => handleModeSwitch('guest')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                currentMode === 'guest'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Vista Invitado (Móvil)</span>
            </button>

            <button
              id="switch-mode-stage"
              onClick={() => handleModeSwitch('stage')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                currentMode === 'stage'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <MonitorPlay className="w-3.5 h-3.5" />
              <span>Proyector</span>
            </button>

            <button
              id="quick-qr-header-btn"
              onClick={() => setIsQrOpen(true)}
              className="p-1 rounded-lg text-amber-400 hover:bg-slate-800 transition"
              title="Ver código QR para escanear con móvil"
            >
              <QrCode className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main View based on current role */}
      {party && (
        <div className="flex-1 flex flex-col">
          {currentMode === 'guest' && (
            <GuestView
              party={party}
              requests={requests}
              onSubmitRequest={submitRequest}
              onVote={voteRequest}
              onSwitchToDj={() => handleModeSwitch('dj')}
            />
          )}

          {currentMode === 'stage' && (
            <StageDisplay
              party={party}
              requests={requests}
              onClose={() => handleModeSwitch('dj')}
            />
          )}

          {currentMode === 'dj' && (
            <DjDashboard
              party={party}
              requests={requests}
              isConnected={isConnected}
              onUpdateRequestStatus={updateRequestStatus}
              onDeleteRequest={deleteRequest}
              onOpenQr={() => setIsQrOpen(true)}
              onOpenStage={() => handleModeSwitch('stage')}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onOpenNewParty={() => setIsNewPartyOpen(true)}
              onReload={reload}
            />
          )}

          {/* QR Modal */}
          <QrModal
            party={party}
            isOpen={isQrOpen}
            onClose={() => setIsQrOpen(false)}
            onOpenStage={() => {
              setIsQrOpen(false);
              handleModeSwitch('stage');
            }}
          />

          {/* DJ Settings Modal */}
          <DjSettingsModal
            party={party}
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            onSave={updateParty}
          />

          {/* New / Switch Party Modal */}
          <NewPartyModal
            isOpen={isNewPartyOpen}
            currentPartyCode={party.code}
            onClose={() => setIsNewPartyOpen(false)}
            onSelectParty={handleSelectParty}
          />
        </div>
      )}
    </div>
  );
}
