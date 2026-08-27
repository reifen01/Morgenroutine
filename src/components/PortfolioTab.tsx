/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent, useMemo, useEffect, ChangeEvent } from "react";
import { 
  Wallet, 
  HelpCircle, 
  AlertTriangle, 
  CheckCircle, 
  Clipboard, 
  TrendingUp, 
  Scale,
  Percent,
  Trash2,
  History,
  Plus,
  TrendingDown,
  Edit,
  RotateCcw
} from "lucide-react";
import { LivePrices, PortfolioItem, ChecklistItem, SoldTradeItem, PortfolioPurchase, MarketState, WatchlistItem } from "../types";
import { formatAccounting, formatToGermanDate, parseCleanDate, kestAuf } from "../utils/mathUtils";
import { CombinedJournal } from "./CombinedJournal";
import HilfeLink from "./HilfeLink";
import DepotTable from "./DepotTable";
import { buildAssetRegistry, CORE_ASSETS } from "../utils/assetRegistry";
import { evaluateMarketHealth } from "../utils/marketHealth";
import DepotCurveChart from "./DepotCurveChart";

interface PortfolioTabProps {
  routineDate: string;
  marketState: MarketState;
  livePrices: LivePrices;
  portfolioData: PortfolioItem[];
  onPortfolioDataChange: (data: PortfolioItem[]) => void;
  watchlist: WatchlistItem[];
  checklistData: ChecklistItem[];
  onChecklistDataChange: (data: ChecklistItem[]) => void;
  soldTrades: SoldTradeItem[];
  onSoldTradesChange: (data: SoldTradeItem[]) => void;
  portfolioPurchases: PortfolioPurchase[];
  onPortfolioPurchasesChange: (data: PortfolioPurchase[]) => void;
  customDepots: string[];
  onCustomDepotsChange: (depots: string[]) => void;
  customBesitzer: string[];
  onCustomBesitzerChange: (besitzer: string[]) => void;
  depotStartingCash: Record<string, number>;
  onDepotStartingCashChange: (cash: Record<string, number>) => void;
  onLoadToCalculator: (
    assetKey: string, 
    assetName: string, 
    limitPrice: number, 
    trancheSize: number, 
    currentStop: number
  ) => void;
  onShowToast: (title: string, msg: string, type: "success" | "warning" | "error") => void;
}

