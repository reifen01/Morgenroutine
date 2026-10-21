/**
 * AKTIEN-SCREENER (Unter-Tab von „Analyse“)
 * -----------------------------------------
 * Der Aktien-Screener ist fest in der Morgenroutine eingebaut: Seite unter
 * public/screener/index.html, Daten über /api/screener/* (screenerApi.ts).
 * Er läuft als eigene Seite im iframe (gleiche Adresse wie die App).
 *
 * Einmaliger Umzug: Früher lief der Screener unter aktien-screener-at.vercel.app
 * und hat dort seine Daten (rabe.*: Liste, Verlauf, Basis, Notizen, Filter)
 * gespeichert. Beim ersten Öffnen holt der Tab sie einmal von dort ab
 * (?export=1, postMessage nur von dieser Adresse) und merkt sich das in
 * morgenroutine_screener_umzug.
 *
 * Brücke zur Morgenroutine:
 *  - ?mr=TICKER,… / ?dp=TICKER,… → der Screener bietet an, Morgenroutine-Watchlist
 *    bzw. offene Depot-Positionen in seine Watchlist zu übernehmen
 *  - postMessage {type:"aks-watchlist-add", symbols:[…]} vom Screener
 *    → App.tsx ergänzt fehlende Ticker in der Morgenroutine-Watchlist
 */
import { useEffect, useState } from "react";
import type { WatchlistItem, PortfolioItem } from "../types";
import { yahooTickerForPortfolio, yahooTickerForWatchlist } from "../utils/yahooMapping";

/** Screener-Seite in der App (gleiche Adresse). */
export const SCREENER_PFAD = "/screener/index.html";
/** Nachrichten vom Screener nur von der eigenen Adresse annehmen. */
export const SCREENER_ORIGINS = [typeof window !== "undefined" ? window.location.origin : ""];
/** Frühere Adresse — nur noch für die einmalige Datenübernahme. */
const ALT_SCREENER = "https://aktien-screener-at.vercel.app";
const UMZUG_MERKER = "morgenroutine_screener_umzug";

function umzugErledigt(): boolean {
  try { return !!localStorage.getItem(UMZUG_MERKER); } catch { return true; }
}

interface Props {
  watchlist: WatchlistItem[];
  portfolio: PortfolioItem[];
}

// Deutsche Tradegate-/Frankfurt-Kürzel der Morgenroutine → US-Ticker für den Screener.
const ALIAS_US: Record<string, string> = {
  TL0: "TSLA", TLO: "TSLA", "4S0": "NOW", "4S0L": "NOW", NFC: "NFLX", NETFLIX: "NFLX", AHLA: "BABA",
  BABA: "BABA", TSLA: "TSLA", NOW: "NOW", NFLX: "NFLX",
};
const KEIN_AKTIENWERT = new Set(["BTC", "BTCEUR", "BTC-EUR", "ETH", "ETH-EUR", "GOLD", "XAU"]);

/** Ticker aus der Morgenroutine in einen US-Ticker für den Screener übersetzen (null = überspringen). */
export function usTicker(raw?: string | null): string | null {
  if (!raw) return null;
  let t = raw.trim().toUpperCase();
  if (!t || KEIN_AKTIENWERT.has(t)) return null;
  // Deutsche Zweitlistung eines US-Titels (TL0.F, NFC.DE …) → US-Original für die Rabe-Analyse.
  // Andere Börsenplätze (z. B. VOW3.DE) bleiben unverändert – Yahoo kennt sie.
  const basis = t.replace(/\.(F|DE|MU|SG|BE|DU|HM|HA|TG)$/, "");
  if (ALIAS_US[basis]) t = ALIAS_US[basis];
  if (KEIN_AKTIENWERT.has(t)) return null;
  return /^[A-Z0-9.\-]{1,12}$/.test(t) ? t : null;
}

function liste(werte: (string | null)[]): string {
  return [...new Set(werte.filter((x): x is string => !!x))].join(",");
}

export default function AktienScreenerTab({ watchlist, portfolio }: Props) {
  // URL nur einmal beim Öffnen bilden – sonst lädt der iframe bei jeder
  // Watchlist-Änderung neu und ein laufender Scan ginge verloren.
  const [src] = useState(() => {
    const mr = liste(watchlist.map((w) => usTicker(yahooTickerForWatchlist(w) || w.symbol)));
    const dp = liste(portfolio.filter((p) => p.status !== "sold").map((p) => usTicker(yahooTickerForPortfolio(p))));
    return `${SCREENER_PFAD}?embed=1${mr ? `&mr=${encodeURIComponent(mr)}` : ""}${dp ? `&dp=${encodeURIComponent(dp)}` : ""}`;
  });

  // Einmalige Übernahme der alten Screener-Daten (siehe Kopfkommentar).
  // Der Screener selbst startet erst danach, damit er nichts vorher überschreibt.
  const [umzugLaeuft, setUmzugLaeuft] = useState(() => !umzugErledigt());
  useEffect(() => {
    if (!umzugLaeuft) return;
    // Alte Seite nicht erreichbar → ohne Übernahme weiter, beim nächsten Öffnen erneut versuchen
    const abbruch = setTimeout(() => setUmzugLaeuft(false), 12000);
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== ALT_SCREENER) return;
      const d = e.data as { type?: string; data?: unknown };
      if (d?.type !== "aks-export") return;
      try {
        if (d.data && typeof d.data === "object") {
          for (const [k, v] of Object.entries(d.data as Record<string, unknown>)) {
            // nur Screener-Schlüssel, nur fehlende ergänzen
            if (k.startsWith("rabe.") && typeof v === "string" && localStorage.getItem(k) === null) {
              localStorage.setItem(k, v);
            }
          }
        }
        localStorage.setItem(UMZUG_MERKER, new Date().toISOString());
      } catch {
        /* Speicher nicht verfügbar — beim nächsten Öffnen erneut */
      }
      clearTimeout(abbruch);
      setUmzugLaeuft(false);
    };
    window.addEventListener("message", onMsg);
    return () => { clearTimeout(abbruch); window.removeEventListener("message", onMsg); };
  }, [umzugLaeuft]);

  return (
    <div className="flex flex-col" style={{ height: "calc(100dvh - 12.5rem)" }}>
      {/* Keine eigene Kopfzeile: der Screener zeigt seinen Titel selbst; „Eigenes Fenster" entfällt (eingebaut). */}
      {umzugLaeuft ? (
        <>
          <div className="flex-1 flex items-center justify-center text-[13px] font-semibold text-slate-600 px-4 text-center">
            Übernehme deine bisherigen Screener-Daten (Liste, Verlauf, Notizen) …
          </div>
          <iframe title="Screener-Datenübernahme" src={`${ALT_SCREENER}/?export=1`} className="hidden" />
        </>
      ) : (
      <iframe
        title="Aktien-Screener"
        src={src}
        className="flex-1 w-full border-0 bg-white sm:rounded-xl sm:border sm:border-slate-200"
        allow="clipboard-write"
      />
      )}
    </div>
  );
}
