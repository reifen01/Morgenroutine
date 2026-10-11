/**
 * DEPOT-ÜBERSICHT (Dashboard)
 * ---------------------------
 * Kompakter Überblick über die aktiven Bestände – nur Darstellung, keine
 * eigene Rechenlogik für Steuer oder Lots:
 *   1. Aufteilung des Depotwerts je Aktie / Depot / Besitzer (Balken + %)
 *   2. Gewinn/Verlust je Aktie (▲ grün / ▼ rot, Balken vom Nullpunkt)
 *   3. Heute: größte Gewinner und Verlierer (aus den Live-Tagesänderungen)
 *
 * Kurs je Position wie im Depot-Kopf: Live-Kurs, sonst Ø-Kaufkurs.
 * Werte stehen immer als Text daneben – die Farbe ist nie allein die Aussage.
 */
import { useMemo, useState } from "react";
import { LivePrices } from "../types";
import { formatAccounting } from "../utils/mathUtils";

export interface DashboardHolding {
  key: string;
  name: string;
  depot: string;
  besitzerName: string;
  totalShares: number;
  totalCost: number;
  averageKaufkurs: number;
}

interface Props {
  holdings: DashboardHolding[];
  livePrices: LivePrices;
}

type Sicht = "aktie" | "depot" | "besitzer";

const MAX_ZEILEN = 8; // mehr Zeilen → Rest wird zu „Sonstige“

const pct = (v: number, nk = 1) =>
  v.toLocaleString("de-DE", { minimumFractionDigits: nk, maximumFractionDigits: nk });

