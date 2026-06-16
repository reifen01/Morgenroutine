/**
 * Backup file format for "Aktien-Liste" (private user data).
 *
 * Schema (JSON, downloaded as .json):
 * {
 *   magic:        "MR-BACKUP-1"             // identifier for the restore importer
 *   v:            1                          // schema version, bump on breaking changes
 *   mode:         "pin" | "password"         // hint for the unlock UI
 *   iv:           "<base64>"                 // 96-bit IV (AES-GCM)
 *   ciphertext:   "<base64>"                 // encrypted JSON payload
 *   lastModified: "ISO 8601"                 // when the user generated the backup
 *   summary: {                                // unencrypted preview for compare UI
 *     portfolioCount, watchlistCount, purchaseCount, soldTradeCount
 *   }
 * }
 *
 * The `summary` block leaks only counts, never values — acceptable trade-off
 * so the restore dialog can show "Backup is older/newer" without prompting
 * for the PIN first.
 */

import { decryptJson, encryptJson } from "./encryption";
import type { PortfolioItem, WatchlistItem, LivePrices, ChecklistItem, SoldTradeItem, PortfolioPurchase, DailySnapshot, PeriodLearning } from "../types";

export const BACKUP_MAGIC = "MR-BACKUP-1";
export const BACKUP_VERSION = 1;

export interface BackupSummary {
  portfolioCount: number;
  watchlistCount: number;
  purchaseCount: number;
  soldTradeCount: number;
}

export interface BackupFile {
  magic: typeof BACKUP_MAGIC;
  v: number;
  mode: "pin" | "password";
  iv: string;
  ciphertext: string;
  lastModified: string;
  summary: BackupSummary;
}

/** Contents that get encrypted inside the backup. */
export interface BackupPayload {
  portfolio: PortfolioItem[];
  watchlist: WatchlistItem[];
  livePrices: LivePrices;
  purchases: PortfolioPurchase[];
  soldTrades: SoldTradeItem[];
  checklist: ChecklistItem[];
  customDepots: string[];
  customBesitzer: string[];
  depotStartingCash: Record<string, number> | number;
  /** Daily market snapshots for the weekly/monthly Auswertung (optional —
   *  older backups won't have it). */
  dailyHistory?: DailySnapshot[];
  /** User Pareto learnings per period (optional). */
  periodLearnings?: PeriodLearning[];
}

function summarize(payload: BackupPayload): BackupSummary {
  return {
    portfolioCount: payload.portfolio.length,
    watchlistCount: payload.watchlist.length,
    purchaseCount: payload.purchases.length,
    soldTradeCount: payload.soldTrades.length,
  };
}

export async function createBackup(
  secret: string,
  mode: "pin" | "password",
  payload: BackupPayload
): Promise<BackupFile> {
  const { iv, ciphertext } = await encryptJson(secret, payload);
  return {
    magic: BACKUP_MAGIC,
    v: BACKUP_VERSION,
    mode,
    iv,
    ciphertext,
    lastModified: new Date().toISOString(),
    summary: summarize(payload),
  };
}

export function isBackupFile(value: unknown): value is BackupFile {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return (
    obj.magic === BACKUP_MAGIC &&
    typeof obj.v === "number" &&
    typeof obj.iv === "string" &&
    typeof obj.ciphertext === "string" &&
    typeof obj.lastModified === "string"
  );
}

export async function decryptBackup(
  secret: string,
  file: BackupFile
): Promise<BackupPayload> {
  return decryptJson<BackupPayload>(secret, { iv: file.iv, ciphertext: file.ciphertext });
}

/**
 * Build a human-readable backup filename in the user's local timezone, e.g.
 * `Morgenroutine_20260612_1826_MESZ_AES256.json`. Timezone abbreviation is
 * resolved via `Intl.DateTimeFormat` with the de-DE locale so users in
 * Central Europe see MEZ/MESZ; falls back to `LOCAL` if detection fails.
 */
function buildBackupFilename(iso: string, encrypted: boolean): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyymmdd = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const hhmm = `${pad(d.getHours())}${pad(d.getMinutes())}`;
  let tz = "LOCAL";
  try {
    const parts = new Intl.DateTimeFormat("de-DE", {
      timeZoneName: "short",
    }).formatToParts(d);
    const tzPart = parts.find((p) => p.type === "timeZoneName")?.value;
    if (tzPart) tz = tzPart.replace(/[^A-Za-z]/g, "");
  } catch {
    /* fallback to LOCAL */
  }
  const tag = encrypted ? "_AES256" : "";
  return `Morgenroutine_${yyyymmdd}_${hhmm}_${tz}${tag}.json`;
}

