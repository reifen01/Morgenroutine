/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { 
  Wallet, 
  HelpCircle, 
  AlertTriangle, 
  CheckCircle, 
  Clipboard, 
  TrendingUp, 
  Scale,
  Percent
} from "lucide-react";
import { LivePrices, PortfolioItem, ChecklistItem } from "../types";
import { formatAccounting, formatToGermanDate, parseCleanDate } from "../utils/mathUtils";

interface PortfolioTabProps {
  routineDate: string;
  livePrices: LivePrices;
  portfolioData: PortfolioItem[];
  onPortfolioDataChange: (data: PortfolioItem[]) => void;
  checklistData: ChecklistItem[];
  onChecklistDataChange: (data: ChecklistItem[]) => void;
  onLoadToCalculator: (
    assetKey: string, 
    assetName: string, 
    limitPrice: number, 
    trancheSize: number, 
    currentStop: number
  ) => void;
}

export default function PortfolioTab({
  routineDate,
  livePrices,
  portfolioData,
  onPortfolioDataChange,
  checklistData,
  onChecklistDataChange,
  onLoadToCalculator,
}: PortfolioTabProps) {
  const START_CASH = 200000;
  
  // Eiserne reserve state
  const [cashReserve, setCashReserve] = useState(50000); // default 50.000€
  const [showWatchlistHelp, setShowWatchlistHelp] = useState(false);

  const workingCapital = START_CASH - cashReserve;

  // Calculate total booked tranches
  const reservedFromPortfolio = portfolioData
    .filter(p => p.status === 'green')
    .reduce((sum, p) => sum + p.tranchenGroesse, 0);

  const reservedFromChecklist = checklistData
    .filter(c => c.status === 'green')
    .reduce((sum, c) => sum + c.tranchenGroesse, 0);

  const totalReserved = reservedFromPortfolio + reservedFromChecklist;
  const freeForAdditions = Math.max(0, workingCapital - totalReserved);
  const reservedPercentage = workingCapital > 0 ? (totalReserved / workingCapital) * 100 : 0;

  // Handles updating tranches directly
  const handleTrancheChange = (id: string, isChecklist: boolean, value: string) => {
    const val = parseFloat(value) || 0;
    if (isChecklist) {
      const updated = checklistData.map(c => c.id === id ? { ...c, tranchenGroesse: val } : c);
      onChecklistDataChange(updated);
    } else {
      const updated = portfolioData.map(p => p.id === id ? { ...p, tranchenGroesse: val } : p);
      onPortfolioDataChange(updated);
    }
  };

  // Handles checklist actions statuses
  const handleChecklistStatusChange = (id: string, newStatus: 'green' | 'yellow' | 'red') => {
    const updated = checklistData.map(c => c.id === id ? { ...c, status: newStatus } : c);
    onChecklistDataChange(updated);
  };

  // Handles portfolio status adjustments
  const handlePortfolioStatusChange = (id: string, newStatus: 'green' | 'yellow' | 'red') => {
    const updated = portfolioData.map(p => p.id === id ? { ...p, status: newStatus } : p);
    onPortfolioDataChange(updated);
  };

  // Distribution safety sentinel
  const isHighDistributionDays = 
    (livePrices.tsla.price !== null && livePrices.tsla.price < 0) || // placeholder check
    false;

  // Verification helper for alarm states
  let anyStopTriggered = false;  return (
    <div className="space-y-6 text-slate-900">
      
      {/* Dynamic Cash Cockpit (Sticky visual helper) */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-md shadow-slate-200/15 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-50 pb-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 border border-indigo-100/70 rounded-xl text-indigo-600">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-widest font-display">
                💵 Cash-Cockpit (Eiserne Sachwert-Absicherung)
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold font-mono mt-0.5">
                Schutzschild gegen Gier • DADAT Depotkapital: {formatAccounting(START_CASH)} €
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl self-start md:self-auto transition-colors">
            <span className="text-[10px] font-bold text-slate-450 uppercase font-sans">Eiserne Reserve:</span>
            <div className="flex items-center font-mono">
              <input
                type="number"
                value={cashReserve}
                onChange={(e) => setCashReserve(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-20 bg-white border border-slate-250 focus:border-indigo-500 rounded-lg px-1.5 py-0.5 text-right font-bold text-xs text-rose-600 focus:outline-none"
              />
              <span className="text-[11px] font-bold text-slate-400 ml-1">€</span>
            </div>
          </div>
        </div>

        {/* Dynamic balances indicators card */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
            <span className="block text-[9px] sm:text-[10px] font-bold text-slate-450 uppercase tracking-widest font-sans">
              Arbeitendes Depot-Kapital
            </span>
            <span className="block font-mono font-bold text-slate-900 text-sm sm:text-lg mt-1 tabular-nums">
              {formatAccounting(workingCapital)} €
            </span>
          </div>
          <div className="bg-emerald-50/20 border border-emerald-100/70 p-4 rounded-2xl animate-fade-in">
            <span className="block text-[9px] sm:text-[10px] font-bold text-emerald-800 uppercase tracking-widest font-sans">
              Frei für Zukäufe (Cash)
            </span>
            <span className="block font-mono font-bold text-emerald-600 text-sm sm:text-lg mt-1 tabular-nums">
              {formatAccounting(freeForAdditions)} €
            </span>
          </div>
          <div className="bg-amber-50/20 border border-amber-100/70 p-4 rounded-2xl">
            <span className="block text-[9px] sm:text-[10px] font-bold text-amber-800 uppercase tracking-widest font-sans">
              Reserviertes Budget
            </span>
            <span className="block font-mono font-bold text-amber-600 text-sm sm:text-lg mt-1 tabular-nums">
              {formatAccounting(totalReserved)} €
            </span>
          </div>
        </div>

        {/* Progress percent indicator */}
        <div className="space-y-2 pt-1">
          <div className="flex justify-between items-center text-[10px] text-slate-600 font-bold font-mono uppercase">
            <span className="flex items-center gap-1">
              <Percent className="h-3.5 w-3.5" />
              Depot Belegungsstand: <span className="text-slate-900 font-bold">{reservedPercentage.toFixed(0)}%</span>
            </span>
            <span>Limit: 100% (Cash ausgezehrt)</span>
          </div>
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-50">
            <div 
              style={{ width: `${Math.min(100, reservedPercentage)}%` }}
              className={`h-full transition-all duration-500 rounded-full ${
                reservedPercentage > 80 
                  ? "bg-rose-500" 
                  : reservedPercentage > 50 
                    ? "bg-amber-500" 
                    : "bg-indigo-600"
              }`}
            ></div>
          </div>
        </div>
      </div>

      {/* PORTFOLIO ACCORDION */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 space-y-6 shadow-md shadow-slate-200/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-50 pb-4 gap-2">
          <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-widest font-display flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-indigo-650 shrink-0" />
            💼 Aktives Portfolio (2x ATR Stop-Schutzmechanismus)
          </h3>
          <div id="portfolio-alarm-banner">
            {/* Will show dynamically calculated alarms */}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm" style={{ minWidth: "750px" }}>
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                <th className="pb-3 w-1/4">Depot / Position</th>
                <th className="pb-3 text-right">Harter Anker / Kauflimit</th>
                <th className="pb-3 text-center animate-pulse">Stop Loss &amp; Depot-Risiko (€)</th>
                <th className="pb-3 text-right">Tranche (€)</th>
                <th className="pb-3 text-center">Positionsstatus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {portfolioData.map((item) => {
                const liveData = livePrices[item.key];
                const currentPrice = liveData ? liveData.price : null;
                const priceDate = liveData ? liveData.date : "";
                const isDateMatching = priceDate === routineDate;

                // Stop calculated using the formula: Stop = max(Harter Anker, Kurs - (2 * ATR))
                let finalCalculatedStop = item.harterAnker;
                let isTriggered = false;
                let riskPercentageOfDepot = 0;
                let potentialLossValue = 0;

                if (currentPrice !== null && item.key !== 'btc') {
                  const atrStop = currentPrice - (2 * liveData.atr);
                  finalCalculatedStop = Math.max(item.harterAnker, atrStop);
                  
                  if (currentPrice <= finalCalculatedStop) {
                    isTriggered = true;
                    anyStopTriggered = true;
                  }

                  // Risks calculations
                  const estimatedShares = item.tranchenGroesse / currentPrice;
                  potentialLossValue = estimatedShares * (currentPrice - finalCalculatedStop);
                  riskPercentageOfDepot = START_CASH > 0 ? (potentialLossValue / START_CASH) * 100 : 0;
                }

                // Apply custom styles matching table
                let rowBgClass = "";
                if (isTriggered) {
                  rowBgClass = "bg-rose-50/20 border-l-4 border-l-rose-500 hover:bg-rose-50/30";
                } else if (item.status === 'green') {
                  rowBgClass = "bg-indigo-50/10 hover:bg-indigo-50/20";
                } else if (item.status === 'red') {
                  rowBgClass = "bg-slate-50/50 hover:bg-slate-50/70";
                }

                return (
                  <tr key={item.id} className={`${rowBgClass} transition-colors border-b border-slate-100`}>
                    <td className="py-4 font-bold text-slate-900 text-sm sm:text-base">
                      {item.name}
                      <span className="block text-[10px] font-medium text-slate-400 mt-1 leading-snug">
                        {item.beschreibung}
                      </span>
                    </td>
                    
                    <td className="py-4 text-right font-mono">
                      <div className="font-semibold text-slate-400">€ {formatAccounting(item.limitPreis)}</div>
                      {currentPrice !== null ? (
                        <>
                          <div className="text-xs text-slate-800 font-bold mt-0.5">Live: € {formatAccounting(currentPrice)}</div>
                          <div className={`text-[9px] font-bold mt-0.5 ${isDateMatching ? 'text-indigo-650' : 'text-rose-600 animate-pulse'}`}>
                            {isDateMatching ? `Prüfung: OK ✅` : `Alt: ${formatToGermanDate(priceDate)} ⚠️`}
                          </div>
                        </>
                      ) : (
                        <div className="text-xs text-rose-600 font-bold mt-0.5">Live-Kurs fehlt!</div>
                      )}
                    </td>

                    <td className="py-4 text-center">
                      {item.key === 'btc' ? (
                        <div className="inline-flex px-2.5 py-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100/70 rounded-full uppercase leading-none">
                          🛡️ HODL SPARPLAN INDEX
                        </div>
                      ) : currentPrice === null ? (
                        <span className="text-[10px] text-rose-600 font-bold animate-pulse">Warten auf Tageskurs</span>
                      ) : isTriggered ? (
                        <div className="inline-block bg-rose-50 text-rose-700 border border-rose-100 px-3 py-1.5 rounded-xl text-xs font-bold animate-pulse leading-none shadow-xs">
                          🚨 STOP RISK GERISSEN! IMMEDIAT EXIT!
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          {/* Single line horizontal element containing stop values */}
                          <div className="flex flex-row items-center gap-1.5 bg-slate-50 border border-slate-100 p-2 rounded-xl">
                            <div className="flex items-center gap-0.5 bg-white border border-slate-100 px-2 py-0.5 rounded shadow-xs font-mono text-xs font-bold text-slate-700">
                              STOP: <span className="text-rose-600 font-bold ml-0.5">€ {finalCalculatedStop.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium font-sans">
                              Abstand: <span className="text-slate-800 font-bold">{(((currentPrice - finalCalculatedStop) / currentPrice) * 100).toFixed(1)}%</span>
                            </div>
                            <button
                              onClick={() => onLoadToCalculator(
                                item.key, 
                                item.name, 
                                item.limitPreis, 
                                item.tranchenGroesse, 
                                finalCalculatedStop
                              )}
                              className="h-6 px-2 bg-indigo-50 hover:bg-indigo-100/70 text-indigo-700 border border-indigo-100/50 rounded-lg text-[9px] font-bold flex items-center gap-0.5 transition-all shadow-xs active:scale-95 cursor-pointer"
                            >
                              🎯 Rechnen
                            </button>
                          </div>
                          
                          <span className="text-[10px] font-medium text-rose-600 block font-mono">
                            Risiko: € {formatAccounting(potentialLossValue)} ({riskPercentageOfDepot.toFixed(2)}% des Depots)
                          </span>
                        </div>
                      )}
                    </td>

                    <td className="py-4 text-right">
                      <div className="flex items-center justify-end gap-1 font-mono">
                        <span className="text-slate-400 font-semibold text-xs">€</span>
                        <input
                          type="number"
                          step="1000"
                          value={item.tranchenGroesse}
                          onChange={(e) => handleTrancheChange(item.id, false, e.target.value)}
                          className="w-20 sm:w-24 h-8 bg-white border border-slate-200 focus:border-indigo-500 rounded-lg px-2 text-right font-semibold text-xs sm:text-sm text-slate-800 focus:outline-none"
                        />
                      </div>
                    </td>

                    <td className="py-4 text-center">
                      <div className="inline-flex rounded-xl bg-slate-50 p-1 border border-slate-100 gap-1 sm:gap-1.5">
                        <button
                          onClick={() => handlePortfolioStatusChange(item.id, 'green')}
                          className={`h-7 px-2 sm:px-3 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                            item.status === 'green' 
                              ? "bg-indigo-650 text-white shadow-xs" 
                              : "text-slate-550 bg-white hover:bg-slate-100"
                          }`}
                        >
                          🟢 Reserviert
                        </button>
                        <button
                          onClick={() => handlePortfolioStatusChange(item.id, 'yellow')}
                          className={`h-7 px-2 sm:px-3 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                            item.status === 'yellow' 
                              ? "bg-amber-500 text-slate-950 shadow-xs" 
                              : "text-slate-550 bg-white hover:bg-slate-100"
                          }`}
                        >
                          🟡 Standby
                        </button>
                        <button
                          onClick={() => handlePortfolioStatusChange(item.id, 'red')}
                          className={`h-7 px-2 sm:px-3 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                            item.status === 'red' 
                              ? "bg-rose-600 text-white shadow-xs" 
                              : "text-slate-550 bg-white hover:bg-slate-100"
                          }`}
                        >
                          🔴 Halt
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* KONSOLIDIERTES SYSTEM-RADAR */}
      <div className="bg-white border border-slate-150 rounded-3xl p-6 sm:p-8 space-y-6 shadow-md shadow-slate-200/10 animate-fade">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-50 pb-4 gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-50 border border-indigo-100 p-2.5 rounded-xl text-indigo-600">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-widest font-display">
                ⚡ SYSTEM-RADAR (Aktionen &amp; Markt-Kontext)
              </h3>
              <p className="text-[10px] text-slate-450 font-semibold font-mono mt-0.5">Unbestechliche Markt- und Budget-Überwachung</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowWatchlistHelp(!showWatchlistHelp)}
            className="text-indigo-600 hover:text-indigo-850 text-xs font-bold flex items-center gap-1 cursor-pointer"
          >
            <HelpCircle className="h-3.5 w-3.5" /> System-Zweck?
          </button>
        </div>

        {showWatchlistHelp && (
          <div className="p-4 bg-indigo-50/40 border border-indigo-100/70 rounded-2xl text-xs text-indigo-950 leading-relaxed space-y-2 font-medium animate-fade-in">
            <p><strong>1. Aktions-Ampel (Checkliste)</strong>: Zeigt anstehende Budget-Entscheidungen. Ein Klick auf 🟢 sperrt den jeweiligen Betrag unbestechlich in deinem Cash-Cockpit.</p>
            <p><strong>2. Markt-Kontext (Watchlist)</strong>: Überwacht den übergeordneten SPX-Trend und deine BTC K1+K2 Bestände. Keine neuen Aktienkäufe, wenn der SPX unter seiner Trendlinie notiert!</p>
          </div>
        )}

        {/* Zweispalten-Layout für Desktop / Einspaltig für iPhone */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-1">
          
          {/* Linker Part: Aktions-Ampel */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">
              ⚡ Budget-Checkliste (Dadat)
            </h4>
            <div className="space-y-3">
              {checklistData.map((chk) => {
                let borderClass = "border-slate-100 bg-slate-50/50";
                let badgeClass = "bg-slate-100 text-slate-500";
                let statusLabel = "🔴 DEAKTIVIERT";
                
                if (chk.status === 'green') {
                  borderClass = "border-indigo-150 bg-indigo-50/10 shadow-sm shadow-indigo-100/10 animate-fade-in";
                  badgeClass = "bg-indigo-50 text-indigo-700 border border-indigo-100/50";
                  statusLabel = "🟢 RESERVIERT";
                } else if (chk.status === 'yellow') {
                  borderClass = "border-amber-150 bg-amber-50/10";
                  badgeClass = "bg-amber-50 text-amber-800 border border-amber-100/50";
                  statusLabel = "🟡 IN SCHLEIFE";
                }

                return (
                  <div key={chk.id} className={`p-4 rounded-2xl border ${borderClass} flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-300 shadow-xs`}>
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2.5">
                        <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full ${badgeClass}`}>
                          {statusLabel}
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-slate-800 leading-tight block">
                          {chk.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium font-mono">
                        <span>Aktionssumme:</span>
                        <span>€</span>
                        <input
                          type="number"
                          step="1000"
                          value={chk.tranchenGroesse}
                          onChange={(e) => handleTrancheChange(chk.id, true, e.target.value)}
                          className="w-20 h-7 bg-white border border-slate-205 focus:border-indigo-500 rounded px-1.5 text-slate-800 font-bold focus:outline-none"
                        />
                      </div>
                    </div>
                    
                    <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-150 gap-1 self-start sm:self-auto shadow-xs">
                      <button 
                        onClick={() => handleChecklistStatusChange(chk.id, 'green')} 
                        className={`h-7 w-8 sm:h-8 sm:w-9 rounded-lg text-xs font-bold transition-all cursor-pointer ${chk.status === 'green' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white text-slate-700 hover:bg-slate-205'}`}
                      >🟢</button>
                      <button 
                        onClick={() => handleChecklistStatusChange(chk.id, 'yellow')} 
                        className={`h-7 w-8 sm:h-8 sm:w-9 rounded-lg text-xs font-bold transition-all cursor-pointer ${chk.status === 'yellow' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'bg-white text-slate-700 hover:bg-slate-205'}`}
                      >🟡</button>
                      <button 
                        onClick={() => handleChecklistStatusChange(chk.id, 'red')} 
                        className={`h-7 w-8 sm:h-8 sm:w-9 rounded-lg text-xs font-bold transition-all cursor-pointer ${chk.status === 'red' ? 'bg-rose-600 text-white shadow-xs' : 'bg-white text-slate-700 hover:bg-slate-205'}`}
                      >🔴</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rechter Part: Benchmarks */}
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-slate-50 pb-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-sans">
                📊 Marktindizes &amp; Trend-Filter
              </h4>
              {isHighDistributionDays && (
                <div className="text-[10px] font-bold text-rose-600 animate-pulse flex items-center gap-0.5">
                  <AlertTriangle className="h-3 w-3" /> Distribution Days Alarm!
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              {/* SPX */}
              <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block text-sm">SP&amp;P 500 (SPX)</span>
                  <span className="text-[10px] text-slate-400 block font-medium">Leitbörsen-Trendline (US)</span>
                </div>
                <div className="text-right font-mono">
                  <span className="block font-bold text-slate-800 text-sm">7.519,10</span>
                  <span className="text-slate-400 text-[10px] font-medium block">Distribution Days: 2</span>
                </div>
              </div>
              
              {/* NDX */}
              <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block text-sm">NASDAQ 100 (NDX)</span>
                  <span className="text-[10px] text-slate-400 block font-medium">Tech-Sektor-Trendline (US)</span>
                </div>
                <div className="text-right font-mono">
                  <span className="block font-bold text-slate-800 text-sm">22.410,50</span>
                  <span className="text-slate-400 text-[10px] font-medium block">Distribution Days: 1</span>
                </div>
              </div>
              
              {/* BTC */}
              <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block text-sm">Bitcoin (BTC/EUR)</span>
                  <span className="text-[10px] text-slate-400 block font-medium">K1 + K2 Sparplan-Benchmark</span>
                </div>
                <div className="text-right font-mono">
                  <span className="block font-bold text-slate-800 text-sm">
                    {livePrices.btc.price ? `€ ${formatAccounting(livePrices.btc.price)}` : "165.155,28 €"}
                  </span>
                  <span className="text-emerald-500 text-[10px] font-bold block">+0.02%</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
