/**
 * GEMEINSAME AKTIENSUCHE
 * ----------------------
 * Die EINE Stelle, die `/api/stock-search` aufruft.
 *
 * Hintergrund (Umbau 07/2026): Diese Logik existierte zweimal wortgleich in
 * RechnerTab.tsx (Watchlist-Suche + globale Suche) und fehlte im Kauf-Formular
 * des Depots komplett — dort gab es nur ein festes Dropdown. Statt eine dritte
 * Kopie anzulegen, nutzen jetzt alle drei Stellen diesen Hook.
 */
import { useState, useEffect } from "react";

export interface StockSuggestion {
  symbol: string;
  name: string;
  price?: number | null;
  atr?: number | null;
  isin?: string;
  wkn?: string;
}

export interface UseStockSearchResult {
  query: string;
  setQuery: (q: string) => void;
  suggestions: StockSuggestion[];
  isSearching: boolean;
  /** Vorschlagsliste leeren, z.B. nach Auswahl eines Treffers */
  clear: () => void;
}

/**
 * @param debounceMs Wartezeit nach der letzten Eingabe, bevor gesucht wird.
 *                   Bewusst träge, damit jeder Tastendruck keine Anfrage
 *                   auslöst (der Server-Endpunkt nutzt eine KI mit Kontingent).
 */
export function useStockSearch(debounceMs = 500): UseStockSearchResult {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<StockSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    let abgebrochen = false;
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch("/api/stock-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });
        if (response.ok) {
          const data = await response.json();
          if (!abgebrochen && Array.isArray(data)) {
            setSuggestions(data as StockSuggestion[]);
          }
        }
      } catch (e) {
        console.error("[Aktiensuche] Fehler:", e);
      } finally {
        if (!abgebrochen) setIsSearching(false);
      }
    }, debounceMs);

    return () => {
      abgebrochen = true;
      clearTimeout(timer);
    };
  }, [query, debounceMs]);

  return {
    query,
    setQuery,
    suggestions,
    isSearching,
    clear: () => setSuggestions([]),
  };
}

/**
 * Symbol → interner Asset-Key (kleingeschrieben, ohne Börsensuffix).
 * "NFC.DE" → "nfc" ist unerwünscht, deshalb wird ein bekanntes Mapping
 * bevorzugt; ansonsten der Teil vor dem ersten Punkt.
 */
export function symbolToKey(symbol: string): string {
  return symbol.trim().toLowerCase().split(".")[0].split("-")[0];
}
