/**
 * DEPOT-TABELLE
 * -------------
 * Sortierbare Übersicht aller aktiven Bestände.
 * Eine Zeile pro Asset/Depot/Besitzer-Kombination.
 * Liest Limits & Signale aus dem zentralen Asset-Register.
 */
import { useState, useMemo } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { LivePrices, PortfolioPurchase } from "../types";
import { formatAccounting, formatToGermanDate } from "../utils/mathUtils";
import { RegisteredAsset, limitFor } from "../utils/assetRegistry";
import { MarketHealth } from "../utils/marketHealth";

export interface DepotHolding {
  key: string;
  name: string;
  depot: string;
  besitzerName: string;
  totalShares: number;
  totalCost: number;
  averageKaufkurs: number;
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

export default function DepotTable({ holdings, livePrices, registry, marketHealth, onExit, purchases = [], onEditPurchase, onDeletePurchase }: DepotTableProps) {
  const [sortField, setSortField] = useState<SortField>("value");
  const [sortAsc, setSortAsc] = useState(false);
  const [offen, setOffen] = useState<string | null>(null);

  const rows = useMemo(() => {
    const enriched = holdings.map((h) => {
      const lp = livePrices[h.key as keyof LivePrices]?.price || h.averageKaufkurs;
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
      className={`py-3 px-3 cursor-pointer select-none hover:text-slate-800 transition-colors whitespace-nowrap ${right ? "text-right" : "text-left"}`}
      title="Zum Sortieren tippen"
    >
      {children} <SortIcon f={f} />
    </th>
  );

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-100">
      <table className="w-full border-collapse text-xs sm:text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-sans">
            <Th f="name">Asset</Th>
            <Th f="depot">Depot</Th>
            <Th f="besitzer">Besitzer</Th>
            <Th f="shares" right>Menge</Th>
            <Th f="avg" right>Ø Kauf</Th>
            <Th f="price" right>Kurs</Th>
            <Th f="value" right>Marktwert</Th>
            <Th f="pl" right>+/- (brutto)</Th>
            <th className="py-3 px-3 text-center whitespace-nowrap">Limit / Signal</th>
            <th className="py-3 px-3 text-center whitespace-nowrap">Aktion</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50 text-slate-700 text-xs font-semibold">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={10} className="py-10 text-center text-slate-400 font-semibold font-sans">
                Keine aktiven Bestände. Buche unten im Journal einen Kauf ein!
              </td>
            </tr>
          ) : (
            rows.map((r, idx) => {
              const isProfit = r.pl >= 0;
              const hasLivePrice = !!livePrices[r.key as keyof LivePrices]?.price;
              const rowId = `${r.key}|${r.depot}|${r.besitzerName}`;
              const istOffen = offen === rowId;
              // Käufe, die genau zu dieser Position gehören
              const meineKaeufe = purchases.filter(
                (p) =>
                  String(p.key).toLowerCase() === r.key.toLowerCase() &&
                  (p.depot || "") === r.depot &&
                  (p.besitzerName || "") === r.besitzerName
              );
              return (
                <>
                <tr
                  key={`${r.key}-${r.depot}-${r.besitzerName}-${idx}`}
                  className={`transition-colors cursor-pointer ${istOffen ? "bg-slate-50" : "hover:bg-slate-50/50"}`}
                  onClick={() => setOffen(istOffen ? null : rowId)}
                  title="Antippen für Käufe zu dieser Position"
                >
                  <td className="py-3 px-3 whitespace-nowrap">
                    <div className="font-bold text-slate-900 flex items-center gap-1">
                      {istOffen
                        ? <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        : <ChevronRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />}
                      {r.name}
                    </div>
                    <span className="inline-block px-1.5 py-0.5 rounded font-mono text-[9px] font-bold text-slate-800 bg-slate-50 uppercase mt-0.5">
                      {r.key.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] font-bold border border-slate-200">{r.depot}</span>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded bg-slate-50 text-slate-900 font-mono text-[10px] font-bold border border-slate-200">{r.besitzerName}</span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold whitespace-nowrap">{r.totalShares.toFixed(2)}</td>
                  <td className="py-3 px-3 text-right font-mono text-slate-500 whitespace-nowrap">€ {formatAccounting(r.averageKaufkurs)}</td>
                  <td className="py-3 px-3 text-right font-mono whitespace-nowrap">
                    € {formatAccounting(r.livePrice)}
                    {!hasLivePrice && (
                      <span className="block text-[8px] font-bold text-amber-600">Ø-Kurs (kein Live)</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-900 font-bold whitespace-nowrap">€ {formatAccounting(r.mktVal)}</td>
                  <td className="py-3 px-3 text-right font-mono whitespace-nowrap">
                    <span className={`block font-bold ${isProfit ? "text-emerald-600" : "text-rose-600"}`}>
                      {isProfit ? "+" : ""}{formatAccounting(r.pl)} €
                    </span>
                    <span className={`text-[9px] font-extrabold ${isProfit ? "text-emerald-500/90" : "text-rose-500/90"}`}>
                      ({isProfit ? "+" : ""}{r.plPct.toFixed(1)}%)
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center whitespace-nowrap">
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
                  <td className="py-3 px-3 text-center whitespace-nowrap">
                    <button
                      onClick={(e) => { e.stopPropagation(); onExit(r, r.livePrice); }}
                      className="px-2.5 py-1 text-[10px] font-bold bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white rounded-lg border border-rose-200 transition-all cursor-pointer active:scale-95"
                      title="Verkauf für diese Position einbuchen"
                    >
                      💸 Exit
                    </button>
                  </td>
                </tr>

                {istOffen && (
                  <tr key={`${rowId}-detail`} className="bg-slate-50/70">
                    <td colSpan={10} className="px-4 py-4 border-l-4 border-slate-800">
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
  );
}
