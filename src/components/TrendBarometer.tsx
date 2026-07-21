/**
 * TREND-BAROMETER
 * ---------------
 * Rein informativ — sperrt nichts und gibt nichts frei.
 * Zeigt pro Indikator, ob sich die Lage über die letzten Handelstage
 * verbessert oder verschlechtert.
 *
 * Einfache Lesart:
 *   ↗ grün  = gut         (Lage verbessert sich)
 *   → gelb  = unverändert (keine klare Richtung)
 *   ↘ rot   = schlecht    (Lage verschlechtert sich)
 *
 * Wichtig: Der Pfeil folgt der BEWERTUNG, nicht der reinen Zahl.
 * Ein fallender VIX ist gut → grüner Pfeil nach oben.
 * Ein steigender Ölpreis ist schlecht → roter Pfeil nach unten.
 */
import { TrendingUp, TrendingDown, MoveRight, CircleAlert } from "lucide-react";
import { DailySnapshot } from "../types";

export type TrendDirection = "good" | "flat" | "bad" | "none";

export interface TrendResult {
  direction: TrendDirection;
  /** Prozentuale Veränderung des Rohwerts, z. B. -8 (für Anzeige) */
  changePct: number | null;
  /** Kurze Begründung für Tooltip */
  hint: string;
}

/** Welche Kennzahl aus einem Tages-Schnappschuss, und ist Steigen schlecht? */
export type TrendKey = "vix" | "vxv" | "vvix" | "spx" | "wti" | "gas" | "dist" | "ratio";

const RISING_IS_BAD: Record<TrendKey, boolean> = {
  vix: true,    // Angst steigt = schlecht
  vxv: true,
  vvix: true,   // Vol-of-Vol steigt = schlecht
  spx: false,   // Index steigt = gut
  wti: true,    // Öl steigt = schlecht
  gas: true,    // Gas steigt = schlecht
  dist: true,   // mehr Verteilungstage = schlecht
  ratio: true,  // VIX/VXV steigt Richtung Backwardation = schlecht
};

const LABEL: Record<TrendKey, string> = {
  vix: "VIX", vxv: "VXV", vvix: "VVIX", spx: "S&P 500",
  wti: "Ölpreis", gas: "Gaspreis", dist: "Distribution Days",
  ratio: "VIX/VXV-Verhältnis",
};

function pickValue(s: DailySnapshot, key: TrendKey): number | null {
  switch (key) {
    case "vix": return s.vix;
    case "vxv": return s.vxv;
    case "vvix": return s.vvix;
    case "spx": return s.spx;
    case "wti": return s.wti;
    case "gas": return s.gas;
    case "dist": return Math.max(s.distSpx ?? 0, s.distNdx ?? 0);
    case "ratio": return s.ratio;
  }
}

