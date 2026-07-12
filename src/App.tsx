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
  FolderSync,
  TrendingUp
} from "lucide-react";
import CompactHeader from "./components/CompactHeader";
import HelpModal from "./components/HelpModal";
import { usePWAUpdate } from "./usePWAUpdate";
import MorgenroutineTab from "./components/MorgenroutineTab";
import RechnerTab from "./components/RechnerTab";
import PortfolioTab from "./components/PortfolioTab";
import AuswertungTab from "./components/AuswertungTab";
import AICoachTab from "./components/AICoachTab";
import RegelwerkTab from "./components/RegelwerkTab";
import WorkspaceSyncTab from "./components/WorkspaceSyncTab";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import PWAUpdatePrompt from "./components/PWAUpdatePrompt";
import OnboardingScreen from "./components/OnboardingScreen";
import { MarketState, LivePrices, PortfolioItem, ChecklistItem, SoldTradeItem, PortfolioPurchase, WatchlistItem, DailySnapshot, PeriodLearning } from "./types";
import { parseCleanFloat, formatAccounting } from "./utils/mathUtils";
import BackupSetupModal from "./components/BackupSetupModal";
import BackupRestoreModal from "./components/BackupRestoreModal";
import type { BackupPayload } from "./utils/backupFile";

const LAST_MODIFIED_KEY = "morgenroutine_data_last_modified";

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
  const [activeTab, setActiveTab] = useState<"morgenroutine" | "rechner" | "journal" | "auswertung" | "regelwerk" | "ai-coach" | "workspace">("morgenroutine");
  const [helpOpen, setHelpOpen] = useState(false);
  const pwaUpdate = usePWAUpdate();
  const [backupSetupOpen, setBackupSetupOpen] = useState(false);
  const [backupRestoreOpen, setBackupRestoreOpen] = useState(false);
  const [dataLastModified, setDataLastModified] = useState<string | null>(
    () => localStorage.getItem(LAST_MODIFIED_KEY)
  );

  // Daily market snapshots for the weekly/monthly Auswertung.
  const [dailyHistory, setDailyHistory] = useState<DailySnapshot[]>(() => {
    const saved = localStorage.getItem("morgenroutine_daily_history");
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return [];
  });

  // User-editable Pareto learnings per period (AI draft + manual edits).
  const [periodLearnings, setPeriodLearnings] = useState<PeriodLearning[]>(() => {
    const saved = localStorage.getItem("morgenroutine_period_learnings");
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem("morgenroutine_daily_history", JSON.stringify(dailyHistory));
  }, [dailyHistory]);

  useEffect(() => {
    localStorage.setItem("morgenroutine_period_learnings", JSON.stringify(periodLearnings));
  }, [periodLearnings]);

  // Upsert today's snapshot (one row per date). Called after a Live-Abruf.
  const recordDailySnapshot = (snap: DailySnapshot) => {
    setDailyHistory((prev) => {
      const without = prev.filter((s) => s.date !== snap.date);
      return [...without, snap].sort((a, b) => a.date.localeCompare(b.date));
    });
  };

  const saveLearning = (learning: PeriodLearning) => {
    setPeriodLearnings((prev) => {
      const without = prev.filter((l) => l.periodKey !== learning.periodKey);
      return [...without, learning];
    });
  };

  // Map each tab to a fitting Handbuch section slug (substring match works,
  // see HelpModal's parseSections + startsWith logic).
  const helpSectionForTab: Record<typeof activeTab, string> = {
    morgenroutine: "live-abruf",
    rechner: "stop-loss-berechnung",
    journal: "steuern",
    auswertung: "tagesablauf",
    regelwerk: "regel-handbuch",
    "ai-coach": "disziplin-quote",
    workspace: "was-die-app-heute-kann",
  };

  const handleCheckForUpdate = async () => {
    showToast("Suche nach Updates…", `Aktuelle Version: ${__BUILD_VERSION__}`, "success");
    const result = await pwaUpdate.checkForUpdate();
    setTimeout(() => {
      if (result.status === "available") {
        showToast(
          "Update gefunden",
          'Eine neue Version steht bereit. Klick „Update verfügbar" oben oder das Banner unten rechts.',
          "success"
        );
      } else if (result.status === "no-sw") {
        showToast("Update-Suche", "Kein Service Worker registriert — bitte Seite neu laden.", "warning");
      } else {
        showToast("Bereits aktuell", `Du bist auf der neuesten Version (${__BUILD_VERSION__}).`, "success");
      }
    }, 1500);
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
      tsla: { price: null, date: initialDate, atr: 0 },
      now: { price: null, date: initialDate, atr: 0 },
      baba: { price: null, date: initialDate, atr: 0 },
      btc: { price: null, date: initialDate, atr: 0 }
    };
  });

  // Portfolio items — completely empty by default. The user either
  // loads a backup or adds positions through the UI. Demo data lives in
  // a separate seeder (Phase 2) that the user can trigger explicitly.
  const [portfolioData, setPortfolioData] = useState<PortfolioItem[]>(() => {
    const saved = localStorage.getItem("morgenroutine_portfolio");
    if (saved) {
      try {
        return JSON.parse(saved) as PortfolioItem[];
      } catch (e) {
        console.error("Error reading portfolio from local storage:", e);
      }
    }
    return [];
  });

  // Checklist items — empty by default; user adds their own tasks or restores from backup.
  const [checklistData, setChecklistData] = useState<ChecklistItem[]>(() => {
    const saved = localStorage.getItem("morgenroutine_checklist");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error reading checklist from local storage:", e);
      }
    }
    return [];
  });

  // Realisierte Verkäufe / Trade-Historie
  const [soldTrades, setSoldTrades] = useState<SoldTradeItem[]>(() => {
    const saved = localStorage.getItem("morgenroutine_sold_trades");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((s) => ({ ...s, depot: s.depot || "", besitzerName: s.besitzerName || "" }));
        }
        return parsed;
      } catch (e) {
        console.error("Error reading sold trades from local storage:", e);
      }
    }
    return [];
  });

  // Portfolio Purchases - tracking of individual buy transactions
  const [portfolioPurchases, setPortfolioPurchases] = useState<PortfolioPurchase[]>(() => {
    const saved = localStorage.getItem("morgenroutine_purchases");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((p) => {
            const updated = { ...p };
            if (!updated.depot || updated.depot === "Standard Depot") {
              updated.depot = "";
            }
            if (!updated.besitzerName) {
              updated.besitzerName = "";
            }
            return updated;
          });
        }
        return parsed;
      } catch (e) {
        console.error("Error reading portfolio purchases from local storage:", e);
      }
    }
    return [];
  });

  // Custom managed list of Depots & Owners shifted up for global persistence and sync support
  const [customDepots, setCustomDepots] = useState<string[]>(() => {
    let baseList: string[] = [];
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
    let baseList: string[] = [];
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
    return {};
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
    return [];
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

  // Track whenever any private data changes so the backup compare view can
  // honestly say "your local data is newer than this backup".
  useEffect(() => {
    const ts = new Date().toISOString();
    localStorage.setItem(LAST_MODIFIED_KEY, ts);
    setDataLastModified(ts);
  }, [portfolioData, watchlist, livePrices, portfolioPurchases, soldTrades, checklistData, customDepots, customBesitzer, depotStartingCash]);

  const collectBackupPayload = (): BackupPayload => ({
    portfolio: portfolioData,
    watchlist,
    livePrices,
    purchases: portfolioPurchases,
    soldTrades,
    checklist: checklistData,
    customDepots,
    customBesitzer,
    depotStartingCash,
    dailyHistory,
    periodLearnings,
  });

  const applyRestoredPayload = (payload: BackupPayload) => {
    setPortfolioData(payload.portfolio);
    setWatchlist(payload.watchlist);
    setLivePrices(payload.livePrices);
    setPortfolioPurchases(payload.purchases);
    setSoldTrades(payload.soldTrades);
    setChecklistData(payload.checklist);
    setCustomDepots(payload.customDepots);
    setCustomBesitzer(payload.customBesitzer);
    if (typeof payload.depotStartingCash === "object" && payload.depotStartingCash !== null) {
      setDepotStartingCash(payload.depotStartingCash as Record<string, number>);
    }
    if (Array.isArray(payload.dailyHistory)) setDailyHistory(payload.dailyHistory);
    if (Array.isArray(payload.periodLearnings)) setPeriodLearnings(payload.periodLearnings);
    showToast(
      "Aktien-Liste geladen",
      `🔓 ${payload.portfolio.length} Position(en), ${payload.watchlist.length} Watchlist-Einträge wiederhergestellt.`,
      "success"
    );
  };

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
      <PWAUpdatePrompt
        needRefresh={pwaUpdate.needRefresh}
        onApply={pwaUpdate.applyUpdate}
        onDismiss={pwaUpdate.dismiss}
      />

      {/* Absolute Toast Component */}
      {toast && (
        <div className="fixed top-24 right-4 left-4 sm:left-auto sm:w-96 z-50 animate-fade shadow-xl pointer-events-auto">
          <div className="p-4 rounded-2xl border border-slate-100 bg-white flex items-start gap-3 shadow-lg shadow-slate-200">
            {toast.type === "success" && <CheckCircle2 className="h-5 w-5 text-slate-800 shrink-0 mt-0.5" />}
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
        onOpenHelp={() => setHelpOpen(true)}
        onCheckForUpdate={handleCheckForUpdate}
        updateAvailable={pwaUpdate.needRefresh}
        onApplyUpdate={pwaUpdate.applyUpdate}
        isSystemReady={isSystemReady}
      />

      <HelpModal
        isOpen={helpOpen}
        onClose={() => setHelpOpen(false)}
        initialSection={helpSectionForTab[activeTab]}
      />

      <BackupSetupModal
        isOpen={backupSetupOpen}
        onClose={() => setBackupSetupOpen(false)}
        collectPayload={collectBackupPayload}
        onSuccess={() => showToast("Backup gespeichert", "💾 Verschlüsselte Datei wurde heruntergeladen.", "success")}
      />

      <BackupRestoreModal
        isOpen={backupRestoreOpen}
        onClose={() => setBackupRestoreOpen(false)}
        currentSummary={{
          portfolioCount: portfolioData.length,
          watchlistCount: watchlist.length,
          purchaseCount: portfolioPurchases.length,
          soldTradeCount: soldTrades.length,
        }}
        currentLastModified={dataLastModified}
        onRestore={applyRestoredPayload}
      />

      {/* COMPACT NAVIGATION BAR */}
      <nav className="shrink-0 bg-white border-b border-slate-200 z-30 shadow-sm shadow-slate-100">
        <div className="h-16 flex items-center justify-around px-2 max-w-4xl mx-auto">
          
          <button
            onClick={() => setActiveTab("morgenroutine")}
            className={`tab-btn flex flex-col items-center justify-center flex-1 h-full py-2 transition-all cursor-pointer ${
              activeTab === "morgenroutine"
                ? "text-slate-800 font-bold border-b-2 border-slate-800"
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
                ? "text-slate-800 font-bold border-b-2 border-slate-800"
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
                ? "text-slate-800 font-bold border-b-2 border-slate-800"
                : "text-slate-400 border-b-2 border-transparent hover:text-slate-700"
            }`}
          >
            <Wallet className="h-5 w-5" />
            <span className="text-[10px] sm:text-xs font-semibold mt-1">Portfolio &amp; Cash</span>
          </button>

          <button
            onClick={() => setActiveTab("auswertung")}
            className={`tab-btn flex flex-col items-center justify-center flex-1 h-full py-2 transition-all cursor-pointer ${
              activeTab === "auswertung"
                ? "text-slate-800 font-bold border-b-2 border-slate-800"
                : "text-slate-400 border-b-2 border-transparent hover:text-slate-700"
            }`}
          >
            <TrendingUp className="h-5 w-5" />
            <span className="text-[10px] sm:text-xs font-semibold mt-1">Auswertung</span>
          </button>

          <button
            onClick={() => setActiveTab("regelwerk")}
            className={`tab-btn flex flex-col items-center justify-center flex-1 h-full py-2 transition-all cursor-pointer ${
              activeTab === "regelwerk"
                ? "text-slate-800 font-bold border-b-2 border-slate-800"
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
                ? "text-slate-800 font-bold border-b-2 border-slate-800"
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
              onOpenRestoreBackup={() => setBackupRestoreOpen(true)}
              onRecordDailySnapshot={recordDailySnapshot}
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
              marketState={marketState}
              livePrices={livePrices}
              portfolioData={portfolioData}
              onPortfolioDataChange={setPortfolioData}
              watchlist={watchlist}
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

          {activeTab === "auswertung" && (
            <AuswertungTab
              dailyHistory={dailyHistory}
              periodLearnings={periodLearnings}
              onSaveLearning={saveLearning}
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
              onOpenBackupSetup={() => setBackupSetupOpen(true)}
              onOpenBackupRestore={() => setBackupRestoreOpen(true)}
              onLoadDemoData={() => {
                if (portfolioData.length > 0 || watchlist.length > 0) {
                  if (!window.confirm("Demo-Daten überschreiben deine aktuellen Werte. Hast du vorher ein Backup erstellt?")) {
                    return;
                  }
                }
                import("./utils/demoData").then(({ DEMO_PAYLOAD }) => {
                  applyRestoredPayload(DEMO_PAYLOAD);
                });
              }}
              onResetAllData={() => {
                if (!window.confirm(
                  "ALLE Daten löschen?\n\nPortfolio, Watchlist, Käufe, Verkäufe, Checkliste, Depot-Stammdaten — alles wird zurückgesetzt.\n\nHast du vorher ein Backup erstellt?"
                )) {
                  return;
                }
                if (!window.confirm("Wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.")) {
                  return;
                }
                // Alle morgenroutine_*-Keys aus localStorage löschen
                const keys: string[] = [];
                for (let i = 0; i < localStorage.length; i++) {
                  const k = localStorage.key(i);
                  if (k && k.startsWith("morgenroutine_")) keys.push(k);
                }
                keys.forEach((k) => localStorage.removeItem(k));
                // States explizit auf leer setzen (sofortiger UI-Refresh)
                setPortfolioData([]);
                setWatchlist([]);
                setPortfolioPurchases([]);
                setSoldTrades([]);
                setChecklistData([]);
                setCustomDepots([]);
                setCustomBesitzer([]);
                setDepotStartingCash({});
                setDailyHistory([]);
                setPeriodLearnings([]);
                setLivePrices({
                  tsla: { price: null, date: initialDate, atr: 0 },
                  now: { price: null, date: initialDate, atr: 0 },
                  baba: { price: null, date: initialDate, atr: 0 },
                  btc: { price: null, date: initialDate, atr: 0 },
                });
                setMarketState({
                  vix: null, vxv: null, vvix: null, spx: null,
                  wti: null, gas: null, distSpx: 0, distNdx: 0,
                });
                showToast(
                  "Alles zurückgesetzt",
                  "🧹 Alle Daten wurden gelöscht. Lade ein Backup oder aktiviere das Demo-Portfolio.",
                  "success"
                );
              }}
            />
          )}
        </div>
      </main>

    </div>
  );
}
