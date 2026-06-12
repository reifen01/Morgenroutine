import { useState } from "react";
import { X, Lock, Download, AlertTriangle, KeyRound, Hash } from "lucide-react";
import { createBackup, downloadBackup, type BackupPayload } from "../utils/backupFile";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  collectPayload: () => BackupPayload;
  onSuccess?: () => void;
}

type Mode = "pin" | "password";

function isPinValid(pin: string): boolean {
  return /^\d{4,}$/.test(pin);
}

function isPasswordValid(pw: string): boolean {
  return pw.length >= 8;
}

export default function BackupSetupModal({ isOpen, onClose, collectPayload, onSuccess }: Props) {
  const [mode, setMode] = useState<Mode>("pin");
  const [secret, setSecret] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!isOpen) return null;

  const valid =
    mode === "pin" ? isPinValid(secret) : isPasswordValid(secret);
  const matches = secret === confirm && secret.length > 0;

  const handleCreate = async () => {
    if (!valid) {
      setErr(mode === "pin" ? "PIN muss mindestens 4 Ziffern haben." : "Passwort muss mindestens 8 Zeichen haben.");
      return;
    }
    if (!matches) {
      setErr("Die Eingaben stimmen nicht überein.");
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      const payload = collectPayload();
      const file = await createBackup(secret, mode, payload);
      downloadBackup(file);
      onSuccess?.();
      // Reset & close
      setSecret("");
      setConfirm("");
      onClose();
    } catch (e: any) {
      setErr(e?.message || "Backup konnte nicht erstellt werden.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] bg-slate-900/70 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div
        className="bg-white w-full max-w-md sm:rounded-2xl shadow-2xl flex flex-col max-h-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-slate-800" />
            <h2 className="font-bold text-slate-900">Backup einrichten</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-lg" aria-label="Schließen">
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            Speichert deine Aktien-Liste verschlüsselt als Datei. Auf jedem anderen Gerät kannst du diese Datei mit dem hier gesetzten PIN/Passwort wieder einlesen.
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              <strong>Wichtig:</strong> Wir haben deinen PIN nicht. Vergessenes Passwort = Backup ist verloren.
            </span>
          </div>

          {/* Mode toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => { setMode("pin"); setSecret(""); setConfirm(""); setErr(null); }}
              className={
                "flex flex-col items-start p-3 rounded-xl border transition-colors text-left " +
                (mode === "pin"
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50")
              }
            >
              <div className="flex items-center gap-1.5 font-semibold text-sm">
                <Hash className="w-4 h-4" />
                PIN
              </div>
              <span className={"text-[11px] mt-0.5 " + (mode === "pin" ? "text-slate-300" : "text-slate-500")}>4+ Ziffern, schnell</span>
            </button>
            <button
              type="button"
              onClick={() => { setMode("password"); setSecret(""); setConfirm(""); setErr(null); }}
              className={
                "flex flex-col items-start p-3 rounded-xl border transition-colors text-left " +
                (mode === "password"
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50")
              }
            >
              <div className="flex items-center gap-1.5 font-semibold text-sm">
                <KeyRound className="w-4 h-4" />
                Passwort
              </div>
              <span className={"text-[11px] mt-0.5 " + (mode === "password" ? "text-slate-300" : "text-slate-500")}>8+ Zeichen, sicherer</span>
            </button>
          </div>

          {/* Inputs */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
              {mode === "pin" ? "PIN (4+ Ziffern)" : "Passwort (min. 8 Zeichen)"}
            </label>
            <input
              type={mode === "pin" ? "tel" : "password"}
              inputMode={mode === "pin" ? "numeric" : "text"}
              autoComplete="new-password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder={mode === "pin" ? "z.B. 1234" : "z.B. ein-langes-passwort-2026"}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">Wiederholen</label>
            <input
              type={mode === "pin" ? "tel" : "password"}
              inputMode={mode === "pin" ? "numeric" : "text"}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
            {confirm && !matches && (
              <p className="text-xs text-rose-600">Die Eingaben stimmen nicht überein.</p>
            )}
          </div>

          {err && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-700">{err}</div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={!valid || !matches || busy}
            className={
              "flex-1 px-3 py-2.5 text-sm font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors " +
              (valid && matches && !busy
                ? "bg-slate-900 hover:bg-slate-800 text-white"
                : "bg-slate-200 text-slate-400 cursor-not-allowed")
            }
          >
            <Download className="w-4 h-4" />
            {busy ? "Verschlüssele…" : "Backup-Datei speichern"}
          </button>
        </div>
      </div>
    </div>
  );
}
