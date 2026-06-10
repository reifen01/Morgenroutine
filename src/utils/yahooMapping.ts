/**
 * Yahoo Finance symbol mapping and helpers.
 * Shared by frontend (symbol collection) and backend (Yahoo API calls).
 */

import type { PortfolioItem, WatchlistItem } from "../types";

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

// Known portfolio key -> Yahoo ticker (Tradegate / XETRA EUR-listings preferred)
const KEY_TO_YAHOO: Record<string, string> = {
  tsla: "TL0.F",
  now: "4S0.F",
  baba: "BABA.DE",
  btc: "BTC-EUR",
};

// Ticker shorthand -> Yahoo ticker (handles German Tradegate symbols)
const TICKER_TO_YAHOO: Record<string, string> = {
  TSLA: "TL0.F",
  TL0: "TL0.F",
  TLO: "TL0.F",
  NOW: "4S0.F",
  "4S0": "4S0.F",
  "4S0L": "4S0.F",
  BABA: "BABA.DE",
  AHLA: "BABA.DE",
  BTC: "BTC-EUR",
  BTCEUR: "BTC-EUR",
  "BTC-EUR": "BTC-EUR",
};

/**
 * Convert a portfolio item to a Yahoo Finance ticker.
 * Tries: explicit ticker mapping → key mapping → fall back to raw ticker.
 */
export function yahooTickerForPortfolio(item: PortfolioItem): string | null {
  if (item.ticker) {
    const upper = item.ticker.toUpperCase();
    if (TICKER_TO_YAHOO[upper]) return TICKER_TO_YAHOO[upper];
    // Already-Yahoo-looking ticker (contains dot or dash) → take as-is
    if (upper.includes(".") || upper.includes("-")) return upper;
  }
  if (item.key && KEY_TO_YAHOO[item.key]) return KEY_TO_YAHOO[item.key];
  return item.ticker ? item.ticker.toUpperCase() : null;
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
