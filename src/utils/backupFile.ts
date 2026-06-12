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
import type { PortfolioItem, WatchlistItem, LivePrices, ChecklistItem, SoldTradeItem, PortfolioPurchase } from "../types";

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

/** Trigger a browser download of the backup file. */
export function downloadBackup(file: BackupFile, filename?: string) {
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const ts = file.lastModified.replace(/[:.]/g, "-");
  a.download = filename || `morgenroutine-backup-${ts}.json`;
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
