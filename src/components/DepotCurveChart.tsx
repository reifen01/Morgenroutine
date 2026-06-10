import React, { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from "recharts";
import { TrendingUp, TrendingDown, Target, Wallet, Award, Activity, Percent } from "lucide-react";
import { SoldTradeItem } from "../types";
import { formatAccounting } from "../utils/mathUtils";

interface DepotCurveChartProps {
  soldTrades: SoldTradeItem[];
  customDepots: string[];
  depotStartingCash: Record<string, number>;
}

export default function DepotCurveChart({
  soldTrades,
  customDepots,
  depotStartingCash
}: DepotCurveChartProps) {
  const [chartView, setChartView] = useState<"balance" | "profit">("balance");

  // Sum of starting cash over existing custom depots
  const startingCapital = useMemo(() => {
    let sum = 0;
    customDepots.forEach(dep => {
      sum += depotStartingCash[dep] ?? 40000;
    });
    return sum || 100000; // Fallback to 100k if 0
  }, [customDepots, depotStartingCash]);

  // Compute chronologically sorted data for Recharts
  const statisticsAndChartData = useMemo(() => {
    if (!soldTrades || soldTrades.length === 0) {
      return {
        dataPoints: [],
        metrics: {
          totalNet: 0,
          totalGross: 0,
          totalKest: 0,
          totalVol: 0,
          winRate: 0,
          avgGain: 0,
          profitFactor: 0,
          maxDrawdown: 0,
          performancePercent: 0
        }
      };
    }

    // Sort ascendingly by date
    const sortedSales = [...soldTrades].sort((a, b) => {
      return new Date(a.verkaufsDatum).getTime() - new Date(b.verkaufsDatum).getTime();
    });

    let runningCapital = startingCapital;
    let netGainAccumulator = 0;
    let grossGainAccumulator = 0;
    let kestAccumulator = 0;
    let totalVolumeAccumulator = 0;
    let winsCount = 0;
    let totalGainAmount = 0;
    let totalLossAmount = 0;

    let peakCapital = startingCapital;
    let maxDrawdownValue = 0;

    // Establish day 0 point
    const firstTradeDate = new Date(sortedSales[0].verkaufsDatum);
    const startPointDateStr = new Date(firstTradeDate.getTime() - 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const dataPoints = [
      {
        rawDate: startPointDateStr,
        date: "Start",
        capital: startingCapital,
        netGainAccum: 0,
        grossGainAccum: 0,
        kestAccum: 0,
        relativePerformance: 0,
        tradeName: "Start-Depot",
        tradeDelta: 0
      }
    ];

    sortedSales.forEach((trade) => {
      const netGain = trade.nettoGewinn;
      const grossGain = trade.gewinnVerlust;
      const kest = trade.kestBetrag;
      const tradeVol = trade.verkaufsKurs * trade.anzahlAktien;

      netGainAccumulator += netGain;
      grossGainAccumulator += grossGain;
      kestAccumulator += kest;
      totalVolumeAccumulator += tradeVol;

      runningCapital += netGain;

      // Peak state and Drawdown calculations
      if (runningCapital > peakCapital) {
        peakCapital = runningCapital;
      } else {
        const dd = peakCapital - runningCapital;
        if (dd > maxDrawdownValue) {
          maxDrawdownValue = dd;
        }
      }

      // Win Rate ratios
      if (netGain > 0) {
        winsCount++;
        totalGainAmount += netGain;
      } else if (netGain < 0) {
        totalLossAmount += Math.abs(netGain);
      }

      dataPoints.push({
        rawDate: trade.verkaufsDatum,
        date: new Date(trade.verkaufsDatum).toLocaleDateString("de-DE", {
          day: "2-digit",
          month: "2-digit"
        }),
        capital: runningCapital,
        netGainAccum: netGainAccumulator,
        grossGainAccum: grossGainAccumulator,
        kestAccum: kestAccumulator,
        relativePerformance: ((runningCapital - startingCapital) / startingCapital) * 100,
        tradeName: `${trade.name} (${trade.anzahlAktien}x)`,
        tradeDelta: netGain
      });
    });

    const totalTrades = sortedSales.length;
    const winRate = totalTrades > 0 ? (winsCount / totalTrades) * 100 : 0;
    const avgGain = totalTrades > 0 ? netGainAccumulator / totalTrades : 0;
    const profitFactor = totalLossAmount > 0 ? totalGainAmount / totalLossAmount : totalGainAmount > 0 ? 999 : 0;
    const performancePercent = (netGainAccumulator / startingCapital) * 100;

    return {
      dataPoints,
      metrics: {
        totalNet: netGainAccumulator,
        totalGross: grossGainAccumulator,
        totalKest: kestAccumulator,
        totalVol: totalVolumeAccumulator,
        winRate,
        avgGain,
        profitFactor,
        maxDrawdown: maxDrawdownValue,
        performancePercent
      }
    };
  }, [soldTrades, startingCapital]);

  const { dataPoints, metrics } = statisticsAndChartData;

  // Custom tooltips inside recharts
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-950 text-slate-100 p-4 rounded-xl border border-slate-800 shadow-xl font-sans text-xs space-y-2 max-w-xs">
          <div className="flex justify-between items-center border-b border-slate-800 pb-1.5 font-bold">
            <span className="text-indigo-400">{data.date === "Start" ? "Depot initialisiert" : data.rawDate}</span>
            <span className="text-slate-400 text-[10px]">{data.tradeName}</span>
          </div>
          <div className="space-y-1 font-mono text-[11px]">
            <div className="flex justify-between gap-5">
              <span className="text-slate-400">Veränderung:</span>
              <span className={data.tradeDelta > 0 ? "text-emerald-400 font-bold" : data.tradeDelta < 0 ? "text-rose-400 font-bold" : "text-slate-450"}>
                {data.tradeDelta > 0 ? "+" : ""}{formatAccounting(data.tradeDelta)} €
              </span>
            </div>
            <div className="flex justify-between gap-5">
              <span className="text-slate-400">Depotwert (realisiert):</span>
              <span className="text-white font-bold">{formatAccounting(data.capital)} €</span>
            </div>
            <div className="flex justify-between gap-5">
              <span className="text-slate-400">Netto-Gewinn kumuliert:</span>
              <span className={data.netGainAccum >= 0 ? "text-emerald-400" : "text-rose-400"}>
                {data.netGainAccum >= 0 ? "+" : ""}{formatAccounting(data.netGainAccum)} €
              </span>
            </div>
            <div className="flex justify-between gap-5">
              <span className="text-slate-400">Performance:</span>
              <span className={data.relativePerformance >= 0 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                {data.relativePerformance >= 0 ? "+" : ""}{data.relativePerformance.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (!soldTrades || soldTrades.length === 0) {
    return (
      <div className="bg-white border border-slate-150 rounded-3xl p-6 sm:p-8 space-y-4 text-center ">
        <div className="p-8 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center space-y-2">
          <TrendingUp className="h-8 w-8 text-slate-350 animate-bounce" />
          <h4 className="text-xs sm:text-sm font-bold text-slate-700 font-display uppercase tracking-wider">Keine Realisierten Verkäufe vorhanden</h4>
          <p className="text-xs text-slate-450 max-w-sm leading-relaxed">
            Sobald du den ersten erfolgreichen Verkauf (z.B. bei gerissenem Stop-Loss oder Gewinnmitnahme) im Journal verbucht hast, wird hier die historische Performance-Kurve gezeichnet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 space-y-6 shadow-md shadow-slate-200/10">
      {/* Title & View Selector */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-slate-50 pb-4 gap-4">
        <div>
          <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-widest font-display flex items-center gap-2">
            <Activity className="h-5 w-5 text-indigo-600 shrink-0" />
            📊 Depotwert-Entwicklung &amp; Trading-Statistiken
          </h3>
          <p className="text-[10px] text-slate-400 font-semibold font-mono mt-0.5">
            Historischer Kapitalverlauf basierend auf realisierten Trade-Verkäufen
          </p>
        </div>

        <div className="flex items-center bg-slate-50 border border-slate-150 p-1 rounded-xl self-start sm:self-auto shadow-3xs">
          <button
            type="button"
            onClick={() => setChartView("balance")}
            className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
              chartView === "balance"
                ? "bg-white text-indigo-600 shadow-3xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            💰 Gesamtdepot
          </button>
          <button
            type="button"
            onClick={() => setChartView("profit")}
            className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
              chartView === "profit"
                ? "bg-white text-indigo-600 shadow-3xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            📈 Netto-Gewinn
          </button>
        </div>
      </div>

      {/* Grid of Analytical Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3.5 text-center">
        <div className="bg-slate-50/50 border border-slate-105 p-3 rounded-2xl flex flex-col justify-between shadow-2xs hover:border-slate-200 transition-all">
          <div className="flex justify-center items-center gap-1.5">
            <Wallet className="h-3.5 w-3.5 text-slate-450" />
            <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Startkapital</span>
          </div>
          <span className="block font-mono font-bold text-slate-800 text-xs sm:text-sm mt-1 tabular-nums">
            {formatAccounting(startingCapital)} €
          </span>
        </div>

        <div className="bg-slate-50/50 border border-slate-105 p-3 rounded-2xl flex flex-col justify-between shadow-2xs hover:border-slate-200 transition-all">
          <div className="flex justify-center items-center gap-1.5">
            <Percent className="h-3.5 w-3.5 text-indigo-500" />
            <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Depot-Wachstum</span>
          </div>
          <span className={`block font-mono font-black text-xs sm:text-sm mt-1 tabular-nums ${metrics.performancePercent >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {metrics.performancePercent >= 0 ? "+" : ""}{metrics.performancePercent.toFixed(2)} %
          </span>
        </div>

        <div className="bg-slate-50/50 border border-slate-105 p-3 rounded-2xl flex flex-col justify-between shadow-2xs hover:border-slate-200 transition-all">
          <div className="flex justify-center items-center gap-1.5">
            <Target className="h-3.5 w-3.5 text-emerald-500" />
            <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Trefferquote (WR)</span>
          </div>
          <span className="block font-mono font-bold text-slate-850 text-xs sm:text-sm mt-1 tabular-nums">
            {metrics.winRate.toFixed(1)} %
          </span>
        </div>

        <div className="bg-slate-50/50 border border-slate-105 p-3 rounded-2xl flex flex-col justify-between shadow-2xs hover:border-slate-200 transition-all">
          <div className="flex justify-center items-center gap-1.5">
            <Award className="h-3.5 w-3.5 text-amber-500" />
            <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Profit Factor</span>
          </div>
          <span className="block font-mono font-bold text-slate-850 text-xs sm:text-sm mt-1 tabular-nums">
            {metrics.profitFactor === 999 ? "∞" : metrics.profitFactor.toFixed(2)}
          </span>
        </div>

        <div className="bg-slate-50/50 border border-slate-105 p-3 rounded-2xl col-span-2 md:col-span-1 flex flex-col justify-between shadow-2xs hover:border-slate-200 transition-all">
          <div className="flex justify-center items-center gap-1.5">
            {metrics.maxDrawdown > 0 ? (
              <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
            ) : (
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            )}
            <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Max Drawdown</span>
          </div>
          <span className="block font-mono font-bold text-rose-650 text-xs sm:text-sm mt-1 tabular-nums">
            -{formatAccounting(metrics.maxDrawdown)} €
          </span>
        </div>
      </div>

      {/* Main Recharts Area Container */}
      <div className="h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={dataPoints}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorCapital" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#059669" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="date"
              stroke="#94a3b8"
              fontSize={10}
              fontWeight="medium"
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#94a3b8"
              fontSize={9}
              fontWeight="medium"
              tickLine={false}
              axisLine={false}
              domain={chartView === "balance" ? ["auto", "auto"] : ["auto", "auto"]}
              tickFormatter={(value) => `${formatAccounting(value)} €`}
            />
            <Tooltip content={<CustomTooltip />} />
            
            {chartView === "balance" ? (
              <>
                <ReferenceLine y={startingCapital} stroke="#94a3b8" strokeDasharray="4 4" label={{ value: "Startwert", fill: "#94a3b8", fontSize: 9, position: "top" }} />
                <Area
                  type="monotone"
                  dataKey="capital"
                  name="Gesamtwert"
                  stroke="#4f46e5"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorCapital)"
                  activeDot={{ r: 6, strokeWidth: 1 }}
                  isAnimationActive={false}
                />
              </>
            ) : (
              <>
                <ReferenceLine y={0} stroke="#cbd5e1" strokeDasharray="1 1" />
                <Area
                  type="monotone"
                  dataKey="netGainAccum"
                  name="Netto Gewinn"
                  stroke="#059669"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorProfit)"
                  activeDot={{ r: 6, strokeWidth: 1 }}
                  isAnimationActive={false}
                />
              </>
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="text-[10px] text-slate-400 text-center leading-normal">
        * Der historische Verlauf spiegelt nur die tatsächlich <strong>realisierten (abgeschlossenen) Trades</strong> wider. Laufende, offene Depotpositionen fließen mit ihrem aktuellen Anschaffungswert in das Startkapital ein, um eine unverzerrte Equity-Linie zu sichern.
      </div>
    </div>
  );
}
