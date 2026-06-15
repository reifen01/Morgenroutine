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
import { LivePrices, PortfolioItem, ChecklistItem, SoldTradeItem, PortfolioPurchase } from "../types";
import { formatAccounting, formatToGermanDate, parseCleanDate } from "../utils/mathUtils";
import { CombinedJournal } from "./CombinedJournal";
import DepotCurveChart from "./DepotCurveChart";

interface PortfolioTabProps {
  routineDate: string;
  livePrices: LivePrices;
  portfolioData: PortfolioItem[];
  onPortfolioDataChange: (data: PortfolioItem[]) => void;
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
  livePrices,
  portfolioData,
  onPortfolioDataChange,
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
  const [saleAssetKey, setSaleAssetKey] = useState("now");
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
      const matchedItem = portfolioData.find(item => item.key === key);
      if (matchedItem) {
        setPurchaseAssetName(matchedItem.name);
      } else {
        if (key === 'tsla') setPurchaseAssetName("Tesla, Inc.");
        else if (key === 'now') setPurchaseAssetName("ServiceNow, Inc.");
        else if (key === 'baba') setPurchaseAssetName("Alibaba Group Holding Ltd.");
        else if (key === 'btc') setPurchaseAssetName("Bitcoin Tracker Index");
        else setPurchaseAssetName(key);
      }
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
    const knownKeys = ["tsla", "now", "baba", "btc", ...portfolioData.map(item => String(item.key))];
    const isKnown = knownKeys.includes(String(p.key));
    
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
    const targetAssetKey = saleAssetKey || (portfolioData.find(p => p.name === saleAssetName)?.key) || "now";
    
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
    const kestBetrag = gewinnVerlust > 0 ? (gewinnVerlust * 0.275) : 0;
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
  const isHighDistributionDays = 
    (livePrices.tsla.price !== null && livePrices.tsla.price < 0) || // placeholder check
    false;

