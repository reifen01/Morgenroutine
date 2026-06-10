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
  wti: number | null;
  gas: number | null;
  distSpx: number;
  distNdx: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}
