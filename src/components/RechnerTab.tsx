/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { 
  Calculator, 
  Brain, 
  AlertTriangle, 
  ShieldCheck, 
  Sparkles,
  RefreshCw,
  TrendingDown,
  ArrowRight,
  TrendingUp,
  Info,
  Plus,
  Trash2,
  Star,
  Search
} from "lucide-react";
import { parseCleanFloat, formatAccounting } from "../utils/mathUtils";
import { LivePrices, PortfolioItem } from "../types";

export interface WatchlistItem {
  symbol: string;
  name: string;
  atr: string;
  price: string;
}

interface RechnerTabProps {
  routineDate: string;
  livePrices?: LivePrices;
  portfolioData?: PortfolioItem[];
  onShowToast?: (title: string, msg: string, type: "success" | "warning" | "error") => void;
}

export default function RechnerTab({ routineDate, livePrices, portfolioData, onShowToast }: RechnerTabProps) {
  // Input states
  const [depotCapital, setDepotCapital] = useState("200000"); // €
  const [calcMode, setCalcMode] = useState<"shares" | "stop">("shares");
  const [ticker, setTicker] = useState("TSLA");
  const [fxRate, setFxRate] = useState("1.080"); // EUR/USD
  const [riskPct, setRiskPct] = useState("1.0"); // 1%
  const [entryPrice, setEntryPrice] = useState("431.20"); // USD or HKD
  const [stopPrice, setStopPrice] = useState("395.00"); // USD or HKD for Mode 1
  const [targetPrice, setTargetPrice] = useState("480.00"); // USD or HKD
  const [trancheSize, setTrancheSize] = useState("30000"); // € for Mode 2

  // Psychology checklists
  const [selectedBias, setSelectedBias] = useState("");
  const [kiCheckText, setKiCheckText] = useState("");
  const [bearCaseText, setBearCaseText] = useState("");

  // Watchlist states
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(() => {
    const saved = localStorage.getItem("morgenroutine_watchlist");
    if (saved) {
      try {
        return JSON.parse(saved);
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

  useEffect(() => {
    localStorage.setItem("morgenroutine_watchlist", JSON.stringify(watchlist));
  }, [watchlist]);

  // Watchlist form states
  const [wlSymbol, setWlSymbol] = useState("");
  const [wlName, setWlName] = useState("");
  const [wlAtr, setWlAtr] = useState("");
  const [wlPrice, setWlPrice] = useState("");

  // Live stock lookup states
  const [stockSearchQuery, setStockSearchQuery] = useState("");
  const [stockSuggestions, setStockSuggestions] = useState<any[]>([]);
  const [isSearchingStocks, setIsSearchingStocks] = useState(false);

  useEffect(() => {
    if (!stockSearchQuery.trim()) {
      setStockSuggestions([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsSearchingStocks(true);
      try {
        const response = await fetch("/api/stock-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: stockSearchQuery })
        });
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            setStockSuggestions(data);
          }
        }
      } catch (e) {
        console.error("Error searching stocks:", e);
      } finally {
        setIsSearchingStocks(false);
      }
    }, 600); // 600ms debounce

    return () => clearTimeout(delayDebounce);
  }, [stockSearchQuery]);

  // Global Unified Stock Search States
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [globalSuggestions, setGlobalSuggestions] = useState<any[]>([]);
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);

  useEffect(() => {
    if (!globalSearchQuery.trim()) {
      setGlobalSuggestions([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsSearchingGlobal(true);
      try {
        const response = await fetch("/api/stock-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: globalSearchQuery })
        });
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            setGlobalSuggestions(data);
          }
        }
      } catch (e) {
        console.error("Error searching stocks globally:", e);
      } finally {
        setIsSearchingGlobal(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(delayDebounce);
  }, [globalSearchQuery]);

  // ATR Stop-Loss Finder States (TradingView Pine Script Sync)
  const [atrCalcAsset, setAtrCalcAsset] = useState<string>("TSLA");
  const [lastAutofilledAsset, setLastAutofilledAsset] = useState<string>("");
  const [lastAutofilledAtr, setLastAutofilledAtr] = useState<number | null>(null);
  const [lastAutofilledPrice, setLastAutofilledPrice] = useState<number | null>(null);
  const [atrCalcEntry, setAtrCalcEntry] = useState<string>("431.20");
  const [atrCalcLow, setAtrCalcLow] = useState<string>("425.00");
  const [atrCalcHigh, setAtrCalcHigh] = useState<string>("435.00");
  const [atrCalcValue, setAtrCalcValue] = useState<string>("15.50");
  const [atrCalcMult, setAtrCalcMult] = useState<number>(1.5);
  const [atrCalcDirection, setAtrCalcDirection] = useState<"long" | "short">("long");

  // Sync automatic ATR Values & Prices based on active asset
  useEffect(() => {
    // 1. Check watchlist
    const watchlistItem = watchlist.find(item => item.symbol.toUpperCase() === atrCalcAsset.toUpperCase());
    if (watchlistItem) {
      const assetChanged = atrCalcAsset !== lastAutofilledAsset;
      if (assetChanged) {
        if (watchlistItem.atr) {
          setAtrCalcValue(watchlistItem.atr);
        }
        if (watchlistItem.price) {
          setAtrCalcEntry(watchlistItem.price);
          const parsedAtr = parseFloat(watchlistItem.atr || "1.5");
          const parsedPrice = parseFloat(watchlistItem.price);
          if (!isNaN(parsedPrice) && !isNaN(parsedAtr)) {
            const calculatedLow = parsedPrice - parsedAtr * 0.5;
            const calculatedHigh = parsedPrice + parsedAtr * 0.5;
            setAtrCalcLow(calculatedLow.toFixed(2));
            setAtrCalcHigh(calculatedHigh.toFixed(2));
          }
        }
        setLastAutofilledAsset(atrCalcAsset);
        setLastAutofilledAtr(null);
        setLastAutofilledPrice(null);
      }
      return;
    }

    // 2. Otherwise use livePrices as fallback
    if (livePrices) {
      const assetKey = atrCalcAsset.toLowerCase();
      if (assetKey in livePrices) {
        const data = livePrices[assetKey as keyof LivePrices];
        if (data) {
          const assetChanged = atrCalcAsset !== lastAutofilledAsset;
          const atrChangedInMR = data.atr !== lastAutofilledAtr;
          const priceChangedInMR = data.price !== lastAutofilledPrice;

          if (assetChanged || atrChangedInMR || priceChangedInMR) {
            if (data.atr) {
              setAtrCalcValue(String(data.atr));
            }
            if (data.price !== null) {
              setAtrCalcEntry(String(data.price));
              const calculatedLow = data.price - (data.atr || 5.0) * 0.5;
              const calculatedHigh = data.price + (data.atr || 5.0) * 0.5;
              setAtrCalcLow(calculatedLow.toFixed(2));
              setAtrCalcHigh(calculatedHigh.toFixed(2));
            }
            setLastAutofilledAsset(atrCalcAsset);
            setLastAutofilledAtr(data.atr);
            setLastAutofilledPrice(data.price);
          }
        }
      }
    }
  }, [atrCalcAsset, livePrices, lastAutofilledAsset, lastAutofilledAtr, lastAutofilledPrice, watchlist]);

  // Result fields
  const [totalRiskLossAllowed, setTotalRiskLossAllowed] = useState(0); // €
  const [calculatedShares, setCalculatedShares] = useState(0);
  const [requiredCapitalEur, setRequiredCapitalEur] = useState(0);
  const [crvValue, setCrvValue] = useState<number | null>(null);
  const [calculatedMaxStop, setCalculatedMaxStop] = useState<number | null>(null); // for Mode 2
  const [logicWarning, setLogicWarning] = useState<string | null>(null);

  useEffect(() => {
    runCalculations();
  }, [
    depotCapital, 
    calcMode, 
    ticker, 
    fxRate, 
    riskPct, 
    entryPrice, 
    stopPrice, 
    targetPrice, 
    trancheSize
  ]);

  const runCalculations = () => {
    // Parse values
    const capital = parseCleanFloat(depotCapital) || 0;
    const fx = parseCleanFloat(fxRate) || 1.0;
    const rPct = parseCleanFloat(riskPct) || 1.0;
    const entry = parseCleanFloat(entryPrice) || 0;
    const target = parseCleanFloat(targetPrice) || 0;

    // 1% risk maximum in EUR
    const maxLossEur = (capital * rPct) / 100;
    setTotalRiskLossAllowed(maxLossEur);

    setLogicWarning(null);

    if (entry <= 0) {
      setCalculatedShares(0);
      setRequiredCapitalEur(0);
      setCrvValue(null);
      setCalculatedMaxStop(null);
      return;
    }

    if (calcMode === "shares") {
      const stop = parseCleanFloat(stopPrice) || 0;
      if (stop <= 0) {
        setCalculatedShares(0);
        setRequiredCapitalEur(0);
        setCrvValue(null);
        return;
      }

      const isLong = target > entry;
      
      // Stop logic validation
      if (stop >= entry) {
        setLogicWarning("Der Stop-Loss muss zwingend UNTER dem Einstiegspreis liegen!");
        setCalculatedShares(0);
        setRequiredCapitalEur(0);
        setCrvValue(null);
        return;
      }

      // Risk per share in foreign currency
      const riskPerShareForeign = entry - stop; 
      // Convert maximum risk allowed to foreign currency
      const maxLossForeign = maxLossEur * fx;

      // Shares count (Abrundungs-Gesetz)
      const rawShares = maxLossForeign / riskPerShareForeign;
      const finalShares = Math.floor(rawShares);
      setCalculatedShares(finalShares);

      // Total Capital required in EUR
      const requiredEur = (finalShares * entry) / fx;
      setRequiredCapitalEur(requiredEur);

      // CRV calculation
      const potentialGain = target - entry;
      const crv = potentialGain / riskPerShareForeign;
      setCrvValue(crv > 0 ? crv : null);
    } else {
      // MODE 2: Calculate max stop and shares out of tranche size
      const trancheEur = parseCleanFloat(trancheSize) || 0;
      if (trancheEur <= 0) {
        setCalculatedShares(0);
        setRequiredCapitalEur(0);
        setCalculatedMaxStop(null);
        setCrvValue(null);
        return;
      }

      // Convert tranche value to foreign currency
      const trancheForeign = trancheEur * fx;
      // High count of shares matching tranche size
      const maxShares = Math.floor(trancheForeign / entry);
      setCalculatedShares(maxShares);

      // Total Capital required in EUR
      const requiredEur = (maxShares * entry) / fx;
      setRequiredCapitalEur(requiredEur);

      if (maxShares > 0) {
        // Calculate max risk per share in foreign currency
        const maxLossForeign = maxLossEur * fx;
        const maxRiskPerShare = maxLossForeign / maxShares;

        // Calculate final absolute Stop Level
        const allowedStop = entry - maxRiskPerShare;
        setCalculatedMaxStop(allowedStop > 0 ? allowedStop : 0);

        // Calculate CRV
        const potentialGain = target - entry;
        const crv = potentialGain / maxRiskPerShare;
        setCrvValue(crv > 0 ? crv : null);
      } else {
        setCalculatedMaxStop(null);
        setCrvValue(null);
      }
    }
  };

  const getCrvBadge = (crv: number | null) => {
    if (crv === null) return null;
    if (crv < 1.5) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-100 text-rose-800 border border-rose-300 text-xs font-black">
          ⚠️ CRV ZU GERING (&lt; 1,5) - KEIN TRADE!
        </span>
      );
    }
    if (crv < 3.0) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold">
          🟡 CRV AKZEPTABEL ({crv.toFixed(2)})
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-400 text-xs font-black animate-pulse">
        🟢 EXZELLENTES CRV ({crv.toFixed(1)}) ✅
      </span>
    );
  };

  const handleResetForm = () => {
    setDepotCapital("200000");
    setCalcMode("shares");
    setTicker("TSLA");
    setFxRate("1.080");
    setRiskPct("1.0");
    setEntryPrice("431.20");
    setStopPrice("395.00");
    setTargetPrice("480.00");
    setTrancheSize("30000");
    setSelectedBias("");
    setKiCheckText("");
    setBearCaseText("");
  };

  const handleConvertToEuro = () => {
    const fx = parseCleanFloat(fxRate) || 1.0;
    if (fx <= 0 || fx === 1.0) {
      onShowToast?.("Nicht notwendig", "Der Wechselkurs ist bereits auf 1.000 (Euro) konfiguriert.", "warning");
      return;
    }
    
    // Convert main calculator inputs
    const entry = parseCleanFloat(entryPrice) || 0;
    const stop = parseCleanFloat(stopPrice) || 0;
    const target = parseCleanFloat(targetPrice) || 0;
    
    if (entry > 0) setEntryPrice((entry / fx).toFixed(2));
    if (stop > 0) setStopPrice((stop / fx).toFixed(2));
    if (target > 0) setTargetPrice((target / fx).toFixed(2));
    
    // Convert ATR Finder inputs
    const atrEntry = parseCleanFloat(atrCalcEntry) || 0;
    const atrLow = parseCleanFloat(atrCalcLow) || 0;
    const atrHigh = parseCleanFloat(atrCalcHigh) || 0;
    const atrValue = parseCleanFloat(atrCalcValue) || 0;
    
    if (atrEntry > 0) setAtrCalcEntry((atrEntry / fx).toFixed(2));
    if (atrLow > 0) setAtrCalcLow((atrLow / fx).toFixed(2));
    if (atrHigh > 0) setAtrCalcHigh((atrHigh / fx).toFixed(2));
    if (atrValue > 0) setAtrCalcValue((atrValue / fx).toFixed(2));
    
    // Set exchange rate to 1.000 since everything is now in EUR
    setFxRate("1.000");

    onShowToast?.(
      "In Euro umgerechnet",
      `Alle FX-Kurse (Einstieg, Stop-Loss, Kursziel, ATR) im Rechner wurden erfolgreich durch einen Wechselkurs von ${fx.toFixed(3)} in Euro (€) umgerechnet!`,
      "success"
    );
  };

  // ATR calculation variables
  const parsedAtrValue = parseCleanFloat(atrCalcValue) || 1.5;
  const parsedAtrEntry = parseCleanFloat(atrCalcEntry) || 100;
  const parsedAtrLow = parseCleanFloat(atrCalcLow) || (parsedAtrEntry * 0.98);
  const parsedAtrHigh = parseCleanFloat(atrCalcHigh) || (parsedAtrEntry * 1.02);

  const calculatedLongStopFromLowVal = parsedAtrLow - (parsedAtrValue * atrCalcMult);
  const calculatedLongStopFromEntryVal = parsedAtrEntry - (parsedAtrValue * atrCalcMult);
  const calculatedShortStopFromHighVal = parsedAtrHigh + (parsedAtrValue * atrCalcMult);
  const calculatedShortStopFromEntryVal = parsedAtrEntry + (parsedAtrValue * atrCalcMult);

  const finalAtrStopVal = atrCalcDirection === "long" 
    ? calculatedLongStopFromLowVal 
    : calculatedShortStopFromHighVal;

  const handleApplyAtrStopToCalculator = () => {
    setStopPrice(finalAtrStopVal.toFixed(2));
    setEntryPrice(parsedAtrEntry.toFixed(2));
    setTicker(atrCalcAsset.toUpperCase());
    
    // Also adjust target to match standard 3.0x CRV based on this stop loss limit
    const riskAmount = Math.abs(parsedAtrEntry - finalAtrStopVal);
    const suggestedTarget = atrCalcDirection === "long"
      ? parsedAtrEntry + (riskAmount * 3)
      : parsedAtrEntry - (riskAmount * 3);
    setTargetPrice(suggestedTarget.toFixed(2));
  };

  // Dynamic Dropdown Option Setup
  const defaultAssets = [
    { key: "tsla", ticker: "TSLA", label: "Tesla (TSLA)" },
    { key: "now", ticker: "NOW", label: "ServiceNow (NOW)" },
    { key: "baba", ticker: "BABA", label: "Alibaba (BABA)" },
    { key: "btc", ticker: "BTC", label: "Bitcoin (BTC)" }
  ];

  // Active portfolio assets (status !== "sold")
  const activeAssetOptions = defaultAssets.filter(asset => {
    if (!portfolioData) return true;
    return portfolioData.some(p => p.key === asset.key && p.status !== "sold");
  });

  // Sold or inactive portfolio assets
  const inactiveAssetOptions = defaultAssets.filter(asset => {
    if (!portfolioData) return false;
    const hasActive = portfolioData.some(p => p.key === asset.key && p.status !== "sold");
    const hasSold = portfolioData.some(p => p.key === asset.key && p.status === "sold");
    return !hasActive && hasSold;
  });

  const isEurOnly = (parseCleanFloat(fxRate) || 1.0) === 1.0;
  const currencyLabel = isEurOnly ? "€" : "$";
  const currentCurrency = isEurOnly ? "EUR" : "USD";

  return (
    <div className="space-y-6 text-slate-900">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Columns: Inputs form & mental checks */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* CALCULATOR CARD */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-md shadow-slate-200/10 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-50 pb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 font-display uppercase tracking-widest">
                <Calculator className="h-5 w-5 text-indigo-650" />
                Aktien-Positionsgrößen &amp; Risiko-Rechner
              </h2>
              <button
                onClick={handleResetForm}
                className="text-slate-400 hover:text-indigo-650 p-2 rounded-xl hover:bg-slate-50 transition-colors"
                title="Formular zurücksetzen"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            {/* UNIFIED GLOBALE BLITZ-SUCHE (NAME, TICKER, WKN, ISIN) */}
            <div className="bg-slate-50/75 border border-slate-150 rounded-2xl p-4.5 space-y-2.5 relative shadow-xs hover:border-indigo-150 transition-all duration-200">
              <div className="flex items-center gap-2">
                <Search className="h-4.5 w-4.5 text-indigo-650 shrink-0" />
                <span className="text-xs font-black text-indigo-950 uppercase tracking-widest">
                  ⚡ Blitz-Auswahl &amp; Suche (Name, Ticker, WKN oder ISIN)
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium leading-normal">
                Egal ob Name, Ticker, deutsche WKN oder ISIN: Tippe dein Wunsch-Asset ein. Ein Klick überträgt Kurs, ATR und Bezeichner in beide Rechner-Formulare!
              </p>
              <div className="relative">
                <input
                  type="text"
                  value={globalSearchQuery}
                  onChange={(e) => setGlobalSearchQuery(e.target.value)}
                  placeholder="Z.b. Apple, Mercedes, Tesla, US0378331005, 865985..."
                  className="w-full h-10.5 bg-white border border-slate-200 focus:border-indigo-500 hover:border-slate-300 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition-all duration-200 font-semibold"
                />
                
                {isSearchingGlobal && (
                  <div className="absolute right-3.5 top-3.5 animate-spin rounded-full h-4 w-4 border-2 border-indigo-600 border-t-transparent" />
                )}

                {/* Proposals Dropdown container */}
                {globalSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-55 max-h-60 overflow-y-auto divide-y divide-slate-100">
                    <div className="p-2.5 text-[9px] font-extrabold text-indigo-600 bg-indigo-50/65 sticky top-0 uppercase tracking-wider">
                      Gefundene Treffer (Anklicken zum Ausfüllen):
                    </div>
                    {globalSuggestions.map((s, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          // 1. Fill Positionsrechner with symbol and price
                          if (s.symbol) setTicker(s.symbol);
                          if (s.price) setEntryPrice(s.price);
                          // 2. Fill ATR Stop-Loss Finder
                          if (s.symbol) setAtrCalcAsset(s.symbol);
                          if (s.price) setAtrCalcEntry(s.price);
                          if (s.atr) setAtrCalcValue(s.atr);
                          
                          // Clear suggestions
                          setGlobalSuggestions([]);
                          setGlobalSearchQuery("");
                          onShowToast?.("Aktie geladen 🎯", `'${s.name}' wurde vollständig in die Rechner geladen!`, "success");
                        }}
                        className="w-full px-3.5 py-3 hover:bg-slate-50 text-left transition-colors flex items-center justify-between gap-3 cursor-pointer"
                      >
                        <div className="truncate">
                          <span className="font-mono font-extrabold text-slate-900 mr-2 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                            {s.symbol}
                          </span>
                          <span className="text-xs font-bold text-slate-800">{s.name}</span>
                          {(s.isin || s.wkn) && (
                            <span className="block text-[9.5px] text-slate-405 font-mono mt-1">
                              {s.isin ? `ISIN: ${s.isin}` : ""} {s.wkn ? ` | WKN: ${s.wkn}` : ""}
                            </span>
                          )}
                        </div>
                        <div className="text-right shrink-0 font-mono text-[10.5px]">
                          <span className="block font-bold text-slate-900">Kurs: {s.price} {currencyLabel}</span>
                          <span className="block text-amber-500 font-bold">ATR: ≈ {s.atr}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-450 uppercase mb-2 tracking-wider">
                  Depotgröße (€)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={depotCapital}
                  onChange={(e) => setDepotCapital(e.target.value)}
                  className="w-full h-11 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 font-mono font-bold text-slate-900 focus:outline-none transition-colors"
                />
                <span className="text-[10px] text-indigo-650 font-bold mt-2 block">
                  Aktuell unbestechlich hinterlegt: {formatAccounting(parseCleanFloat(depotCapital))} €
                </span>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-450 uppercase mb-2 tracking-wider">
                  Berechnungs-Modus
                </label>
                <select
                  value={calcMode}
                  onChange={(e) => setCalcMode(e.target.value as "shares" | "stop")}
                  className="w-full h-11 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 font-semibold text-slate-800 focus:outline-none text-xs sm:text-sm cursor-pointer transition-all"
                >
                  <option value="shares">Stückzahl aus festem Stop-Loss berechnen</option>
                  <option value="stop">Maximalen Stop-Loss aus Tranchenbudget herleiten 🎯</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-450 uppercase mb-2 tracking-wider">
                  Aktien Ticker
                </label>
                <input
                  type="text"
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value.toUpperCase())}
                  className="w-full h-11 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-4 font-bold text-slate-900 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <div className="flex items-center justify-between gap-1 mb-2">
                  <label className="block text-xs font-bold text-slate-450 uppercase tracking-wider">
                    Wechselkurs (EUR/USD)
                  </label>
                  {!isEurOnly && (
                    <button
                      type="button"
                      onClick={handleConvertToEuro}
                      className="text-[9.5px] text-indigo-600 hover:text-indigo-850 font-black flex items-center gap-0.5 whitespace-nowrap cursor-pointer transition-all bg-indigo-50 border border-indigo-150/55 py-0.5 px-1.5 rounded-lg active:scale-95"
                      title="Alle eingegebenen USD/Fremdwährungswerte im Rechner mit diesem Wechselkurs in Euro konvertieren"
                    >
                      In € umrechnen 🔄
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  inputMode="decimal"
                  value={fxRate}
                  onChange={(e) => setFxRate(e.target.value)}
                  className="w-full h-11 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-4 font-mono font-bold text-slate-900 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-450 uppercase mb-2 tracking-wider">
                  Verschärftes Risiko (%)
                </label>
                <select
                  value={riskPct}
                  onChange={(e) => setRiskPct(e.target.value)}
                  className="w-full h-11 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-3 font-bold text-slate-800 focus:outline-none cursor-pointer transition-all"
                >
                  <option value="0.5">0,5 % Risiko (Halb-Sperre bei WTI ≥ 100$)</option>
                  <option value="1.0">1,0 % Risiko (Eiserner Standard-Sicherheitsgurt)</option>
                  <option value="1.5">1,5 % Risiko (NUR für Sektor-Primat-Setup)</option>
                  <option value="2.0">2,0 % Risiko (Absolutes Maximum)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-450 uppercase mb-2 tracking-wider">
                  Einstieg ({currencyLabel})
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(e.target.value)}
                  className="w-full h-11 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-4 font-mono font-bold text-slate-900 focus:outline-none transition-colors"
                />
              </div>
              
              {calcMode === "shares" ? (
                <div>
                  <label className="block text-xs font-bold text-slate-450 uppercase mb-2 tracking-wider">
                    Stop-Loss ({currencyLabel})
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={stopPrice}
                    onChange={(e) => setStopPrice(e.target.value)}
                    className="w-full h-11 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-4 font-mono font-bold text-slate-900 focus:outline-none transition-colors"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-450 uppercase mb-2 tracking-wider">
                    Geplante Tranche (€)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={trancheSize}
                    onChange={(e) => setTrancheSize(e.target.value)}
                    className="w-full h-11 bg-white border border-slate-200 rounded-xl px-4 font-mono font-bold text-slate-900 focus:outline-none transition-colors"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-450 uppercase mb-2 tracking-wider">
                  Kursziel ({currencyLabel})
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  className="w-full h-11 bg-white border border-slate-200 rounded-xl px-4 font-mono font-bold text-slate-900 focus:outline-none transition-colors"
                />
              </div>
            </div>

          </div>

          {/* PSYCHOLOGY DISCIPLINE FORM */}
          <div className="bg-[#FFFDF9] border border-amber-100 rounded-3xl p-6 sm:p-8 shadow-md shadow-amber-100/30 space-y-4">
            <h3 className="text-base font-bold text-amber-950 border-b border-amber-50 pb-2.5 flex items-center gap-2 font-display">
              <Brain className="h-5 w-5 text-amber-600" />
              Renes unbestechlicher Disziplin-Filter (Psychologie)
            </h3>
            
            <p className="text-xs text-amber-800/90 font-medium leading-relaxed">
              Gemäß dem René-Psychologiehandbuch "Die 7 größten Denkfehler": Du darfst erst dann handeln, wenn du deine Emotionen gnadenlos analysierst und schriftlich festhältst!
            </p>

            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-amber-900 mb-2 uppercase tracking-wider">
                  1. Welcher der 7 Denkfehler betrifft das eigene Ego jetzt am ehesten?
                </label>
                <select
                  value={selectedBias}
                  onChange={(e) => setSelectedBias(e.target.value)}
                  className="w-full h-11 bg-white border border-amber-200 rounded-xl px-4 text-slate-800 text-xs sm:text-sm font-semibold focus:border-amber-450 focus:outline-none cursor-pointer"
                >
                  <option value="" disabled>-- Bitte ehrlich auswählen --</option>
                  <option value="fomo">FOMO - Sorge, dass mir die Aktie wegläuft (Ungeduld)</option>
                  <option value="confirmation">Bestätigungsfehler - Ich ignoriere negative Warnsignale (Bear Case)</option>
                  <option value="revenge">Rache-Trading - Will Verluste unvernünftig schnell ausgleichen</option>
                  <option value="overconfidence">Selbstüberschätzung - Habe angebliche "Gewinnsträhne"</option>
                  <option value="loss_aversion">Verlustaversion - Ich zögere den harten Anker-Stopp gefühlsmäßig hinaus</option>
                  <option value="anchor">Anker-Effekt - "Früher war der Kurs viel höher, sie muss steigen"</option>
                  <option value="emotional">Emotionale Abhängigkeit - Ich handle ohne festes TV-Setup</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-amber-900 mb-2 uppercase tracking-wider">
                    2. Denkfehler KI (System-Check)
                  </label>
                  <textarea
                    value={kiCheckText}
                    onChange={(e) => setKiCheckText(e.target.value)}
                    rows={2}
                    placeholder="Gibt es blinde Flecken bei diesem Ticker, die meine Gier tarnen möchte?"
                    className="w-full p-3 bg-white border border-amber-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-amber-400 placeholder-slate-450 text-slate-850"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-rose-900 mb-2 uppercase tracking-wider">
                    3. Gegenargumente / Bear Case (Pflicht!)
                  </label>
                  <textarea
                    value={bearCaseText}
                    onChange={(e) => setBearCaseText(e.target.value)}
                    rows={2}
                    placeholder="Warum WIRD dieser Trade schiefgehen? Liste mindestens ein negatives Kontra-Argument!"
                    className="w-full p-3 bg-rose-50/20 border border-rose-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-rose-455 placeholder-slate-450 text-slate-855"
                  />
                </div>
              </div>

              {selectedBias && (
                <div className="p-4 rounded-2xl bg-orange-50/70 border border-orange-100 text-xs text-orange-950 font-medium leading-relaxed">
                  <strong>💡 Renes Psychologie-Tipp bei {selectedBias.toUpperCase()}:</strong> Du hast die Schwäche enttarnt! 
                  Atme ruhig für 1 Minute durch. Schalte dein Brokerterminal für 15 Minuten ab oder nutze stur die 1%-Berechnung ohne Kompromisse.
                </div>
              )}
            </div>

          </div>

          {/* ATR STOP-LOSS FINDER (PINE SCRIPT SYNC) */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-md shadow-slate-200/10 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-50 pb-4 gap-2">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 font-display uppercase tracking-widest">
                <TrendingDown className="h-5 w-5 text-indigo-650 animate-pulse" />
                🖥️ Pine Script ATR Stop-Loss Finder (TradingView Sync)
              </h3>
              <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-xl font-mono font-bold uppercase whitespace-nowrap border border-indigo-100 shadow-3xs">
                m = {atrCalcMult.toFixed(1)}x
              </span>
            </div>

            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Dieser Finder ermittelt stur und präzise den dynamischen Stop-Loss-Abstand basierend auf dem <strong>Average True Range (ATR)</strong> Indikator deiner Wertpapiere. Er ist vollkommen synchron mit dem TradingView Pine-Script!
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Asset Selection & Direction */}
              <div>
                <label className="block text-xs font-bold text-slate-450 uppercase mb-2 tracking-wider">
                  Schnellauswahl Aktie / Asset
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={atrCalcAsset}
                    onChange={(e) => setAtrCalcAsset(e.target.value)}
                    className="h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 font-semibold text-slate-850 focus:outline-none cursor-pointer text-xs"
                  >
                    {activeAssetOptions.length > 0 && (
                      <optgroup label="Aktives Depot (Vorhanden)">
                        {activeAssetOptions.map(asset => (
                          <option key={asset.ticker} value={asset.ticker}>{asset.label}</option>
                        ))}
                      </optgroup>
                    )}
                    
                    {watchlist.length > 0 && (
                      <optgroup label="Deine Watchlist">
                        {watchlist.map(item => (
                          <option key={item.symbol} value={item.symbol}>{item.name} ({item.symbol})</option>
                        ))}
                      </optgroup>
                    )}

                    <optgroup label="Sonstige / Verkaufte Werte">
                      {inactiveAssetOptions.map(asset => (
                        <option key={asset.ticker} value={asset.ticker}>{asset.label}</option>
                      ))}
                      {defaultAssets.filter(asset => 
                        !activeAssetOptions.some(a => a.key === asset.key) && 
                        !inactiveAssetOptions.some(i => i.key === asset.key)
                      ).map(asset => (
                        <option key={asset.ticker} value={asset.ticker}>{asset.label}</option>
                      ))}
                      <option value="OTHER">Sonstiges (Manuell)</option>
                    </optgroup>
                  </select>

                  <select
                    value={atrCalcDirection}
                    onChange={(e) => setAtrCalcDirection(e.target.value as "long" | "short")}
                    className="h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 font-semibold text-slate-700 focus:outline-none cursor-pointer text-xs"
                  >
                    <option value="long">🟢 BUY (Long Stop)</option>
                    <option value="short">🔴 SELL (Short Stop)</option>
                  </select>
                </div>
              </div>

              {/* Ticker / Custom Name when other is selected */}
              <div>
                <label className="block text-xs font-bold text-slate-450 uppercase mb-2 tracking-wider">
                  Bezeichnung / Ticker (Manuell)
                </label>
                <input
                  type="text"
                  value={atrCalcAsset}
                  onChange={(e) => setAtrCalcAsset(e.target.value.toUpperCase())}
                  placeholder="z.B. GOOG, AAPL..."
                  className="w-full h-11 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-4 font-bold text-slate-950 focus:outline-none text-xs transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-105">
              {/* Manuell eingegebener ATR-Wert */}
              <div>
                <label className="block text-[10px] font-bold text-indigo-750 uppercase mb-1.5 tracking-wider font-sans">
                  ATR-Wert ({currencyLabel}) *
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={atrCalcValue}
                  onChange={(e) => setAtrCalcValue(e.target.value)}
                  className="w-full h-10 bg-white font-mono font-bold border border-slate-200 rounded-xl px-3 text-slate-900 focus:outline-none focus:border-indigo-500 text-xs text-center"
                  placeholder="z.B. 15.5"
                />
              </div>

              {/* Einstieg / Aktueller Realkompensation */}
              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1.5 tracking-wider">
                  Einstiegskurs ({currencyLabel}) *
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={atrCalcEntry}
                  onChange={(e) => setAtrCalcEntry(e.target.value)}
                  className="w-full h-10 bg-white font-mono font-bold border border-slate-200 rounded-xl px-3 text-slate-900 focus:outline-none focus:border-indigo-500 text-xs text-center"
                />
              </div>

              {/* High oder Low optional */}
              {atrCalcDirection === "long" ? (
                <div>
                  <label className="block text-[10px] font-bold text-emerald-700 uppercase mb-1.5 tracking-wider">
                    Balken-Tief (Low) ({currencyLabel})
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={atrCalcLow}
                    onChange={(e) => setAtrCalcLow(e.target.value)}
                    className="w-full h-10 bg-white font-mono font-semibold border border-slate-200 rounded-xl px-3 text-slate-800 focus:outline-none focus:border-indigo-500 text-xs text-center"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-[10px] font-bold text-rose-700 uppercase mb-1.5 tracking-wider">
                    Balken-Hoch (High) ({currencyLabel})
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={atrCalcHigh}
                    onChange={(e) => setAtrCalcHigh(e.target.value)}
                    className="w-full h-10 bg-white font-mono font-semibold border border-slate-200 rounded-xl px-3 text-slate-800 focus:outline-none focus:border-indigo-500 text-xs text-center"
                  />
                </div>
              )}

              {/* Multiplikator m */}
              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1.5 tracking-wider flex justify-between items-center">
                  <span>Multiplier (m)</span>
                  <span className="text-indigo-650 font-bold font-mono text-[9px]">{atrCalcMult.toFixed(1)}x</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="10"
                    value={atrCalcMult}
                    onChange={(e) => setAtrCalcMult(Math.max(0.1, parseFloat(e.target.value) || 1.5))}
                    className="w-full h-10 bg-white border border-slate-200 font-mono font-bold text-center rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Calculations results display inside finder */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 space-y-2.5">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-205 pb-1.5 font-sans">
                  📊 Pine Script Analyse für {atrCalcAsset.toUpperCase()}
                </span>
                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500">ATR Puffer ({atrCalcMult}x ATR):</span>
                    <span className="font-bold text-indigo-700">{(parsedAtrValue * atrCalcMult).toFixed(2)} {currentCurrency}</span>
                  </div>
                  {atrCalcDirection === "long" ? (
                    <>
                      <div className="flex justify-between text-slate-700">
                        <span>Stop aus Einstieg:</span>
                        <span className="font-semibold">{calculatedLongStopFromEntryVal.toFixed(2)} {currentCurrency}</span>
                      </div>
                      <div className="flex justify-between items-center bg-emerald-50 text-emerald-950 p-2 rounded font-bold border border-emerald-100">
                        <span className="text-[11px] font-sans">🎯 Defensiv-Stop (aus Tief):</span>
                        <span className="text-sm font-mono font-black text-emerald-750">{calculatedLongStopFromLowVal.toFixed(2)} {currentCurrency}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between text-slate-700">
                        <span>Stop aus Einstieg:</span>
                        <span className="font-semibold">{calculatedShortStopFromEntryVal.toFixed(2)} {currentCurrency}</span>
                      </div>
                      <div className="flex justify-between items-center bg-rose-50 text-rose-950 p-2 rounded font-bold border border-rose-100">
                        <span className="text-[11px] font-sans">🎯 Defensiv-Stop (aus Hoch):</span>
                        <span className="text-sm font-mono font-black text-rose-750">{calculatedShortStopFromHighVal.toFixed(2)} {currentCurrency}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-col justify-between gap-3 bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl p-4 shadow-sm">
                <div className="space-y-1 font-sans">
                  <span className="block text-[10px] font-bold text-indigo-300 uppercase tracking-widest flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-yellow-405 shrink-0" />
                    Vollautomatischer Übertrag
                  </span>
                  <p className="text-[11px] leading-relaxed text-slate-300">
                    Klicke unten, um diesen berechneten ATR-Stopp von <strong className="text-white font-mono">{finalAtrStopVal.toFixed(2)} {currencyLabel}</strong> direkt auf den Risiko- und Positionsrechner links oben und das Risk-Management anzuwenden.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleApplyAtrStopToCalculator}
                  className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer text-xs"
                >
                  <span>Morgenroutine ATR-Stopp einsetzen 🚀</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div className="p-3 bg-amber-50/25 border border-amber-100 rounded-xl text-[10px] text-amber-855 leading-relaxed flex items-start gap-1.5 font-sans">
              <Info className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 font-bold" />
              <span>
                <strong>Hinweis zur Synchronisation:</strong> Die Standard-ATR-Werte (z.B. {livePrices?.tsla.atr || 15.5} für TSLA, {livePrices?.baba.atr || 4.1} für BABA) werden live aus den Daten deiner Morgenroutine-Tabelle ausgelesen. Du kannst sie hier frei korrigieren. Beachte, dass gemäß Pine-Script bei einem Long-Signal das <strong>Tief (Low)</strong> minus ATR*m gerechnet wird!
              </span>
            </div>
          </div>

          {/* WATCHLIST & FAVORITEN CARD */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-md shadow-slate-200/10 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-50 pb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 font-display uppercase tracking-widest">
                <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                ⭐ Deine unbestechliche Watchlist (Favoriten)
              </h3>
              <span className="text-[10px] bg-amber-50 text-amber-805 px-2.5 py-1 rounded-xl font-mono font-bold uppercase whitespace-nowrap border border-amber-100">
                {watchlist.length} Werte gesichert
              </span>
            </div>

            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Lege hier favorisierte Ticker oder potenzielle Setups ab. Mit einem Klick lädst du sie blitzschnell in den ATR-Rechner und Positionsgrößen-Planer!
            </p>

            {/* List current watchlist */}
            {watchlist.length === 0 ? (
              <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-450 text-xs">
                Keine Watchlist-Favoriten vorhanden. Nutze das Formular unten, um Favoriten hinzuzufügen!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {watchlist.map((item, index) => (
                  <div 
                    key={index}
                    className="group border border-slate-150 rounded-2xl p-4.5 bg-slate-50/55 hover:bg-slate-50 hover:border-indigo-200 hover:shadow-sm transition-all duration-200 flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-extrabold text-slate-900 group-hover:text-indigo-650 font-mono transition-colors">
                          {item.symbol}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setWatchlist(prev => prev.filter((_, idx) => idx !== index));
                            onShowToast?.("Watchlist", `🗑️ '${item.symbol}' erfolgreich gelöscht!`, "success");
                          }}
                          className="opacity-100 p-1 bg-rose-50 hover:bg-rose-100 border border-rose-150 rounded-lg text-rose-600 hover:text-rose-700 cursor-pointer transition-all duration-200 shadow-2xs"
                          title="Aus Watchlist löschen"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 font-semibold truncate leading-tight">
                        {item.name || "Custom Asset"}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono leading-tight">
                      <div>
                        <span className="text-slate-400 block tracking-wide">ATR-Wert:</span>
                        <span className="font-bold text-slate-800">{item.atr || "--"}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 block tracking-wide font-sans">Einstieg:</span>
                        <span className="font-bold text-slate-800">{item.price || "--"} {currencyLabel}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setAtrCalcAsset(item.symbol.toUpperCase());
                        setTicker(item.symbol.toUpperCase());
                        if (item.atr) setAtrCalcValue(item.atr);
                        if (item.price) {
                          setAtrCalcEntry(item.price);
                          setEntryPrice(item.price);
                        }
                        onShowToast?.(
                          "Favorit geladen 🎯",
                          `'${item.symbol}' wurde erfolgreich in alle Rechner-Formulare geladen!`,
                          "success"
                        );
                      }}
                      className="w-full py-1.5 px-3 bg-white hover:bg-indigo-600 border border-slate-200 hover:border-indigo-600 text-slate-700 hover:text-white font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 text-[11px]"
                    >
                      <Star className="h-3 w-3 fill-amber-400 stroke-amber-500 text-amber-500" />
                      <span>In Rechner laden</span>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Form to add a new favorite */}
            <div className="bg-slate-50/50 border border-slate-105 rounded-2xl p-4 sm:p-5 space-y-4">
              <span className="block text-[11px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-2 flex items-center gap-1">
                <Plus className="h-4 w-4 text-emerald-600" />
                Neuen Favoriten / Watchlist-Wert hinzufügen
              </span>

              {/* LIVE PROPOSAL SEARCH BOX */}
              <div className="relative space-y-1">
                <label className="block text-[10px] font-bold text-slate-650">
                  🔍 Blitz-Suche (Name, Ticker, WKN oder ISIN eingeben):
                </label>
                <input
                  type="text"
                  value={stockSearchQuery}
                  onChange={(e) => setStockSearchQuery(e.target.value)}
                  placeholder="Z.b. Apple, TSLA, Mercedes, US0378331005, 865985..."
                  className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 text-xs text-slate-900 placeholder-slate-405 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
                
                {isSearchingStocks && (
                  <div className="absolute right-3 top-8.5 animate-spin rounded-full h-4 w-4 border-2 border-indigo-500 border-t-transparent" />
                )}

                {/* Suggestions Dropdown */}
                {stockSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-56 overflow-y-auto divide-y divide-slate-100">
                    <div className="p-2 text-[9px] font-bold text-indigo-600 bg-indigo-50/55 sticky top-0 uppercase tracking-wider">
                      Empfohlene Treffer (Klicken zum Auto-Ausfüllen):
                    </div>
                    {stockSuggestions.map((s, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setWlSymbol(s.symbol || "");
                          setWlName(s.name || "");
                          setWlAtr(s.atr || "");
                          setWlPrice(s.price || "");
                          setStockSuggestions([]);
                          setStockSearchQuery("");
                          onShowToast?.("Ausgewählt 🎯", `Werte für '${s.name}' wurden eingetragen!`, "success");
                        }}
                        className="w-full px-3 py-2 hover:bg-slate-50 text-left transition-colors flex items-center justify-between gap-3 cursor-pointer"
                      >
                        <div className="truncate">
                          <span className="font-mono font-extrabold text-slate-900 mr-1.5 bg-slate-100 px-1 py-0.5 rounded text-[10px]">
                            {s.symbol}
                          </span>
                          <span className="text-xs font-semibold text-slate-800">{s.name}</span>
                          {(s.isin || s.wkn) && (
                            <span className="block text-[9px] text-slate-400 font-mono mt-0.5">
                              {s.isin ? `ISIN: ${s.isin}` : ""} {s.wkn ? `| WKN: ${s.wkn}` : ""}
                            </span>
                          )}
                        </div>
                        <div className="text-right shrink-0 font-mono text-[10px]">
                          <span className="block font-bold text-slate-900">Kurs: {s.price} {currencyLabel}</span>
                          <span className="block text-amber-500 font-semibold">ATR: ≈ {s.atr}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Symbol*</label>
                  <input
                    type="text"
                    value={wlSymbol}
                    onChange={(e) => setWlSymbol(e.target.value.toUpperCase())}
                    placeholder="AAPL"
                    className="w-full h-9 bg-white border border-slate-200 rounded-xl px-2.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Name*</label>
                  <input
                    type="text"
                    value={wlName}
                    onChange={(e) => setWlName(e.target.value)}
                    placeholder="Apple Inc."
                    className="w-full h-9 bg-white border border-slate-200 rounded-xl px-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">ATR (optional)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={wlAtr}
                    onChange={(e) => setWlAtr(e.target.value)}
                    placeholder="5.25"
                    className="w-full h-9 bg-white border border-slate-200 rounded-xl px-2.5 text-xs font-mono font-semibold text-slate-950 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Einstieg (Kurs)*</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={wlPrice}
                    onChange={(e) => setWlPrice(e.target.value)}
                    placeholder="220.50"
                    className="w-full h-9 bg-white border border-slate-200 rounded-xl px-2.5 text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!wlSymbol.trim() || !wlPrice.trim()) {
                    onShowToast?.("Fehler", "Bitte fülle das Ticker-Symbol und den Einstiegskurs aus!", "error");
                    return;
                  }
                  
                  const exists = watchlist.some(item => item.symbol.toUpperCase() === wlSymbol.trim().toUpperCase());
                  if (exists) {
                    onShowToast?.("Bereits vorhanden", `Der Ticker '${wlSymbol.trim()}' ist bereits auf deiner Watchlist!`, "warning");
                    return;
                  }

                  const newItem: WatchlistItem = {
                    symbol: wlSymbol.trim().toUpperCase(),
                    name: wlName.trim() || wlSymbol.trim().toUpperCase(),
                    atr: wlAtr.trim() || "2.50",
                    price: wlPrice.trim()
                  };

                  setWatchlist(prev => [...prev, newItem]);
                  onShowToast?.("Hinzugefügt", `🟢 '${newItem.symbol}' wurde erfolgreich zur Watchlist hinzugefügt!`, "success");

                  // Auto select
                  setAtrCalcAsset(newItem.symbol);

                  // Reset
                  setWlSymbol("");
                  setWlName("");
                  setWlAtr("");
                  setWlPrice("");
                }}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 text-xs shadow-sm"
              >
                <Plus className="h-4 w-4" />
                Sichern &amp; Laden
              </button>
            </div>
          </div>

        </div>

        {/* Right Column: Dynamic Outputs */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-md shadow-slate-200/10 space-y-6 h-fit lg:sticky lg:top-8 animate-fade-in">
          <h3 className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-widest border-b border-slate-50 pb-3 font-display">
            Mathematische Risikoanalyse
          </h3>

          {/* Logic warnings */}
          {logicWarning && (
            <div className="p-4 rounded-2xl bg-rose-50 text-rose-950 border border-rose-100 text-xs font-semibold flex items-start gap-2 shadow-sm animate-pulse">
              <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <span>{logicWarning}</span>
            </div>
          )}

          <div className="space-y-4 font-mono text-xs sm:text-sm">
            {/* Max Depot Risk Loss Allowed */}
            <div className="p-3.5 bg-slate-50/50 border border-slate-100 rounded-xl flex items-center justify-between">
              <span className="text-slate-450 text-[11px] font-bold uppercase font-sans">Erlaubtes Trade-Risiko:</span>
              <span className="font-mono font-bold text-rose-650 text-sm sm:text-base">
                {formatAccounting(totalRiskLossAllowed)} €
              </span>
            </div>

            {/* Shares out shares calculations */}
            <div className="p-3.5 bg-emerald-50/30 border border-emerald-100/50 rounded-xl flex items-center justify-between">
              <span className="text-emerald-900 text-[11px] font-bold uppercase font-sans">Abgerundete Stückzahl:</span>
              <span className="font-mono text-base sm:text-lg font-bold text-emerald-700">
                {calculatedShares > 0 ? `${calculatedShares} Stk.` : "--"}
              </span>
            </div>

            {/* Total Einsatz in € */}
            <div className="p-3.5 bg-slate-50/50 border border-slate-100 rounded-xl flex items-center justify-between">
              <span className="text-slate-450 text-[11px] font-bold uppercase font-sans">Erforderlicher Einsatz:</span>
              <span className="font-mono font-bold text-slate-800 text-sm sm:text-base">
                {formatAccounting(requiredCapitalEur)} €
              </span>
            </div>

            {/* Calculated stop depth (for Mode 2) */}
            {calcMode === "stop" && calculatedMaxStop !== null && (
              <div className="p-3.5 bg-amber-50/40 border border-amber-100 rounded-xl flex items-center justify-between">
                <span className="text-amber-900 text-[11px] font-bold uppercase font-sans">Max. Stop-Loss Level:</span>
                <span className="font-mono font-bold text-amber-700 text-sm sm:text-base">
                  $ {calculatedMaxStop.toFixed(2)}
                </span>
              </div>
            )}

            {/* CRV Result Row */}
            <div className="p-3.5 bg-slate-50/50 border border-slate-100 rounded-xl flex items-center justify-between">
              <span className="text-slate-450 text-[11px] font-bold uppercase font-sans">Chance-Risiko-Verhältnis (CRV):</span>
              <span className="font-mono font-bold text-slate-900 text-sm sm:text-base">
                {crvValue !== null ? crvValue.toFixed(2) : "--"}
              </span>
            </div>

            {/* CRV Level Indicator Badge */}
            {crvValue !== null && (
              <div className="text-center pt-2">
                {getCrvBadge(crvValue)}
              </div>
            )}

            {/* Short Invert Check */}
            {crvValue !== null && crvValue >= 1.5 && (
              <div className="p-4 rounded-2xl bg-indigo-50/50 text-indigo-900 border border-indigo-100/70 text-xs font-semibold leading-relaxed space-y-1">
                <div className="flex items-center gap-1.5 text-indigo-700 font-bold text-[11px] uppercase tracking-wider mb-1 font-sans">
                  <ShieldCheck className="h-4.5 w-4.5 text-indigo-650" />
                  Sicherheitsposition Bereit ✅
                </div>
                <p className="opacity-90 font-sans">Mathematische Limits sind eingehalten. Vergewissere dich, dass deine psychologischen Checks komplett sind, um die Disziplingarantie freizugeben.</p>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}