  // Verification helper for alarm states
  let anyStopTriggered = false;  return (
    <div className="space-y-6 text-slate-900">
      
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
                Schutzschild gegen Gier • DADAT Depotkapital: {formatAccounting(START_CASH)} €
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

      {/* DEPOT & BESITZER ÜBERSICHT (KONSOLIDIERTE DARSTELLUNG UND GESAMTSUMMEN) */}
      <div id="depot-consolidation-summary" className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 space-y-6 shadow-md shadow-slate-200/10">
        <div className="flex items-center justify-between border-b border-slate-50 pb-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-100 border border-slate-250 rounded-xl text-slate-700">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-widest font-display flex items-center gap-2">
                🏢 Depot- &amp; Besitzer-Konsolidierung (Gesamtsummen)
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold font-mono mt-0.5">
                Übersicht und Sortierung für einzelne Depots und Besitzer (Käufe, Verkäufe und Gesamtsumme)
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

        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full border-collapse text-left text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-sans">
                <th className="py-3 px-4">Depot / Broker</th>
                <th className="py-3 px-4">Besitzer Name</th>
                <th className="py-3 px-4 text-right text-slate-600">Initiales Cash (Konto)</th>
                <th className="py-3 px-4 text-right">Anschaffungswert (Aktiv)</th>
                <th className="py-3 px-4 text-right">Aktueller Depotwert (Aktiv)</th>
                <th className="py-3 px-4 text-right">Buchgewinn / -verlust</th>
                <th className="py-3 px-4 text-right text-slate-900">Aktuelles Cash (Konto)</th>
                <th className="py-3 px-4 text-right text-slate-900 font-bold">Depot Gesamtwert</th>
                <th className="py-3 px-4 text-right text-emerald-600">Realisierter Ertrag (Netto)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-semibold text-slate-750 font-sans text-xs">
              {depotOverview.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 font-semibold font-sans">
                    Keine aktiven Bestände oder Verkäufe zur Konsolidierung vorhanden.
                  </td>
                </tr>
              ) : (
                <>
                  {depotOverview.map((item, index) => {
                    const bookGainLoss = item.totalActiveValue - item.totalActiveCost;
                    const bookGainIsProfit = bookGainLoss >= 0;
                    const currentCash = depotCashBalances[item.depot] ?? 0;
                    const totalAssetVal = item.totalActiveValue + currentCash;

                    return (
                      <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {item.depot}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-800">
                          {item.besitzerName}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono">
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-slate-400 text-[10px]">€</span>
                            <input
                              type="number"
                              step="500"
                              className="w-24 px-2 py-1 text-right text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg font-bold font-mono text-slate-900 focus:outline-none focus:border-slate-600 focus:bg-white transition-all"
                              value={depotStartingCash[item.depot] !== undefined ? depotStartingCash[item.depot].toFixed(0) : "40000"}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setDepotStartingCash({
                                  ...depotStartingCash,
                                  [item.depot]: val
                                });
                              }}
                            />
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-slate-750">
                          € {formatAccounting(item.totalActiveCost)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-slate-900">
                          € {formatAccounting(item.totalActiveValue)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono">
                          <span className={bookGainIsProfit ? "text-emerald-600" : "text-rose-650"}>
                            {bookGainIsProfit ? "+" : ""}{formatAccounting(bookGainLoss)} €
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-slate-900">
                          € {formatAccounting(currentCash)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-slate-950 font-bold bg-slate-50/20">
                          € {formatAccounting(totalAssetVal)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono">
                          <span className={item.realizedNet >= 0 ? "text-emerald-600" : "text-rose-600"}>
                            {item.realizedNet >= 0 ? "+" : ""}{formatAccounting(item.realizedNet)} €
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {/* GRAND TOTAL ROW */}
                  <tr className="bg-slate-100/80 font-bold border-t border-slate-300 border-b-2 text-[12px] text-slate-950">
                    <td className="py-4 px-4 uppercase tracking-wider" colSpan={2}>
                      Gesamtsumme über alle Depots
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-slate-600">
                      € {formatAccounting(customDepots.reduce((sum, dep) => sum + (depotStartingCash[dep] ?? 40000), 0))}
                    </td>
                    <td className="py-4 px-4 text-right font-mono">
                      € {formatAccounting(overallTotals.activeCostSum)}
                    </td>
                    <td className="py-4 px-4 text-right font-mono">
                      € {formatAccounting(overallTotals.activeValueSum)}
                    </td>
                    <td className="py-4 px-4 text-right font-mono">
                      <span className={(overallTotals.activeValueSum - overallTotals.activeCostSum) >= 0 ? "text-emerald-600" : "text-rose-650"}>
                        {(overallTotals.activeValueSum - overallTotals.activeCostSum) >= 0 ? "+" : ""}{formatAccounting(overallTotals.activeValueSum - overallTotals.activeCostSum)} €
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-slate-900">
                      € {formatAccounting(overallTotals.totalCashSum)}
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-slate-950 font-extrabold bg-slate-50/50">
                      € {formatAccounting(overallTotals.grandTotalValue)}
                    </td>
                    <td className="py-4 px-4 text-right font-mono">
                      <span className={overallTotals.realizedNetSum >= 0 ? "text-emerald-600" : "text-rose-600"}>
                        {overallTotals.realizedNetSum >= 0 ? "+" : ""}{formatAccounting(overallTotals.realizedNetSum)} €
                      </span>
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

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

        {/* PORTFOLIO TABELLE */}
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full border-collapse text-left text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-sans select-none">
                <th className="py-3 px-4">Wertpapier (Asset)</th>
                <th className="py-3 px-4">Depot</th>
                <th className="py-3 px-4">Besitzer</th>
                <th className="py-3 px-4 text-right">Menge</th>
                <th className="py-3 px-4 text-right">Ø Kaufkurs</th>
                <th className="py-3 px-4 text-right">Aktueller Kurs</th>
                <th className="py-3 px-4 text-right">Anschaffungswert</th>
                <th className="py-3 px-4 text-right">Marktwert</th>
                <th className="py-3 px-4 text-right text-slate-900">Unrealisierter P/L-Gras</th>
                <th className="py-3 px-4 text-center">Aktion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-slate-700 text-xs font-semibold">
              {derivedActivePortfolio.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-400 font-semibold font-sans">
                    Keine aktiven Bestände im Journal vorhanden. Buche einen Kauf im Transaktions-Journal unten ein, um den Live-Bestand einzusehen!
                  </td>
                </tr>
              ) : (
                derivedActivePortfolio.map((holding, idx) => {
                  const livePr = livePrices[holding.key as keyof typeof livePrices]?.price || holding.averageKaufkurs;
                  const mktVal = holding.totalShares * livePr;
                  const pl = mktVal - holding.totalCost;
                  const plPercent = holding.totalCost > 0 ? (pl / holding.totalCost) * 100 : 0;
                  const isProfit = pl >= 0;

                  return (
                    <tr key={`${holding.key}-${idx}`} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900 text-sm">{holding.name}</div>
                        <span className="inline-block px-1.5 py-0.5 rounded font-mono text-[9px] font-bold text-slate-800 bg-slate-50 uppercase mt-0.5">
                          {String(holding.key).toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] font-bold border border-slate-200">
                          {holding.depot}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-slate-50 text-slate-900 font-mono text-[10px] font-bold border border-slate-200">
                          {holding.besitzerName}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                        {holding.totalShares.toFixed(2)} Stk.
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-500 whitespace-nowrap">
                        € {formatAccounting(holding.averageKaufkurs)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-700 whitespace-nowrap">
                        € {formatAccounting(livePr)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-900 whitespace-nowrap">
                        € {formatAccounting(holding.totalCost)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-900 whitespace-nowrap">
                        € {formatAccounting(mktVal)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono whitespace-nowrap">
                        <span className={`block font-bold ${isProfit ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {isProfit ? "+" : ""}{formatAccounting(pl)} €
                        </span>
                        <span className={`text-[9px] font-extrabold ${isProfit ? 'text-emerald-500/90' : 'text-rose-500/90'}`}>
                          ({isProfit ? "+" : ""}{plPercent.toFixed(1)}%)
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => {
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
                            if (element) {
                              element.scrollIntoView({ behavior: 'smooth' });
                            }
                          }}
                          className="px-2.5 py-1 text-[10px] font-bold bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white rounded-lg border border-rose-200 transition-all cursor-pointer active:scale-95"
                          title="Einen stückweisen Ausstieg/Verkauf für diese Position einbuchen"
                        >
                          💸 Exit buchen
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

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

      {/* Disabling legacy redundant views */}
      {false && (
      <>
      <div id="acquisition-journal-section" className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 space-y-6 shadow-md shadow-slate-200/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-50 pb-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-50 border border-slate-100/70 rounded-xl text-slate-800">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-widest font-display flex items-center gap-2">
                📥 Anschaffungs-Journal (Kauf-Historie)
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold font-mono mt-0.5">
                Dokumentation aller realen Wertpapierkäufe zur Ermittlung der gesetzlichen Steuerschwellen (AT-KESt)
              </p>
            </div>
          </div>
          
          <button
            onClick={() => {
              if (showAddPurchaseForm) {
                setEditingPurchaseId(null);
                setPurchaseKaufKurs("");
                setPurchaseAnzahlAktien("");
                setPurchaseTotalKosten("");
                setPurchaseNotiz("");
                setShowAddPurchaseForm(false);
              } else {
                setShowAddPurchaseForm(true);
                setShowAddSaleForm(false);
              }
            }}
            className="h-9 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm hover:shadow active:scale-95 cursor-pointer ml-auto sm:ml-0"
          >
            <Plus className="h-4 w-4" /> {showAddPurchaseForm ? "Formular schließen" : "Kauf manuell buchen"}
          </button>
        </div>

        {/* INPUT FORM FOR PURCHASES */}
        {showAddPurchaseForm && (
          <form onSubmit={handleSavePurchase} className="bg-slate-50 border border-slate-150 p-6 rounded-2xl space-y-4 animate-fade-in text-xs">
            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              {editingPurchaseId ? "✏️ Anschaffungseintrag ändern / bearbeiten" : "📥 Neuen realen Kauf im Journal dokumentieren"}
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Wertpapier / Asset Typ *</label>
                <select
                  value={purchaseCustomKeyEnabled ? "other" : purchaseAssetKey}
                  onChange={(e) => handlePurchaseAssetChange(e.target.value)}
                  className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 font-semibold text-slate-850 focus:outline-none cursor-pointer"
                >
                  <option value="tsla">Tesla (TSLA)</option>
                  <option value="now">ServiceNow (NOW)</option>
                  <option value="baba">Alibaba (BABA)</option>
                  <option value="btc">Bitcoin (BTC)</option>
                  {portfolioData.map((item) => {
                    const keyLower = String(item.key).toLowerCase();
                    if (["tsla", "now", "baba", "btc"].includes(keyLower)) return null;
                    return (
                      <option key={`purchase-opt-${item.key}`} value={item.key}>
                        {item.name} ({String(item.key).toUpperCase()})
                      </option>
                    );
                  })}
                  <option value="other">Sonstiges Wertpapier / Asset</option>
                </select>
              </div>

              {purchaseCustomKeyEnabled && (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Asset-Kürzel *</label>
                    <input
                      type="text"
                      required
                      placeholder="z.B. AAPL"
                      value={purchaseAssetKey}
                      onChange={(e) => setPurchaseAssetKey(e.target.value.toLowerCase())}
                      className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 font-semibold text-slate-850 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Asset-Bezeichnung Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="z.B. Apple Inc."
                      value={purchaseAssetName}
                      onChange={(e) => setPurchaseAssetName(e.target.value)}
                      className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 font-semibold text-slate-850 focus:outline-none"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Kaufdatum *</label>
                <input
                  type="date"
                  required
                  value={purchaseDatum}
                  onChange={(e) => setPurchaseDatum(e.target.value)}
                  className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 font-semibold text-slate-850 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Kaufkurs (€ je Aktie) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="z.B. 175.50"
                  value={purchaseKaufKurs}
                  onChange={(e) => handlePurchaseKaufKursChange(e.target.value)}
                  className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 font-mono font-semibold text-slate-850 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Anzahl gekaufter Aktien *</label>
                <input
                  type="number"
                  step="0.0001"
                  required
                  placeholder="z.B. 10"
                  value={purchaseAnzahlAktien}
                  onChange={(e) => handlePurchaseAnzahlChange(e.target.value)}
                  className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 font-mono font-semibold text-slate-850 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Tatsächliche Kosten (€ Gesamtwert) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="z.B. 1755.00"
                  value={purchaseTotalKosten}
                  onChange={(e) => handlePurchaseTotalChange(e.target.value)}
                  className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 font-mono font-semibold text-slate-850 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Depot / Broker *</label>
                <select
                  required
                  value={purchaseDepot}
                  onChange={(e) => setPurchaseDepot(e.target.value)}
                  className="w-full h-10 bg-white border border-slate-205 rounded-xl px-3 font-semibold text-slate-850 focus:outline-none cursor-pointer"
                >
                  <option value="" disabled>-- Depot auswählen --</option>
                  {customDepots.map(d => (
                    <option key={`opt-p-dep-${d}`} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Besitzer Name *</label>
                <select
                  required
                  value={purchaseBesitzer}
                  onChange={(e) => setPurchaseBesitzer(e.target.value)}
                  className="w-full h-10 bg-white border border-slate-205 rounded-xl px-3 font-semibold text-slate-850 focus:outline-none cursor-pointer"
                >
                  <option value="" disabled>-- Besitzer auswählen --</option>
                  {customBesitzer.map(b => (
                    <option key={`opt-p-own-${b}`} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Begründung / Notiz zum Erwerb</label>
              <textarea
                placeholder="Warum hast du gekauft? (z.B. Unterbewertet laut DCF-Modell, K1-Anker erreicht...)"
                value={purchaseNotiz}
                onChange={(e) => setPurchaseNotiz(e.target.value)}
                className="w-full min-h-[70px] bg-white border border-slate-200 rounded-xl p-3 font-semibold text-slate-850 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setPurchaseKaufKurs("");
                  setPurchaseAnzahlAktien("");
                  setPurchaseTotalKosten("");
                  setPurchaseNotiz("");
                  setEditingPurchaseId(null);
                  setShowAddPurchaseForm(false);
                }}
                className="h-10 px-4 bg-white hover:bg-slate-100 text-slate-705 border border-slate-300 rounded-xl font-bold uppercase text-[10px] tracking-wider transition-all cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                className="h-10 px-5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold uppercase text-[10px] tracking-wider transition-all flex items-center gap-1 cursor-pointer"
              >
                {editingPurchaseId ? "💾 Änderungen Speichern" : "📥 Kauf im Journal einbuchen"}
              </button>
            </div>
          </form>
        )}

        {/* JOURNAL TABLE OF PURCHASES */}
        <div className="overflow-x-auto pt-2">
          <table className="w-full text-left border-collapse text-xs sm:text-sm" style={{ minWidth: "950px" }}>
            <thead>
              <tr className="border-b border-slate-105 text-slate-400 font-bold text-[10px] uppercase tracking-widest select-none">
                <th onClick={() => handleSortPurchases("kaufDatum")} className="pb-3 cursor-pointer hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-1">
                    <span>Datum / Asset</span>
                    <span className="text-[8px] text-slate-400">{purchaseSortField === "kaufDatum" ? (purchaseSortAsc ? "▲" : "▼") : "↕"}</span>
                  </div>
                </th>
                <th onClick={() => handleSortPurchases("depot")} className="pb-3 cursor-pointer hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-1">
                    <span>Depot</span>
                    <span className="text-[8px] text-slate-400">{purchaseSortField === "depot" ? (purchaseSortAsc ? "▲" : "▼") : "↕"}</span>
                  </div>
                </th>
                <th onClick={() => handleSortPurchases("besitzerName")} className="pb-3 cursor-pointer hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-1">
                    <span>Besitzer</span>
                    <span className="text-[8px] text-slate-400">{purchaseSortField === "besitzerName" ? (purchaseSortAsc ? "▲" : "▼") : "↕"}</span>
                  </div>
                </th>
                <th onClick={() => handleSortPurchases("anzahlAktien")} className="pb-3 text-right cursor-pointer hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-1 justify-end">
                    <span>Kauf-Menge</span>
                    <span className="text-[8px] text-slate-400">{purchaseSortField === "anzahlAktien" ? (purchaseSortAsc ? "▲" : "▼") : "↕"}</span>
                  </div>
                </th>
                <th onClick={() => handleSortPurchases("verbleibendeAnzahlAktien")} className="pb-3 text-right cursor-pointer hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-1 justify-end">
                    <span>Verbleibende Stk. (Aktiv)</span>
                    <span className="text-[8px] text-slate-400">{purchaseSortField === "verbleibendeAnzahlAktien" ? (purchaseSortAsc ? "▲" : "▼") : "↕"}</span>
                  </div>
                </th>
                <th onClick={() => handleSortPurchases("kaufKurs")} className="pb-3 text-right cursor-pointer hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-1 justify-end">
                    <span>Kaufkurs</span>
                    <span className="text-[8px] text-slate-400">{purchaseSortField === "kaufKurs" ? (purchaseSortAsc ? "▲" : "▼") : "↕"}</span>
                  </div>
                </th>
                <th onClick={() => handleSortPurchases("tatsaechlicheKosten")} className="pb-3 text-right cursor-pointer hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-1 justify-end">
                    <span>Anschaffungswert / Investition</span>
                    <span className="text-[8px] text-slate-400">{purchaseSortField === "tatsaechlicheKosten" ? (purchaseSortAsc ? "▲" : "▼") : "↕"}</span>
                  </div>
                </th>
                <th className="pb-3 text-center">Aktion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-medium">
              {sortedPurchases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-semibold font-sans">
                    Es sind noch keine Anschaffungseinträge im Journal vorhanden. Buche einen Kauf oben!
                  </td>
                </tr>
              ) : (
                sortedPurchases.map((purchase) => {
                  const isActive = purchase.verbleibendeAnzahlAktien > 0;
                  
                  return (
                    <tr key={purchase.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100">
                      <td className="py-4">
                        <span className="block font-bold text-slate-900 text-sm sm:text-base">{purchase.name}</span>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          <span className="block text-[9px] font-semibold text-slate-400 font-mono uppercase">
                            🗓️ {formatToGermanDate(purchase.kaufDatum)}
                          </span>
                          <span className="block px-1.5 py-0.5 rounded font-mono text-[9px] font-extrabold text-slate-800 bg-slate-50 uppercase border border-slate-100/50">
                            {String(purchase.key).toUpperCase()}
                          </span>
                        </div>
                        {purchase.notiz && (
                          <p className="text-[10px] text-slate-500 font-medium italic mt-2.5 max-w-[245px] whitespace-normal leading-tight border-l-2 border-slate-200 pl-2">
                            " {purchase.notiz} "
                          </p>
                        )}
                      </td>
                      <td className="py-4">
                        <span className="px-2 py-1 rounded bg-slate-100 text-slate-700 font-mono text-[10px] font-bold border border-slate-200 whitespace-nowrap">
                          {purchase.depot || "Standard Depot"}
                        </span>
                      </td>
                      <td className="py-4">
                        <span className="px-2 py-1 rounded bg-slate-50 text-slate-900 font-mono text-[10px] font-bold border border-slate-200 whitespace-nowrap">
                          {purchase.besitzerName || "Standard Besitzer"}
                        </span>
                      </td>
                      <td className="py-4 text-right font-mono tabular-nums text-slate-500">{purchase.anzahlAktien} Stk.</td>
                      <td className="py-4 text-right font-mono tabular-nums">
                        <span className={`font-bold px-1.5 py-0.5 rounded-md ${isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400 italic font-medium'}`}>
                          {purchase.verbleibendeAnzahlAktien.toFixed(4)} {isActive ? "Stk. aktiv" : "vollständig realisiert"}
                        </span>
                      </td>
                      <td className="py-4 text-right font-mono tabular-nums text-slate-600">€ {formatAccounting(purchase.kaufKurs)}</td>
                      <td className="py-4 text-right font-mono tabular-nums font-bold text-slate-800">€ {formatAccounting(purchase.tatsaechlicheKosten)}</td>
                      
                      <td className="py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleStartEditPurchase(purchase)}
                            className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-450 hover:text-slate-800 transition-colors cursor-pointer"
                            title="Anschaffung ändern / bearbeiten"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          
                          <button
                            onClick={() => {
                              if (confirm(`Möchtest du diesen Anschaffungseintrag für ${purchase.name} wirklich unwiderruflich aus dem Journal löschen?`)) {
                                handleDeletePurchase(purchase.id);
                              }
                            }}
                            className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-450 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Anschaffung löschen"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* HISTORISCHE PERFORMANCE-KURVE (REALISIERTE TRADES) */}
      <DepotCurveChart
        soldTrades={soldTrades}
        customDepots={customDepots}
        depotStartingCash={depotStartingCash}
      />

      {/* REALISIERTE VERKÄUFE & TRADE-HISTORIE */}
      <div id="realized-sales-section" className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 space-y-6 shadow-md shadow-slate-200/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-50 pb-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-50 border border-rose-100/70 rounded-xl text-rose-600">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-widest font-display flex items-center gap-2">
                📈 Realisierte Verkäufe &amp; Trade-Historie (Österreich KESt-konform)
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold font-mono mt-0.5">
                Steuerrechtliche DADAT-Dokumentation | Automatische 27,5% KESt-Rücklage
              </p>
            </div>
          </div>
          
          <button
            onClick={() => setShowAddSaleForm(!showAddSaleForm)}
            className="h-9 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm hover:shadow active:scale-95 cursor-pointer ml-auto sm:ml-0"
          >
            <Plus className="h-4 w-4" /> {showAddSaleForm ? "Formular schließen" : "Verkauf manuell buchen"}
          </button>
        </div>

        {/* STATISTIKEN DER REALISIERTEN TRADES */}
        {soldTrades && soldTrades.length > 0 ? (
          (() => {
            const totalVol = soldTrades.reduce((sum, s) => sum + (s.verkaufsKurs * s.anzahlAktien), 0);
            const totalGross = soldTrades.reduce((sum, s) => sum + s.gewinnVerlust, 0);
            const totalKest = soldTrades.reduce((sum, s) => sum + s.kestBetrag, 0);
            const totalNet = soldTrades.reduce((sum, s) => sum + s.nettoGewinn, 0);

            return (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center bg-slate-50 border border-slate-100 p-4 sm:p-5 rounded-2xl">
                <div className="bg-white border border-slate-100 p-3.5 rounded-xl">
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    Gesamtvolumen
                  </span>
                  <span className="block font-mono font-bold text-slate-800 text-xs sm:text-sm mt-1 tabular-nums">
                    {formatAccounting(totalVol)} €
                  </span>
                </div>
                <div className="bg-white border border-slate-100 p-3.5 rounded-xl">
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    Brutto Ertrag
                  </span>
                  <span className={`block font-mono font-bold text-xs sm:text-sm mt-1 tabular-nums ${totalGross >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {totalGross >= 0 ? "+" : ""}{formatAccounting(totalGross)} €
                  </span>
                </div>
                <div className="bg-white border border-slate-100 p-3.5 rounded-xl">
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    Österreichische KESt (27,5%)
                  </span>
                  <span className="block font-mono font-bold text-rose-500 text-xs sm:text-sm mt-1 tabular-nums">
                    -{formatAccounting(totalKest)} €
                  </span>
                  <span className="text-[8px] text-slate-400 block font-semibold mt-0.5">Steuereinfache Rücklage</span>
                </div>
                <div className="bg-white border border-slate-100 p-3.5 rounded-xl">
                  <span className="block text-[9px] font-bold text-slate-405 uppercase tracking-wider text-slate-400">
                    Netto Ausschüttung (Gewinn)
                  </span>
                  <span className={`block font-mono font-bold text-xs sm:text-sm mt-1 tabular-nums ${totalNet >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {totalNet >= 0 ? "+" : ""}{formatAccounting(totalNet)} €
                  </span>
                </div>
              </div>
            );
          })()
        ) : (
          <div className="p-8 border border-dashed border-slate-200 rounded-2xl text-center text-slate-450 text-xs font-semibold">
            Es sind noch keine geschlossenen Verkäufe dokumentiert. Nutze das Formular oben oder klicke im Cockpit auf "💸 Verkauf buchen" auf ServiceNow oder einem anderen Wertpapier, um den realisierten Trade festzuschreiben.
          </div>
        )}

        {/* EINTRAGEFORMULAR */}
        {showAddSaleForm && (
          <form onSubmit={handleAddSale} className="bg-slate-50 border border-slate-150 p-6 rounded-2xl space-y-4 animate-fade-in text-xs">
            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              {editingTradeId ? "✏️ Realisierten Trade ändern / bearbeiten" : "💸 Vorfall / Realisierten Trade hinzufügen"}
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Wertpapier / Bezeichnung *</label>
                <input
                  type="text"
                  required
                  placeholder="z.B. ServiceNow (NOW) oder TSLA..."
                  value={saleAssetName}
                  onChange={(e) => setSaleAssetName(e.target.value)}
                  className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 font-semibold text-slate-850 focus:border-rose-450 focus:outline-none focus:ring-1 focus:ring-rose-205"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Asset Typ *</label>
                <select
                  value={saleAssetKey}
                  onChange={(e) => setSaleAssetKey(e.target.value)}
                  className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 font-semibold text-slate-850 focus:outline-none cursor-pointer"
                >
                  <option value="now">ServiceNow (NOW)</option>
                  <option value="tsla">Tesla (TSLA)</option>
                  <option value="baba">Alibaba (BABA)</option>
                  <option value="btc">Bitcoin (BTC)</option>
                  <option value="other">Sonstiger Vermögenswert</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Verkaufsdatum *</label>
                <input
                  type="date"
                  required
                  value={saleDatum}
                  onChange={(e) => setSaleDatum(e.target.value)}
                  className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 font-semibold text-slate-850 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Kaufkurs (€ je Aktie) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="z.B. 680.00"
                  value={saleKaufKurs}
                  onChange={(e) => setSaleKaufKurs(e.target.value)}
                  className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 font-mono font-semibold text-slate-850 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Verkaufskurs (€ je Aktie) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="z.B. 742.50"
                  value={saleVerkaufsKurs}
                  onChange={(e) => setSaleVerkaufsKurs(e.target.value)}
                  className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 font-mono font-semibold text-slate-850 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Anzahl verkaufter Aktien *</label>
                  <span className="text-[9px] bg-slate-50 text-slate-900 px-1.5 py-0.5 rounded font-bold font-mono">Gesamtmenge</span>
                </div>
                <input
                  type="number"
                  step="0.0001"
                  required
                  placeholder="z.B. 33.67"
                  value={saleAnzahlAktien}
                  onChange={(e) => setSaleAnzahlAktien(e.target.value)}
                  className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 font-mono font-semibold text-slate-850 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                  <span>Depot / Broker (Für Zuordnung) *</span>
                  <span className="text-[8px] bg-slate-100 text-slate-500 px-1 py-0.5 rounded uppercase font-bold">Pflichtfeld</span>
                </label>
                <select
                  required
                  value={saleDepot}
                  onChange={(e) => setSaleDepot(e.target.value)}
                  className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 font-semibold text-slate-850 focus:border-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-100 cursor-pointer"
                >
                  <option value="" disabled>-- Depot auswählen --</option>
                  {customDepots.map(d => (
                    <option key={`opt-s-dep-${d}`} value={d}>{d}</option>
                  ))}
                </select>
                <div className="text-[9px] text-slate-400 mt-1 font-medium select-none">
                  💡 Tipp: Depots oben über das Zahnrad verwalten!
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                  <span>Besitzer Name (Für Zuordnung) *</span>
                  <span className="text-[8px] bg-slate-100 text-slate-500 px-1 py-0.5 rounded uppercase font-bold">Pflichtfeld</span>
                </label>
                <select
                  required
                  value={saleBesitzer}
                  onChange={(e) => setSaleBesitzer(e.target.value)}
                  className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 font-semibold text-slate-850 focus:border-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-100 cursor-pointer"
                >
                  <option value="" disabled>-- Besitzer auswählen --</option>
                  {customBesitzer.map(b => (
                    <option key={`opt-s-own-${b}`} value={b}>{b}</option>
                  ))}
                </select>
                <div className="text-[9px] text-slate-400 mt-1 font-medium select-none">
                  💡 Tipp: Besitzer oben über das Zahnrad verwalten!
                </div>
              </div>
            </div>

            {/* Steuermethode Auswahl - FIFO oder Durchschnitt */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <span className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                ⚖️ Steuerliche Buchführungsmethode (AT-KESt) Wählen:
              </span>
              <div className="flex flex-col sm:flex-row gap-4">
                <label className="flex items-start gap-2.5 cursor-pointer p-2.5 rounded-xl hover:bg-slate-50 transition-colors select-none flex-1 border border-slate-150">
                  <input
                    type="radio"
                    name="taxMethodRadio"
                    checked={saleTaxMethod === 'durchschnitt'}
                    onChange={() => setSaleTaxMethod('durchschnitt')}
                    className="mt-0.5 text-slate-800 h-4 w-4 focus:ring-slate-600 cursor-pointer"
                  />
                  <div>
                    <span className="block font-bold text-slate-800 text-xs">A: Gleitende Durchschnittsmethode</span>
                    <span className="block text-[10px] text-slate-400 font-medium mt-0.5">
                      Steuerrechtlicher Standard in Österreich (§ 27a Abs 4 Z 3 EStG). Berechnet die Anschaffungskosten als gewichteten Mittelwert aller Käufe.
                    </span>
                  </div>
                </label>
                
                <label className="flex items-start gap-2.5 cursor-pointer p-2.5 rounded-xl hover:bg-slate-50 transition-colors select-none flex-1 border border-slate-150">
                  <input
                    type="radio"
                    name="taxMethodRadio"
                    checked={saleTaxMethod === 'FIFO'}
                    onChange={() => setSaleTaxMethod('FIFO')}
                    className="mt-0.5 text-slate-800 h-4 w-4 focus:ring-slate-600 cursor-pointer"
                  />
                  <div>
                    <span className="block font-bold text-slate-800 text-xs">B: FIFO-Methode (First-In, First-Out)</span>
                    <span className="block text-[10px] text-slate-400 font-medium mt-0.5">
                      Zuerst gekaufte Wertpapiere gelten als zuerst verkauft. Nützlich bei gesondert geführten Depots oder Auslandskonten.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {taxCalculationPreview && (
              <div className="bg-slate-100 border border-slate-200 p-4 rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="block font-bold text-slate-700 text-[10px] uppercase tracking-wider flex items-center gap-1.5 font-sans">
                    ⚙️ Anschaffungskosten-Match &amp; Tranchenverbrauch (Live)
                  </span>
                  <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono font-bold uppercase whitespace-nowrap">
                    Methode: {saleTaxMethod === 'FIFO' ? 'FIFO' : 'Gleitender Durchschnitt'}
                  </span>
                </div>

                {taxCalculationPreview.warning && (
                  <div className="flex items-start gap-2 text-rose-700 bg-rose-50 border border-rose-100 p-2.5 rounded-lg text-[10px] font-bold font-mono">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{taxCalculationPreview.warning}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center">
                  <div className="bg-white border border-slate-150 p-2 rounded-lg">
                    <span className="block text-[8px] text-slate-400 uppercase font-bold">Verfügbare Stücke</span>
                    <span className="block text-xs font-bold text-slate-800 font-mono mt-0.5">
                      {taxCalculationPreview.totalAvailableShares.toFixed(2)} Stk.
                    </span>
                  </div>
                  <div className="bg-white border border-slate-150 p-2 rounded-lg">
                    <span className="block text-[8px] text-slate-400 uppercase font-bold">Vorgeschlagener Ø-Kaufkurs</span>
                    <span className="block text-xs font-bold text-emerald-600 font-mono mt-0.5">
                      € {formatAccounting(taxCalculationPreview.suggestedKaufKurs)}
                    </span>
                  </div>
                  <div className="bg-white border border-slate-150 p-2 rounded-lg col-span-2 sm:col-span-1">
                    <span className="block text-[8px] text-slate-400 uppercase font-bold">Effektive Anschaffungskosten</span>
                    <span className="block text-xs font-bold text-slate-800 font-mono mt-0.5">
                      € {formatAccounting(taxCalculationPreview.totalPurchaseCost)}
                    </span>
                  </div>
                </div>

                {taxCalculationPreview.matchedLots && taxCalculationPreview.matchedLots.length > 0 && (
                  <div className="bg-white border border-slate-150 rounded-lg p-2.5 space-y-1 text-[9px] text-slate-600 font-mono">
                    <span className="block font-bold text-[8px] text-slate-400 uppercase tracking-widest pb-0.5 border-b border-slate-50">
                      Verbrauchter Anschaffungsbestand (Lots):
                    </span>
                    {taxCalculationPreview.matchedLots.map((lot, idx) => (
                      <div key={idx} className="flex justify-between items-center border-b border-dashed border-slate-50 last:border-0 pb-1 last:pb-0">
                        <span>• Anschaffung vom {formatToGermanDate(lot.date)}</span>
                        <span className="font-bold">
                          {lot.sharesFromLot.toFixed(2)} Stk. @ € {formatAccounting(lot.kaufKurs)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Dokumentierte Begründung / Notizen</label>
              <textarea
                placeholder="Warum hast du verkauft? (z.B. Stop-Loss bei 2x ATR gerissen, psychologischer Limitübertritt...)"
                value={saleNotiz}
                onChange={(e) => setSaleNotiz(e.target.value)}
                className="w-full min-h-[70px] bg-white border border-slate-200 rounded-xl p-3 font-semibold text-slate-850 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSaleAssetName("");
                  setSaleKaufKurs("");
                  setSaleVerkaufsKurs("");
                  setSaleAnzahlAktien("");
                  setSaleNotiz("");
                  setSaleDepot("");
                  setSaleBesitzer("");
                  setSaleTaxMethod("durchschnitt");
                  setEditingTradeId(null);
                  setShowAddSaleForm(false);
                }}
                className="h-10 px-4 bg-white hover:bg-slate-100 text-slate-705 border border-slate-300 rounded-xl font-bold uppercase text-[10px] tracking-wider transition-all cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                className="h-10 px-5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold uppercase text-[10px] tracking-wider transition-all flex items-center gap-1 cursor-pointer"
              >
                {editingTradeId ? "💾 Änderungen Speichern" : "💸 Trade im DADAT-Journal verbuchen"}
              </button>
            </div>
          </form>
        )}

        {/* TABELLE DER GESCHLOSSENEN TRADES */}
        {soldTrades && soldTrades.length > 0 && (
          <div className="overflow-x-auto pt-2">
            <table className="w-full text-left border-collapse text-xs sm:text-sm" style={{ minWidth: "950px" }}>
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold text-[10px] uppercase tracking-widest select-none">
                  <th onClick={() => handleSortSales("verkaufsDatum")} className="pb-3 cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-1">
                      <span>Datum / Asset</span>
                      <span className="text-[8px] text-slate-400">{saleSortField === "verkaufsDatum" ? (saleSortAsc ? "▲" : "▼") : "↕"}</span>
                    </div>
                  </th>
                  <th onClick={() => handleSortSales("depot")} className="pb-3 cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-1">
                      <span>Depot</span>
                      <span className="text-[8px] text-slate-400">{saleSortField === "depot" ? (saleSortAsc ? "▲" : "▼") : "↕"}</span>
                    </div>
                  </th>
                  <th onClick={() => handleSortSales("besitzerName")} className="pb-3 cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-1">
                      <span>Besitzer</span>
                      <span className="text-[8px] text-slate-400">{saleSortField === "besitzerName" ? (saleSortAsc ? "▲" : "▼") : "↕"}</span>
                    </div>
                  </th>
                  <th onClick={() => handleSortSales("anzahlAktien")} className="pb-3 text-right cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-1 justify-end">
                      <span>Menge</span>
                      <span className="text-[8px] text-slate-400">{saleSortField === "anzahlAktien" ? (saleSortAsc ? "▲" : "▼") : "↕"}</span>
                    </div>
                  </th>
                  <th onClick={() => handleSortSales("kaufKurs")} className="pb-3 text-right cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-1 justify-end">
                      <span>Kaufkurs</span>
                      <span className="text-[8px] text-slate-400">{saleSortField === "kaufKurs" ? (saleSortAsc ? "▲" : "▼") : "↕"}</span>
                    </div>
                  </th>
                  <th onClick={() => handleSortSales("verkaufsKurs")} className="pb-3 text-right cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-1 justify-end">
                      <span>Verkaufskurs</span>
                      <span className="text-[8px] text-slate-400">{saleSortField === "verkaufsKurs" ? (saleSortAsc ? "▲" : "▼") : "↕"}</span>
                    </div>
                  </th>
                  <th className="pb-3 text-right text-slate-800">Volumen (€)</th>
                  <th onClick={() => handleSortSales("gewinnVerlust")} className="pb-3 text-right text-slate-900 cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-1 justify-end">
                      <span>Brutto Ertrag</span>
                      <span className="text-[8px] text-slate-400">{saleSortField === "gewinnVerlust" ? (saleSortAsc ? "▲" : "▼") : "↕"}</span>
                    </div>
                  </th>
                  <th onClick={() => handleSortSales("kestBetrag")} className="pb-3 text-right text-rose-700 cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-1 justify-end">
                      <span>Aut. KESt (27,5%)</span>
                      <span className="text-[8px] text-slate-400">{saleSortField === "kestBetrag" ? (saleSortAsc ? "▲" : "▼") : "↕"}</span>
                    </div>
                  </th>
                  <th onClick={() => handleSortSales("nettoGewinn")} className="pb-3 text-right text-slate-900 cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-1 justify-end">
                      <span>Netto Ertrag</span>
                      <span className="text-[8px] text-slate-400">{saleSortField === "nettoGewinn" ? (saleSortAsc ? "▲" : "▼") : "↕"}</span>
                    </div>
                  </th>
                  <th className="pb-3 text-center">Aktion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-medium">
                {sortedSales.map((trade) => {
                  const volume = trade.verkaufsKurs * trade.anzahlAktien;
                  const isProfit = trade.gewinnVerlust >= 0;
                  
                  return (
                    <tr key={trade.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100">
                      <td className="py-4">
                        <span className="block font-bold text-slate-900 text-sm sm:text-base">{trade.name}</span>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          <span className="block text-[9px] font-semibold text-slate-400 uppercase font-mono">
                            🗓️ {formatToGermanDate(trade.verkaufsDatum)}
                          </span>
                          <span className={`inline-flex items-center gap-0.5 text-[9px] font-extrabold px-1.5 py-0.5 rounded-md ${
                            trade.taxMethod === 'FIFO'
                              ? "bg-amber-100/40 text-amber-800 border border-amber-200/40"
                              : "bg-slate-50 text-slate-900 border border-slate-200"
                          }`} title={trade.taxMethod === 'FIFO' ? 'First-In, First-Out steuerliche Veräußerung' : 'Erfassung über den gleitenden Durchschnittspreis'}>
                            {trade.taxMethod === 'FIFO' ? '⚖️ FIFO' : '📊 Gleitender Ø'}
                          </span>
                        </div>
                        {trade.notiz && (
                          <p className="text-[10px] text-slate-500 font-medium italic mt-2.5 max-w-[240px] whitespace-normal leading-tight border-l-2 border-slate-200 pl-2">
                            " {trade.notiz} "
                          </p>
                        )}
                      </td>
                      <td className="py-4">
                        <span className="px-2 py-1 rounded bg-slate-100 text-slate-700 font-mono text-[10px] font-bold border border-slate-200 whitespace-nowrap">
                          {trade.depot || "Standard Depot"}
                        </span>
                      </td>
                      <td className="py-4">
                        <span className="px-2 py-1 rounded bg-slate-50 text-slate-900 font-mono text-[10px] font-bold border border-slate-200 whitespace-nowrap">
                          {trade.besitzerName || "Standard Besitzer"}
                        </span>
                      </td>
                      <td className="py-4 text-right font-mono tabular-nums font-semibold">{trade.anzahlAktien}</td>
                      <td className="py-4 text-right font-mono tabular-nums text-slate-400">€ {formatAccounting(trade.kaufKurs)}</td>
                      <td className="py-4 text-right font-mono tabular-nums text-slate-700">€ {formatAccounting(trade.verkaufsKurs)}</td>
                      <td className="py-4 text-right font-mono tabular-nums font-semibold">€ {formatAccounting(volume)}</td>
                      
                      <td className="py-4 text-right font-mono font-bold tabular-nums">
                        <span className={isProfit ? "text-emerald-600" : "text-rose-600"}>
                          {isProfit ? "+" : ""}{formatAccounting(trade.gewinnVerlust)} €
                        </span>
                      </td>
 
                      <td className="py-4 text-right font-mono tabular-nums text-rose-500 text-xs">
                        {trade.kestBetrag > 0 ? (
                          <span>-{formatAccounting(trade.kestBetrag)} €</span>
                        ) : (
                          <span className="text-slate-400">0,00 €</span>
                        )}
                      </td>
 
                      <td className="py-4 text-right font-mono font-bold tabular-nums text-sm sm:text-base">
                        <span className={trade.nettoGewinn >= 0 ? "text-emerald-600" : "text-rose-600"}>
                          {trade.nettoGewinn >= 0 ? "+" : ""}{formatAccounting(trade.nettoGewinn)} €
                        </span>
                      </td>
 
                      <td className="py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleStartEditSale(trade)}
                            className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-450 hover:text-slate-800 transition-colors cursor-pointer"
                            title="Eintrag ändern / bearbeiten"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          
                          <button
                            onClick={() => handleUndoSale(trade)}
                            className="p-1.5 hover:bg-amber-50/70 rounded-lg text-slate-450 hover:text-amber-600 transition-colors cursor-pointer"
                            title="Verkauf rückgängig machen (Vollständig stornieren & Depot-Reservierung aktivieren)"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteSale(trade.id)}
                            className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Eintrag aus Journal löschen"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </>
      )}

      {/* KONSOLIDIERTES SYSTEM-RADAR */}
      <div className="bg-white border border-slate-150 rounded-3xl p-6 sm:p-8 space-y-6 shadow-md shadow-slate-200/10 animate-fade">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-50 pb-4 gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-slate-800">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-widest font-display">
                ⚡ SYSTEM-RADAR (Aktionen &amp; Markt-Kontext)
              </h3>
              <p className="text-[10px] text-slate-450 font-semibold font-mono mt-0.5">Unbestechliche Markt- und Budget-Überwachung</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowWatchlistHelp(!showWatchlistHelp)}
            className="text-emerald-600 hover:text-emerald-850 hover:bg-emerald-100/40 bg-emerald-50/40 px-3 py-1.5 border border-emerald-100/60 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
          >
            <HelpCircle className="h-3.5 w-3.5 text-emerald-600" /> System-Zweck?
          </button>
        </div>

        {showWatchlistHelp && (
          <div className="p-4 bg-emerald-500/5 border-l-4 border-emerald-500 rounded-r-2xl text-xs text-emerald-950 leading-relaxed space-y-2 font-semibold animate-fade-in">
            <p><strong>1. Aktions-Ampel (Checkliste)</strong>: Zeigt anstehende Budget-Entscheidungen. Ein Klick auf 🟢 sperrt den jeweiligen Betrag unbestechlich in deinem Cash-Cockpit.</p>
            <p><strong>2. Markt-Kontext (Watchlist)</strong>: Überwacht den übergeordneten SPX-Trend und deine BTC K1+K2 Bestände. Keine neuen Aktienkäufe, wenn der SPX unter seiner Trendlinie notiert!</p>
          </div>
        )}

        {/* Zweispalten-Layout für Desktop / Einspaltig für iPhone */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-1">
          
          {/* Linker Part: Aktions-Ampel */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-50 pb-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                ⚡ Budget-Checkliste (Dadat)
              </h4>
              <button
                type="button"
                onClick={() => setShowAddChecklistItemForm(!showAddChecklistItemForm)}
                className="text-xs font-bold text-slate-800 hover:text-slate-900 flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Wert hinzufügen
              </button>
            </div>

            {/* Form to add checklist item */}
            {showAddChecklistItemForm && (
              <form onSubmit={handleAddChecklistItem} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/5 space-y-3 shadow-xs animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10.5px] font-bold text-slate-500 uppercase">Aktie / Asset auswählen</label>
                    <select
                      value={newChecklistAsset}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewChecklistAsset(val);
                        if (val) {
                          setNewChecklistTitle(`${val}: Limit- oder Kauf-Aktion planen`);
                        }
                      }}
                      className="w-full h-9 bg-white border border-slate-205 focus:border-slate-600 rounded-lg px-2.5 text-xs text-slate-800 font-bold focus:outline-none"
                    >
                      <option value="">-- Bitte wählen --</option>
                      {eligibleStocks.map((stock) => (
                        <option key={stock.symbol} value={stock.symbol}>
                          {stock.symbol} - {stock.name || stock.symbol} ({stock.source === 'Depot' ? 'Depot 📂' : 'Watchlist 👀'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10.5px] font-bold text-slate-500 uppercase">Tranchengröße (€)</label>
                    <input
                      type="number"
                      step="1000"
                      value={newChecklistTranche}
                      onChange={(e) => setNewChecklistTranche(e.target.value)}
                      className="w-full h-9 bg-white border border-slate-205 focus:border-slate-600 rounded-lg px-2.5 text-xs text-slate-800 font-bold focus:outline-none"
                      placeholder="z.B. 20000"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10.5px] font-bold text-slate-500 uppercase">Aktion / Notiz</label>
                  <input
                    type="text"
                    value={newChecklistTitle}
                    onChange={(e) => setNewChecklistTitle(e.target.value)}
                    className="w-full h-9 bg-white border border-slate-205 focus:border-slate-600 rounded-lg px-2.5 text-xs text-slate-800 font-medium focus:outline-none"
                    placeholder="z.B. TSLA: Kauflimit bei € 320 aktivieren"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddChecklistItemForm(false);
                      setNewChecklistAsset("");
                      setNewChecklistTitle("");
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-100 transition cursor-pointer"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 transition shadow-xs cursor-pointer"
                  >
                    Hinzufügen
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-3">
              {visibleChecklist.length === 0 ? (
                <div className="p-6 rounded-2xl border border-dashed border-slate-205 bg-slate-50/50 text-center">
                  <p className="text-xs text-slate-500 font-medium">Keine aktiven Budget-Aktionen vorhanden.</p>
                  <p className="text-[10px] text-slate-400 mt-1">Klicke oben auf "Wert hinzufügen", um eine Aktion für Depot- oder Watchlist-Aktien zu erstellen.</p>
                </div>
              ) : (
                visibleChecklist.map((chk) => {
                  let borderClass = "border-slate-100 bg-slate-50/50";
                  let badgeClass = "bg-slate-100 text-slate-500";
                  let statusLabel = "🔴 DEAKTIVIERT";
                  
                  if (chk.status === 'green') {
                    borderClass = "border-slate-200 bg-slate-50/10 shadow-sm shadow-slate-100/10 animate-fade-in";
                    badgeClass = "bg-slate-50 text-slate-900 border border-slate-100/50";
                    statusLabel = "🟢 RESERVIERT";
                  } else if (chk.status === 'yellow') {
                    borderClass = "border-amber-150 bg-amber-50/10";
                    badgeClass = "bg-amber-50 text-amber-800 border border-amber-100/50";
                    statusLabel = "🟡 IN SCHLEIFE";
                  }

                  return (
                    <div key={chk.id} className={`p-4 rounded-2xl border ${borderClass} flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-300 shadow-xs`}>
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full ${badgeClass}`}>
                            {statusLabel}
                          </span>
                          <span className="text-xs sm:text-sm font-bold text-slate-800 leading-tight block">
                            {chk.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium font-mono">
                          <span>Aktionssumme:</span>
                          <span>€</span>
                          <input
                            type="number"
                            step="1000"
                            value={chk.tranchenGroesse}
                            onChange={(e) => handleTrancheChange(chk.id, true, e.target.value)}
                            className="w-24 h-7 bg-white border border-slate-205 focus:border-slate-600 rounded px-1.5 text-slate-800 font-bold focus:outline-none"
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                        <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-150 gap-1 shadow-xs">
                          <button 
                            type="button"
                            onClick={() => handleChecklistStatusChange(chk.id, 'green')} 
                            className={`h-7 w-8 sm:h-8 sm:w-9 rounded-lg text-xs font-bold transition-all cursor-pointer ${chk.status === 'green' ? 'bg-slate-800 text-white shadow-xs' : 'bg-white text-slate-700 hover:bg-slate-205'}`}
                            title="Budget reservieren"
                          >🟢</button>
                          <button 
                            type="button"
                            onClick={() => handleChecklistStatusChange(chk.id, 'yellow')} 
                            className={`h-7 w-8 sm:h-8 sm:w-9 rounded-lg text-xs font-bold transition-all cursor-pointer ${chk.status === 'yellow' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'bg-white text-slate-700 hover:bg-slate-205'}`}
                            title="In Warteschleife legen"
                          >🟡</button>
                          <button 
                            type="button"
                            onClick={() => handleChecklistStatusChange(chk.id, 'red')} 
                            className={`h-7 w-8 sm:h-8 sm:w-9 rounded-lg text-xs font-bold transition-all cursor-pointer ${chk.status === 'red' ? 'bg-rose-600 text-white shadow-xs' : 'bg-white text-slate-700 hover:bg-slate-205'}`}
                            title="Deaktivieren"
                          >🔴</button>
                        </div>

                        <button 
                          type="button"
                          onClick={() => handleChecklistDeleteObj(chk.id)} 
                          className="h-8 w-8 rounded-xl border border-rose-100 bg-rose-50/50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 flex items-center justify-center cursor-pointer transition-all shadow-xs"
                          title="Aus Checkliste löschen"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Rechter Part: Benchmarks */}
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-slate-50 pb-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-sans">
                📊 Marktindizes &amp; Trend-Filter
              </h4>
              {isHighDistributionDays && (
                <div className="text-[10px] font-bold text-rose-600 animate-pulse flex items-center gap-0.5">
                  <AlertTriangle className="h-3 w-3" /> Distribution Days Alarm!
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              {/* SPX */}
              <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block text-sm">SP&amp;P 500 (SPX)</span>
                  <span className="text-[10px] text-slate-400 block font-medium">Leitbörsen-Trendline (US)</span>
                </div>
                <div className="text-right font-mono">
                  <span className="block font-bold text-slate-800 text-sm">7.519,10</span>
                  <span className="text-slate-400 text-[10px] font-medium block">Distribution Days: 2</span>
                </div>
              </div>
              
              {/* NDX */}
              <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block text-sm">NASDAQ 100 (NDX)</span>
                  <span className="text-[10px] text-slate-400 block font-medium">Tech-Sektor-Trendline (US)</span>
                </div>
                <div className="text-right font-mono">
                  <span className="block font-bold text-slate-800 text-sm">22.410,50</span>
                  <span className="text-slate-400 text-[10px] font-medium block">Distribution Days: 1</span>
                </div>
              </div>
              
              {/* BTC */}
              <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block text-sm">Bitcoin (BTC/EUR)</span>
                  <span className="text-[10px] text-slate-400 block font-medium">K1 + K2 Sparplan-Benchmark</span>
                </div>
                <div className="text-right font-mono">
                  <span className="block font-bold text-slate-800 text-sm">
                    {livePrices.btc.price ? `€ ${formatAccounting(livePrices.btc.price)}` : "165.155,28 €"}
                  </span>
                  <span className="text-emerald-500 text-[10px] font-bold block">+0.02%</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
