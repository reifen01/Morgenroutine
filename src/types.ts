/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface LivePriceData {
  price: number | null;
  date: string;
  atr: number;
}

export interface LivePrices {
  tsla: LivePriceData;
  now: LivePriceData;
  baba: LivePriceData;
  btc: LivePriceData;
}

export interface PortfolioItem {
  id: string;
  name: string;
  harterAnker: number;
  limitPreis: number;
  limitLabel: string;
  tranchenGroesse: number;
  status: 'green' | 'yellow' | 'red' | 'sold';
  stopKurs: number;
  key: keyof LivePrices;
  beschreibung: string;
  ticker?: string;
  isin?: string;
}

export interface SoldTradeItem {
  id: string;
  name: string;
  key: keyof LivePrices | string;
  verkaufsDatum: string;
  kaufKurs: number;
  verkaufsKurs: number;
  anzahlAktien: number;
  gewinnVerlust: number;
  kestBetrag: number;
  nettoGewinn: number;
  notiz: string;
  taxMethod?: 'FIFO' | 'durchschnitt';
  consumedLots?: { purchaseId: string; sharesFromLot: number }[];
  depot?: string;
  besitzerName?: string;
}

export interface PortfolioPurchase {
  id: string;
  key: keyof LivePrices | string;
  name: string;
  kaufDatum: string;
  kaufKurs: number;
  anzahlAktien: number;
  tatsaechlicheKosten: number;
  verbleibendeAnzahlAktien: number;
  notiz?: string;
  depot?: string;
  besitzerName?: string;
  gedanken?: string;
  ziele?: string;
}

export interface ChecklistItem {
  id: string;
  title: string;
  tranchenGroesse: number;
  status: 'green' | 'yellow' | 'red';
  kategorie: string;
}

export interface MarketState {
  vix: number | null;
  vxv: number | null;
  vvix: number | null;
  spx: number | null;
  wti: number | null;
  gas: number | null;
  distSpx: number;
  distNdx: number;
  /** Herkunft der Distribution-Days-Zahl: "yahoo" = echte Berechnung (verlässlich),
   *  "ai" = KI-Schätzung per Websuche, "estimate" = fester Notnagel-Schätzwert,
   *  "manual" = von Hand eingetragen. Nur "yahoo" und "manual" lösen die Kaufsperre aus. */
  distSource?: "yahoo" | "ai" | "estimate" | "manual";
}

/** One captured day of market-regime values, used for the weekly/monthly
 *  Auswertung. Written automatically after a successful Live-Abruf. */
export interface DailySnapshot {
  date: string;          // YYYY-MM-DD
  vix: number | null;
  vxv: number | null;
  vvix: number | null;
  spx: number | null;
  wti: number | null;
  gas: number | null;
  distSpx: number;
  distNdx: number;
  ratio: number | null;  // vix / vxv
  status: "GREEN" | "RED"; // overall regime verdict for that day
}

/** User-editable Pareto learning note for one period (week or month). */
export interface PeriodLearning {
  /** Period key: ISO week "2026-W24" or month "2026-06". */
  periodKey: string;
  kind: "week" | "month";
  text: string;
  updatedAt: string;     // ISO timestamp
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

export interface WatchlistItem {
  symbol: string;
  name: string;
  atr: string;
  price: string;
}
