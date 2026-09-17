/**
 * VERLAUF NACHFÜLLEN — einzige Stelle für das Zusammenführen von
 * gespeichertem Tagesverlauf und der vom Server gelieferten Markt-Historie.
 *
 * Grundsätze ("Lücken immer richtig nachfüllen"):
 *  1. Fehlende Tage werden NEU angelegt.
 *  2. Bei vorhandenen Tagen werden nur LEERE Felder gefüllt — ein einmal
 *     erfasster Wert wird nie überschrieben.
 *  3. Distribution Days: "manual" bleibt immer stehen. "ai"/"estimate"
 *     (Schätzwerte) werden durch die echte Yahoo-Rechnung ERSETZT, weil
 *     die Quellenregel Yahoo als verlässlich einstuft.
 *  4. Der Tagesstatus (GREEN/RED) kommt aus evaluateMarketHealth — der
 *     einzigen Ampel-Logik — und wird nur neu berechnet, wenn sich am Tag
 *     etwas geändert hat.
 */
import { DailySnapshot, MarketState } from "../types";
import { evaluateMarketHealth } from "./marketHealth";

export interface BackfillRow {
  vix: number | null;
  vxv: number | null;
  vvix: number | null;
  spx: number | null;
  wti: number | null;
  gas: number | null;
  distSpx: number | null;
  distNdx: number | null;
}

export interface BackfillErgebnis {
  merged: DailySnapshot[];
  neuAngelegt: number;
  ergaenzt: number;
}

/** Tagesstatus nach der zentralen Ampel-Regel (kein Duplikat der Regeln). */
export function statusFuerSnapshot(s: Omit<DailySnapshot, "status">): "GREEN" | "RED" {
  const m: MarketState = {
    vix: s.vix, vxv: s.vxv, vvix: s.vvix, spx: s.spx, wti: s.wti, gas: s.gas,
    distSpx: s.distSpx, distNdx: s.distNdx,
    distSource: s.distSource ?? undefined,
  };
  return evaluateMarketHealth(m).healthy ? "GREEN" : "RED";
}

const WERTE: (keyof BackfillRow & keyof DailySnapshot)[] = ["vix", "vxv", "vvix", "spx", "wti", "gas"];

export function mergeBackfill(
  vorhanden: DailySnapshot[],
  geholt: Record<string, BackfillRow>,
  heute: string
): BackfillErgebnis {
  const byDate = new Map<string, DailySnapshot>();
  for (const s of vorhanden) byDate.set(s.date, s);

  let neuAngelegt = 0;
  let ergaenzt = 0;

  for (const [date, row] of Object.entries(geholt)) {
    if (date >= heute) continue; // heute kommt aus dem Live-Abruf, nicht aus der Historie
    const alt = byDate.get(date);

    if (!alt) {
      const distDa = row.distSpx !== null && row.distNdx !== null;
      const basis: Omit<DailySnapshot, "status"> = {
        date,
        vix: row.vix, vxv: row.vxv, vvix: row.vvix, spx: row.spx, wti: row.wti, gas: row.gas,
        distSpx: row.distSpx ?? 0,
        distNdx: row.distNdx ?? 0,
        distSource: distDa ? "yahoo" : null,
        ratio: row.vix && row.vxv ? row.vix / row.vxv : null,
      };
      byDate.set(date, { ...basis, status: statusFuerSnapshot(basis) });
      neuAngelegt++;
      continue;
    }

    // Vorhandener Tag: nur Lücken füllen.
    const neu: DailySnapshot = { ...alt };
    let geaendert = false;
    for (const k of WERTE) {
      if ((neu[k] === null || neu[k] === undefined) && row[k] !== null) {
        (neu as any)[k] = row[k];
        geaendert = true;
      }
    }
    const distDa = row.distSpx !== null && row.distNdx !== null;
    const distUnsicher = alt.distSource !== "manual" && alt.distSource !== "yahoo";
    if (distDa && distUnsicher) {
      neu.distSpx = row.distSpx as number;
      neu.distNdx = row.distNdx as number;
      neu.distSource = "yahoo";
      geaendert = true;
    }
    if ((neu.ratio === null || neu.ratio === undefined) && neu.vix && neu.vxv) {
      neu.ratio = neu.vix / neu.vxv;
      geaendert = true;
    }
    if (geaendert) {
      const { status: _alt, ...basis } = neu;
      neu.status = statusFuerSnapshot(basis);
      byDate.set(date, neu);
      ergaenzt++;
    }
  }

  const merged = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
  return { merged, neuAngelegt, ergaenzt };
}
