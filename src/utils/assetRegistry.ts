/**
 * ZENTRALES ASSET-REGISTER
 * ------------------------
 * Die EINE Quelle der Wahrheit für alle bekannten Assets.
 * Zusammengeführt aus:
 *   1. Depot-Positionen (portfolioData)  — inkl. Limits/Anker
 *   2. ⭐ Favoriten-Watchlist (Rechner)   — Symbol + Name
 *   3. Kern-Assets (Fallback-Metadaten)
 *
 * Ziel: Neue Assets erfordern KEINE Codeänderung an mehreren
 * Stellen mehr. Dropdowns, Tabellen und Wächter lesen von hier.
 */
import { PortfolioItem, WatchlistItem } from "../types";

export interface RegisteredAsset {
  key: string;                 // Kleingeschriebener Schlüssel, z.B. "tsla"
  name: string;                // Anzeigename, z.B. "Tesla, Inc."
  limit: number;               // Kauflimit in €; 0 = kein Limit gesetzt
  source: "depot" | "watchlist" | "core";
}

/** Kern-Assets als Fallback (nur Metadaten, Limits kommen aus dem Depot) */
export const CORE_ASSETS: ReadonlyArray<Omit<RegisteredAsset, "source">> = [
  { key: "tsla", name: "Tesla, Inc.", limit: 0 },
  { key: "now",  name: "ServiceNow, Inc.", limit: 0 },
  { key: "baba", name: "Alibaba Group Holding Ltd.", limit: 0 },
  { key: "btc",  name: "Bitcoin Tracker Index", limit: 0 },
];

/**
 * Baut das Register auf. Prioritäten bei Duplikaten:
 * Depot (hat Limits) > Kern > Watchlist.
 */
export function buildAssetRegistry(
  portfolioData: PortfolioItem[],
  watchlist: WatchlistItem[]
): Map<string, RegisteredAsset> {
  const reg = new Map<string, RegisteredAsset>();

  // 3. Watchlist zuerst (niedrigste Priorität, wird ggf. überschrieben)
  watchlist.forEach((w) => {
    const key = w.symbol.trim().toLowerCase();
    if (!key) return;
    reg.set(key, {
      key,
      name: w.name?.trim() || w.symbol.toUpperCase(),
      limit: 0,
      source: "watchlist",
    });
  });

  // 2. Kern-Assets
  CORE_ASSETS.forEach((c) => {
    reg.set(c.key, { ...c, source: "core" });
  });

  // 1. Depot-Positionen (höchste Priorität — bringen Limits mit)
  portfolioData.forEach((p) => {
    const key = String(p.key).trim().toLowerCase();
    if (!key) return;
    reg.set(key, {
      key,
      name: p.name,
      limit: p.limitPreis > 0 ? p.limitPreis : 0,
      source: "depot",
    });
  });

  return reg;
}

/** Name eines Assets auflösen; Fallback: Key in Großbuchstaben */
export function resolveAssetName(
  key: string,
  registry: Map<string, RegisteredAsset>
): string {
  return registry.get(key.trim().toLowerCase())?.name || key.toUpperCase();
}

/** Kauflimit eines Assets; 0 = keines gesetzt */
export function limitFor(
  key: string,
  registry: Map<string, RegisteredAsset>
): number {
  return registry.get(key.trim().toLowerCase())?.limit ?? 0;
}

/** Sortierte Liste für Dropdowns, gruppiert nach Quelle */
export function registryGroups(registry: Map<string, RegisteredAsset>): {
  depot: RegisteredAsset[];
  watchlist: RegisteredAsset[];
} {
  const all = Array.from(registry.values());
  const byName = (a: RegisteredAsset, b: RegisteredAsset) =>
    a.name.localeCompare(b.name, "de");
  return {
    depot: all.filter((a) => a.source !== "watchlist").sort(byName),
    watchlist: all.filter((a) => a.source === "watchlist").sort(byName),
  };
}
