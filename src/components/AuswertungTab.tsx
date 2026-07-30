/**
 * Weekly / monthly Auswertung built from the daily market snapshots that
 * accumulate after each Live-Abruf. Per period it shows aggregate stats and
 * an editable Pareto-learning note (AI draft + manual edits).
 */

import { useMemo, useState } from "react";
import { CalendarDays, CalendarRange, Sparkles, Save, TrendingUp } from "lucide-react";
import type { DailySnapshot, PeriodLearning, SoldTradeItem } from "../types";
import Ertraegnisaufstellung from "./Ertraegnisaufstellung";
import { buildPeriods, type PeriodKind, type PeriodStats } from "../utils/periodStats";

interface Props {
  dailyHistory: DailySnapshot[];
  periodLearnings: PeriodLearning[];
  onSaveLearning: (learning: PeriodLearning) => void;
  onShowToast: (title: string, msg: string, type: "success" | "warning" | "error") => void;
  soldTrades: SoldTradeItem[];
}

function fmt(n: number | null, digits = 2): string {
  if (n == null || isNaN(n)) return "—";
  return n.toLocaleString("de-DE", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export default function AuswertungTab({ dailyHistory, periodLearnings, onSaveLearning, onShowToast, soldTrades }: Props) {
  const [ansicht, setAnsicht] = useState<"routine" | "ertraege">("routine");
  const [kind, setKind] = useState<PeriodKind>("week");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const periods = useMemo(() => buildPeriods(dailyHistory, kind), [dailyHistory, kind]);

  const learningFor = (key: string) => periodLearnings.find((l) => l.periodKey === key);
  const draftFor = (key: string) => drafts[key] ?? learningFor(key)?.text ?? "";

  const generateDraft = async (period: PeriodStats) => {
    setBusyKey(period.key);
    try {
      const resp = await fetch("/api/analyze-period", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: period.label,
          kind: period.kind,
          snapshots: period.snapshots,
          stats: { avg: period.avg, min: period.min, max: period.max, greenDays: period.greenDays, redDays: period.redDays },
        }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${resp.status}`);
      }
      const data = await resp.json();
      setDrafts((prev) => ({ ...prev, [period.key]: data.text || "" }));
      onShowToast("KI-Entwurf erstellt", "Du kannst den Text jetzt anpassen und speichern.", "success");
    } catch (e: any) {
      onShowToast("Analyse fehlgeschlagen", e?.message || "Konnte keinen Entwurf erstellen.", "error");
    } finally {
      setBusyKey(null);
    }
  };

  const save = (period: PeriodStats) => {
    onSaveLearning({
      periodKey: period.key,
      kind: period.kind,
      text: draftFor(period.key),
      updatedAt: new Date().toISOString(),
    });
    onShowToast("Learning gespeichert", `Pareto-Notiz für ${period.label} gesichert.`, "success");
  };

  return (
    <div className="space-y-6">
      {/* Umschalter: Routine-Auswertung vs. Erträgnisaufstellung */}
      <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 w-fit">
        <button
          onClick={() => setAnsicht("routine")}
          className={"px-3 py-1.5 rounded-lg text-xs font-bold transition-colors " + (ansicht === "routine" ? "bg-slate-900 text-white" : "text-slate-600")}
        >
          Routine-Auswertung
        </button>
        <button
          onClick={() => setAnsicht("ertraege")}
          className={"px-3 py-1.5 rounded-lg text-xs font-bold transition-colors " + (ansicht === "ertraege" ? "bg-slate-900 text-white" : "text-slate-600")}
        >
          Erträgnisaufstellung
        </button>
      </div>

      {ansicht === "ertraege" ? (
        <Ertraegnisaufstellung soldTrades={soldTrades} />
      ) : (
      <>
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-md">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 font-display flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-slate-800" />
              Routine-Auswertung
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Aus deinen täglichen Live-Abrufen entsteht automatisch eine Wochen- und Monatsübersicht.
              Die KI fasst nach dem Pareto-Prinzip zusammen, was am Markt wichtig war.
            </p>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setKind("week")}
              className={"flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors " + (kind === "week" ? "bg-slate-900 text-white" : "text-slate-600")}
            >
              <CalendarDays className="h-4 w-4" /> Woche
            </button>
            <button
              onClick={() => setKind("month")}
              className={"flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors " + (kind === "month" ? "bg-slate-900 text-white" : "text-slate-600")}
            >
              <CalendarRange className="h-4 w-4" /> Monat
            </button>
          </div>
        </div>
      </div>

      {periods.length === 0 && (
        <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-8 text-center text-sm text-slate-500">
          Noch keine Tagesdaten erfasst. Mach auf der Morgenroutine einen <strong>„🌐 Marktwerte holen"</strong>-Abruf —
          ab dann sammelt sich hier automatisch deine Wochen- und Monatsübersicht.
        </div>
      )}

      {periods.map((period) => {
        const learning = learningFor(period.key);
        return (
          <div key={period.key} className="bg-white border border-slate-100 rounded-3xl p-5 sm:p-6 shadow-md space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 font-display">{period.label}</h3>
              <div className="flex items-center gap-2 text-[11px] font-mono">
                <span className="text-slate-400">{period.from} → {period.to}</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">{period.greenDays} GRÜN</span>
                <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">{period.redDays} ROT</span>
              </div>
            </div>

            {/* Aggregate stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {([
                ["VIX", "vix"], ["VXV", "vxv"], ["VVIX", "vvix"], ["SPX", "spx"],
                ["WTI", "wti"], ["Gas", "gas"], ["VIX/VXV", "ratio"],
              ] as const).map(([label, key]) => (
                <div key={key} className="bg-slate-50 border border-slate-100 rounded-xl p-2.5">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">{label}</div>
                  <div className="font-mono font-bold text-slate-800">Ø {fmt(period.avg[key])}</div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {fmt(period.min[key])} – {fmt(period.max[key])}
                  </div>
                </div>
              ))}
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Dist. Days</div>
                <div className="font-mono font-bold text-slate-800">SPX Ø {fmt(period.avg.distSpx, 1)}</div>
                <div className="text-[10px] text-slate-400 font-mono">NDX Ø {fmt(period.avg.distNdx, 1)}</div>
              </div>
            </div>

            {/* Pareto learning */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" /> Pareto-Learning
                </label>
                <button
                  onClick={() => generateDraft(period)}
                  disabled={busyKey === period.key}
                  className="text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {busyKey === period.key ? "Analysiere…" : "KI-Entwurf erstellen"}
                </button>
              </div>
              <textarea
                value={draftFor(period.key)}
                onChange={(e) => setDrafts((prev) => ({ ...prev, [period.key]: e.target.value }))}
                rows={6}
                placeholder={'Klick „KI-Entwurf erstellen" für eine automatische Pareto-Zusammenfassung — oder schreib deine eigenen Learnings hier rein.'}
                className="w-full text-xs leading-relaxed bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300 font-sans whitespace-pre-wrap"
              />
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400">
                  {learning ? `Zuletzt gespeichert: ${new Date(learning.updatedAt).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })}` : "Noch nicht gespeichert"}
                </span>
                <button
                  onClick={() => save(period)}
                  className="text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Save className="h-3.5 w-3.5" /> Speichern
                </button>
              </div>
            </div>
          </div>
        );
      })}
      </>
      )}
    </div>
  );
}
