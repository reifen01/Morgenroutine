/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { 
  CloudSun, 
  Calculator, 
  Wallet, 
  MessageSquare, 
  GraduationCap, 
  AlertTriangle,
  Info,
  CheckCircle2,
  FolderSync
} from "lucide-react";
import CompactHeader from "./components/CompactHeader";
import HelpModal from "./components/HelpModal";
import MorgenroutineTab from "./components/MorgenroutineTab";
import RechnerTab from "./components/RechnerTab";
import PortfolioTab from "./components/PortfolioTab";
import AICoachTab from "./components/AICoachTab";
import RegelwerkTab from "./components/RegelwerkTab";
import WorkspaceSyncTab from "./components/WorkspaceSyncTab";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import PWAUpdatePrompt from "./components/PWAUpdatePrompt";
import OnboardingScreen from "./components/OnboardingScreen";
import { MarketState, LivePrices, PortfolioItem, ChecklistItem, SoldTradeItem, PortfolioPurchase, WatchlistItem } from "./types";
import { parseCleanFloat, formatAccounting } from "./utils/mathUtils";

const getTodayDateStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function App() {
  // Shared global state variables
  const initialDate = getTodayDateStr();
  const [routineDate, setRoutineDate] = useState(initialDate);
  const [activeTab, setActiveTab] = useState<"morgenroutine" | "rechner" | "journal" | "regelwerk" | "ai-coach" | "workspace">("morgenroutine");
  const [helpOpen, setHelpOpen] = useState(false);

  // Map each tab to a fitting Handbuch section slug (substring match works,
  // see HelpModal's parseSections + startsWith logic).
  const helpSectionForTab: Record<typeof activeTab, string> = {
    morgenroutine: "live-abruf",
    rechner: "stop-loss-berechnung",
    journal: "steuern",
    regelwerk: "regel-handbuch",
    "ai-coach": "disziplin-quote",
    workspace: "was-die-app-heute-kann",
  };
  
  // Market index states
  const [marketState, setMarketState] = useState<MarketState>(() => {
    const saved = localStorage.getItem("morgenroutine_market_state");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error reading market state from local storage:", e);
      }
    }
    return {
      vix: null,
      vxv: null,
      vvix: null,
      spx: null,
      wti: null,
      gas: null,
      distSpx: 2,
      distNdx: 1
    };
  });

  // Assets tracking states with live dates synchronizing with parent routineDate
  const [livePrices, setLivePrices] = useState<LivePrices>(() => {
    const saved = localStorage.getItem("morgenroutine_live_prices");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error reading live prices from local storage:", e);
      }
    }
    return {
      tsla: { price: null, date: initialDate, atr: 15.50 },
      now: { price: null, date: initialDate, atr: 3.20 },
      baba: { price: null, date: initialDate, atr: 4.10 },
      btc: { price: null, date: initialDate, atr: 0 }
    };
  });

  // Portfolio items utilizing corrected hard anchors
  const [portfolioData, setPortfolioData] = useState<PortfolioItem[]>(() => {
    const saved = localStorage.getItem("morgenroutine_portfolio");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as PortfolioItem[];
        return parsed.map((item: PortfolioItem) => {
          const updated = { ...item };
          if (updated.name.includes("Tesla") || updated.name.includes("Reinhard") || updated.name.includes("Mutter") || updated.name.includes("Absicherung")) {
            updated.name = "Tesla, Inc.";
            if (updated.id === "p1") {
              updated.beschreibung = "Kerninvestition. Harter Anker bei € 185,19.";
            } else {
              updated.beschreibung = "Zusätzliche Position (Absicherung). Harter Anker bei € 200,00.";
            }
          } else if (updated.name.includes("Kit Anh") || updated.name.includes("Ehemann")) {
            updated.name = "Tesla, Inc.";
            updated.beschreibung = "Zusätzliche Position (Absicherung). Harter Anker bei € 200,00.";
          } else if (updated.name === "ServiceNow (now)" || updated.name === "ServiceNow") {
            updated.name = "ServiceNow, Inc.";
          } else if (updated.name === "Alibaba (BABA)" || updated.name === "Alibaba") {
            updated.name = "Alibaba Group Holding Ltd.";
          } else if (updated.name === "BTC Sparplan index") {
            updated.name = "Bitcoin Tracker Index";
          }
          
          if (updated.key === "tsla") {
            updated.ticker = "TSLA";
            updated.isin = "US88160R1014";
          } else if (updated.key === "now") {
            updated.ticker = "NOW";
            updated.isin = "US81762P1021";
          } else if (updated.key === "baba") {
            updated.ticker = "BABA";
            updated.isin = "US01609W1027";
          } else if (updated.key === "btc") {
            updated.ticker = "BTC";
            updated.isin = "DE000A27Z304";
          }
          return updated;
        });
      } catch (e) {
        console.error("Error reading portfolio from local storage:", e);
      }
    }
    return [
      {
        id: "p1",
        name: "Tesla, Inc.",
        harterAnker: 185.19,
        limitPreis: 320.00,
        limitLabel: "Limit € 320,00",
        tranchenGroesse: 30000,
        status: "red",
        stopKurs: 0,
        key: "tsla",
        ticker: "TSLA",
        isin: "US88160R1014",
        beschreibung: "Kerninvestition. Harter Anker bei € 185,19."
      },
      {
        id: "p2",
        name: "Tesla, Inc.",
        harterAnker: 200.00,
        limitPreis: 320.00,
        limitLabel: "Limit € 320,00",
        tranchenGroesse: 40000,
        status: "red",
        stopKurs: 0,
        key: "tsla",
        ticker: "TSLA",
        isin: "US88160R1014",
        beschreibung: "Zusätzliche Position (Absicherung). Harter Anker bei € 200,00."
      },
      {
        id: "p3",
        name: "ServiceNow, Inc.",
        harterAnker: 80.00,
        limitPreis: 80.00,
        limitLabel: "Anker € 80,00",
        tranchenGroesse: 25000,
        status: "yellow",
        stopKurs: 0,
        key: "now",
        ticker: "NOW",
        isin: "US81762P1021",
        beschreibung: "Harter Anker bei € 80,00 beachten."
      },
      {
        id: "p4",
        name: "Alibaba Group Holding Ltd.",
        harterAnker: 89.00,
        limitPreis: 70.00,
        limitLabel: "Anker € 70,00",
        tranchenGroesse: 15000,
        status: "yellow",
        stopKurs: 0,
        key: "baba",
        ticker: "BABA",
        isin: "US01609W1027",
        beschreibung: "Harter Anker bei € 89,00 (Korrektur nach Handbuch)."
      },
      {
        id: "p5",
        name: "Bitcoin Tracker Index",
        harterAnker: 0.00,
        limitPreis: 50000.00,
        limitLabel: "Sparplan active",
        tranchenGroesse: 1000,
        status: "green",
        stopKurs: 0.00,
        key: "btc",
        ticker: "BTC",
        isin: "DE000A27Z304",
        beschreibung: "Langfristiger BTC Sparplan (K1 + K2)."
      }
    ];
  });

  // Checklist items
  const [checklistData, setChecklistData] = useState<ChecklistItem[]>(() => {
    const saved = localStorage.getItem("morgenroutine_checklist");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error reading checklist from local storage:", e);
      }
    }
    return [
      { id: "c1", title: "TSLA: Kauflimit bei € 320 in DADAT aktivieren", tranchenGroesse: 50000, status: "yellow", kategorie: "TSLA" },
      { id: "c2", title: "NOW: Entscheidung abschließen (Gewinnmitnahme oder Stop)", tranchenGroesse: 20000, status: "green", kategorie: "NOW" },
      { id: "c3", title: "BABA: Harten Anker im System festschreiben", tranchenGroesse: 20000, status: "red", kategorie: "BABA" }
    ];
  });

  // Realisierte Verkäufe / Trade-Historie
  const [soldTrades, setSoldTrades] = useState<SoldTradeItem[]>(() => {
    const saved = localStorage.getItem("morgenroutine_sold_trades");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((s) => {
            const updated = { ...s };
            if (!updated.depot || updated.depot === "Standard Depot") {
              updated.depot = "Flatex";
            }
            if (!updated.besitzerName) {
              updated.besitzerName = "Standard Besitzer";
            }
            return updated;
          });
        }
        return parsed;
      } catch (e) {
        console.error("Error reading sold trades from local storage:", e);
      }
    }
    return [
      {
        id: "s1",
        name: "ServiceNow (NOW)",
        key: "now",
        verkaufsDatum: "2026-06-03",
        kaufKurs: 680.00,
        verkaufsKurs: 742.50,
        anzahlAktien: 33.67,
        gewinnVerlust: 2104.38,
        kestBetrag: 578.70, // 27,5% KESt in Österreich
        nettoGewinn: 1525.68,
        notiz: "Unbestechlicher Ausstieg per Stop-Loss (Gewinn vollständig abgesichert).",
        depot: "Flatex",
        besitzerName: "Andres"
      }
    ];
  });

  // Portfolio Purchases - tracking of individual buy transactions
  const [portfolioPurchases, setPortfolioPurchases] = useState<PortfolioPurchase[]>(() => {
    const saved = localStorage.getItem("morgenroutine_purchases");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // If BABA specifically has 168.54 from the old default, clean/migrate it to 168!
          return parsed.map((p) => {
            const updated = { ...p };
            if (p.key === "baba" && p.anzahlAktien === 168.54) {
              updated.anzahlAktien = 168.00;
              updated.verbleibendeAnzahlAktien = 168.00;
              updated.tatsaechlicheKosten = 14952.00;
            }
            if (!updated.depot || updated.depot === "Standard Depot") {
              updated.depot = updated.key === "now" ? "DADAT" : "Flatex";
            }
            if (!updated.besitzerName) {
              updated.besitzerName = "Standard Besitzer";
            }
            return updated;
          });
        }
        return parsed;
      } catch (e) {
        console.error("Error reading portfolio purchases from local storage:", e);
      }
    }
    return [
      {
        id: "buy_1",
        name: "ServiceNow, Inc.",
        key: "now",
        kaufDatum: "2026-06-01",
        kaufKurs: 80.00,
        anzahlAktien: 1528,
        tatsaechlicheKosten: 122240,
        verbleibendeAnzahlAktien: 1528,
        notiz: "Erster Kauf laut DADAT-Schnittstelle",
        depot: "DADAT",
        besitzerName: "Andres"
      },
      {
        id: "buy_2",
        name: "Tesla, Inc.",
        key: "tsla",
        kaufDatum: "2026-05-15",
        kaufKurs: 185.19,
        anzahlAktien: 162.00,
        tatsaechlicheKosten: 30000.78,
        verbleibendeAnzahlAktien: 162.00,
        notiz: "Tranche 1 am harten Anker",
        depot: "Flatex",
        besitzerName: "Andres"
      },
      {
        id: "buy_3",
        name: "Alibaba Group Holding Ltd.",
        key: "baba",
        kaufDatum: "2026-05-20",
        kaufKurs: 89.00,
        anzahlAktien: 168.00,
        tatsaechlicheKosten: 14952.00,
        verbleibendeAnzahlAktien: 168.00,
        notiz: "Asien-Anteil laut Regelwerk",
        depot: "Flatex",
        besitzerName: "Andres"
      }
    ];
  });

  // Custom managed list of Depots & Owners shifted up for global persistence and sync support
  const [customDepots, setCustomDepots] = useState<string[]>(() => {
    let baseList = ["Flatex", "Trade Republic", "DADAT", "DAB BNP Paribas", "Bitpanda"];
    const saved = localStorage.getItem("morgenroutine_custom_depots");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          baseList = parsed;
        }
      } catch (e) {
        console.error("Error loading custom depots from local storage:", e);
      }
    }

    // Recover from trade histories if some broker has been wiped from config but remains in history
    const activeDepotsSet = new Set<string>(baseList);
    try {
      const savedPurchases = localStorage.getItem("morgenroutine_purchases");
      if (savedPurchases) {
        const parsedPurchases = JSON.parse(savedPurchases);
        if (Array.isArray(parsedPurchases)) {
          parsedPurchases.forEach(p => {
            if (p.depot) activeDepotsSet.add(p.depot);
          });
        }
      }
    } catch {}
    try {
      const savedSold = localStorage.getItem("morgenroutine_sold_trades");
      if (savedSold) {
        const parsedSold = JSON.parse(savedSold);
        if (Array.isArray(parsedSold)) {
          parsedSold.forEach(s => {
            if (s.depot) activeDepotsSet.add(s.depot);
          });
        }
      }
    } catch {}

    return Array.from(activeDepotsSet);
  });

  const [customBesitzer, setCustomBesitzer] = useState<string[]>(() => {
    let baseList = ["Andres", "Familie", "Firmen-Depot", "Standard Besitzer"];
    const saved = localStorage.getItem("morgenroutine_custom_besitzer");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          baseList = parsed;
        }
      } catch (e) {
        console.error("Error loading custom besitzer from local storage:", e);
      }
    }

    // Recover from trade histories to ensure custom owners NEVER disappear from dropdown selectors!
    const activeOwnersSet = new Set<string>(baseList);
    try {
      const savedPurchases = localStorage.getItem("morgenroutine_purchases");
      if (savedPurchases) {
        const parsedPurchases = JSON.parse(savedPurchases);
        if (Array.isArray(parsedPurchases)) {
          parsedPurchases.forEach(p => {
            if (p.besitzerName) activeOwnersSet.add(p.besitzerName);
          });
        }
      }
    } catch {}
    try {
      const savedSold = localStorage.getItem("morgenroutine_sold_trades");
      if (savedSold) {
        const parsedSold = JSON.parse(savedSold);
        if (Array.isArray(parsedSold)) {
          parsedSold.forEach(s => {
            if (s.besitzerName) activeOwnersSet.add(s.besitzerName);
          });
        }
      }
    } catch {}

    return Array.from(activeOwnersSet);
  });

  const [depotStartingCash, setDepotStartingCash] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem("morgenroutine_depot_starting_cash");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error loading starting cash from local storage:", e);
      }
    }
    return {
      "Flatex": 50000,
      "Trade Republic": 30000,
      "DADAT": 80500,
      "DAB BNP Paribas": 30000,
      "Bitpanda": 10000
    };
  });

  // Watchlist (used by RechnerTab and MorgenroutineTab live-fetch)
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(() => {
    const saved = localStorage.getItem("morgenroutine_watchlist");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error("Error loading watchlist:", e);
      }
    }
    return [
      { symbol: "AAPL", name: "Apple Inc.", atr: "5.50", price: "220.00" },
      { symbol: "NVDA", name: "NVIDIA Corp.", atr: "4.80", price: "125.00" },
      { symbol: "MSFT", name: "Microsoft Corp.", atr: "8.20", price: "425.00" }
    ];
  });

  // Save changes to localStorage
  useEffect(() => {
    localStorage.setItem("morgenroutine_portfolio", JSON.stringify(portfolioData));
  }, [portfolioData]);

  useEffect(() => {
    localStorage.setItem("morgenroutine_watchlist", JSON.stringify(watchlist));
  }, [watchlist]);

  useEffect(() => {
    localStorage.setItem("morgenroutine_custom_depots", JSON.stringify(customDepots));
  }, [customDepots]);

  useEffect(() => {
    localStorage.setItem("morgenroutine_custom_besitzer", JSON.stringify(customBesitzer));
  }, [customBesitzer]);

  useEffect(() => {
    localStorage.setItem("morgenroutine_depot_starting_cash", JSON.stringify(depotStartingCash));
  }, [depotStartingCash]);

  useEffect(() => {
    localStorage.setItem("morgenroutine_checklist", JSON.stringify(checklistData));
  }, [checklistData]);

  useEffect(() => {
    localStorage.setItem("morgenroutine_sold_trades", JSON.stringify(soldTrades));
  }, [soldTrades]);

  useEffect(() => {
    localStorage.setItem("morgenroutine_purchases", JSON.stringify(portfolioPurchases));
  }, [portfolioPurchases]);

  useEffect(() => {
    localStorage.setItem("morgenroutine_market_state", JSON.stringify(marketState));
  }, [marketState]);

  useEffect(() => {
    localStorage.setItem("morgenroutine_live_prices", JSON.stringify(livePrices));
  }, [livePrices]);

  // Toast systems
  const [onboardingDone, setOnboardingDone] = useState(
    () => !!localStorage.getItem("morgenroutine_onboarding_done")
  );
  const [toast, setToast] = useState<{ title: string; msg: string; type: "success" | "warning" | "error" } | null>(null);

  const showToast = (title: string, msg: string, type: "success" | "warning" | "error" = "success") => {
    setToast({ title, msg, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Auto synchronizes asset dates whenever parent-level routineDate switches
  useEffect(() => {
    setLivePrices((prev) => ({
      tsla: { ...prev.tsla, date: routineDate },
      now: { ...prev.now, date: routineDate },
      baba: { ...prev.baba, date: routineDate },
      btc: { ...prev.btc, date: routineDate }
    }));
  }, [routineDate]);

  // Excel CSV single line compiler
  const getCSVLine = () => {
    const formattedDate = routineDate.replace(/-/g, "");
    const vix = marketState.vix || 0;
    const vxv = marketState.vxv || 0;
    const ratio = vix && vxv ? vix / vxv : 0;
    const wti = marketState.wti || 0;
    const gas = marketState.gas || 0;

    const tsla = livePrices.tsla.price || 0;
    const now = livePrices.now.price || 0;
    const baba = livePrices.baba.price || 0;
    const btc = livePrices.btc.price || 0;

    const isSystemGreen = (wti < 100 && gas < 4.5 && ratio < 1.0 && vix < 25 && vix > 0 && vxv > 0);
    const statusLabel = isSystemGreen ? "GREEN" : "RED/RESTRIKTIV";

    let textComment = `VIX bei ${vix.toFixed(2)} im Contango (${ratio.toFixed(2)}). `;
    if (wti >= 100 || gas >= 4.5) {
      textComment += `Sperre aktiv wegen Energiesektor.`;
    } else {
      textComment += `WTI Öl (${wti.toFixed(2)} $) und Erdgas (${gas.toFixed(2)} $) stabil unter den mathematischen Schutzlimits.`;
    }

    const vvixVal = marketState.vvix || 0;
    const spxVal = marketState.spx || 0;

    return `${formattedDate};${vix.toFixed(2)};${vxv.toFixed(2)};${ratio.toFixed(2)};${vvixVal.toFixed(2)};${spxVal.toFixed(2)};${wti.toFixed(2)};${gas.toFixed(2)};${tsla.toFixed(2)};${baba.toFixed(2)};${now.toFixed(2)};${btc.toFixed(2)};${statusLabel};${textComment}`;
  };

  const handleCopyExcelLine = () => {
    const csvLine = getCSVLine();
    navigator.clipboard.writeText(csvLine).then(() => {
      showToast(
        "Excel Export", 
        "📋 CSV-Zeile erfolgreich kopiert! Du kannst sie jetzt mit Strg+V in dein Tages_Journal in Excel einfügen.", 
        "success"
      );
    }).catch(() => {
      // Fallback
      showToast("Excel Export", "Kopieren gescheitert. Bitte wähle den Text im Textbereich direkt aus.", "error");
    });
  };

  // Callback to bridge clicking on Portfolio "🎯 Rechnen" and feeding inputs to Rechner tab
  const handleLoadToCalculator = (
    assetKey: string,
    assetName: string,
    limitPrice: number,
    trancheSize: number,
    currentStop: number
  ) => {
    const liveData = livePrices[assetKey as keyof LivePrices];
    const liveVal = liveData ? liveData.price : null;

    if (liveVal === null) {
      showToast(
        assetName, 
        "❌ Stop-Berechnung verweigert! Bitte trage zuerst den aktuellen Live-Kurs ein.", 
        "error"
      );
      return;
    }

    // Direct routing and warning
    setActiveTab("rechner");
    showToast(
      assetName,
      `Werte geladen! Prüfe jetzt zwingend deine psychologischen Denkfehler für ${assetKey.toUpperCase()}.`,
      "success"
    );
  };

  const isSystemReady = 
    marketState.vix !== null && 
    marketState.vxv !== null && 
    marketState.wti !== null && 
    marketState.gas !== null;

  return (
    <div className="flex flex-col h-screen min-h-screen bg-[#F4F4F7] overflow-hidden font-sans text-slate-900">

      {!onboardingDone && <OnboardingScreen onComplete={() => setOnboardingDone(true)} />}

      <PWAInstallPrompt />
      <PWAUpdatePrompt />

      {/* Absolute Toast Component */}
      {toast && (
        <div className="fixed top-24 right-4 left-4 sm:left-auto sm:w-96 z-50 animate-fade shadow-xl pointer-events-auto">
          <div className="p-4 rounded-2xl border border-slate-100 bg-white flex items-start gap-3 shadow-lg shadow-slate-200">
            {toast.type === "success" && <CheckCircle2 className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />}
            {toast.type === "warning" && <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />}
            {toast.type === "error" && <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />}
            
            <div className="flex-1">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900">{toast.title}</h4>
              <p className="text-slate-500 text-xs mt-1 leading-snug font-medium whitespace-pre-wrap break-words">{toast.msg}</p>
            </div>
            
            <button 
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-slate-600 text-xs font-bold leading-none h-6 w-6 rounded-full flex items-center justify-center hover:bg-slate-50 transition-colors shrink-0"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* COMPACT TOP HEADER */}
      <CompactHeader
        routineDate={routineDate}
        onDateChange={setRoutineDate}
        onCopyExcelLine={handleCopyExcelLine}
        onOpenHelp={() => setHelpOpen(true)}
        isSystemReady={isSystemReady}
      />

      <HelpModal
        isOpen={helpOpen}
        onClose={() => setHelpOpen(false)}
        initialSection={helpSectionForTab[activeTab]}
      />

      {/* COMPACT NAVIGATION BAR */}
      <nav className="shrink-0 bg-white border-b border-slate-200 z-30 shadow-sm shadow-slate-100">
        <div className="h-16 flex items-center justify-around px-2 max-w-4xl mx-auto">
          
          <button
            onClick={() => setActiveTab("morgenroutine")}
            className={`tab-btn flex flex-col items-center justify-center flex-1 h-full py-2 transition-all cursor-pointer ${
              activeTab === "morgenroutine"
                ? "text-indigo-600 font-bold border-b-2 border-indigo-600"
                : "text-slate-400 border-b-2 border-transparent hover:text-slate-700"
            }`}
          >
            <CloudSun className="h-5 w-5" />
            <span className="text-[10px] sm:text-xs font-semibold mt-1">Morgenroutine</span>
          </button>

          <button
            onClick={() => setActiveTab("rechner")}
            className={`tab-btn flex flex-col items-center justify-center flex-1 h-full py-2 transition-all cursor-pointer ${
              activeTab === "rechner"
                ? "text-indigo-600 font-bold border-b-2 border-indigo-600"
                : "text-slate-400 border-b-2 border-transparent hover:text-slate-700"
            }`}
          >
            <Calculator className="h-5 w-5" />
            <span className="text-[10px] sm:text-xs font-semibold mt-1">Rechner &amp; Checks</span>
          </button>

          <button
            onClick={() => setActiveTab("journal")}
            className={`tab-btn flex flex-col items-center justify-center flex-1 h-full py-2 transition-all cursor-pointer ${
              activeTab === "journal"
                ? "text-indigo-600 font-bold border-b-2 border-indigo-600"
                : "text-slate-400 border-b-2 border-transparent hover:text-slate-700"
            }`}
          >
            <Wallet className="h-5 w-5" />
            <span className="text-[10px] sm:text-xs font-semibold mt-1">Portfolio &amp; Cash</span>
          </button>

          <button
            onClick={() => setActiveTab("regelwerk")}
            className={`tab-btn flex flex-col items-center justify-center flex-1 h-full py-2 transition-all cursor-pointer ${
              activeTab === "regelwerk"
                ? "text-indigo-600 font-bold border-b-2 border-indigo-600"
                : "text-slate-400 border-b-2 border-transparent hover:text-slate-700"
            }`}
          >
            <GraduationCap className="h-5 w-5" />
            <span className="text-[10px] sm:text-xs font-semibold mt-1">Regeln &amp; Coach</span>
          </button>

          <button
            onClick={() => setActiveTab("workspace")}
            className={`tab-btn flex flex-col items-center justify-center flex-1 h-full py-2 transition-all cursor-pointer ${
              activeTab === "workspace"
                ? "text-indigo-600 font-bold border-b-2 border-indigo-600"
                : "text-slate-400 border-b-2 border-transparent hover:text-slate-700"
            }`}
          >
            <FolderSync className="h-5 w-5" />
            <span className="text-[10px] sm:text-xs font-semibold mt-1">Workspace</span>
          </button>

        </div>
      </nav>

      {/* MAIN VIEWPORT BODY */}
      <main className="flex-1 overflow-y-auto w-full max-w-full overflow-x-hidden p-4 sm:p-8 pb-16">
        <div className="max-w-7xl mx-auto">
          {activeTab === "morgenroutine" && (
            <MorgenroutineTab
              marketState={marketState}
              onMarketStateChange={setMarketState}
              livePrices={livePrices}
              onLivePricesChange={setLivePrices}
              portfolioData={portfolioData}
              watchlist={watchlist}
              onWatchlistChange={setWatchlist}
              routineDate={routineDate}
              onCopyExcelLine={handleCopyExcelLine}
              csvExportString={getCSVLine()}
              onShowToast={showToast}
            />
          )}

          {activeTab === "rechner" && (
            <RechnerTab
              routineDate={routineDate}
              livePrices={livePrices}
              portfolioData={portfolioData}
              watchlist={watchlist}
              onWatchlistChange={setWatchlist}
              onShowToast={showToast}
            />
          )}

          {activeTab === "journal" && (
            <PortfolioTab
              routineDate={routineDate}
              livePrices={livePrices}
              portfolioData={portfolioData}
              onPortfolioDataChange={setPortfolioData}
              checklistData={checklistData}
              onChecklistDataChange={setChecklistData}
              soldTrades={soldTrades}
              onSoldTradesChange={setSoldTrades}
              portfolioPurchases={portfolioPurchases}
              onPortfolioPurchasesChange={setPortfolioPurchases}
              customDepots={customDepots}
              onCustomDepotsChange={setCustomDepots}
              customBesitzer={customBesitzer}
              onCustomBesitzerChange={setCustomBesitzer}
              depotStartingCash={depotStartingCash}
              onDepotStartingCashChange={setDepotStartingCash}
              onLoadToCalculator={handleLoadToCalculator}
              onShowToast={showToast}
            />
          )}

          {activeTab === "regelwerk" && (
            <RegelwerkTab routineDate={routineDate} />
          )}

          {activeTab === "workspace" && (
            <WorkspaceSyncTab 
              marketState={marketState}
              onMarketStateChange={setMarketState}
              livePrices={livePrices}
              onLivePricesChange={setLivePrices}
              portfolioData={portfolioData}
              onPortfolioDataChange={setPortfolioData}
              checklistData={checklistData}
              onChecklistDataChange={setChecklistData}
              soldTrades={soldTrades}
              onSoldTradesChange={setSoldTrades}
              portfolioPurchases={portfolioPurchases}
              onPortfolioPurchasesChange={setPortfolioPurchases}
              customDepots={customDepots}
              onCustomDepotsChange={setCustomDepots}
              customBesitzer={customBesitzer}
              onCustomBesitzerChange={setCustomBesitzer}
              depotStartingCash={depotStartingCash}
              onDepotStartingCashChange={setDepotStartingCash}
              routineDate={routineDate}
              csvExportString={getCSVLine()}
              onShowToast={showToast}
            />
          )}
        </div>
      </main>

    </div>
  );
}
