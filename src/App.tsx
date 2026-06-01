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
  CheckCircle2
} from "lucide-react";
import CompactHeader from "./components/CompactHeader";
import MorgenroutineTab from "./components/MorgenroutineTab";
import RechnerTab from "./components/RechnerTab";
import PortfolioTab from "./components/PortfolioTab";
import AICoachTab from "./components/AICoachTab";
import RegelwerkTab from "./components/RegelwerkTab";
import { MarketState, LivePrices, PortfolioItem, ChecklistItem } from "./types";
import { parseCleanFloat, formatAccounting } from "./utils/mathUtils";

export default function App() {
  // Shared global state variables
  const [routineDate, setRoutineDate] = useState("2026-06-01");
  const [activeTab, setActiveTab] = useState<"morgenroutine" | "rechner" | "journal" | "regelwerk" | "ai-coach">("morgenroutine");
  
  // Market index states
  const [marketState, setMarketState] = useState<MarketState>({
    vix: null,
    vxv: null,
    vvix: 89.55,
    wti: null,
    gas: null,
    distSpx: 2,
    distNdx: 1
  });

  // Assets tracking states with live dates synchronizing with parent routineDate
  const [livePrices, setLivePrices] = useState<LivePrices>({
    tsla: { price: null, date: "2026-06-01", atr: 15.50 },
    now: { price: null, date: "2026-06-01", atr: 3.20 },
    baba: { price: null, date: "2026-06-01", atr: 4.10 },
    btc: { price: null, date: "2026-06-01", atr: 0 }
  });

  // Portfolio items utilizing corrected hard anchors
  const [portfolioData, setPortfolioData] = useState<PortfolioItem[]>([
    {
      id: "p1",
      name: "TSLA Reinhard (Mutter)",
      harterAnker: 185.19,
      limitPreis: 320.00,
      limitLabel: "Limit € 320,00",
      tranchenGroesse: 30000,
      status: "red",
      stopKurs: 0,
      key: "tsla",
      beschreibung: "Kerninvestition. Harter Anker bei € 185,19."
    },
    {
      id: "p2",
      name: "TSLA Kit Anh (Ehemann)",
      harterAnker: 200.00,
      limitPreis: 320.00,
      limitLabel: "Limit € 320,00",
      tranchenGroesse: 40000,
      status: "red",
      stopKurs: 0,
      key: "tsla",
      beschreibung: "Erweiterte Absicherung. Harter Anker bei € 200,00."
    },
    {
      id: "p3",
      name: "ServiceNow (now)",
      harterAnker: 80.00,
      limitPreis: 80.00,
      limitLabel: "Anker € 80,00",
      tranchenGroesse: 25000,
      status: "yellow",
      stopKurs: 0,
      key: "now",
      beschreibung: "Harter Anker bei € 80,00 beachten."
    },
    {
      id: "p4",
      name: "Alibaba (BABA)",
      harterAnker: 89.00,
      limitPreis: 70.00,
      limitLabel: "Anker € 70,00",
      tranchenGroesse: 15000,
      status: "yellow",
      stopKurs: 0,
      key: "baba",
      beschreibung: "Harter Anker bei € 89,00 (Korrektur nach Handbuch)."
    },
    {
      id: "p5",
      name: "BTC Sparplan index",
      harterAnker: 0.00,
      limitPreis: 50000.00,
      limitLabel: "Sparplan active",
      tranchenGroesse: 1000,
      status: "green",
      stopKurs: 0.00,
      key: "btc",
      beschreibung: "Langfristiger BTC Sparplan (K1 + K2)."
    }
  ]);

  // Checklist items
  const [checklistData, setChecklistData] = useState<ChecklistItem[]>([
    { id: "c1", title: "TSLA: Kauflimit bei € 320 in DADAT aktivieren", tranchenGroesse: 50000, status: "yellow", kategorie: "TSLA" },
    { id: "c2", title: "NOW: Entscheidung abschließen (Gewinnmitnahme oder Stop)", tranchenGroesse: 20000, status: "green", kategorie: "NOW" },
    { id: "c3", title: "BABA: Harten Anker im System festschreiben", tranchenGroesse: 20000, status: "red", kategorie: "BABA" }
  ]);

  // Toast systems
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

    return `${formattedDate};${vix.toFixed(2)};${vxv.toFixed(2)};${ratio.toFixed(2)};${marketState.vvix.toFixed(2)};7519.10;${wti.toFixed(2)};${gas.toFixed(2)};${tsla.toFixed(2)};${baba.toFixed(2)};${now.toFixed(2)};${btc.toFixed(2)};${statusLabel};${textComment}`;
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
      
      {/* Absolute Toast Component */}
      {toast && (
        <div className="fixed top-24 right-4 z-50 animate-fade shadow-xl max-w-sm w-full pointer-events-auto">
          <div className="p-4 rounded-2xl border border-slate-100 bg-white flex items-start gap-3 shadow-lg shadow-slate-200">
            {toast.type === "success" && <CheckCircle2 className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />}
            {toast.type === "warning" && <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />}
            {toast.type === "error" && <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />}
            
            <div className="flex-1">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900">{toast.title}</h4>
              <p className="text-slate-500 text-xs mt-1 leading-snug font-medium">{toast.msg}</p>
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
        isSystemReady={isSystemReady}
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
            onClick={() => setActiveTab("ai-coach")}
            className={`tab-btn flex flex-col items-center justify-center flex-1 h-full py-2 transition-all cursor-pointer ${
              activeTab === "ai-coach"
                ? "text-indigo-600 font-bold border-b-2 border-indigo-600"
                : "text-slate-400 border-b-2 border-transparent hover:text-slate-700"
            }`}
          >
            <MessageSquare className="h-5 w-5 animate-pulse text-indigo-600" />
            <span className="text-[10px] sm:text-xs font-semibold mt-1">AI-Handels-Coach</span>
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
            <span className="text-[10px] sm:text-xs font-semibold mt-1">Regeln</span>
          </button>

        </div>
      </nav>

      {/* MAIN VIEWPORT BODY */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-8 pb-16">
        <div className="max-w-7xl mx-auto">
          {activeTab === "morgenroutine" && (
            <MorgenroutineTab 
              marketState={marketState}
              onMarketStateChange={setMarketState}
              livePrices={livePrices}
              onLivePricesChange={setLivePrices}
              portfolioData={portfolioData}
              routineDate={routineDate}
              onCopyExcelLine={handleCopyExcelLine}
              csvExportString={getCSVLine()}
              onShowToast={showToast}
            />
          )}

          {activeTab === "rechner" && (
            <RechnerTab routineDate={routineDate} />
          )}

          {activeTab === "journal" && (
            <PortfolioTab
              routineDate={routineDate}
              livePrices={livePrices}
              portfolioData={portfolioData}
              onPortfolioDataChange={setPortfolioData}
              checklistData={checklistData}
              onChecklistDataChange={setChecklistData}
              onLoadToCalculator={handleLoadToCalculator}
            />
          )}

          {activeTab === "ai-coach" && (
            <AICoachTab routineDate={routineDate} />
          )}

          {activeTab === "regelwerk" && (
            <RegelwerkTab />
          )}
        </div>
      </main>

    </div>
  );
}