export default function PortfolioTab({
  routineDate,
  marketState,
  livePrices,
  portfolioData,
  onPortfolioDataChange,
  watchlist,
  checklistData,
  onChecklistDataChange,
  soldTrades,
  onSoldTradesChange,
  portfolioPurchases,
  onPortfolioPurchasesChange,
  customDepots,
  onCustomDepotsChange,
  customBesitzer,
  onCustomBesitzerChange,
  depotStartingCash,
  onDepotStartingCashChange,
  onLoadToCalculator,
  onShowToast,
}: PortfolioTabProps) {
  const setCustomDepots = onCustomDepotsChange;
  const setCustomBesitzer = onCustomBesitzerChange;
  const setDepotStartingCash = onDepotStartingCashChange;

  const handleUploadLocalJson = (event: ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const file = event.target.files?.[0];
    if (!file) return;

    fileReader.onload = (e) => {
      try {
        const parsedState = JSON.parse(e.target?.result as string);
        
        if (!parsedState.marketState || !parsedState.livePrices) {
          throw new Error("Ungültiges Schema");
        }

        if (parsedState.portfolioData) onPortfolioDataChange(parsedState.portfolioData);
        
        const listData = parsedState.checklistData || parsedState.checklistState;
        if (listData) onChecklistDataChange(listData);
        
        if (parsedState.soldTrades) onSoldTradesChange(parsedState.soldTrades);
        if (parsedState.portfolioPurchases) onPortfolioPurchasesChange(parsedState.portfolioPurchases);
        
        if (parsedState.customDepots && Array.isArray(parsedState.customDepots)) onCustomDepotsChange(parsedState.customDepots);
        if (parsedState.customBesitzer && Array.isArray(parsedState.customBesitzer)) onCustomBesitzerChange(parsedState.customBesitzer);
        if (parsedState.depotStartingCash) onDepotStartingCashChange(parsedState.depotStartingCash);

        onShowToast("System wiederhergestellt", "🟢 Gesamtes Portfolio, Besitzer und Cache erfolgreich aus der lokalen Backup-Datei rekonstruiert!", "success");
      } catch (error) {
        console.error("Local restore failed in Portfolio:", error);
        onShowToast("Import Fehler", "Die Backup-Datei enthält kein gültiges Morgenroutine-Datenformat.", "error");
      }
    };

    fileReader.readAsText(file);
    event.target.value = "";
  };

  const START_CASH = 0;

  // Eiserne reserve state — user sets their own number
  const [cashReserve, setCashReserve] = useState(0);
  const [showWatchlistHelp, setShowWatchlistHelp] = useState(false);

  // ATR parameter states matching the Pine Script ATR Stop Loss Finder parameters
  const [atrMultiplier, setAtrMultiplier] = useState<number>(() => {
    const saved = localStorage.getItem("morgenroutine_atr_multiplier");
    return saved ? parseFloat(saved) : 1.5; // defaults to 1.5, matching Pine Script defval=1.5
  });

  const [atrLength, setAtrLength] = useState<number>(() => {
    const saved = localStorage.getItem("morgenroutine_atr_length");
    return saved ? parseInt(saved) : 14; // defaults to 14
  });

  const [atrSmoothing, setAtrSmoothing] = useState<string>(() => {
    const saved = localStorage.getItem("morgenroutine_atr_smoothing");
    return saved ? saved : "RMA"; // defaults to "RMA"
  });

  const [showPineCode, setShowPineCode] = useState<boolean>(false);

  useEffect(() => {
    localStorage.setItem("morgenroutine_atr_multiplier", atrMultiplier.toString());
  }, [atrMultiplier]);

  useEffect(() => {
    localStorage.setItem("morgenroutine_atr_length", atrLength.toString());
  }, [atrLength]);

  useEffect(() => {
    localStorage.setItem("morgenroutine_atr_smoothing", atrSmoothing);
  }, [atrSmoothing]);

  // Form states for manual purchase registration
  const [showAddPurchaseForm, setShowAddPurchaseForm] = useState(false);
  const [purchaseAssetKey, setPurchaseAssetKey] = useState<string>("tsla");
  const [purchaseCustomKeyEnabled, setPurchaseCustomKeyEnabled] = useState<boolean>(false);
  const [purchaseAssetName, setPurchaseAssetName] = useState("Tesla, Inc.");
  const [purchaseKaufKurs, setPurchaseKaufKurs] = useState("");
  const [purchaseAnzahlAktien, setPurchaseAnzahlAktien] = useState("");
  const [purchaseTotalKosten, setPurchaseTotalKosten] = useState("");
  const [purchaseDatum, setPurchaseDatum] = useState(routineDate);
  const [purchaseNotiz, setPurchaseNotiz] = useState("");
  const [purchaseGedanken, setPurchaseGedanken] = useState("");
  const [purchaseZiele, setPurchaseZiele] = useState("");
  const [editingPurchaseId, setEditingPurchaseId] = useState<string | null>(null);
  
  // Pending delete confirmations
  const [pendingDeletePurchaseId, setPendingDeletePurchaseId] = useState<string | null>(null);

  // Form states for documenting sales
  const [showAddSaleForm, setShowAddSaleForm] = useState(false);
  const [saleAssetName, setSaleAssetName] = useState("");
  const [saleAssetKey, setSaleAssetKey] = useState("tsla");
  const [saleKaufKurs, setSaleKaufKurs] = useState("");
  const [saleVerkaufsKurs, setSaleVerkaufsKurs] = useState("");
  const [saleAnzahlAktien, setSaleAnzahlAktien] = useState("");
  const [saleDatum, setSaleDatum] = useState(routineDate);
  const [saleNotiz, setSaleNotiz] = useState("");
  const [saleTaxMethod, setSaleTaxMethod] = useState<'FIFO' | 'durchschnitt'>("durchschnitt");
  const [editingTradeId, setEditingTradeId] = useState<string | null>(null);
  const [journalTab, setJournalTab] = useState<'combined' | 'purchases' | 'sales'>('combined');

  // Budget Checklist Management States
  const [showAddChecklistItemForm, setShowAddChecklistItemForm] = useState(false);
  const [newChecklistAsset, setNewChecklistAsset] = useState("");
  const [newChecklistTitle, setNewChecklistTitle] = useState("");
  const [newChecklistTranche, setNewChecklistTranche] = useState("20000");

  const soldTickers = useMemo(() => {
    const sold = new Set<string>();
    portfolioData.forEach(p => {
      if (p.status === 'sold') {
        const sym = (p.ticker || p.key || "").toString().toUpperCase();
        if (sym) sold.add(sym);
      }
    });
    soldTrades.forEach(s => {
      const sym = (s.key || "").toString().toUpperCase();
      if (sym) sold.add(sym);
    });
    return sold;
  }, [portfolioData, soldTrades]);

  const eligibleStocks = useMemo(() => {
    const list: { symbol: string; name: string; source: 'Depot' | 'Watchlist' }[] = [];
    
    // 1. Depot stocks (active)
    portfolioData.forEach(p => {
      if (p.status !== 'sold') {
        const sym = (p.ticker || p.key || "").toString().toUpperCase();
        if (sym && !soldTickers.has(sym) && !list.some(item => item.symbol === sym)) {
          list.push({
            symbol: sym,
            name: p.name,
            source: 'Depot'
          });
        }
      }
    });

    // 2. Watchlist stocks
    const getWatchlist = () => {
      const saved = localStorage.getItem("morgenroutine_watchlist");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          return [];
        }
      }
      return [
        { symbol: "AAPL", name: "Apple Inc." },
        { symbol: "NVDA", name: "NVIDIA Corp." },
        { symbol: "MSFT", name: "Microsoft Corp." }
      ];
    };
    
    const wl = getWatchlist();
    wl.forEach((w: any) => {
      const sym = (w.symbol || "").toUpperCase().trim();
      if (sym && !soldTickers.has(sym) && !list.some(item => item.symbol === sym)) {
        list.push({
          symbol: sym,
          name: w.name || sym,
          source: 'Watchlist'
        });
      }
    });

    return list;
  }, [portfolioData, soldTickers]);

  // Management open states and inline input states
  const [showDepotManagement, setShowDepotManagement] = useState<boolean>(false);
  const [newDepotInput, setNewDepotInput] = useState("");
  const [newBesitzerInput, setNewBesitzerInput] = useState("");

  // Depot and Owner states
  const [purchaseDepot, setPurchaseDepot] = useState(() => customDepots[0] || "Flatex");
  const [purchaseBesitzer, setPurchaseBesitzer] = useState(() => customBesitzer[0] || "Andres");
  const [saleDepot, setSaleDepot] = useState(() => customDepots[0] || "Flatex");
  const [saleBesitzer, setSaleBesitzer] = useState(() => customBesitzer[0] || "Andres");

  // Keep defaults updated if custom lists update when empty
  useEffect(() => {
    if (!purchaseDepot && customDepots.length > 0) {
      setPurchaseDepot(customDepots[0]);
    }
    if (!purchaseBesitzer && customBesitzer.length > 0) {
      setPurchaseBesitzer(customBesitzer[0]);
    }
    if (!saleDepot && customDepots.length > 0) {
      setSaleDepot(customDepots[0]);
    }
    if (!saleBesitzer && customBesitzer.length > 0) {
      setSaleBesitzer(customBesitzer[0]);
    }
  }, [customDepots, customBesitzer, purchaseDepot, purchaseBesitzer, saleDepot, saleBesitzer]);

  // Sorting states
  const [purchaseSortField, setPurchaseSortField] = useState<string>("kaufDatum");
  const [purchaseSortAsc, setPurchaseSortAsc] = useState<boolean>(false);
  const [saleSortField, setSaleSortField] = useState<string>("verkaufsDatum");
  const [saleSortAsc, setSaleSortAsc] = useState<boolean>(false);

  // Sorting & Filtering for Combined Transaction Journal
  const [txTypeFilter, setTxTypeFilter] = useState<'all' | 'buy' | 'sell'>('all');
  const [txDepotFilter, setTxDepotFilter] = useState<string>('all');
  const [txBesitzerFilter, setTxBesitzerFilter] = useState<string>('all');
  const [txSearchQuery, setTxSearchQuery] = useState<string>('');
  const [txSortField, setTxSortField] = useState<'datum' | 'name' | 'depot' | 'besitzer' | 'volumen'>('datum');
  const [txSortAsc, setTxSortAsc] = useState<boolean>(false);

  // Suggested dynamic items (combining custom lists with existing items for tables)
  const existingDepots = useMemo(() => {
    const list = new Set<string>(customDepots);
    portfolioPurchases.forEach(p => { if (p.depot) list.add(p.depot); });
    soldTrades.forEach(s => { if (s.depot) list.add(s.depot); });
    return Array.from(list);
  }, [customDepots, portfolioPurchases, soldTrades]);

  const existingBesitzer = useMemo(() => {
    const list = new Set<string>(customBesitzer);
    portfolioPurchases.forEach(p => { if (p.besitzerName) list.add(p.besitzerName); });
    soldTrades.forEach(s => { if (s.besitzerName) list.add(s.besitzerName); });
    return Array.from(list);
  }, [customBesitzer, portfolioPurchases, soldTrades]);

  // Handle custom depots / owners lists
  const handleAddCustomDepot = () => {
    const trimmed = newDepotInput.trim();
    if (!trimmed) return;
    if (customDepots.includes(trimmed)) {
      onShowToast("Eintrag existiert", "Dieses Depot ist bereits in der Liste.", "warning");
      return;
    }
    setCustomDepots([...customDepots, trimmed]);
    setNewDepotInput("");
    onShowToast("Depot hinzugefügt", `🏢 '${trimmed}' steht jetzt für Käufe und Verkäufe zur Auswahl!`, "success");
  };

  const handleDeleteCustomDepot = (depot: string) => {
    if (customDepots.length <= 1) {
      onShowToast("Fehler", "Mindestens ein Depot muss in der Auswahl bleiben.", "error");
      return;
    }
    setCustomDepots(customDepots.filter(d => d !== depot));
    onShowToast("Depot gelöscht", `🗑️ Depot '${depot}' wurde aus der Auswahlliste entfernt.`, "success");
  };

  const handleAddCustomBesitzer = () => {
    const trimmed = newBesitzerInput.trim();
    if (!trimmed) return;
    if (customBesitzer.includes(trimmed)) {
      onShowToast("Eintrag existiert", "Dieser Besitzer ist bereits in der Liste.", "warning");
      return;
    }
    setCustomBesitzer([...customBesitzer, trimmed]);
    setNewBesitzerInput("");
    onShowToast("Besitzer hinzugefügt", `👤 '${trimmed}' steht jetzt für Käufe und Verkäufe zur Auswahl!`, "success");
  };

  const handleDeleteCustomBesitzer = (owner: string) => {
    if (customBesitzer.length <= 1) {
      onShowToast("Fehler", "Mindestens ein Besitzer muss in der Auswahl bleiben.", "error");
      return;
    }
    setCustomBesitzer(customBesitzer.filter(o => o !== owner));
    onShowToast("Besitzer gelöscht", `🗑️ Besitzer '${owner}' wurde aus der Auswahlliste entfernt.`, "success");
  };

  // Dynamic depot-level and owner-level consolidation
  const depotOverview = useMemo(() => {
    const map = new Map<string, {
      depot: string;
      besitzerName: string;
      totalActiveCost: number;     // active shares * kaufkurs
      totalActiveValue: number;    // active shares * livePrice
      realizedGross: number;       // gewinnVerlust from soldTrades
      realizedKest: number;        // kestBetrag from soldTrades
      realizedNet: number;         // nettoGewinn from soldTrades
    }>();

    const getMapKey = (depot: string, owner: string) => `${depot.trim()}|||${owner.trim()}`;

    // 1. Process active purchases to compute active holdings & values
    portfolioPurchases.forEach(p => {
      const dep = p.depot || "Standard Depot";
      const own = p.besitzerName || "Standard Besitzer";
      const key = getMapKey(dep, own);

      if (!map.has(key)) {
        map.set(key, {
          depot: dep,
          besitzerName: own,
          totalActiveCost: 0,
          totalActiveValue: 0,
          realizedGross: 0,
          realizedKest: 0,
          realizedNet: 0,
        });
      }

      const record = map.get(key)!;
      const activeShares = p.verbleibendeAnzahlAktien;
      if (activeShares > 0) {
        record.totalActiveCost += activeShares * p.kaufKurs;
        
        // Find live price for p.key
        const livePr = livePrices[p.key as keyof typeof livePrices]?.price || p.kaufKurs;
        record.totalActiveValue += activeShares * livePr;
      }
    });

    // 2. Process sold trades to compute realized profit/loss & tax metrics
    soldTrades.forEach(s => {
      const dep = s.depot || "Standard Depot";
      const own = s.besitzerName || "Standard Besitzer";
      const key = getMapKey(dep, own);

      if (!map.has(key)) {
        map.set(key, {
          depot: dep,
          besitzerName: own,
          totalActiveCost: 0,
          totalActiveValue: 0,
          realizedGross: 0,
          realizedKest: 0,
          realizedNet: 0,
        });
      }

      const record = map.get(key)!;
      record.realizedGross += s.gewinnVerlust;
      record.realizedKest += s.kestBetrag;
      record.realizedNet += s.nettoGewinn;
    });

    return Array.from(map.values());
  }, [portfolioPurchases, soldTrades, livePrices]);

  // Dynamic depot cash balances
  const depotCashBalances = useMemo(() => {
    const balances: Record<string, number> = {};
    
    // Initialize starting cash for all listed customDepots
    customDepots.forEach(dep => {
      balances[dep] = depotStartingCash[dep] ?? 40000;
    });

    // Subtract all register costs of purchases (buys)
    portfolioPurchases.forEach(p => {
      const dep = p.depot || "Standard Depot";
      const cost = p.tatsaechlicheKosten || (p.anzahlAktien * p.kaufKurs);
      if (balances[dep] === undefined) {
        balances[dep] = (depotStartingCash[dep] ?? 40000);
      }
      balances[dep] -= cost;
    });

    // Add all sales net proceeds
    soldTrades.forEach(s => {
      const dep = s.depot || "Standard Depot";
      const proceed = (s.anzahlAktien * s.verkaufsKurs) - s.kestBetrag;
      if (balances[dep] === undefined) {
        balances[dep] = (depotStartingCash[dep] ?? 40000);
      }
      balances[dep] += proceed;
    });

    return balances;
  }, [customDepots, depotStartingCash, portfolioPurchases, soldTrades]);

  // Computes grand totals over all depots
  const overallTotals = useMemo(() => {
    let activeCostSum = 0;
    let activeValueSum = 0;
    let realizedGrossSum = 0;
    let realizedKestSum = 0;
    let realizedNetSum = 0;

    depotOverview.forEach(item => {
      activeCostSum += item.totalActiveCost;
      activeValueSum += item.totalActiveValue;
      realizedGrossSum += item.realizedGross;
      realizedKestSum += item.realizedKest;
      realizedNetSum += item.realizedNet;
    });

    // Sum of starting cash over unique custom depots
    let startingCashSum = 0;
    customDepots.forEach(dep => {
      startingCashSum += depotStartingCash[dep] ?? 40000;
    });

    // Calculate total dynamic cash across all depots
    let totalCashSum = startingCashSum;
    portfolioPurchases.forEach(p => {
      totalCashSum -= p.tatsaechlicheKosten || (p.anzahlAktien * p.kaufKurs);
    });
    soldTrades.forEach(s => {
      totalCashSum += (s.anzahlAktien * s.verkaufsKurs) - s.kestBetrag;
    });

    const grandTotalValue = activeValueSum + totalCashSum;

    return {
      activeCostSum,
      activeValueSum,
      realizedGrossSum,
      realizedKestSum,
      realizedNetSum,
      totalCashSum,
      grandTotalValue
    };
  }, [depotOverview, customDepots, depotStartingCash, portfolioPurchases, soldTrades]);

  // Computes sorted purchases
  const sortedPurchases = useMemo(() => {
    return [...portfolioPurchases].sort((a, b) => {
      let valA: any = "";
      let valB: any = "";

      switch (purchaseSortField) {
        case "kaufDatum":
          valA = new Date(a.kaufDatum).getTime();
          valB = new Date(b.kaufDatum).getTime();
          break;
        case "name":
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
          break;
        case "key":
          valA = String(a.key).toLowerCase();
          valB = String(b.key).toLowerCase();
          break;
        case "kaufKurs":
          valA = a.kaufKurs;
          valB = b.kaufKurs;
          break;
        case "anzahlAktien":
          valA = a.anzahlAktien;
          valB = b.anzahlAktien;
          break;
        case "verbleibendeAnzahlAktien":
          valA = a.verbleibendeAnzahlAktien;
          valB = b.verbleibendeAnzahlAktien;
          break;
        case "tatsaechlicheKosten":
          valA = a.tatsaechlicheKosten;
          valB = b.tatsaechlicheKosten;
          break;
        case "depot":
          valA = (a.depot || "Standard Depot").toLowerCase();
          valB = (b.depot || "Standard Depot").toLowerCase();
          break;
        case "besitzerName":
          valA = (a.besitzerName || "Standard Besitzer").toLowerCase();
          valB = (b.besitzerName || "Standard Besitzer").toLowerCase();
          break;
        default:
          valA = a.kaufDatum;
          valB = b.kaufDatum;
      }

      if (valA < valB) return purchaseSortAsc ? -1 : 1;
      if (valA > valB) return purchaseSortAsc ? 1 : -1;
      return 0;
    });
  }, [portfolioPurchases, purchaseSortField, purchaseSortAsc]);

  // Computes sorted sales (soldTrades)
  const sortedSales = useMemo(() => {
    return [...soldTrades].sort((a, b) => {
      let valA: any = "";
      let valB: any = "";

      switch (saleSortField) {
        case "verkaufsDatum":
          valA = new Date(a.verkaufsDatum).getTime();
          valB = new Date(b.verkaufsDatum).getTime();
          break;
        case "name":
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
          break;
        case "anzahlAktien":
          valA = a.anzahlAktien;
          valB = b.anzahlAktien;
          break;
        case "kaufKurs":
          valA = a.kaufKurs;
          valB = b.kaufKurs;
          break;
        case "verkaufsKurs":
          valA = a.verkaufsKurs;
          valB = b.verkaufsKurs;
          break;
        case "gewinnVerlust":
          valA = a.gewinnVerlust;
          valB = b.gewinnVerlust;
          break;
        case "kestBetrag":
          valA = a.kestBetrag;
          valB = b.kestBetrag;
          break;
        case "nettoGewinn":
          valA = a.nettoGewinn;
          valB = b.nettoGewinn;
          break;
        case "depot":
          valA = (a.depot || "Standard Depot").toLowerCase();
          valB = (b.depot || "Standard Depot").toLowerCase();
          break;
        case "besitzerName":
          valA = (a.besitzerName || "Standard Besitzer").toLowerCase();
          valB = (b.besitzerName || "Standard Besitzer").toLowerCase();
          break;
        default:
          valA = a.verkaufsDatum;
          valB = b.verkaufsDatum;
      }

      if (valA < valB) return saleSortAsc ? -1 : 1;
      if (valA > valB) return saleSortAsc ? 1 : -1;
      return 0;
    });
  }, [soldTrades, saleSortField, saleSortAsc]);

  // Combined Transactions list (Käufe and Verkäufe combined)
  const combinedTransactions = useMemo(() => {
    const list: Array<{
      id: string;
      rawId: string;
      type: 'buy' | 'sell';
      datum: string;
      name: string;
      key: string;
      depot: string;
      besitzerName: string;
      anzahlAktien: number;
      verbleibendeAnzahlAktien?: number;
      kaufKurs: number;
      verkaufsKurs?: number;
      volumen: number;
      gewinnVerlust?: number;
      kestBetrag?: number;
      nettoGewinn?: number;
      notiz: string;
      taxMethod?: 'FIFO' | 'durchschnitt';
      originalItem: any;
    }> = [];

    // Add Purchases
    portfolioPurchases.forEach(p => {
      list.push({
        id: `buy-${p.id}`,
        rawId: p.id,
        type: 'buy',
        datum: p.kaufDatum,
        name: p.name,
        key: p.key,
        depot: p.depot || "Standard Depot",
        besitzerName: p.besitzerName || "Standard Besitzer",
        anzahlAktien: p.anzahlAktien,
        verbleibendeAnzahlAktien: p.verbleibendeAnzahlAktien,
        kaufKurs: p.kaufKurs,
        volumen: p.tatsaechlicheKosten || (p.anzahlAktien * p.kaufKurs),
        notiz: p.notiz || "",
        originalItem: p
      });
    });

    // Add Sales
    soldTrades.forEach(s => {
      list.push({
        id: `sell-${s.id}`,
        rawId: s.id,
        type: 'sell',
        datum: s.verkaufsDatum,
        name: s.name,
        key: s.key,
        depot: s.depot || "Standard Depot",
        besitzerName: s.besitzerName || "Standard Besitzer",
        anzahlAktien: s.anzahlAktien,
        kaufKurs: s.kaufKurs,
        verkaufsKurs: s.verkaufsKurs,
        volumen: s.anzahlAktien * s.verkaufsKurs,
        gewinnVerlust: s.gewinnVerlust,
        kestBetrag: s.kestBetrag,
        nettoGewinn: s.nettoGewinn,
        notiz: s.notiz || "",
        taxMethod: s.taxMethod,
        originalItem: s
      });
    });

    // Apply filtering
    let filtered = list.filter(item => {
      if (txTypeFilter === 'buy' && item.type !== 'buy') return false;
      if (txTypeFilter === 'sell' && item.type !== 'sell') return false;
      if (txDepotFilter !== 'all' && item.depot !== txDepotFilter) return false;
      if (txBesitzerFilter !== 'all' && item.besitzerName !== txBesitzerFilter) return false;

      if (txSearchQuery.trim()) {
        const query = txSearchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesKey = item.key.toLowerCase().includes(query);
        const matchesNotiz = item.notiz.toLowerCase().includes(query);
        const matchesDepot = item.depot.toLowerCase().includes(query);
        const matchesBesitzer = item.besitzerName.toLowerCase().includes(query);
        if (!matchesName && !matchesKey && !matchesNotiz && !matchesDepot && !matchesBesitzer) return false;
      }

      return true;
    });

    // Apply sorting
    filtered.sort((a, b) => {
      let valA: any = "";
      let valB: any = "";

      switch (txSortField) {
        case 'datum':
          valA = new Date(a.datum).getTime();
          valB = new Date(b.datum).getTime();
          break;
        case 'name':
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
          break;
        case 'depot':
          valA = a.depot.toLowerCase();
          valB = b.depot.toLowerCase();
          break;
        case 'besitzer':
          valA = a.besitzerName.toLowerCase();
          valB = b.besitzerName.toLowerCase();
          break;
        case 'volumen':
          valA = a.volumen;
          valB = b.volumen;
          break;
        default:
          valA = new Date(a.datum).getTime();
          valB = new Date(b.datum).getTime();
          break;
      }

      if (valA < valB) return txSortAsc ? -1 : 1;
      if (valA > valB) return txSortAsc ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [portfolioPurchases, soldTrades, txTypeFilter, txDepotFilter, txBesitzerFilter, txSearchQuery, txSortField, txSortAsc]);

  // Derived active portfolio holdings from purchase journal (remaining shares > 0)
  const derivedActivePortfolio = useMemo(() => {
    // Only look at purchases that still have shares left
    const activePurchases = portfolioPurchases.filter(p => p.verbleibendeAnzahlAktien > 0);
    
    // Group them by asset key, depot, and owner
    const map = new Map<string, {
      key: string;
      name: string;
      depot: string;
      besitzerName: string;
      totalShares: number;
      totalCost: number; // sum of (verbleibendeAnzahlAktien * kaufKurs)
      averageKaufkurs: number;
    }>();

    activePurchases.forEach(p => {
      const dep = p.depot || "Standard Depot";
      const own = p.besitzerName || "Standard Besitzer";
      const groupKey = `${p.key.trim()}|||${dep.trim()}|||${own.trim()}`;
      
      if (!map.has(groupKey)) {
        map.set(groupKey, {
          key: p.key,
          name: p.name,
          depot: dep,
          besitzerName: own,
          totalShares: 0,
          totalCost: 0,
          averageKaufkurs: 0
        });
      }

      const item = map.get(groupKey)!;
      item.totalShares += p.verbleibendeAnzahlAktien;
      item.totalCost += p.verbleibendeAnzahlAktien * p.kaufKurs;
    });

    const results = Array.from(map.values());
    results.forEach(item => {
      if (item.totalShares > 0) {
        item.averageKaufkurs = item.totalCost / item.totalShares;
      }
    });

    return results;
  }, [portfolioPurchases]);

  // Zentrales Asset-Register: Depot-Limits + Watchlist + Kern-Assets
  const assetRegistry = useMemo(
    () => buildAssetRegistry(portfolioData, watchlist),
    [portfolioData, watchlist]
  );

  const handleSortPurchases = (field: string) => {
    if (purchaseSortField === field) {
      setPurchaseSortAsc(!purchaseSortAsc);
    } else {
      setPurchaseSortField(field);
      setPurchaseSortAsc(true);
    }
  };

  const handleSortSales = (field: string) => {
    if (saleSortField === field) {
      setSaleSortAsc(!saleSortAsc);
    } else {
      setSaleSortField(field);
      setSaleSortAsc(true);
    }
  };

  const handlePurchaseAssetChange = (key: string) => {
    if (key === 'other') {
      setPurchaseCustomKeyEnabled(true);
      setPurchaseAssetKey("");
      setPurchaseAssetName("");
    } else {
      setPurchaseCustomKeyEnabled(false);
      setPurchaseAssetKey(key);

      // 1. Depot-Positionen (portfolioData) haben Vorrang
      const matchedItem = portfolioData.find(item => item.key === key);
      if (matchedItem) {
        setPurchaseAssetName(matchedItem.name);
        return;
      }

      // 2. Favoriten-Watchlist (Rechner-Tab, localStorage)
      const matchedWatchlist = watchlist.find(
        item => item.symbol.toLowerCase() === key.toLowerCase()
      );
      if (matchedWatchlist) {
        setPurchaseAssetName(matchedWatchlist.name || matchedWatchlist.symbol.toUpperCase());
        return;
      }

      // 3. Kern-Assets als Fallback
      if (key === 'tsla') setPurchaseAssetName("Tesla, Inc.");
      else if (key === 'now') setPurchaseAssetName("ServiceNow, Inc.");
      else if (key === 'baba') setPurchaseAssetName("Alibaba Group Holding Ltd.");
      else if (key === 'btc') setPurchaseAssetName("Bitcoin Tracker Index");
      else setPurchaseAssetName(key);
    }
  };

  const handlePurchaseKaufKursChange = (val: string) => {
    setPurchaseKaufKurs(val);
    const price = parseFloat(val) || 0;
    const qty = parseFloat(purchaseAnzahlAktien) || 0;
    if (price > 0 && qty > 0) {
      setPurchaseTotalKosten((price * qty).toFixed(2));
    }
  };

  const handlePurchaseAnzahlChange = (val: string) => {
    setPurchaseAnzahlAktien(val);
    const price = parseFloat(purchaseKaufKurs) || 0;
    const qty = parseFloat(val) || 0;
    if (price > 0 && qty > 0) {
      setPurchaseTotalKosten((price * qty).toFixed(2));
    }
  };

  const handlePurchaseTotalChange = (val: string) => {
    setPurchaseTotalKosten(val);
    const total = parseFloat(val) || 0;
    const price = parseFloat(purchaseKaufKurs) || 0;
    if (total > 0 && price > 0) {
      if (purchaseAssetKey.toLowerCase() === "btc") {
        setPurchaseAnzahlAktien((total / price).toFixed(4));
      } else {
        setPurchaseAnzahlAktien(Math.floor(total / price).toString());
      }
    }
  };

  const handleSavePurchase = (e: FormEvent) => {
    e.preventDefault();
    const kurs = parseFloat(purchaseKaufKurs) || 0;
    const anzahl = parseFloat(purchaseAnzahlAktien) || 0;
    const total = parseFloat(purchaseTotalKosten) || (kurs * anzahl);

    if (kurs <= 0 || anzahl <= 0) {
      onShowToast("Fehler bei Buchung", "Kaufkurs und Stückzahl müssen größer als 0 sein.", "error");
      return;
    }

    if (editingPurchaseId) {
      // Edit existing purchase
      const updated = portfolioPurchases.map(p => {
        if (p.id === editingPurchaseId) {
          const matchedSoldDiff = p.anzahlAktien - (p.verbleibendeAnzahlAktien ?? p.anzahlAktien);
          return {
            ...p,
            key: purchaseAssetKey,
            name: purchaseAssetName,
            kaufDatum: purchaseDatum,
            kaufKurs: kurs,
            anzahlAktien: anzahl,
            tatsaechlicheKosten: total,
            verbleibendeAnzahlAktien: Math.max(0, anzahl - matchedSoldDiff),
            notiz: purchaseNotiz,
            gedanken: purchaseGedanken,
            ziele: purchaseZiele,
            depot: purchaseDepot || "Standard Depot",
            besitzerName: purchaseBesitzer || "Standard Besitzer"
          };
        }
        return p;
      });
      onPortfolioPurchasesChange(updated);
      onShowToast("Kauf aktualisiert", `✏️ Der Anschaffungseintrag für ${purchaseAssetName} wurde erfolgreich aktualisiert!`, "success");
      setEditingPurchaseId(null);
    } else {
      // Add new purchase
      const newPurchase: PortfolioPurchase = {
        id: "buy_" + Date.now(),
        key: purchaseAssetKey,
        name: purchaseAssetName,
        kaufDatum: purchaseDatum,
        kaufKurs: kurs,
        anzahlAktien: anzahl,
        tatsaechlicheKosten: total,
        verbleibendeAnzahlAktien: anzahl,
        notiz: purchaseNotiz || "Kauf verbucht",
        gedanken: purchaseGedanken || "",
        ziele: purchaseZiele || "",
        depot: purchaseDepot || "Standard Depot",
        besitzerName: purchaseBesitzer || "Standard Besitzer"
      };
      onPortfolioPurchasesChange([newPurchase, ...portfolioPurchases]);
      onShowToast("Kauf eingebucht", `📥 Neuer unbestechlicher Kauf für ${purchaseAssetName} wurde im Anschaffungs-Journal festgeschrieben!`, "success");
    }

    // Reset Form
    setPurchaseKaufKurs("");
    setPurchaseAnzahlAktien("");
    setPurchaseTotalKosten("");
    setPurchaseNotiz("");
    setPurchaseGedanken("");
    setPurchaseZiele("");
    setPurchaseDepot("");
    setPurchaseBesitzer("");
    setEditingPurchaseId(null);
    setShowAddPurchaseForm(false);
  };

  const handleDeletePurchase = (id: string) => {
    const updated = portfolioPurchases.filter(p => p.id !== id);
    onPortfolioPurchasesChange(updated);
    onShowToast("Eintrag gelöscht", "Anschaffung erfolgreich aus dem Journal gelöscht.", "warning");
  };

  const handleStartEditPurchase = (p: PortfolioPurchase) => {
    setEditingPurchaseId(p.id);
    
    // Determine if the key is known and standard in dropdown options
    const knownKeys = [
      ...CORE_ASSETS.map(c => c.key),
      ...portfolioData.map(item => String(item.key).toLowerCase()),
      ...watchlist.map(item => item.symbol.toLowerCase()),
    ];
    const isKnown = knownKeys.includes(String(p.key).toLowerCase());
    
    if (isKnown) {
      setPurchaseAssetKey(String(p.key));
      setPurchaseCustomKeyEnabled(false);
    } else {
      setPurchaseAssetKey(String(p.key));
      setPurchaseCustomKeyEnabled(true);
    }

    setPurchaseAssetName(p.name);
    setPurchaseKaufKurs(String(p.kaufKurs));
    setPurchaseAnzahlAktien(String(p.anzahlAktien));
    setPurchaseTotalKosten(String(p.tatsaechlicheKosten));
    setPurchaseDatum(p.kaufDatum);
    setPurchaseNotiz(p.notiz || "");
    setPurchaseGedanken(p.gedanken || "");
    setPurchaseZiele(p.ziele || "");
    setPurchaseDepot(p.depot || customDepots[0] || "Flatex");
    setPurchaseBesitzer(p.besitzerName || customBesitzer[0] || "Andres");
    setShowAddPurchaseForm(true);
    
    setTimeout(() => {
      document.getElementById("transaction-journal-section")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  // Real-time tax preview for sales
  const taxCalculationPreview = useMemo(() => {
    const assetKey = saleAssetKey;
    if (!assetKey) return null;

    const sharesToSell = parseFloat(saleAnzahlAktien) || 0;
    if (sharesToSell <= 0) return null;

    const targetDepotNorm = (saleDepot || "Standard Depot").toLowerCase().trim();
    const targetBesitzerNorm = (saleBesitzer || "Standard Besitzer").toLowerCase().trim();

    // Filter active (un-sold or partially un-sold) purchases for this asset on the same Depot & Owner
    let activePurchases = portfolioPurchases
      .filter(p => {
        const matchesKey = p.key === assetKey;
        const matchesDepot = (p.depot || "Standard Depot").toLowerCase().trim() === targetDepotNorm;
        const matchesBesitzer = (p.besitzerName || "Standard Besitzer").toLowerCase().trim() === targetBesitzerNorm;
        return matchesKey && matchesDepot && matchesBesitzer;
      })
      .sort((a, b) => new Date(a.kaufDatum).getTime() - new Date(b.kaufDatum).getTime());

    // If we are currently editing a trade, restore its old consumed state in preview memory only
    if (editingTradeId) {
      const oldTrade = soldTrades.find(s => s.id === editingTradeId);
      if (oldTrade && oldTrade.consumedLots) {
        activePurchases = activePurchases.map(p => {
          const match = oldTrade.consumedLots?.find(m => m.purchaseId === p.id);
          if (match) {
            return {
              ...p,
              verbleibendeAnzahlAktien: p.verbleibendeAnzahlAktien + match.sharesFromLot
            };
          }
          return p;
        });
      }
    }

    // Filter to ones with actual positive available shares in preview
    const activeWithShares = activePurchases.filter(p => p.verbleibendeAnzahlAktien > 0);
    const totalAvailableShares = activeWithShares.reduce((sum, p) => sum + p.verbleibendeAnzahlAktien, 0);

    if (totalAvailableShares === 0) {
      return {
        warning: "Achtung: Keine aktiven Anschaffungen dieses Typs im Journal! Der Verkauf wird mit dem eingegebenen Kaufpreis gerechnet.",
        suggestedKaufKurs: parseFloat(saleKaufKurs) || 0,
        unmatchedShares: sharesToSell,
        matchedLots: [],
        totalAvailableShares: 0,
        totalPurchaseCost: 0
      };
    }

    if (saleTaxMethod === 'FIFO') {
      let remainingToMatch = sharesToSell;
      let totalPurchaseCost = 0;
      const matchedLots: { purchaseId: string; date: string; sharesFromLot: number; kaufKurs: number }[] = [];

      for (const lot of activeWithShares) {
        if (remainingToMatch <= 0) break;

        const take = Math.min(remainingToMatch, lot.verbleibendeAnzahlAktien);
        totalPurchaseCost += take * lot.kaufKurs;
        matchedLots.push({
          purchaseId: lot.id,
          date: lot.kaufDatum,
          sharesFromLot: take,
          kaufKurs: lot.kaufKurs
        });
        remainingToMatch -= take;
      }

      const averageMatchKaufKurs = (sharesToSell - remainingToMatch) > 0 
        ? (totalPurchaseCost / (sharesToSell - remainingToMatch)) 
        : parseFloat(saleKaufKurs) || 0;

      return {
        method: 'FIFO',
        totalAvailableShares,
        matchedLots,
        totalPurchaseCost,
        suggestedKaufKurs: parseFloat(averageMatchKaufKurs.toFixed(4)),
        unmatchedShares: remainingToMatch,
        warning: remainingToMatch > 0 ? `Warnung: Nur ${totalAvailableShares.toFixed(2)} Stk. im Anschaffungs-Bestand! Du verkaufst ${remainingToMatch.toFixed(2)} Stk. ungedeckt.` : null
      };
    } else {
      // Durchschnittsmethode (Average Method)
      const totalRemainingCost = activeWithShares.reduce((sum, p) => sum + (p.kaufKurs * p.verbleibendeAnzahlAktien), 0);
      const averageKaufKurs = totalRemainingCost / totalAvailableShares;
      const totalPurchaseCost = sharesToSell * averageKaufKurs;

      let remainingToMatch = sharesToSell;
      const matchedLots: { purchaseId: string; date: string; sharesFromLot: number; kaufKurs: number }[] = [];
      
      for (const lot of activeWithShares) {
        if (remainingToMatch <= 0) break;
        const take = Math.min(remainingToMatch, lot.verbleibendeAnzahlAktien);
        matchedLots.push({
          purchaseId: lot.id,
          date: lot.kaufDatum,
          sharesFromLot: take,
          kaufKurs: lot.kaufKurs
        });
        remainingToMatch -= take;
      }

      return {
        method: 'durchschnitt',
        totalAvailableShares,
        matchedLots,
        totalPurchaseCost,
        suggestedKaufKurs: parseFloat(averageKaufKurs.toFixed(4)),
        unmatchedShares: remainingToMatch,
        warning: remainingToMatch > 0 ? `Warnung: Nur ${totalAvailableShares.toFixed(2)} Stk. im Anschaffungs-Bestand! Du verkaufst ${remainingToMatch.toFixed(2)} Stk. ungedeckt.` : null
      };
    }
  }, [saleAssetKey, saleAnzahlAktien, saleTaxMethod, portfolioPurchases, saleKaufKurs, editingTradeId, soldTrades, saleDepot, saleBesitzer]);

  useEffect(() => {
    if (taxCalculationPreview && taxCalculationPreview.suggestedKaufKurs > 0 && !editingTradeId) {
      setSaleKaufKurs(String(taxCalculationPreview.suggestedKaufKurs));
    }
  }, [taxCalculationPreview?.suggestedKaufKurs, saleTaxMethod, saleAssetKey, editingTradeId]);

  const handlePreFillSale = (item: PortfolioItem) => {
    const liveVal = livePrices[item.key]?.price || 0;
    setSaleAssetName(item.name);
    setSaleAssetKey(item.key);
    
    // Check remaining shares of this asset in purchases state
    const remainingInJournal = portfolioPurchases
      .filter(p => p.key === item.key)
      .reduce((sum, p) => sum + p.verbleibendeAnzahlAktien, 0);

    if (remainingInJournal > 0) {
      setSaleAnzahlAktien(String(remainingInJournal));
    } else {
      const purchasePrice = item.limitPreis > 0 ? item.limitPreis : (item.harterAnker > 0 ? item.harterAnker : (liveVal > 0 ? liveVal : 1));
      const totalShares = item.tranchenGroesse / purchasePrice;
      setSaleAnzahlAktien(totalShares > 0 ? totalShares.toFixed(2) : "10");
    }
    
    setSaleKaufKurs(item.limitPreis > 0 ? String(item.limitPreis) : String(item.harterAnker));
    setSaleVerkaufsKurs(liveVal > 0 ? String(liveVal) : "");
    setSaleDatum(routineDate);
    setSaleNotiz("Position liquidiert / Gewinne vollständig realisiert.");
    setSaleTaxMethod("durchschnitt");
    setEditingTradeId(null);
    setShowAddSaleForm(true);

    // Smooth scroll down to form
    setTimeout(() => {
      document.getElementById("realized-sales-section")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleStartEditSale = (trade: SoldTradeItem) => {
    setEditingTradeId(trade.id);
    setSaleAssetName(trade.name);
    setSaleAssetKey(trade.key);
    setSaleKaufKurs(String(trade.kaufKurs));
    setSaleVerkaufsKurs(String(trade.verkaufsKurs));
    setSaleAnzahlAktien(String(trade.anzahlAktien));
    setSaleDatum(trade.verkaufsDatum);
    setSaleNotiz(trade.notiz);
    setSaleTaxMethod(trade.taxMethod || 'durchschnitt');
    setSaleDepot(trade.depot || customDepots[0] || "Flatex");
    setSaleBesitzer(trade.besitzerName || customBesitzer[0] || "Andres");
    setShowAddSaleForm(true);

    // Smooth scroll down to form
    setTimeout(() => {
      document.getElementById("transaction-journal-section")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleUndoSale = (tradeItem: SoldTradeItem) => {
    // 1. Remove from history
    const updatedHistory = soldTrades.filter(s => s.id !== tradeItem.id);
    onSoldTradesChange(updatedHistory);
    
    // 2. See if there is a matching portfolio item with 'sold' status, and restore it to 'green' (active)
    const updatedPortfolio = portfolioData.map(p => {
      if (p.key === tradeItem.key && p.status === 'sold') {
        return { ...p, status: 'green' as const };
      }
      return p;
    });
    onPortfolioDataChange(updatedPortfolio);

    // 3. Restore the consumed purchase remaining lots
    if (tradeItem.consumedLots && tradeItem.consumedLots.length > 0) {
      const restoredPurchases = portfolioPurchases.map(p => {
        const match = tradeItem.consumedLots?.find(m => m.purchaseId === p.id);
        if (match) {
          return {
            ...p,
            verbleibendeAnzahlAktien: p.verbleibendeAnzahlAktien + match.sharesFromLot
          };
        }
        return p;
      });
      onPortfolioPurchasesChange(restoredPurchases);
    }
    
    onShowToast(
      "Verkauf rückgängig gemacht", 
      `↩️ Der Verkauf von ${tradeItem.name} wurde storniert! Die verbrauchten Stückzahlen im Anschaffungs-Journal wurden wiederhergestellt.`, 
      "success"
    );
  };

  const handleAddSale = (e: FormEvent) => {
    e.preventDefault();
    const inputKauf = parseFloat(saleKaufKurs) || 0;
    const verkauf = parseFloat(saleVerkaufsKurs) || 0;
    const anzahl = parseFloat(saleAnzahlAktien) || 0;

    if (!saleAssetName || verkauf <= 0 || anzahl <= 0) {
      onShowToast("Fehler bei Buchung", "Verkaufskurs und Anzahl müssen positiv sein.", "error");
      return;
    }

    // 1. If we are in edit mode, we first restore the old consumed pieces to portfolioPurchases
    let currentPurchases = [...portfolioPurchases];
    if (editingTradeId) {
      const oldTrade = soldTrades.find(s => s.id === editingTradeId);
      if (oldTrade && oldTrade.consumedLots && oldTrade.consumedLots.length > 0) {
        currentPurchases = currentPurchases.map(p => {
          const match = oldTrade.consumedLots?.find(m => m.purchaseId === p.id);
          if (match) {
            return {
              ...p,
              verbleibendeAnzahlAktien: p.verbleibendeAnzahlAktien + match.sharesFromLot
            };
          }
          return p;
        });
      }
    }

    // 2. Perform the matching calculation dynamically on currentPurchases
    const targetAssetKey = saleAssetKey || (portfolioData.find(p => p.name === saleAssetName)?.key) || "tsla";
    
    const targetDepotNorm = (saleDepot || "Standard Depot").toLowerCase().trim();
    const targetBesitzerNorm = (saleBesitzer || "Standard Besitzer").toLowerCase().trim();

    // Sort by date ascending for FIFO, matching Depot and BesitzerName
    const activePurchases = currentPurchases
      .filter(p => {
        const matchesKey = p.key === targetAssetKey;
        const matchesDepot = (p.depot || "Standard Depot").toLowerCase().trim() === targetDepotNorm;
        const matchesBesitzer = (p.besitzerName || "Standard Besitzer").toLowerCase().trim() === targetBesitzerNorm;
        return matchesKey && matchesDepot && matchesBesitzer && p.verbleibendeAnzahlAktien > 0;
      })
      .sort((a, b) => new Date(a.kaufDatum).getTime() - new Date(b.kaufDatum).getTime());

    let finalKaufKurs = inputKauf;
    let matchedLots: { purchaseId: string; sharesFromLot: number }[] = [];

    if (activePurchases.length > 0) {
      let remainingToMatch = anzahl;
      let totalPurchaseCost = 0;

      if (saleTaxMethod === 'FIFO') {
        for (const lot of activePurchases) {
          if (remainingToMatch <= 0) break;
          const take = Math.min(remainingToMatch, lot.verbleibendeAnzahlAktien);
          totalPurchaseCost += take * lot.kaufKurs;
          matchedLots.push({
            purchaseId: lot.id,
            sharesFromLot: take
          });
          remainingToMatch -= take;
        }
        const matchedQty = anzahl - remainingToMatch;
        if (matchedQty > 0) {
          finalKaufKurs = totalPurchaseCost / matchedQty;
        } else {
          finalKaufKurs = inputKauf;
        }
      } else {
        // Durchschnittsmethode (Average Method)
        const totalRemainingShares = activePurchases.reduce((sum, p) => sum + p.verbleibendeAnzahlAktien, 0);
        const totalRemainingCost = activePurchases.reduce((sum, p) => sum + (p.kaufKurs * p.verbleibendeAnzahlAktien), 0);
        const averageKaufKurs = totalRemainingShares > 0 ? (totalRemainingCost / totalRemainingShares) : inputKauf;
        
        finalKaufKurs = averageKaufKurs;

        for (const lot of activePurchases) {
          if (remainingToMatch <= 0) break;
          const take = Math.min(remainingToMatch, lot.verbleibendeAnzahlAktien);
          matchedLots.push({
            purchaseId: lot.id,
            sharesFromLot: take
          });
          remainingToMatch -= take;
        }
      }

      // Update verbleibendeAnzahlAktien in state
      currentPurchases = currentPurchases.map(p => {
        const match = matchedLots.find(m => m.purchaseId === p.id);
        if (match) {
          return {
            ...p,
            verbleibendeAnzahlAktien: Math.max(0, p.verbleibendeAnzahlAktien - match.sharesFromLot)
          };
        }
        return p;
      });
      onPortfolioPurchasesChange(currentPurchases);
    }

    const gewinnVerlust = (verkauf - finalKaufKurs) * anzahl;
    const kestBetrag = kestAuf(gewinnVerlust);
    const nettoGewinn = gewinnVerlust - kestBetrag;

    if (editingTradeId) {
      // Edit mode
      const updated = soldTrades.map(s => s.id === editingTradeId ? {
        ...s,
        name: saleAssetName,
        key: saleAssetKey,
        verkaufsDatum: saleDatum,
        kaufKurs: parseFloat(finalKaufKurs.toFixed(4)),
        verkaufsKurs: verkauf,
        anzahlAktien: anzahl,
        gewinnVerlust,
        kestBetrag,
        nettoGewinn,
        notiz: saleNotiz,
        taxMethod: saleTaxMethod,
        consumedLots: matchedLots,
        depot: saleDepot || "Standard Depot",
        besitzerName: saleBesitzer || "Standard Besitzer"
      } : s);
      onSoldTradesChange(updated);
      onShowToast("Trade aktualisiert", `✏️ Der Trade für ${saleAssetName} wurde basierend auf der Anschaffungs-Kalkulation erfolgreich aktualisiert!`, "success");
      setEditingTradeId(null);
    } else {
      // Create mode
      const newSaleItem: SoldTradeItem = {
        id: "sale_" + Date.now(),
        name: saleAssetName,
        key: saleAssetKey,
        verkaufsDatum: saleDatum,
        kaufKurs: parseFloat(finalKaufKurs.toFixed(4)),
        verkaufsKurs: verkauf,
        anzahlAktien: anzahl,
        gewinnVerlust,
        kestBetrag,
        nettoGewinn,
        notiz: saleNotiz || "Verkauf verbucht",
        taxMethod: saleTaxMethod,
        consumedLots: matchedLots,
        depot: saleDepot || "Standard Depot",
        besitzerName: saleBesitzer || "Standard Besitzer"
      };

      onSoldTradesChange([newSaleItem, ...soldTrades]);
      onShowToast("Verkauf gebucht", `🚀 ${saleAssetName} erfolgreich gebucht (${saleTaxMethod === 'FIFO' ? 'FIFO' : 'Durchschnittsmethode'}) und im Teilbestand abgezogen!`, "success");

      // Set active item status to 'sold' if all shares are exhausted
      const remainingForAsset = currentPurchases
        .filter(p => p.key === saleAssetKey)
        .reduce((sum, p) => sum + p.verbleibendeAnzahlAktien, 0);

      if (remainingForAsset <= 0) {
        const updatedPortfolio = portfolioData.map(p => p.key === saleAssetKey ? { ...p, status: 'sold' as const } : p);
        onPortfolioDataChange(updatedPortfolio);
        onShowToast("Cockpit aktualisiert", `Bestand für ${saleAssetName} ist vollständig ausgebucht. Position im Cockpit wurde auf "Verkauft" (⚫) gesetzt!`, "success");
      }
    }

    // Reset Form
    setSaleAssetName("");
    setSaleKaufKurs("");
    setSaleVerkaufsKurs("");
    setSaleAnzahlAktien("");
    setSaleNotiz("");
    setSaleDepot("");
    setSaleBesitzer("");
    setSaleTaxMethod("durchschnitt");
    setShowAddSaleForm(false);
  };

  const handleDeleteSale = (id: string) => {
    const updated = soldTrades.filter(s => s.id !== id);
    onSoldTradesChange(updated);
    onShowToast("Eintrag gelöscht", "Verkauf erfolgreich aus der Historie gelöscht.", "warning");
  };

  const visibleChecklist = useMemo(() => {
    return checklistData.filter(c => {
      const kat = (c.kategorie || "").toUpperCase();
      return kat && !soldTickers.has(kat);
    });
  }, [checklistData, soldTickers]);

  const workingCapital = START_CASH - cashReserve;

  // Calculate total booked tranches
  const reservedFromPortfolio = portfolioData
    .filter(p => p.status === 'green')
    .reduce((sum, p) => sum + p.tranchenGroesse, 0);

  const reservedFromChecklist = visibleChecklist
    .filter(c => c.status === 'green')
    .reduce((sum, c) => sum + c.tranchenGroesse, 0);

  const totalReserved = reservedFromPortfolio + reservedFromChecklist;
  const freeForAdditions = Math.max(0, workingCapital - totalReserved);
  const reservedPercentage = workingCapital > 0 ? (totalReserved / workingCapital) * 100 : 0;

  // Handles updating tranches directly
  const handleTrancheChange = (id: string, isChecklist: boolean, value: string) => {
    const val = parseFloat(value) || 0;
    if (isChecklist) {
      const updated = checklistData.map(c => c.id === id ? { ...c, tranchenGroesse: val } : c);
      onChecklistDataChange(updated);
    } else {
      const updated = portfolioData.map(p => p.id === id ? { ...p, tranchenGroesse: val } : p);
      onPortfolioDataChange(updated);
    }
  };

  // Handles checklist actions statuses
  const handleChecklistStatusChange = (id: string, newStatus: 'green' | 'yellow' | 'red') => {
    const updated = checklistData.map(c => c.id === id ? { ...c, status: newStatus } : c);
    onChecklistDataChange(updated);
  };

  const handleChecklistDeleteObj = (id: string) => {
    const updated = checklistData.filter(c => c.id !== id);
    onChecklistDataChange(updated);
    onShowToast("Checkliste aktualisiert", "Aktion erfolgreich aus der Budget-Checkliste gelöscht.", "success");
  };

  const handleAddChecklistItem = (e: FormEvent) => {
    e.preventDefault();
    if (!newChecklistAsset) {
      onShowToast("Auswahl ungültig", "Bitte wähle zuerst eine Aktie aus.", "error");
      return;
    }
    const assetUpper = newChecklistAsset.toUpperCase();
    const cleanTitle = newChecklistTitle.trim() || `${assetUpper}: Limit- oder Kaufaktion planen`;
    
    // Check if symbol already exists to avoid duplicates
    if (checklistData.some(c => c.kategorie.toUpperCase() === assetUpper)) {
      onShowToast("Eintrag existiert bereits", `Es gibt bereits eine geplante Aktion für '${assetUpper}' in deiner Checkliste.`, "warning");
      return;
    }

    const newItem: ChecklistItem = {
      id: "chk_" + Date.now(),
      title: cleanTitle,
      tranchenGroesse: parseFloat(newChecklistTranche) || 20000,
      status: 'yellow', // default to yellow (in loop)
      kategorie: assetUpper
    };

    onChecklistDataChange([...checklistData, newItem]);
    
    // Reset form states
    setNewChecklistAsset("");
    setNewChecklistTitle("");
    setShowAddChecklistItemForm(false);
    onShowToast("Aktion hinzugefügt", `'${assetUpper}' erfolgreich in die Budget-Checkliste eingetragen!`, "success");
  };

  // Handles portfolio status adjustments
  const handlePortfolioStatusChange = (id: string, newStatus: 'green' | 'yellow' | 'red' | 'sold') => {
    const updated = portfolioData.map(p => p.id === id ? { ...p, status: newStatus } : p);
    onPortfolioDataChange(updated);
    
    if (newStatus === 'sold') {
      const match = portfolioData.find(p => p.id === id);
      if (match) {
        handlePreFillSale(match);
      }
    }
  };

  // Distribution safety sentinel
  // Hinweis: Dies war ein toter Platzhalter (Kurs < 0 ist nie wahr) mit
  // direktem Zugriff auf livePrices.tsla — hätte ohne TSLA-Eintrag die
  // ganze Seite zum Absturz gebracht. Die echte Distribution-Days-Sperre
  // liegt in marketHealth.ts.
  const isHighDistributionDays = false;

  // Verification helper for alarm states
  let anyStopTriggered = false;  return (
    <div className="space-y-6 text-slate-900">
      
      {/* ═══ 1. MEIN DEPOT — sofort sichtbar ═══ */}
      {/* 💼 BIOMETRISCH/REALE PORTFOLIO-BESTÄNDE (AUS ANSCHAFFUNGEN KALKULIERT) */}
      <div id="derived-active-portfolio-section" className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 space-y-6 shadow-md shadow-slate-200/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-50 pb-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 border border-emerald-100/70 rounded-xl text-emerald-600">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-widest font-display flex items-center gap-2">
                💼 Reale Portfolio-Bestände (Aus Anschaffungen)
                <HilfeLink abschnitt="steuern" titel="KESt und Verlustausgleich im Handbuch nachlesen" />
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold font-mono mt-0.5">
                Aktive Wertpapiere berechnet aus dem Transaktions-Journal nach Abzug aller realisierten Verkäufe
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 text-xs font-bold font-mono">
            <div className="bg-slate-50 border border-slate-150 rounded-xl px-4 py-2">
              <span className="text-slate-400 text-[10px] block uppercase">Gesamtwert Aktive Aktien</span>
              <span className="text-slate-800 text-sm font-extrabold">E: € {formatAccounting(derivedActivePortfolio.reduce((sum, item) => sum + (item.totalShares * (livePrices[item.key as keyof typeof livePrices]?.price || item.averageKaufkurs)), 0))}</span>
            </div>
            <div className="bg-slate-50 border border-slate-150 rounded-xl px-4 py-2">
              <span className="text-slate-400 text-[10px] block uppercase">Gesamtanschaffungskosten</span>
              <span className="text-slate-800 text-sm font-extrabold">K: € {formatAccounting(derivedActivePortfolio.reduce((sum, item) => sum + item.totalCost, 0))}</span>
            </div>
          </div>
        </div>


        {/* NEUE SORTIERBARE DEPOT-TABELLE (liest Limits aus dem Asset-Register) */}
        <DepotTable
          holdings={derivedActivePortfolio}
          livePrices={livePrices}
          registry={assetRegistry}
          marketHealth={evaluateMarketHealth(marketState)}
          purchases={portfolioPurchases}
          onEditPurchase={(p) => {
            handleStartEditPurchase(p);
            const element = document.getElementById("transaction-journal-section");
            if (element) element.scrollIntoView({ behavior: "smooth" });
          }}
          onDeletePurchase={handleDeletePurchase}
          onExit={(holding, livePr) => {
            setSaleAssetName(holding.name);
            setSaleAssetKey(holding.key);
            setSaleKaufKurs(holding.averageKaufkurs.toFixed(2));
            setSaleVerkaufsKurs(livePr.toFixed(2));
            setSaleAnzahlAktien(holding.totalShares.toFixed(2));
            setSaleDepot(holding.depot);
            setSaleBesitzer(holding.besitzerName);
            setSaleNotiz("Teilverkauf / Abwicklung");
            setShowAddSaleForm(true);
            setShowAddPurchaseForm(false);
            const element = document.getElementById("transaction-journal-section");
            if (element) element.scrollIntoView({ behavior: "smooth" });
          }}
        />
      </div>


      {/* ═══ 2. Buchen & Historie ═══ */}
      <CombinedJournal
        routineDate={routineDate}
        portfolioPurchases={portfolioPurchases}
        soldTrades={soldTrades}
        portfolioData={portfolioData}
        onPortfolioPurchasesChange={onPortfolioPurchasesChange}
        onSoldTradesChange={onSoldTradesChange}
        customDepots={customDepots}
        customBesitzer={customBesitzer}
        onShowToast={onShowToast}
        livePrices={livePrices}

        // Form states and toggles
        watchlist={watchlist}
        showAddPurchaseForm={showAddPurchaseForm}
        setShowAddPurchaseForm={setShowAddPurchaseForm}
        showAddSaleForm={showAddSaleForm}
        setShowAddSaleForm={setShowAddSaleForm}
        editingPurchaseId={editingPurchaseId}
        setEditingPurchaseId={setEditingPurchaseId}
        editingTradeId={editingTradeId}
        setEditingTradeId={setEditingTradeId}

        // Buy form input states
        purchaseAssetKey={purchaseAssetKey}
        setPurchaseAssetKey={setPurchaseAssetKey}
        purchaseCustomKeyEnabled={purchaseCustomKeyEnabled}
        setPurchaseCustomKeyEnabled={setPurchaseCustomKeyEnabled}
        purchaseAssetName={purchaseAssetName}
        setPurchaseAssetName={setPurchaseAssetName}
        purchaseKaufKurs={purchaseKaufKurs}
        setPurchaseKaufKurs={setPurchaseKaufKurs}
        purchaseAnzahlAktien={purchaseAnzahlAktien}
        setPurchaseAnzahlAktien={setPurchaseAnzahlAktien}
        purchaseTotalKosten={purchaseTotalKosten}
        setPurchaseTotalKosten={setPurchaseTotalKosten}
        purchaseDatum={purchaseDatum}
        setPurchaseDatum={setPurchaseDatum}
        purchaseNotiz={purchaseNotiz}
        setPurchaseNotiz={setPurchaseNotiz}
        purchaseGedanken={purchaseGedanken}
        setPurchaseGedanken={setPurchaseGedanken}
        purchaseZiele={purchaseZiele}
        setPurchaseZiele={setPurchaseZiele}
        purchaseDepot={purchaseDepot}
        setPurchaseDepot={setPurchaseDepot}
        purchaseBesitzer={purchaseBesitzer}
        setPurchaseBesitzer={setPurchaseBesitzer}

        // Sell form input states
        saleAssetName={saleAssetName}
        setSaleAssetName={setSaleAssetName}
        saleAssetKey={saleAssetKey}
        setSaleAssetKey={setSaleAssetKey}
        saleKaufKurs={saleKaufKurs}
        setSaleKaufKurs={setSaleKaufKurs}
        saleVerkaufsKurs={saleVerkaufsKurs}
        setSaleVerkaufsKurs={setSaleVerkaufsKurs}
        saleAnzahlAktien={saleAnzahlAktien}
        setSaleAnzahlAktien={setSaleAnzahlAktien}
        saleDatum={saleDatum}
        setSaleDatum={setSaleDatum}
        saleNotiz={saleNotiz}
        setSaleNotiz={setSaleNotiz}
        saleTaxMethod={saleTaxMethod}
        setSaleTaxMethod={setSaleTaxMethod}
        saleDepot={saleDepot}
        setSaleDepot={setSaleDepot}
        saleBesitzer={saleBesitzer}
        setSaleBesitzer={setSaleBesitzer}

        // Handlers
        handleSavePurchase={handleSavePurchase}
        handleAddSale={handleAddSale}
        handlePurchaseAssetChange={handlePurchaseAssetChange}
        handlePurchaseAnzahlChange={handlePurchaseAnzahlChange}
        handlePurchaseTotalChange={handlePurchaseTotalChange}
        handlePurchaseKaufKursChange={handlePurchaseKaufKursChange}
        taxCalculationPreview={taxCalculationPreview}

        // Row operations
        handleStartEditPurchase={handleStartEditPurchase}
        handleStartEditSale={handleStartEditSale}
        handleUndoSale={handleUndoSale}
        handleDeletePurchase={handleDeletePurchase}
        handleDeleteSale={handleDeleteSale}
      />

      {/* ═══ 3. Selten gebraucht — eingeklappt ═══ */}

      <details className="bg-white border border-slate-100 rounded-3xl shadow-md shadow-slate-200/10 group">
        <summary className="cursor-pointer list-none p-5 sm:p-6 flex items-center justify-between gap-2 select-none">
          <div>
            <span className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-widest font-display block">
              💵 Cash-Cockpit
            </span>
            <span className="text-[10px] text-slate-400 font-semibold font-mono">Freies Cash je Depot &amp; Sachwert-Quote</span>
          </div>
          <span className="text-[10px] font-bold text-slate-400 shrink-0 group-open:hidden">Öffnen ▾</span>
          <span className="text-[10px] font-bold text-slate-400 shrink-0 hidden group-open:inline">Schließen ▴</span>
        </summary>
        <div className="px-2 sm:px-3 pb-3">
      {/* Dynamic Cash Cockpit (Sticky visual helper) */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-md shadow-slate-200/15 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-50 pb-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-50 border border-slate-100/70 rounded-xl text-slate-800">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-widest font-display">
                💵 Cash-Cockpit (Eiserne Sachwert-Absicherung)
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold font-mono mt-0.5">
                Schutzschild gegen Gier • Depotkapital: {formatAccounting(START_CASH)} €
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl self-start md:self-auto transition-colors">
            <span className="text-[10px] font-bold text-slate-450 uppercase font-sans">Eiserne Reserve:</span>
            <div className="flex items-center font-mono">
              <input
                type="number"
                value={cashReserve}
                onChange={(e) => setCashReserve(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-20 bg-white border border-slate-250 focus:border-slate-600 rounded-lg px-1.5 py-0.5 text-right font-bold text-xs text-rose-600 focus:outline-none"
              />
              <span className="text-[11px] font-bold text-slate-400 ml-1">€</span>
            </div>
          </div>
        </div>

        {/* Dynamic balances indicators card */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
            <span className="block text-[9px] sm:text-[10px] font-bold text-slate-450 uppercase tracking-widest font-sans">
              Arbeitendes Depot-Kapital
            </span>
            <span className="block font-mono font-bold text-slate-900 text-sm sm:text-lg mt-1 tabular-nums">
              {formatAccounting(workingCapital)} €
            </span>
          </div>
          <div className="bg-emerald-50/20 border border-emerald-100/70 p-4 rounded-2xl animate-fade-in">
            <span className="block text-[9px] sm:text-[10px] font-bold text-emerald-800 uppercase tracking-widest font-sans">
              Frei für Zukäufe (Cash)
            </span>
            <span className="block font-mono font-bold text-emerald-600 text-sm sm:text-lg mt-1 tabular-nums">
              {formatAccounting(freeForAdditions)} €
            </span>
          </div>
          <div className="bg-amber-50/20 border border-amber-100/70 p-4 rounded-2xl">
            <span className="block text-[9px] sm:text-[10px] font-bold text-amber-800 uppercase tracking-widest font-sans">
              Reserviertes Budget
            </span>
            <span className="block font-mono font-bold text-amber-600 text-sm sm:text-lg mt-1 tabular-nums">
              {formatAccounting(totalReserved)} €
            </span>
          </div>
        </div>

        {/* Progress percent indicator */}
        <div className="space-y-2 pt-1">
          <div className="flex justify-between items-center text-[10px] text-slate-600 font-bold font-mono uppercase">
            <span className="flex items-center gap-1">
              <Percent className="h-3.5 w-3.5" />
              Depot Belegungsstand: <span className="text-slate-900 font-bold">{reservedPercentage.toFixed(0)}%</span>
            </span>
            <span>Limit: 100% (Cash ausgezehrt)</span>
          </div>
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-50">
            <div 
              style={{ width: `${Math.min(100, reservedPercentage)}%` }}
              className={`h-full transition-all duration-500 rounded-full ${
                reservedPercentage > 80 
                  ? "bg-rose-500" 
                  : reservedPercentage > 50 
                    ? "bg-amber-500" 
                    : "bg-slate-800"
              }`}
            ></div>
          </div>
        </div>
      </div>

        </div>
      </details>

      <details className="bg-white border border-slate-100 rounded-3xl shadow-md shadow-slate-200/10 group">
        <summary className="cursor-pointer list-none p-5 sm:p-6 flex items-center justify-between gap-2 select-none">
          <div>
            <span className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-widest font-display block">
              🎯 Kaufziele &amp; Stop-Schutz
            </span>
            <span className="text-[10px] text-slate-400 font-semibold font-mono">Harte Anker, Limits und ATR-Stops je Wert</span>
          </div>
          <span className="text-[10px] font-bold text-slate-400 shrink-0 group-open:hidden">Öffnen ▾</span>
          <span className="text-[10px] font-bold text-slate-400 shrink-0 hidden group-open:inline">Schließen ▴</span>
        </summary>
        <div className="px-2 sm:px-3 pb-3">
      {/* PORTFOLIO ACCORDION */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 space-y-6 shadow-md shadow-slate-200/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-50 pb-4 gap-2">
          <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-widest font-display flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-slate-800 shrink-0" />
            💼 Aktives Portfolio ({atrMultiplier.toFixed(1)}x ATR Stop-Schutzmechanismus)
          </h3>
          <div id="portfolio-alarm-banner">
            {/* Will show dynamically calculated alarms */}
          </div>
        </div>

        {/* Dynamic ATR Pine-Script Controller Panel */}
        <div className="bg-slate-50 rounded-2xl border border-slate-150 p-5 space-y-4 text-xs animate-fade-in">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-200/60 pb-3">
            <div>
              <span className="block font-bold text-slate-800 text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2">
                ⚙️ Pine Script ATR-Parameter (TradingView-Sync)
              </span>
              <span className="block text-[11px] text-slate-500 font-medium">
                Diese Parameter bestimmen die Dynamic Stop-Losses ({atrMultiplier.toFixed(1)}x ATR) vollautomatisch für alle Wertpapiere.
              </span>
            </div>
            
            <button
              id="toggle-pine-script-btn"
              type="button"
              onClick={() => setShowPineCode(!showPineCode)}
              className="px-2.5 py-1 text-[10px] font-bold bg-white hover:bg-slate-100 text-slate-800 border border-slate-250 rounded-lg transition-all cursor-pointer whitespace-nowrap self-start sm:self-auto flex items-center gap-1.5 shadow-xs"
            >
              {showPineCode ? "Pine Script verbergen 🙈" : "TradingView Pine Script v5 zeigen 🖥️"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Methode (Smoothing) *</label>
              <select
                id="atr-smoothing-select"
                value={atrSmoothing}
                onChange={(e) => setAtrSmoothing(e.target.value)}
                className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 font-semibold text-slate-850 focus:outline-none cursor-pointer"
              >
                <option value="RMA">RMA (Gleitender Durchschnitt / Wilders)</option>
                <option value="SMA">SMA (Einfacher Durchschnitt)</option>
                <option value="EMA">EMA (Exponentieller Durchschnitt)</option>
                <option value="WMA">WMA (Gewichteter Durchschnitt)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Periode (Length) *</label>
              <div className="flex items-center gap-2">
                <input
                  id="atr-length-input"
                  type="number"
                  min="1"
                  max="100"
                  value={atrLength}
                  onChange={(e) => setAtrLength(Math.max(1, parseInt(e.target.value) || 14))}
                  className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3.5 font-mono font-bold text-slate-850 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 font-semibold font-mono whitespace-nowrap">Tage / Bars</span>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 flex justify-between items-center">
                <span>Multiplikator (Multiplier m) *</span>
                <span className="text-slate-800 font-mono font-extrabold bg-slate-50 px-1.5 py-0.5 rounded text-[11px]">{atrMultiplier.toFixed(1)}x</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="atr-multiplier-slider"
                  type="range"
                  min="0.5"
                  max="4.0"
                  step="0.1"
                  value={atrMultiplier}
                  onChange={(e) => setAtrMultiplier(parseFloat(e.target.value))}
                  className="flex-grow accent-slate-800 cursor-ew-resize h-1 bg-slate-200 rounded-lg appearance-none"
                />
                <input
                  id="atr-multiplier-input"
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="10"
                  value={atrMultiplier}
                  onChange={(e) => setAtrMultiplier(Math.max(0.1, parseFloat(e.target.value) || 1.5))}
                  className="w-14 h-10 bg-white border border-slate-200 rounded-xl text-center text-xs font-mono font-bold text-slate-850 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {showPineCode && (
            <div className="bg-slate-900 text-slate-100 rounded-xl p-4 font-mono text-[10px] leading-relaxed space-y-3 border border-slate-800 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-emerald-400 font-bold">TradingView Pine Script (v5 Optimiert)</span>
                <span className="text-[9px] text-slate-400">Verbinde die Schieberegler mit TV!</span>
              </div>
              <pre className="overflow-x-auto text-[10px] max-h-52 bg-slate-950 p-2.5 rounded-lg text-slate-200 select-all scrollbar-thin">
{`//@version=5
indicator(title="Average True Range Stop Loss Finder [Morgenroutine]", shorttitle="ATR Stop", overlay=true)

length = input.int(title="Length", defval=${atrLength}, minval=1)
smoothing = input.string(title="Smoothing", defval="${atrSmoothing}", options=["RMA", "SMA", "EMA", "WMA"])
m = input.float(${atrMultiplier}, "Multiplier")
src1 = input(high, "Source High")
src2 = input(low, "Source Low")

ma_function(source, length) =>
    switch smoothing
        "RMA" => ta.rma(source, length)
        "SMA" => ta.sma(source, length)
        "EMA" => ta.ema(source, length)
        "WMA" => ta.wma(source, length)
        => ta.rma(source, length)

a = ma_function(ta.tr(true), length) * m
x = ma_function(ta.tr(true), length) * m + src1
x2 = src2 - ma_function(ta.tr(true), length) * m

plot(x, title="ATR Short Stop Loss", color=color.red, linewidth=1)
plot(x2, title="ATR Long Stop Loss", color=color.teal, linewidth=1)`}
              </pre>
              <div className="text-[9px] text-slate-400 leading-normal font-sans">
                💡 <strong>Übertragbare Logik:</strong> Alle Aktien berechnen ihren dynamischen Stopp automatisch nach der Formel: <code className="bg-slate-800 text-slate-200 px-1 rounded">Stop-Loss = max(Harter Anker, Live-Kurs - {atrMultiplier.toFixed(1)} * ATR)</code>. Dies ist 100% synchron mit dem verzeichneten Long Indicator in TradingView!
              </div>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm" style={{ minWidth: "750px" }}>
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                <th className="pb-3 w-1/4">Depot / Position</th>
                <th className="pb-3 text-right">Harter Anker / Kauflimit</th>
                <th className="pb-3 text-center animate-pulse">Stop Loss &amp; Depot-Risiko (€)</th>
                <th className="pb-3 text-right">Tranche (€)</th>
                <th className="pb-3 text-center">Positionsstatus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {portfolioData.map((item) => {
                const liveData = livePrices[item.key];
                const currentPrice = liveData ? liveData.price : null;
                const priceDate = liveData ? liveData.date : "";
                const isDateMatching = priceDate === routineDate;

                // Stop calculated using the formula: Stop = max(Harter Anker, Kurs - (atrMultiplier * ATR))
                let finalCalculatedStop = item.harterAnker;
                let isTriggered = false;
                let riskPercentageOfDepot = 0;
                let potentialLossValue = 0;

                if (currentPrice !== null && item.key !== 'btc' && item.status !== 'sold') {
                  const atrStop = currentPrice - (atrMultiplier * liveData.atr);
                  finalCalculatedStop = Math.max(item.harterAnker, atrStop);
                  
                  if (currentPrice <= finalCalculatedStop) {
                    isTriggered = true;
                    anyStopTriggered = true;
                  }

                  // Risks calculations
                  const estimatedShares = item.tranchenGroesse / currentPrice;
                  potentialLossValue = estimatedShares * (currentPrice - finalCalculatedStop);
                  riskPercentageOfDepot = START_CASH > 0 ? (potentialLossValue / START_CASH) * 100 : 0;
                }

                // Apply custom styles matching table
                let rowBgClass = "";
                if (item.status === 'sold') {
                  rowBgClass = "bg-slate-55/40 opacity-55 hover:opacity-100 transition-opacity border-l-4 border-l-slate-400";
                } else if (isTriggered) {
                  rowBgClass = "bg-rose-50/20 border-l-4 border-l-rose-500 hover:bg-rose-50/30";
                } else if (item.status === 'green') {
                  rowBgClass = "bg-slate-50/10 hover:bg-slate-50/20";
                } else if (item.status === 'red') {
                  rowBgClass = "bg-slate-50/50 hover:bg-slate-50/70";
                }

                return (
                  <tr key={item.id} className={`${rowBgClass} transition-colors border-b border-slate-100`}>
                    <td className="py-4 text-slate-900">
                      <div className="font-bold text-slate-900 text-sm sm:text-base leading-tight">
                        {item.name}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1 font-mono text-[10px] text-slate-800 font-extrabold">
                        <span>{item.ticker ? `Kürzel: ${item.ticker}` : item.key.toUpperCase()}</span>
                        {item.isin && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="text-slate-500 font-semibold font-mono">ISIN: {item.isin}</span>
                          </>
                        )}
                      </div>
                      <span className="block text-[10px] font-medium text-slate-400 mt-1 leading-snug">
                        {item.beschreibung}
                      </span>
                    </td>
                    
                    <td className="py-4 text-right font-mono">
                      <div className="font-semibold text-slate-400">€ {formatAccounting(item.limitPreis)}</div>
                      {currentPrice !== null ? (
                        <>
                          <div className="text-xs text-slate-800 font-bold mt-0.5">Live: € {formatAccounting(currentPrice)}</div>
                          <div className={`text-[9px] font-bold mt-0.5 ${isDateMatching ? 'text-slate-800' : 'text-rose-600 animate-pulse'}`}>
                            {isDateMatching ? `Prüfung: OK ✅` : `Alt: ${formatToGermanDate(priceDate)} ⚠️`}
                          </div>
                        </>
                      ) : (
                        <div className="text-xs text-rose-600 font-bold mt-0.5">Live-Kurs fehlt!</div>
                      )}
                    </td>

                    <td className="py-4 text-center">
                      {item.status === 'sold' ? (
                        <div className="flex flex-col items-center gap-1.5 py-1">
                          <div className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-150 px-3 py-1 bg-emerald-100/30 rounded-xl text-xs font-bold leading-none shadow-xs">
                            💸 POSITION ERFOLGREICH VERKAUFT / REALISIERT
                          </div>
                          <span className="text-[10px] text-slate-400 font-semibold font-sans">
                            Gewinne voll gesichert • Freies Kapital wieder verfügbar!
                          </span>
                        </div>
                      ) : item.key === 'btc' ? (
                        <div className="inline-flex px-2.5 py-1 text-[10px] font-bold text-slate-900 bg-slate-50 border border-slate-100/70 rounded-full uppercase leading-none">
                          🛡️ HODL SPARPLAN INDEX
                        </div>
                      ) : currentPrice === null ? (
                        <span className="text-[10px] text-rose-600 font-bold animate-pulse">Warten auf Tageskurs</span>
                      ) : isTriggered ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="inline-block bg-rose-100 text-rose-800 border border-rose-200 px-3 py-1.5 rounded-xl text-xs font-bold animate-pulse leading-none shadow-xs">
                            🚨 STOP RISK GERISSEN! IMMEDIAT EXIT!
                          </div>
                          <button
                            onClick={() => handlePreFillSale(item)}
                            className="bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-semibold px-2.5 py-1 flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                          >
                            💸 Exit buchen
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          {/* Single line horizontal element containing stop values */}
                          <div className="flex flex-row items-center gap-1.5 bg-slate-50 border border-slate-100 p-2 rounded-xl">
                            <div className="flex items-center gap-0.5 bg-white border border-slate-100 px-2 py-0.5 rounded shadow-xs font-mono text-xs font-bold text-slate-700">
                              STOP: <span className="text-rose-600 font-bold ml-0.5">€ {finalCalculatedStop.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium font-sans">
                              Abstand: <span className="text-slate-800 font-bold">{(((currentPrice - finalCalculatedStop) / currentPrice) * 100).toFixed(1)}%</span>
                            </div>
                            <button
                              onClick={() => onLoadToCalculator(
                                item.key, 
                                item.name, 
                                item.limitPreis, 
                                item.tranchenGroesse, 
                                finalCalculatedStop
                              )}
                              className="h-6 px-2 bg-slate-50 hover:bg-slate-100/70 text-slate-900 border border-slate-100/50 rounded-lg text-[9px] font-bold flex items-center gap-0.5 transition-all shadow-xs active:scale-95 cursor-pointer"
                            >
                              🎯 Rechnen
                            </button>
                            <button
                              onClick={() => handlePreFillSale(item)}
                              className="h-6 px-2 bg-rose-50 hover:bg-rose-650 hover:text-white text-rose-700 border border-rose-200 rounded-lg text-[9px] font-bold flex items-center gap-0.5 transition-all shadow-xs active:scale-95 cursor-pointer ml-1"
                              title="Verkauf dieser Position zur Dokumentation eintragen"
                            >
                              💸 Verkauf buchen
                            </button>
                          </div>
                          
                          <span className="text-[10px] font-medium text-rose-600 block font-mono">
                            Risiko: € {formatAccounting(potentialLossValue)} ({riskPercentageOfDepot.toFixed(2)}% des Depots)
                          </span>
                        </div>
                      )}
                    </td>

                    <td className="py-4 text-right">
                      <div className="flex items-center justify-end gap-1 font-mono">
                        <span className="text-slate-400 font-semibold text-xs">€</span>
                        <input
                          type="number"
                          step="1000"
                          value={item.tranchenGroesse}
                          onChange={(e) => handleTrancheChange(item.id, false, e.target.value)}
                          className="w-20 sm:w-24 h-8 bg-white border border-slate-200 focus:border-slate-600 rounded-lg px-2 text-right font-semibold text-xs sm:text-sm text-slate-800 focus:outline-none"
                        />
                      </div>
                    </td>

                    <td className="py-4 text-center">
                      <div className="inline-flex rounded-xl bg-slate-50 p-1 border border-slate-100 gap-1 sm:gap-1.5">
                        <button
                          onClick={() => handlePortfolioStatusChange(item.id, 'green')}
                          className={`h-7 px-2 sm:px-3 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                            item.status === 'green' 
                              ? "bg-slate-800 text-white shadow-xs" 
                              : "text-slate-600 bg-white hover:bg-slate-100"
                          }`}
                        >
                          🟢 Reserviert
                        </button>
                        <button
                          onClick={() => handlePortfolioStatusChange(item.id, 'yellow')}
                          className={`h-7 px-2 sm:px-3 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                            item.status === 'yellow' 
                              ? "bg-amber-500 text-slate-950 shadow-xs" 
                              : "text-slate-600 bg-white hover:bg-slate-100"
                          }`}
                        >
                          🟡 Standby
                        </button>
                        <button
                          onClick={() => handlePortfolioStatusChange(item.id, 'red')}
                          className={`h-7 px-2 sm:px-3 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                            item.status === 'red' 
                              ? "bg-rose-600 text-white shadow-xs" 
                              : "text-slate-600 bg-white hover:bg-slate-100"
                          }`}
                        >
                          🔴 Halt
                        </button>
                        <button
                          onClick={() => handlePortfolioStatusChange(item.id, 'sold')}
                          className={`h-7 px-2 sm:px-3 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                            item.status === 'sold' 
                              ? "bg-emerald-600 text-white shadow-xs" 
                              : "text-slate-600 bg-white hover:bg-slate-100"
                          }`}
                          title="Position als Verkauft verbuchen"
                        >
                          ⚫ Verkauft
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

        </div>
      </details>

      <details className="bg-white border border-slate-100 rounded-3xl shadow-md shadow-slate-200/10 group">
        <summary className="cursor-pointer list-none p-5 sm:p-6 flex items-center justify-between gap-2 select-none">
          <div>
            <span className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-widest font-display block">
              🏢 Depot- &amp; Besitzer-Verwaltung
            </span>
            <span className="text-[10px] text-slate-400 font-semibold font-mono">Eigene Broker- und Besitzernamen anlegen</span>
          </div>
          <span className="text-[10px] font-bold text-slate-400 shrink-0 group-open:hidden">Öffnen ▾</span>
          <span className="text-[10px] font-bold text-slate-400 shrink-0 hidden group-open:inline">Schließen ▴</span>
        </summary>
        <div className="px-2 sm:px-3 pb-3">
      {/* DEPOT & BESITZER VERWALTUNG (Stammdaten — selten gebraucht, daher unten) */}
      <div id="depot-consolidation-summary" className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 space-y-6 shadow-md shadow-slate-200/10">
        <div className="flex items-center justify-between border-b border-slate-50 pb-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-100 border border-slate-250 rounded-xl text-slate-700">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-widest font-display flex items-center gap-2">
                🏢 Depot- &amp; Besitzer-Verwaltung
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold font-mono mt-0.5">
                Eigene Depot-/Broker-Namen und Besitzer anlegen — sie stehen dann in den Formularen zur Auswahl
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowDepotManagement(!showDepotManagement)}
            className="h-9 px-3.5 bg-slate-50 hover:bg-slate-100 text-slate-705 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer border border-slate-205 shadow-2xs active:scale-95"
          >
            {showDepotManagement ? "Schließen" : "⚙️ Depots & Besitzer verwalten"}
          </button>
        </div>

        {/* DEPOT & BESITZER VERWALTUNG PANEL */}
        {showDepotManagement && (
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-150 space-y-5 animate-fade-in text-xs">
            <div className="border-b border-slate-200 pb-2">
              <h4 className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wider">
                ⚙️ Depot- und KYC-Besitzer Verwaltung
              </h4>
              <p className="text-[10px] text-slate-400 font-semibold font-mono mt-0.5">
                Erstelle eigene Namen für deine Depots/Broker und KYC-Besitzer. Diese stehen danach in den Auswahlfeldern der Formulare bereit.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* DEPOT MANAGEMENT */}
              <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <span className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                  🏢 Eigene Depots / Broker
                </span>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="z.B. Flatex Privat"
                    value={newDepotInput}
                    onChange={(e) => setNewDepotInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomDepot(); } }}
                    className="flex-1 h-9 bg-slate-50 border border-slate-200 rounded-lg px-2.5 font-semibold text-slate-800 focus:outline-none focus:border-slate-600 focus:bg-white text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomDepot}
                    className="h-9 w-9 bg-slate-800 hover:bg-slate-900 text-white rounded-lg flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-sm"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                  {customDepots.map((dep) => (
                    <div key={dep} className="flex items-center justify-between py-1.5 px-2.5 bg-slate-50 hover:bg-slate-100/80 rounded-lg border border-slate-150 text-xs text-slate-800 font-semibold">
                      <span>{dep}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomDepot(dep)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors cursor-pointer"
                        title="Eintrag löschen"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* BESITZER MANAGEMENT */}
              <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <span className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                  👤 Eigene KYC-Besitzer Namen
                </span>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="z.B. Andres Holding"
                    value={newBesitzerInput}
                    onChange={(e) => setNewBesitzerInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomBesitzer(); } }}
                    className="flex-1 h-9 bg-slate-50 border border-slate-200 rounded-lg px-2.5 font-semibold text-slate-800 focus:outline-none focus:border-slate-600 focus:bg-white text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomBesitzer}
                    className="h-9 w-9 bg-slate-800 hover:bg-slate-900 text-white rounded-lg flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-sm"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                  {customBesitzer.map((own) => (
                    <div key={own} className="flex items-center justify-between py-1.5 px-2.5 bg-slate-50 hover:bg-slate-100/80 rounded-lg border border-slate-150 text-xs text-slate-800 font-semibold">
                      <span>{own}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomBesitzer(own)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors cursor-pointer"
                        title="Eintrag löschen"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 📥 BACKUP & BESITZER REKONSTRUKTION SPOND-PANEL */}
            <div className="mt-6 pt-5 border-t border-slate-150 bg-slate-50/40 rounded-2xl p-4 sm:p-5 border border-dashed border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-850 uppercase tracking-wide flex items-center gap-2">
                    <RotateCcw className="h-4 w-4 text-slate-800" />
                    📥 System- &amp; Besitzer-Rettungscenter (Backup einlesen)
                  </h4>
                  <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                    Sollten deine eingetragenen Besitzer, Depots oder Aktienkäufe durch einen Browser-Reset fehlen, kannst du hier mit einem einzigen Klick dein unbestechliches <strong>Backup (.json)</strong> wieder einspielen. Das System lädt alle Einstellungen, die Historie und deine personalisierten Besitzer sofort zurück!
                  </p>
                </div>
                
                <div className="shrink-0">
                  <label className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-900 active:scale-95 text-white text-[11px] font-bold uppercase tracking-wide rounded-xl cursor-pointer transition-all shadow-md shadow-slate-100">
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Lokales Backup laden</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleUploadLocalJson}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

        </div>
      </details>


    </div>
  );
}
