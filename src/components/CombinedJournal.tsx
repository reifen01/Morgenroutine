import { useState, useMemo, FormEvent } from "react";
import { 
  Plus, 
  Trash2, 
  History, 
  Edit, 
  RotateCcw, 
  Scale, 
  HelpCircle,
  Percent,
  Brain,
  Sparkles
} from "lucide-react";
import { LivePrices, PortfolioItem, ChecklistItem, SoldTradeItem, PortfolioPurchase } from "../types";
import { formatAccounting, formatToGermanDate } from "../utils/mathUtils";
import AICoachTab from "./AICoachTab";

interface CombinedJournalProps {
  routineDate: string;
  portfolioPurchases: PortfolioPurchase[];
  soldTrades: SoldTradeItem[];
  portfolioData: PortfolioItem[];
  onPortfolioPurchasesChange: (updated: PortfolioPurchase[]) => void;
  onSoldTradesChange: (updated: SoldTradeItem[]) => void;
  customDepots: string[];
  customBesitzer: string[];
  onShowToast: (title: string, message: string, type: 'success' | 'warning' | 'error') => void;
  livePrices: LivePrices;

  // Form states and toggles
  showAddPurchaseForm: boolean;
  setShowAddPurchaseForm: (show: boolean) => void;
  showAddSaleForm: boolean;
  setShowAddSaleForm: (show: boolean) => void;
  editingPurchaseId: string | null;
  setEditingPurchaseId: (id: string | null) => void;
  editingTradeId: string | null;
  setEditingTradeId: (id: string | null) => void;

  // Buy form input states
  purchaseAssetKey: string;
  setPurchaseAssetKey: (key: string) => void;
  purchaseCustomKeyEnabled: boolean;
  setPurchaseCustomKeyEnabled: (enabled: boolean) => void;
  purchaseAssetName: string;
  setPurchaseAssetName: (name: string) => void;
  purchaseKaufKurs: string;
  setPurchaseKaufKurs: (val: string) => void;
  purchaseAnzahlAktien: string;
  setPurchaseAnzahlAktien: (val: string) => void;
  purchaseTotalKosten: string;
  setPurchaseTotalKosten: (val: string) => void;
  purchaseDatum: string;
  setPurchaseDatum: (val: string) => void;
  purchaseNotiz: string;
  setPurchaseNotiz: (val: string) => void;
  purchaseGedanken: string;
  setPurchaseGedanken: (val: string) => void;
  purchaseZiele: string;
  setPurchaseZiele: (val: string) => void;
  purchaseDepot: string;
  setPurchaseDepot: (val: string) => void;
  purchaseBesitzer: string;
  setPurchaseBesitzer: (val: string) => void;

  // Sell form input states
  saleAssetName: string;
  setSaleAssetName: (name: string) => void;
  saleAssetKey: string;
  setSaleAssetKey: (key: string) => void;
  saleKaufKurs: string;
  setSaleKaufKurs: (val: string) => void;
  saleVerkaufsKurs: string;
  setSaleVerkaufsKurs: (val: string) => void;
  saleAnzahlAktien: string;
  setSaleAnzahlAktien: (val: string) => void;
  saleDatum: string;
  setSaleDatum: (val: string) => void;
  saleNotiz: string;
  setSaleNotiz: (val: string) => void;
  saleTaxMethod: 'FIFO' | 'durchschnitt';
  setSaleTaxMethod: (method: 'FIFO' | 'durchschnitt') => void;
  saleDepot: string;
  setSaleDepot: (depot: string) => void;
  saleBesitzer: string;
  setSaleBesitzer: (owner: string) => void;

  // Input processing and math helpers
  handleSavePurchase: (e: FormEvent) => void;
  handleAddSale: (e: FormEvent) => void;
  handlePurchaseAssetChange: (value: string) => void;
  handlePurchaseAnzahlChange: (value: string) => void;
  handlePurchaseTotalChange: (value: string) => void;
  handlePurchaseKaufKursChange: (value: string) => void;
  taxCalculationPreview: {
    averageKaufkurs?: number;
    kaufKursUsed?: number;
    gewinnVerlust?: number;
    kestBetrag?: number;
    nettoGewinn?: number;
    totalAvailableShares?: number;
    warning?: string | null;
    lotsToConsume?: { purchaseId: string; date: string; sharesFromLot: number; kaufKurs: number }[];
  } | null;

  // Row operations
  handleStartEditPurchase: (p: PortfolioPurchase) => void;
  handleStartEditSale: (trade: SoldTradeItem) => void;
  handleUndoSale: (trade: SoldTradeItem) => void;
  handleDeletePurchase: (id: string) => void;
  handleDeleteSale: (id: string) => void;
}