/** Trigger a browser download of the backup file. */
export function downloadBackup(file: BackupFile, filename?: string) {
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || buildBackupFilename(file.lastModified, true);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Parse a File object (from <input type="file">) into a BackupFile. */
export async function parseBackupFile(file: File): Promise<BackupFile> {
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Die Datei ist kein gültiges JSON.");
  }
  if (!isBackupFile(parsed)) {
    throw new Error("Diese Datei sieht nicht wie ein Morgenroutine-Backup aus.");
  }
  return parsed;
}

/**
 * Older Morgenroutine V8 export format — plain JSON, no encryption.
 * Field names differ slightly from the new {@link BackupPayload}; this
 * adapter folds them into the current shape so the same restore path can
 * load both. The legacy file also carries marketState which we intentionally
 * drop (the new flow always re-fetches market values from Yahoo).
 */
interface LegacyV8Backup {
  meta?: { appVersion?: string; date?: string; createdTime?: string };
  marketState?: unknown;
  livePrices?: LivePrices;
  portfolioData?: PortfolioItem[];
  checklistData?: ChecklistItem[];
  soldTrades?: SoldTradeItem[];
  portfolioPurchases?: PortfolioPurchase[];
  customDepots?: string[];
  customBesitzer?: string[];
  depotStartingCash?: Record<string, number> | number;
  watchlist?: WatchlistItem[];
}

function isLegacyV8Backup(value: unknown): value is LegacyV8Backup {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  // The combination of these fields is a strong signal that this is a
  // pre-encryption Morgenroutine export.
  return Array.isArray(obj.portfolioData) && Array.isArray(obj.portfolioPurchases);
}

function legacyToPayload(legacy: LegacyV8Backup): BackupPayload {
  const liveDefault: LivePrices = {
    tsla: { price: null, date: "", atr: 0 },
    now: { price: null, date: "", atr: 0 },
    baba: { price: null, date: "", atr: 0 },
    btc: { price: null, date: "", atr: 0 },
  };
  return {
    portfolio: legacy.portfolioData ?? [],
    watchlist: legacy.watchlist ?? [],
    livePrices: legacy.livePrices ?? liveDefault,
    purchases: legacy.portfolioPurchases ?? [],
    soldTrades: legacy.soldTrades ?? [],
    checklist: legacy.checklistData ?? [],
    customDepots: legacy.customDepots ?? [],
    customBesitzer: legacy.customBesitzer ?? [],
    depotStartingCash: legacy.depotStartingCash ?? {},
  };
}

function summarizePayload(payload: BackupPayload): BackupSummary {
  return {
    portfolioCount: payload.portfolio.length,
    watchlistCount: payload.watchlist.length,
    purchaseCount: payload.purchases.length,
    soldTradeCount: payload.soldTrades.length,
  };
}

/**
 * Discriminated parse result: an encrypted backup needs a PIN before any
 * data is visible; a legacy V8 backup is plaintext and can be restored
 * directly.
 */
export type ParsedBackup =
  | { kind: "encrypted"; file: BackupFile }
  | {
      kind: "legacy";
      payload: BackupPayload;
      summary: BackupSummary;
      lastModified: string;
      sourceVersion: string;
    };

export async function parseAnyBackup(file: File): Promise<ParsedBackup> {
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Die Datei ist kein gültiges JSON.");
  }
  if (isBackupFile(parsed)) {
    return { kind: "encrypted", file: parsed };
  }
  if (isLegacyV8Backup(parsed)) {
    const payload = legacyToPayload(parsed);
    const lastModified =
      parsed.meta?.createdTime ||
      (parsed.meta?.date ? `${parsed.meta.date}T00:00:00.000Z` : new Date().toISOString());
    return {
      kind: "legacy",
      payload,
      summary: summarizePayload(payload),
      lastModified,
      sourceVersion: parsed.meta?.appVersion || "V8",
    };
  }
  throw new Error("Diese Datei sieht nicht wie ein Morgenroutine-Backup aus.");
}
