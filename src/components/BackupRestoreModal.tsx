import { useMemo, useRef, useState } from "react";
import { X, KeyRound, Upload, AlertTriangle, Lock, FileText, FileUp } from "lucide-react";
import { parseAnyBackup, decryptBackup, type BackupPayload, type BackupSummary, type ParsedBackup } from "../utils/backupFile";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Snapshot of current state, used for the "old vs new" comparison view. */
  currentSummary: BackupSummary;
  /** ISO timestamp of last successful local restore/save (or app start). Used to flag staleness. */
  currentLastModified: string | null;
  onRestore: (payload: BackupPayload) => void;
  /** Called when the file in the picker was replaced with a different one. */
}

function formatDe(iso: string): string {
  try {
    return new Date(iso).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function compareDates(backup: string, local: string | null): "newer" | "older" | "equal" | "no-local" {
  if (!local) return "no-local";
  const a = new Date(backup).getTime();
  const b = new Date(local).getTime();
  if (a > b) return "newer";
  if (a < b) return "older";
  return "equal";
}

export default function BackupRestoreModal({
  isOpen,
  onClose,
  currentSummary,
  currentLastModified,
  onRestore,
}: Props) {
  const [parsed, setParsed] = useState<ParsedBackup | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const summary: BackupSummary | null = parsed
    ? parsed.kind === "encrypted"
      ? parsed.file.summary
      : parsed.summary
    : null;
  const fileLastModified: string | null = parsed
    ? parsed.kind === "encrypted"
      ? parsed.file.lastModified
      : parsed.lastModified
    : null;

  const ageVerdict = useMemo(
    () => (fileLastModified ? compareDates(fileLastModified, currentLastModified) : null),
    [fileLastModified, currentLastModified]
  );

  const reset = () => {
    setParsed(null);
    setFileName(null);
    setSecret("");
    setErr(null);
  };

  if (!isOpen) return null;

  const handlePickFile = async (f: File | null) => {
    if (!f) return;
    setErr(null);
    setSecret("");
    try {
      const result = await parseAnyBackup(f);
      setParsed(result);
      setFileName(f.name);
    } catch (e: any) {
      setParsed(null);
      setFileName(f.name);
      setErr(e?.message || "Datei konnte nicht gelesen werden.");
    }
  };

  const handleRestore = async () => {
    if (!parsed) return;
    setBusy(true);
    setErr(null);
    try {
      let payload: BackupPayload;
      if (parsed.kind === "encrypted") {
        if (!secret) {
          setBusy(false);
          return;
        }
        payload = await decryptBackup(secret, parsed.file);
      } else {
        payload = parsed.payload;
      }
      onRestore(payload);
      reset();
      onClose();
    } catch (e: any) {
      setErr(e?.message || "Entschlüsselung fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[110] bg-slate-900/70 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white w-full max-w-md sm:rounded-2xl shadow-2xl flex flex-col max-h-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-slate-800" />
            <h2 className="font-bold text-slate-900">Aktien-Liste laden</h2>
          </div>
          <button onClick={handleClose} className="p-1 hover:bg-slate-200 rounded-lg" aria-label="Schließen">
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* File picker */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
              1. Backup-Datei wählen
            </label>
            <input
              ref={inputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => handlePickFile(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-slate-300 hover:border-slate-400 bg-slate-50 hover:bg-slate-100 rounded-xl p-4 text-sm font-semibold text-slate-700 transition-colors"
            >
              <Upload className="w-4 h-4" />
              {fileName ? `${fileName} (austauschen)` : "Datei auswählen"}
            </button>
          </div>

          {/* Comparison view */}
          {parsed && summary && fileLastModified && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  Vergleich
                </div>
                {parsed.kind === "legacy" && (
                  <span className="text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                    <FileUp className="w-3 h-3" />
                    Altes Format ({parsed.sourceVersion})
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white border border-slate-200 rounded-lg p-2 space-y-1">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Aktuell auf Gerät</div>
                  <div className="text-[11px] text-slate-700 font-mono">
                    {currentLastModified ? formatDe(currentLastModified) : "—"}
                  </div>
                  <ul className="text-[11px] text-slate-700 list-none space-y-0.5">
                    <li>Portfolio: <strong>{currentSummary.portfolioCount}</strong></li>
                    <li>Watchlist: <strong>{currentSummary.watchlistCount}</strong></li>
                    <li>Käufe: <strong>{currentSummary.purchaseCount}</strong></li>
                    <li>Verkäufe: <strong>{currentSummary.soldTradeCount}</strong></li>
                  </ul>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg p-2 space-y-1">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Aus Backup</div>
                  <div className="text-[11px] text-slate-700 font-mono">{formatDe(fileLastModified)}</div>
                  <ul className="text-[11px] text-slate-700 list-none space-y-0.5">
                    <li>Portfolio: <strong>{summary.portfolioCount}</strong></li>
                    <li>Watchlist: <strong>{summary.watchlistCount}</strong></li>
                    <li>Käufe: <strong>{summary.purchaseCount}</strong></li>
                    <li>Verkäufe: <strong>{summary.soldTradeCount}</strong></li>
                  </ul>
                </div>
              </div>

              {ageVerdict === "newer" && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2 text-emerald-800 text-[11px] font-semibold">
                  ✅ Das Backup ist <strong>neuer</strong> als deine aktuellen Daten.
                </div>
              )}
              {ageVerdict === "older" && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-amber-800 text-[11px] font-semibold flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  Das Backup ist <strong>älter</strong> — Laden überschreibt neuere Daten.
                </div>
              )}
              {ageVerdict === "equal" && (
                <div className="bg-slate-100 border border-slate-200 rounded-lg p-2 text-slate-700 text-[11px]">
                  Backup-Datum stimmt mit lokalen Daten überein.
                </div>
              )}
              {ageVerdict === "no-local" && (
                <div className="bg-slate-100 border border-slate-200 rounded-lg p-2 text-slate-700 text-[11px]">
                  Noch keine lokalen Daten — Backup wird vollständig geladen.
                </div>
              )}
            </div>
          )}

          {/* PIN/password input — only encrypted backups need a key. */}
          {parsed?.kind === "encrypted" && (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                2. {parsed.file.mode === "pin" ? "PIN eingeben" : "Passwort eingeben"}
              </label>
              <input
                type={parsed.file.mode === "pin" ? "tel" : "password"}
                inputMode={parsed.file.mode === "pin" ? "numeric" : "text"}
                autoComplete="current-password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder={parsed.file.mode === "pin" ? "Ziffern" : "Passwort"}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-400"
                onKeyDown={(e) => e.key === "Enter" && handleRestore()}
              />
            </div>
          )}

          {parsed?.kind === "legacy" && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 flex gap-2">
              <FileUp className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Altes <strong>Klartext</strong>-Backup erkannt — kein PIN nötig.
                Klick „Laden" um deine Daten zu übernehmen. Danach im Workspace-Tab ein neues, verschlüsseltes Backup erstellen.
              </span>
            </div>
          )}

          {err && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-700">{err}</div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={handleRestore}
            disabled={!parsed || (parsed?.kind === "encrypted" && !secret) || busy}
            className={
              "flex-1 px-3 py-2.5 text-sm font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors " +
              (parsed && (parsed.kind === "legacy" || secret) && !busy
                ? "bg-slate-900 hover:bg-slate-800 text-white"
                : "bg-slate-200 text-slate-400 cursor-not-allowed")
            }
          >
            <KeyRound className="w-4 h-4" />
            {busy ? "Lade…" : "Laden"}
          </button>
        </div>
      </div>
    </div>
  );
}
