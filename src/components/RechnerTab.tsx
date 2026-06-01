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
  RefreshCw
} from "lucide-react";
import { parseCleanFloat, formatAccounting } from "../utils/mathUtils";

interface RechnerTabProps {
  routineDate: string;
}

export default function RechnerTab({ routineDate }: RechnerTabProps) {
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
                <label className="block text-xs font-bold text-slate-450 uppercase mb-2 tracking-wider">
                  Wechselkurs (EUR/USD)
                </label>
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
                  Einstieg ($ / HKD)
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
                    Stop-Loss ($ / HKD)
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
                  Kursziel ($ / HKD)
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
