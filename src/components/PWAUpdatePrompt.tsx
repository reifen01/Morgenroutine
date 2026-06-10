import { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { registerSW } from 'virtual:pwa-register';

const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000;

export default function PWAUpdatePrompt() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [updateSW, setUpdateSW] = useState<((reload?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    const update = registerSW({
      onNeedRefresh() {
        setNeedRefresh(true);
      },
      onRegisteredSW(_swUrl, registration) {
        if (!registration) return;
        setInterval(() => {
          registration.update().catch(() => {});
        }, UPDATE_CHECK_INTERVAL_MS);
      },
    });
    setUpdateSW(() => update);
  }, []);

  if (!needRefresh) return null;

  const handleUpdate = () => {
    if (updateSW) {
      updateSW(true);
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm bg-indigo-600 text-white rounded-lg shadow-2xl p-4 flex items-start gap-3 animate-in slide-in-from-bottom-4">
      <RefreshCw className="w-5 h-5 mt-0.5 shrink-0" />
      <div className="flex-1">
        <div className="font-semibold mb-1">Neue Version verfügbar</div>
        <div className="text-sm text-indigo-100 mb-3">
          Eine aktualisierte Version der Morgenroutine wurde geladen.
        </div>
        <button
          onClick={handleUpdate}
          className="bg-white text-indigo-700 font-semibold px-3 py-1.5 rounded text-sm hover:bg-indigo-50 transition"
        >
          Jetzt aktualisieren
        </button>
      </div>
      <button
        onClick={() => setNeedRefresh(false)}
        className="text-indigo-200 hover:text-white p-1 -mr-1 -mt-1"
        aria-label="Schließen"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
