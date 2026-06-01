/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { 
  CheckCircle, 
  HelpCircle, 
  AlertTriangle, 
  Flame, 
  ArrowRight, 
  Clipboard,
  Coins,
  Zap,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { MarketState, LivePrices, PortfolioItem } from "../types";
import { 
  parseCleanFloat, 
  parseCleanDate,
  formatAccounting, 
  formatToGermanDate 
} from "../utils/mathUtils";

interface MorgenroutineTabProps {
  marketState: MarketState;
  onMarketStateChange: (state: MarketState) => void;
  livePrices: LivePrices;
  onLivePricesChange: (prices: LivePrices) => void;
  portfolioData: PortfolioItem[];
  routineDate: string;
  onCopyExcelLine: () => void;
  csvExportString: string;
  onShowToast?: (title: string, msg: string, type: "success" | "warning" | "error") => void;
}

export default function MorgenroutineTab({
  marketState,
  onMarketStateChange,
  livePrices,
  onLivePricesChange,
  portfolioData,
  routineDate,
  onCopyExcelLine,
  csvExportString,
  onShowToast,
}: MorgenroutineTabProps) {
  // Help tooltips visibility state
  const [helpId, setHelpId] = useState<string | null>(null);
  const [isTvImportCollapsed, setIsTvImportCollapsed] = useState(true);
  const [tvImportText, setTvImportText] = useState("");

  const toggleHelp = (id: string) => {
    setHelpId(helpId === id ? null : id);
  };

  const triggerToast = (title: string, msg: string, type: "success" | "warning" | "error") => {
    if (onShowToast) {
      onShowToast(title, msg, type);
    } else {
      console.log(`[Toast] ${type.toUpperCase()} - ${title}: ${msg}`);
    }
  };

  const handleImportTradingViewData = () => {
    if (!tvImportText.trim()) {
      triggerToast(
        "Schnell-Import",
        "⚠️ Das Importfeld ist leer! Bitte kopiere Daten aus TradingView.",
        "warning"
      );
      return;
    }

    const lines = tvImportText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l !== "");

    if (lines.length === 0) {
      triggerToast(
        "Schnell-Import",
        "⚠️ Keine verwertbaren Zeilen im eingegebenen Text gefunden.",
        "warning"
      );
      return;
    }

    // Supported asset and index keys & mappings from user watches
    const tvMappings = [
      { field: "vix" as const, matchers: ["VIX", "VOLATILITÄTSINDEX S&P"] },
      { field: "vxv" as const, matchers: ["VXV", "VXVCLS", "S&P 500 3-MONTH"] },
      { field: "vvix" as const, matchers: ["VVIX", "VVIX D.", "CBOE VIX VOLATILITY"] },
      { field: "wti" as const, matchers: ["WT", "WTI", "WEST TEXAS"] },
      { field: "gas" as const, matchers: ["NG1!", "NG1! D", "NATURAL GAS", "ERDGAS"] },
      { field: "tsla" as const, matchers: ["TL0", "TLO", "TSLA", "TESLA"] },
      { field: "now" as const, matchers: ["NOW", "SERVICENOW", "4S0", "4S0 L", "4S0L"] },
      { field: "baba" as const, matchers: ["AHLA", "BABA", "ALIBABA"] },
      { field: "btc" as const, matchers: ["BTCEUR", "BTC", "BITCOIN"] },
      { field: "spx" as const, matchers: ["SPX", "SPX·", "S&P 500"] }
    ];

    // Helper function to match a string to one of our mapped keys
    const findMapping = (sym: string) => {
      const s = sym.toUpperCase();
      return tvMappings.find((mapping) =>
        mapping.matchers.some(
          (keyword) =>
            s === keyword ||
            s.startsWith(keyword + " ") ||
            s.startsWith(keyword + "·") ||
            s.startsWith(keyword + ".") ||
            s.startsWith(keyword + " D.") ||
            s.startsWith(keyword + "CLS")
        )
      );
    };

    // Check if we have Block (Grid Column-based) Format headings
    const symbolHeaderIndex = lines.findIndex((l) => {
      const s = l.toUpperCase();
      return s === "SYMBOL" || s === "TICKER";
    });

    const priceHeaderIndex = lines.findIndex((l) => {
      const s = l.toUpperCase();
      return s === "ZULETZT" || s === "LAST" || s === "PREIS" || s === "PRICE" || s === "CURR" || s === "KURS";
    });

    const changeHeaderIndex = lines.findIndex((l) => {
      const s = l.toUpperCase();
      return s === "ÄND" || s === "ÄND." || s === "CHANGE" || s === "CHG" || s === "DIFF";
    });

    let updatedMarketState = { ...marketState };
    let updatedLivePrices = { ...livePrices };
    let importedCount = 0;

    if (symbolHeaderIndex !== -1 && priceHeaderIndex !== -1 && priceHeaderIndex > symbolHeaderIndex) {
      // MODE A: GRID TABLE LAYOUT (Symbols block first, then Prices block)
      const symbolsEndIndex = priceHeaderIndex;
      const pricesEndIndex =
        changeHeaderIndex !== -1 && changeHeaderIndex > priceHeaderIndex
          ? changeHeaderIndex
          : lines.length;

      const rawSymbols = lines.slice(symbolHeaderIndex + 1, symbolsEndIndex);
      const rawPrices = lines.slice(priceHeaderIndex + 1, pricesEndIndex);

      // Clean rawSymbols by removing line items that are pure numbers or noise not matching any mapping.
      // This solves the index offset shifts caused by wrapped index descriptions like "000" or "500".
      const matchedSymbolsWithIndex: { sym: string; field: string; rawIndex: number }[] = [];
      rawSymbols.forEach((sym, idx) => {
        const mapping = findMapping(sym);
        if (mapping) {
          matchedSymbolsWithIndex.push({ sym, field: mapping.field, rawIndex: idx });
        }
      });

      // Track parsed numeric values
      const parsedPrices: number[] = [];
      rawPrices.forEach((priceStr) => {
        const priceVal = parseCleanFloat(priceStr);
        if (priceVal !== null) {
          parsedPrices.push(priceVal);
        }
      });

      // Map aligned filtered lists row-by-row
      const matchLimit = Math.min(matchedSymbolsWithIndex.length, parsedPrices.length);
      for (let i = 0; i < matchLimit; i++) {
        const { field } = matchedSymbolsWithIndex[i];
        const priceVal = parsedPrices[i];

        if (field === "tsla") {
          updatedLivePrices.tsla = { ...updatedLivePrices.tsla, price: priceVal };
          importedCount++;
        } else if (field === "now") {
          updatedLivePrices.now = { ...updatedLivePrices.now, price: priceVal };
          importedCount++;
        } else if (field === "baba") {
          updatedLivePrices.baba = { ...updatedLivePrices.baba, price: priceVal };
          importedCount++;
        } else if (field === "btc") {
          updatedLivePrices.btc = { ...updatedLivePrices.btc, price: priceVal };
          importedCount++;
        } else if (field === "vix") {
          updatedMarketState.vix = priceVal;
          importedCount++;
        } else if (field === "vxv") {
          updatedMarketState.vxv = priceVal;
          importedCount++;
        } else if (field === "vvix") {
          updatedMarketState.vvix = priceVal;
          importedCount++;
        } else if (field === "wti") {
          updatedMarketState.wti = priceVal;
          importedCount++;
        } else if (field === "gas") {
          updatedMarketState.gas = priceVal;
          importedCount++;
        }
      }
    } else {
      // MODE B: ROW-BY-ROW / ALTERNATING FORMAT
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const mapping = findMapping(line);
        if (mapping) {
          // Scan ahead in subsequent lines for the next available price value
          let foundPrice: number | null = null;
          for (let j = i + 1; j < Math.min(lines.length, i + 8); j++) {
            const nextLine = lines[j];
            // If we encounter another valid symbol keyword immediately, stop scanning to avoid capturing incorrect numbers
            if (findMapping(nextLine) && j === i + 1) {
              break;
            }
            const cleanNext = nextLine.replace(/[-+%\s]/g, "");
            const num = parseCleanFloat(cleanNext);
            if (num !== null) {
              foundPrice = num;
              break;
            }
          }

          if (foundPrice !== null) {
            const field = mapping.field;
            if (field === "tsla") {
              updatedLivePrices.tsla = { ...updatedLivePrices.tsla, price: foundPrice };
              importedCount++;
            } else if (field === "now") {
              updatedLivePrices.now = { ...updatedLivePrices.now, price: foundPrice };
              importedCount++;
            } else if (field === "baba") {
              updatedLivePrices.baba = { ...updatedLivePrices.baba, price: foundPrice };
              importedCount++;
            } else if (field === "btc") {
              updatedLivePrices.btc = { ...updatedLivePrices.btc, price: foundPrice };
              importedCount++;
            } else if (field === "vix") {
              updatedMarketState.vix = foundPrice;
              importedCount++;
            } else if (field === "vxv") {
              updatedMarketState.vxv = foundPrice;
              importedCount++;
            } else if (field === "vvix") {
              updatedMarketState.vvix = foundPrice;
              importedCount++;
            } else if (field === "wti") {
              updatedMarketState.wti = foundPrice;
              importedCount++;
            } else if (field === "gas") {
              updatedMarketState.gas = foundPrice;
              importedCount++;
            }
          }
        }
      }
    }

    if (importedCount > 0) {
      onMarketStateChange(updatedMarketState);
      onLivePricesChange(updatedLivePrices);
      triggerToast(
        "Schnell-Import",
        `🟢 ${importedCount} Werte erfolgreich erkannt und unbestechlich eingepflegt!`,
        "success"
      );
      setTvImportText("");
    } else {
      triggerToast(
        "Schnell-Import",
        "❌ Keine passenden Symbole mit nachfolgenden Preisen erkannt. Überprüfe das Format oder pflege die Kurse manuell ein.",
        "error"
      );
    }
  };

  const handleMarketFieldChange = (key: keyof MarketState, value: string) => {
    const num = parseCleanFloat(value);
    onMarketStateChange({
      ...marketState,
      [key]: num,
    });
  };

  const handleLivePriceFieldChange = (
    ticker: keyof LivePrices,
    field: 'price' | 'atr' | 'date',
    value: string
  ) => {
    const updatedPrices = { ...livePrices };
    if (field === 'price' || field === 'atr') {
      const num = parseCleanFloat(value);
      updatedPrices[ticker] = {
        ...updatedPrices[ticker],
        [field]: num,
      };
    } else {
      updatedPrices[ticker] = {
        ...updatedPrices[ticker],
        [field]: value,
      };
    }
    onLivePricesChange(updatedPrices);
  };

  // Helper properties to check macro guidelines
  const vix = marketState.vix;
  const vxv = marketState.vxv;
  const ratio = vix && vxv ? vix / vxv : null;
  const wti = marketState.wti;
  const gas = marketState.gas;

  const isContango = ratio !== null ? ratio < 1.0 : false;
  const livesFilled = vix !== null && vxv !== null && wti !== null && gas !== null;
  
  // Strict System check logic
  let systemStatusText = "🔴 KAUFSPERRE / UNGEPRÜFT";
  let statusColorClasses = "bg-rose-50 border-rose-500 text-rose-950 animate-pulse";
  let systemTextLabelColor = "text-rose-800";

  const isMacroHealthy = 
    livesFilled && 
    wti !== null && wti < 100 && 
    gas !== null && gas < 4.5 && 
    vix !== null && vix < 25 && 
    isContango;

  if (!livesFilled) {
    systemStatusText = "🔴 KAUFSPERRE (KEINE DATEN)";
  } else if (wti !== null && wti >= 100) {
    systemStatusText = "🔴 KAUFSPERRE: WTI ÖL ≥ 100 $ ⚠️";
  } else if (gas !== null && gas >= 4.5) {
    systemStatusText = "🔴 KAUFSPERRE: ERDGAS ≥ 4,50 $ ⚠️";
  } else if (vix !== null && vix >= 25) {
    systemStatusText = "🔴 KAUFSPERRE: PANIK (VIX ≥ 25) 🚨";
  } else if (!isContango) {
    systemStatusText = "🔴 KAUFSPERRE: BACKWARDATION (VIX/VXV ≥ 1) 🚨";
  } else {
    systemStatusText = "🟢 MARKT INTAKT (KÄUFE ERLAUBT)";
    statusColorClasses = "bg-emerald-50 border-emerald-500 text-emerald-950";
    systemTextLabelColor = "text-emerald-800";
  }

  // Generate warning/info variables for Limit check tables
  const coreAssets = [
    { key: 'tsla' as keyof LivePrices, name: 'TSLA Core (Dadad)', limit: 320.00, desc: 'Kauf-Limit @ € 320,00' },
    { key: 'now' as keyof LivePrices, name: 'ServiceNow (NOW)', limit: 80.00, desc: 'Harter Anker @ € 80,00' },
    { key: 'baba' as keyof LivePrices, name: 'Alibaba (BABA)', limit: 70.00, desc: 'Hartes Limit @ € 70,00' },
    { key: 'btc' as keyof LivePrices, name: 'Bitcoin (BTC)', limit: 50000.00, desc: 'Sparplan-Kauf @ € 50.000,00' }
  ];

  return (
    <div className="space-y-6">
      
      {/* Top Banner Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-lg shadow-slate-250/10 md:col-span-2">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 font-display flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-indigo-600"></span>
              📋 MORGENROUTINE — {formatToGermanDate(routineDate)}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-2 font-medium leading-relaxed">
              System bereit • Alle Datenfelder freigeschaltet. Kopiere deine Werte direkt aus TradingView ("TW") oder trage sie manuell ein!
            </p>
          </div>
        </div>
        
        <div className={`rounded-3xl p-6 text-center border transition-all duration-300 shadow-md shadow-slate-200/10 flex flex-col justify-center ${statusColorClasses}`}>
          <span className={`block text-[10px] uppercase font-bold tracking-widest mb-1 ${systemTextLabelColor}`}>
            UNBESTECHLICHER STATUS
          </span>
          <span className="text-sm sm:text-base font-bold tracking-tight leading-none uppercase">
            {systemStatusText}
          </span>
          <p className="text-xs font-semibold mt-1.5 opacity-90">
            VIX/VXV-Verhältnis:{" "}
            <span className="font-bold font-mono">
              {ratio ? ratio.toFixed(2) : "0,00"} 
            </span>
            {isContango ? " (Contango)" : " (Backwardation)"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Links: Indicators tables */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Volatilitäts-Trio & Energie-Indikatoren Table */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 space-y-6 shadow-md shadow-slate-200/20">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-4 rounded bg-indigo-600 block"></span>
              🚦 Volatilitäts-Trio &amp; Energie-Schranken
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                    <th className="pb-3">Indikator</th>
                    <th className="pb-3 text-right">Wert</th>
                    <th className="pb-3 text-center">Grenzwerte</th>
                    <th className="pb-3 text-right">Ampel-Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  
                  {/* VIX Row */}
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 font-bold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
                      VIX (US-Angst)
                      <button
                        type="button"
                        onClick={() => toggleHelp('vix')}
                        className="text-slate-400 hover:text-indigo-650 transition-colors"
                      >
                        <HelpCircle className="h-3.5 w-3.5" />
                      </button>
                    </td>
                    <td className={`py-4 text-right font-mono font-bold tabular-nums text-sm sm:text-base ${vix && vix >= 25 ? 'text-rose-600 font-extrabold' : 'text-slate-800'}`}>
                      {vix ? vix.toFixed(2) : "FEHLT"}
                    </td>
                    <td className="py-4 text-center text-slate-450 font-mono text-xs font-semibold">Max: 25.00</td>
                    <td className="py-4 text-right">
                      {vix === null ? (
                        <span className="inline-block px-3 py-1 rounded-full bg-slate-50 text-slate-500 border border-slate-200 text-[10px] font-bold animate-pulse">🔴 FEHLT</span>
                      ) : vix < 25 ? (
                        <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100/70 text-[10px] font-bold uppercase">Gelassen</span>
                      ) : (
                        <span className="inline-block px-3 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-100 text-[10px] font-bold uppercase animate-pulse">Panikverbot</span>
                      )}
                    </td>
                  </tr>
                  
                  {/* VIX Help Explainer */}
                  {helpId === 'vix' && (
                    <tr className="bg-slate-50/70">
                      <td colSpan={4} className="p-4 text-xs text-slate-650 leading-relaxed font-medium">
                        <strong>VIX Index (Cboe S&amp;P 500 Volatility):</strong> Misst die implizite Volatilität des US-Leitindex auf Sicht der nächsten 30 Tage. 
                        Werte über <strong>25,00</strong> weisen auf starke Marktunordnung und Absicherungsausbrüche der US-Profis hin. 
                        Neukäufe von Tech-Aktien sind bei VIX &gt;= 25 strictly banned!
                      </td>
                    </tr>
                  )}
                  
                  {/* VXV Row */}
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 font-bold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
                      VXV (3-Monats VIX)
                      <button
                        type="button"
                        onClick={() => toggleHelp('vxv')}
                        className="text-slate-400 hover:text-indigo-650 transition-colors"
                      >
                        <HelpCircle className="h-3.5 w-3.5" />
                      </button>
                    </td>
                    <td className="py-4 text-right font-mono font-bold tabular-nums text-sm sm:text-base text-slate-800">
                      {vxv ? vxv.toFixed(2) : "FEHLT"}
                    </td>
                    <td className="py-4 text-center text-slate-450 font-mono text-xs font-semibold">Verhältnis: VIX &lt; VXV</td>
                    <td className="py-4 text-right">
                      {vxv === null || vix === null ? (
                        <span className="inline-block px-3 py-1 rounded-full bg-slate-50 text-slate-500 border border-slate-200 text-[10px] font-bold animate-pulse">🔴 FEHLT</span>
                      ) : isContango ? (
                        <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100/70 text-[10px] font-bold uppercase">Contango</span>
                      ) : (
                        <span className="inline-block px-3 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-100 text-[10px] font-bold uppercase animate-pulse">Backwardation</span>
                      )}
                    </td>
                  </tr>
                  
                  {/* VXV Explainer */}
                  {helpId === 'vxv' && (
                    <tr className="bg-slate-50/70">
                      <td colSpan={4} className="p-4 text-xs text-slate-650 leading-relaxed font-medium">
                        <strong>VXV Index:</strong> Drückt die 3-Monatserwartung aus. 
                        Ein gesundes Marktumfeld befindet sich in der Konstellation <strong>Contango</strong> (VIX &lt; VXV). 
                        Fällt die Strukturkurve unter 1.0 (VIX &gt;= VXV, Backwardation), herrscht Panik im aktuellen Monat, was das Risiko neuer Long-Käufe massiv erhöht.
                      </td>
                    </tr>
                  )}
                  
                  {/* VVIX Row */}
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 font-bold text-slate-900 text-sm sm:text-base">
                      VVIX (Angst der Angst)
                    </td>
                    <td className="py-4 text-right font-mono font-bold tabular-nums text-sm sm:text-base text-slate-800">
                      {marketState.vvix.toFixed(2)}
                    </td>
                    <td className="py-4 text-center text-slate-450 font-mono text-xs font-semibold">Max: 100 / 130</td>
                    <td className="py-4 text-right">
                      {marketState.vvix < 100 ? (
                        <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100/70 text-[10px] font-bold uppercase">Entspannt</span>
                      ) : marketState.vvix < 130 ? (
                        <span className="inline-block px-3 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-100 text-[10px] font-bold uppercase">Erhöht</span>
                      ) : (
                        <span className="inline-block px-3 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-100 text-[10px] font-bold uppercase animate-pulse">Kaufstopp</span>
                      )}
                    </td>
                  </tr>
                  
                  {/* WTI Row */}
                  <tr className="hover:bg-slate-50 transition-colors bg-indigo-50/10">
                    <td className="py-4 font-bold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
                      WTI Oil ($ pro Barrel)
                      <button
                        type="button"
                        onClick={() => toggleHelp('wti')}
                        className="text-indigo-600 hover:text-indigo-800 transition-colors"
                      >
                        <HelpCircle className="h-3.5 w-3.5" />
                      </button>
                    </td>
                    <td className={`py-4 text-right font-mono font-bold tabular-nums text-sm sm:text-base ${wti && wti >= 100 ? 'text-rose-600 font-extrabold' : 'text-slate-800'}`}>
                      {wti ? `$ ${wti.toFixed(2)}` : "FEHLT"}
                    </td>
                    <td className="py-4 text-center text-slate-455 font-mono text-xs font-semibold">Schutzgrenze: $ 100,00</td>
                    <td className="py-4 text-right">
                      {wti === null ? (
                        <span className="inline-block px-3 py-1 rounded-full bg-slate-50 text-slate-500 border border-slate-200 text-[10px] font-bold animate-pulse">🔴 FEHLT</span>
                      ) : wti < 100 ? (
                        <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100/70 text-[10px] font-bold uppercase">OK (100%)</span>
                      ) : (
                        <span className="inline-block px-3 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-100 text-[10px] font-bold uppercase animate-pulse">Risiko -50%</span>
                      )}
                    </td>
                  </tr>
                  
                  {/* WTI Explainer */}
                  {helpId === 'wti' && (
                    <tr className="bg-slate-50/70">
                      <td colSpan={4} className="p-4 text-xs text-slate-650 leading-relaxed font-medium">
                        <strong>WTI Öl-Klausel ($100-Schranke):</strong> Ein hoher Rohölpreis treibt die globale Inflation drastisch an und belastet die Margen von Fahrzeugherstellern wie Tesla massiv. 
                        Liegt WTI Öl über <strong>$ 100,00</strong>, wird das eingeplante Trade-Risiko für Neukäufe halbiert (<strong>0,5%</strong> statt 1% Depotrisiko pro Trade), um Verlustrisiken vorsorglich zu minimieren.
                      </td>
                    </tr>
                  )}
                  
                  {/* Henry Hub Gas Row */}
                  <tr className="hover:bg-slate-50 transition-colors bg-indigo-50/10">
                    <td className="py-4 font-bold text-slate-905 text-sm sm:text-base flex items-center gap-1.5">
                      Henry Hub Gas ($)
                      <button
                        type="button"
                        onClick={() => toggleHelp('gas')}
                        className="text-emerald-700 hover:text-emerald-900 transition-colors"
                      >
                        <HelpCircle className="h-3.5 w-3.5" />
                      </button>
                    </td>
                    <td className={`py-4 text-right font-mono font-bold tabular-nums text-sm sm:text-base ${gas && gas >= 4.5 ? 'text-rose-600 font-extrabold' : 'text-slate-800'}`}>
                      {gas ? `$ ${gas.toFixed(3)}` : "FEHLT"}
                    </td>
                    <td className="py-4 text-center text-slate-450 font-mono text-xs font-semibold">Sperrlimit: $ 4,50</td>
                    <td className="py-4 text-right">
                      {gas === null ? (
                        <span className="inline-block px-3 py-1 rounded-full bg-slate-50 text-slate-500 border border-slate-200 text-[10px] font-bold animate-pulse">🔴 FEHLT</span>
                      ) : gas < 4.5 ? (
                        <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100/70 text-[10px] font-bold uppercase">Stabil</span>
                      ) : (
                        <span className="inline-block px-3 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-100 text-[10px] font-bold uppercase animate-pulse">Kaufstopp</span>
                      )}
                    </td>
                  </tr>

                  {/* Erdgas Explainer */}
                  {helpId === 'gas' && (
                    <tr className="bg-slate-50/70">
                      <td colSpan={4} className="p-4 text-xs text-slate-650 leading-relaxed font-medium">
                        <strong>Henry Hub Erdgas ($4.50-Sperre):</strong> Dient als sekundäres makroökonomisches Schutzschild. 
                        Sollte der Gaspreis in den USA auf über <strong>$ 4,50</strong> schießen, greift das System mit einem automatischen <strong>Kaufstopp</strong> ein.
                      </td>
                    </tr>
                  )}

                </tbody>
              </table>
            </div>
          </div>

          {/* Limit- & Nachkaufüberwachung Table */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 space-y-6 shadow-md shadow-slate-200/20">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2 pb-2.5 border-b border-slate-50">
              <span className="w-1.5 h-4 rounded bg-indigo-600 block"></span>
              🚦 Limit- &amp; Nachkauf-Wächter (Live-Positionen)
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                    <th className="pb-3">Bestand / Aktie</th>
                    <th className="pb-3 text-center">Kauf-Limit (€)</th>
                    <th className="pb-3 text-center">Aktueller Kurs (€)</th>
                    <th className="pb-3 text-right">Systemsignal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {coreAssets.map((asset) => {
                    const priceData = livePrices[asset.key];
                    const liveVal = priceData ? priceData.price : null;
                    const liveDate = priceData ? priceData.date : "";
                    
                    const isDateMatching = liveDate === routineDate;
                    
                    let signalBadge = (
                      <span className="inline-block px-3 py-1 rounded-full bg-slate-50 text-slate-450 border border-slate-200 text-[10px] font-semibold">
                        Kein Kurs
                      </span>
                    );

                    let statusClass = "text-slate-800";

                    if (liveVal !== null) {
                      const diff = liveVal - asset.limit;
                      if (diff <= 0) {
                        // Under visual threshold LIMIT
                        if (!isMacroHealthy) {
                          signalBadge = (
                            <span className="inline-block px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-100 text-[10px] font-bold">
                              Marktsperre
                            </span>
                          );
                        } else if (isDateMatching) {
                          signalBadge = (
                            <span className="inline-block px-3 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-bold animate-pulse">
                              Käufsignal!
                            </span>
                          );
                          statusClass = "text-emerald-650 font-bold";
                        } else {
                          signalBadge = (
                            <span className="inline-block px-3 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-100 text-[10px] font-bold">
                              Datum Alt
                            </span>
                          );
                        }
                      } else {
                        // Premium above threshold
                        signalBadge = (
                          <span className="inline-block px-3 py-1 rounded-full bg-slate-50 text-indigo-600 border border-slate-100 text-[10px] font-bold">
                            +{formatAccounting(diff)} €
                          </span>
                        );
                      }
                    }

                    return (
                      <tr key={asset.key} className="hover:bg-slate-50 transition-colors">
                        <td className="py-4 font-bold text-slate-900">
                          {asset.name}
                          <span className="block text-[10px] font-semibold text-slate-400 mt-0.5">{asset.desc}</span>
                        </td>
                        <td className="py-4 text-center font-mono font-bold tabular-nums text-slate-500">
                          {formatAccounting(asset.limit)} €
                        </td>
                        <td className="py-4 text-center font-mono">
                          <span className={`block text-xs sm:text-sm ${statusClass} font-bold tabular-nums`}>
                            {liveVal !== null ? `${formatAccounting(liveVal)} €` : "UNGEPRÜFT"}
                          </span>
                          {liveVal !== null && (
                            <span className={`block text-[9px] mt-1 font-semibold ${isDateMatching ? 'text-emerald-600' : 'text-rose-500 font-extrabold animate-pulse'}`}>
                              {isDateMatching ? `Aktiv (${formatToGermanDate(liveDate)})` : `Alt: ${formatToGermanDate(liveDate)} ⚠️`}
                            </span>
                          )}
                        </td>
                        <td className="py-4 text-right">
                          {signalBadge}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Right: Inputs updater and excel csv lines */}
        <div className="space-y-6">
          
          {/* ⚡ TRADINGVIEW SCHNELL-IMPORT CONTAINER (Unbestechlich KOLLABIERBAR!) */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg text-white">
            <button 
              type="button" 
              onClick={() => setIsTvImportCollapsed(!isTvImportCollapsed)} 
              className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-200 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-400 fill-amber-400" /> TradingView Schnell-Import (Copy-Paste)
              </span>
              {isTvImportCollapsed ? (
                <ChevronDown className="h-4 w-4 text-slate-400" />
              ) : (
                <ChevronUp className="h-4 w-4 text-slate-400" />
              )}
            </button>
            
            {!isTvImportCollapsed && (
              <div className="pt-4 mt-3 border-t border-slate-800 space-y-3">
                <p className="text-xs text-slate-405 font-medium text-slate-400">
                  Kopiere deine gesamte TV Watchlist (Symbol unter Wert) und füge sie hier ein. Das System ordnet die Kurse automatisch zu und untermauert das Risikomanagement.
                </p>
                <div className="flex flex-col gap-3">
                  <textarea 
                    value={tvImportText}
                    onChange={(e) => setTvImportText(e.target.value)}
                    rows={4} 
                    placeholder="Daten hier einfügen... (z.B. VIX unter 15,92)" 
                    className="w-full p-3 bg-slate-950 border border-slate-850 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500 placeholder-slate-700 resize-none h-24"
                  />
                  <button 
                    type="button" 
                    onClick={handleImportTradingViewData} 
                    className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase rounded-xl transition-all shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Zap className="h-3.5 w-3.5 fill-current" /> Unbestechlich Einlesen &amp; Zuordnen
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Data Updater card */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 space-y-6 shadow-md shadow-slate-200/20">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-widest pb-3 border-b border-slate-50 flex items-center gap-2">
              <span className="w-1.5 h-4 rounded bg-indigo-600 block"></span>
              Tages-Eingaben
            </h3>
            
            <div className="space-y-6">
              {/* Macro Values Inputs */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1.5 tracking-wider">VIX (US-Term)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={vix !== null ? vix : ""}
                    onChange={(e) => handleMarketFieldChange("vix", e.target.value)}
                    placeholder="z.B. 16,91"
                    className="w-full h-11 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 font-mono text-xs sm:text-sm font-bold focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1.5 tracking-wider">VXV (3M-Angst)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={vxv !== null ? vxv : ""}
                    onChange={(e) => handleMarketFieldChange("vxv", e.target.value)}
                    placeholder="z.B. 20,03"
                    className="w-full h-11 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 font-mono text-xs sm:text-sm font-bold focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1.5 tracking-wider">WTI Öl ($)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={wti !== null ? wti : ""}
                    onChange={(e) => handleMarketFieldChange("wti", e.target.value)}
                    placeholder="z.B. 89,15"
                    className="w-full h-11 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 font-mono text-xs sm:text-sm font-bold focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1.5 tracking-wider">Erdgas ($ HH)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={gas !== null ? gas : ""}
                    onChange={(e) => handleMarketFieldChange("gas", e.target.value)}
                    placeholder="z.B. 3,017"
                    className="w-full h-11 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 font-mono text-xs sm:text-sm font-bold focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Distribution Days */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1.5 tracking-wider">Dist. Days SPX</label>
                  <input
                    type="number"
                    value={marketState.distSpx}
                    onChange={(e) => handleMarketFieldChange("distSpx", e.target.value)}
                    className="w-full h-11 bg-rose-50/50 border border-rose-100 rounded-xl px-3 font-mono text-xs sm:text-sm font-bold focus:border-rose-400 focus:outline-none text-rose-900 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1.5 tracking-wider">Dist. Days NDX</label>
                  <input
                    type="number"
                    value={marketState.distNdx}
                    onChange={(e) => handleMarketFieldChange("distNdx", e.target.value)}
                    className="w-full h-11 bg-rose-50/50 border border-rose-100 rounded-xl px-3 font-mono text-xs sm:text-sm font-bold focus:border-rose-400 focus:outline-none text-rose-900 transition-colors"
                  />
                </div>
              </div>

              {/* Asset Prices Fields */}
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <span className="block text-[10px] font-bold text-indigo-650 uppercase tracking-widest">
                  Live-Assetkurse (€) &amp; ATR
                </span>
                
                {/* TSLA Inputs Row */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-semibold text-slate-500 block">TESLA INC. (TSLA)</span>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={livePrices.tsla.price || ""}
                      onChange={(e) => handleLivePriceFieldChange("tsla", "price", e.target.value)}
                      placeholder="Preis (€)"
                      className="h-10 w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-xs px-2 focus:outline-none text-center font-bold"
                    />
                    <input
                      type="text"
                      inputMode="decimal"
                      value={livePrices.tsla.atr || ""}
                      onChange={(e) => handleLivePriceFieldChange("tsla", "atr", e.target.value)}
                      placeholder="ATR"
                      className="h-10 w-full bg-amber-50/50 border border-amber-100 rounded-xl text-xs px-2 focus:border-amber-450 focus:outline-none text-center font-bold text-amber-900"
                    />
                    <input
                      type="text"
                      value={formatToGermanDate(livePrices.tsla.date)}
                      onChange={(e) => handleLivePriceFieldChange("tsla", "date", parseCleanDate(e.target.value))}
                      placeholder="Datum"
                      className="h-10 w-full bg-slate-50 border border-slate-200 rounded-xl text-[10px] px-1 text-center font-bold focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* NOW Inputs Row */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-semibold text-slate-500 block">SERVICENOW INC. (NOW)</span>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={livePrices.now.price || ""}
                      onChange={(e) => handleLivePriceFieldChange("now", "price", e.target.value)}
                      placeholder="Preis (€)"
                      className="h-10 w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-xs px-2 focus:outline-none text-center font-bold"
                    />
                    <input
                      type="text"
                      inputMode="decimal"
                      value={livePrices.now.atr || ""}
                      onChange={(e) => handleLivePriceFieldChange("now", "atr", e.target.value)}
                      placeholder="ATR"
                      className="h-10 w-full bg-amber-50/50 border border-amber-100 rounded-xl text-xs px-2 focus:border-amber-450 focus:outline-none text-center font-bold text-amber-900"
                    />
                    <input
                      type="text"
                      value={formatToGermanDate(livePrices.now.date)}
                      onChange={(e) => handleLivePriceFieldChange("now", "date", parseCleanDate(e.target.value))}
                      placeholder="Datum"
                      className="h-10 w-full bg-slate-50 border border-slate-200 rounded-xl text-[10px] px-1 text-center font-bold focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* BABA Inputs Row */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-semibold text-slate-500 block">ALIBABA GRP (BABA)</span>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={livePrices.baba.price || ""}
                      onChange={(e) => handleLivePriceFieldChange("baba", "price", e.target.value)}
                      placeholder="Preis (€)"
                      className="h-10 w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-xs px-2 focus:outline-none text-center font-bold"
                    />
                    <input
                      type="text"
                      inputMode="decimal"
                      value={livePrices.baba.atr || ""}
                      onChange={(e) => handleLivePriceFieldChange("baba", "atr", e.target.value)}
                      placeholder="ATR"
                      className="h-10 w-full bg-amber-50/50 border border-amber-100 rounded-xl text-xs px-2 focus:border-amber-455 focus:outline-none text-center font-bold text-amber-900"
                    />
                    <input
                      type="text"
                      value={formatToGermanDate(livePrices.baba.date)}
                      onChange={(e) => handleLivePriceFieldChange("baba", "date", parseCleanDate(e.target.value))}
                      placeholder="Datum"
                      className="h-10 w-full bg-slate-50 border border-slate-200 rounded-xl text-[10px] px-1 text-center font-bold focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* BTC Inputs Row */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-semibold text-slate-500 block">BITCOIN (BTC)</span>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={livePrices.btc.price || ""}
                      onChange={(e) => handleLivePriceFieldChange("btc", "price", e.target.value)}
                      placeholder="Preis (€)"
                      className="h-10 w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-xs px-2 focus:outline-none text-center font-bold col-span-2"
                    />
                    <input
                      type="text"
                      value={formatToGermanDate(livePrices.btc.date)}
                      onChange={(e) => handleLivePriceFieldChange("btc", "date", parseCleanDate(e.target.value))}
                      placeholder="Datum"
                      className="h-10 w-full bg-slate-50 border border-slate-200 rounded-xl text-[10px] px-1 text-center font-bold focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

              </div>

              {/* CSV Export Button container */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-widest">
                  📂 Excel CSV-Exportzeile
                </label>
                <textarea
                  value={csvExportString}
                  readOnly
                  rows={2}
                  onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                  className="w-full p-3 bg-slate-55 border border-slate-200 rounded-xl font-mono text-[10px] text-slate-600 focus:outline-none select-all"
                />
                <button
                  type="button"
                  onClick={onCopyExcelLine}
                  className="w-full h-11 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold tracking-tight flex items-center justify-center gap-2 transition-colors shadow-sm active:scale-98 cursor-pointer"
                >
                  <Clipboard className="h-4.5 w-4.5" /> Exportzeile kopieren
                </button>
              </div>

            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
