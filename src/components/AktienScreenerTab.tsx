/**
 * AKTIEN-SCREENER (Tab)
 * ---------------------
 * Bindet den eigenständigen Aktien-Screener (aktien-screener-at.vercel.app)
 * als Tab ein. Eine Codebasis für beide Apps: Änderungen am Screener sind
 * hier sofort sichtbar, ohne die Morgenroutine neu zu bauen.
 *
 * Brücke zur Morgenroutine:
 *  - ?mr=TICKER,…  → der Screener bietet an, die Morgenroutine-Watchlist zu übernehmen
 *  - postMessage {type:"aks-watchlist-add", symbols:[…]} vom Screener
 *    → App.tsx ergänzt fehlende Ticker in der Morgenroutine-Watchlist
 */
import { useState } from "react";
import { ExternalLink } from "lucide-react";
import type { WatchlistItem } from "../types";

export const SCREENER_ORIGIN = "https://aktien-screener-at.vercel.app";
export const SCREENER_ORIGINS = [SCREENER_ORIGIN, "https://rabe-screener.vercel.app"];

interface Props {
  watchlist: WatchlistItem[];
}

export default function AktienScreenerTab({ watchlist }: Props) {
  // URL nur einmal beim Öffnen bilden – sonst lädt der iframe bei jeder
  // Watchlist-Änderung neu und ein laufender Scan ginge verloren.
  const [src] = useState(() => {
    const mr = watchlist.map((w) => w.symbol?.trim().toUpperCase()).filter(Boolean).join(",");
    return `${SCREENER_ORIGIN}/?embed=1${mr ? `&mr=${encodeURIComponent(mr)}` : ""}`;
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
