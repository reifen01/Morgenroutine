/**
 * Demo dataset that fills the app with a small, clearly-fake portfolio so
 * a new user can explore every screen without having to type real numbers.
 *
 * Triggered explicitly from the Workspace tab — never seeded automatically.
 * Loading the demo replaces the user's current state; their own data
 * survives until they confirm.
 *
 * Every entry is marked "(Demo)" in its name and uses round numbers so it
 * never looks like a real position.
 */

import type { BackupPayload } from "./backupFile";
import type { PortfolioItem, PortfolioPurchase, SoldTradeItem, ChecklistItem, WatchlistItem, LivePrices } from "../types";

const DEMO_DATE = new Date().toISOString().split("T")[0];
const DEMO_DEPOT = "Demo-Depot";
const DEMO_OWNER = "Demo-Besitzer";

const demoPortfolio: PortfolioItem[] = [
  {
    id: "demo_tsla",
    name: "Tesla, Inc. (Demo)",
    harterAnker: 200,
    limitPreis: 300,
    limitLabel: "Limit € 300",
    tranchenGroesse: 10000,
    status: "green",
    stopKurs: 0,
    key: "tsla",
    ticker: "TSLA",
    isin: "US88160R1014",
    beschreibung: "Demo-Position für die Tour — ersetze mit deinen Werten oder lade ein Backup.",
  },
  {
    id: "demo_btc",
    name: "Bitcoin Tracker (Demo)",
    harterAnker: 30000,
    limitPreis: 50000,
    limitLabel: "Demo-Sparplan",
    tranchenGroesse: 1000,
    status: "green",
    stopKurs: 0,
    key: "btc",
    ticker: "BTC",
    isin: "DE000A27Z304",
    beschreibung: "Demo-Sparplan zum Ausprobieren der Trend-Logik.",
  },
];

const demoWatchlist: WatchlistItem[] = [
  { symbol: "AAPL", name: "Apple Inc. (Demo)", atr: "0", price: "0" },
  { symbol: "NVDA", name: "NVIDIA Corp. (Demo)", atr: "0", price: "0" },
];

const demoPurchases: PortfolioPurchase[] = [
  {
    id: "demo_buy_tsla",
    key: "tsla",
    name: "Tesla, Inc. (Demo)",
    kaufDatum: DEMO_DATE,
    kaufKurs: 250,
    anzahlAktien: 10,
    tatsaechlicheKosten: 2500,
    verbleibendeAnzahlAktien: 10,
    notiz: "Demo-Kauf zur Veranschaulichung des Journals.",
    depot: DEMO_DEPOT,
    besitzerName: DEMO_OWNER,
  },
  {
    id: "demo_buy_btc",
    key: "btc",
    name: "Bitcoin Tracker (Demo)",
    kaufDatum: DEMO_DATE,
    kaufKurs: 35000,
    anzahlAktien: 0.05,
    tatsaechlicheKosten: 1750,
    verbleibendeAnzahlAktien: 0.05,
    notiz: "Demo-Sparplan-Tranche zum Üben.",
    depot: DEMO_DEPOT,
    besitzerName: DEMO_OWNER,
  },
];

const demoSold: SoldTradeItem[] = [];

const demoChecklist: ChecklistItem[] = [
  {
    id: "demo_chk_1",
    title: "TSLA Demo: Limit-Order in deinem Broker prüfen",
    tranchenGroesse: 10000,
    status: "yellow",
    kategorie: "TSLA",
  },
];

const demoLivePrices: LivePrices = {
  tsla: { price: null, date: DEMO_DATE, atr: 0 },
  now: { price: null, date: DEMO_DATE, atr: 0 },
  baba: { price: null, date: DEMO_DATE, atr: 0 },
  btc: { price: null, date: DEMO_DATE, atr: 0 },
};

export const DEMO_PAYLOAD: BackupPayload = {
  portfolio: demoPortfolio,
  watchlist: demoWatchlist,
  livePrices: demoLivePrices,
  purchases: demoPurchases,
  soldTrades: demoSold,
  checklist: demoChecklist,
  customDepots: [DEMO_DEPOT],
  customBesitzer: [DEMO_OWNER],
  depotStartingCash: { [DEMO_DEPOT]: 100000 },
};
