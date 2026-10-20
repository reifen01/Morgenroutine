/**
 * DEPOT-TABELLE
 * -------------
 * Sortierbare Übersicht aller aktiven Bestände.
 * Eine Zeile pro Asset/Depot/Besitzer-Kombination.
 * Liest Limits & Signale aus dem zentralen Asset-Register.
 *
 * Layout-Umbau 07/2026:
 *  - Kompakte, EINZEILIGE Hauptzeilen (geringere Zeilenhöhe, tabellarischer)
 *  - Deutlich sichtbarer Aufklapp-Pfeil
 *  - "Alle aufklappen"-Schalter; mehrere Positionen gleichzeitig offen
 *  - Aufklappbereich zeigt Stammdaten (ISIN/WKN), Kaufdaten und ein
 *    Steuer-Matching (österr. KESt-Vorschau je Position)
 *  - Kombinierte Steuer-Übersicht (Verlustausgleich) über der Tabelle
 */
import { useState, useMemo } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, ChevronRight, Pencil, Trash2, ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import { LivePrices, PortfolioPurchase, getLivePrice } from "../types";
import { formatAccounting, formatToGermanDate, KEST_SATZ, kestAuf, istSteuereinfach } from "../utils/mathUtils";
import { RegisteredAsset, limitFor, resolveAssetMeta, canonicalAssetKey } from "../utils/assetRegistry";
import HilfeLink from "./HilfeLink";
import { yahooTickerForPortfolio } from "../utils/yahooMapping";
import { MarketHealth } from "../utils/marketHealth";

export interface DepotHolding {
  key: string;
  name: string;
  depot: string;
  besitzerName: string;
  totalShares: number;
  totalCost: number;
  averageKaufkurs: number;
  isin?: string;
  wkn?: string;
}

/** Ein Depot-Anteil einer zusammengefassten Position (Gesamt-Ansicht). */
interface Teil extends DepotHolding {
  livePrice: number;
  mktVal: number;
  pl: number;
  plPct: number;
}

type SortField =
  | "name" | "depot" | "besitzer" | "shares"
  | "avg" | "price" | "value" | "pl";

interface DepotTableProps {
  holdings: DepotHolding[];
  livePrices: LivePrices;
  registry: Map<string, RegisteredAsset>;
  marketHealth: MarketHealth;
  onExit: (h: DepotHolding, livePrice: number) => void;
  /** Alle Käufe — für die Detailansicht je Position */
  purchases?: PortfolioPurchase[];
  onEditPurchase?: (p: PortfolioPurchase) => void;
  onDeletePurchase?: (id: string) => void;
}

/**
 * ISIN/WKN eines Assets auflösen: exakter Key → bekannte Aliase
 * (Alt-Positionen mit frei getipptem Kürzel) → Namens-Teiltreffer.
 * `override` gewinnt immer, falls die Position eigene Werte trägt.
 */
function stammdaten(key: string, name: string, override?: { isin?: string; wkn?: string }) {
  const meta = resolveAssetMeta(key, name);
  return {
    isin: override?.isin || meta?.isin || "",
    wkn: override?.wkn || meta?.wkn || "",
  };
}

