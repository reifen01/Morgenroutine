/**
 * AKTIEN-SCREENER (Tab)
 * ---------------------
 * Bindet den eigenständigen Aktien-Screener (aktien-screener-at.vercel.app)
 * als Tab ein. Eine Codebasis für beide Apps: Änderungen am Screener sind
 * hier sofort sichtbar, ohne die Morgenroutine neu zu bauen.
 *
 * Brücke zur Morgenroutine:
 *  - ?mr=TICKER,… / ?dp=TICKER,… → der Screener bietet an, Morgenroutine-Watchlist
 *    bzw. offene Depot-Positionen in seine Watchlist zu übernehmen
 *  - postMessage {type:"aks-watchlist-add", symbols:[…]} vom Screener
 *    → App.tsx ergänzt fehlende Ticker in der Morgenroutine-Watchlist
 */
import { useState } from "react";
import { ExternalLink } from "lucide-react";
import type { WatchlistItem, PortfolioItem } from "../types";
import { yahooTickerForPortfolio, yahooTickerForWatchlist } from "../utils/yahooMapping";

export const SCREENER_ORIGIN = "https://aktien-screener-at.vercel.app";
export const SCREENER_ORIGINS = [SCREENER_ORIGIN, "https://rabe-screener.vercel.app"];

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
    return `${SCREENER_ORIGIN}/?embed=1${mr ? `&mr=${encodeURIComponent(mr)}` : ""}${dp ? `&dp=${encodeURIComponent(dp)}` : ""}`;
  });

  return (
    <div className="-mx-4 -mt-4 sm:mx-0 sm:mt-0 flex flex-col" style={{ height: "calc(100dvh - 9.5rem)" }}>
      <div className="flex items-center justify-between px-4 sm:px-0 py-2 text-xs text-slate-500">
        <span className="font-semibold text-slate-700">Aktien-Screener · Kriterien nach Jens Rabe</span>
        <a
          href={SCREENER_ORIGIN}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900"
        >
          Eigenes Fenster <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
      <iframe
        title="Aktien-Screener"
        src={src}
        className="flex-1 w-full border-0 bg-white sm:rounded-xl sm:border sm:border-slate-200"
        allow="clipboard-write"
      />
    </div>
  );
}
