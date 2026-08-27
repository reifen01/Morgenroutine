/**
 * ERTRÄGNISAUFSTELLUNG (Jahresauswertung realisierter Verkäufe)
 * ------------------------------------------------------------
 * Fasst gebuchte Verkäufe (soldTrades) pro Kalenderjahr und Depot zusammen:
 * realisierter Gewinn/Verlust, davon Gewinne/Verluste, KESt und Netto.
 *
 * Datengrundlage sind die im Verkaufsformular gebuchten Trades — inklusive
 * der DORT gewählten Methode (FIFO/Durchschnitt), die je Trade gespeichert
 * ist. Der Verlustausgleich wird pro Depot gerechnet (steuereinfacher Broker),
 * nicht depotübergreifend.
 *
 * Hinweis: Schätzung/Übersicht, kein amtlicher Steuerbeleg.
 */
import { useMemo, useState } from "react";
import { FileText, ChevronDown, ChevronRight } from "lucide-react";
import HilfeLink from "./HilfeLink";
import type { SoldTradeItem } from "../types";
import { formatAccounting, istSteuereinfach } from "../utils/mathUtils";

interface Props {
  soldTrades: SoldTradeItem[];
}

interface DepotSummary {
  depot: string;
  method: string;
  anzahl: number;
  gewinne: number;   // Summe positiver Ergebnisse
  verluste: number;  // Summe negativer Ergebnisse (negativ)
  netto: number;
  kest: number;      // tatsächlich gebuchte KESt
  trades: SoldTradeItem[];
}

interface YearSummary {
  jahr: string;
  depots: DepotSummary[];
  netto: number;
  kest: number;
  anzahl: number;
}

function jahrAus(datum: string): string {
  const s = String(datum);
  // Erwartet ISO (YYYY-...) oder deutsches Format (…​.YYYY)
  const iso = s.match(/^(\d{4})/);
  if (iso) return iso[1];
  const de = s.match(/(\d{4})\s*$/);
  if (de) return de[1];
  return "ohne Datum";
}

function methodLabel(m?: string): string {
  if (m === "FIFO") return "FIFO";
  if (m === "durchschnitt") return "Durchschnitt";
  return "—";
}

