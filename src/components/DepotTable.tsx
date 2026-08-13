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
import { formatAccounting, formatToGermanDate, KEST_SATZ, kestAuf } from "../utils/mathUtils";
import { RegisteredAsset, limitFor, resolveAssetMeta, canonicalAssetKey } from "../utils/assetRegistry";
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

  const rows = useMemo(() => {
    const enriched = holdings.map((h) => {
      const lp = getLivePrice(livePrices, canonicalAssetKey(h.key, h.name))?.price || h.averageKaufkurs;
      const mktVal = h.totalShares * lp;
      const pl = mktVal - h.totalCost;
      const plPct = h.totalCost > 0 ? (pl / h.totalCost) * 100 : 0;
      const limit = limitFor(h.key, registry);
      return { ...h, livePrice: lp, mktVal, pl, plPct, limit };
    });

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
  }, [holdings, livePrices, registry, sortField, sortAsc]);

  // Kombiniertes Steuer-Matching PRO DEPOT (österr. Verlustausgleich):
  // Beim steuereinfachen Broker werden Gewinne/Verluste automatisch nur
  // INNERHALB desselben Depots verrechnet. Depotübergreifend braucht es die
  // Verlustausgleichsbescheinigung + Steuererklärung — daher pro Depot.
  const steuerProDepot = useMemo(() => {
    const map = new Map<string, { depot: string; gewinne: number; verluste: number; netto: number; kestVorschau: number }>();
    rows.forEach((r) => {
      const d = r.depot || "—";
      if (!map.has(d)) map.set(d, { depot: d, gewinne: 0, verluste: 0, netto: 0, kestVorschau: 0 });
      const e = map.get(d)!;
      if (r.pl > 0) e.gewinne += r.pl; else e.verluste += r.pl;
    });
    const list = Array.from(map.values());
    list.forEach((e) => { e.netto = e.gewinne + e.verluste; e.kestVorschau = kestAuf(e.netto); });
    return list.sort((a, b) => a.depot.localeCompare(b.depot, "de"));
  }, [rows]);

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
      {/* ═══ Kombinierte Steuer-Übersicht PRO DEPOT (Verlustausgleich) ═══ */}
      {rows.length > 0 && (
        <div className="mb-3 space-y-2">
          {steuerProDepot.map((d) => (
            <div key={`steuer-${d.depot}`} className="bg-white border border-slate-200 rounded-xl px-3 py-2">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-extrabold text-slate-800">
                  Depot {d.depot}
                </span>
                <span className="text-[9px] font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5" title="Österreich: gleitender Durchschnittspreis. Beim Teilverkauf im Verkaufsformular wählbar (FIFO/Durchschnitt).">
                  Methode: Durchschnitt (AT)
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="flex-1 min-w-[90px]">
                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Gewinne</div>
                  <div className="text-[12px] font-mono font-bold text-emerald-600">+ € {formatAccounting(d.gewinne)}</div>
                </div>
                <div className="flex-1 min-w-[90px]">
                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Verluste</div>
                  <div className="text-[12px] font-mono font-bold text-rose-600">€ {formatAccounting(d.verluste)}</div>
                </div>
                <div className="flex-1 min-w-[90px]">
                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Netto</div>
                  <div className={`text-[12px] font-mono font-bold ${d.netto >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {d.netto >= 0 ? "+ " : ""}€ {formatAccounting(d.netto)}
                  </div>
                </div>
                <div className="flex-1 min-w-[110px] bg-slate-50 border border-slate-300 rounded-lg px-2 py-1">
                  <div className="text-[9px] font-bold text-slate-600 uppercase tracking-wide">
                    KESt-Vorschau ({(KEST_SATZ * 100).toLocaleString("de-DE")} %)
                  </div>
                  <div className="text-[12px] font-mono font-extrabold text-slate-900">− € {formatAccounting(d.kestVorschau)}</div>
                </div>
              </div>
            </div>
          ))}
          {steuerProDepot.length > 1 && (
            <div className="text-[10px] text-slate-500 font-semibold px-1">
              Summe KESt-Vorschau über alle Depots: <strong className="text-slate-800">− € {formatAccounting(gesamtKest)}</strong>
              {" "}· Depotübergreifender Verlustausgleich nur über die Steuererklärung.
            </div>
          )}
        </div>
      )}

      {/* ═══ Werkzeugleiste ═══ */}
      {rows.length > 0 && (
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-500">
            {rows.length} {rows.length === 1 ? "Position" : "Positionen"}
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

      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <table className="w-full border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-sans">
              <th className="py-2.5 px-2 w-6"></th>
              <Th f="name">Asset</Th>
              <Th f="depot">Depot</Th>
              <Th f="besitzer">Besitzer</Th>
              <Th f="shares" right>Menge</Th>
              <Th f="avg" right>Ø Kauf</Th>
              <Th f="price" right>Kurs</Th>
              <Th f="value" right>Marktwert</Th>
              <Th f="pl" right>+/- (brutto)</Th>
              <th className="py-2.5 px-3 text-center whitespace-nowrap">Limit / Signal</th>
              <th className="py-2.5 px-3 text-center whitespace-nowrap">Aktion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-slate-700 text-xs font-semibold">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-10 text-center text-slate-400 font-semibold font-sans">
                  Keine aktiven Bestände. Buche unten im Journal einen Kauf ein!
                </td>
              </tr>
            ) : (
              rows.map((r, idx) => {
                const isProfit = r.pl >= 0;
                const hasLivePrice = !!getLivePrice(livePrices, canonicalAssetKey(r.key, r.name))?.price;
                const id = rowId(r);
                const istOffen = offeneRows.has(id);
                const sd = stammdaten(r.key, r.name, { isin: r.isin, wkn: r.wkn });
                const meineKaeufe = purchases.filter(
                  (p) =>
                    String(p.key).toLowerCase() === r.key.toLowerCase() &&
                    (p.depot || "") === r.depot &&
                    (p.besitzerName || "") === r.besitzerName
                );
                const kestPos = kestAuf(r.pl);
                return (
                  <>
                  {/* ── Hauptzeile: bewusst EINZEILIG für geringe Höhe ── */}
                  <tr
                    key={`${r.key}-${r.depot}-${r.besitzerName}-${idx}`}
                    className={`transition-colors cursor-pointer ${istOffen ? "bg-slate-50" : "hover:bg-slate-50/50"}`}
                    onClick={() => toggleRow(id)}
                    title="Antippen für Kaufdaten & Steuer zu dieser Position"
                  >
                    {/* Aufklapp-Pfeil — eigene Spalte, klar sichtbar */}
                    <td className="py-2.5 pl-3 pr-1 align-middle">
                      <span
                        className={`inline-flex items-center justify-center h-5 w-5 rounded-md border transition-colors bg-white ${
                          istOffen
                            ? "border-slate-800 text-slate-900"
                            : "border-slate-300 text-slate-600"
                        }`}
                      >
                        {istOffen
                          ? <ChevronDown className="h-3.5 w-3.5" strokeWidth={3} />
                          : <ChevronRight className="h-3.5 w-3.5" strokeWidth={3} />}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="font-mono text-[10px] font-extrabold text-slate-800 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 mr-2 align-middle">
                        {r.key.toUpperCase()}
                      </span>
                      <span className="font-bold text-slate-900 align-middle">{r.name}</span>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] font-bold border border-slate-200">{r.depot}</span>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-slate-50 text-slate-900 font-mono text-[10px] font-bold border border-slate-200">{r.besitzerName}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap">{r.totalShares.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-500 whitespace-nowrap">€ {formatAccounting(r.averageKaufkurs)}</td>
                    <td className="py-2.5 px-3 text-right font-mono whitespace-nowrap">
                      € {formatAccounting(r.livePrice)}
                      {!hasLivePrice && (
                        <span className="text-amber-600 font-bold ml-0.5" title="Kein Live-Kurs — Ø-Kaufkurs eingesetzt">*</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-900 font-bold whitespace-nowrap">€ {formatAccounting(r.mktVal)}</td>
                    <td className="py-2.5 px-3 text-right font-mono whitespace-nowrap">
                      <span className={`font-bold ${isProfit ? "text-emerald-600" : "text-rose-600"}`}>
                        {isProfit ? "+" : ""}{formatAccounting(r.pl)} €
                      </span>
                      <span className={`text-[10px] font-extrabold ml-1 ${isProfit ? "text-emerald-500/90" : "text-rose-500/90"}`}>
                        ({isProfit ? "+" : ""}{r.plPct.toFixed(1)} %)
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      {r.limit <= 0 ? (
                        <span className="text-[9px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 border border-slate-200/60 rounded">— kein Limit</span>
                      ) : !hasLivePrice ? (
                        <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 border border-amber-200/60 rounded">Kurs fehlt</span>
                      ) : r.livePrice <= r.limit && marketHealth.blocked ? (
                        <span className="text-[9px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 border border-rose-200 rounded" title={marketHealth.reason}>🔴 Marktsperre</span>
                      ) : r.livePrice <= r.limit ? (
                        <span className="text-[9px] font-bold text-white bg-emerald-600 px-1.5 py-0.5 border border-emerald-600 rounded animate-pulse">✓ Kaufsignal ≤ {formatAccounting(r.limit)} €</span>
                      ) : (
                        <span className="text-[9px] font-bold text-slate-500 bg-slate-50 px-1.5 py-0.5 border border-slate-200/80 rounded">Aktiv &gt; {formatAccounting(r.limit)} €</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <button
                        onClick={(e) => { e.stopPropagation(); onExit(r, r.livePrice); }}
                        className="px-2.5 py-1 text-[10px] font-bold bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white rounded-lg border border-rose-200 transition-all cursor-pointer active:scale-95"
                        title="Verkauf für diese Position einbuchen"
                      >
                        💸 Exit
                      </button>
                    </td>
                  </tr>

                  {/* ── Aufklappbereich: Stammdaten · Steuer · Käufe ── */}
                  {istOffen && (
                    <tr key={`${id}-detail`} className="bg-slate-50/70">
                      <td colSpan={11} className="px-4 py-4 border-l-4 border-slate-800">

                        {/* Stammdaten + Steuer-Matching nebeneinander */}
                        <div className="flex flex-wrap gap-2 mb-3">
                          <div className="flex-1 min-w-[200px] bg-white rounded-xl border border-slate-200 px-3 py-2">
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Stammdaten</div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-mono text-slate-700">
                              <span>ISIN: <strong className="text-slate-900">{sd.isin || "—"}</strong></span>
                              <span>WKN: <strong className="text-slate-900">{sd.wkn || "—"}</strong></span>
                              <span>Kürzel: <strong className="text-slate-900">{r.key.toUpperCase()}</strong></span>
                            </div>
                          </div>
                          <div className="flex-1 min-w-[200px] bg-white rounded-xl border border-slate-200 px-3 py-2">
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                              Steuer-Matching (KESt {(KEST_SATZ * 100).toLocaleString("de-DE")} %)
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-mono">
                              <span className="text-slate-700">Buchergebnis:{" "}
                                <strong className={r.pl >= 0 ? "text-emerald-600" : "text-rose-600"}>
                                  {r.pl >= 0 ? "+" : ""}€ {formatAccounting(r.pl)}
                                </strong>
                              </span>
                              <span className="text-slate-700">KESt bei Verkauf:{" "}
                                <strong className="text-slate-900">− € {formatAccounting(kestPos)}</strong>
                              </span>
                              <span className="text-slate-700">Netto:{" "}
                                <strong className="text-slate-900">€ {formatAccounting(r.mktVal - kestPos)}</strong>
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-2">
                          📥 Käufe zu dieser Position ({meineKaeufe.length})
                        </div>

                        {meineKaeufe.length === 0 ? (
                          <div className="text-[11px] text-slate-500 font-semibold">
                            Keine Einzelkäufe gefunden — der Bestand stammt aus einer älteren Buchung.
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {[...meineKaeufe]
                              .sort((a, b) => String(b.kaufDatum).localeCompare(String(a.kaufDatum)))
                              .map((p) => (
                                <div
                                  key={p.id}
                                  className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-white rounded-xl border border-slate-200 px-3 py-2"
                                >
                                  <span className="font-mono text-[11px] font-bold text-slate-800 whitespace-nowrap">
                                    {formatToGermanDate(String(p.kaufDatum))}
                                  </span>
                                  <span className="font-mono text-[11px] text-slate-600 whitespace-nowrap">
                                    {Number(p.anzahlAktien).toFixed(2)} × € {formatAccounting(Number(p.kaufKurs))}
                                  </span>
                                  {Number(p.verbleibendeAnzahlAktien) !== Number(p.anzahlAktien) && (
                                    <span className="font-mono text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 whitespace-nowrap">
                                      noch {Number(p.verbleibendeAnzahlAktien).toFixed(2)}
                                    </span>
                                  )}
                                  <span className="font-mono text-[11px] font-bold text-slate-900 whitespace-nowrap">
                                    = € {formatAccounting(Number(p.tatsaechlicheKosten) || Number(p.anzahlAktien) * Number(p.kaufKurs))}
                                  </span>
                                  {p.notiz && (
                                    <span className="text-[10px] text-slate-500 font-semibold italic truncate max-w-[180px]">
                                      {p.notiz}
                                    </span>
                                  )}
                                  <span className="flex-1" />
                                  {onEditPurchase && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); onEditPurchase(p); }}
                                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                                      title="Diesen Kauf bearbeiten"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                  {onDeletePurchase && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); onDeletePurchase(p.id); }}
                                      className="p-1.5 rounded-lg text-rose-500 hover:text-white hover:bg-rose-600 transition-colors"
                                      title="Diesen Kauf löschen"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>
                              ))}
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-200">
                          <button
                            onClick={(e) => { e.stopPropagation(); onExit(r, r.livePrice); }}
                            className="px-3 py-1.5 text-[11px] font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-all active:scale-95"
                          >
                            💸 Position verkaufen
                          </button>
                          <span className="text-[10px] text-slate-500 font-semibold self-center">
                            Ø Kauf € {formatAccounting(r.averageKaufkurs)} · Einstand € {formatAccounting(r.totalCost)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}
                  </>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {rows.length > 0 && (
        <p className="mt-2 text-[10px] text-slate-400 font-semibold">
          Steuer-Matching ist eine Schätzung nach österr. KESt ({(KEST_SATZ * 100).toLocaleString("de-DE")} %) mit Verlustausgleich — keine Steuerberatung.
          {" "}Ein <span className="text-amber-600 font-bold">*</span> beim Kurs bedeutet: kein Live-Kurs, Ø-Kaufkurs eingesetzt.
        </p>
      )}
    </div>
  );
}
