/**
 * Yahoo Finance symbol mapping and helpers.
 * Shared by frontend (symbol collection) and backend (Yahoo API calls).
 */

import type { WatchlistItem } from "../types";
import { canonicalAssetKey } from "./assetRegistry";

// Fixed market regime indicators
export const MARKET_SYMBOLS = {
  vix: "^VIX",
  vxv: "^VIX3M",
  vvix: "^VVIX",
  spx: "^GSPC",
  wti: "CL=F",
  gas: "NG=F",
} as const;

export type MarketKey = keyof typeof MARKET_SYMBOLS;

// Reverse map: Yahoo symbol -> internal key
export const YAHOO_TO_MARKET_KEY: Record<string, MarketKey> = Object.entries(MARKET_SYMBOLS)
  .reduce((acc, [k, v]) => ({ ...acc, [v]: k as MarketKey }), {} as Record<string, MarketKey>);

// Yahoo periodically rate-limits or refuses the bare ^GSPC index quote.
// SPY tracks the S&P 500 at a ~1:10 ratio, so multiplying SPY by 10 gives a
// practical SPX surrogate when ^GSPC is unavailable. Symbol is always fetched
// alongside the primary; resolution happens client-side.
export const SPX_SURROGATE_SYMBOL = "SPY";
export const SPX_SURROGATE_MULTIPLIER = 10;

// Known portfolio key -> primary Yahoo ticker (Tradegate / XETRA EUR-listings preferred).
// BABA.F (Frankfurt) is more reliable on Yahoo than BABA.DE which sometimes
// returns no data — see FALLBACKS below.
// Diese Tabelle ist eine OPTIMIERUNG, keine Zugangsberechtigung: Sie liefert
// bevorzugt die EUR-Notierung. Fehlt ein Key hier, greift der generische
// Fallback in yahooTickerForPortfolio() (Ticker → Key in Großbuchstaben).
const KEY_TO_YAHOO: Record<string, string> = {
  tsla: "TL0.F",
  now: "4S0.F",
  baba: "BABA.F",
  btc: "BTC-EUR",
  nflx: "NFC.F",
};

// Ticker shorthand -> Yahoo ticker (handles German Tradegate symbols)
const TICKER_TO_YAHOO: Record<string, string> = {
  TSLA: "TL0.F",
  TL0: "TL0.F",
  TLO: "TL0.F",
  NOW: "4S0.F",
  "4S0": "4S0.F",
  "4S0L": "4S0.F",
  BABA: "BABA.F",
  AHLA: "BABA.F",
  BTC: "BTC-EUR",
  BTCEUR: "BTC-EUR",
  "BTC-EUR": "BTC-EUR",
  NFLX: "NFC.F",
  NFC: "NFC.F",
  NETFLIX: "NFC.F",
};

// Fallback candidates per primary ticker. Yahoo periodically drops a specific
// German listing without notice. We send all candidates and the response
// resolver in MorgenroutineTab picks the first one that returned a price.
const FALLBACKS: Record<string, string[]> = {
  "TL0.F": ["TL0.F", "TL0.DE"],
  "4S0.F": ["4S0.F", "4S0.DE"],
  "BABA.F": ["BABA.F", "BABA.DE", "BABA.MU", "BABA.SG"],
  "BTC-EUR": ["BTC-EUR"],
  "NFC.F": ["NFC.F", "NFC.DE", "NFLX"],
};

/**
 * Convert a portfolio item to a Yahoo Finance ticker.
 * Tries: explicit ticker mapping → key mapping → fall back to raw ticker.
 */
/** Minimales Objekt, das zur Ticker-Auflösung reicht (Depot-Item ODER Kauf-Holding). */
export interface TickerResolvable {
  key?: string;
  ticker?: string;
  name?: string;
}

export function yahooTickerForPortfolio(item: TickerResolvable): string | null {
  if (item.ticker) {
    const upper = item.ticker.toUpperCase();
    if (TICKER_TO_YAHOO[upper]) return TICKER_TO_YAHOO[upper];
    // Already-Yahoo-looking ticker (contains dot or dash) → take as-is
    if (upper.includes(".") || upper.includes("-")) return upper;
  }
  // Key kanonisch normalisieren: "netflix" → "nflx", damit KEY_TO_YAHOO greift.
  // Genau hier scheiterte der Netflix-Kurs, wenn die Position unter einem frei
  // getippten Kürzel lief.
  const key = canonicalAssetKey(item.key, item.name);
  if (key && KEY_TO_YAHOO[key]) return KEY_TO_YAHOO[key];
  if (item.ticker) return item.ticker.toUpperCase();
  // Generischer Fallback: Der Key selbst ist bei US-Titeln fast immer schon
  // ein gültiges Yahoo-Symbol (nflx → NFLX). Vor dem Umbau wurde hier `null`
  // zurückgegeben — der Kurs fiel dadurch komplett aus.
  return key ? key.toUpperCase() : null;
}

/**
 * Convert a watchlist item to a Yahoo Finance ticker.
 */
export function yahooTickerForWatchlist(item: WatchlistItem): string | null {
  if (!item.symbol) return null;
  const upper = item.symbol.toUpperCase();
  if (TICKER_TO_YAHOO[upper]) return TICKER_TO_YAHOO[upper];
  if (upper.includes(".") || upper.includes("-")) return upper;
  return upper;
}

/**
 * Return all Yahoo candidate tickers to try for a portfolio item.
 * First entry is the preferred one; subsequent entries are fallbacks
 * used if Yahoo returns no data for the primary.
 */
export function yahooCandidatesForPortfolio(item: TickerResolvable): string[] {
  const primary = yahooTickerForPortfolio(item);
  if (!primary) return [];
  return FALLBACKS[primary] || [primary];
}

/**
 * Same as yahooCandidatesForPortfolio but for watchlist items.
 */
export function yahooCandidatesForWatchlist(item: WatchlistItem): string[] {
  const primary = yahooTickerForWatchlist(item);
  if (!primary) return [];
  return FALLBACKS[primary] || [primary];
}

/**
 * Compute 14-day ATR (Average True Range) from OHLC bars.
 * bars: array sorted oldest -> newest.
 */
export function computeATR(
  bars: { high: number; low: number; close: number }[],
  period = 14
): number | null {
  if (!bars || bars.length < period + 1) return null;
  const slice = bars.slice(-period - 1);
  const trs: number[] = [];
  for (let i = 1; i < slice.length; i++) {
    const cur = slice[i];
    const prev = slice[i - 1];
    const tr = Math.max(
      cur.high - cur.low,
      Math.abs(cur.high - prev.close),
      Math.abs(cur.low - prev.close)
    );
    trs.push(tr);
  }
  const avg = trs.reduce((a, b) => a + b, 0) / trs.length;
  return Number.isFinite(avg) ? avg : null;
}
