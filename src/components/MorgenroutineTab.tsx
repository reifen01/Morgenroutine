/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, ChangeEvent } from "react";
import { 
  CheckCircle, 
  HelpCircle, 
  AlertTriangle, 
  Flame, 
  ArrowRight, 
  Clipboard,
  Coins,
  Zap,
  ChevronDown,
  ChevronUp,
  Camera,
  Loader2,
  Copy,
  Check,
  Sparkles
} from "lucide-react";
import { MarketState, LivePrices, PortfolioItem, WatchlistItem, DailySnapshot } from "../types";
import { MARKET_SYMBOLS, YAHOO_TO_MARKET_KEY, SPX_SURROGATE_SYMBOL, SPX_SURROGATE_MULTIPLIER, yahooCandidatesForPortfolio, yahooCandidatesForWatchlist } from "../utils/yahooMapping";
import { 
  parseCleanFloat, 
  parseCleanDate,
  formatAccounting, 
  formatToGermanDate 
} from "../utils/mathUtils";

interface DecimalInputProps {
  value: number | null;
  onChange: (val: number | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

function DecimalInput({ value, onChange, placeholder, className, disabled }: DecimalInputProps) {
  const [localValue, setLocalValue] = useState<string>("");

  useEffect(() => {
    if (value === null || value === undefined) {
      setLocalValue("");
    } else {
      const parsedLocal = parseFloat(localValue.replace(',', '.'));
      if (isNaN(parsedLocal) || parsedLocal !== value) {
        setLocalValue(String(value).replace('.', ','));
      }
    }
  }, [value]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value;
    raw = raw.replace(/[^\d.,-]/g, "");
    setLocalValue(raw);

    const normalized = raw.replace(',', '.');
    const parsed = parseFloat(normalized);
    if (!isNaN(parsed)) {
      onChange(parsed);
    } else if (raw === "") {
      onChange(null);
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={localValue}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
    />
  );
}

interface MorgenroutineTabProps {
  marketState: MarketState;
  onMarketStateChange: (state: MarketState) => void;
  livePrices: LivePrices;
  onLivePricesChange: (prices: LivePrices) => void;
  portfolioData: PortfolioItem[];
  watchlist: WatchlistItem[];
  onWatchlistChange: (next: WatchlistItem[]) => void;
  routineDate: string;
  onShowToast?: (title: string, msg: string, type: "success" | "warning" | "error") => void;
  onOpenRestoreBackup?: () => void;
  onRecordDailySnapshot?: (snap: DailySnapshot) => void;
}

export default function MorgenroutineTab({
  marketState,
  onMarketStateChange,
  livePrices,
  onLivePricesChange,
  portfolioData,
  watchlist,
  onWatchlistChange,
  routineDate,
  onShowToast,
  onOpenRestoreBackup,
  onRecordDailySnapshot,
}: MorgenroutineTabProps) {
   // Help tooltips visibility state
  const [helpId, setHelpId] = useState<string | null>(null);
  const [copiedPineScript, setCopiedPineScript] = useState(false);
  const [calculatingDistDays, setCalculatingDistDays] = useState(false);
  const [distDaysReasoning, setDistDaysReasoning] = useState<string | null>(null);
  const [showSicherheitsInfo, setShowSicherheitsInfo] = useState(false);
  const [showLivePriceConverter, setShowLivePriceConverter] = useState(false);
  const [mrFxRate, setMrFxRate] = useState("1.080");

  // Cache of imported stock and market values
  const [importCache, setImportCache] = useState<{
    timestamp: string | null;
    marketState: {
      vix: number | null;
      vxv: number | null;
      vvix: number | null;
      wti: number | null;
      gas: number | null;
    };
    livePrices: {
      tsla: number | null;
      now: number | null;
      baba: number | null;
      btc: number | null;
    };
  } | null>(() => {
    const saved = localStorage.getItem("morgenroutine_prices_cache");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse prices cache", e);
      }
    }
    return null;
  });

  // Track is today's import done/updated
  const [pricesLastUpdated, setPricesLastUpdated] = useState<string | null>(() => {
    return localStorage.getItem("morgenroutine_prices_last_updated");
  });

  const isToday = (ts: string | null | undefined): boolean => {
    if (!ts) return false;
    try {
      const d = new Date(ts);
      const today = new Date();
      return (
        d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear()
      );
    } catch {
      return false;
    }
  };

  const updateLastUpdatedTimestamp = () => {
    const nowStr = new Date().toISOString();
    setPricesLastUpdated(nowStr);
    localStorage.setItem("morgenroutine_prices_last_updated", nowStr);
  };

  const saveToImportCache = (
    updatedMarket: MarketState,
    updatedLive: LivePrices
  ) => {
    const nowStr = new Date().toISOString();
    const newCache = {
      timestamp: nowStr,
      marketState: {
        vix: updatedMarket.vix,
        vxv: updatedMarket.vxv,
        vvix: updatedMarket.vvix,
        wti: updatedMarket.wti,
        gas: updatedMarket.gas
      },
      livePrices: {
        tsla: updatedLive.tsla.price,
        now: updatedLive.now.price,
        baba: updatedLive.baba.price,
        btc: updatedLive.btc.price
      }
    };
    setImportCache(newCache);
    localStorage.setItem("morgenroutine_prices_cache", JSON.stringify(newCache));
    
    // Also update overall pricesLastUpdated state
    setPricesLastUpdated(nowStr);
    localStorage.setItem("morgenroutine_prices_last_updated", nowStr);
  };

  const handleApplyCache = () => {
    if (!importCache) return;

    const updatedMarketState = {
      ...marketState,
      vix: importCache.marketState.vix,
      vxv: importCache.marketState.vxv,
      vvix: importCache.marketState.vvix,
      wti: importCache.marketState.wti,
      gas: importCache.marketState.gas
    };

    const updatedLivePrices = {
      ...livePrices,
      tsla: { ...livePrices.tsla, price: importCache.livePrices.tsla },
      now: { ...livePrices.now, price: importCache.livePrices.now },
      baba: { ...livePrices.baba, price: importCache.livePrices.baba },
      btc: { ...livePrices.btc, price: importCache.livePrices.btc }
    };

    onMarketStateChange(updatedMarketState);
    onLivePricesChange(updatedLivePrices);

    // Update overall pricesLastUpdated since the user applied the cache
    const nowStr = new Date().toISOString();
    setPricesLastUpdated(nowStr);
    localStorage.setItem("morgenroutine_prices_last_updated", nowStr);

    triggerToast(
      "Cache geladen",
      "🟢 Unbestechlicher Cache erfolgreich in die aktive Sitzung geladen!",
      "success"
    );
  };
  
  const [isFetchingLive, setIsFetchingLive] = useState(false);
  const [lastLiveFetchAt, setLastLiveFetchAt] = useState<string | null>(() => localStorage.getItem("morgenroutine_last_live_fetch") || null);

  // Collect Yahoo tickers from portfolio + watchlist for live fetch.
  // Includes fallback candidates per item so we can recover when Yahoo
  // returns no data for the primary listing (e.g. BABA.DE went stale).
  // SPY is always pulled as a surrogate for ^GSPC (Yahoo flakes on the
  // bare index quote — see SPX_SURROGATE_SYMBOL in yahooMapping).
  const collectLiveSymbols = () => {
    const marketSyms = Object.values(MARKET_SYMBOLS);
    const portfolioSyms = portfolioData.flatMap(p => yahooCandidatesForPortfolio(p));
    const watchlistSyms = watchlist.flatMap(w => yahooCandidatesForWatchlist(w));
    return Array.from(new Set([...marketSyms, SPX_SURROGATE_SYMBOL, ...portfolioSyms, ...watchlistSyms]));
  };

  const handleFetchLivePrices = async () => {
    if (isFetchingLive) return;
    setIsFetchingLive(true);
    try {
      const symbols = collectLiveSymbols();
      // Fire live prices + distribution days in parallel.
      const [resp, distResp] = await Promise.all([
        fetch("/api/fetch-live-prices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbols })
        }),
        fetch("/api/calculate-distribution-days", {
          method: "POST",
          headers: { "Content-Type": "application/json" }
        }).catch(() => null),
      ]);
      if (!resp.ok) {
        const errBody = await resp.json().catch(() => ({}));
        const msg = errBody.error || `HTTP ${resp.status}`;
        const detail = errBody.detail ? `\n\nDetails: ${errBody.detail}` : "";
        console.error("[Live] Backend error", resp.status, errBody);
        throw new Error(msg + detail);
      }
      const data = await resp.json();

      let updatedCount = 0;

      // 1. Merge market values
      const newMarket: MarketState = { ...marketState };
      if (data.market) {
        for (const [k, v] of Object.entries(data.market)) {
          if (typeof v === "number" && !isNaN(v)) {
            (newMarket as any)[k] = v;
            updatedCount++;
          }
        }
      }
      // SPX surrogate: if Yahoo refused ^GSPC but SPY came through, derive
      // SPX as SPY * 10 (close enough for our regime checks).
      if ((newMarket.spx == null || newMarket.spx === 0) && data.prices?.[SPX_SURROGATE_SYMBOL]) {
        const spyEntry = data.prices[SPX_SURROGATE_SYMBOL];
        if (typeof spyEntry.price === "number") {
          newMarket.spx = spyEntry.price * SPX_SURROGATE_MULTIPLIER;
          updatedCount++;
        }
      }
      // Distribution Days from the parallel call.
      if (distResp && distResp.ok) {
        try {
          const distData = await distResp.json();
          if (typeof distData.distSpx === "number") {
            newMarket.distSpx = distData.distSpx;
            updatedCount++;
          }
          if (typeof distData.distNdx === "number") {
            newMarket.distNdx = distData.distNdx;
            updatedCount++;
          }
          // Herkunft merken — entscheidet später, ob die Kaufsperre greift
          if (distData.source === "yahoo" || distData.source === "ai" || distData.source === "estimate") {
            newMarket.distSource = distData.source;
          }
        } catch {
          // ignore — DD remain at previous value
        }
      }
      onMarketStateChange(newMarket);

      // Record today's snapshot for the weekly/monthly Auswertung.
      if (onRecordDailySnapshot) {
        const ratio = newMarket.vix && newMarket.vxv ? newMarket.vix / newMarket.vxv : null;
        const isGreen =
          newMarket.vix != null && newMarket.vix < 25 &&
          ratio != null && ratio < 1.0 &&
          (newMarket.vvix == null || newMarket.vvix <= 130) &&
          (newMarket.wti == null || newMarket.wti < 100) &&
          (newMarket.gas == null || newMarket.gas < 4.5);
        onRecordDailySnapshot({
          date: routineDate,
          vix: newMarket.vix,
          vxv: newMarket.vxv,
          vvix: newMarket.vvix,
          spx: newMarket.spx,
          wti: newMarket.wti,
          gas: newMarket.gas,
          distSpx: newMarket.distSpx,
          distNdx: newMarket.distNdx,
          ratio,
          status: isGreen ? "GREEN" : "RED",
        });
      }

      // 2. Update livePrices for every portfolio item
      const newLive: LivePrices = {
        tsla: { ...livePrices.tsla },
        now: { ...livePrices.now },
        baba: { ...livePrices.baba },
        btc: { ...livePrices.btc }
      };
      // Walk through each item's candidate symbols, take the first that
      // actually came back with a numeric price (so BABA.DE → BABA.F
      // fallbacks resolve transparently).
      const firstEntryWithPrice = (candidates: string[]) => {
        for (const sym of candidates) {
          const entry = data.prices?.[sym];
          if (entry && typeof entry.price === "number") return entry;
        }
        return null;
      };

      for (const item of portfolioData) {
        const candidates = yahooCandidatesForPortfolio(item);
        const entry = firstEntryWithPrice(candidates);
        if (!entry) continue;
        const key = item.key as keyof LivePrices;
        if (newLive[key]) {
          newLive[key].price = entry.price as number;
          newLive[key].date = routineDate;
          updatedCount++;
          if (typeof entry.atr === "number" && entry.atr > 0) {
            newLive[key].atr = entry.atr;
          }
        }
      }
      onLivePricesChange(newLive);

      // 3. Update watchlist
      let watchlistChanged = false;
      const newWatchlist = watchlist.map(w => {
        const candidates = yahooCandidatesForWatchlist(w);
        const entry = firstEntryWithPrice(candidates);
        if (!entry) return w;
        const next = { ...w };
        next.price = (entry.price as number).toFixed(2);
        updatedCount++;
        watchlistChanged = true;
        if (typeof entry.atr === "number" && entry.atr > 0) {
          next.atr = entry.atr.toFixed(2);
        }
        return next;
      });
      if (watchlistChanged) {
        onWatchlistChange(newWatchlist);
      }

      // 4. Persist cache
      saveToImportCache(newMarket, newLive);
      const fetchedAt = data.fetchedAt || new Date().toISOString();
      setLastLiveFetchAt(fetchedAt);
      localStorage.setItem("morgenroutine_last_live_fetch", fetchedAt);

      const cachedHint = data.cached ? " (Cache)" : "";
      if (onShowToast) {
        onShowToast(
          "Live-Daten geladen",
          `✅ ${updatedCount} Werte aktualisiert${cachedHint}.`,
          "success"
        );
      }
    } catch (err: any) {
      console.error("Live fetch failed:", err);
      if (onShowToast) {
        onShowToast(
          "Live-Abruf fehlgeschlagen",
          err.message || "Konnte keine Daten von Yahoo Finance laden.",
          "error"
        );
      }
    } finally {
      setIsFetchingLive(false);
    }
  };
  const [isDragging, setIsDragging] = useState(false);


