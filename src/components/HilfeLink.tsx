/**
 * HANDBUCH-BUCH-SYMBOL
 * --------------------
 * Gut sichtbarer Buch-Button neben einem Block-Titel oder Wert. Antippen
 * springt in den passenden Handbuch-Abschnitt — statt den Nutzer selbst
 * suchen zu lassen.
 *
 * Abgrenzung: "?" = Inline-Erklärung direkt an Ort und Stelle.
 *             Buch = Sprung ins Handbuch (diese Komponente).
 *
 * Die abschnitt-ID muss einer ID aus handbuchInhalt.ts entsprechen.
 * Beispiel: <HilfeLink abschnitt="kaufampel" titel="Warum wird gesperrt?" />
 */
import { BookOpen } from "lucide-react";

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
      className="inline-flex items-center justify-center rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 hover:text-blue-900 active:scale-95 transition-all align-middle cursor-pointer shrink-0 shadow-xs"
      style={{ width: gross ? 30 : 26, height: gross ? 30 : 26 }}
    >
      <BookOpen className={gross ? "h-5 w-5" : "h-4 w-4"} strokeWidth={2.4} />
    </button>
  );
}
