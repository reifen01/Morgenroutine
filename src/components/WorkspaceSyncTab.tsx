/**
 * WORKSPACE & DATENSICHERUNG
 * --------------------------
 * Schlanke Fassung: Die Google-Workspace-Integration (OAuth, Sheets,
 * Docs, Drive-Backups, GCP-Anleitung) wurde entfernt. Datensicherung
 * läuft über das verschlüsselte PIN-Backup (AES-256, komplett im
 * Browser) und den CSV-Export; der Quellcode lebt auf GitHub.
 */
import { Smartphone, QrCode, Copy } from "lucide-react";
import {
  MarketState, LivePrices, PortfolioItem, ChecklistItem,
  SoldTradeItem, PortfolioPurchase,
} from "../types";

interface WorkspaceSyncTabProps {
  marketState: MarketState;
  onMarketStateChange: (state: MarketState) => void;
  livePrices: LivePrices;
  onLivePricesChange: (prices: LivePrices) => void;
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
  routineDate: string;
  onShowToast: (title: string, msg: string, type: "success" | "warning" | "error") => void;
  onOpenBackupSetup?: () => void;
  onOpenBackupRestore?: () => void;
  onLoadDemoData?: () => void;
  onResetAllData?: () => void;
}

export default function WorkspaceSyncTab({
  onShowToast,
  onOpenBackupSetup,
  onOpenBackupRestore,
  onLoadDemoData,
  onResetAllData,
}: WorkspaceSyncTabProps) {


  const handleCopyAppLink = () => {
    navigator.clipboard.writeText(window.location.origin).then(() => {
      onShowToast("Link kopiert", "📋 App-Link in der Zwischenablage.", "success");
    }).catch(() => {
      onShowToast("Kopier-Fehler", "Bitte Link manuell markieren und kopieren.", "error");
    });
  };

  return (
    <div className="animate-fadeIn max-w-3xl mx-auto">

      {/* Kopfbereich */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">Workspace &amp; Datensicherung</h2>
        <p className="text-xs text-slate-500 font-medium">
          Verschlüsselte Backups, CSV-Export und mobiler Schnellzugriff — alles lokal, ohne Cloud-Anmeldung.
        </p>
      </div>

      {/* 🔒 PIN-Backup — verschlüsselte Datei */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm mb-6">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 bg-slate-900 text-white rounded-xl flex items-center justify-center shrink-0">
            🔒
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-1">
              PIN-Backup deiner Aktien-Liste
            </h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Speichert Portfolio, Watchlist, Käufe und Verkäufe verschlüsselt in einer JSON-Datei.
              Lädt sich auf jedem Gerät mit dem gleichen PIN/Passwort wieder ein.
              Die App selbst sieht deinen PIN nie — Verschlüsselung läuft komplett im Browser.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onOpenBackupSetup}
                disabled={!onOpenBackupSetup}
                className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors active:scale-[0.98] disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                💾 Backup-Datei erstellen
              </button>
              <button
                type="button"
                onClick={onOpenBackupRestore}
                disabled={!onOpenBackupRestore}
                className="flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-900 text-sm font-semibold px-4 py-2.5 rounded-xl border border-slate-300 transition-colors active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                🔑 Backup-Datei laden
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 📱 Mobiler Schnellzugriff */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm mb-6">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center text-slate-800 shrink-0">
            <Smartphone className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-1">
              📱 Mobiler Schnellzugriff &amp; iPhone Home-Bildschirm
            </h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              App-Link in Safari öffnen → <strong>Teilen-Symbol 📤</strong> →
              <strong> „Zum Home-Bildschirm" ➕</strong> → <strong>Hinzufügen</strong>.
              Danach startet die App wie eine native App mit eigenem Icon.
            </p>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                readOnly
                value={window.location.origin}
                className="flex-1 h-10 bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-mono text-slate-800 outline-none select-all"
              />
              <button
                onClick={handleCopyAppLink}
                className="h-10 px-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl transition-colors active:scale-95"
                title="App-Link kopieren"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-white p-2 rounded-2xl border border-slate-200/60 shadow-sm shrink-0">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&color=25-28-36&data=${encodeURIComponent(window.location.origin)}`}
                  alt="App QR-Code"
                  className="h-24 w-24 select-none"
                  referrerPolicy="no-referrer"
                />
              </div>
              <p className="text-[10px] text-slate-400 font-semibold leading-normal flex items-start gap-1.5">
                <QrCode className="h-3.5 w-3.5 text-slate-500 shrink-0 mt-0.5" />
                Diesen Code mit der iPhone-Kamera scannen, um die App direkt zu öffnen.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 🎯 Demo-Daten */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm mb-6">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl flex items-center justify-center shrink-0">
            🎯
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-1">
              Demo-Daten laden
            </h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Befüllt die App mit einem klar markierten Mini-Portfolio (TSLA + BTC, je 1 Demo-Kauf,
              AAPL/NVDA in der Watchlist, ein Demo-Depot). Damit kannst du jede Funktion ausprobieren,
              ohne eigene Werte eintragen zu müssen. Bestehende Daten werden nach Rückfrage überschrieben.
            </p>
            <button
              type="button"
              onClick={onLoadDemoData}
              disabled={!onLoadDemoData}
              className="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors active:scale-[0.98] disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              🎯 Demo-Portfolio aktivieren
            </button>
          </div>
        </div>
      </div>

      {/* 🧹 Alle Daten zurücksetzen */}
      <div className="bg-white border border-rose-200 rounded-3xl p-6 shadow-sm mb-6">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl flex items-center justify-center shrink-0">
            🧹
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-1">
              Alle Daten zurücksetzen
            </h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Löscht das gesamte lokale localStorage: Portfolio, Watchlist, Käufe, Verkäufe,
              Checkliste, Depot-Stammdaten, Live-Preise, Markt-Werte. Danach steht die App so da
              wie bei einem frisch installierten Browser. <strong>Sichere vorher ein Backup</strong>,
              falls du die Daten später wiederherstellen willst — diese Aktion ist endgültig.
            </p>
            <button
              type="button"
              onClick={onResetAllData}
              disabled={!onResetAllData}
              className="inline-flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors active:scale-[0.98] disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              🧹 Alles löschen
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
