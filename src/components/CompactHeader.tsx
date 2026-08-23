/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HelpCircle, ArrowUp } from "lucide-react";

interface CompactHeaderProps {
  routineDate: string;
  onOpenHelp: () => void;
  onCheckForUpdate: () => void;
  updateAvailable: boolean;
  onApplyUpdate: () => void;
  isSystemReady: boolean;
  /** Tage seit der letzten Sicherung; null = noch nie gesichert. */
  tageSeitBackup?: number | null;
  /** Oeffnet den Backup-Dialog. */
  onOpenBackup?: () => void;
}

export default function CompactHeader({
  routineDate,
  onOpenHelp,
  onCheckForUpdate,
  updateAvailable,
  onApplyUpdate,
  isSystemReady,
  tageSeitBackup,
  onOpenBackup,
}: CompactHeaderProps) {
  // Convert YYYY-MM-DD back to DD.MM.YYYY for display
  const getDeDateString = (isoDate: string) => {
    if (!isoDate) return "01.06.2026";
    const parts = isoDate.split("-");
    if (parts.length === 3) {
      return `${parts[2]}.${parts[1]}.${parts[0]}`;
    }
    return isoDate;
  };


  return (
    <header className="bg-white border-b border-slate-200 shrink-0 z-40 px-3 sm:px-8 py-3 flex items-center justify-between gap-2 max-w-full overflow-hidden shadow-sm shadow-slate-100">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={updateAvailable ? onApplyUpdate : onCheckForUpdate}
          title={
            updateAvailable
              ? `Neue Version verfügbar — Klick zum Aktualisieren (aktueller Build: ${__BUILD_VERSION__})`
              : `Aktuelle Version: ${__BUILD_VERSION__} — Klick prüft auf Updates`
          }
          className="bg-white border border-slate-200 rounded-2xl flex items-center justify-center h-14 w-14 shadow-sm overflow-hidden shrink-0 hover:border-slate-300 transition-colors cursor-pointer"
        >
          <img src="/icon.svg" alt="Morgenroutine Logo" className="h-12 w-12" />
        </button>
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 font-display leading-tight">
            Morgenroutine
          </h1>
          <p className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5">
            Handels-Wächter
          </p>
          {updateAvailable && (
            <button
              type="button"
              onClick={onApplyUpdate}
              className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200 transition-colors animate-pulse"
              title="Neue Version verfügbar — Klick zum Aktualisieren"
            >
              <ArrowUp className="w-3 h-3" />
              Update verfügbar
            </button>
          )}

          {/* ── Backup-Erinnerung ──
              Die Daten liegen ausschliesslich im Browser-Speicher. Wird der
              geleert (z.B. Safari-Websitedaten), ist alles weg. Deshalb ein
              dezenter Hinweis, wenn die letzte Sicherung laenger her ist. */}
          {onOpenBackup && (tageSeitBackup === null || (tageSeitBackup ?? 0) >= 7) && (
            <button
              onClick={onOpenBackup}
              className="mt-1 ml-1 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200 transition-colors"
              title={
                tageSeitBackup === null
                  ? "Noch keine Sicherung vorhanden — jetzt eine erstellen"
                  : `Letzte Sicherung vor ${tageSeitBackup} Tagen — jetzt eine neue erstellen`
              }
            >
              🛟 {tageSeitBackup === null ? "Kein Backup" : `Backup: ${tageSeitBackup} T`}
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
          <span className="text-[9px] font-bold text-slate-400 font-mono tracking-widest hidden sm:inline">DATUM</span>
          <span className="w-[78px] text-[11px] font-bold font-mono text-slate-800 select-none">
            {getDeDateString(routineDate)}
          </span>
        </div>

        <button
          onClick={onOpenHelp}
          className="flex items-center justify-center h-8 w-8 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 rounded-lg shadow-xs transition-all active:scale-95 duration-200 shrink-0"
          title="Handbuch / Regel-Hilfe öffnen"
        >
          <HelpCircle className="h-4 w-4" />
        </button>

        <span
          className={`h-2 w-2 rounded-full ${
            isSystemReady ? "bg-emerald-500 shadow-lg shadow-emerald-500/50 animate-pulse" : "bg-slate-300"
          }`}
          title={isSystemReady ? "System bereit" : "System nicht bereit"}
        ></span>
      </div>
    </header>
  );
}