export default function Ertraegnisaufstellung({ soldTrades }: Props) {
  const [offenesJahr, setOffenesJahr] = useState<string | null>(null);

  const jahre = useMemo<YearSummary[]>(() => {
    const jahrMap = new Map<string, Map<string, DepotSummary>>();

    for (const t of soldTrades) {
      const jahr = jahrAus(t.verkaufsDatum);
      const depot = t.depot || "—";
      if (!jahrMap.has(jahr)) jahrMap.set(jahr, new Map());
      const depMap = jahrMap.get(jahr)!;
      if (!depMap.has(depot)) {
        depMap.set(depot, {
          depot,
          method: methodLabel(t.taxMethod),
          anzahl: 0,
          gewinne: 0,
          verluste: 0,
          netto: 0,
          kest: 0,
          trades: [],
        });
      }
      const d = depMap.get(depot)!;
      d.anzahl += 1;
      const gv = Number(t.gewinnVerlust) || 0;
      if (gv >= 0) d.gewinne += gv; else d.verluste += gv;
      d.kest += Number(t.kestBetrag) || 0;
      d.trades.push(t);
      // Falls in einem Depot verschiedene Methoden vorkamen, kennzeichnen
      if (d.method !== methodLabel(t.taxMethod) && d.method !== "gemischt") {
        d.method = "gemischt";
      }
    }

    const result: YearSummary[] = [];
    for (const [jahr, depMap] of jahrMap) {
      const depots = Array.from(depMap.values()).map((d) => ({
        ...d,
        netto: d.gewinne + d.verluste,
      }));
      depots.sort((a, b) => a.depot.localeCompare(b.depot, "de"));
      result.push({
        jahr,
        depots,
        netto: depots.reduce((s, d) => s + d.netto, 0),
        kest: depots.reduce((s, d) => s + d.kest, 0),
        anzahl: depots.reduce((s, d) => s + d.anzahl, 0),
      });
    }
    // Neueste Jahre zuerst
    result.sort((a, b) => b.jahr.localeCompare(a.jahr));
    return result;
  }, [soldTrades]);

  if (soldTrades.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 text-center">
        <FileText className="h-6 w-6 text-slate-300 mx-auto mb-2" />
        <p className="text-[13px] font-semibold text-slate-500">
          Noch keine Verkäufe gebucht.
        </p>
        <p className="text-[11px] text-slate-400 mt-1">
          Sobald du im Journal einen Verkauf einbuchst, erscheint hier die Jahres-Erträgnisaufstellung.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-slate-700" />
        <h3 className="text-[13px] font-extrabold text-slate-800">Erträgnisaufstellung (realisiert, pro Jahr &amp; Depot)</h3>
        <HilfeLink abschnitt="steuern" titel="KESt-Regeln im Handbuch nachlesen" />
      </div>

      {jahre.map((y) => {
        const offen = offenesJahr === y.jahr;
        return (
          <div key={y.jahr} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setOffenesJahr(offen ? null : y.jahr)}
              className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 transition-colors text-left"
            >
              <span className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center h-5 w-5 rounded-md border border-slate-300 bg-white text-slate-700">
                  {offen ? <ChevronDown className="h-3.5 w-3.5" strokeWidth={3} /> : <ChevronRight className="h-3.5 w-3.5" strokeWidth={3} />}
                </span>
                <span className="text-[13px] font-extrabold text-slate-900">Jahr {y.jahr}</span>
                <span className="text-[10px] font-bold text-slate-400">({y.anzahl} {y.anzahl === 1 ? "Verkauf" : "Verkäufe"})</span>
              </span>
              <span className="flex items-center gap-3 font-mono text-[12px]">
                <span className={`font-bold ${y.netto >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {y.netto >= 0 ? "+" : ""}€ {formatAccounting(y.netto)}
                </span>
                <span className="font-bold text-slate-900">KESt − € {formatAccounting(y.kest)}</span>
              </span>
            </button>

            {offen && (
              <div className="border-t border-slate-100 divide-y divide-slate-50">
                {y.depots.map((d) => (
                  <div key={`${y.jahr}-${d.depot}`} className="px-3 py-2.5 bg-slate-50/40">
                    <div className="flex items-center justify-between mb-1.5 gap-2 flex-wrap">
                      <span className="text-[11px] font-extrabold text-slate-800">Depot {d.depot}</span>
                      <span className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[9px] font-bold text-slate-500 bg-white border border-slate-200 rounded px-1.5 py-0.5">
                          Methode: {d.method}
                        </span>
                        {!istSteuereinfach(d.depot) && (
                          <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5" title="Nicht steuereinfacher Broker: Die KESt wurde NICHT automatisch einbehalten. Dieser Gewinn ist selbst über die Steuererklärung zu erklären.">
                            ⚠ KESt selbst erklären
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-1">
                      <div className="flex-1 min-w-[80px]">
                        <div className="text-[9px] font-bold text-slate-500 uppercase">Gewinne</div>
                        <div className="text-[12px] font-mono font-bold text-emerald-600">+ € {formatAccounting(d.gewinne)}</div>
                      </div>
                      <div className="flex-1 min-w-[80px]">
                        <div className="text-[9px] font-bold text-slate-500 uppercase">Verluste</div>
                        <div className="text-[12px] font-mono font-bold text-rose-600">€ {formatAccounting(d.verluste)}</div>
                      </div>
                      <div className="flex-1 min-w-[80px]">
                        <div className="text-[9px] font-bold text-slate-500 uppercase">Netto</div>
                        <div className={`text-[12px] font-mono font-bold ${d.netto >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                          {d.netto >= 0 ? "+ " : ""}€ {formatAccounting(d.netto)}
                        </div>
                      </div>
                      <div className="flex-1 min-w-[90px] bg-white border border-slate-300 rounded-lg px-2 py-1">
                        <div className="text-[9px] font-bold text-slate-600 uppercase">KESt gebucht</div>
                        <div className="text-[12px] font-mono font-extrabold text-slate-900">− € {formatAccounting(d.kest)}</div>
                      </div>
                    </div>
                  </div>
                ))}
                {y.depots.length > 1 && (
                  <div className="px-3 py-2 text-[10px] text-slate-500 font-semibold">
                    Netto und KESt sind je Depot getrennt (steuereinfacher Broker rechnet den Verlustausgleich pro Depot).
                    Ein depotübergreifender Ausgleich läuft über die Steuererklärung.
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      <p className="text-[10px] text-slate-400 font-semibold">
        Übersicht auf Basis deiner gebuchten Verkäufe (österr. KESt 27,5 %, Methode je Verkauf gespeichert) — Schätzung, kein amtlicher Steuerbeleg.
      </p>
    </div>
  );
}
