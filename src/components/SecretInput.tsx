/**
 * MASKIERTE GEHEIMNIS-EINGABE (PIN / Passwort)
 * --------------------------------------------
 * Zeigt die Eingabe als Punkte an (type="password") — auch im
 * PIN-Modus, wo vorher type="tel" die Ziffern im Klartext zeigte.
 *
 * Rechts sitzt ein Auge-Button: GEDRÜCKT HALTEN zeigt die Eingabe,
 * Loslassen (oder Finger wegziehen) maskiert sie sofort wieder.
 *
 * Wird an allen drei Stellen verwendet (Backup-Setup: PIN +
 * Wiederholen, Backup-Wiederherstellen: PIN/Passwort), damit die
 * Logik nur einmal existiert.
 */
import { useState } from "react";
import { Eye } from "lucide-react";

interface SecretInputProps {
  value: string;
  onChange: (v: string) => void;
  /** true = PIN (Ziffern-Tastatur am iPhone), false = Passwort. */
  numeric?: boolean;
  placeholder?: string;
  /** "new-password" (Anlegen) oder "current-password" (Eingeben). */
  autoComplete?: string;
  /** Optional: Enter-Taste löst diese Aktion aus (z.B. Wiederherstellen). */
  onEnter?: () => void;
}

export default function SecretInput({ value, onChange, numeric, placeholder, autoComplete, onEnter }: SecretInputProps) {
  const [sichtbar, setSichtbar] = useState(false);

  return (
    <div className="relative">
      <input
        type={sichtbar ? "text" : "password"}
        inputMode={numeric ? "numeric" : "text"}
        autoComplete={autoComplete ?? "new-password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        onKeyDown={onEnter ? (e) => e.key === "Enter" && onEnter() : undefined}
        className="w-full pl-3 pr-12 py-2.5 border border-slate-300 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-400"
      />
      <button
        type="button"
        onPointerDown={() => setSichtbar(true)}
        onPointerUp={() => setSichtbar(false)}
        onPointerLeave={() => setSichtbar(false)}
        onPointerCancel={() => setSichtbar(false)}
        onContextMenu={(e) => e.preventDefault()}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:bg-slate-200 active:text-slate-900 transition-colors cursor-pointer select-none touch-none"
        title="Gedrückt halten zum Anzeigen"
        aria-label="Gedrückt halten zum Anzeigen"
      >
        <Eye className="h-5 w-5" />
      </button>
    </div>
  );
}