  const resizeAndCompressImage = (file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.82): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Canvas context could not be created"));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const base64Data = canvas.toDataURL("image/jpeg", quality);
          resolve(base64Data);
        };
        img.onerror = (err) => reject(err);
        img.src = e.target?.result as string;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };


  const toggleHelp = (id: string) => {
    setHelpId(helpId === id ? null : id);
  };

  const triggerToast = (title: string, msg: string, type: "success" | "warning" | "error") => {
    if (onShowToast) {
      onShowToast(title, msg, type);
    } else {
      console.log(`[Toast] ${type.toUpperCase()} - ${title}: ${msg}`);
    }
  };


  const handleMarketFieldChange = (key: keyof MarketState, value: string) => {
    const num = parseCleanFloat(value);
    onMarketStateChange({
      ...marketState,
      [key]: num,
      // Von Hand eingetragene Distribution Days gelten als verlässlich (lösen Sperre aus)
      ...(key === "distSpx" || key === "distNdx" ? { distSource: "manual" as const } : {}),
    });
    updateLastUpdatedTimestamp();
  };

  const handleMarketFieldChangeNum = (key: keyof MarketState, val: number | null) => {
    onMarketStateChange({
      ...marketState,
      [key]: val,
    });
    updateLastUpdatedTimestamp();
  };

  const handleLivePriceFieldChange = (
    ticker: keyof LivePrices,
    field: 'price' | 'atr' | 'date',
    value: string
  ) => {
    const updatedPrices = { ...livePrices };
    if (field === 'price' || field === 'atr') {
      const num = parseCleanFloat(value);
      updatedPrices[ticker] = {
        ...updatedPrices[ticker],
        [field]: num,
      };
    } else {
      updatedPrices[ticker] = {
        ...updatedPrices[ticker],
        [field]: value,
      };
    }
    onLivePricesChange(updatedPrices);
    if (field === 'price') {
      updateLastUpdatedTimestamp();
    }
  };

  const handleLivePriceFieldChangeNum = (
    ticker: keyof LivePrices,
    field: 'price' | 'atr',
    val: number | null
  ) => {
    const updatedPrices = { ...livePrices };
    updatedPrices[ticker] = {
      ...updatedPrices[ticker],
      [field]: val as any,
    };
    onLivePricesChange(updatedPrices);
    if (field === 'price') {
      updateLastUpdatedTimestamp();
    }
  };

  const handleMrConvertUsdToEur = () => {
    const fx = parseCleanFloat(mrFxRate) || 1.080;
    if (fx <= 0) return;

    const updatedPrices = { ...livePrices };
    const keys: Array<keyof LivePrices> = ["tsla", "now", "baba", "btc"];
    let convertedAny = false;

    keys.forEach((k) => {
      if (updatedPrices[k]) {
        if (updatedPrices[k].price !== null) {
          updatedPrices[k].price = parseFloat((updatedPrices[k].price / fx).toFixed(2));
          convertedAny = true;
        }
        if (updatedPrices[k].atr) {
          updatedPrices[k].atr = parseFloat((updatedPrices[k].atr / fx).toFixed(2));
          convertedAny = true;
        }
      }
    });

    if (convertedAny) {
      onLivePricesChange(updatedPrices);
      onShowToast?.(
        "Umrechnung erfolgreich",
        `Alle eingetragenen Live-Kurse & ATR-Werte wurden erfolgreich durch einen Wechselkurs von ${fx.toFixed(3)} geteilt und in Euro (€) umgerechnet!`,
        "success"
      );
    } else {
      onShowToast?.(
        "Keine Werte vorhanden",
        "Es wurden keine eingetragenen Werte gefunden. Bitte trage zuerst einen Kurs oder ATR-Wert in die Tabelle ein.",
        "warning"
      );
    }
  };

  const handleCalculateDistributionDays = async () => {
    setCalculatingDistDays(true);
    setDistDaysReasoning(null);
    try {
      const response = await fetch("/api/calculate-distribution-days", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Fehler bei der Ermittlung");
      }

      const data = await response.json();
      
      onMarketStateChange({
        ...marketState,
        distSpx: typeof data.distSpx === "number" ? data.distSpx : marketState.distSpx,
        distNdx: typeof data.distNdx === "number" ? data.distNdx : marketState.distNdx,
        distSource: (data.source === "yahoo" || data.source === "ai" || data.source === "estimate") ? data.source : marketState.distSource
      });
      
      setDistDaysReasoning(data.reasoning || "Erfolgreich ermittelt.");
      
      onShowToast?.(
        "Distribution Days",
        "✓ Werte erfolgreich ermittelt und eingetragen!",
        "success"
      );
    } catch (err: any) {
      console.error(err);
      onShowToast?.(
        "Fehler",
        err.message || "Fehler bei der automatischen Ermittlung der Distribution Days.",
        "error"
      );
    } finally {
      setCalculatingDistDays(false);
    }
  };

  // Helper properties to check macro guidelines
  const vix = marketState.vix;
  const vxv = marketState.vxv;
  const ratio = vix && vxv ? vix / vxv : null;
  const wti = marketState.wti;
  const gas = marketState.gas;

  const isContango = ratio !== null ? ratio < 1.0 : false;
  const livesFilled = vix !== null && vxv !== null && marketState.vvix !== null && wti !== null && gas !== null;
  
  // Strict System check logic
  let systemStatusText = "🔴 KAUFSPERRE / UNGEPRÜFT";
  let statusColorClasses = "bg-rose-50 border-rose-500 text-rose-950 animate-pulse";
  let systemTextLabelColor = "text-rose-800";

  const isMacroHealthy = 
    livesFilled && 
    wti !== null && wti < 100 && 
    gas !== null && gas < 4.5 && 
    vix !== null && vix < 25 && 
    marketState.vvix !== null && marketState.vvix < 130 &&
    isContango;

  // Distribution Days ≥ 5 sperren — aber nur bei verlässlicher Quelle (Yahoo/manuell)
  const distReliable = marketState.distSource === "yahoo" || marketState.distSource === "manual";
  const distMax = Math.max(marketState.distSpx ?? 0, marketState.distNdx ?? 0);
  const distBlocks = distReliable && distMax >= 5;
  const distWarnUnverified = !distReliable && distMax >= 5;

  if (!livesFilled) {
    systemStatusText = "🔴 KAUFSPERRE (KEINE DATEN)";
  } else if (marketState.vvix !== null && marketState.vvix >= 130) {
    systemStatusText = "🔴 KAUFSPERRE: VVIX ≥ 130 ⚠️";
  } else if (wti !== null && wti >= 100) {
    systemStatusText = "🔴 KAUFSPERRE: WTI ÖL ≥ 100 $ ⚠️";
  } else if (gas !== null && gas >= 4.5) {
    systemStatusText = "🔴 KAUFSPERRE: ERDGAS ≥ 4,50 $ ⚠️";
  } else if (vix !== null && vix >= 25) {
    systemStatusText = "🔴 KAUFSPERRE: PANIK (VIX ≥ 25) 🚨";
  } else if (!isContango) {
    systemStatusText = "🔴 KAUFSPERRE: BACKWARDATION (VIX/VXV ≥ 1) 🚨";
  } else if (distBlocks) {
    systemStatusText = `🔴 KAUFSPERRE: ${distMax} DISTRIBUTION DAYS (≥ 5) 🚨`;
  } else {
    systemStatusText = "🟢 MARKT INTAKT (KÄUFE ERLAUBT)";
    statusColorClasses = "bg-emerald-50 border-emerald-500 text-emerald-950";
    systemTextLabelColor = "text-emerald-800";
  }

  const isAssetActiveInDepot = (key: string): boolean => {
    // Bei leerem Portfolio ist keine Aktie aktiv — nur die Regel-/Marktwerte
    // gelten als Pflicht-Indikatoren.
    if (!portfolioData || portfolioData.length === 0) return false;
    return portfolioData.some(item => item.key === key && item.status !== "sold");
  };

  // Derive the limit thresholds from the user's own portfolio entries
  // instead of carrying any default numbers. If the user has no Tesla
  // position the TSLA row disappears, etc.
  const coreAssetMeta: Record<keyof LivePrices, { name: string; ticker: string; isin: string }> = {
    tsla: { name: "Tesla, Inc.", ticker: "TSLA", isin: "US88160R1014" },
    now: { name: "ServiceNow, Inc.", ticker: "NOW", isin: "US81762P1021" },
    baba: { name: "Alibaba Group Holding Ltd.", ticker: "BABA", isin: "US01609W1027" },
    btc: { name: "Bitcoin Tracker Index", ticker: "BTC", isin: "DE000A27Z304" },
  };
  const coreAssets = (Object.keys(coreAssetMeta) as Array<keyof LivePrices>)
    .filter((k) => isAssetActiveInDepot(k))
    .map((k) => {
      const item = portfolioData.find((p) => p.key === k);
      const limit = item?.limitPreis ?? 0;
      return {
        key: k,
        name: item?.name || coreAssetMeta[k].name,
        ticker: item?.ticker || coreAssetMeta[k].ticker,
        isin: item?.isin || coreAssetMeta[k].isin,
        limit,
        desc: limit > 0 ? `Limit @ € ${limit.toLocaleString("de-DE")}` : "Kein Limit gesetzt",
      };
    });
  const limitFor = (key: keyof LivePrices): number =>
    coreAssets.find((a) => a.key === key)?.limit ?? 0;

  // Mathematically complete check of all 9 system requirements (skipped if asset is sold/inactive in portfolio)
  const missingForToday: string[] = [];
  if (vix === null || vix === undefined) missingForToday.push("US-Volatilität (VIX) fehlt");
  if (vxv === null || vxv === undefined) missingForToday.push("3M-Volatilität (VXV) fehlt");
  if (marketState.vvix === null || marketState.vvix === undefined) missingForToday.push("CBOE VVIX fehlt");
  if (wti === null || wti === undefined) missingForToday.push("WTI Rohölpreis fehlt");
  if (gas === null || gas === undefined) missingForToday.push("Henry Hub Erdgaspreis fehlt");

  // Pflichtprüfung pro aktivem Asset — generisch statt 4× kopiert
  coreAssets.forEach((asset) => {
    const lp = livePrices[asset.key];
    if (!lp.price) {
      missingForToday.push(`${asset.ticker} Preis fehlt`);
    } else if (lp.date !== routineDate) {
      missingForToday.push(`${asset.ticker} Kurs ist veraltet (Datum Alt)`);
    }
  });

  const isTodayCompleteAndSecure = missingForToday.length === 0;

  // Mathematisch abgesichertes 3-Stufen-System:
  // 1. Grün (Echtzeit geschützt & unbestechlich): Alle 9 Indikatoren vorhanden und aktuell
  // 2. Gelbe Flagge (Eingeschränkter Schutz/Nicht alle Daten aktuell): Kern-4 (VIX, VXV, VVIX, WTI) vorhanden, aber restliche Werte unvollständig
  // 3. Rote Flagge (Sicherheitsrisiko aktiv): Mindestens einer der wichtigen 4 Marktindikatoren fehlt oder ist unvollständig
  const isVixMissing = missingForToday.some(err => err.includes("VIX"));
  const isVxvMissing = missingForToday.some(err => err.includes("VXV"));
  const isVvixMissing = missingForToday.some(err => err.includes("VVIX"));
  const isWtiMissing = missingForToday.some(err => err.includes("WTI"));
  const priority4Present = !isVixMissing && !isVxvMissing && !isVvixMissing && !isWtiMissing;

  let securityLevel: "green" | "yellow" | "red" = "red";
  if (isTodayCompleteAndSecure) {
    securityLevel = "green";
  } else if (priority4Present) {
    securityLevel = "yellow";
  } else {
    securityLevel = "red";
  }

  return (
    <div className="space-y-6">

      {/* 🌐 QUICK-ACTION: Live-Daten in einem Klick — der Daily-Driver.
          Aufgeteilt in zwei Aktionen: öffentliche Marktwerte vs. private Aktien-Liste. */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-md space-y-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            🌐 Heute starten
          </h3>
          {lastLiveFetchAt && (
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              Marktwerte zuletzt: {new Date(lastLiveFetchAt).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })}
            </p>
          )}
        </div>

        {/* Kompakte Marktampel — ersetzt den großen Sicherheits-Block */}
        <div className={"rounded-xl border px-4 py-2.5 text-sm font-bold " + statusColorClasses}>
          {systemStatusText}
        </div>

        {distWarnUnverified && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-[11px] font-bold text-amber-800 leading-snug">
            ⚠️ {distMax} Distribution Days gemeldet, aber die Quelle ist ungeprüft (Schätzung/KI). Das würde normalerweise eine Kaufsperre auslösen — bitte den Wert manuell in den Tages-Eingaben verifizieren.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleFetchLivePrices}
            disabled={isFetchingLive}
            className={
              "flex flex-col items-start text-left p-3 rounded-xl border transition-all active:scale-[0.98] " +
              (isFetchingLive
                ? "bg-slate-200 text-slate-500 border-slate-300 cursor-not-allowed"
                : "bg-slate-900 hover:bg-slate-800 text-white border-slate-900 shadow-sm")
            }
          >
            <span className="text-sm font-bold">🌐 Marktwerte holen</span>
            <span className={"text-[11px] mt-0.5 " + (isFetchingLive ? "text-slate-500" : "text-slate-300")}>
              {isFetchingLive ? "Lade…" : "VIX, VVIX, SPX, WTI, Gas, Distribution Days"}
            </span>
          </button>
          <button
            type="button"
            onClick={onOpenRestoreBackup}
            disabled={!onOpenRestoreBackup}
            className="flex flex-col items-start text-left p-3 rounded-xl border bg-white hover:bg-slate-50 text-slate-900 border-slate-300 transition-all active:scale-[0.98] shadow-sm"
          >
            <span className="text-sm font-bold">🔑 Aktien-Liste laden</span>
            <span className="text-[11px] text-slate-500 mt-0.5">
              Portfolio &amp; Watchlist aus Backup-Datei (mit PIN)
            </span>
          </button>
        </div>

        {/* Cache-Rückgriff: nur der Button, falls heute schon abgerufen wurde */}
        {importCache && (
          <button
            type="button"
            onClick={handleApplyCache}
            className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all active:scale-[0.98]"
            title={isToday(importCache.timestamp)
              ? "Heutige Cache-Werte wieder einspielen"
              : "Achtung: Cache ist von einem früheren Tag"}
          >
            📥 Letzten Cache laden
            <span className={"font-mono " + (isToday(importCache.timestamp) ? "text-emerald-600" : "text-amber-600")}>
              ({new Date(importCache.timestamp).toLocaleDateString('de-DE', {day: 'numeric', month: 'short'})})
            </span>
          </button>
        )}
      </div>

      {/* SCHNELL-EINGABE-ASSISTENT WENN DATEN FEHLEN (Bzw. unvollständig) */}
      {!isTodayCompleteAndSecure && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50/60 border border-amber-200 rounded-3xl p-5 sm:p-6 shadow-md space-y-4 animate-scaleIn text-left">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <span className="text-[9px] font-extrabold text-amber-800 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-md uppercase tracking-wider block w-fit">
                ⚡ Status-Zusammenfassung
              </span>
              <h4 className="text-sm font-bold text-slate-900 mt-1.5 flex items-center gap-1.5 font-display">
                <Flame className="h-4 w-4 text-amber-600 animate-pulse fill-current" />
                Unvollständige Tagesroutine-Daten: Werte eintragen
              </h4>
              <p className="text-sm text-slate-600 font-medium leading-relaxed mt-1">
                Damit die unbestechliche Marktampel aktiv schalten kann und deine limit- und risikorechenbasierten Hebel vollkommen abgesichert sind, fehlen noch Werte für heute ({formatToGermanDate(routineDate)}). Ruf oben die <strong>Marktwerte</strong> ab oder trage die Werte weiter unten bei den <strong>Tages-Eingaben</strong> ein.
              </p>
            </div>
            
            <button
              type="button"
              onClick={() => {
                const element = document.getElementById("daily-inputs-card");
                if (element) {
                  element.scrollIntoView({ behavior: "smooth", block: "center" });
                  if (onShowToast) {
                    onShowToast("Manuelle Eingaben", "Fokus auf die Tages-Eingaben für weitere Details und Einzelaktien gelegt.", "success");
                  }
                }
              }}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all self-start shrink-0 cursor-pointer shadow-sm shadow-amber-500/15 inline-flex items-center gap-1.5"
            >
              📥 Zur Tages-Eingabe springen <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          
          <div className="bg-white/70 border border-amber-200/50 rounded-2xl p-4 space-y-2">
            <span className="text-[10px] text-amber-900 font-extrabold uppercase tracking-wide block">Ausstehende tägliche Werte:</span>
            <div className="flex flex-wrap gap-2">
              {missingForToday.map((err, idx) => (
                <span key={idx} className="bg-amber-50 border border-amber-200 text-amber-900 text-[10px] font-extrabold px-2.5 py-1 rounded-xl shadow-xs inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                  {err}
                </span>
              ))}
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-2 border-t border-amber-250/30">
            <span className="text-[10px] text-amber-800 font-bold flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              Eingabesynchronisation bereit
            </span>
          </div>
        </div>
      )}

      <div className="space-y-6">

        {/* Marktstimmung & Kaufschranken (inkl. Distribution Days) */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 space-y-6 shadow-md shadow-slate-200/20">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-4 rounded bg-slate-800 block"></span>
              📊 Marktstimmung &amp; Kaufschranken
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold text-[10px] uppercase tracking-widest bg-slate-50/40">
                    <th className="p-3 pl-4">Ampel-Status</th>
                    <th className="p-3">Indikator</th>
                    <th className="p-3 text-right">Wert</th>
                    <th className="p-3 text-center pr-4">Grenzwerte</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  
                  {/* VIX Row */}
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 text-right pr-4">
                      {vix === null ? (
                        <span className="inline-block px-3 py-1 rounded-full bg-slate-50 text-slate-500 border border-slate-200 text-[10px] font-bold animate-pulse">🔴 FEHLT</span>
                      ) : vix < 25 ? (
                        <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100/70 text-[10px] font-bold uppercase">Gelassen</span>
                      ) : (
                        <span className="inline-block px-3 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-100 text-[10px] font-bold uppercase animate-pulse">Panikverbot</span>
                      )}
                    </td><td className="p-3 pl-4">
                      <div className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
                        <span>VIX (US-Angst)</span>
                        <button
                          type="button"
                          onClick={() => toggleHelp('vix')}
                          className="inline-flex items-center justify-center w-5 h-5 rounded-full text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100/80 bg-emerald-50 border border-emerald-100/60 shadow-xs transition-all cursor-pointer shrink-0"
                          title="Hilfe anzeigen"
                        >
                          <HelpCircle className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td><td className={`p-3 text-right font-mono font-bold tabular-nums text-sm sm:text-base ${vix && vix >= 25 ? 'text-rose-600 font-extrabold' : 'text-slate-800'}`}>
                      {vix ? vix.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "FEHLT"}
                    </td><td className="p-3 text-center text-slate-455 font-mono text-xs font-semibold">Max: 25.00</td>
                  </tr>
                  
                  {/* VIX Help Explainer */}
                  {helpId === 'vix' && (
                    <tr className="bg-emerald-50/15">
                      <td colSpan={4} className="p-4 text-xs text-slate-650 leading-relaxed font-semibold border-l-4 border-emerald-500 bg-emerald-500/5 pl-4 pr-4">
                        <strong className="text-emerald-950">VIX Index (Cboe S&amp;P 500 Volatility):</strong> Misst die implizite Volatilität des US-Leitindex auf Sicht der nächsten 30 Tage. 
                        Werte über <strong>25,00</strong> weisen auf starke Marktunordnung und Absicherungsausbrüche der US-Profis hin. 
                        Neukäufe von Tech-Aktien sind bei VIX &gt;= 25 strictly banned!
                      </td>
                    </tr>
                  )}
                  
                  {/* VXV Row */}
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 text-right pr-4">
                      {vxv === null || vix === null ? (
                        <span className="inline-block px-3 py-1 rounded-full bg-slate-50 text-slate-500 border border-slate-200 text-[10px] font-bold animate-pulse">🔴 FEHLT</span>
                      ) : isContango ? (
                        <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100/70 text-[10px] font-bold uppercase">Contango</span>
                      ) : (
                        <span className="inline-block px-3 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-100 text-[10px] font-bold uppercase animate-pulse">Backwardation</span>
                      )}
                    </td><td className="p-3 pl-4">
                      <div className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
                        <span>VXV (3-Monats VIX)</span>
                        <button
                          type="button"
                          onClick={() => toggleHelp('vxv')}
                          className="inline-flex items-center justify-center w-5 h-5 rounded-full text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100/80 bg-emerald-50 border border-emerald-100/60 shadow-xs transition-all cursor-pointer shrink-0"
                          title="Hilfe anzeigen"
                        >
                          <HelpCircle className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td><td className="p-3 text-right font-mono font-bold tabular-nums text-sm sm:text-base text-slate-800">
                      {vxv ? vxv.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "FEHLT"}
                    </td><td className="p-3 text-center text-slate-450 font-mono text-xs font-semibold">Verhältnis: VIX &lt; VXV</td>
                  </tr>
                  
                  {/* VXV Explainer */}
                  {helpId === 'vxv' && (
                    <tr className="bg-emerald-50/15">
                      <td colSpan={4} className="p-4 text-xs text-slate-650 leading-relaxed font-semibold border-l-4 border-emerald-500 bg-emerald-500/5 pl-4 pr-4">
                        <strong className="text-emerald-950">VXV Index:</strong> Drückt die 3-Monatserwartung aus. 
                        Ein gesundes Marktumfeld befindet sich in der Konstellation <strong>Contango</strong> (VIX &lt; VXV). 
                        Fällt die Strukturkurve unter 1.0 (VIX &gt;= VXV, Backwardation), herrscht Panik im aktuellen Monat, was das Risiko neuer Long-Käufe massiv erhöht.
                      </td>
                    </tr>
                  )}
                  
                  {/* VVIX Row */}
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 text-right pr-4">
                      {marketState.vvix === null ? (
                        <span className="inline-block px-3 py-1 rounded-full bg-slate-50 text-slate-500 border border-slate-200 text-[10px] font-bold animate-pulse">🔴 FEHLT</span>
                      ) : marketState.vvix < 100 ? (
                        <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100/70 text-[10px] font-bold uppercase">Entspannt</span>
                      ) : marketState.vvix < 130 ? (
                        <span className="inline-block px-3 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-100 text-[10px] font-bold uppercase">Erhöht</span>
                      ) : (
                        <span className="inline-block px-3 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-100 text-[10px] font-bold uppercase animate-pulse">Kaufstopp</span>
                      )}
                    </td><td className="p-3 pl-4">
                      <div className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
                        <span>VVIX (Angst der Angst)</span>
                        <button
                          type="button"
                          onClick={() => toggleHelp('vvix')}
                          className="inline-flex items-center justify-center w-5 h-5 rounded-full text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100/80 bg-emerald-50 border border-emerald-100/60 shadow-xs transition-all cursor-pointer shrink-0"
                          title="Hilfe anzeigen"
                        >
                          <HelpCircle className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td><td className="p-3 text-right font-mono font-bold tabular-nums text-sm sm:text-base text-slate-800">
                      {marketState.vvix !== null ? marketState.vvix.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "FEHLT"}
                    </td><td className="p-3 text-center text-slate-450 font-mono text-xs font-semibold">Max: 100 / 130</td>
                  </tr>

                  {/* VVIX Explainer */}
                  {helpId === 'vvix' && (
                    <tr className="bg-emerald-50/15">
                      <td colSpan={4} className="p-4 text-xs text-slate-650 leading-relaxed font-semibold border-l-4 border-emerald-500 bg-emerald-500/5 pl-4 pr-4">
                        <strong className="text-emerald-950">VVIX Index (Die Volatilität der Volatilität):</strong> Dieser Index misst die erwartete Schwankungsbreite des VIX selbst (auch bekannt als „die Angst der Angst“). 
                        Ein VVIX unter <strong>100</strong> gilt als entspanntes Marktumfeld. 
                        Steigt der VVIX über <strong>110</strong>, steigen die Preise für VIX-Absicherungen deutlich (Profis bereiten sich vor). 
                        Ab <strong>130</strong> herrscht laut Handbuch ein unbestechliches <strong>Kaufverbot (absoluter Kaufstopp)</strong> für neue Positionen, da explosive Kursausschläge und unberechenbare Wendepunkte am Gesamtmarkt drohen.
                      </td>
                    </tr>
                  )}
                  
                  {/* WTI Row */}
                  <tr className="hover:bg-slate-50 transition-colors bg-slate-50/10">
                    <td className="p-3 text-right pr-4">
                      {wti === null ? (
                        <span className="inline-block px-3 py-1 rounded-full bg-slate-50 text-slate-500 border border-slate-200 text-[10px] font-bold animate-pulse">🔴 FEHLT</span>
                      ) : wti < 100 ? (
                        <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100/70 text-[10px] font-bold uppercase">OK (100%)</span>
                      ) : (
                        <span className="inline-block px-3 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-100 text-[10px] font-bold uppercase animate-pulse">Risiko -50%</span>
                      )}
                    </td><td className="p-3 pl-4">
                      <div className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
                        <span>WTI Oil ($ pro Barrel)</span>
                        <button
                          type="button"
                          onClick={() => toggleHelp('wti')}
                          className="inline-flex items-center justify-center w-5 h-5 rounded-full text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100/80 bg-emerald-50 border border-emerald-100/60 shadow-xs transition-all cursor-pointer shrink-0"
                          title="Hilfe anzeigen"
                        >
                          <HelpCircle className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td><td className={`p-3 text-right font-mono font-bold tabular-nums text-sm sm:text-base ${wti && wti >= 100 ? 'text-rose-600 font-extrabold' : 'text-slate-800'}`}>
                      {wti ? `$ ${wti.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "FEHLT"}
                    </td><td className="p-3 text-center text-slate-455 font-mono text-xs font-semibold">Schutzgrenze: $ 100,00</td>
                  </tr>
                  
                  {/* WTI Explainer */}
                  {helpId === 'wti' && (
                    <tr className="bg-emerald-50/15">
                      <td colSpan={4} className="p-4 text-xs text-slate-650 leading-relaxed font-semibold border-l-4 border-emerald-500 bg-emerald-500/5 pl-4 pr-4">
                        <strong className="text-emerald-950">WTI Öl-Klausel ($100-Schranke):</strong> Ein hoher Rohölpreis treibt die globale Inflation drastisch an und belastet die Margen von Fahrzeugherstellern wie Tesla massiv. 
                        Liegt WTI Öl über <strong>$ 100,00</strong>, wird das eingeplante Trade-Risiko für Neukäufe halbiert (<strong>0,5%</strong> statt 1% Depotrisiko pro Trade), um Verlustrisiken vorsorglich zu minimieren.
                      </td>
                    </tr>
                  )}
                  
                  {/* Henry Hub Gas Row */}
                  <tr className="hover:bg-slate-50 transition-colors bg-slate-50/10">
                    <td className="p-3 text-right pr-4">
                      {gas === null ? (
                        <span className="inline-block px-3 py-1 rounded-full bg-slate-50 text-slate-500 border border-slate-200 text-[10px] font-bold animate-pulse">🔴 FEHLT</span>
                      ) : gas < 4.5 ? (
                        <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100/70 text-[10px] font-bold uppercase">Stabil</span>
                      ) : (
                        <span className="inline-block px-3 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-100 text-[10px] font-bold uppercase animate-pulse">Kaufstopp</span>
                      )}
                    </td><td className="p-3 pl-4">
                      <div className="font-bold text-slate-905 text-sm sm:text-base flex items-center gap-1.5">
                        <span>Henry Hub Gas ($)</span>
                        <button
                          type="button"
                          onClick={() => toggleHelp('gas')}
                          className="inline-flex items-center justify-center w-5 h-5 rounded-full text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100/80 bg-emerald-50 border border-emerald-100/60 shadow-xs transition-all cursor-pointer shrink-0"
                          title="Hilfe anzeigen"
                        >
                          <HelpCircle className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td><td className={`p-3 text-right font-mono font-bold tabular-nums text-sm sm:text-base ${gas && gas >= 4.5 ? 'text-rose-600 font-extrabold' : 'text-slate-800'}`}>
                      {gas ? `$ ${gas.toLocaleString('de-DE', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}` : "FEHLT"}
                    </td><td className="p-3 text-center text-slate-450 font-mono text-xs font-semibold">Sperrlimit: $ 4,50</td>
                  </tr>

                  {/* Erdgas Explainer */}
                  {helpId === 'gas' && (
                    <tr className="bg-emerald-50/15">
                      <td colSpan={4} className="p-4 text-xs text-slate-650 leading-relaxed font-semibold border-l-4 border-emerald-500 bg-emerald-500/5 pl-4 pr-4">
                        <strong className="text-emerald-950">Henry Hub Erdgas ($4.50-Sperre):</strong> Dient als sekundäres makroökonomisches Schutzschild. 
                        Sollte der Gaspreis in den USA auf über <strong>$ 4,50</strong> schießen, greift das System mit einem automatischen <strong>Kaufstopp</strong> ein.
                      </td>
                    </tr>
                  )}

                  {/* Distribution Days Row */}
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 text-right pr-4">
                      {distMax === 0 && marketState.distSource == null ? (
                        <span className="inline-block px-3 py-1 rounded-full bg-slate-50 text-slate-500 border border-slate-200 text-[10px] font-bold animate-pulse">🔴 FEHLT</span>
                      ) : distBlocks ? (
                        <span className="inline-block px-3 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-100 text-[10px] font-bold uppercase animate-pulse">Kaufstopp</span>
                      ) : distWarnUnverified ? (
                        <span className="inline-block px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold uppercase">Ungeprüft</span>
                      ) : (
                        <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100/70 text-[10px] font-bold uppercase">Ok</span>
                      )}
                    </td><td className="p-3 pl-4">
                      <div className="font-bold text-slate-905 text-sm sm:text-base flex items-center gap-1.5">
                        <span>Distribution Days</span>
                        <button
                          type="button"
                          onClick={() => toggleHelp('distDays')}
                          className="inline-flex items-center justify-center w-5 h-5 rounded-full text-rose-600 hover:text-rose-800 hover:bg-rose-100/80 bg-rose-50 border border-rose-100/60 shadow-xs transition-all cursor-pointer shrink-0"
                          title="Hilfe anzeigen"
                        >
                          <HelpCircle className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5">
                        {marketState.distSource === "yahoo" || marketState.distSource === "manual" ? (
                          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">✓ {marketState.distSource === "manual" ? "manuell" : "Yahoo-berechnet"}</span>
                        ) : marketState.distSource === "ai" ? (
                          <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">≈ KI-Schätzung</span>
                        ) : marketState.distSource === "estimate" ? (
                          <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">≈ Notnagel-Schätzwert</span>
                        ) : null}
                      </div>
                    </td><td className={`p-3 text-right font-mono font-bold tabular-nums text-sm sm:text-base ${distBlocks ? 'text-rose-600 font-extrabold' : 'text-slate-800'}`}>
                      <div>SPX {marketState.distSpx ?? "—"}</div>
                      <div className="text-slate-500">NDX {marketState.distNdx ?? "—"}</div>
                    </td><td className="p-3 text-center text-slate-450 font-mono text-xs font-semibold">Sperrlimit: ≥ 5</td>
                  </tr>

                  {/* Distribution Days Auto-Ermitteln */}
                  <tr>
                    <td colSpan={4} className="px-3 pb-2 pt-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={handleCalculateDistributionDays}
                          disabled={calculatingDistDays}
                          title="Distribution Days automatisch aus Yahoo-Finance-Daten (SPY & QQQ) berechnen; bei Ausfall KI-Fallback"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white rounded-lg transition-all active:scale-95"
                        >
                          {calculatingDistDays ? (
                            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Berechne…</>
                          ) : (
                            <><Sparkles className="h-3.5 w-3.5" /> Auto-Ermitteln (Yahoo/KI)</>
                          )}
                        </button>
                        {distDaysReasoning && (
                          <span className="text-[10px] text-slate-400 font-medium">Details siehe Hilfe (?)</span>
                        )}
                      </div>
                    </td>
                  </tr>

                </tbody>
              </table>
            </div>
          </div>

        {/* 🛟 NOTFALL: Manuelle Tages-Eingaben (nur bei Bedarf aufklappen) */}
        <details className="bg-white border border-slate-100 rounded-3xl shadow-md shadow-slate-200/20 group">
          <summary className="cursor-pointer list-none p-5 sm:p-6 flex items-center justify-between gap-2 select-none">
            <span className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-4 rounded bg-slate-400 block"></span>
              🛟 Manuelle Tages-Eingaben (Notfall)
            </span>
            <span className="text-[10px] font-bold text-slate-400 group-open:hidden">Aufklappen ▾</span>
            <span className="text-[10px] font-bold text-slate-400 hidden group-open:inline">Zuklappen ▴</span>
          </summary>
          <div className="px-6 sm:px-8 pb-6 sm:pb-8 pt-0">
            <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
              Normalerweise nicht nötig — die Werte kommen automatisch über „Marktwerte holen". Nutze diese Felder nur, falls ein Wert beim Live-Abruf einmal fehlt.
            </p>
            <div id="daily-inputs-card" className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 space-y-6 shadow-md shadow-slate-200/20">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-widest pb-3 border-b border-slate-50 flex items-center gap-2">
              <span className="w-1.5 h-4 rounded bg-slate-800 block"></span>
              Tages-Eingaben
            </h3>
            
            <div className="space-y-6">
              {/* Macro Values Inputs */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-extrabold text-slate-455 uppercase tracking-wider">VIX (US-Term)</span>
                    {vix === null ? (
                      <span className="text-[9px] shrink-0 font-bold text-amber-600 bg-amber-50 px-1 border border-amber-200/60 rounded">Fehlt</span>
                    ) : vix < 25 ? (
                      <span className="text-[9px] shrink-0 font-bold text-emerald-600 bg-emerald-50 px-1 border border-emerald-100/80 rounded">✓ OK</span>
                    ) : (
                      <span className="text-[9px] shrink-0 font-bold text-rose-600 bg-rose-50 px-1 border border-rose-100/80 rounded">✗ Sperre</span>
                    )}
                  </div>
                  <DecimalInput
                    value={vix}
                    onChange={(val) => handleMarketFieldChangeNum("vix", val)}
                    placeholder="z.B. 16,91"
                    className={`w-full h-11 border focus:border-slate-600 rounded-xl px-3 font-mono text-xs sm:text-sm font-bold focus:outline-none transition-all ${
                      vix === null 
                        ? "bg-amber-50/20 border-amber-300 ring-2 ring-amber-100 placeholder-amber-400" 
                        : "bg-slate-50 border-slate-200"
                    }`}
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-extrabold text-slate-455 uppercase tracking-wider">VXV (3M-Angst)</span>
                    {vxv === null ? (
                      <span className="text-[9px] shrink-0 font-bold text-amber-600 bg-amber-50 px-1 border border-amber-200/60 rounded">Fehlt</span>
                    ) : vix !== null && vix >= vxv ? (
                      <span className="text-[9px] shrink-0 font-bold text-rose-600 bg-rose-50 px-1 border border-rose-100/80 rounded">✗ Sperre</span>
                    ) : (
                      <span className="text-[9px] shrink-0 font-bold text-emerald-600 bg-emerald-50 px-1 border border-emerald-100/80 rounded">✓ Contango</span>
                    )}
                  </div>
                  <DecimalInput
                    value={vxv}
                    onChange={(val) => handleMarketFieldChangeNum("vxv", val)}
                    placeholder="z.B. 20,03"
                    className={`w-full h-11 border focus:border-slate-600 rounded-xl px-3 font-mono text-xs sm:text-sm font-bold focus:outline-none transition-all ${
                      vxv === null 
                        ? "bg-amber-50/20 border-amber-300 ring-2 ring-amber-100 placeholder-amber-400" 
                        : "bg-slate-50 border-slate-200"
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-extrabold text-slate-455 uppercase tracking-wider">WTI Öl ($)</span>
                    {wti === null ? (
                      <span className="text-[9px] shrink-0 font-bold text-amber-600 bg-amber-50 px-1 border border-amber-200/60 rounded">Fehlt</span>
                    ) : wti < 100 ? (
                      <span className="text-[9px] shrink-0 font-bold text-emerald-600 bg-emerald-50 px-1 border border-emerald-100/80 rounded">✓ OK</span>
                    ) : (
                      <span className="text-[9px] shrink-0 font-bold text-amber-600 bg-amber-50 px-1 border border-amber-200 rounded">⚠ -50% Risk</span>
                    )}
                  </div>
                  <DecimalInput
                    value={wti}
                    onChange={(val) => handleMarketFieldChangeNum("wti", val)}
                    placeholder="z.B. 89,15"
                    className={`w-full h-11 border focus:border-slate-600 rounded-xl px-3 font-mono text-xs sm:text-sm font-bold focus:outline-none transition-all ${
                      wti === null 
                        ? "bg-amber-50/20 border-amber-300 ring-2 ring-amber-100 placeholder-amber-400" 
                        : "bg-slate-50 border-slate-200"
                    }`}
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-extrabold text-slate-455 uppercase tracking-wider">Erdgas ($)</span>
                    {gas === null ? (
                      <span className="text-[9px] shrink-0 font-bold text-amber-600 bg-amber-50 px-1 border border-amber-200/60 rounded">Fehlt</span>
                    ) : gas < 4.5 ? (
                      <span className="text-[9px] shrink-0 font-bold text-emerald-600 bg-emerald-50 px-1 border border-emerald-100/80 rounded">✓ OK</span>
                    ) : (
                      <span className="text-[9px] shrink-0 font-bold text-rose-600 bg-rose-50 px-1 border border-rose-100/80 rounded">✗ Sperre</span>
                    )}
                  </div>
                  <DecimalInput
                    value={gas}
                    onChange={(val) => handleMarketFieldChangeNum("gas", val)}
                    placeholder="z.B. 3,017"
                    className={`w-full h-11 border focus:border-slate-600 rounded-xl px-3 font-mono text-xs sm:text-sm font-bold focus:outline-none transition-all ${
                      gas === null 
                        ? "bg-amber-50/20 border-amber-300 ring-2 ring-amber-100 placeholder-amber-400" 
                        : "bg-slate-50 border-slate-200"
                    }`}
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-extrabold text-slate-455 uppercase tracking-wider">VVIX</span>
                    {marketState.vvix === null ? (
                      <span className="text-[9px] shrink-0 font-bold text-amber-600 bg-amber-50 px-1 border border-amber-200/60 rounded">Fehlt</span>
                    ) : marketState.vvix < 130 ? (
                      <span className="text-[9px] shrink-0 font-bold text-emerald-600 bg-emerald-50 px-1 border border-emerald-100/80 rounded">✓ OK</span>
                    ) : (
                      <span className="text-[9px] shrink-0 font-bold text-rose-600 bg-rose-50 px-1 border border-rose-100/80 rounded">✗ Sperre</span>
                    )}
                  </div>
                  <DecimalInput
                    value={marketState.vvix}
                    onChange={(val) => handleMarketFieldChangeNum("vvix", val)}
                    placeholder="z.B. 95,20"
                    className={`w-full h-11 border focus:border-slate-600 rounded-xl px-3 font-mono text-xs sm:text-sm font-bold focus:outline-none transition-all ${
                      marketState.vvix === null 
                        ? "bg-amber-50/20 border-amber-300 ring-2 ring-amber-100 placeholder-amber-400" 
                        : "bg-slate-50 border-slate-200"
                    }`}
                  />
                </div>
              </div>

              {/* Distribution Days — manuelle Verifikation (Notfall) */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider flex items-center gap-1.5">
                    Distribution Days (manuell verifizieren)
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleHelp('distDays')}
                    className="inline-flex items-center justify-center w-5 h-5 rounded-full text-rose-600 hover:text-rose-800 hover:bg-rose-100/80 bg-rose-50 border border-rose-100/60 shadow-xs transition-all cursor-pointer shrink-0"
                    title="Anleitung & TradingView Code anzeigen"
                  >
                    <HelpCircle className="h-3.5 w-3.5" />
                  </button>
                </div>

                {helpId === 'distDays' && (
                  <div className="p-4 text-xs text-rose-950 bg-rose-50/50 rounded-2xl border border-rose-100 pl-4 pr-4 leading-relaxed font-semibold space-y-3">
                    <div>
                      <strong className="text-rose-900">Was bedeuten Distribution Days (Distributionstage)?</strong><br />
                      Ein Distributionstag entsteht, wenn der Index (S&P 500 oder Nasdaq 100) im Minus schließt (typisch ab -0,2%) bei <strong>höherem Handelsvolumen</strong> als am Vortag. Dies signalisiert institutionelle Verkäufe (Verteilung).
                    </div>
                    
                    <ul className="list-disc pl-4 space-y-1 font-bold">
                      <li><span className="text-emerald-800">0 bis 4 Tage:</span> Normaler Markt, Neukäufe sind unbedenklich.</li>
                      <li><span className="text-rose-800">&gt;= 5 Tage (Ampel ROT):</span> Hohe Gefahr einer Marktumkehr. Die Kaufampel schaltet automatisch auf Kaufsperre — Risiko minimieren, Stops enger ziehen &amp; Neukäufe stoppen!</li>
                    </ul>

                    <div className="p-2.5 bg-white/70 rounded-xl border border-rose-100 text-[11px] font-semibold text-rose-900">
                      <strong>Wichtig zur Quelle:</strong> Die automatische Kaufsperre greift nur, wenn die Zahl aus verlässlicher Quelle stammt — der echten Yahoo-Finance-Berechnung (SPY &amp; QQQ, letzte 25 Handelstage) oder deiner manuellen Eingabe. Konnte die App die Werte nur schätzen (KI-Fallback oder Notnagel bei API-Ausfall), wird <strong>keine</strong> harte Sperre ausgelöst, sondern ein gelber Warnhinweis eingeblendet — dann bitte den Wert selbst prüfen und in den Tages-Eingaben eintragen.
                    </div>

                    <div className="pt-2 border-t border-rose-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-rose-900 uppercase tracking-wider font-bold">TradingView Pine Script (boomerberg):</span>
                        <button
                          type="button"
                          onClick={() => {
                            const code = `//@version=3
study("Distribution Days", overlay=true)
cnt = 0
is_distribution = false
if(isdaily)
    len = input(25, minval=1, title="Tage")
    is_down_bar = change(close) < (close[1] * -0.002) ? true : false
    is_volume_up = change(volume) > 0 ? true : false
    is_distribution := is_down_bar and is_volume_up ? true : false

    for i = 0 to len
        if(is_distribution[i])
            cnt := cnt + 1     
            
plotchar(series=(is_distribution?cnt:false), char='D', color=white)`;
                            navigator.clipboard.writeText(code);
                            setCopiedPineScript(true);
                            setTimeout(() => setCopiedPineScript(false), 2000);
                          }}
                          className="inline-flex items-center gap-1.5 px-2 py-1 text-[9px] bg-white border border-rose-200 hover:bg-rose-100/50 rounded-md text-rose-700 font-bold transition-all cursor-pointer"
                        >
                          {copiedPineScript ? (
                            <>
                              <Check className="h-2.5 w-2.5 text-emerald-650" />
                              <span className="text-emerald-650">Kopiert!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-2.5 w-2.5" />
                              <span>Code kopieren</span>
                            </>
                          )}
                        </button>
                      </div>
                      
                      <pre className="p-2.5 bg-rose-950 text-[10px] text-rose-100 rounded-xl font-mono overflow-x-auto select-all leading-normal">
{`//@version=3
study("Distribution Days", overlay=true)
cnt = 0
is_distribution = false
if(isdaily)
    len = input(25, minval=1, title="Tage")
    is_down_bar = change(close) < (close[1] * -0.002) ? true : false
    is_volume_up = change(volume) > 0 ? true : false
    is_distribution := is_down_bar and is_volume_up ? true : false

    for i = 0 to len
        if(is_distribution[i])
            cnt := cnt + 1     
            
plotchar(series=(is_distribution?cnt:false), char='D', color=white)`}
                      </pre>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Dist. Days SPX</span>
                      {marketState.distSpx === null || marketState.distSpx === undefined || isNaN(marketState.distSpx) ? (
                        <span className="text-[9px] shrink-0 font-bold text-amber-600 bg-amber-50 px-1 border border-amber-200/60 rounded">Fehlt</span>
                      ) : marketState.distSpx <= 4 ? (
                        <span className="text-[9px] shrink-0 font-bold text-emerald-600 bg-emerald-50 px-1 border border-emerald-100/80 rounded">✓ OK</span>
                      ) : (
                        <span className="text-[9px] shrink-0 font-bold text-rose-600 bg-rose-50 px-1 border border-rose-100/80 rounded">✗ Sperre</span>
                      )}
                    </div>
                    <input
                      type="number"
                      value={marketState.distSpx !== null && marketState.distSpx !== undefined ? marketState.distSpx : ""}
                      onChange={(e) => handleMarketFieldChange("distSpx", e.target.value)}
                      className="w-full h-11 bg-rose-50/50 border border-rose-100 rounded-xl px-3 font-mono text-xs sm:text-sm font-bold focus:border-rose-400 focus:outline-none text-rose-900 transition-colors"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Dist. Days NDX</span>
                      {marketState.distNdx === null || marketState.distNdx === undefined || isNaN(marketState.distNdx) ? (
                        <span className="text-[9px] shrink-0 font-bold text-amber-600 bg-amber-50 px-1 border border-amber-200/60 rounded">Fehlt</span>
                      ) : marketState.distNdx <= 4 ? (
                        <span className="text-[9px] shrink-0 font-bold text-emerald-600 bg-emerald-50 px-1 border border-emerald-100/80 rounded">✓ OK</span>
                      ) : (
                        <span className="text-[9px] shrink-0 font-bold text-rose-600 bg-rose-50 px-1 border border-rose-100/80 rounded">✗ Sperre</span>
                      )}
                    </div>
                    <input
                      type="number"
                      value={marketState.distNdx !== null && marketState.distNdx !== undefined ? marketState.distNdx : ""}
                      onChange={(e) => handleMarketFieldChange("distNdx", e.target.value)}
                      className="w-full h-11 bg-rose-50/50 border border-rose-100 rounded-xl px-3 font-mono text-xs sm:text-sm font-bold focus:border-rose-400 focus:outline-none text-rose-900 transition-colors"
                    />
                  </div>
                </div>

                {distDaysReasoning && (
                  <div className="p-3 text-[11px] text-slate-600 bg-slate-50 border border-slate-150 rounded-xl leading-relaxed">
                    <span className="font-bold text-slate-900 block mb-1 flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 text-slate-600 fill-slate-100" />
                      AI Verteilungsanalyse:
                    </span>
                    {distDaysReasoning}
                  </div>
                )}
              </div>

              {/* Asset Prices Fields */}
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="block text-[10px] font-bold text-slate-800 uppercase tracking-widest">
                    Live-Assetkurse (€) &amp; ATR
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShowLivePriceConverter(!showLivePriceConverter)}
                      className="inline-flex items-center gap-1 text-[9px] bg-slate-50 text-slate-900 hover:bg-slate-100 border border-slate-100 py-1 px-1.5 rounded-lg font-bold font-sans cursor-pointer whitespace-nowrap"
                      title="USD-Eingaben in Euro umrechnen"
                      id="usd-eur-mr-conv-btn"
                    >
                      <span>🇺🇸 ➔ 🇪🇺 Umrechner</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleHelp('atr')}
                      className="inline-flex items-center justify-center w-5 h-5 rounded-lg text-slate-800 hover:text-slate-900 hover:bg-slate-100/80 bg-slate-50 border border-slate-100/60 shadow-xs transition-all cursor-pointer shrink-0"
                      title="Hilfe anzeigen"
                    >
                      <HelpCircle className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {showLivePriceConverter && (
                  <div className="p-3.5 bg-gradient-to-br from-slate-50 to-slate-50 border border-slate-100 rounded-2xl space-y-2 text-[11px] animate-fade-in shadow-xs">
                    <div className="font-bold text-slate-950 flex items-center gap-1 text-[11px]">
                      <span>🇺🇸 ➔ 🇪🇺 USD-Eingaben in Euro (€) konvertieren</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed text-[10.5px]">
                      Haben Sie den Kurs oder die ATR in USD (z.B. TradingView-Screenshot) eingegeben? Geben Sie hier den Wechselkurs ein und klicken Sie auf "Jetzt umrechnen", um alle aktiven Tabellenfelder in Euro umzugleichen!
                    </p>
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <label className="block text-[9px] font-black text-slate-900 uppercase tracking-wider mb-1">
                          Wechselkurs (EUR/USD)
                        </label>
                        <input
                          type="text"
                          value={mrFxRate}
                          onChange={(e) => setMrFxRate(e.target.value)}
                          className="h-9 w-full bg-white border border-slate-200 focus:border-slate-600 rounded-xl text-center font-mono font-black text-slate-800 text-xs focus:outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleMrConvertUsdToEur}
                        className="h-9 px-4 bg-slate-800 hover:bg-slate-900 text-white font-extrabold rounded-xl text-[11px] transition-all cursor-pointer shadow-sm active:scale-95 whitespace-nowrap"
                      >
                        Jetzt umrechnen 🚀
                      </button>
                    </div>
                  </div>
                )}

                {helpId === 'atr' && (
                  <div className="p-4 text-xs text-slate-950 bg-slate-50/50 rounded-2xl border-l-4 border-slate-400 pl-4 pr-4 leading-relaxed font-semibold space-y-1.5">
                    <p>
                      <strong>Was bedeutet die Average True Range (ATR)?</strong><br />
                      Die ATR misst die historische Volatilität eines Assets über einen bestimmten Zeitraum (z.B. ATR = 15,50 € bei TSLA bedeutet, dass die Aktie pro Tag durchschnittlich um ca. 15,50 € schwankt).
                    </p>
                    <p>
                      In unserem unbestechlichen Risk &amp; Stop-Loss Schutzkonzept wird dieses Maß berechnet:
                    </p>
                    <div className="mt-1 py-1 px-3 bg-slate-100/60 border border-slate-200 rounded font-mono text-[11px] text-slate-900 font-bold inline-block">
                      Stop-Loss = MAX(Harter Anker, Aktueller Kurs - 2 * ATR)
                    </div>
                    <p className="mt-1">
                      Zieht der Kurs nach oben, wandert der Stop vollautomatisch mit (Trailing Stop), schützt erarbeitete Gewinne und grenzt Einstiegsrisiken exakt ein.
                    </p>
                  </div>
                )}

                 {/* TSLA Inputs Row */}
                {/* GENERISCHE KURS-EINGABE — eine Schleife statt 4 kopierter Blöcke.
                    Limits kommen dynamisch aus dem Depot (limitFor), nie mehr hartcodiert. */}
                {coreAssets.map((asset) => {
                  const lp = livePrices[asset.key];
                  const kaufLabel = asset.key === "btc" ? "Sparpl." : "Kauf";
                  return (
                    <div key={`price-input-${asset.key}`} className="space-y-1 border-b border-slate-100 pb-3">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                          {asset.ticker} ({asset.name})
                        </span>
                        <div className="flex items-center gap-1">
                          {!lp.price ? (
                            <span className="text-[9px] shrink-0 font-bold text-amber-600 bg-amber-50 px-1 border border-amber-200/60 rounded">Fehlt Kurs</span>
                          ) : asset.limit > 0 && Number(lp.price) <= asset.limit ? (
                            <span className="text-[9px] shrink-0 font-bold text-emerald-600 bg-emerald-50 px-1 border border-emerald-100/80 rounded">
                              ✓ {kaufLabel} (≤{asset.limit.toLocaleString("de-DE")}€)
                            </span>
                          ) : asset.limit > 0 ? (
                            <span className="text-[9px] shrink-0 font-bold text-slate-500 bg-slate-50 px-1 border border-slate-200/80 rounded">
                              Aktiv (&gt;{asset.limit.toLocaleString("de-DE")}€)
                            </span>
                          ) : (
                            <span className="text-[9px] shrink-0 font-bold text-slate-500 bg-slate-50 px-1 border border-slate-200/80 rounded">Aktiv</span>
                          )}
                          {!lp.atr ? (
                            <span className="text-[9px] shrink-0 font-bold text-amber-600 bg-amber-50 px-1 border border-amber-200/60 rounded">Fehlt ATR</span>
                          ) : (
                            <span className="text-[9px] shrink-0 font-bold text-emerald-600 bg-emerald-50 px-1 border border-emerald-100/80 rounded">ATR ✓</span>
                          )}
                          {lp.date === routineDate ? (
                            <span className="text-[9px] shrink-0 font-bold text-emerald-600 bg-emerald-50 px-1 border border-emerald-100/80 rounded">Datum ✓</span>
                          ) : (
                            <span className="text-[9px] shrink-0 font-bold text-rose-600 bg-rose-50 px-1 border border-rose-100/80 rounded" title={`Sollte ${formatToGermanDate(routineDate)} sein`}>Datum Alt</span>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <DecimalInput
                          value={lp.price}
                          onChange={(val) => handleLivePriceFieldChangeNum(asset.key, "price", val)}
                          placeholder="Preis (€)"
                          className="h-10 w-full bg-slate-50 border border-slate-200 focus:border-slate-600 rounded-xl text-xs px-2 focus:outline-none text-center font-bold"
                        />
                        <DecimalInput
                          value={lp.atr}
                          onChange={(val) => handleLivePriceFieldChangeNum(asset.key, "atr", val)}
                          placeholder="ATR"
                          className="h-10 w-full bg-amber-50/50 border border-amber-100 rounded-xl text-xs px-2 focus:border-amber-450 focus:outline-none text-center font-bold text-amber-900"
                        />
                        <input
                          type="text"
                          value={formatToGermanDate(lp.date)}
                          onChange={(e) => handleLivePriceFieldChange(asset.key, "date", parseCleanDate(e.target.value))}
                          placeholder="Datum"
                          className="h-10 w-full bg-slate-50 border border-slate-200 rounded-xl text-[10px] px-1 text-center font-bold focus:border-slate-600 focus:outline-none"
                        />
                      </div>
                    </div>
                  );
                })}

                {coreAssets.length === 0 && (
                  <div className="text-center py-6 px-4 bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl text-slate-500 text-xs font-semibold">
                    ✨ Alle Vermögenswerte im Depot wurden als verkauft markiert. Derzeit sind keine aktiven Instrumente für ATR-Einträge erforderlich!
                  </div>
                )}
              </div>



            </div>
          </div>
          </div>
        </details>

      </div>

    </div>
  );
}
