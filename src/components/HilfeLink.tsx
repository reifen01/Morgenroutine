/**
 * HILFE-FRAGEZEICHEN
 * ------------------
 * Kleines "?" neben einem Wert oder einer Überschrift. Antippen springt in
 * den passenden Handbuch-Abschnitt — statt den Nutzer selbst suchen zu lassen.
 *
 * Die abschnitt-ID muss einer ID aus handbuchInhalt.ts entsprechen.
 * Beispiel: <HilfeLink abschnitt="kaufampel" titel="Warum wird gesperrt?" />
 */
import { HelpCircle } from "lucide-react";

interface HilfeLinkProps {
  /** ID aus HANDBUCH (siehe utils/handbuchInhalt.ts). */
  abschnitt: string;
  /** Tooltip-Text — sagt, was einen erwartet. */
  titel?: string;
  /** Optional größer darstellen. */
  gross?: boolean;
}

/**
 * Öffnet den System-Tab mit Handbuch und springt zum Abschnitt.
 * Läuft über ein CustomEvent, damit die Komponente an beliebiger Stelle
 * eingesetzt werden kann, ohne Props durch fünf Ebenen zu reichen.
 */
export function oeffneHandbuch(abschnitt: string) {
  window.dispatchEvent(
    new CustomEvent("morgenroutine:handbuch", { detail: { abschnitt } })
  );
}

export default function HilfeLink({ abschnitt, titel, gross }: HilfeLinkProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        oeffneHandbuch(abschnitt);
      }}
      title={titel || "Im Handbuch nachlesen"}
      aria-label={titel || "Im Handbuch nachlesen"}
      className="inline-flex items-center justify-center rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors align-middle cursor-pointer shrink-0"
    >
      <HelpCircle className={gross ? "h-4 w-4" : "h-3.5 w-3.5"} />
    </button>
  );
}
