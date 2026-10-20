/**
 * Kurs-Abruf für Depot, Journal-Bestände und Watchlist — EINE Stelle.
 *
 * Wird vom Morgen-Tab („Marktwerte holen", zusammen mit Ampel-Werten) und vom
 * Depot („Aktualisieren", nur Kurse) benutzt. Ampel-Werte, Distribution Days
 * und Tages-Snapshot bleiben ausschließlich im Morgen-Tab.
 */
import { LivePrices, PortfolioItem, PortfolioPurchase, WatchlistItem, emptyLivePrice } from "../types";
import { yahooCandidatesForPortfolio, yahooCandidatesForWatchlist, waehleEuroKurs, EUR_USD_SYMBOL } from "./yahooMapping";

/** Gehaltene Positionen aus dem Journal (verbleibende Stück > 0), je Key einmal. */
export function journalHoldings(purchases: PortfolioPurchase[]): { key: string; name: string }[] {
  const seen = new Map<string, string>();
  for (const p of purchases) {
    if (!(p.verbleibendeAnzahlAktien > 0)) continue;
    const k = String(p.key || "").trim().toLowerCase();
    if (k && !seen.has(k)) seen.set(k, p.name);
  }
  return Array.from(seen, ([key, name]) => ({ key, name }));
}

/** Yahoo-Symbole für Handels-Wächter, Journal-Bestände, Watchlist plus EUR/USD. */
export function depotSymbole(
  portfolioData: PortfolioItem[],
  purchases: PortfolioPurchase[],
  watchlist: WatchlistItem[],
): string[] {
  const portfolioSyms = portfolioData.flatMap(p => yahooCandidatesForPortfolio(p));
  const journalSyms = journalHoldings(purchases).flatMap(h => yahooCandidatesForPortfolio(h));
  const watchlistSyms = watchlist.flatMap(w => yahooCandidatesForWatchlist(w));
  return Array.from(new Set([EUR_USD_SYMBOL, ...portfolioSyms, ...journalSyms, ...watchlistSyms]));
}

/**
 * Antwort von /api/fetch-live-prices in Kurse und Watchlist übernehmen.
 * Kurse IMMER in Euro: aus allen Kandidaten den frischesten wählen, USD per
 * EUR/USD umrechnen — siehe waehleEuroKurs().
 */
export function kurseUebernehmen(
  prices: Record<string, any> | undefined,
  livePrices: LivePrices,
  portfolioData: PortfolioItem[],
  purchases: PortfolioPurchase[],
  watchlist: WatchlistItem[],
  routineDate: string,
): { livePrices: LivePrices; watchlist: WatchlistItem[] | null; anzahl: number } {
  let anzahl = 0;
  // Offenes Record: ALLE vorhandenen Kurse übernehmen (kein festes Set von
  // Keys — sonst verlieren neue Positionen still ihren Kurs).
  const newLive: LivePrices = {};
  for (const [k, v] of Object.entries(livePrices)) newLive[k] = { ...v };
  const eurUsdRaw = prices?.[EUR_USD_SYMBOL]?.price;
  const eurUsd = typeof eurUsdRaw === "number" && eurUsdRaw > 0.5 && eurUsdRaw < 2 ? eurUsdRaw : null;
  const firstEntryWithPrice = (candidates: string[]) => waehleEuroKurs(candidates, prices, eurUsd);

  // Handels-Wächter-Positionen UND Journal-Holdings versorgen; fehlende
  // Kurs-Einträge werden angelegt statt übersprungen.
  const zuVersorgen: { key: string; name?: string; ticker?: string }[] = [
    ...portfolioData.map(p => ({ key: String(p.key), name: p.name, ticker: p.ticker })),
    ...journalHoldings(purchases),
  ];
  const versorgt = new Set<string>();
  for (const item of zuVersorgen) {
    const key = String(item.key || "").trim().toLowerCase();
    if (!key || versorgt.has(key)) continue;
    const entry = firstEntryWithPrice(yahooCandidatesForPortfolio(item));
    if (!entry) continue;
    if (!newLive[key]) newLive[key] = emptyLivePrice(routineDate);
    newLive[key].price = entry.price;
    newLive[key].date = routineDate;
    newLive[key].quelle = entry.quelle;
    newLive[key].changePct = entry.changePct;
    if (typeof entry.atr === "number" && entry.atr > 0) {
      newLive[key].atr = entry.atr;
    }
    versorgt.add(key);
    anzahl++;
  }

  // Watchlist
  let watchlistChanged = false;
  const newWatchlist = watchlist.map(w => {
    const entry = firstEntryWithPrice(yahooCandidatesForWatchlist(w));
    if (!entry) return w;
    const next = { ...w };
    next.price = entry.price.toFixed(2);
    next.changePct = entry.changePct;
    next.quelle = entry.quelle;
    anzahl++;
    watchlistChanged = true;
    if (typeof entry.atr === "number" && entry.atr > 0) {
      next.atr = entry.atr.toFixed(2);
    }
    return next;
  });

  return { livePrices: newLive, watchlist: watchlistChanged ? newWatchlist : null, anzahl };
}

/** Nur Kurse holen (Depot „Aktualisieren") — keine Ampel-Werte, kein Snapshot. */
export async function holeDepotKurse(
  livePrices: LivePrices,
  portfolioData: PortfolioItem[],
  purchases: PortfolioPurchase[],
  watchlist: WatchlistItem[],
  routineDate: string,
): Promise<{ livePrices: LivePrices; watchlist: WatchlistItem[] | null; anzahl: number; cached: boolean }> {
  const resp = await fetch("/api/fetch-live-prices", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symbols: depotSymbole(portfolioData, purchases, watchlist) }),
  });
  if (!resp.ok) {
    const errBody = await resp.json().catch(() => ({}));
    throw new Error(errBody.error || `HTTP ${resp.status}`);
  }
  const data = await resp.json();
  const r = kurseUebernehmen(data.prices, livePrices, portfolioData, purchases, watchlist, routineDate);
  return { ...r, cached: !!data.cached };
}