export function CombinedJournal({
  routineDate,
  portfolioPurchases,
  soldTrades,
  portfolioData,
  onPortfolioPurchasesChange,
  onSoldTradesChange,
  customDepots,
  customBesitzer,
  onShowToast,
  livePrices,

  showAddPurchaseForm,
  setShowAddPurchaseForm,
  showAddSaleForm,
  setShowAddSaleForm,
  editingPurchaseId,
  setEditingPurchaseId,
  editingTradeId,
  setEditingTradeId,

  purchaseAssetKey,
  setPurchaseAssetKey,
  purchaseCustomKeyEnabled,
  setPurchaseCustomKeyEnabled,
  purchaseAssetName,
  setPurchaseAssetName,
  purchaseKaufKurs,
  setPurchaseKaufKurs,
  purchaseAnzahlAktien,
  setPurchaseAnzahlAktien,
  purchaseTotalKosten,
  setPurchaseTotalKosten,
  purchaseDatum,
  setPurchaseDatum,
  purchaseNotiz,
  setPurchaseNotiz,
  purchaseGedanken,
  setPurchaseGedanken,
  purchaseZiele,
  setPurchaseZiele,
  purchaseDepot,
  setPurchaseDepot,
  purchaseBesitzer,
  setPurchaseBesitzer,

  saleAssetName,
  setSaleAssetName,
  saleAssetKey,
  setSaleAssetKey,
  saleKaufKurs,
  setSaleKaufKurs,
  saleVerkaufsKurs,
  setSaleVerkaufsKurs,
  saleAnzahlAktien,
  setSaleAnzahlAktien,
  saleDatum,
  setSaleDatum,
  saleNotiz,
  setSaleNotiz,
  saleTaxMethod,
  setSaleTaxMethod,
  saleDepot,
  setSaleDepot,
  saleBesitzer,
  setSaleBesitzer,

  handleSavePurchase,
  handleAddSale,
  handlePurchaseAssetChange,
  handlePurchaseAnzahlChange,
  handlePurchaseTotalChange,
  handlePurchaseKaufKursChange,
  taxCalculationPreview,

  handleStartEditPurchase,
  handleStartEditSale,
  handleUndoSale,
  handleDeletePurchase,
  handleDeleteSale
}: CombinedJournalProps) {
  
  // Tab within the journal
  const [journalTab, setJournalTab] = useState<'combined' | 'purchases' | 'sales'>('combined');

  // Regelcoach visibility states
  const [showBuyCoach, setShowBuyCoach] = useState(false);
  const [showSellCoach, setShowSellCoach] = useState(false);

  // Sorting & Filtering state
  const [txTypeFilter, setTxTypeFilter] = useState<'all' | 'buy' | 'sell'>('all');
  const [txDepotFilter, setTxDepotFilter] = useState<string>('all');
  const [txBesitzerFilter, setTxBesitzerFilter] = useState<string>('all');
  const [txSearchQuery, setTxSearchQuery] = useState<string>('');
  const [txSortField, setTxSortField] = useState<'datum' | 'name' | 'depot' | 'besitzer' | 'volumen'>('datum');
  const [txSortAsc, setTxSortAsc] = useState<boolean>(false);

  // Sorting states for individual tables
  const [purchaseSortField, setPurchaseSortField] = useState<string>("kaufDatum");
  const [purchaseSortAsc, setPurchaseSortAsc] = useState<boolean>(false);
  const [saleSortField, setSaleSortField] = useState<string>("verkaufsDatum");
  const [saleSortAsc, setSaleSortAsc] = useState<boolean>(false);

  // Computed Combined Transactions List
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
      gedanken?: string;
      ziele?: string;
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
        gedanken: p.gedanken || "",
        ziele: p.ziele || "",
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

  // Purchases list memo (traditional list)
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
        case "anzahlAktien":
          valA = a.anzahlAktien;
          valB = b.anzahlAktien;
          break;
        case "verbleibendeAnzahlAktien":
          valA = a.verbleibendeAnzahlAktien;
          valB = b.verbleibendeAnzahlAktien;
          break;
        case "kaufKurs":
          valA = a.kaufKurs;
          valB = b.kaufKurs;
          break;
        case "tatsaechlicheKosten":
          valA = a.tatsaechlicheKosten;
          valB = b.tatsaechlicheKosten;
          break;
        case "depot":
          valA = (a.depot || "").toLowerCase();
          valB = (b.depot || "").toLowerCase();
          break;
        case "besitzerName":
          valA = (a.besitzerName || "").toLowerCase();
          valB = (b.besitzerName || "").toLowerCase();
          break;
        default:
          valA = new Date(a.kaufDatum).getTime();
          valB = new Date(b.kaufDatum).getTime();
          break;
      }

      if (valA < valB) return purchaseSortAsc ? -1 : 1;
      if (valA > valB) return purchaseSortAsc ? 1 : -1;
      return 0;
    });
  }, [portfolioPurchases, purchaseSortField, purchaseSortAsc]);

  // Sales list memo (traditional list)
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
        case "nettoGewinn":
          valA = a.nettoGewinn;
          valB = b.nettoGewinn;
          break;
        case "depot":
          valA = (a.depot || "").toLowerCase();
          valB = (b.depot || "").toLowerCase();
          break;
        case "besitzerName":
          valA = (a.besitzerName || "").toLowerCase();
          valB = (b.besitzerName || "").toLowerCase();
          break;
        default:
          valA = new Date(a.verkaufsDatum).getTime();
          valB = new Date(b.verkaufsDatum).getTime();
          break;
      }

      if (valA < valB) return saleSortAsc ? -1 : 1;
      if (valA > valB) return saleSortAsc ? 1 : -1;
      return 0;
    });
  }, [soldTrades, saleSortField, saleSortAsc]);

  // Unified Dashboard Statistics
  const totalVolume = soldTrades.reduce((sum, s) => sum + (s.verkaufsKurs * s.anzahlAktien), 0);
  const totalGross = soldTrades.reduce((sum, s) => sum + s.gewinnVerlust, 0);
  const totalKest = soldTrades.reduce((sum, s) => sum + s.kestBetrag, 0);
  const totalNet = soldTrades.reduce((sum, s) => sum + s.nettoGewinn, 0);
  const activeInvested = portfolioPurchases.reduce((sum, p) => sum + (p.kaufKurs * p.verbleibendeAnzahlAktien), 0);

  // Toggle helpers
  const handleSortCombined = (field: 'datum' | 'name' | 'depot' | 'besitzer' | 'volumen') => {
    if (txSortField === field) {
      setTxSortAsc(!txSortAsc);
    } else {
      setTxSortField(field);
      setTxSortAsc(false);
    }
  };

  const handleSortPurchasesClick = (field: string) => {
    if (purchaseSortField === field) {
      setPurchaseSortAsc(!purchaseSortAsc);
    } else {
      setPurchaseSortField(field);
      setPurchaseSortAsc(false);
    }
  };

  const handleSortSalesClick = (field: string) => {
    if (saleSortField === field) {
      setSaleSortAsc(!saleSortAsc);
    } else {
      setSaleSortField(field);
      setSaleSortAsc(false);
    }
  };

  // Bidirectional lot tracking helper for single combined view (renders sublines for sell rows)
  const renderLotsDetails = (tx: any) => {
    if (tx.type !== "sell") return null;
    
    const consumed = tx.originalItem.consumedLots;
    if (!consumed || consumed.length === 0) {
      return (
        <span className="block text-[10px] text-slate-400 font-semibold italic mt-1 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
          ⚠️ Keine Tranchen-Zuordnung (Manueller Wert)
        </span>
      );
    }

    return (
      <div className="mt-2 space-y-1 bg-slate-50 border border-slate-150 p-2.5 rounded-xl text-[10px] shadow-sm max-w-[280px]">
        <span className="block text-[8px] text-slate-500 uppercase tracking-widest font-extrabold mb-1">
          ⚙️ Steuerverbrauch (Tranchen-Herleitung)
        </span>
        {consumed.map((lot: any, idx: number) => {
          const matchingPurchase = portfolioPurchases.find(p => p.id === lot.purchaseId);
          const lotDateStr = matchingPurchase ? formatToGermanDate(matchingPurchase.kaufDatum) : "Unbekannt";
          const lotKurs = matchingPurchase ? matchingPurchase.kaufKurs : 0;
          return (
            <div key={`${tx.id}-lot-${idx}`} className="flex items-center justify-between text-slate-600 gap-1.5 border-b border-dashed border-slate-200/60 last:border-b-0 py-0.5">
              <span>• Kauf vom {lotDateStr} (@ € {formatAccounting(lotKurs)})</span>
              <span className="font-mono font-bold text-slate-900 bg-white px-1 border border-slate-150 rounded">{lot.sharesFromLot.toFixed(4)} Stk</span>
            </div>
          );
        })}
      </div>
    );
  };

  // Bidirectional lot tracking helper for single combined view (renders dynamic sublines for buy rows)
  const renderPurchaseSalesMatches = (purchaseId: string) => {
    const salesThatConsumed = soldTrades.filter(s => 
      s.consumedLots && s.consumedLots.some(lot => lot.purchaseId === purchaseId)
    );
    if (salesThatConsumed.length === 0) return null;

    return (
      <div className="mt-2 space-y-1 bg-slate-50/20 border border-slate-100/60 p-2.5 rounded-xl text-[10px] shadow-sm max-w-[280px]">
        <span className="block text-[8px] text-slate-600 uppercase tracking-widest font-extrabold mb-1">
          💸 Teilrealisierungen (Ausgangskanäle)
        </span>
        {salesThatConsumed.map((sale) => {
          const lot = sale.consumedLots!.find(l => l.purchaseId === purchaseId);
          const qtyUsed = lot ? lot.sharesFromLot : 0;
          return (
            <div key={`purchase-${purchaseId}-sale-${sale.id}`} className="flex items-center justify-between text-slate-600 gap-1.5 border-b border-dashed border-slate-100/30 last:border-b-0 py-0.5">
              <span>• Realisiert am {formatToGermanDate(sale.verkaufsDatum)} (@ € {formatAccounting(sale.verkaufsKurs)})</span>
              <span className="font-mono font-extrabold text-slate-900 bg-slate-50 px-1 border border-slate-200/50 rounded">-{qtyUsed.toFixed(4)} Stk</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div id="transaction-journal-section" className="space-y-6">
      
      {/* HEADER BAR FOR COMBINED TRANSACTION JOURNAL */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 space-y-6 shadow-md shadow-slate-200/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-50 border border-slate-100/70 rounded-xl text-slate-800">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-widest font-display flex items-center gap-2">
                🔄 Kombiniertes Transaktions-Journal
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold font-mono mt-0.5">
                Kombinierte Buchführung aller Käufe und Verkäufe mit Steuermatching &amp; Tranchenverfolgung
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
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
              className="h-9 px-3.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
            >
              <Plus className="h-4 w-4" /> {showAddPurchaseForm ? "Formular schließen" : "📥 Kauf buchen"}
            </button>

            <button
              onClick={() => {
                if (showAddSaleForm) {
                  setEditingTradeId(null);
                  setSaleAssetName("");
                  setSaleKaufKurs("");
                  setSaleVerkaufsKurs("");
                  setSaleAnzahlAktien("");
                  setSaleNotiz("");
                  setShowAddSaleForm(false);
                } else {
                  setShowAddSaleForm(true);
                  setShowAddPurchaseForm(false);
                }
              }}
              className="h-9 px-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
            >
              <Plus className="h-4 w-4" /> {showAddSaleForm ? "Formular schließen" : "💸 Verkauf buchen"}
            </button>
          </div>
        </div>

        {/* STATISTIKEN DER TRANSAKTIONEN */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 text-center bg-slate-50 border border-slate-100 p-4 rounded-2xl">
          <div className="bg-white border border-slate-100 p-3 rounded-xl col-span-2 lg:col-span-1">
            <span className="block text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-wider">
              Aktives Invest-Kollateral
            </span>
            <span className="block font-mono font-bold text-slate-800 text-xs sm:text-sm mt-0.5 tabular-nums">
              {formatAccounting(activeInvested)} €
            </span>
            <span className="text-[7.5px] text-slate-400 block font-semibold">Anschaffungswert Tranchen</span>
          </div>

          <div className="bg-white border border-slate-100 p-3 rounded-xl">
            <span className="block text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-wider">
              Realisations-Umsatz
            </span>
            <span className="block font-mono font-bold text-slate-800 text-xs sm:text-sm mt-0.5 tabular-nums">
              {formatAccounting(totalVolume)} €
            </span>
            <span className="text-[7.5px] text-slate-400 block font-semibold">Aus Verkaufs-Erlösen</span>
          </div>

          <div className="bg-white border border-slate-100 p-3 rounded-xl">
            <span className="block text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-wider">
              Brutto-Ertrag (P&amp;L)
            </span>
            <span className={`block font-mono font-bold text-xs sm:text-sm mt-0.5 tabular-nums ${totalGross >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {totalGross >= 0 ? "+" : ""}{formatAccounting(totalGross)} €
            </span>
            <span className="text-[7.5px] text-slate-400 block font-semibold">Realisierte Trades</span>
          </div>

          <div className="bg-white border border-slate-100 p-3 rounded-xl">
            <span className="block text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-wider">
              KESt-Rückbehalt (27,5%)
            </span>
            <span className="block font-mono font-bold text-rose-500 text-xs sm:text-sm mt-0.5 tabular-nums">
              -{formatAccounting(totalKest)} €
            </span>
            <span className="text-[7.5px] text-slate-400 block font-semibold">Österr. Kapitalertragsteuer</span>
          </div>

          <div className="bg-white border border-slate-100 p-3 rounded-xl">
            <span className="block text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-wider">
              Reiner Netto-Gewinn
            </span>
            <span className={`block font-mono font-bold text-xs sm:text-sm mt-0.5 tabular-nums ${totalNet >= 0 ? "text-emerald-600 font-extrabold" : "text-rose-600"}`}>
              {totalNet >= 0 ? "+" : ""}{formatAccounting(totalNet)} €
            </span>
            <span className="text-[7.5px] text-slate-400 block font-semibold">Netto nach KESt-Dämpfung</span>
          </div>
        </div>

        {/* INPUT FORMS INSERTION (FROM PARENT RENDERED IN BOUNDS) */}
        {showAddPurchaseForm && (
          <div className="bg-slate-50 border border-slate-150 p-6 rounded-2xl space-y-4 animate-fade-in text-xs">
            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
              {editingPurchaseId ? "✏️ Anschaffungseintrag ändern / bearbeiten" : "📥 Neuen realen Kauf im Journal dokumentieren"}
            </h4>

            {/* 🧠 REGELCOACH PLANUNGS-CHECK FÜR KÄUFE */}
            <div className="bg-white border-2 border-slate-900 p-4 sm:p-5 rounded-xl space-y-3 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-slate-900 text-white rounded-lg">
                    <Brain className="h-4 w-4" />
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900 text-xs sm:text-sm uppercase tracking-wider">
                      🧠 Regelcoach &amp; Psychologie-Checkpflicht vor Kauf
                    </h5>
                    <p className="text-[10px] sm:text-xs text-slate-600 font-semibold font-mono mt-0.5">
                      System-Handbuch: Vor jedem Kauf MUSS die eigene Psychologie unbestechlich validiert werden!
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBuyCoach(!showBuyCoach)}
                  className="h-9 px-4 bg-slate-900 hover:bg-black text-white rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm whitespace-nowrap ml-auto sm:ml-0 active:scale-95 flex items-center gap-1"
                >
                  {showBuyCoach ? "Coach schließen ✕" : "🤖 Coach-Chat öffnen"}
                </button>
              </div>

              {showBuyCoach && (
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-md bg-white mt-2 animate-fade-in">
                  <div className="p-3 bg-slate-50 border-b border-slate-150 flex items-center justify-between">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-900 uppercase tracking-widest flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 text-slate-900 animate-pulse" />
                      Dein Setup-Audit vor dem Einstieg (Weiß mit schwarzer Schrift)
                    </span>
                    <span className="text-[9px] sm:text-[10.5px] text-slate-500 font-extrabold font-mono">
                      Prüfe FOMO, Gier und die 2x ATR Regel live ab
                    </span>
                  </div>
                  <div className="p-2 animate-fade-in bg-white">
                    <AICoachTab routineDate={routineDate} />
                  </div>
                </div>
              )}
            </div>

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
                  className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 font-semibold text-slate-850 focus:outline-none cursor-pointer"
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
                  className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 font-semibold text-slate-850 focus:outline-none cursor-pointer"
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">🧠 Gedanken beim Kauf / Psychologisches Setup (FOMO, Gier, Emotionen)</label>
                <textarea
                  placeholder="Wie ging es dir emotional dabei? Hattest du Angst etwas zu verpassen, oder war es ein kühler rationaler Setup-Kauf?"
                  value={purchaseGedanken}
                  onChange={(e) => setPurchaseGedanken(e.target.value)}
                  className="w-full min-h-[90px] bg-white border border-slate-200 rounded-xl p-3 font-semibold text-slate-850 focus:outline-none placeholder-slate-400"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">🎯 Welche Ziele verfolgst du mit diesem Kauf?</label>
                <textarea
                  placeholder="z.B. Kursziel bei € 250, hartes Stop-Loss tief bei € 140 platziert. Zeithorizont, Plan."
                  value={purchaseZiele}
                  onChange={(e) => setPurchaseZiele(e.target.value)}
                  className="w-full min-h-[90px] bg-white border border-slate-200 rounded-xl p-3 font-semibold text-slate-850 focus:outline-none placeholder-slate-400"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setPurchaseKaufKurs("");
                  setPurchaseAnzahlAktien("");
                  setPurchaseTotalKosten("");
                  setPurchaseNotiz("");
                  setPurchaseGedanken("");
                  setPurchaseZiele("");
                  setEditingPurchaseId(null);
                  setShowAddPurchaseForm(false);
                }}
                className="h-10 px-4 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl font-bold uppercase text-[10px] tracking-wider transition-all cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleSavePurchase}
                className="h-10 px-5 bg-slate-900 hover:bg-black text-white rounded-xl font-bold uppercase text-[10px] tracking-wider transition-all flex items-center gap-1 cursor-pointer shadow-sm active:scale-95"
              >
                {editingPurchaseId ? "💾 Änderungen Speichern" : "📥 Kauf im Journal einbuchen"}
              </button>
            </div>
          </div>
        )}

        {showAddSaleForm && (
          <div className="bg-slate-50 border border-slate-150 p-6 rounded-2xl space-y-4 animate-fade-in text-xs">
            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
              {editingTradeId ? "✏️ Realisierten Trade ändern / bearbeiten" : "💸 Vorfall / Realisierten Trade hinzufügen"}
            </h4>

            {/* 🧠 REGELCOACH PLANUNGS-CHECK FÜR VERKÄUFE */}
            <div className="bg-white border-2 border-slate-900 p-4 sm:p-5 rounded-xl space-y-3 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-slate-900 text-white rounded-lg">
                    <Brain className="h-4 w-4" />
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900 text-xs sm:text-sm uppercase tracking-wider">
                      🧠 Regelcoach &amp; Psychologie-Checkpflicht vor Verkauf
                    </h5>
                    <p className="text-[10px] sm:text-xs text-slate-600 font-semibold font-mono mt-0.5">
                      System-Handbuch: Vor jedem Verkauf MUSS die eigene Psychologie unbestechlich validiert werden!
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSellCoach(!showSellCoach)}
                  className="h-9 px-4 bg-slate-900 hover:bg-black text-white rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm whitespace-nowrap ml-auto sm:ml-0 active:scale-95 flex items-center gap-1"
                >
                  {showSellCoach ? "Coach schließen ✕" : "🤖 Coach-Chat öffnen"}
                </button>
              </div>

              {showSellCoach && (
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-md bg-white mt-2 animate-fade-in">
                  <div className="p-3 bg-slate-50 border-b border-slate-150 flex items-center justify-between">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-900 uppercase tracking-widest flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 text-slate-900 animate-pulse" />
                      Dein Setup-Audit vor dem Verkauf (Weiß mit schwarzer Schrift)
                    </span>
                    <span className="text-[9px] sm:text-[10.5px] text-slate-500 font-extrabold font-mono">
                      Analysiere Verlustaversion, Panikreaktion und die 2x ATR Absicherung live ab
                    </span>
                  </div>
                  <div className="p-2 animate-fade-in bg-white">
                    <AICoachTab routineDate={routineDate} />
                  </div>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Wertpapier / Bezeichnung *</label>
                <input
                  type="text"
                  required
                  placeholder="z.B. ServiceNow (NOW) oder TSLA..."
                  value={saleAssetName}
                  onChange={(e) => setSaleAssetName(e.target.value)}
                  className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 font-semibold text-slate-850 focus:outline-none"
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
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Kaufkurs / Anschaffung € (Ø/FIFO)*</label>
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

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Depot / Broker (Für Zuordnung) *</label>
                <select
                  required
                  value={saleDepot}
                  onChange={(e) => setSaleDepot(e.target.value)}
                  className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 font-semibold text-slate-850 focus:outline-none cursor-pointer"
                >
                  <option value="" disabled>-- Depot auswählen --</option>
                  {customDepots.map(d => (
                    <option key={`opt-s-dep-${d}`} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Besitzer Name (Für Zuordnung) *</label>
                <select
                  required
                  value={saleBesitzer}
                  onChange={(e) => setSaleBesitzer(e.target.value)}
                  className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 font-semibold text-slate-850 focus:outline-none cursor-pointer"
                >
                  <option value="" disabled>-- Besitzer auswählen --</option>
                  {customBesitzer.map(b => (
                    <option key={`opt-s-own-${b}`} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Steuermethode Auswahl - FIFO oder Durchschnitt */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
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
                  <div className="bg-amber-500/10 border-l-4 border-amber-500 p-3 rounded text-[11px] text-amber-850 font-semibold">
                    ⚠️ {taxCalculationPreview.warning}
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center pt-1 font-mono">
                  <div className="bg-white p-2 rounded border border-slate-200 text-[10px]">
                    <span className="block text-[8px] text-slate-450 uppercase">Effektiver Einstand</span>
                    <span className="block font-bold text-slate-800 mt-0.5">
                      € {formatAccounting(taxCalculationPreview.kaufKursUsed || 0)}
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200 text-[10px]">
                    <span className="block text-[8px] text-slate-450 uppercase">Ertrag Brutto</span>
                    <span className={`block font-bold mt-0.5 ${(taxCalculationPreview.gewinnVerlust || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      € {formatAccounting(taxCalculationPreview.gewinnVerlust || 0)}
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200 text-[10px]">
                    <span className="block text-[8px] text-slate-450 uppercase">KESt-Belastung (27,5%)</span>
                    <span className="block font-bold text-rose-500 mt-0.5">
                      -€ {formatAccounting(taxCalculationPreview.kestBetrag || 0)}
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200 text-[10px]">
                    <span className="block text-[8px] text-slate-450 uppercase">Reales Netto-Ergebnis</span>
                    <span className={`block font-bold mt-0.5 ${(taxCalculationPreview.nettoGewinn || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      € {formatAccounting(taxCalculationPreview.nettoGewinn || 0)}
                    </span>
                  </div>
                </div>

                {/* Lots details */}
                {taxCalculationPreview.lotsToConsume && taxCalculationPreview.lotsToConsume.length > 0 && (
                  <div className="text-[10px] space-y-1 bg-white p-2.5 rounded border border-slate-200 pt-2 shadow-xs">
                    <span className="block text-[8px] text-slate-400 uppercase font-bold tracking-wider mb-1">
                      Verbrauchte Anschaffungstranchen (Lots):
                    </span>
                    {taxCalculationPreview.lotsToConsume.map((lot, idx) => (
                      <div key={`prev-lot-${idx}`} className="flex justify-between items-center text-slate-600 font-medium py-0.5 border-b border-slate-50 last:border-0">
                        <span>• Lot-Erwerb vom {formatToGermanDate(lot.date)} (@ € {formatAccounting(lot.kaufKurs)})</span>
                        <span className="font-bold font-mono text-slate-800">{lot.sharesFromLot.toFixed(4)} Stk.</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Ausstieg Notiz / Bemerkung</label>
              <textarea
                placeholder="z.B. Gewinnmitnahme, Stop-Loss getriggert..."
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
                  setSaleTaxMethod("durchschnitt");
                  setEditingTradeId(null);
                  setShowAddSaleForm(false);
                }}
                className="h-10 px-4 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl font-bold uppercase text-[10px] tracking-wider transition-all cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleAddSale}
                className="h-10 px-5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold uppercase text-[10px] tracking-wider transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-sm"
              >
                {editingTradeId ? "💾 Änderungen Speichern" : "💸 Trade im Journal einbuchen"}
              </button>
            </div>
          </div>
        )}

        {/* INTERACTIVE FILTERS FOR TRANSACTIONS */}
        <div className="bg-slate-50 border border-slate-100 h-auto p-4 rounded-2xl flex flex-col md:flex-row flex-wrap items-center gap-4 text-xs font-semibold text-slate-705">
          
          <div className="flex flex-col w-full md:w-auto">
            <label className="text-[9px] font-bold text-slate-400 uppercase mb-1">Suchen</label>
            <input
              type="text"
              placeholder="Wertpapier, Notiz..."
              value={txSearchQuery}
              onChange={(e) => setTxSearchQuery(e.target.value)}
              className="h-9 px-3 bg-white border border-slate-200 rounded-xl focus:outline-none w-full md:w-[180px] font-medium text-slate-800"
            />
          </div>

          <div className="flex flex-col w-full md:w-auto">
            <label className="text-[9px] font-bold text-slate-400 uppercase mb-1">Depot</label>
            <select
              value={txDepotFilter}
              onChange={(e) => setTxDepotFilter(e.target.value)}
              className="h-9 bg-white border border-slate-200 rounded-xl px-2 cursor-pointer font-medium text-slate-800 w-full md:w-[130px]"
            >
              <option value="all">Alle Depots</option>
              {customDepots.map(d => (
                <option key={`filter-d-${d}`} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col w-full md:w-auto">
            <label className="text-[9px] font-bold text-slate-400 uppercase mb-1">Besitzer</label>
            <select
              value={txBesitzerFilter}
              onChange={(e) => setTxBesitzerFilter(e.target.value)}
              className="h-9 bg-white border border-slate-200 rounded-xl px-2 cursor-pointer font-medium text-slate-800 w-full md:w-[130px]"
            >
              <option value="all">Alle Besitzer</option>
              {customBesitzer.map(b => (
                <option key={`filter-b-${b}`} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {journalTab === 'combined' && (
            <div className="flex flex-col w-full md:w-auto">
              <label className="text-[9px] font-bold text-slate-400 uppercase mb-1">Transaktionstyp</label>
              <div className="flex bg-white border border-slate-200 p-0.5 rounded-xl h-9">
                <button
                  type="button"
                  onClick={() => setTxTypeFilter('all')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${txTypeFilter === 'all' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-400 hover:text-slate-700'}`}
                >
                  Alle
                </button>
                <button
                  type="button"
                  onClick={() => setTxTypeFilter('buy')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${txTypeFilter === 'buy' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-slate-700'}`}
                >
                  📥 Käufe
                </button>
                <button
                  type="button"
                  onClick={() => setTxTypeFilter('sell')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${txTypeFilter === 'sell' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-700'}`}
                >
                  💸 Verkäufe
                </button>
              </div>
            </div>
          )}

          {/* Reset Filters Option */}
          {(txSearchQuery || txDepotFilter !== 'all' || txBesitzerFilter !== 'all' || (journalTab === 'combined' && txTypeFilter !== 'all')) && (
            <button
              onClick={() => {
                setTxSearchQuery('');
                setTxDepotFilter('all');
                setTxBesitzerFilter('all');
                setTxTypeFilter('all');
              }}
              className="text-[10px] text-slate-400 font-bold hover:text-rose-600 mt-auto mb-2 underline cursor-pointer"
            >
              Filter zurücksetzen
            </button>
          )}
        </div>

        {/* JOURNAL TAB PILOTS */}
        <div className="border-b border-slate-200">
          <nav className="flex gap-4 sm:gap-6 -mb-px">
            <button
              onClick={() => setJournalTab('combined')}
              className={`pb-4 text-xs sm:text-sm font-bold uppercase tracking-wider relative transition-all cursor-pointer ${
                journalTab === 'combined'
                  ? 'text-slate-800 border-b-2 border-slate-800'
                  : 'text-slate-400 hover:text-slate-600 border-b-2 border-transparent'
              }`}
            >
              🔄 Kombiniertes Steuermatching (Trade-Auflösung)
            </button>
            <button
              onClick={() => setJournalTab('purchases')}
              className={`pb-4 text-xs sm:text-sm font-bold uppercase tracking-wider relative transition-all cursor-pointer ${
                journalTab === 'purchases'
                  ? 'text-slate-800 border-b-2 border-slate-800'
                  : 'text-slate-400 hover:text-slate-600 border-b-2 border-transparent'
              }`}
            >
              📥 Nur Käufe (Anschaffungs-Journal)
            </button>
            <button
              onClick={() => setJournalTab('sales')}
              className={`pb-4 text-xs sm:text-sm font-bold uppercase tracking-wider relative transition-all cursor-pointer ${
                journalTab === 'sales'
                  ? 'text-slate-800 border-b-2 border-slate-800'
                  : 'text-slate-400 hover:text-slate-600 border-b-2 border-transparent'
              }`}
            >
              💸 Nur Verkäufe (Realisierungen)
            </button>
          </nav>
        </div>

        {/* TAB CONTENTS */}
        
        {/* TAB 1: COMBINED SYSTEM */}
        {journalTab === 'combined' && (
          <div className="overflow-x-auto pt-1 h-auto text-xs sm:text-sm">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">
              🔄 Kombinierte Chronologie des Steuer-Portfolios
            </h4>
            <table className="w-full text-left border-collapse text-xs sm:text-sm" style={{ minWidth: "950px" }}>
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold text-[10px] uppercase tracking-widest select-none">
                  <th onClick={() => handleSortCombined('datum')} className="pb-3 cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-1">
                      <span>Datum / Typ</span>
                      <span className="text-[8px] text-slate-400">{txSortField === 'datum' ? (txSortAsc ? '▲' : '▼') : '↕'}</span>
                    </div>
                  </th>
                  <th onClick={() => handleSortCombined('name')} className="pb-3 cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-1">
                      <span>Wertpapier / Asset</span>
                      <span className="text-[8px] text-slate-400">{txSortField === 'name' ? (txSortAsc ? '▲' : '▼') : '↕'}</span>
                    </div>
                  </th>
                  <th onClick={() => handleSortCombined('depot')} className="pb-3 cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-1">
                      <span>Depot &amp; Besitzer</span>
                      <span className="text-[8px] text-slate-400">{txSortField === 'depot' ? (txSortAsc ? '▲' : '▼') : '↕'}</span>
                    </div>
                  </th>
                  <th className="pb-3 text-right">Stückzahl</th>
                  <th className="pb-3 text-right">Einstand / Kurs</th>
                  <th onClick={() => handleSortCombined('volumen')} className="pb-3 text-right cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-1 justify-end">
                      <span>Volumen / Wert</span>
                      <span className="text-[8px] text-slate-400">{txSortField === 'volumen' ? (txSortAsc ? '▲' : '▼') : '↕'}</span>
                    </div>
                  </th>
                  <th className="pb-3 pl-8 text-left w-[300px]">Steuer-Heuristik &amp; Tranchenergebnis</th>
                  <th className="pb-3 text-center">Aktion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {combinedTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 font-semibold font-sans">
                      Keine Transaktionen gefunden, die dem Filter entsprechen.
                    </td>
                  </tr>
                ) : (
                  combinedTransactions.map((tx) => {
                    const isBuy = tx.type === 'buy';
                    const isProfit = !isBuy && (tx.gewinnVerlust || 0) >= 0;
                    
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/40 transition-colors border-b border-slate-50">
                        <td className="py-4">
                          <span className="block font-semibold text-slate-400 font-mono text-[9px] uppercase whitespace-nowrap">
                            🗓️ {formatToGermanDate(tx.datum)}
                          </span>
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase mt-1 ${
                            isBuy 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100/50' 
                              : 'bg-rose-50 text-rose-700 border border-rose-100/50'
                          }`}>
                            {isBuy ? '📥 KAUF' : '💸 VERKAUF'}
                          </span>
                        </td>
                        <td className="py-4">
                          <span className="block font-bold text-slate-900 text-sm sm:text-base">{tx.name}</span>
                          <span className="inline-block px-1.5 py-0.5 font-mono text-[9px] font-extrabold text-slate-900 bg-slate-50 border border-slate-100/40 rounded uppercase mt-1">
                            {String(tx.key).toUpperCase()}
                          </span>
                          {tx.notiz && (
                            <p className="text-[10px] text-slate-500 font-medium italic mt-2 max-w-[200px] whitespace-normal leading-tight border-l-2 border-slate-200 pl-2">
                              <b>Notiz:</b> " {tx.notiz} "
                            </p>
                          )}
                          {tx.gedanken && (
                            <p className="text-[10px] text-slate-600 font-medium italic mt-1.5 max-w-[200px] whitespace-normal leading-tight border-l-2 border-emerald-500 pl-2">
                              <b>Gedanken:</b> " {tx.gedanken} "
                            </p>
                          )}
                          {tx.ziele && (
                            <p className="text-[10px] text-slate-700 font-medium italic mt-1.5 max-w-[200px] whitespace-normal leading-tight border-l-2 border-slate-600 pl-2">
                              <b>Ziele:</b> " {tx.ziele} "
                            </p>
                          )}
                        </td>
                        <td className="py-4">
                          <span className="block px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[9.5px] font-bold border border-slate-200 max-w-max whitespace-nowrap">
                            🏢 {tx.depot}
                          </span>
                          <span className="block px-2 py-0.5 rounded bg-slate-50 text-slate-900 font-mono text-[9.5px] font-bold border border-slate-100 max-w-max mt-1 whitespace-nowrap">
                            👤 {tx.besitzerName}
                          </span>
                        </td>
                        <td className="py-4 text-right font-mono tabular-nums">
                          <span className={isBuy ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>
                            {isBuy ? "+" : "-"}{tx.anzahlAktien} Stk.
                          </span>
                        </td>
                        <td className="py-4 text-right font-mono tabular-nums text-slate-600">
                          € {formatAccounting(tx.kaufKurs || tx.verkaufsKurs || 0)}
                        </td>
                        <td className="py-4 text-right font-mono tabular-nums font-bold text-slate-800">
                          € {formatAccounting(tx.volumen)}
                        </td>
                        <td className="py-4 pl-8 text-left max-w-[300px]">
                          {isBuy ? (
                            <div>
                              <div className="flex items-center gap-1.5 font-sans font-semibold">
                                <span className={`px-1.5 py-0.5 rounded font-mono text-[8.5px] font-extrabold ${
                                  tx.verbleibendeAnzahlAktien === tx.anzahlAktien 
                                    ? 'bg-emerald-50 text-emerald-700' 
                                    : tx.verbleibendeAnzahlAktien === 0 
                                      ? 'bg-slate-100 text-slate-400 italic' 
                                      : 'bg-amber-50 text-amber-700 border-amber-200/50 border'
                                }`}>
                                  {tx.verbleibendeAnzahlAktien === tx.anzahlAktien 
                                    ? '🟢 Aktiv' 
                                    : tx.verbleibendeAnzahlAktien === 0 
                                      ? '⚪ Aufgebraucht' 
                                      : '🟡 Angeschnitten'}
                                </span>
                                <span className="text-[11px] font-mono text-slate-700">
                                  {tx.verbleibendeAnzahlAktien?.toFixed(4)} verbleibend
                                </span>
                              </div>
                              
                              {/* Remaining bar */}
                              <div className="w-40 bg-slate-100 h-1 rounded-full mt-1.5 overflow-hidden">
                                <div 
                                  className="bg-emerald-500 h-full rounded-full transition-all"
                                  style={{ width: `${((tx.verbleibendeAnzahlAktien || 0) / tx.anzahlAktien) * 100}%` }}
                                />
                              </div>

                              {/* Bidirectional matching details */}
                              {renderPurchaseSalesMatches(tx.rawId)}
                            </div>
                          ) : (
                            <div className="space-y-1">
                              {/* taxMethod badge */}
                              <div className="flex items-center gap-1.5 font-bold">
                                <span className={`px-1.5 py-0.5 rounded-md font-mono text-[8px] tracking-wide border ${
                                  tx.taxMethod === 'FIFO'
                                    ? 'bg-amber-100/40 text-amber-800 border-amber-200/40'
                                    : 'bg-slate-50 text-slate-900 border border-slate-200'
                                }`}>
                                  {tx.taxMethod === 'FIFO' ? '⚖️ FIFO' : '📊 Gleitender Ø'}
                                </span>
                                <span className={isProfit ? "text-emerald-600" : "text-rose-600"}>
                                  Ergebnis: {isProfit ? "+" : ""}{formatAccounting(tx.gewinnVerlust || 0)} €
                                </span>
                              </div>

                              {/* Details: Gross, tax, net */}
                              <div className="text-[10px] text-slate-500 font-medium">
                                <span className="block">KESt (27,5%): € {formatAccounting(tx.kestBetrag || 0)}</span>
                                <span className={`block font-semibold ${isProfit ? "text-emerald-700" : "text-rose-700"}`}>
                                  Netto: € {formatAccounting(tx.nettoGewinn || 0)}
                                </span>
                              </div>

                              {/* Consumed Purchases list */}
                              {renderLotsDetails(tx)}
                            </div>
                          )}
                        </td>
                        <td className="py-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {isBuy ? (
                              <>
                                <button
                                  onClick={() => handleStartEditPurchase(tx.originalItem)}
                                  className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-800 transition-colors cursor-pointer"
                                  title="Kauf bearbeiten"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm(`Möchtest du diesen Kauf von ${tx.name} für € ${formatAccounting(tx.volumen)} wirklich unwiderruflich löschen?`)) {
                                      handleDeletePurchase(tx.rawId);
                                    }
                                  }}
                                  className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                  title="Kauf löschen"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleStartEditSale(tx.originalItem)}
                                  className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-800 transition-colors cursor-pointer"
                                  title="Verkauf bearbeiten"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleUndoSale(tx.originalItem)}
                                  className="p-1.5 hover:bg-amber-50/70 rounded-lg text-slate-400 hover:text-amber-600 transition-colors cursor-pointer"
                                  title="Verkauf rückgängig machen (Vollständig stornieren & Depot-Bestände wiederherstellen)"
                                >
                                  <RotateCcw className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm(`Möchtest du diesen Verkaufseintrag für ${tx.name} wirklich unwiderruflich aus der Historie löschen?`)) {
                                      handleDeleteSale(tx.rawId);
                                    }
                                  }}
                                  className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                  title="Verkauf löschen"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: INDIVIDUAL PURCHASES (ORIGINAL) */}
        {journalTab === 'purchases' && (
          <div className="overflow-x-auto pt-1 text-xs sm:text-sm">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">
              📥 Anschaffungs-Journal (Einzahlungen/Tranchen)
            </h4>
            <table className="w-full text-left border-collapse text-xs sm:text-sm" style={{ minWidth: "950px" }}>
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold text-[10px] uppercase tracking-widest select-none">
                  <th onClick={() => handleSortPurchasesClick("kaufDatum")} className="pb-3 cursor-pointer hover:bg-slate-100 transition-colors col-span-2">
                    <div className="flex items-center gap-1">
                      <span>Datum / Asset</span>
                      <span className="text-[8px] text-slate-400">{purchaseSortField === "kaufDatum" ? (purchaseSortAsc ? "▲" : "▼") : "↕"}</span>
                    </div>
                  </th>
                  <th onClick={() => handleSortPurchasesClick("depot")} className="pb-3 cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-1">
                      <span>Depot</span>
                      <span className="text-[8px] text-slate-400">{purchaseSortField === "depot" ? (purchaseSortAsc ? "▲" : "▼") : "↕"}</span>
                    </div>
                  </th>
                  <th onClick={() => handleSortPurchasesClick("besitzerName")} className="pb-3 cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-1">
                      <span>Besitzer</span>
                      <span className="text-[8px] text-slate-400">{purchaseSortField === "besitzerName" ? (purchaseSortAsc ? "▲" : "▼") : "↕"}</span>
                    </div>
                  </th>
                  <th onClick={() => handleSortPurchasesClick("anzahlAktien")} className="pb-3 text-right cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-1 justify-end">
                      <span>Kauf-Menge</span>
                      <span className="text-[8px] text-slate-400">{purchaseSortField === "anzahlAktien" ? (purchaseSortAsc ? "▲" : "▼") : "↕"}</span>
                    </div>
                  </th>
                  <th onClick={() => handleSortPurchasesClick("verbleibendeAnzahlAktien")} className="pb-3 text-right cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-1 justify-end">
                      <span>Verbleibende Stk. (Aktiv)</span>
                      <span className="text-[8px] text-slate-400">{purchaseSortField === "verbleibendeAnzahlAktien" ? (purchaseSortAsc ? "▲" : "▼") : "↕"}</span>
                    </div>
                  </th>
                  <th onClick={() => handleSortPurchasesClick("kaufKurs")} className="pb-3 text-right cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-1 justify-end">
                      <span>Kaufkurs</span>
                      <span className="text-[8px] text-slate-400">{purchaseSortField === "kaufKurs" ? (purchaseSortAsc ? "▲" : "▼") : "↕"}</span>
                    </div>
                  </th>
                  <th onClick={() => handleSortPurchasesClick("tatsaechlicheKosten")} className="pb-3 text-right cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-1 justify-end">
                      <span>Anschaffungswert</span>
                      <span className="text-[8px] text-slate-400">{purchaseSortField === "tatsaechlicheKosten" ? (purchaseSortAsc ? "▲" : "▼") : "↕"}</span>
                    </div>
                  </th>
                  <th className="pb-3 text-center">Aktion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
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
                              <b>Notiz:</b> " {purchase.notiz} "
                            </p>
                          )}
                          {purchase.gedanken && (
                            <p className="text-[10px] text-slate-600 font-medium italic mt-1.5 max-w-[245px] whitespace-normal leading-tight border-l-2 border-emerald-500 pl-2">
                              <b>Gedanken:</b> " {purchase.gedanken} "
                            </p>
                          )}
                          {purchase.ziele && (
                            <p className="text-[10px] text-slate-700 font-medium italic mt-1.5 max-w-[245px] whitespace-normal leading-tight border-l-2 border-slate-600 pl-2">
                              <b>Ziele:</b> " {purchase.ziele} "
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
        )}

        {/* TAB 3: INDIVIDUAL SALES (ORIGINAL) */}
        {journalTab === 'sales' && (
          <div className="overflow-x-auto pt-1 text-xs sm:text-sm">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">
              📈 Trade-Historie (Realisierte Verkäufe)
            </h4>
            <table className="w-full text-left border-collapse text-xs sm:text-sm" style={{ minWidth: "950px" }}>
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold text-[10px] uppercase tracking-widest select-none">
                  <th onClick={() => handleSortSalesClick("verkaufsDatum")} className="pb-3 cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-1">
                      <span>Datum / Asset</span>
                      <span className="text-[8px] text-slate-400">{saleSortField === "verkaufsDatum" ? (saleSortAsc ? "▲" : "▼") : "↕"}</span>
                    </div>
                  </th>
                  <th onClick={() => handleSortSalesClick("depot")} className="pb-3 cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-1">
                      <span>Depot</span>
                      <span className="text-[8px] text-slate-400">{saleSortField === "depot" ? (saleSortAsc ? "▲" : "▼") : "↕"}</span>
                    </div>
                  </th>
                  <th onClick={() => handleSortSalesClick("besitzerName")} className="pb-3 cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-1">
                      <span>Besitzer</span>
                      <span className="text-[8px] text-slate-400">{saleSortField === "besitzerName" ? (saleSortAsc ? "▲" : "▼") : "↕"}</span>
                    </div>
                  </th>
                  <th onClick={() => handleSortSalesClick("anzahlAktien")} className="pb-3 text-right cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-1 justify-end">
                      <span>Verkauft</span>
                      <span className="text-[8px] text-slate-400">{saleSortField === "anzahlAktien" ? (saleSortAsc ? "▲" : "▼") : "↕"}</span>
                    </div>
                  </th>
                  <th onClick={() => handleSortSalesClick("kaufKurs")} className="pb-3 text-right cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-1 justify-end">
                      <span>Einstandkurs</span>
                      <span className="text-[8px] text-slate-400">{saleSortField === "kaufKurs" ? (saleSortAsc ? "▲" : "▼") : "↕"}</span>
                    </div>
                  </th>
                  <th onClick={() => handleSortSalesClick("verkaufsKurs")} className="pb-3 text-right cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-1 justify-end">
                      <span>Verkaufskurs</span>
                      <span className="text-[8px] text-slate-400">{saleSortField === "verkaufsKurs" ? (saleSortAsc ? "▲" : "▼") : "↕"}</span>
                    </div>
                  </th>
                  <th className="pb-3 text-right">Erlös-Volumen</th>
                  <th onClick={() => handleSortSalesClick("gewinnVerlust")} className="pb-3 text-right cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-1 justify-end">
                      <span>Ertrag (Brutto)</span>
                      <span className="text-[8px] text-slate-400">{saleSortField === "gewinnVerlust" ? (saleSortAsc ? "▲" : "▼") : "↕"}</span>
                    </div>
                  </th>
                  <th className="pb-3 text-right text-rose-500">KESt (27.5%)</th>
                  <th onClick={() => handleSortSalesClick("nettoGewinn")} className="pb-3 text-right cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-1 justify-end">
                      <span>Netto-Ertrag (P&amp;L)</span>
                      <span className="text-[8px] text-slate-400">{saleSortField === "nettoGewinn" ? (saleSortAsc ? "▲" : "▼") : "↕"}</span>
                    </div>
                  </th>
                  <th className="pb-3 text-center">Aktion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {sortedSales.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-slate-400 font-semibold font-sans">
                      Es sind noch keine geschlossenen Verkäufe dokumentiert.
                    </td>
                  </tr>
                ) : (
                  sortedSales.map((trade) => {
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
                        <td className="py-4 text-right font-mono tabular-nums text-slate-450">€ {formatAccounting(trade.kaufKurs)}</td>
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
                          <span className={trade.nettoGewinn >= 0 ? "text-emerald-600 animate-pulse font-extrabold" : "text-rose-600"}>
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
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}