export default function DepotTable({ holdings, livePrices, registry, marketHealth, onExit, purchases = [], onEditPurchase, onDeletePurchase }: DepotTableProps) {
  const [sortField, setSortField] = useState<SortField>("value");
  const [sortAsc, setSortAsc] = useState(false);
  // Mehrere Positionen können gleichzeitig offen sein (früher nur eine).
  const [offeneRows, setOffeneRows] = useState<Set<string>>(new Set());

  // „Je Depot" = eine Zeile je Aktie/Depot/Besitzer; „Gesamt" = gleiche Aktie
  // über alle Depots zu einer Zeile zusammengefasst (Stück, Ø-Kurs, Wert, Gewinn).
  const [gesamt, setGesamt] = useState(false);

  // Je Depot angereichert — Grundlage für beide Ansichten und für die Steuer pro Depot
  const proDepot = useMemo(() => holdings.map((h) => {
    const lp = getLivePrice(livePrices, canonicalAssetKey(h.key, h.name))?.price || h.averageKaufkurs;
    const mktVal = h.totalShares * lp;
    const pl = mktVal - h.totalCost;
    const plPct = h.totalCost > 0 ? (pl / h.totalCost) * 100 : 0;
    const limit = limitFor(h.key, registry);
    return { ...h, livePrice: lp, mktVal, pl, plPct, limit, teile: [] as Teil[] };
  }), [holdings, livePrices, registry]);

  const rows = useMemo(() => {
    let liste = proDepot;
    if (gesamt) {
      const map = new Map<string, (typeof proDepot)[number]>();
      for (const r of proDepot) {
        const k = canonicalAssetKey(r.key, r.name);
        const e = map.get(k);
        if (!e) { map.set(k, { ...r, teile: [r] }); continue; }
        e.totalShares += r.totalShares;
        e.totalCost += r.totalCost;
        e.mktVal += r.mktVal;
        e.teile.push(r);
      }
      liste = Array.from(map.values()).map((e) => {
        if (e.teile.length < 2) return { ...e, teile: [] };
        const depots = Array.from(new Set(e.teile.map((t) => t.depot)));
        const besitzer = Array.from(new Set(e.teile.map((t) => t.besitzerName)));
        const pl = e.mktVal - e.totalCost;
        return {
          ...e,
          depot: depots.length === 1 ? depots[0] : `${depots.length} Depots`,
          besitzerName: besitzer.join(", "),
          averageKaufkurs: e.totalShares > 0 ? e.totalCost / e.totalShares : 0,
          pl,
          plPct: e.totalCost > 0 ? (pl / e.totalCost) * 100 : 0,
        };
      });
    }

    const enriched = [...liste];
    const dir = sortAsc ? 1 : -1;
    enriched.sort((a, b) => {
      switch (sortField) {
        case "name":     return dir * a.name.localeCompare(b.name, "de");
        case "depot":    return dir * a.depot.localeCompare(b.depot, "de");
        case "besitzer": return dir * a.besitzerName.localeCompare(b.besitzerName, "de");
        case "shares":   return dir * (a.totalShares - b.totalShares);
        case "avg":      return dir * (a.averageKaufkurs - b.averageKaufkurs);
        case "price":    return dir * (a.livePrice - b.livePrice);
        case "pl":       return dir * (a.pl - b.pl);
        case "value":
        default:         return dir * (a.mktVal - b.mktVal);
      }
    });
    return enriched;
  }, [proDepot, gesamt, sortField, sortAsc]);

  // Kombiniertes Steuer-Matching PRO DEPOT (österr. Verlustausgleich):
  // Beim steuereinfachen Broker werden Gewinne/Verluste automatisch nur
  // INNERHALB desselben Depots verrechnet. Depotübergreifend braucht es die
  // Verlustausgleichsbescheinigung + Steuererklärung — daher pro Depot,
  // auch in der Gesamt-Ansicht.
  const steuerProDepot = useMemo(() => {
    const map = new Map<string, { depot: string; gewinne: number; verluste: number; netto: number; kestVorschau: number }>();
    proDepot.forEach((r) => {
      const d = r.depot || "—";
      if (!map.has(d)) map.set(d, { depot: d, gewinne: 0, verluste: 0, netto: 0, kestVorschau: 0 });
      const e = map.get(d)!;
      if (r.pl > 0) e.gewinne += r.pl; else e.verluste += r.pl;
    });
    const list = Array.from(map.values());
    list.forEach((e) => { e.netto = e.gewinne + e.verluste; e.kestVorschau = kestAuf(e.netto); });
    return list.sort((a, b) => a.depot.localeCompare(b.depot, "de"));
  }, [proDepot]);

  const gesamtKest = steuerProDepot.reduce((s, d) => s + d.kestVorschau, 0);

  const rowId = (r: { key: string; depot: string; besitzerName: string }) =>
    `${r.key}|${r.depot}|${r.besitzerName}`;

  const alleIds = rows.map(rowId);
  const alleOffen = alleIds.length > 0 && alleIds.every((id) => offeneRows.has(id));

  const toggleRow = (id: string) =>
    setOffeneRows((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleAlle = () =>
    setOffeneRows(alleOffen ? new Set() : new Set(alleIds));

  const toggleSort = (f: SortField) => {
    if (sortField === f) setSortAsc(!sortAsc);
    else { setSortField(f); setSortAsc(f === "name" || f === "depot" || f === "besitzer"); }
  };

  const SortIcon = ({ f }: { f: SortField }) =>
    sortField !== f
      ? <ArrowUpDown className="inline w-3 h-3 opacity-40" />
      : sortAsc
        ? <ArrowUp className="inline w-3 h-3 text-slate-700" />
        : <ArrowDown className="inline w-3 h-3 text-slate-700" />;

  const Th = ({ f, right, children }: { f: SortField; right?: boolean; children: React.ReactNode }) => (
    <th
      onClick={() => toggleSort(f)}
      className={`py-2.5 px-3 cursor-pointer select-none hover:text-slate-800 transition-colors whitespace-nowrap ${right ? "text-right" : "text-left"}`}
      title="Zum Sortieren tippen"
    >
      {children} <SortIcon f={f} />
    </th>
  );

  return (
    <div>
      {/* ═══ Kombinierte Steuer-Übersicht PRO DEPOT (Verlustausgleich) ═══
          Jedes Depot ist ein eigener Block mit dunkler Kopfzeile, damit die
          Grenzen klar sind. Gewinne/Verluste = NICHT realisierte Kursgewinne
          bzw. -verluste der Bestände; die Steuer steht nur in „KESt-Vorschau". */}
      {rows.length > 0 && (
        <div className="mb-5 space-y-4">
          <div className="px-1">
            <div className="text-[13px] font-extrabold text-slate-900 uppercase tracking-wide">
              🧾 Steuer-Vorschau je Depot
              <HilfeLink abschnitt="steuern" titel="KESt, Verlustausgleich und Berechnungsmethode nachlesen" />
            </div>
            <div className="text-[11px] font-semibold text-slate-600">
              Unrealisierte (noch nicht verkaufte) Gewinne und Verluste der Bestände · KESt erst bei Verkauf
            </div>
          </div>
          {steuerProDepot.map((d) => (
            <div key={`steuer-${d.depot}`} className="border-2 border-slate-300 rounded-2xl overflow-hidden bg-white shadow-sm">
              <div className="bg-slate-800 text-white px-3 py-2 flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[14px] font-extrabold uppercase tracking-wide">🏦 {d.depot}</span>
                <span className="text-[11px] font-bold bg-white/15 rounded px-1.5 py-0.5" title="Österreich: gleitender Durchschnittspreis. Beim Teilverkauf im Verkaufsformular wählbar (FIFO/Durchschnitt).">
                  Ø-Methode (AT)
                </span>
              </div>
              {!istSteuereinfach(d.depot) && (
                <div className="px-3 py-1.5 text-[11px] font-bold text-amber-800 bg-amber-50 border-b border-amber-200" title="Dieser Broker behält die KESt nicht automatisch ein. Der Gewinn muss selbst über die Steuererklärung erklärt und die KESt abgeführt werden.">
                  ⚠ nicht steuereinfach · KESt bei Verkauf selbst erklären
                </div>
              )}
              <div className="divide-y divide-slate-100 font-mono">
                <div className="flex items-baseline justify-between px-3 py-1.5">
                  <span className="text-[12px] font-bold text-slate-600 font-sans">Unrealisierte Gewinne</span>
                  <span className="text-[14px] font-bold text-emerald-600 tabular-nums">+ € {formatAccounting(d.gewinne)}</span>
                </div>
                <div className="flex items-baseline justify-between px-3 py-1.5">
                  <span className="text-[12px] font-bold text-slate-600 font-sans">Unrealisierte Verluste <span className="font-semibold text-slate-500">(keine Steuer)</span></span>
                  <span className="text-[14px] font-bold text-rose-600 tabular-nums">€ {formatAccounting(d.verluste)}</span>
                </div>
                <div className="flex items-baseline justify-between px-3 py-1.5">
                  <span className="text-[12px] font-extrabold text-slate-800 font-sans">Netto (Gewinne − Verluste)</span>
                  <span className={`text-[14px] font-extrabold tabular-nums ${d.netto >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {d.netto >= 0 ? "+ " : ""}€ {formatAccounting(d.netto)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between px-3 py-2 bg-slate-100">
                  <span className="text-[12px] font-extrabold text-slate-900 font-sans">
                    🧾 KESt-Vorschau ({(KEST_SATZ * 100).toLocaleString("de-DE")} %)
                  </span>
                  <span className="text-[15px] font-extrabold text-slate-900 tabular-nums">− € {formatAccounting(d.kestVorschau)}</span>
                </div>
              </div>
            </div>
          ))}
          {steuerProDepot.length > 1 && (
            <div className="flex items-baseline justify-between gap-2 border-2 border-slate-800 rounded-2xl px-3 py-2 bg-white">
              <span className="text-[12px] font-extrabold text-slate-900 uppercase">Σ KESt-Vorschau alle Depots</span>
              <span className="font-mono text-[15px] font-extrabold text-slate-900 tabular-nums">− € {formatAccounting(gesamtKest)}</span>
            </div>
          )}
          {steuerProDepot.length > 1 && (
            <div className="text-[11px] text-slate-600 font-semibold px-1 -mt-2">
              Depotübergreifender Verlustausgleich nur über die Steuererklärung.
            </div>
          )}
          <div className="pt-1 border-t-2 border-slate-800">
            <div className="px-1 pt-3 text-[13px] font-extrabold text-slate-900 uppercase tracking-wide">📋 Positionen</div>
          </div>
        </div>
      )}

      {/* ═══ Werkzeugleiste ═══ */}
      {rows.length > 0 && (
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span className="inline-flex rounded-lg border border-slate-300 overflow-hidden" role="group" aria-label="Ansicht">
              <button
                onClick={() => setGesamt(false)}
                className={"px-2.5 py-1 text-[12px] font-bold transition-colors " + (!gesamt ? "bg-slate-800 text-white" : "bg-white text-slate-700")}
                title="Eine Zeile je Aktie, Depot und Besitzer"
              >Je Depot</button>
              <button
                onClick={() => setGesamt(true)}
                className={"px-2.5 py-1 text-[12px] font-bold transition-colors border-l border-slate-300 " + (gesamt ? "bg-slate-800 text-white" : "bg-white text-slate-700")}
                title="Gleiche Aktie über alle Depots zu einer Zeile zusammenfassen"
              >Gesamt</button>
            </span>
            <span className="text-[11px] font-semibold text-slate-500">
              {rows.length} Pos.
            </span>
          </span>
          <button
            onClick={toggleAlle}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors active:scale-95"
            title={alleOffen ? "Alle Positionen zuklappen" : "Alle Positionen aufklappen (mit Kaufdaten & Steuer)"}
          >
            {alleOffen
              ? <><ChevronsDownUp className="h-3.5 w-3.5" /> Alle zuklappen</>
              : <><ChevronsUpDown className="h-3.5 w-3.5" /> Alle aufklappen</>}
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          HANDY-ANSICHT (< 640px) — TradingView-Stil, 3 Zeilen je Position.
          Die 11-spaltige Tabelle darunter erzwang seitwärts scrollen;
          hier passt alles in die Breite.
          ═══════════════════════════════════════════════════════════ */}
      {/* Zeilen-Liste (Vorbild TradingView-Watchlist) auf allen Bildschirmgrößen — kein Querscrollen */}
      <div className="divide-y divide-slate-200 border-t border-b border-slate-200 bg-white">
        {rows.length === 0 ? (
          <div className="py-10 text-center text-slate-400 font-semibold text-[13px] bg-white border border-slate-100 rounded-xl">
            Keine aktiven Bestände. Buche unten im Journal einen Kauf ein!
          </div>
        ) : (
          rows.map((r, idx) => {
            const isProfit = r.pl >= 0;
            const ck = canonicalAssetKey(r.key, r.name);
            const hasLivePrice = !!getLivePrice(livePrices, ck)?.price;
            const id = rowId(r);
            const istOffen = offeneRows.has(id);
            const sd = stammdaten(r.key, r.name, { isin: r.isin, wkn: r.wkn });
            const zusammen = r.teile.length > 1;
            const meineKaeufe = purchases.filter(
              (p) =>
                (zusammen ? r.teile : [r]).some((t) =>
                  String(p.key).toLowerCase() === t.key.toLowerCase() &&
                  (p.depot || "") === t.depot &&
                  (p.besitzerName || "") === t.besitzerName
                )
            );
            const kestPos = kestAuf(r.pl);

            return (
              <div
                key={`m-${r.key}-${r.depot}-${r.besitzerName}-${idx}`}
                className={`bg-white overflow-hidden ${istOffen ? "border-l-4 border-l-slate-800" : ""}`}
              >
                <button
                  onClick={() => toggleRow(id)}
                  className="w-full px-1.5 py-2.5 text-left active:bg-slate-50 transition-colors"
                >
                  {/* Zeile 1: Kürzel + Name  |  Kurs */}
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="flex items-baseline gap-1.5 min-w-0">
                      <span className="font-mono text-[11px] font-extrabold text-slate-800 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 shrink-0">
                        {ck.toUpperCase()}
                      </span>
                      <span className="text-[15px] font-extrabold text-slate-900 truncate">{r.name}</span>
                    </span>
                    <span className="font-mono text-[17px] font-extrabold text-slate-900 whitespace-nowrap shrink-0">
                      {formatAccounting(r.livePrice)}
                      {!hasLivePrice && <span className="text-amber-600 ml-0.5" title="Kein Live-Kurs — der Ø-Kaufkurs wird als Kurs eingesetzt">*</span>}
                      {hasLivePrice && typeof getLivePrice(livePrices, ck)?.changePct === "number" && (() => {
                        const c = getLivePrice(livePrices, ck)!.changePct as number;
                        // Absolute Änderung aus Kurs und %: Vortagesschluss = heute ÷ (1 + %/100)
                        const abs = r.livePrice - r.livePrice / (1 + c / 100);
                        const vz = c > 0 ? "+" : "";
                        return (
                          <span className={"flex items-center justify-end gap-2 text-[11px] font-bold tabular-nums leading-none mt-0.5 " + (c > 0 ? "text-emerald-600" : c < 0 ? "text-rose-600" : "text-slate-500")}
                            title="Veränderung seit Vortagesschluss">
                            <span>{vz}{formatAccounting(abs)}</span>
                            <span>{vz}{c.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %</span>
                          </span>
                        );
                      })()}
                    </span>
                  </div>

                  {/* Zeile 2: Depot · Besitzer  |  Gewinn/Verlust */}
                  <div className="flex items-baseline justify-between gap-2 mt-1">
                    <span className="text-[11px] font-bold text-slate-500 truncate">
                      {r.depot} · {r.besitzerName}
                    </span>
                    <span className={`font-mono text-[12px] font-extrabold whitespace-nowrap shrink-0 ${isProfit ? "text-emerald-600" : "text-rose-600"}`}>
                      {isProfit ? "+" : ""}{formatAccounting(r.pl)} € ({isProfit ? "+" : ""}{r.plPct.toFixed(1)} %)
                    </span>
                  </div>

                  {/* Zeile 3: Menge × Ø  |  Marktwert */}
                  <div className="flex items-baseline justify-between gap-2 mt-0.5">
                    <span className="font-mono text-[11px] text-slate-500 truncate">
                      {r.totalShares.toFixed(2)} × Ø {formatAccounting(r.averageKaufkurs)}
                    </span>
                    <span className="font-mono text-[12px] font-bold text-slate-700 whitespace-nowrap shrink-0">
                      = € {formatAccounting(r.mktVal)}
                    </span>
                  </div>

                  {/* Signal-Zeile nur wenn relevant */}
                  {(r.limit > 0 || !hasLivePrice) && (
                    <div className="mt-1.5">
                      {!hasLivePrice ? (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 border border-amber-200 rounded">
                          * Kein Live-Kurs — Ø-Kaufkurs eingesetzt. Morgen-Tab → „Marktwerte holen"; bleibt es, aufklappen und Kurs-Symbol prüfen.
                        </span>
                      ) : r.livePrice <= r.limit && marketHealth.blocked ? (
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 border border-rose-200 rounded">
                          🔴 Marktsperre
                        </span>
                      ) : r.livePrice <= r.limit ? (
                        <span className="text-[10px] font-bold text-white bg-emerald-600 px-1.5 py-0.5 rounded animate-pulse">
                          ✓ Kaufsignal ≤ {formatAccounting(r.limit)} €
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-1.5 py-0.5 border border-slate-200 rounded">
                          Aktiv &gt; {formatAccounting(r.limit)} €
                        </span>
                      )}
                    </div>
                  )}
                </button>

                {/* Aufgeklappt: Stammdaten, Steuer, Käufe */}
                {istOffen && (
                  <div className="border-t border-slate-100 px-3 py-3 space-y-2.5 bg-slate-50/60">
                    <div className="bg-white rounded-lg border border-slate-200 px-2.5 py-2">
                      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">Stammdaten</div>
                      <div className="font-mono text-[11px] text-slate-700 space-y-0.5">
                        <div>ISIN: <strong className="text-slate-900">{sd.isin || "—"}</strong></div>
                        <div>WKN: <strong className="text-slate-900">{sd.wkn || "—"}</strong></div>
                        <div>
                          Kurs-Symbol: <strong className="text-slate-900">{yahooTickerForPortfolio({ key: ck, name: r.name }) || "—"}</strong>
                          {!hasLivePrice && (
                            <span className="text-amber-700 font-bold"> · liefert derzeit keinen Kurs</span>
                          )}
                        </div>
                        {hasLivePrice && getLivePrice(livePrices, ck)?.quelle && (
                          <div>Kurs-Quelle: <strong className="text-slate-900">{getLivePrice(livePrices, ck)?.quelle}</strong></div>
                        )}
                      </div>
                    </div>

                    <div className="bg-white rounded-lg border border-slate-200 px-2.5 py-2">
                      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                        Steuer-Matching (KESt {(KEST_SATZ * 100).toLocaleString("de-DE")} %)
                        <HilfeLink abschnitt="steuern" titel="KESt und Verlustausgleich nachlesen" />
                      </div>
                      <div className="font-mono text-[11px] space-y-0.5">
                        <div className="text-slate-700">
                          Buchergebnis: <strong className={r.pl >= 0 ? "text-emerald-600" : "text-rose-600"}>
                            {r.pl >= 0 ? "+" : ""}€ {formatAccounting(r.pl)}
                          </strong>
                        </div>
                        <div className="text-slate-700">KESt bei Verkauf: <strong className="text-slate-900">− € {formatAccounting(kestPos)}</strong></div>
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                        📥 Käufe ({meineKaeufe.length})
                      </div>
                      {meineKaeufe.length === 0 ? (
                        <div className="text-[11px] text-slate-500 font-semibold">Keine Einzelkäufe gefunden.</div>
                      ) : (
                        <div className="space-y-1">
                          {[...meineKaeufe]
                            .sort((a, b) => String(b.kaufDatum).localeCompare(String(a.kaufDatum)))
                            .map((p) => (
                              <div key={p.id} className="bg-white rounded-lg border border-slate-200 px-2.5 py-1.5 flex items-center gap-2">
                                <span className="font-mono text-[11px] flex-1 min-w-0">
                                  <span className="font-bold text-slate-800">{formatToGermanDate(String(p.kaufDatum))}</span>
                                  <span className="text-slate-600"> · {Number(p.anzahlAktien).toFixed(2)} × {formatAccounting(Number(p.kaufKurs))}</span>
                                  {zusammen && <span className="block text-slate-500">{p.depot} · {p.besitzerName}</span>}
                                </span>
                                {onEditPurchase && (
                                  <button onClick={(e) => { e.stopPropagation(); onEditPurchase(p); }} className="p-1 text-slate-500" title="Kauf bearbeiten">
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                )}
                                {onDeletePurchase && (
                                  <button onClick={(e) => { e.stopPropagation(); onDeletePurchase(p.id); }} className="p-1 text-rose-500" title="Kauf löschen">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            ))}
                        </div>
                      )}
                    </div>

{zusammen ? (
                      <div className="bg-white rounded-lg border border-slate-200 px-2.5 py-2">
                        <div className="text-[10px] font-bold text-slate-700 uppercase tracking-wide mb-1.5">Aufteilung je Depot</div>
                        <div className="divide-y divide-slate-100">
                          {r.teile.map((t) => (
                            <div key={`${t.depot}|${t.besitzerName}`} className="py-1.5 flex items-center gap-2">
                              <span className="flex-1 min-w-0 font-mono text-[11px]">
                                <span className="font-bold text-slate-800 block truncate">{t.depot} · {t.besitzerName}</span>
                                <span className="text-slate-600">{t.totalShares.toFixed(2)} Stk. · € {formatAccounting(t.mktVal)} · </span>
                                <span className={t.pl >= 0 ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>{t.pl >= 0 ? "+" : ""}{formatAccounting(t.pl)} €</span>
                              </span>
                              <button
                                onClick={(e) => { e.stopPropagation(); onExit(t, t.livePrice); }}
                                className="shrink-0 px-2.5 py-1.5 text-[11px] font-bold bg-rose-600 text-white rounded-lg active:scale-95 transition-transform"
                              >
                                💸 Verkaufen
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); onExit(r, r.livePrice); }}
                      className="w-full py-2 text-[12px] font-bold bg-rose-600 text-white rounded-lg active:scale-95 transition-transform"
                    >
                      💸 Position verkaufen
                    </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ═══ TABELLE — ab 640px Breite ═══ */}

      {rows.length > 0 && (
        <p className="mt-2 text-[10px] text-slate-400 font-semibold">
          Steuer-Matching ist eine Schätzung nach österr. KESt ({(KEST_SATZ * 100).toLocaleString("de-DE")} %) mit Verlustausgleich — keine Steuerberatung.
          {" "}<span className="text-amber-600 font-bold">*</span> beim Kurs = kein Live-Kurs, Ø-Kaufkurs eingesetzt (Erklärung steht in der Karte).
        </p>
      )}
    </div>
  );
}
