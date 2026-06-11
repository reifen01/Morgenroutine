import { RefreshCw, X } from 'lucide-react';

interface PWAUpdatePromptProps {
  needRefresh: boolean;
  onApply: () => void;
  onDismiss: () => void;
}

export default function PWAUpdatePrompt({ needRefresh, onApply, onDismiss }: PWAUpdatePromptProps) {
  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm bg-slate-800 text-white rounded-lg shadow-2xl p-4 flex items-start gap-3 animate-in slide-in-from-bottom-4">
      <RefreshCw className="w-5 h-5 mt-0.5 shrink-0" />
      <div className="flex-1">
        <div className="font-semibold mb-1">Neue Version verfügbar</div>
        <div className="text-sm text-slate-100 mb-3">
          Eine aktualisierte Version der Morgenroutine wurde geladen.
        </div>
        <button
          onClick={onApply}
          className="bg-white text-slate-900 font-semibold px-3 py-1.5 rounded text-sm hover:bg-slate-50 transition"
        >
          Jetzt aktualisieren
        </button>
      </div>
      <button
        onClick={onDismiss}
        className="text-slate-200 hover:text-white p-1 -mr-1 -mt-1"
        aria-label="Schließen"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