export default function DepotDashboard({ holdings, livePrices }: Props) {
  const [sicht, setSicht] = useState<Sicht>("aktie");

  // Je Position: Wert, Einstand, Gewinn, Tagesänderung
  const positionen = useMemo(() => {
    return holdings.map((h) => {
      const lp = livePrices[h.key as keyof typeof livePrices];
      const kurs = lp?.price || h.averageKaufkurs;
      const wert = h.totalShares * kurs;
      const changePct = lp?.price && typeof lp.changePct === "number" ? lp.changePct : null;
      const heute = changePct === null ? null : wert - wert / (1 + changePct / 100);
      return { ...h, wert, gewinn: wert - h.totalCost, heute, changePct };
    });
  }, [holdings, livePrices]);

  const gesamt = positionen.reduce((s, p) => s + p.wert, 0);

  // 1) Aufteilung je gewählter Sicht
  const aufteilung = useMemo(() => {
    const feld = (p: (typeof positionen)[number]) =>
      sicht === "aktie" ? p.name : sicht === "depot" ? p.depot : p.besitzerName;
    const map = new Map<string, number>();
    for (const p of positionen) map.set(feld(p), (map.get(feld(p)) || 0) + p.wert);
    const sortiert = [...map.entries()].sort((a, b) => b[1] - a[1]);
    if (sortiert.length <= MAX_ZEILEN) return sortiert;
    const kopf = sortiert.slice(0, MAX_ZEILEN - 1);
    const rest = sortiert.slice(MAX_ZEILEN - 1).reduce((s, [, w]) => s + w, 0);
    return [...kopf, [`Sonstige (${sortiert.length - MAX_ZEILEN + 1})`, rest] as [string, number]];
  }, [positionen, sicht]);
  const maxAnteil = Math.max(...aufteilung.map(([, w]) => w), 1);

  // 2) Gewinn/Verlust je Aktie (über alle Depots zusammengefasst)
  const gewinnJeAktie = useMemo(() => {
    const map = new Map<string, { name: string; gewinn: number; kosten: number }>();
    for (const p of positionen) {
      const k = String(p.key).toLowerCase();
      const e = map.get(k) || { name: p.name, gewinn: 0, kosten: 0 };
      e.gewinn += p.gewinn;
      e.kosten += p.totalCost;
      map.set(k, e);
    }
    return [...map.values()].sort((a, b) => b.gewinn - a.gewinn);
  }, [positionen]);
  const maxGewinnBetrag = Math.max(...gewinnJeAktie.map((g) => Math.abs(g.gewinn)), 1);

  // 3) Heute: Gewinner und Verlierer (je Aktie zusammengefasst)
  const heuteJeAktie = useMemo(() => {
    const map = new Map<string, { name: string; heute: number; pct: number }>();
    for (const p of positionen) {
      if (p.heute === null || p.changePct === null) continue;
      const k = String(p.key).toLowerCase();
      const e = map.get(k) || { name: p.name, heute: 0, pct: p.changePct };
      e.heute += p.heute;
      map.set(k, e);
    }
    return [...map.values()].sort((a, b) => b.heute - a.heute);
  }, [positionen]);
  const gewinner = heuteJeAktie.filter((x) => x.heute > 0).slice(0, 3);
  const verlierer = heuteJeAktie.filter((x) => x.heute < 0).reverse().slice(0, 3);

  if (positionen.length === 0) return null;

  const vz = (v: number) => (v > 0 ? "+" : "");
  const farbe = (v: number) => (v > 0 ? "text-emerald-700" : v < 0 ? "text-rose-600" : "text-slate-600");
  const pfeil = (v: number) => (v > 0 ? "▲" : v < 0 ? "▼" : "▶");

  return (
    <div className="space-y-5">
      {/* ── 1. Aufteilung ── */}
      <section>
        <div className="flex items-center justify-between gap-2 mb-2">
          <h4 className="text-[13px] font-extrabold text-slate-900 uppercase tracking-wide">Aufteilung</h4>
          <div className="flex bg-white border border-slate-200 p-0.5 rounded-lg" role="tablist" aria-label="Aufteilung nach">
            {([["aktie", "Aktie"], ["depot", "Depot"], ["besitzer", "Besitzer"]] as const).map(([v, l]) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={sicht === v}
                onClick={() => setSicht(v)}
                className={`px-2.5 h-7 rounded-md text-[12px] font-bold cursor-pointer ${sicht === v ? "bg-slate-800 text-white" : "text-slate-600 hover:text-slate-900"}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          {aufteilung.map(([label, wert]) => {
            const anteil = gesamt > 0 ? (wert / gesamt) * 100 : 0;
            return (
              <div key={label}>
                <div className="flex items-baseline justify-between gap-2 text-[13px]">
                  <span className="font-semibold text-slate-800 truncate min-w-0">{label}</span>
                  <span className="font-mono tabular-nums text-slate-900 shrink-0">
                    <b>{pct(anteil)} %</b> <span className="text-slate-500">· {formatAccounting(wert)} €</span>
                  </span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                  <div className="h-full bg-sky-700 rounded-full" style={{ width: `${(wert / maxAnteil) * 100}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 2. Gewinn/Verlust je Aktie ── */}
      <section>
        <h4 className="text-[13px] font-extrabold text-slate-900 uppercase tracking-wide mb-2">Gewinn / Verlust je Aktie</h4>
        <div className="space-y-2">
          {gewinnJeAktie.map((g) => {
            const breite = (Math.abs(g.gewinn) / maxGewinnBetrag) * 50; // halbe Breite je Seite
            const prozent = g.kosten > 0 ? (g.gewinn / g.kosten) * 100 : 0;
            return (
              <div key={g.name}>
                <div className="flex items-baseline justify-between gap-2 text-[13px]">
                  <span className="font-semibold text-slate-800 truncate min-w-0">{g.name}</span>
                  <span className={`font-mono tabular-nums font-bold shrink-0 ${farbe(g.gewinn)}`}>
                    {pfeil(g.gewinn)} {vz(g.gewinn)}{formatAccounting(g.gewinn)} € <span className="font-semibold">({vz(prozent)}{pct(prozent)} %)</span>
                  </span>
                </div>
                {/* Balken vom Nullpunkt in der Mitte: rechts Gewinn, links Verlust */}
                <div className="relative h-2.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                  <div className="absolute top-0 bottom-0 left-1/2 w-px bg-slate-400" />
                  <div
                    className={`absolute top-0 bottom-0 ${g.gewinn >= 0 ? "bg-emerald-600 rounded-r-full" : "bg-rose-600 rounded-l-full"}`}
                    style={g.gewinn >= 0 ? { left: "50%", width: `${breite}%` } : { right: "50%", width: `${breite}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 3. Heute: Gewinner & Verlierer ── */}
      <section>
        <h4 className="text-[13px] font-extrabold text-slate-900 uppercase tracking-wide mb-2">Heute</h4>
        {heuteJeAktie.length === 0 ? (
          <p className="text-[13px] text-slate-500">Noch keine Tagesänderung – im Morgen-Tab „Marktwerte holen“.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {[["Gewinner", gewinner], ["Verlierer", verlierer]].map(([titel, liste]) => (
              <div key={titel as string} className="bg-slate-50 border border-slate-100 rounded-xl p-2.5">
                <div className="text-[12px] font-bold text-slate-600 uppercase mb-1">{titel as string}</div>
                {(liste as typeof heuteJeAktie).length === 0 ? (
                  <div className="text-[12px] text-slate-500">—</div>
                ) : (
                  (liste as typeof heuteJeAktie).map((x) => (
                    <div key={x.name} className="py-1 border-b border-slate-200 last:border-0">
                      <div className="text-[13px] font-semibold text-slate-800 truncate">{x.name}</div>
                      <div className={`text-[12px] font-mono font-bold tabular-nums leading-tight ${farbe(x.heute)}`}>
                        <div>{pfeil(x.heute)} {vz(x.heute)}{formatAccounting(x.heute)} €</div>
                        <div>{vz(x.pct)}{pct(x.pct, 2)} %</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
