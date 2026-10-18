# Feature Map

_Mapped by `/map` on 2026-10-18 at commit `296d310`. Vorschlag aus `architecture.md` abgeleitet — bestätigt wird er in `/init`._

Grundlage: die 12 Server-Zeilen (10 API-Routen, SPA-Fallback, Vite-Middleware), 19 Client-Screens, 29 Entitäten und 24 Server-/Client-Funktionen aus `docs/codebase/architecture.md`. Jedes davon ist genau einem Feature zugeordnet oder steht unter „Unassigned". Ebene überall `app` (eine Laufzeit, `.ai-eng-kit` → `layers: []`).

## Vorgeschlagene Features

### MR-1 · Marktdaten abrufen
**Was es tut:** Holt die Tageswerte (VIX, VXV, VVIX, SPX, WTI, Gas) und die Kurse mit ATR für Portfolio und Watchlist — per Live-Abruf, Screenshot-OCR oder TradingView-Text-Import — und hält sie lokal vor.
- **Routen:** `POST /api/fetch-live-prices`, `POST /api/parse-screenshot`
- **Screens:** Tab „Morgenroutine" (`src/components/MorgenroutineTab.tsx`; Eingabe-Center Zeilen 142–760)
- **Entitäten:** `morgenroutine_market_state`, `morgenroutine_live_prices`, `morgenroutine_prices_cache`, `morgenroutine_prices_last_updated`, `morgenroutine_last_live_fetch`, Server-Caches (`livePriceCache`; die Zeile deckt auch `searchCache` → MR-4 und `cachedDistDays` → MR-2 ab)
- **Funktionen:** `yahooFetch`, `computeATRFromBars`, `fetchStooqDaily`, `yahooCandidatesForPortfolio` / `yahooCandidatesForWatchlist` / `MARKET_SYMBOLS`
- **Ebene:** app · **AC-Schätzung:** 11 (je Quelle Erfolg/Fehler, Fallback-Kette Yahoo→Stooq, Plausibilitätsgrenzen, Cache 60 s, SPX-Surrogat, Timeout)
- **Reihenfolge:** 1 — Kern des Produkts; jede andere Fachfunktion liest diese Werte.

