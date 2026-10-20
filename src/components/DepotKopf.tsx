/**
 * Fette Depotwert-Zeile ganz oben im Depot: Depotwert, Gewinn gesamt, Heute,
 * Einstand — plus „Aktualisieren" (holt nur Kurse, keine Ampel-Werte).
 */
import { RefreshCw } from "lucide-react";
import { LivePrices } from "../types";
import { formatAccounting } from "../utils/mathUtils";

interface Holding {
  key: string;
  totalShares: number;
  totalCost: number;
  averageKaufkurs: number;
}

interface DepotKopfProps {
  holdings: Holding[];
  livePrices: LivePrices;
  onAktualisieren?: () => void;
  laedt?: boolean;
  /** ISO-Zeitpunkt des letzten Kurs-Abrufs */
  stand?: string | null;
}

export default function DepotKopf({ holdings, livePrices, onAktualisieren, laedt, stand }: DepotKopfProps) {
  // Live-Kurs, sonst Ø-Kaufkurs (wie bisher im Depot)
  const preis = (h: Holding) => livePrices[h.key]?.price || h.averageKaufkurs;
  const wert = holdings.reduce((s, h) => s + h.totalShares * preis(h), 0);
  const kosten = holdings.reduce((s, h) => s + h.totalCost, 0);
  const gewinn = wert - kosten;
  const gewinnPct = kosten > 0 ? (gewinn / kosten) * 100 : 0;
  // Heute: nur Werte mit Live-Kurs und Tagesänderung; Vortag = Kurs ÷ (1 + %/100)
  let heute = 0, vortagWert = 0;
  for (const h of holdings) {
    const lp = livePrices[h.key];
    if (!lp?.price || typeof lp.changePct !== "number") continue;
    const w = h.totalShares * lp.price;
    const v = w / (1 + lp.changePct / 100);
    heute += w - v;
    vortagWert += v;
  }
  const heutePct = vortagWert > 0 ? (heute / vortagWert) * 100 : null;

  const pfeil = (v: number) => (v > 0 ? "▲" : v < 0 ? "▼" : "▶");
  const farbe = (v: number) => (v > 0 ? "text-emerald-400" : v < 0 ? "text-rose-400" : "text-slate-300");
  const vz = (v: number) => (v > 0 ? "+" : "");
  const pct = (v: number) => v.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const standText = (() => {
    if (!stand) return null;
    const t = new Date(stand);
    if (isNaN(t.getTime())) return null;
    const heuteTag = t.toDateString() === new Date().toDateString();
    return t.toLocaleString("de-AT", heuteTag ? { timeStyle: "short" } : { dateStyle: "short", timeStyle: "short" });
  })();

  return (
    <div className="bg-slate-900 text-white sm:rounded-2xl px-3 py-3 font-mono">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-wide text-slate-300 font-sans">Depotwert</div>
          <div className="text-[26px] leading-tight font-extrabold tabular-nums whitespace-nowrap">€ {formatAccounting(wert)}</div>
        </div>
        {onAktualisieren && (
          <button
            type="button"
            onClick={onAktualisieren}
            disabled={laedt}
            className={"shrink-0 flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 font-sans transition-all active:scale-95 " +
              (laedt ? "bg-white/10 text-slate-400 cursor-not-allowed" : "bg-white text-slate-900 shadow")}
            title="Kurse für Depot und Watchlist neu holen (Ampel-Werte holt der Morgen-Tab)"
          >
            <span className="flex items-center gap-1.5 text-[13px] font-extrabold">
              <RefreshCw className={"h-4 w-4 " + (laedt ? "animate-spin" : "")} />
              {laedt ? "Lade…" : "Aktualisieren"}
            </span>
            {standText && <span className={"text-[11px] font-semibold " + (laedt ? "text-slate-400" : "text-slate-600")}>Stand {standText}</span>}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-4 mt-2.5 pt-2.5 border-t border-white/15">
        <div>
          <span className="text-slate-300 text-[11px] font-bold block uppercase font-sans">Gewinn gesamt</span>
          <span className={`text-[16px] font-extrabold tabular-nums whitespace-nowrap ${farbe(gewinn)}`}>{pfeil(gewinn)} {vz(gewinn)}{formatAccounting(gewinn)} €</span>
          <span className={`block text-[13px] font-bold tabular-nums ${farbe(gewinn)}`}>{vz(gewinn)}{pct(gewinnPct)} %</span>
        </div>
        <div className="text-right">
          <span className="text-slate-300 text-[11px] font-bold block uppercase font-sans">Heute</span>
          {heutePct === null ? (
            <span className="text-slate-300 text-[13px] font-bold font-sans">— (Aktualisieren)</span>
          ) : (
            <>
              <span className={`text-[16px] font-extrabold tabular-nums whitespace-nowrap ${farbe(heute)}`}>{pfeil(heute)} {vz(heute)}{formatAccounting(heute)} €</span>
              <span className={`block text-[13px] font-bold tabular-nums ${farbe(heute)}`}>{vz(heute)}{pct(heutePct)} %</span>
            </>
          )}
        </div>
      </div>
      <div className="mt-1.5 text-[11px] font-semibold text-slate-300">
        Einstand € {formatAccounting(kosten)}
      </div>
    </div>
  );
}
