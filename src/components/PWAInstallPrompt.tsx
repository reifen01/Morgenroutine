import { useState, useEffect } from 'react';
import { Download, X, Share } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [showIosInstructions, setShowIosInstructions] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    const ua = window.navigator.userAgent;
    const iosCheck = /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
    setIsIos(iosCheck);

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      return;
    }

    const dismissed = localStorage.getItem('pwa_install_dismissed');
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10);
      if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) {
        return;
      }
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    if (iosCheck) {
      const timer = setTimeout(() => setShowInstall(true), 3000);
      return () => {
        window.removeEventListener('beforeinstallprompt', handler);
        clearTimeout(timer);
      };
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (isIos) {
      setShowIosInstructions(true);
      return;
    }
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setShowInstall(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa_install_dismissed', String(Date.now()));
    setShowInstall(false);
    setShowIosInstructions(false);
  };

  if (!showInstall) return null;

  if (showIosInstructions) {
    return (
      <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-96 z-50">
        <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200">
          <div className="flex items-start justify-between mb-2">
            <h4 className="text-sm font-bold text-slate-900">App auf iPhone installieren</h4>
            <button
              onClick={handleDismiss}
              className="text-slate-400 hover:text-slate-600"
              aria-label="Schließen"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <ol className="text-xs text-slate-600 space-y-2 mt-3">
            <li className="flex gap-2">
              <span className="font-bold text-slate-800">1.</span>
              <span>
                Tippe unten auf das <Share className="inline h-4 w-4 text-blue-500" /> Teilen-Symbol
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-slate-800">2.</span>
              <span>Wähle <strong>"Zum Home-Bildschirm"</strong></span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-slate-800">3.</span>
              <span>Tippe oben rechts auf <strong>"Hinzufügen"</strong></span>
            </li>
          </ol>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-96 z-50">
      <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200 flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
          <Download className="h-5 w-5 text-slate-800" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-slate-900">App installieren</h4>
          <p className="text-xs text-slate-500 mt-1 leading-snug">
            Installiere die Morgenroutine als App auf deinem Gerät – schneller Zugriff & offline nutzbar.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleInstall}
              className="text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 px-3 py-1.5 rounded-lg transition-colors"
            >
              Installieren
            </button>
            <button
              onClick={handleDismiss}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg transition-colors"
            >
              Später
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-slate-400 hover:text-slate-600 shrink-0"
          aria-label="Schließen"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
