/**
 * DEPOT-TABELLE
 * -------------
 * Sortierbare Übersicht aller aktiven Bestände.
 * Eine Zeile pro Asset/Depot/Besitzer-Kombination.
 * Liest Limits & Signale aus dem zentralen Asset-Register.
 */
import { useState, useMemo } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { LivePrices } from "../types";
import { formatAccounting } from "../utils/mathUtils";
import { RegisteredAsset, limitFor } from "../utils/assetRegistry";

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
  onExit: (h: DepotHolding, livePrice: number) => void;
}

export default function DepotTable({ holdings, livePrices, registry, onExit }: DepotTableProps) {
  const [sortField, setSortField] = useState<SortField>("value");
  const [sortAsc, setSortAsc] = useState(false);

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
              return (
                <tr key={`${r.key}-${r.depot}-${r.besitzerName}-${idx}`} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-3 whitespace-nowrap">
                    <div className="font-bold text-slate-900">{r.name}</div>
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
                    ) : r.livePrice <= r.limit ? (
                      <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 border border-emerald-100/80 rounded">✓ Kauf ≤ {formatAccounting(r.limit)} €</span>
                    ) : (
                      <span className="text-[9px] font-bold text-slate-500 bg-slate-50 px-1.5 py-0.5 border border-slate-200/80 rounded">Aktiv &gt; {formatAccounting(r.limit)} €</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center whitespace-nowrap">
                    <button
                      onClick={() => onExit(r, r.livePrice)}
                      className="px-2.5 py-1 text-[10px] font-bold bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white rounded-lg border border-rose-200 transition-all cursor-pointer active:scale-95"
                      title="Verkauf für diese Position einbuchen"
                    >
                      💸 Exit
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
