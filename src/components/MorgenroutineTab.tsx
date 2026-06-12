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
  Image as ImageIcon,
  Loader2,
  UploadCloud,
  Copy,
  Check,
  Sparkles
} from "lucide-react";
import { MarketState, LivePrices, PortfolioItem, WatchlistItem } from "../types";
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
  onCopyExcelLine: () => void;
  csvExportString: string;
  onShowToast?: (title: string, msg: string, type: "success" | "warning" | "error") => void;
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
  onCopyExcelLine,
  csvExportString,
  onShowToast,
}: MorgenroutineTabProps) {
   // Help tooltips visibility state
  const [helpId, setHelpId] = useState<string | null>(null);
  const [copiedPineScript, setCopiedPineScript] = useState(false);
  const [calculatingDistDays, setCalculatingDistDays] = useState(false);
  const [distDaysReasoning, setDistDaysReasoning] = useState<string | null>(null);
  const [tvImportText, setTvImportText] = useState("");
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
  
  // States for Screenshot parsing via Gemini vision
  const [activeImportTab, setActiveImportTab] = useState<"text" | "screenshot" | "live">("live");
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
        } catch {
          // ignore — DD remain at previous value
        }
      }
      onMarketStateChange(newMarket);

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
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreviewUrl, setScreenshotPreviewUrl] = useState<string | null>(null);
  const [isUploadingScreenshot, setIsUploadingScreenshot] = useState(false);

  const handleScreenshotChange = (file: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      triggerToast("Formatfehler", "⚠️ Bitte wähle eine Bilddatei (z.B. PNG, JPEG) aus.", "warning");
      return;
    }
    setScreenshotFile(file);
    const url = URL.createObjectURL(file);
    setScreenshotPreviewUrl(url);
    triggerToast("Screenshot geladen", `📎 ${file.name} erfolgreich ausgewählt. Starte jetzt die Analyse!`, "success");
  };

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

  const handleScreenshotUploadAndParse = async (fileToUpload?: File) => {
    const file = fileToUpload || screenshotFile;
    if (!file) {
      triggerToast("Auslesefehler", "⚠️ Kein Screenshot ausgewählt.", "warning");
      return;
    }

    setIsUploadingScreenshot(true);
    triggerToast("Screenshot-Import", "⏳ KI analysiert das Bild auf unbestechliche Kennzahlen... Bitte warten.", "success");

    try {
      const base64Data = await resizeAndCompressImage(file);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 Sek. Limit

      let response;
      try {
        response = await fetch("/api/parse-screenshot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64Data }),
          signal: controller.signal,
        });
      } catch (fetchErr: any) {
        if (fetchErr.name === "AbortError") {
          throw new Error("Zeitüberschreitung (Timeout): Der Server oder das KI-Modell hat zu lange für die Antwort gebraucht. Bitte lade die Seite kurz neu oder nutze den Text-Import.");
        }
        throw fetchErr;
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        let errorMsg = "Unerwarteter Fehler beim Server.";
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } else {
          const textError = await response.text();
          if (response.status === 413) {
            errorMsg = "Die Screenshot-Datei ist zu groß. Bitte lade einen kompakteren oder herunterskalierten Screenshot hoch.";
          } else {
            errorMsg = textError.substring(0, 150) || errorMsg;
          }
        }
        throw new Error(errorMsg);
      }

      const results = await response.json();
      console.log("Screenshot API parsing results:", results);

      // Merge the found elements into the current states
      const updatedMarketState = { ...marketState };
      const updatedLivePrices = { ...livePrices };
      let updatedCount = 0;

      // Map parsed fields to our states with solid bounds protection
      if (results.vix !== undefined && results.vix !== null && results.vix >= 5 && results.vix <= 100) {
        updatedMarketState.vix = results.vix;
        updatedCount++;
      }
      if (results.vxv !== undefined && results.vxv !== null && results.vxv >= 5 && results.vxv <= 100) {
        updatedMarketState.vxv = results.vxv;
        updatedCount++;
      }
      if (results.vvix !== undefined && results.vvix !== null && results.vvix >= 30 && results.vvix <= 300) {
        updatedMarketState.vvix = results.vvix;
        updatedCount++;
      }
      if (results.wti !== undefined && results.wti !== null && results.wti >= 20 && results.wti <= 200) {
        updatedMarketState.wti = results.wti;
        updatedCount++;
      }
      if (results.gas !== undefined && results.gas !== null && results.gas >= 1.1 && results.gas <= 15.0 && Math.abs(results.gas - 1.0) > 0.05) {
        updatedMarketState.gas = results.gas;
        updatedCount++;
      }
      if (results.tsla !== undefined && results.tsla !== null && results.tsla >= 10 && results.tsla <= 1500) {
        updatedLivePrices.tsla = { ...updatedLivePrices.tsla, price: results.tsla };
        updatedCount++;
      }
      if (results.now !== undefined && results.now !== null && results.now >= 50 && results.now <= 3000) {
        updatedLivePrices.now = { ...updatedLivePrices.now, price: results.now };
        updatedCount++;
      }
      if (results.baba !== undefined && results.baba !== null && results.baba >= 10 && results.baba <= 500) {
        updatedLivePrices.baba = { ...updatedLivePrices.baba, price: results.baba };
        updatedCount++;
      }
      if (results.btc !== undefined && results.btc !== null && results.btc >= 1000 && results.btc <= 250000) {
        updatedLivePrices.btc = { ...updatedLivePrices.btc, price: results.btc };
        updatedCount++;
      }

      if (updatedCount > 0) {
        onMarketStateChange(updatedMarketState);
        onLivePricesChange(updatedLivePrices);
        saveToImportCache(updatedMarketState, updatedLivePrices);
        triggerToast(
          "Import erfolgreich",
          `🎉 Es wurden ${updatedCount} Kennzahlen erfolgreich aus deinem Screenshot extrahiert und unbestechlich hinterlegt im Kurzzeit-Cache!`,
          "success"
        );
        // Clear file state
        setScreenshotFile(null);
        setScreenshotPreviewUrl(null);
      } else {
        triggerToast(
          "Keine Daten gefunden",
          "⚠️ Der Screenshot wurde analysiert, es konnten aber keine bekannten Parameter (VIX, VVIX, TSLA etc.) abgelesen werden. Bitte stelle sicher, dass die Ticker-Symbole und Kurse gut lesbar sind.",
          "warning"
        );
      }
    } catch (err: any) {
      console.error("Screenshot analysis failure:", err);
      triggerToast(
        "Verarbeitungsfehler",
        `❌ ${err.message || "Der Screenshot konnte nicht per KI verarbeitet werden. Bitte prüfe deinen GEMINI_API_KEY."}`,
        "error"
      );
    } finally {
      setIsUploadingScreenshot(false);
    }
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

  const handleImportTradingViewData = () => {
    if (!tvImportText.trim()) {
      triggerToast(
        "Schnell-Import",
        "⚠️ Das Importfeld ist leer! Bitte kopiere Daten aus TradingView.",
        "warning"
      );
      return;
    }

    const lines = tvImportText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l !== "");

    if (lines.length === 0) {
      triggerToast(
        "Schnell-Import",
        "⚠️ Keine verwertbaren Zeilen im eingegebenen Text gefunden.",
        "warning"
      );
      return;
    }

    // Supported asset and index keys & mappings from user watches
    const tvMappings = [
      { field: "vxv" as const, matchers: ["VXV", "VXVCLS", "S&P 500 3-MONTH"] },
      { field: "vvix" as const, matchers: ["VVIX", "VVIX D.", "CBOE VIX VOLATILITY"] },
      { field: "vix" as const, matchers: ["VIX", "VOLATILITÄTSINDEX S&P"] },
      { field: "spx" as const, matchers: ["SPX", "SPX·", "S&P 555", "S&P 500"] },
      { field: "wti" as const, matchers: ["WT", "WTI", "WEST TEXAS"] },
      { field: "gas" as const, matchers: ["NG1!", "NG1! D", "NATURAL GAS", "ERDGAS"] },
      { field: "tsla" as const, matchers: ["TL0", "TLO", "TSLA", "TESLA"] },
      { field: "now" as const, matchers: ["NOW", "SERVICENOW", "4S0", "4S0 L", "4S0L", "450", "450 L", "450L"] },
      { field: "baba" as const, matchers: ["AHLA", "BABA", "ALIBABA"] },
      { field: "btc" as const, matchers: ["BTCEUR", "BTC", "BITCOIN"] }
    ];

    const isValidPriceForField = (field: string, val: number): boolean => {
      if (val === null || val === undefined || isNaN(val) || val <= 0) return false;
      switch (field) {
        case "vix":
        case "vxv":
          return val >= 5 && val <= 100;
        case "vvix":
          return val >= 30 && val <= 300;
        case "wti":
          return val >= 20 && val <= 200;
        case "gas":
          // Erdgas (Natural Gas) is a small decimal, typically 1.1 to 15.0 USD.
          // It is never in the range of hundreds/thousands, and on no account exactly 1.0.
          return val >= 1.1 && val <= 15.0 && Math.abs(val - 1.0) > 0.05;
        case "tsla":
          return val >= 10 && val <= 1500;
        case "now":
          return val >= 50 && val <= 3000;
        case "baba":
          return val >= 10 && val <= 500;
        case "btc":
          return val >= 1000 && val <= 250000;
        default:
          return true;
      }
    };

    // Helper function to match a string to one of our mapped keys
    const findMapping = (sym: string) => {
      const s = sym.toUpperCase().trim();
      return tvMappings.find((mapping) =>
        mapping.matchers.some((keyword) => {
          const kw = keyword.toUpperCase();
          if (s === kw) return true;
          if (
            s.startsWith(kw + " ") ||
            s.startsWith(kw + "·") ||
            s.startsWith(kw + ".") ||
            s.startsWith(kw + "CLS")
          ) {
            return true;
          }
          // Check words boundary
          const words = s.split(/[\s,·.()]+/);
          if (words.includes(kw)) {
            return true;
          }
          // Special substring check for descriptive labels (e.g. S&P 500 3-MONTH)
          if (kw.length > 5 && s.includes(kw)) {
            return true;
          }
          return false;
        })
      );
    };

    // Helper to extract a price value if it resides directly on the same line
    const extractPriceFromSameLine = (lText: string) => {
      const words = lText.trim().split(/\s+/);
      if (words.length <= 1) return null; // Needs at least the symbol/label and a price numeric field
      
      for (let i = words.length - 1; i >= 0; i--) {
        const word = words[i];
        const cleanWord = word.replace(/[()]/g, ""); // Strip trailing parentheses like (-0.20%)
        
        if (cleanWord.includes('%')) {
          continue; // Skip percentage change values
        }
        if (cleanWord.startsWith('+') || cleanWord.startsWith('-')) {
          continue; // Skip relative/absolute change values
        }
        
        const parsed = parseCleanFloat(cleanWord);
        if (parsed !== null && !isNaN(parsed)) {
          // Avoid matching integers that are parts of descriptions: e.g. "500" in S&P 500, or "3" in 3-Month
          const wordNumStr = cleanWord.replace(/[^\d]/g, "");
          if (wordNumStr === "500" && (lText.toUpperCase().includes("S&P") || lText.toUpperCase().includes("SPX"))) {
            continue;
          }
          if (wordNumStr === "3" && (lText.toUpperCase().includes("MON") || lText.toUpperCase().includes("3"))) {
            continue;
          }
          return parsed;
        }
      }
      return null;
    };

    // Check if we have Block (Grid Column-based) Format headings
    const symbolHeaderIndex = lines.findIndex((l) => {
      const s = l.toUpperCase();
      return s === "SYMBOL" || s === "TICKER";
    });

    const priceHeaderIndex = lines.findIndex((l) => {
      const s = l.toUpperCase();
      return s === "ZULETZT" || s === "LAST" || s === "PREIS" || s === "PRICE" || s === "CURR" || s === "KURS";
    });

    const changeHeaderIndex = lines.findIndex((l) => {
      const s = l.toUpperCase();
      return s === "ÄND" || s === "ÄND." || s === "CHANGE" || s === "CHG" || s === "DIFF";
    });

    let updatedMarketState = { ...marketState };
    let updatedLivePrices = { ...livePrices };
    let importedCount = 0;

    if (symbolHeaderIndex !== -1 && priceHeaderIndex !== -1 && priceHeaderIndex > symbolHeaderIndex) {
      // MODE A: GRID TABLE LAYOUT (Symbols block first, then Prices block)
      const symbolsEndIndex = priceHeaderIndex;
      const pricesEndIndex =
        changeHeaderIndex !== -1 && changeHeaderIndex > priceHeaderIndex
          ? changeHeaderIndex
          : lines.length;

      const rawSymbols = lines.slice(symbolHeaderIndex + 1, symbolsEndIndex);
      const rawPrices = lines.slice(priceHeaderIndex + 1, pricesEndIndex);

      // Map aligned row-by-row on exact parallel indices to avoid index shifts or offsets!
      rawSymbols.forEach((sym, idx) => {
        const mapping = findMapping(sym);
        if (mapping && idx < rawPrices.length) {
          const priceVal = parseCleanFloat(rawPrices[idx]);
          if (priceVal !== null) {
            const field = mapping.field;
            if (isValidPriceForField(field, priceVal)) {
              if (field === "tsla") {
                updatedLivePrices.tsla = { ...updatedLivePrices.tsla, price: priceVal };
                importedCount++;
              } else if (field === "now") {
                updatedLivePrices.now = { ...updatedLivePrices.now, price: priceVal };
                importedCount++;
              } else if (field === "baba") {
                updatedLivePrices.baba = { ...updatedLivePrices.baba, price: priceVal };
                importedCount++;
              } else if (field === "btc") {
                updatedLivePrices.btc = { ...updatedLivePrices.btc, price: priceVal };
                importedCount++;
              } else if (field === "vix") {
                updatedMarketState.vix = priceVal;
                importedCount++;
              } else if (field === "vxv") {
                updatedMarketState.vxv = priceVal;
                importedCount++;
              } else if (field === "vvix") {
                updatedMarketState.vvix = priceVal;
                importedCount++;
              } else if (field === "wti") {
                updatedMarketState.wti = priceVal;
                importedCount++;
              } else if (field === "gas") {
                updatedMarketState.gas = priceVal;
                importedCount++;
              }
            }
          }
        }
      });
    } else {
      // Helper to identify real ticker names vs descriptive multi-word index descriptions in Mode B
      const isTickerLine = (lineStr: string): boolean => {
        const trimmedOriginal = lineStr.trim();
        if (!trimmedOriginal) return false;

        // UI Noise Blacklist (TradingView and application labels)
        const lower = trimmedOriginal.toLowerCase();
        const uiBlacklist = [
          "now", 
          "watchlist", 
          "chart", 
          "erforschen", 
          "community", 
          "menü", 
          "menu", 
          "fehler im import", 
          "import", 
          "beobachten", 
          "beobachtungsliste", 
          "favoriten",
          "t/ tradingview",
          "tradingview"
        ];
        if (uiBlacklist.includes(lower)) {
          return false;
        }

        // Ticker lines from TradingView copy-paste are always uppercase.
        // If the line consists of mixed-case or lowercase (e.g. "Chart", "now", "Menü"), it is not a ticker line.
        const hasLowercase = /[a-zäöüß]/.test(trimmedOriginal);
        if (hasLowercase) {
          return false;
        }

        const s = trimmedOriginal.toUpperCase();
        
        // Exact short names of our known tickers
        const exactTickers = [
          "VIX", "VXV", "VXVCLS", "VVIX", "WTI", "NG1!", "TSLA", "NOW", "BABA", "BTC", "SPX", "SPX-", "BTCEUR", "TLO", "AHLA", "450", "4S0"
        ];
        if (exactTickers.includes(s)) return true;

        // Core known tickers
        const coreTickers = ["VIX", "VXV", "VVIX", "WTI", "NG1!", "TSLA", "NOW", "BABA", "BTC", "SPX", "TL0", "TLO", "4S0", "AHLA", "450"];
        if (coreTickers.some(t => s === t || s.startsWith(t + " ") || s.startsWith(t + "-") || s.startsWith(t + " -") || s.startsWith(t + "."))) {
          return true;
        }

        // General fallback for single short alphanumeric words (no spaces/tabs, <= 7 chars, has letters)
        const noSpaces = !s.includes(" ") && !s.includes("\t");
        const isShort = s.length <= 7;
        const hasLetters = /[A-Z]/.test(s);
        if (noSpaces && isShort && hasLetters) {
          return true;
        }

        return false;
      };

      // Helper to identify if a line is a valid clean indicator/price candidate
      const isPriceCandidate = (lineStr: string): boolean => {
        const s = lineStr.trim();
        if (!s) return false;
        // Must contain at least one digit
        if (!/\d/.test(s)) return false;
        // Must NOT contain % or + or - (indicates percentage or change lines)
        if (s.includes("%") || s.includes("+") || s.includes("-")) return false;
        // Must NOT contain long words with letters (which indicate descriptions like "Volatility" or "Index")
        if (/[a-zA-Z]{4,}/.test(s)) return false;
        return true;
      };

      // Gather all recognized tickers and their positions
      const tickerLinesInfo: { field: "vxv" | "vvix" | "vix" | "spx" | "wti" | "gas" | "tsla" | "now" | "baba" | "btc"; lineText: string; lineIndex: number }[] = [];
      const priceLinesInfo: { value: number; lineText: string; lineIndex: number }[] = [];

      // Smart Block-Split detection based on percentage change delimiter
      const firstPercentChangeIdx = lines.findIndex(l => {
        const s = l.trim();
        return s.includes("%") && (s.includes("+") || s.includes("-"));
      });

      let isBlockSplit = false;

      if (firstPercentChangeIdx !== -1 && firstPercentChangeIdx > 1) {
        // The first price is on the line right before the first percent change line
        const splitIndex = firstPercentChangeIdx - 1;
        
        // Everything before splitIndex is tickers/descriptions part
        const tickersLines = lines.slice(0, splitIndex);
        // Everything from splitIndex onwards is prices/changes part
        const pricesLines = lines.slice(splitIndex);

        // 1. Gather tickers from tickers part only to prevent noise from matching as tickers later
        const matchedFieldsTmp = new Set<string>();
        tickersLines.forEach((line, idx) => {
          if (isTickerLine(line)) {
            const mapping = findMapping(line);
            if (mapping && !matchedFieldsTmp.has(mapping.field)) {
              tickerLinesInfo.push({
                field: mapping.field,
                lineText: line,
                lineIndex: idx
              });
              matchedFieldsTmp.add(mapping.field);
            }
          }
        });

        // 2. Gather prices from prices part only.
        // A true price line is immediately followed by a percent change line.
        pricesLines.forEach((line, idx) => {
          if (isPriceCandidate(line)) {
            const cleanLine = line.replace(/[^0-9,. ]/g, "").trim();
            const val = parseCleanFloat(cleanLine);
            if (val !== null && !isNaN(val) && val > 0) {
              const nextLine = pricesLines[idx + 1];
              const hasPercentChangeNext = nextLine && nextLine.includes("%") && (nextLine.includes("+") || nextLine.includes("-"));
              
              if (hasPercentChangeNext) {
                priceLinesInfo.push({
                  value: val,
                  lineText: line,
                  lineIndex: splitIndex + idx
                });
              }
            }
          }
        });

        if (tickerLinesInfo.length > 0 && priceLinesInfo.length > 0) {
          isBlockSplit = true;
        }
      }

      // If split-by-percent failed, fallback to the indices heuristic
      if (!isBlockSplit) {
        tickerLinesInfo.splice(0, tickerLinesInfo.length);
        priceLinesInfo.splice(0, priceLinesInfo.length);
        const matchedFieldsFallback = new Set<string>();

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (isTickerLine(line)) {
            const mapping = findMapping(line);
            if (mapping && !matchedFieldsFallback.has(mapping.field)) {
              tickerLinesInfo.push({
                field: mapping.field,
                lineText: line,
                lineIndex: i
              });
              matchedFieldsFallback.add(mapping.field);
            }
          }
        }

        const tickerLineIndices = new Set(tickerLinesInfo.map(t => t.lineIndex));
        for (let i = 0; i < lines.length; i++) {
          if (tickerLineIndices.has(i)) continue;
          const line = lines[i];
          if (isPriceCandidate(line)) {
            const cleanLine = line.replace(/[^0-9,. ]/g, "").trim();
            const val = parseCleanFloat(cleanLine);
            if (val !== null && !isNaN(val) && val > 0) {
              priceLinesInfo.push({
                value: val,
                lineText: line,
                lineIndex: i
              });
            }
          }
        }

        isBlockSplit =
          tickerLinesInfo.length > 0 &&
          priceLinesInfo.length > 0 &&
          Math.max(...tickerLinesInfo.map(t => t.lineIndex)) < Math.min(...priceLinesInfo.map(p => p.lineIndex));
      }

      if (isBlockSplit) {
        // Map 1-to-1 in sequential parallel order
        tickerLinesInfo.forEach((tickerInfo, idx) => {
          if (idx < priceLinesInfo.length) {
            const priceVal = priceLinesInfo[idx].value;
            const field = tickerInfo.field;
            if (isValidPriceForField(field, priceVal)) {
              if (field === "tsla") {
                updatedLivePrices.tsla = { ...updatedLivePrices.tsla, price: priceVal };
                importedCount++;
              } else if (field === "now") {
                updatedLivePrices.now = { ...updatedLivePrices.now, price: priceVal };
                importedCount++;
              } else if (field === "baba") {
                updatedLivePrices.baba = { ...updatedLivePrices.baba, price: priceVal };
                importedCount++;
              } else if (field === "btc") {
                updatedLivePrices.btc = { ...updatedLivePrices.btc, price: priceVal };
                importedCount++;
              } else if (field === "vix") {
                updatedMarketState.vix = priceVal;
                importedCount++;
              } else if (field === "vxv") {
                updatedMarketState.vxv = priceVal;
                importedCount++;
              } else if (field === "vvix") {
                updatedMarketState.vvix = priceVal;
                importedCount++;
              } else if (field === "wti") {
                updatedMarketState.wti = priceVal;
                importedCount++;
              } else if (field === "gas") {
                updatedMarketState.gas = priceVal;
                importedCount++;
              } else if (field === "spx") {
                // S&P 500 Index is processed to keep parallel matching aligned, but not directly saved to standard states
                importedCount++;
              }
            }
          }
        });
      } else {
        // Fallback to traditional interleaved parsing
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (!isTickerLine(line)) {
            continue; // Skip description lines, prices, changes, and empty lines!
          }
          const mapping = findMapping(line);
          if (mapping) {
            // Check same-line price extraction first
            let foundPrice: number | null = extractPriceFromSameLine(line);
            if (foundPrice !== null && !isValidPriceForField(mapping.field, foundPrice)) {
              foundPrice = null;
            }
            
            if (foundPrice === null) {
              // Scan ahead in subsequent lines for the next available price value
              for (let j = i + 1; j < Math.min(lines.length, i + 8); j++) {
                const nextLine = lines[j];
                // If we encounter another valid ticker immediately, stop scanning to avoid capturing incorrect numbers
                if (isTickerLine(nextLine)) {
                  break;
                }
                // Skip lines that are description text or change lines
                if (!isPriceCandidate(nextLine)) {
                  continue;
                }
                const cleanNext = nextLine.replace(/[-+%\s]/g, "");
                const num = parseCleanFloat(cleanNext);
                if (num !== null && isValidPriceForField(mapping.field, num)) {
                  foundPrice = num;
                  break;
                }
              }
            }

            if (foundPrice !== null) {
              const field = mapping.field;
              if (field === "tsla") {
                updatedLivePrices.tsla = { ...updatedLivePrices.tsla, price: foundPrice };
                importedCount++;
              } else if (field === "now") {
                updatedLivePrices.now = { ...updatedLivePrices.now, price: foundPrice };
                importedCount++;
              } else if (field === "baba") {
                updatedLivePrices.baba = { ...updatedLivePrices.baba, price: foundPrice };
                importedCount++;
              } else if (field === "btc") {
                updatedLivePrices.btc = { ...updatedLivePrices.btc, price: foundPrice };
                importedCount++;
              } else if (field === "vix") {
                updatedMarketState.vix = foundPrice;
                importedCount++;
              } else if (field === "vxv") {
                updatedMarketState.vxv = foundPrice;
                importedCount++;
              } else if (field === "vvix") {
                updatedMarketState.vvix = foundPrice;
                importedCount++;
              } else if (field === "wti") {
                updatedMarketState.wti = foundPrice;
                importedCount++;
              } else if (field === "gas") {
                updatedMarketState.gas = foundPrice;
                importedCount++;
              }
            }
          }
        }
      }
    }

    if (importedCount > 0) {
      onMarketStateChange(updatedMarketState);
      onLivePricesChange(updatedLivePrices);
      saveToImportCache(updatedMarketState, updatedLivePrices);
      triggerToast(
        "Schnell-Import",
        `🟢 ${importedCount} Werte erfolgreich erkannt und unbestechlich eingepflegt!`,
        "success"
      );
      setTvImportText("");
    } else {
      triggerToast(
        "Schnell-Import",
        "❌ Keine passenden Symbole mit nachfolgenden Preisen erkannt. Überprüfe das Format oder pflege die Kurse manuell ein.",
        "error"
      );
    }
  };

  const handleMarketFieldChange = (key: keyof MarketState, value: string) => {
    const num = parseCleanFloat(value);
    onMarketStateChange({
      ...marketState,
      [key]: num,
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
        distNdx: typeof data.distNdx === "number" ? data.distNdx : marketState.distNdx
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
  } else {
    systemStatusText = "🟢 MARKT INTAKT (KÄUFE ERLAUBT)";
    statusColorClasses = "bg-emerald-50 border-emerald-500 text-emerald-950";
    systemTextLabelColor = "text-emerald-800";
  }

  const isAssetActiveInDepot = (key: string): boolean => {
    if (!portfolioData || portfolioData.length === 0) return true;
    return portfolioData.some(item => item.key === key && item.status !== "sold");
  };

  // Generate warning/info variables for Limit check tables
  const coreAssets = [
    { key: 'tsla' as keyof LivePrices, name: 'Tesla, Inc.', ticker: 'TSLA', isin: 'US88160R1014', limit: 320.00, desc: 'Kauf-Limit @ € 320,00' },
    { key: 'now' as keyof LivePrices, name: 'ServiceNow, Inc.', ticker: 'NOW', isin: 'US81762P1021', limit: 80.00, desc: 'Harter Anker @ € 80,00' },
    { key: 'baba' as keyof LivePrices, name: 'Alibaba Group Holding Ltd.', ticker: 'BABA', isin: 'US01609W1027', limit: 70.00, desc: 'Hartes Limit @ € 70,00' },
    { key: 'btc' as keyof LivePrices, name: 'Bitcoin Tracker Index', ticker: 'BTC', isin: 'DE000A27Z304', limit: 50000.00, desc: 'Sparplan-Kauf @ € 50.000,00' }
  ].filter(asset => isAssetActiveInDepot(asset.key));

  // Mathematically complete check of all 9 system requirements (skipped if asset is sold/inactive in portfolio)
  const missingForToday: string[] = [];
  if (vix === null || vix === undefined) missingForToday.push("US-Volatilität (VIX) fehlt");
  if (vxv === null || vxv === undefined) missingForToday.push("3M-Volatilität (VXV) fehlt");
  if (marketState.vvix === null || marketState.vvix === undefined) missingForToday.push("CBOE VVIX fehlt");
  if (wti === null || wti === undefined) missingForToday.push("WTI Rohölpreis fehlt");
  if (gas === null || gas === undefined) missingForToday.push("Henry Hub Erdgaspreis fehlt");

  if (isAssetActiveInDepot('tsla')) {
    if (!livePrices.tsla.price) {
      missingForToday.push("TSLA Preis fehlt");
    } else if (livePrices.tsla.date !== routineDate) {
      missingForToday.push("TSLA Kurs ist veraltet (Datum Alt)");
    }
  }

  if (isAssetActiveInDepot('now')) {
    if (!livePrices.now.price) {
      missingForToday.push("NOW Preis fehlt");
    } else if (livePrices.now.date !== routineDate) {
      missingForToday.push("NOW Kurs ist veraltet (Datum Alt)");
    }
  }

  if (isAssetActiveInDepot('baba')) {
    if (!livePrices.baba.price) {
      missingForToday.push("BABA Preis fehlt");
    } else if (livePrices.baba.date !== routineDate) {
      missingForToday.push("BABA Kurs ist veraltet (Datum Alt)");
    }
  }

  if (isAssetActiveInDepot('btc')) {
    if (!livePrices.btc.price) {
      missingForToday.push("BTC Preis fehlt");
    } else if (livePrices.btc.date !== routineDate) {
      missingForToday.push("BTC Kurs ist veraltet (Datum Alt)");
    }
  }

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

      {/* 🌐 QUICK-ACTION: Live-Daten in einem Klick — der Daily-Driver. */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-md flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            🌐 Heute starten
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 leading-snug">
            Holt automatisch VIX, VXV, VVIX, SPX, WTI, Gas, deine Aktienkurse, ATR und Distribution Days von Yahoo Finance.
            {lastLiveFetchAt && (
              <span className="block mt-1 text-[11px] text-slate-400 font-mono">
                Zuletzt: {new Date(lastLiveFetchAt).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })}
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={handleFetchLivePrices}
          disabled={isFetchingLive}
          className={
            "shrink-0 inline-flex items-center justify-center gap-2 font-bold rounded-xl px-5 py-3 text-sm transition-all shadow-md active:scale-[0.98] " +
            (isFetchingLive
              ? "bg-slate-300 text-slate-500 cursor-not-allowed"
              : "bg-slate-900 hover:bg-slate-800 text-white")
          }
        >
          {isFetchingLive ? "Lade…" : "🌐 Jetzt abrufen"}
        </button>
      </div>

      {/* Top Banner Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-lg shadow-slate-250/10 md:col-span-2">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 font-display flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-slate-800"></span>
              📋 MORGENROUTINE — {formatToGermanDate(routineDate)}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-2 font-medium leading-relaxed">
              System bereit • Alle Datenfelder freigeschaltet. Kopiere deine Werte direkt aus TradingView ("TW") oder trage sie manuell ein!
            </p>
          </div>
        </div>
        
        <div className={`rounded-3xl p-6 text-center border transition-all duration-300 shadow-md shadow-slate-200/10 flex flex-col justify-center ${statusColorClasses}`}>
          <span className={`block text-[10px] uppercase font-bold tracking-widest mb-1 ${systemTextLabelColor}`}>
            UNBESTECHLICHER STATUS
          </span>
          <span className="text-sm sm:text-base font-bold tracking-tight leading-none uppercase">
            {systemStatusText}
          </span>
          <p className="text-xs font-semibold mt-1.5 opacity-90">
            VIX/VXV-Verhältnis:{" "}
            <span className="font-bold font-mono">
              {ratio ? ratio.toFixed(2) : "0,00"} 
            </span>
            {isContango ? " (Contango)" : " (Backwardation)"}
          </p>
        </div>
      </div>

      {/* 🛡️ SYSTEM-SICHERHEITSPRÜFUNG: TAGESPREISE-CHECK */}
      <div className="animate-fadeIn space-y-4">
        {securityLevel === "green" ? (
          <div className="bg-emerald-50 border border-emerald-250 text-emerald-950 px-5 py-4 rounded-3xl flex items-start gap-3.5 text-left shadow-lg shadow-emerald-500/5">
            <div className="p-1.5 bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-xl shrink-0 mt-0.5">
              <CheckCircle className="h-5 w-5 font-bold" />
            </div>
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-md uppercase tracking-wider block w-fit">
                  System geschützt &amp; unbestechlich
                </span>
                <button
                  type="button"
                  onClick={() => setShowSicherheitsInfo(!showSicherheitsInfo)}
                  className="text-emerald-850 hover:text-emerald-950 text-xs font-extrabold underline flex items-center gap-1 cursor-pointer"
                >
                  <HelpCircle className="h-3.5 w-3.5" /> Wie funktioniert das? {showSicherheitsInfo ? "▲" : "▼"}
                </button>
              </div>
              <h4 className="text-sm font-bold text-emerald-950 mt-1.5 font-display">
                Tageskurse sind aktuell!
              </h4>
              <p className="text-xs text-emerald-850 font-medium leading-relaxed mt-1">
                Die Kurse und Marktindikatoren wurden heute aktualisiert (<strong>{pricesLastUpdated ? `${new Date(pricesLastUpdated).toLocaleDateString("de-DE")} um ${new Date(pricesLastUpdated).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr` : ""}</strong>).
                Alle risiko- und mathematischen Schutzgrenzen sind vollkommen einsatzbereit und unbestechlich sicher für deine heutigen Trades.
              </p>
            </div>
          </div>
        ) : securityLevel === "yellow" ? (
          <div className="bg-amber-50 border border-amber-250 text-amber-950 px-5 py-5 rounded-3xl flex items-start gap-3.5 text-left shadow-lg shadow-amber-500/5">
            <div className="p-1.5 bg-amber-100 border border-amber-200 text-amber-600 rounded-xl shrink-0 mt-0.5 animate-pulse">
              <AlertTriangle className="h-5 w-5 font-bold text-amber-700" />
            </div>
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-[10px] font-extrabold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md uppercase tracking-wider block w-fit">
                  Eingeschränkt geschützt ({missingForToday.length} Werte unvollständig)
                </span>
                <button
                  type="button"
                  onClick={() => setShowSicherheitsInfo(!showSicherheitsInfo)}
                  className="text-amber-850 hover:text-amber-950 text-xs font-extrabold underline flex items-center gap-1 cursor-pointer"
                >
                  <HelpCircle className="h-3.5 w-3.5" /> Wie funktioniert das? {showSicherheitsInfo ? "▲" : "▼"}
                </button>
              </div>
              <h4 className="text-sm font-bold text-amber-950 mt-1.5 font-display flex items-center gap-1.5">
                Warnung: Nicht alle Daten sind tagesaktuell!
              </h4>
              <p className="text-xs text-amber-850 font-medium leading-relaxed mt-1">
                Die 4 wichtigsten Kern-Indikatoren (<span className="font-bold underline">VIX, VXV, VVIX, WTI Öl</span>) sind tagesaktuell vorhanden. Das System ist <strong>eingeschränkt geschützt</strong>, aber es fehlen noch optionale Werte (wie z.B. Erdgas oder aktuelle Einzelaktienkurse).
              </p>

              {/* List of exactly what components are missing/outdated */}
              <div className="mt-3.5 space-y-2">
                <span className="text-[10px] text-amber-800 font-extrabold uppercase tracking-wide block">Ausstehend/Veraltet für heute:</span>
                <div className="flex flex-wrap gap-2">
                  {missingForToday.map((err, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 bg-white border border-amber-200 text-amber-950 px-2 py-1 rounded-xl text-[10px] font-extrabold shadow-sm">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                      {err}
                    </span>
                  ))}
                </div>
              </div>

              <p className="text-xs text-amber-850 font-medium mt-3.5 leading-relaxed font-sans">
                Trage die restlichen Werte unten bei den <strong>Tages-Eingaben</strong> ein oder klicke im Cache-Bereich auf "Letzten Cache laden", um den unbestechlichen Systemschutz vollständig grün zu schalten.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-rose-50 border border-rose-250 text-rose-950 px-5 py-5 rounded-3xl flex items-start gap-3.5 text-left shadow-lg shadow-rose-500/5">
            <div className="p-1.5 bg-rose-100 border border-rose-200 text-rose-700 rounded-xl shrink-0 mt-0.5 animate-pulse">
              <AlertTriangle className="h-5 w-5 font-bold text-rose-600" />
            </div>
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-[10px] font-extrabold text-rose-800 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded-md uppercase tracking-wider block w-fit">
                  Sicherheitsrisiko aktiv ({missingForToday.length} Werte unvollständig)
                </span>
                <button
                  type="button"
                  onClick={() => setShowSicherheitsInfo(!showSicherheitsInfo)}
                  className="text-rose-850 hover:text-rose-950 text-xs font-extrabold underline flex items-center gap-1 cursor-pointer"
                >
                  <HelpCircle className="h-3.5 w-3.5" /> Wie funktioniert das? {showSicherheitsInfo ? "▲" : "▼"}
                </button>
              </div>
              <h4 className="text-sm font-bold text-rose-950 mt-1.5 font-display flex items-center gap-1.5">
                Achtung: Wichtige Kern-Indikatoren fehlen oder sind veraltet!
              </h4>
              <p className="text-xs text-rose-850 font-medium leading-relaxed mt-1">
                Mindestens einer der 4 wichtigsten Kern-Indikatoren (<span className="font-bold">VIX, VXV, VVIX, WTI Öl</span>) ist unvollständig oder veraltet.
                Unser System ist <strong>nicht unbestechlich sicher</strong> für deine heutigen Hebel, Risiko- und Limit-Prüfungen!
              </p>

              {/* List of exactly what components are missing/outdated */}
              <div className="mt-3.5 space-y-2">
                <span className="text-[10px] text-rose-800 font-extrabold uppercase tracking-wide block">Fehlende Kern-Indikatoren:</span>
                <div className="flex flex-wrap gap-2">
                  {missingForToday.map((err, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 bg-white border border-rose-200 text-rose-950 px-2 py-1 rounded-xl text-[10px] font-extrabold shadow-sm">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-600 animate-pulse"></span>
                      {err}
                    </span>
                  ))}
                </div>
              </div>

              <p className="text-xs text-rose-850 font-medium mt-3.5 leading-relaxed font-sans">
                Bitte nutze das Schnell-Import Center unten, um die tagesfrischen Kurse per Text oder Broker-Screenshot einzulesen oder klicke im Cache-Bereich auf "Letzten Cache laden", falls du heute bereits Daten geladen hast.
              </p>
            </div>
          </div>
        )}

        {/* Expandable Explanation for Strangers */}
        {showSicherheitsInfo && (
          <div className="bg-slate-50 border border-slate-205 rounded-3xl p-5 text-left text-slate-800 space-y-4 animate-fadeIn">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-2">
              <span>🛡️</span> Das unbestechliche Sicherheits- &amp; Cache-System erklärt
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-2">
                <div className="flex items-center gap-2 text-slate-800 font-bold">
                  <span className="p-1 bg-slate-50 border border-slate-100 rounded-lg text-xs">1</span>
                  <span>Tages-Sicherheitsprüfung</span>
                </div>
                <p className="text-slate-600 leading-relaxed font-semibold">
                  Das Regelwerk erzwingt unbestechliche Kurse &amp; Indikatoren. Sind die Zahlen älter als heute, warnt das System lautstark vor Hebel- und Risikofehlberechnungen!
                </p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-2">
                <div className="flex items-center gap-2 text-emerald-600 font-bold">
                  <span className="p-1 bg-emerald-50 border border-emerald-100 rounded-lg text-xs">2</span>
                  <span>Unbestechlicher Cache</span>
                </div>
                <p className="text-slate-600 leading-relaxed font-semibold">
                  Bei jedem erfolgreichen Schnell-Import (Text oder KI-Bildanalyse) wird ein unzerstörbarer Cache im lokalen Speicher angelegt. So überstehen die Werte jeden Code-Reload!
                </p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-2">
                <div className="flex items-center gap-2 text-amber-600 font-bold">
                  <span className="p-1 bg-amber-50 border border-amber-100 rounded-lg text-xs">3</span>
                  <span>Einmalige Tages-Routine</span>
                </div>
                <p className="text-slate-600 leading-relaxed font-semibold">
                  Erledige am Morgen einfach 1x den Import. Falls sich danach etwas im Code ändert oder die Webseite neu lädt, klicke einfach auf <strong>"Letzten Cache laden"</strong>.
                </p>
              </div>
            </div>
            <div className="text-[11px] text-slate-500 font-semibold bg-slate-100/50 p-2.5 rounded-xl border border-slate-200/50 flex items-center gap-2">
              <span>💡</span>
              <span><strong>Tipp für Neueinsteiger:</strong> Verwende den TradingView-Textimport oder ziehe einfach einen Screenshot deiner aktuellen Broker- oder Trading-Übersicht in den Uploadbereich.</span>
            </div>
          </div>
        )}
      </div>

      {/* ⚡ SCHNELL-IMPORT-CENTER (Text-Kopieren & Screenshot-Upload) — JETZT PROMINENT OBEN PLATZIERT */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl text-white animate-fadeIn text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-slate-600/20 border border-slate-600/30 rounded-lg text-slate-400">
              <Zap className="h-4 w-4 fill-amber-400 text-amber-400" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-widest text-slate-100 font-display flex items-center gap-2">
                Daten Schnell-Import Center
                <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase bg-slate-600/20 border border-slate-600/30 text-slate-300">KI-Lösung</span>
              </h3>
              <p className="text-[10px] text-slate-400 font-medium leading-relaxed mt-0.5">
                Spielt deine Tagesdaten rasant ein – entweder per Text-Kopie oder vollautomatisch per Screenshot!
              </p>
            </div>
          </div>

          <div className="flex bg-slate-955 p-1 rounded-xl border border-slate-800 shrink-0 self-start sm:self-center">
            <button
              type="button"
              onClick={() => setActiveImportTab("text")}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeImportTab === "text"
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              📋 <span className="hidden sm:inline">Text kopieren</span><span className="sm:hidden">Text</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveImportTab("screenshot")}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeImportTab === "screenshot"
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              📸 <span className="hidden sm:inline">Screenshot hochladen</span><span className="sm:hidden">Bild</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveImportTab("live")}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeImportTab === "live"
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              🌐 <span className="hidden sm:inline">Live abrufen</span><span className="sm:hidden">Live</span>
            </button>
          </div>
        </div>

        {activeImportTab === "text" ? (
          <div className="flex flex-col md:flex-row gap-4 items-stretch">
            <div className="flex-1">
              <textarea 
                value={tvImportText}
                onChange={(e) => setTvImportText(e.target.value)}
                rows={3} 
                placeholder="Füge deine TradingView-Daten hier ein...&#10;z.B. (VIX unter 16,31 oder im Spaltenlayout)" 
                className="w-full p-3 bg-slate-950 border border-slate-850 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-slate-600 focus:ring-1 focus:ring-slate-600 placeholder-slate-700 resize-none h-24"
              />
            </div>
            <div className="flex flex-col justify-between md:w-64 shrink-0 gap-3">
              <div className="text-[10px] text-slate-400 font-medium leading-normal p-2.5 bg-slate-950/40 border border-slate-850/30 rounded-xl">
                <span className="text-amber-400 font-bold block mb-0.5">💡 Funktionsweise:</span>
                Unterstützt automatisches Auslesen bei Grid-Kopien (mit Spaltenköpfen) und Zeilenumbruch-Listen untereinander.
              </div>
              <button 
                type="button" 
                onClick={handleImportTradingViewData} 
                className="w-full h-11 bg-slate-800 hover:bg-slate-900 active:bg-slate-900 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-2"
              >
                <Zap className="h-4 w-4 fill-current text-amber-300" /> Einlesen &amp; Zuordnen
              </button>
            </div>
          </div>
        ) : activeImportTab === "screenshot" ? (
          <div className="flex flex-col gap-4">
            <div className="w-full">
              {/* Drag n Drop Screenshot Area */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleScreenshotChange(file);
                }}
                className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[140px] relative overflow-hidden ${
                  isDragging 
                    ? "border-slate-400 bg-slate-950/40 scale-[0.99]" 
                    : "border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-950"
                }`}
                onClick={() => {
                  // Trigger native input hidden
                  document.getElementById("screenshot_input_uploader")?.click();
                }}
              >
                <input
                  id="screenshot_input_uploader"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleScreenshotChange(file);
                  }}
                  className="hidden"
                />

                {screenshotPreviewUrl ? (
                  <div className="flex flex-col sm:flex-row items-center gap-4 w-full h-full relative z-10 p-1">
                    <img
                      src={screenshotPreviewUrl}
                      alt="Preview"
                      className="h-20 w-32 object-cover rounded-lg border border-slate-700 shadow-lg shrink-0"
                    />
                    <div className="text-left flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-200 truncate">{screenshotFile?.name}</p>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">
                        {(screenshotFile ? screenshotFile.size / 1024 : 0).toFixed(0)} KB • Bereit für KI-Analyse
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setScreenshotFile(null);
                          setScreenshotPreviewUrl(null);
                        }}
                        className="text-[10px] text-rose-450 hover:text-rose-400 underline font-bold mt-2 cursor-pointer block text-left"
                      >
                        Anderen Screenshot wählen
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center">
                    <UploadCloud className={`h-8 w-8 mb-2 text-slate-400 ${isDragging ? 'animate-bounce' : ''}`} />
                    <p className="text-xs font-semibold text-slate-200">
                      Zieh deinen Screenshot von TradingView / Broker hierher
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium mt-1">
                      Klicke, um eine Bilddatei (.png, .jpeg) von deinem Rechner/Smartphone auszuwählen.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="text-[10px] text-slate-400 font-medium leading-normal p-2.5 bg-slate-950/40 border border-slate-850/30 rounded-xl">
                <span className="text-emerald-400 font-bold block mb-0.5">🧠 KI Screenshot-Leser:</span>
                Perfekt zum Einlesen von tabellarischen Depotwerten, Watchlist-Abbildungen oder Kursübersichten. Unser System identifiziert passende Ticker und trägt sie direkt ein.
              </div>
              <button 
                type="button" 
                disabled={isUploadingScreenshot || !screenshotFile}
                onClick={(e) => {
                  e.stopPropagation();
                  handleScreenshotUploadAndParse();
                }} 
                className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-2"
              >
                {isUploadingScreenshot ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-white" /> Analysiere...
                  </>
                ) : (
                  <>
                    <Camera className="h-4 w-4 text-emerald-250 shrink-0" /> Screenshot einlesen
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">🌐</span>
                <h4 className="text-sm font-bold text-slate-100">Aktuelle Kurse direkt holen</h4>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                Lädt VIX, VXV, VVIX, SPX, WTI, Erdgas <strong>und</strong> alle Aktien aus deinem Portfolio + deiner Watchlist live von Yahoo Finance. ATR wird aus der 14-Tage-Historie berechnet.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Marktindikatoren</p>
                  <p className="text-[10px] text-slate-300 font-mono leading-relaxed">VIX · VXV · VVIX · SPX · WTI · NG</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Deine Werte ({portfolioData.length + watchlist.length})</p>
                  <p className="text-[10px] text-slate-300 font-mono leading-relaxed truncate">
                    {[...portfolioData.map(p => p.ticker || p.key.toUpperCase()), ...watchlist.map(w => w.symbol)].join(" · ") || "(noch keine Werte)"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleFetchLivePrices}
                disabled={isFetchingLive}
                className="w-full h-11 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-2"
              >
                {isFetchingLive ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-white" /> Lade Live-Daten...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 fill-current text-amber-300" /> Jetzt abrufen
                  </>
                )}
              </button>
              {lastLiveFetchAt && (
                <p className="text-[10px] text-slate-500 text-center mt-2">
                  Zuletzt aktualisiert: {new Date(lastLiveFetchAt).toLocaleString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit", day: "2-digit", month: "2-digit" })}
                </p>
              )}
            </div>
          </div>
        )}

        {/* 💾 UNBESTECHLICHER IMPORTS-CACHE */}
        <div className="border-t border-slate-800/80 pt-4 mt-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 bg-slate-800/40 border border-slate-700/50 rounded-lg shrink-0 mt-0.5">
                <Clipboard className="h-4 w-4 text-slate-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-200">💾 Letzter erfolgreicher Cache:</span>
                  {importCache ? (
                    isToday(importCache.timestamp) ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        AKTUELL (Unbestechlich von heute, {new Date(importCache.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })})
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-450 animate-pulse"></span>
                        VERALTET (Vom {new Date(importCache.timestamp).toLocaleDateString('de-DE')} • {new Date(importCache.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })})
                      </span>
                    )
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 border border-slate-700 text-slate-400">
                      Kein Cache vorhanden
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mt-1 leading-normal max-w-xl text-left">
                  {importCache ? (
                    isToday(importCache.timestamp) ? (
                      "🟢 Berechnungen sind für heute gesichert. Durch jede Änderung im Code oder Browser-Updates gehen deine Daten nicht verloren!"
                    ) : (
                      "⚠️ Achtung: Das Regelwerk schreibt unbestechliche Tageskurse vor! Veraltete Kurse können deine Risikorechnung verfälschen!"
                    )
                  ) : (
                    "Führe oben den TradingView-Import oder Screenshot-Zuweisung durch, um diesen Cache tagesaktuell zu sichern."
                  )}
                </p>
              </div>
            </div>

            {importCache && (
              <button
                type="button"
                onClick={handleApplyCache}
                className="px-4 py-2 bg-slate-800/30 hover:bg-slate-800 border border-slate-700/40 text-slate-200 hover:text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all self-start sm:self-center cursor-pointer shrink-0 inline-flex items-center gap-1.5 shadow-sm"
              >
                📥 Letzten Cache laden ({new Date(importCache.timestamp).toLocaleDateString('de-DE', {day: 'numeric', month: 'short'})})
              </button>
            )}
          </div>

          {importCache && (
            <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-850/40 mt-3 text-[10px] font-mono text-slate-400 grid grid-cols-2 sm:grid-cols-5 gap-2 text-left">
              <div>VIX: <span className="text-slate-200 font-bold">{importCache.marketState.vix !== null ? importCache.marketState.vix.toFixed(2) : '—'}</span></div>
              <div>VXV: <span className="text-slate-200 font-bold">{importCache.marketState.vxv !== null ? importCache.marketState.vxv.toFixed(2) : '—'}</span></div>
              <div>VVIX: <span className="text-slate-200 font-bold">{importCache.marketState.vvix !== null ? importCache.marketState.vvix.toFixed(2) : '—'}</span></div>
              <div>WTI Oil: <span className="text-slate-200 font-bold">{importCache.marketState.wti !== null ? importCache.marketState.wti.toFixed(2) + ' $' : '—'}</span></div>
              <div>Gas: <span className="text-slate-200 font-bold">{importCache.marketState.gas !== null ? importCache.marketState.gas.toFixed(2) + ' $' : '—'}</span></div>
              <div>TSLA: <span className="text-slate-200 font-bold">{importCache.livePrices.tsla !== null ? importCache.livePrices.tsla.toFixed(2) + ' €' : '—'}</span></div>
              <div>NOW: <span className="text-slate-200 font-bold">{importCache.livePrices.now !== null ? importCache.livePrices.now.toFixed(2) + ' €' : '—'}</span></div>
              <div>BABA: <span className="text-slate-200 font-bold">{importCache.livePrices.baba !== null ? importCache.livePrices.baba.toFixed(2) + ' €' : '—'}</span></div>
              <div className="col-span-2">BTC Index: <span className="text-slate-200 font-bold">{importCache.livePrices.btc !== null ? importCache.livePrices.btc.toLocaleString('de-DE') + ' €' : '—'}</span></div>
            </div>
          )}
        </div>
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
                Damit die unbestechliche Marktampel aktiv schalten kann und deine limit- und risikorechenbasierten Hebel vollkommen abgesichert sind, fehlen noch Werte für heute ({formatToGermanDate(routineDate)}). Tippe diese einfach weiter unten bei den <strong>Tages-Eingaben</strong> ein oder verwende das obige <strong>Schnell-Import-Center</strong> (per Text-Import oder Broker-Screenshot).
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Links: Indicators tables */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Volatilitäts-Trio & Energie-Indikatoren Table */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 space-y-6 shadow-md shadow-slate-200/20">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-4 rounded bg-slate-800 block"></span>
              🚦 Volatilitäts-Trio &amp; Energie-Schranken
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold text-[10px] uppercase tracking-widest bg-slate-50/40">
                    <th className="p-3 pl-4">Indikator</th>
                    <th className="p-3 text-right">Wert</th>
                    <th className="p-3 text-center">Grenzwerte</th>
                    <th className="p-3 text-right pr-4">Ampel-Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  
                  {/* VIX Row */}
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 pl-4">
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
                    </td>
                    <td className={`p-3 text-right font-mono font-bold tabular-nums text-sm sm:text-base ${vix && vix >= 25 ? 'text-rose-600 font-extrabold' : 'text-slate-800'}`}>
                      {vix ? vix.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "FEHLT"}
                    </td>
                    <td className="p-3 text-center text-slate-455 font-mono text-xs font-semibold">Max: 25.00</td>
                    <td className="p-3 text-right pr-4">
                      {vix === null ? (
                        <span className="inline-block px-3 py-1 rounded-full bg-slate-50 text-slate-500 border border-slate-200 text-[10px] font-bold animate-pulse">🔴 FEHLT</span>
                      ) : vix < 25 ? (
                        <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100/70 text-[10px] font-bold uppercase">Gelassen</span>
                      ) : (
                        <span className="inline-block px-3 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-100 text-[10px] font-bold uppercase animate-pulse">Panikverbot</span>
                      )}
                    </td>
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
                    <td className="p-3 pl-4">
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
                    </td>
                    <td className="p-3 text-right font-mono font-bold tabular-nums text-sm sm:text-base text-slate-800">
                      {vxv ? vxv.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "FEHLT"}
                    </td>
                    <td className="p-3 text-center text-slate-450 font-mono text-xs font-semibold">Verhältnis: VIX &lt; VXV</td>
                    <td className="p-3 text-right pr-4">
                      {vxv === null || vix === null ? (
                        <span className="inline-block px-3 py-1 rounded-full bg-slate-50 text-slate-500 border border-slate-200 text-[10px] font-bold animate-pulse">🔴 FEHLT</span>
                      ) : isContango ? (
                        <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100/70 text-[10px] font-bold uppercase">Contango</span>
                      ) : (
                        <span className="inline-block px-3 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-100 text-[10px] font-bold uppercase animate-pulse">Backwardation</span>
                      )}
                    </td>
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
                    <td className="p-3 pl-4">
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
                    </td>
                    <td className="p-3 text-right font-mono font-bold tabular-nums text-sm sm:text-base text-slate-800">
                      {marketState.vvix !== null ? marketState.vvix.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "FEHLT"}
                    </td>
                    <td className="p-3 text-center text-slate-450 font-mono text-xs font-semibold">Max: 100 / 130</td>
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
                    </td>
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
                    <td className="p-3 pl-4">
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
                    </td>
                    <td className={`p-3 text-right font-mono font-bold tabular-nums text-sm sm:text-base ${wti && wti >= 100 ? 'text-rose-600 font-extrabold' : 'text-slate-800'}`}>
                      {wti ? `$ ${wti.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "FEHLT"}
                    </td>
                    <td className="p-3 text-center text-slate-455 font-mono text-xs font-semibold">Schutzgrenze: $ 100,00</td>
                    <td className="p-3 text-right pr-4">
                      {wti === null ? (
                        <span className="inline-block px-3 py-1 rounded-full bg-slate-50 text-slate-500 border border-slate-200 text-[10px] font-bold animate-pulse">🔴 FEHLT</span>
                      ) : wti < 100 ? (
                        <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100/70 text-[10px] font-bold uppercase">OK (100%)</span>
                      ) : (
                        <span className="inline-block px-3 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-100 text-[10px] font-bold uppercase animate-pulse">Risiko -50%</span>
                      )}
                    </td>
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
                    <td className="p-3 pl-4">
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
                    </td>
                    <td className={`p-3 text-right font-mono font-bold tabular-nums text-sm sm:text-base ${gas && gas >= 4.5 ? 'text-rose-600 font-extrabold' : 'text-slate-800'}`}>
                      {gas ? `$ ${gas.toLocaleString('de-DE', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}` : "FEHLT"}
                    </td>
                    <td className="p-3 text-center text-slate-450 font-mono text-xs font-semibold">Sperrlimit: $ 4,50</td>
                    <td className="p-3 text-right pr-4">
                      {gas === null ? (
                        <span className="inline-block px-3 py-1 rounded-full bg-slate-50 text-slate-500 border border-slate-200 text-[10px] font-bold animate-pulse">🔴 FEHLT</span>
                      ) : gas < 4.5 ? (
                        <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100/70 text-[10px] font-bold uppercase">Stabil</span>
                      ) : (
                        <span className="inline-block px-3 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-100 text-[10px] font-bold uppercase animate-pulse">Kaufstopp</span>
                      )}
                    </td>
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

                </tbody>
              </table>
            </div>
          </div>

          {/* Limit- & Nachkaufüberwachung Table */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 space-y-6 shadow-md shadow-slate-200/20">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2 pb-2.5 border-b border-slate-50">
              <span className="w-1.5 h-4 rounded bg-slate-800 block"></span>
              🚦 Limit- &amp; Nachkauf-Wächter (Live-Positionen)
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                    <th className="pb-3">Bestand / Aktie</th>
                    <th className="pb-3 text-center">Kauf-Limit (€)</th>
                    <th className="pb-3 text-center">Aktueller Kurs (€)</th>
                    <th className="pb-3 text-right">Systemsignal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {coreAssets.map((asset) => {
                    const priceData = livePrices[asset.key];
                    const liveVal = priceData ? priceData.price : null;
                    const liveDate = priceData ? priceData.date : "";
                    
                    const isDateMatching = liveDate === routineDate;
                    
                    let signalBadge = (
                      <span className="inline-block px-3 py-1 rounded-full bg-slate-50 text-slate-450 border border-slate-200 text-[10px] font-semibold">
                        Kein Kurs
                      </span>
                    );

                    let statusClass = "text-slate-800";

                    if (liveVal !== null) {
                      const diff = liveVal - asset.limit;
                      if (diff <= 0) {
                        // Under visual threshold LIMIT
                        if (!isMacroHealthy) {
                          signalBadge = (
                            <span className="inline-block px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-100 text-[10px] font-bold">
                              Marktsperre
                            </span>
                          );
                        } else if (isDateMatching) {
                          signalBadge = (
                            <span className="inline-block px-3 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-bold animate-pulse">
                              Käufsignal!
                            </span>
                          );
                          statusClass = "text-emerald-650 font-bold";
                        } else {
                          signalBadge = (
                            <span className="inline-block px-3 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-100 text-[10px] font-bold">
                              Datum Alt
                            </span>
                          );
                        }
                      } else {
                        // Premium above threshold
                        signalBadge = (
                          <span className="inline-block px-3 py-1 rounded-full bg-slate-50 text-slate-800 border border-slate-100 text-[10px] font-bold">
                            +{formatAccounting(diff)} €
                          </span>
                        );
                      }
                    }

                    return (
                      <tr key={asset.key} className="hover:bg-slate-50 transition-colors">
                        <td className="py-4 text-slate-900">
                          <div className="font-bold text-slate-900 leading-tight">{asset.name}</div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1 font-mono text-[10px] text-slate-800 font-extrabold">
                            <span>Kürzel: {asset.ticker}</span>
                            <span className="text-slate-300">•</span>
                            <span className="text-slate-500 font-semibold font-mono font-sans text-[10px]">ISIN: {asset.isin}</span>
                          </div>
                          <span className="block text-[10px] font-semibold text-slate-400 mt-1.5">{asset.desc}</span>
                        </td>
                        <td className="py-4 text-center font-mono font-bold tabular-nums text-slate-500">
                          {formatAccounting(asset.limit)} €
                        </td>
                        <td className="py-4 text-center font-mono">
                          <span className={`block text-xs sm:text-sm ${statusClass} font-bold tabular-nums`}>
                            {liveVal !== null ? `${formatAccounting(liveVal)} €` : "UNGEPRÜFT"}
                          </span>
                          {liveVal !== null && (
                            <span className={`block text-[9px] mt-1 font-semibold ${isDateMatching ? 'text-emerald-600' : 'text-rose-500 font-extrabold animate-pulse'}`}>
                              {isDateMatching ? `Aktiv (${formatToGermanDate(liveDate)})` : `Alt: ${formatToGermanDate(liveDate)} ⚠️`}
                            </span>
                          )}
                        </td>
                        <td className="py-4 text-right">
                          {signalBadge}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Right: Inputs updater and excel csv lines */}
        <div className="space-y-6">
          
          {/* Data Updater card */}
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

              {/* Distribution Days */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider flex items-center gap-1.5">
                    Distribution Days (Distributionstage)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleCalculateDistributionDays}
                      disabled={calculatingDistDays}
                      className="inline-flex items-center gap-1 text-[9px] bg-rose-50 text-rose-700 hover:bg-rose-105 border border-rose-100 py-1 px-2 rounded-lg font-bold font-sans cursor-pointer whitespace-nowrap transition-colors disabled:opacity-50"
                      title="Distribution Days automatisch mit Live-Daten und AI berechnen"
                    >
                      {calculatingDistDays ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin text-rose-600" />
                          <span>Ermittle...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3 w-3 text-rose-500 fill-rose-500" />
                          <span>Auto-Ermitteln (AI)</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleHelp('distDays')}
                      className="inline-flex items-center justify-center w-5 h-5 rounded-full text-rose-600 hover:text-rose-800 hover:bg-rose-100/80 bg-rose-50 border border-rose-100/60 shadow-xs transition-all cursor-pointer shrink-0"
                      title="Anleitung & TradingView Code anzeigen"
                    >
                      <HelpCircle className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {helpId === 'distDays' && (
                  <div className="p-4 text-xs text-rose-950 bg-rose-50/50 rounded-2xl border border-rose-100 pl-4 pr-4 leading-relaxed font-semibold space-y-3">
                    <div>
                      <strong className="text-rose-900">Was bedeuten Distribution Days (Distributionstage)?</strong><br />
                      Ein Distributionstag entsteht, wenn der Index (S&P 500 oder Nasdaq 100) im Minus schließt (typisch ab -0,2%) bei <strong>höherem Handelsvolumen</strong> als am Vortag. Dies signalisiert institutionelle Verkäufe (Verteilung).
                    </div>
                    
                    <ul className="list-disc pl-4 space-y-1 font-bold">
                      <li><span className="text-emerald-800">0 bis 4 Tage:</span> Normaler Markt, Neukäufe sind unbedenklich.</li>
                      <li><span className="text-rose-800">&gt;= 5 Tage (Ampel ROT):</span> Hohe Gefahr einer Marktumkehr. Risiko minimieren, Stops enger ziehen &amp; Neukäufe stoppen!</li>
                    </ul>

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
                {isAssetActiveInDepot('tsla') && (
                  <div className="space-y-1 border-b border-slate-100 pb-3">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">TSLA (Tesla Inc.)</span>
                      <div className="flex items-center gap-1">
                        {!livePrices.tsla.price ? (
                          <span className="text-[9px] shrink-0 font-bold text-amber-600 bg-amber-50 px-1 border border-amber-200/60 rounded">Fehlt Kurs</span>
                        ) : Number(livePrices.tsla.price) <= 320 ? (
                          <span className="text-[9px] shrink-0 font-bold text-emerald-600 bg-emerald-50 px-1 border border-emerald-100/80 rounded">✓ Kauf (≤320€)</span>
                        ) : (
                          <span className="text-[9px] shrink-0 font-bold text-slate-500 bg-slate-50 px-1 border border-slate-200/80 rounded">Aktiv (&gt;320€)</span>
                        )}
                        {!livePrices.tsla.atr ? (
                          <span className="text-[9px] shrink-0 font-bold text-amber-600 bg-amber-50 px-1 border border-amber-200/60 rounded">Fehlt ATR</span>
                        ) : (
                          <span className="text-[9px] shrink-0 font-bold text-emerald-600 bg-emerald-50 px-1 border border-emerald-100/80 rounded">ATR ✓</span>
                        )}
                        {livePrices.tsla.date === routineDate ? (
                          <span className="text-[9px] shrink-0 font-bold text-emerald-600 bg-emerald-55 px-1 border border-emerald-100/80 rounded">Datum ✓</span>
                        ) : (
                          <span className="text-[9px] shrink-0 font-bold text-rose-600 bg-rose-50 px-1 border border-rose-100/80 rounded" title={`Sollte ${formatToGermanDate(routineDate)} sein`}>Datum Alt</span>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <DecimalInput
                        value={livePrices.tsla.price}
                        onChange={(val) => handleLivePriceFieldChangeNum("tsla", "price", val)}
                        placeholder="Preis (€)"
                        className="h-10 w-full bg-slate-50 border border-slate-200 focus:border-slate-600 rounded-xl text-xs px-2 focus:outline-none text-center font-bold"
                      />
                      <DecimalInput
                        value={livePrices.tsla.atr}
                        onChange={(val) => handleLivePriceFieldChangeNum("tsla", "atr", val)}
                        placeholder="ATR"
                        className="h-10 w-full bg-amber-50/50 border border-amber-100 rounded-xl text-xs px-2 focus:border-amber-450 focus:outline-none text-center font-bold text-amber-900"
                      />
                      <input
                        type="text"
                        value={formatToGermanDate(livePrices.tsla.date)}
                        onChange={(e) => handleLivePriceFieldChange("tsla", "date", parseCleanDate(e.target.value))}
                        placeholder="Datum"
                        className="h-10 w-full bg-slate-50 border border-slate-200 rounded-xl text-[10px] px-1 text-center font-bold focus:border-slate-600 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                 {/* NOW Inputs Row */}
                {isAssetActiveInDepot('now') && (
                  <div className="space-y-1 border-b border-slate-100 pb-3">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">NOW (ServiceNow)</span>
                      <div className="flex items-center gap-1">
                        {!livePrices.now.price ? (
                          <span className="text-[9px] shrink-0 font-bold text-amber-600 bg-amber-50 px-1 border border-amber-200/60 rounded">Fehlt Kurs</span>
                        ) : Number(livePrices.now.price) <= 80 ? (
                          <span className="text-[9px] shrink-0 font-bold text-emerald-600 bg-emerald-50 px-1 border border-emerald-100/80 rounded">✓ Kauf (≤80€)</span>
                        ) : (
                          <span className="text-[9px] shrink-0 font-bold text-slate-500 bg-slate-50 px-1 border border-slate-200/80 rounded">Aktiv (&gt;80€)</span>
                        )}
                        {!livePrices.now.atr ? (
                          <span className="text-[9px] shrink-0 font-bold text-amber-600 bg-amber-50 px-1 border border-amber-200/60 rounded">Fehlt ATR</span>
                        ) : (
                          <span className="text-[9px] shrink-0 font-bold text-emerald-600 bg-emerald-50 px-1 border border-emerald-100/80 rounded">ATR ✓</span>
                        )}
                        {livePrices.now.date === routineDate ? (
                          <span className="text-[9px] shrink-0 font-bold text-emerald-600 bg-emerald-50 px-1 border border-emerald-100/80 rounded">Datum ✓</span>
                        ) : (
                          <span className="text-[9px] shrink-0 font-bold text-rose-600 bg-rose-50 px-1 border border-rose-100/80 rounded" title={`Sollte ${formatToGermanDate(routineDate)} sein`}>Datum Alt</span>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <DecimalInput
                        value={livePrices.now.price}
                        onChange={(val) => handleLivePriceFieldChangeNum("now", "price", val)}
                        placeholder="Preis (€)"
                        className="h-10 w-full bg-slate-50 border border-slate-200 focus:border-slate-600 rounded-xl text-xs px-2 focus:outline-none text-center font-bold"
                      />
                      <DecimalInput
                        value={livePrices.now.atr}
                        onChange={(val) => handleLivePriceFieldChangeNum("now", "atr", val)}
                        placeholder="ATR"
                        className="h-10 w-full bg-amber-55/50 border border-amber-100 rounded-xl text-xs px-2 focus:border-amber-450 focus:outline-none text-center font-bold text-amber-900"
                      />
                      <input
                        type="text"
                        value={formatToGermanDate(livePrices.now.date)}
                        onChange={(e) => handleLivePriceFieldChange("now", "date", parseCleanDate(e.target.value))}
                        placeholder="Datum"
                        className="h-10 w-full bg-slate-50 border border-slate-200 rounded-xl text-[10px] px-1 text-center font-bold focus:border-slate-600 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* BABA Inputs Row */}
                {isAssetActiveInDepot('baba') && (
                  <div className="space-y-1 border-b border-slate-100 pb-3">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">BABA (Alibaba)</span>
                      <div className="flex items-center gap-1">
                        {!livePrices.baba.price ? (
                          <span className="text-[9px] shrink-0 font-bold text-amber-600 bg-amber-50 px-1 border border-amber-200/60 rounded">Fehlt Kurs</span>
                        ) : Number(livePrices.baba.price) <= 70 ? (
                          <span className="text-[9px] shrink-0 font-bold text-emerald-600 bg-emerald-50 px-1 border border-emerald-100/80 rounded">✓ Kauf (≤70€)</span>
                        ) : (
                          <span className="text-[9px] shrink-0 font-bold text-slate-500 bg-slate-50 px-1 border border-slate-200/80 rounded">Aktiv (&gt;70€)</span>
                        )}
                        {!livePrices.baba.atr ? (
                          <span className="text-[9px] shrink-0 font-bold text-amber-600 bg-amber-50 px-1 border border-amber-200/60 rounded">Fehlt ATR</span>
                        ) : (
                          <span className="text-[9px] shrink-0 font-bold text-emerald-600 bg-emerald-50 px-1 border border-emerald-100/80 rounded">ATR ✓</span>
                        )}
                        {livePrices.baba.date === routineDate ? (
                          <span className="text-[9px] shrink-0 font-bold text-emerald-600 bg-emerald-50 px-1 border border-emerald-100/80 rounded">Datum ✓</span>
                        ) : (
                          <span className="text-[9px] shrink-0 font-bold text-rose-600 bg-rose-50 px-1 border border-rose-100/80 rounded" title={`Sollte ${formatToGermanDate(routineDate)} sein`}>Datum Alt</span>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <DecimalInput
                        value={livePrices.baba.price}
                        onChange={(val) => handleLivePriceFieldChangeNum("baba", "price", val)}
                        placeholder="Preis (€)"
                        className="h-10 w-full bg-slate-50 border border-slate-200 focus:border-slate-600 rounded-xl text-xs px-2 focus:outline-none text-center font-bold"
                      />
                      <DecimalInput
                        value={livePrices.baba.atr}
                        onChange={(val) => handleLivePriceFieldChangeNum("baba", "atr", val)}
                        placeholder="ATR"
                        className="h-10 w-full bg-amber-55/50 border border-amber-100 rounded-xl text-xs px-2 focus:border-amber-455 focus:outline-none text-center font-bold text-amber-900"
                      />
                      <input
                        type="text"
                        value={formatToGermanDate(livePrices.baba.date)}
                        onChange={(e) => handleLivePriceFieldChange("baba", "date", parseCleanDate(e.target.value))}
                        placeholder="Datum"
                        className="h-10 w-full bg-slate-50 border border-slate-200 rounded-xl text-[10px] px-1 text-center font-bold focus:border-slate-600 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* BTC Inputs Row */}
                {isAssetActiveInDepot('btc') && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">BTC (Bitcoin)</span>
                      <div className="flex items-center gap-1">
                        {!livePrices.btc.price ? (
                          <span className="text-[9px] shrink-0 font-bold text-amber-600 bg-amber-50 px-1 border border-amber-200/60 rounded">Fehlt Kurs</span>
                        ) : Number(livePrices.btc.price) <= 50000 ? (
                          <span className="text-[9px] shrink-0 font-bold text-emerald-600 bg-emerald-50 px-1 border border-emerald-100/80 rounded">✓ Sparpl. (≤50K)</span>
                        ) : (
                          <span className="text-[9px] shrink-0 font-bold text-slate-500 bg-slate-50 px-1 border border-slate-200/80 rounded">Aktiv (&gt;50K)</span>
                        )}
                        {!livePrices.btc.atr ? (
                          <span className="text-[9px] shrink-0 font-bold text-amber-600 bg-amber-50 px-1 border border-amber-200/60 rounded">Fehlt ATR</span>
                        ) : (
                          <span className="text-[9px] shrink-0 font-bold text-emerald-600 bg-emerald-50 px-1 border border-emerald-100/80 rounded">ATR ✓</span>
                        )}
                        {livePrices.btc.date === routineDate ? (
                          <span className="text-[9px] shrink-0 font-bold text-emerald-600 bg-emerald-50 px-1 border border-emerald-100/80 rounded">Datum ✓</span>
                        ) : (
                          <span className="text-[9px] shrink-0 font-bold text-rose-600 bg-rose-50 px-1 border border-rose-100/80 rounded" title={`Sollte ${formatToGermanDate(routineDate)} sein`}>Datum Alt</span>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <DecimalInput
                        value={livePrices.btc.price}
                        onChange={(val) => handleLivePriceFieldChangeNum("btc", "price", val)}
                        placeholder="Preis (€)"
                        className="h-10 w-full bg-slate-50 border border-slate-200 focus:border-slate-600 rounded-xl text-xs px-2 focus:outline-none text-center font-bold"
                      />
                      <DecimalInput
                        value={livePrices.btc.atr}
                        onChange={(val) => handleLivePriceFieldChangeNum("btc", "atr", val)}
                        placeholder="ATR"
                        className="h-10 w-full bg-amber-55/50 border border-amber-100 rounded-xl text-xs px-2 focus:border-amber-455 focus:outline-none text-center font-bold text-amber-900"
                      />
                      <input
                        type="text"
                        value={formatToGermanDate(livePrices.btc.date)}
                        onChange={(e) => handleLivePriceFieldChange("btc", "date", parseCleanDate(e.target.value))}
                        placeholder="Datum"
                        className="h-10 w-full bg-slate-50 border border-slate-200 rounded-xl text-[10px] px-1 text-center font-bold focus:border-slate-600 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {coreAssets.length === 0 && (
                  <div className="text-center py-6 px-4 bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl text-slate-500 text-xs font-semibold">
                    ✨ Alle Vermögenswerte im Depot wurden als verkauft markiert. Derzeit sind keine aktiven Instrumente für ATR-Einträge erforderlich!
                  </div>
                )}
              </div>

              {/* CSV Export Button container */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-widest">
                  📂 Excel CSV-Exportzeile
                </label>
                <textarea
                  value={csvExportString}
                  readOnly
                  rows={2}
                  onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                  className="w-full p-3 bg-slate-55 border border-slate-200 rounded-xl font-mono text-[10px] text-slate-600 focus:outline-none select-all"
                />
                <button
                  type="button"
                  onClick={onCopyExcelLine}
                  className="w-full h-11 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold tracking-tight flex items-center justify-center gap-2 transition-colors shadow-sm active:scale-98 cursor-pointer"
                >
                  <Clipboard className="h-4.5 w-4.5" /> Exportzeile kopieren
                </button>
              </div>

            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
