/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Intelligent and robust number parser that handles both dot and comma decimal formats,
 * and handles copy-paste strings containing symbols from trading terminals.
 */
export function parseCleanFloat(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  let str = String(val).trim();
  if (str === "") return null;
  
  // Clean characters except numbers, comma, dot, and negative sign
  str = str.replace(/[^\d.,-]/g, "");

  // Tausender-Punkte entfernen (e.g., German 65.155,28 -> 65155.28)
  if (str.includes(',') && str.includes('.')) {
    if (str.indexOf('.') < str.indexOf(',')) {
      // German format: 65.155,28
      str = str.replace(/\./g, "").replace(/,/g, ".");
    } else {
      // US format: 65,155.28
      str = str.replace(/,/g, "");
    }
  } else if (str.includes(',')) {
    // Only comma: 16,91 -> 16.91
    str = str.replace(/,/g, ".");
  }
  
  const match = str.match(/-?\d+(\.\d+)?/);
  return match ? parseFloat(match[0]) : null;
}

/**
 * Parses date inputs into YYYY-MM-DD strings format
 */
export function parseCleanDate(val: string): string {
  if (!val) return "";
  let str = String(val).trim();
  
  // Format DD.MM.YYYY in YYYY-MM-DD
  const deMatch = str.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (deMatch) {
    return `${deMatch[3]}-${deMatch[2]}-${deMatch[1]}`;
  }
  
  // Format YYYYMMDD in YYYY-MM-DD
  const rawMatch = str.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (rawMatch) {
    return `${rawMatch[1]}-${rawMatch[2]}-${rawMatch[3]}`;
  }
  
  return str; // Already YYYY-MM-DD or custom
}

/**
 * Formats numbers into German accounting string (e.g. 150.000,00)
 */
export function formatAccounting(num: number | null | undefined): string {
  if (num === null || isNaN(num as number) || num === undefined) return "0,00";
  return num.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Formats a date format standardly (e.g. YYYY-MM-DD) into DD.MM.YYYY
 */
export function formatToGermanDate(isoDateStr: string): string {
  if (!isoDateStr) return "FEHLT";
  if (isoDateStr.includes('.')) return isoDateStr;
  const parts = isoDateStr.split('-');
  if (parts.length !== 3) return isoDateStr;
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

/**
 * Österreichischer KESt-Satz auf Kapitalerträge (Kursgewinne): 27,5 %.
 * EINE Quelle der Wahrheit — vor der Zentralisierung stand 0.275 direkt
 * in PortfolioTab. Bei einer Gesetzesänderung nur hier anpassen.
 */
export const KEST_SATZ = 0.275;

/** KESt auf einen Gewinn; Verluste ergeben 0 (kein negativer Steuerbetrag). */
export function kestAuf(gewinn: number): number {
  return gewinn > 0 ? gewinn * KEST_SATZ : 0;
}