### MR-2 · Distribution Days
**Was es tut:** Zählt die Verteilungstage der letzten 25 Handelstage für SPX und NDX und liefert sie mit Begründung ans Cockpit.
- **Routen:** `POST /api/calculate-distribution-days`
- **Screens:** — (Anzeige im Tab „Morgenroutine", Zeilen 1225–1266; der Screen gehört MR-1)
- **Entitäten:** `cachedDistDays` (Teil der Server-Cache-Zeile, siehe MR-1)
- **Funktionen:** `fetchYahooData`, `calculateDistributionDays`
- **Ebene:** app · **AC-Schätzung:** 6 (Berechnung −0,2 %-Schwelle, Tages-Cache, Gemini-Fallback mit/ohne Grounding, feste Schätzwerte, 429-Cooldown)
- **Reihenfolge:** 3 — eigener Datenpfad mit eigener Fallback-Kette; speist MR-3.

### MR-3 · Regime-Ampel & Tagesjournal
**Was es tut:** Leitet aus den Marktwerten den Status GREEN/RED ab, zeigt „System bereit", schreibt pro Tag einen Snapshot und erzeugt die CSV-Zeile fürs Tagesjournal; überwacht Limits und Nachkäufe.
- **Routen:** —
- **Screens:** — (Regime-Logik im Tab „Morgenroutine" Zeilen 329–333 und 1275–1299 sowie `src/App.tsx` 466–495, 538–542)
- **Entitäten:** `morgenroutine_daily_history`
- **Funktionen:** — (`recordDailySnapshot` und `getCSVLine` liegen in `src/App.tsx` 88, 466 und sind in `architecture.md` nicht als eigene Zeile geführt)
- **Ebene:** app · **AC-Schätzung:** 9 (vier Schwellen, VVIX-Sonderfall, Ratio, Upsert pro Datum, CSV-Format, Limit-Alarm)
- **Reihenfolge:** 2 — das Kaufverbot ist die Entscheidung, auf die MR-1 hinausläuft.

### MR-4 · Positionsrechner & Watchlist
**Was es tut:** Rechnet Stückzahl und Stop nach der 1 %-Regel, findet ATR-Stops, prüft Denkfehler und pflegt die Watchlist mit Aktiensuche.
- **Routen:** `POST /api/stock-search`
- **Screens:** Tab „Rechner & Checks" (`src/components/RechnerTab.tsx`)
- **Entitäten:** `morgenroutine_watchlist`, `searchCache` (Teil der Server-Cache-Zeile)
- **Funktionen:** —
- **Ebene:** app · **AC-Schätzung:** 10 (Abrunden, FX, Stop über Entry, CRV, Suche lokal/Gemini, Debounce, Watchlist-CRUD, Übernahme ins Portfolio)
- **Reihenfolge:** 6 — eigenständiger Rechner; braucht Kurse aus MR-1.

### MR-5 · Portfolio & Depots
**Was es tut:** Verwaltet Positionen mit Hartem Anker, Stop und Status, Depots und Besitzer, Startkapital, Cash-Salden, Checkliste und die ATR-Parameter für Stops.
- **Routen:** —
- **Screens:** Tab „Portfolio & Cash" (`src/components/PortfolioTab.tsx`)
- **Entitäten:** `morgenroutine_portfolio`, `morgenroutine_checklist`, `morgenroutine_custom_depots`, `morgenroutine_custom_besitzer`, `morgenroutine_depot_starting_cash`, `morgenroutine_atr_multiplier` / `_atr_length` / `_atr_smoothing`
- **Funktionen:** —
- **Ebene:** app · **AC-Schätzung:** 12 (Stop-Formel, Risiko je Position, Status-Ampel, Depot-/Besitzer-Wiederherstellung, Cash-Summen, Sprung in den Rechner, Checklisten-CRUD)
- **Reihenfolge:** 4 — hält die meisten Tabellen; MR-6 und MR-7 bauen darauf.

### MR-6 · Kauf- & Verkaufsjournal mit KESt
**Was es tut:** Erfasst Käufe als Lose und Verkäufe mit FIFO- oder Durchschnittsmethode, berechnet KESt 27,5 % und Nettogewinn, erlaubt Rückgängig/Bearbeiten und zeichnet die Depotkurve.
- **Routen:** —
- **Screens:** Kauf-/Verkaufs-Journal (`src/components/CombinedJournal.tsx`), Depot-Kurve (`src/components/DepotCurveChart.tsx`)
- **Entitäten:** `morgenroutine_purchases`, `morgenroutine_sold_trades`
- **Funktionen:** —
- **Ebene:** app · **AC-Schätzung:** 12 (Lose verbrauchen, Rückgabe beim Editieren, beide Steuermethoden, Vorschau = Buchung, Undo, Drawdown/Profit-Factor)
- **Reihenfolge:** 5 — hängt an MR-5; steuerlich relevant, daher früh verifizieren.

### MR-7 · Wochen- & Monatsauswertung
**Was es tut:** Aggregiert die Tages-Snapshots zu Wochen und Monaten, zeigt Min/Max/Ø und GREEN/RED-Tage und speichert je Periode eine Pareto-Notiz, optional als KI-Entwurf.
- **Routen:** `POST /api/analyze-period`
- **Screens:** Tab „Auswertung" (`src/components/AuswertungTab.tsx`)
- **Entitäten:** `morgenroutine_period_learnings`
- **Funktionen:** `buildPeriods`
- **Ebene:** app · **AC-Schätzung:** 6 (ISO-Woche, Monatsgrenze, Kennzahlen, Upsert je Periode, KI-Fallback-Kette, Fehlerfall)
- **Reihenfolge:** 7 — liest nur MR-3.

### MR-8 · Regelwerk & KI-Coach
**Was es tut:** Zeigt das statische Regel-Handbuch und bietet einen Chat mit dem Trading-Coach nach dem Regelwerk.
- **Routen:** `POST /api/chat`
- **Screens:** Tab „Regeln & Coach" (`src/components/RegelwerkTab.tsx`), AI Coach (`src/components/AICoachTab.tsx`)
- **Entitäten:** — (Chat-Verlauf nur im Komponenten-State)
- **Funktionen:** Gemini-Client `aiClient` (wird von allen fünf KI-Routen genutzt; Eigentümer hier, weil der Coach-Prompt direkt daneben steht)
- **Ebene:** app · **AC-Schätzung:** 5 (503 ohne Key, Rollen-Mapping, System-Prompt, Fehleranzeige, Verlauf)
- **Reihenfolge:** 8 — Randfunktion ohne Abhängige.

### MR-9 · Google-Konto, Profile & Drive-Backup
**Was es tut:** Meldet den Nutzer per OAuth bei Google an, speichert die Verbindungseinstellungen als lokales oder Cloud-Profil mit PIN und legt Backups in Google Drive an, lädt und löscht sie.
- **Routen:** `GET /auth/callback`, `POST /api/profiles/save`, `POST /api/profiles/load`
- **Screens:** Tab „Workspace" (`src/components/WorkspaceSyncTab.tsx`)
- **Entitäten:** `g_workspace_client_id`, `g_workspace_access_token`, `g_workspace_local_profiles`, `cloud_profiles.json`
- **Funktionen:** `fetchUserInfo`, `handleOAuthLogin`, `fetchDriveBackups`, `handleSyncOrCreateFolder`, `handleCreateBackup`, `handleRestoreBackup`, `handleDeleteBackup`, `handleCloudSaveProfile` / `handleCloudLoadProfile`, `saveProfilesToFile`
- **Ebene:** app · **AC-Schätzung:** 12 (Login, Token-Ablauf, manuelles Token, Profil anlegen/laden, PIN falsch, Ordner anlegen, Backup hoch/runter/löschen, Klartext-Hinweis)
- **Reihenfolge:** 11 — optional für den Kernablauf; sicherheitsrelevant, daher nicht zuletzt.

### MR-10 · Export nach Sheets & Docs
**Was es tut:** Schreibt die Tageszeile in ein Google Sheet (neu oder angehängt) und exportiert das Regelwerk als Google Doc.
- **Routen:** —
- **Screens:** — (Teil des Tabs „Workspace", Zeilen 855–1335)
- **Entitäten:** `g_workspace_spreadsheet_id` / `g_workspace_document_id` / `g_workspace_backup_folder_id` (eine Zeile; die Ordner-ID nutzt MR-9), `g_workspace_sheet_export_mode`
- **Funktionen:** `handleExportToGoogleSheet`, `handleExportRulesToGoogleDoc`
- **Ebene:** app · **AC-Schätzung:** 6 (neues Sheet, Anhängen, Kopfzeile, Verschieben in Ordner, Doc anlegen, Fehler ohne Token)
- **Reihenfolge:** 12 — Randfunktion, braucht MR-9.

### MR-11 · Backup, Wiederherstellung & Reset
**Was es tut:** Erstellt verschlüsselte Backup-Dateien mit PIN oder Passwort, stellt sie oder alte V8-Klartext-Dateien wieder her, lädt Demo-Daten und setzt alle Daten zurück.
- **Routen:** —
- **Screens:** Backup anlegen (`src/components/BackupSetupModal.tsx`), Backup wiederherstellen (`src/components/BackupRestoreModal.tsx`)
- **Entitäten:** `morgenroutine_data_last_modified`, Backup-Datei `MR-BACKUP-1`, Legacy-V8-JSON, Demo-Daten `DEMO_PAYLOAD`
- **Funktionen:** `createBackup` / `decryptBackup` / `parseAnyBackup` / `downloadBackup`, `encryptJson` / `decryptJson`, `handleDownloadLocalJson` / `handleUploadLocalJson`
- **Ebene:** app · **AC-Schätzung:** 10 (PIN-/Passwort-Mindestlänge, Roundtrip, falsche PIN, Legacy-Erkennung, Vergleich alt/neu, Reset nur `morgenroutine_*`, Demo-Markierung)
- **Reihenfolge:** 9 — schützt alle anderen Daten; unumkehrbare Aktionen.

### MR-12 · App-Hülle, Onboarding & PWA
**Was es tut:** Liefert die App als installierbare PWA mit Onboarding-Tour, Handbuch, Kopfzeile mit Routine-Datum, Update-Banner und Diagnose-Endpunkt aus.
- **Routen:** `GET /api/ping`, `GET *` (SPA-Fallback), Vite-Middleware (Dev)
- **Screens:** Onboarding, Handbuch-Modal, Install-Anleitung, PWA-Install-Banner, PWA-Update-Banner, Kopfzeile
- **Entitäten:** `morgenroutine_onboarding_done`, `pwa_install_dismissed`
- **Funktionen:** `handler(req, res)` (Vercel-Entry), `startServer()`
- **Ebene:** app · **AC-Schätzung:** 7 (Onboarding einmalig, Install-Hinweis je Plattform, 7-Tage-Sperre, Update-Prompt, Hilfe springt zum Tab-Abschnitt, Datum-Format, Ping-Antwort)
- **Reihenfolge:** 10 — querschnittlich; alle anderen laufen darin.

## Vorgeschlagene Reihenfolge

MR-1 → MR-3 → MR-2 → MR-5 → MR-6 → MR-4 → MR-7 → MR-8 → MR-11 → MR-12 → MR-9 → MR-10

Kernfluss zuerst (Marktdaten → Ampel → Verteilungstage), dann die Geld-Tabellen (Portfolio, Journal), dann Rechner und Auswertung, dann die querschnittlichen (Backup, Hülle), die Google-Anbindung zuletzt, weil sie optional ist.

## Unassigned

- `public/anleitung.html` — statische Installationsanleitung, im Code nicht referenziert (`architecture.md`, Screens-Tabelle). Entweder MR-12 zuschlagen oder entfernen; Entscheidung in `/init`.
- `public/Morgenroutine_Demo.json` — Legacy-V8-Demo-Datei, im Code nicht referenziert; die In-App-Demo kommt aus `src/utils/demoData.ts` (MR-11). Entweder MR-11 zuschlagen oder entfernen.

## Coverage

12 of 12 Server-Routen, 17 of 19 Screens, 29 of 29 Entitäten, 24 of 24 Server-/Client-Funktionen zugeordnet.
