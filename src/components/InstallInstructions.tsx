import { Share, Download } from "lucide-react";

interface Props {
  /** Forces iOS instructions to show regardless of detection — useful in the
   *  Help modal where the user might be on desktop but reading for a phone. */
  forceShowAll?: boolean;
  isIos?: boolean;
  hasInstallPrompt?: boolean;
  onTriggerInstall?: () => void;
}

export default function InstallInstructions({
  forceShowAll = false,
  isIos,
  hasInstallPrompt,
  onTriggerInstall,
}: Props) {
  const showIos = forceShowAll || isIos;
  const showAndroid = forceShowAll || (!isIos && hasInstallPrompt);
  const showDesktop = forceShowAll || (!isIos && !hasInstallPrompt);

  return (
    <div className="space-y-4">
      {showAndroid && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left text-sm text-slate-700 space-y-2">
          <p className="font-bold text-slate-900 flex items-center gap-2">
            <Download className="w-4 h-4" /> Android
          </p>
          <p>Tippe auf den Install-Button — Chrome bietet die Installation direkt an.</p>
          {onTriggerInstall && (
            <button
              onClick={onTriggerInstall}
              className="mt-2 w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
            >
              <Download className="h-4 w-4" />
              Jetzt installieren
            </button>
          )}
        </div>
      )}

      {showIos && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left text-sm text-slate-700 space-y-2">
          <p className="font-bold text-slate-900 flex items-center gap-2">
            <Share className="w-4 h-4" /> iPhone / iPad
          </p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Tippe in Safari auf <Share className="inline h-4 w-4 align-text-bottom" /> (Teilen-Icon unten)</li>
            <li>Wähle <strong>„Zum Home-Bildschirm"</strong></li>
            <li>Bestätige mit <strong>„Hinzufügen"</strong></li>
          </ol>
          <p className="text-xs text-slate-500 pt-1">Die App liegt danach wie eine native App am Home-Screen.</p>
        </div>
      )}

      {showDesktop && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left text-sm text-slate-700 space-y-2">
          <p className="font-bold text-slate-900 flex items-center gap-2">
            <Download className="w-4 h-4" /> Desktop (Mac / Windows)
          </p>
          <p>
            Im Chrome oder Edge: rechts oben in der Adressleiste auf das <strong>Install-Icon</strong> oder über das Menü
            (⋮ → „App installieren") klicken.
          </p>
        </div>
      )}
    </div>
  );
}