function avg(list: DailySnapshot[], key: TrendKey): number | null {
  const vals = list
    .map((s) => pickValue(s, key))
    .filter((v): v is number => v !== null && v !== undefined && !isNaN(v));
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

/**
 * Trend für einen Indikator: vergleicht die letzten `window` Handelstage
 * mit den `window` Tagen davor. Schwelle für "klare Richtung": 5 %.
 */
export function computeTrend(
  history: DailySnapshot[],
  key: TrendKey,
  window = 3
): TrendResult {
  // Defensiv: nur Einträge mit gültigem Datum verwenden. Alt-Daten aus
  // früheren App-Versionen können unvollständig sein — das darf die App
  // niemals zum Absturz bringen.
  const clean = (Array.isArray(history) ? history : []).filter(
    (s): s is DailySnapshot => !!s && typeof s.date === "string" && s.date.length > 0
  );
  const sorted = [...clean].sort((a, b) => a.date.localeCompare(b.date));

  if (sorted.length < 2) {
    return { direction: "none", changePct: null, hint: "Noch zu wenig Historie — ab 2 Handelstagen mit Live-Abruf" };
  }

  const w = Math.max(1, Math.min(window, Math.floor(sorted.length / 2)));
  const recent = sorted.slice(-w);
  const previous = sorted.slice(-2 * w, -w);

  const now = avg(recent, key);
  const before = avg(previous, key);

  if (now === null || before === null) {
    return { direction: "none", changePct: null, hint: "Für diesen Wert fehlen Tagesdaten" };
  }

  // Distribution Days: absolute Differenz statt Prozent (kleine ganze Zahlen)
  if (key === "dist") {
    const diff = now - before;
    const rounded = Math.round(diff * 10) / 10;
    if (diff >= 0.5) return { direction: "bad", changePct: rounded, hint: `Distribution Days nehmen zu (+${rounded})` };
    if (diff <= -0.5) return { direction: "good", changePct: rounded, hint: `Distribution Days gehen zurück (${rounded})` };
    return { direction: "flat", changePct: rounded, hint: "Distribution Days unverändert" };
  }

  if (before === 0) {
    return { direction: "none", changePct: null, hint: "Kein Vergleichswert" };
  }

  const chg = ((now - before) / before) * 100;
  const rounded = Math.round(chg * 10) / 10;
  const risingBad = RISING_IS_BAD[key];
  const sign = rounded > 0 ? "+" : "";

  if (Math.abs(chg) < 5) {
    return { direction: "flat", changePct: rounded, hint: `${LABEL[key]} kaum verändert (${sign}${rounded} %)` };
  }

  const rising = chg > 0;
  const isGood = risingBad ? !rising : rising;

  return {
    direction: isGood ? "good" : "bad",
    changePct: rounded,
    hint: `${LABEL[key]} ${sign}${rounded} % — ${isGood ? "günstige" : "ungünstige"} Entwicklung`,
  };
}

/** Das farbige Pfeil-Icon in der Trend-Spalte */
export function TrendArrow({ result }: { result: TrendResult }) {
  const { direction, hint } = result;

  const box = "inline-flex items-center justify-center w-7 h-7 rounded-lg border";
  const styles =
    direction === "good" ? "bg-emerald-50 border-emerald-300 text-emerald-600"
    : direction === "bad" ? "bg-rose-50 border-rose-300 text-rose-600"
    : direction === "flat" ? "bg-amber-50 border-amber-300 text-amber-700"
    : "bg-slate-50 border-slate-200 text-slate-300";

  const Icon =
    direction === "good" ? TrendingUp
    : direction === "bad" ? TrendingDown
    : direction === "flat" ? MoveRight
    : CircleAlert;

  return (
    <span className={`${box} ${styles}`} title={hint}>
      <Icon className="h-4 w-4" strokeWidth={2.6} />
    </span>
  );
}

/** Formatiert einen Wert je nach Kennzahl */
function fmt(v: number | null, key: TrendKey): string {
  if (v === null || v === undefined || isNaN(v)) return "—";
  if (key === "dist") return String(Math.round(v));
  if (key === "ratio") return v.toLocaleString("de-DE", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  if (key === "spx") return v.toLocaleString("de-DE", { maximumFractionDigits: 0 });
  return v.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Aufklappbare Verlaufsliste: zeigt die zuletzt gesammelten Tageswerte
 * für einen Indikator — die Datenbasis, aus der der Pfeil entsteht.
 */
export function TrendHistory({
  history,
  trendKey,
  label,
  days = 5,
}: {
  history: DailySnapshot[];
  trendKey: TrendKey;
  label: string;
  days?: number;
}) {
  const clean = (Array.isArray(history) ? history : []).filter(
    (s): s is DailySnapshot => !!s && typeof s.date === "string" && s.date.length > 0
  );
  const sorted = [...clean].sort((a, b) => a.date.localeCompare(b.date)).slice(-days);
  const result = computeTrend(history, trendKey);

  if (sorted.length === 0) {
    return (
      <div className="text-[12px] text-slate-600 font-semibold">
        Noch keine Tageswerte gesammelt. Jeder Live-Abruf legt einen Schnappschuss an —
        nach ein paar Handelstagen erscheint hier der Verlauf.
      </div>
    );
  }

  const vals = sorted.map((s) => {
    switch (trendKey) {
      case "dist": return Math.max(s.distSpx ?? 0, s.distNdx ?? 0);
      case "ratio": return s.ratio;
      default: return (s as any)[trendKey] as number | null;
    }
  });

  const nums = vals.filter((v): v is number => v !== null && !isNaN(v));
  const min = nums.length ? Math.min(...nums) : 0;
  const max = nums.length ? Math.max(...nums) : 0;
  const span = max - min || 1;

  return (
    <div className="space-y-2">
      <div className="font-bold text-slate-900 text-xs">
        📈 {label} — letzte Handelswoche
      </div>

      {/* Balken-Verlauf */}
      <div className="flex items-end gap-1 h-20">
        {sorted.map((snap, i) => {
          const v = vals[i];
          const h = v === null || isNaN(v) ? 0 : 14 + ((v - min) / span) * 46;
          const isLast = i === sorted.length - 1;
          return (
            <div key={snap.date} className="flex-1 flex flex-col items-center justify-end gap-1 min-w-0">
              <span className="text-[11px] font-mono font-bold text-slate-600 leading-none whitespace-nowrap">
                {fmt(v, trendKey)}
              </span>
              <div
                className={`w-full rounded-t ${isLast ? "bg-slate-800" : "bg-slate-300"}`}
                style={{ height: `${h}px` }}
                title={`${snap.date}: ${fmt(v, trendKey)}`}
              />
              <span className="text-[10px] font-mono text-slate-500 leading-none whitespace-nowrap">
                {snap.date.slice(8, 10)}.{snap.date.slice(5, 7)}.
              </span>
            </div>
          );
        })}
      </div>

      <div className="text-[12px] text-slate-600 font-semibold pt-1.5 border-t border-slate-100">
        {result.hint}
        {sorted.length < 4 && (
          <span className="block mt-1 text-amber-700">
            Hinweis: erst {sorted.length} {sorted.length === 1 ? "Tag" : "Tage"} gesammelt —
            der Trend wird ab etwa 4–6 Handelstagen aussagekräftig.
          </span>
        )}
      </div>
    </div>
  );
}
