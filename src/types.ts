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
  status: 'green' | 'yellow' | 'red';
  stopKurs: number;
  key: keyof LivePrices;
  beschreibung: string;
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
  vvix: number;
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
