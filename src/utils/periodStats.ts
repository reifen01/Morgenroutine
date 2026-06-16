/**
 * Aggregation helpers for the weekly / monthly Auswertung.
 *
 * The daily snapshots captured after each Live-Abruf are grouped by ISO week
 * or calendar month, then reduced to min / max / average for each market
 * indicator plus a GREEN/RED day tally. Nothing here talks to the network —
 * the Pareto learning text is generated separately via the AI endpoint.
 */

import type { DailySnapshot } from "../types";

export type PeriodKind = "week" | "month";

export interface PeriodStats {
  key: string;            // "2026-W24" or "2026-06"
  kind: PeriodKind;
  label: string;          // human readable, e.g. "KW 24 / 2026" or "Juni 2026"
  from: string;           // first snapshot date in the group
  to: string;             // last snapshot date in the group
  dayCount: number;
  greenDays: number;
  redDays: number;
  avg: Record<MetricKey, number | null>;
  min: Record<MetricKey, number | null>;
  max: Record<MetricKey, number | null>;
  snapshots: DailySnapshot[];
}

export type MetricKey = "vix" | "vxv" | "vvix" | "spx" | "wti" | "gas" | "ratio" | "distSpx" | "distNdx";

const METRIC_KEYS: MetricKey[] = ["vix", "vxv", "vvix", "spx", "wti", "gas", "ratio", "distSpx", "distNdx"];

/** ISO-8601 week number. Returns e.g. "2026-W24". */
export function isoWeekKey(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  // Shift to Thursday of the current week (ISO weeks are Mon-Sun, week 1
  // contains the first Thursday of the year).
  const day = (d.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  d.setUTCDate(d.getUTCDate() - day + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const firstDay = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDay + 3);
  const week = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000));
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7); // YYYY-MM
}

const MONTHS_DE = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

function labelFor(key: string, kind: PeriodKind): string {
  if (kind === "month") {
    const [y, m] = key.split("-");
    return `${MONTHS_DE[parseInt(m, 10) - 1]} ${y}`;
  }
  const [y, w] = key.split("-W");
  return `KW ${w} / ${y}`;
}

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function buildPeriods(snapshots: DailySnapshot[], kind: PeriodKind): PeriodStats[] {
  const groups = new Map<string, DailySnapshot[]>();
  for (const s of snapshots) {
    if (!s.date) continue;
    const key = kind === "week" ? isoWeekKey(s.date) : monthKey(s.date);
    const arr = groups.get(key) || [];
    arr.push(s);
    groups.set(key, arr);
  }

  const result: PeriodStats[] = [];
  for (const [key, snaps] of groups) {
    const sorted = [...snaps].sort((a, b) => a.date.localeCompare(b.date));
    const avgRec = {} as Record<MetricKey, number | null>;
    const minRec = {} as Record<MetricKey, number | null>;
    const maxRec = {} as Record<MetricKey, number | null>;
    for (const m of METRIC_KEYS) {
      const vals = sorted
        .map((s) => (s as unknown as Record<MetricKey, number | null>)[m])
        .filter((v): v is number => typeof v === "number" && !isNaN(v));
      avgRec[m] = avg(vals);
      minRec[m] = vals.length ? Math.min(...vals) : null;
      maxRec[m] = vals.length ? Math.max(...vals) : null;
    }
    result.push({
      key,
      kind,
      label: labelFor(key, kind),
      from: sorted[0].date,
      to: sorted[sorted.length - 1].date,
      dayCount: sorted.length,
      greenDays: sorted.filter((s) => s.status === "GREEN").length,
      redDays: sorted.filter((s) => s.status === "RED").length,
      avg: avgRec,
      min: minRec,
      max: maxRec,
      snapshots: sorted,
    });
  }

  // Newest period first
  return result.sort((a, b) => b.key.localeCompare(a.key));
}
