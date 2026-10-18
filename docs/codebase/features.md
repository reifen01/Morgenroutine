# Feature Map

_Mapped by `/map` on 2026-10-18 at commit `ef921bc`. Vorschlag aus `architecture.md` abgeleitet — bestätigt wird er in `/init`._

Grundlage: 14 Server-Zeilen (11 Routen in `server.ts`, SPA-Fallback, Vite-Middleware, Vercel-Wrapper), 19 Screens, 30 Entitäten und 21 Server-/Client-Funktionen aus `docs/codebase/architecture.md`. Jedes davon ist genau einem Feature zugeordnet oder steht unter „Unassigned". Ebene überall `app` (eine Laufzeit, `.ai-eng-kit` → `layers: []`). Die Haupt-Tabs der App heißen **Morgen · Depot · Analyse · System**.

## Vorgeschlagene Features

### MR-1 · Marktdaten & Kursabruf
**Was es tut:** Holt per Klick die Tageswerte der sechs Ampel-Indikatoren und die Kurse mit ATR und Tagesänderung für Depot und Watchlist, lädt beim Start die Kurshistorie der letzten Wochen nach und hält alles lokal vor.
- **Routen:** `POST /api/fetch-live-prices`, `POST /api/market-history`
- **Screens:** — (Abruf-Bereich im Tab „Morgen", der Screen gehört MR-2)
- **Entitäten:** `morgenroutine_live_prices`, `morgenroutine_prices_cache`, `morgenroutine_prices_last_updated`, `morgenroutine_last_live_fetch`, Server-Cache `livePriceCache`, Server-Cache `marketHistoryCache`
- **Funktionen:** `/api/fetch-live-prices`, `/api/market-history`, `yahooFetch`, `computeATRFromBars`, `fetchStooqDaily`, `fetchYahooData`
- **Ebene:** app · **AC-Schätzung:** 10 (Yahoo→Stooq-Fallback, ATR-Berechnung, EUR-Umrechnung, 60-s-Cache, Historie 5–120 Tage, Cache laden, Fehlerfall, SPX-Ersatz)
- **Reihenfolge:** 1 — jedes andere Feature liest diese Kurse.

### MR-2 · Kaufampel & Distribution Days
**Was es tut:** Leitet aus den Marktwerten GREEN oder RED ab, zählt die Verteilungstage für SPX und NDX, zeigt Trendpfeile und schreibt pro Tag einen Snapshot für die Auswertung.
- **Routen:** `POST /api/calculate-distribution-days`
- **Screens:** Tab `morgenroutine` („Morgen")
- **Entitäten:** `morgenroutine_market_state`, `morgenroutine_daily_history`, Server-Cache `cachedDistDays`
- **Funktionen:** `/api/calculate-distribution-days`, `calculateDistributionDays`
- **Ebene:** app · **AC-Schätzung:** 11 (vier Schwellen, VVIX, Ratio, DD-Regel, Fallback-Kette mit `distSource`, Tages-Cache, 429-Cooldown, Snapshot-Upsert, Backfill)
- **Reihenfolge:** 2 — das Kaufverbot ist die Entscheidung, auf die MR-1 hinausläuft.

### MR-3 · Depot-Übersicht & Bestand
**Was es tut:** Zeigt den Bestand als sortierbare Tabelle mit KESt-Vorschau, die Aufteilung je Aktie, Depot und Besitzer, Gewinn und Tagesänderung, und verwaltet Depots, Besitzer und die Tranchen-Checkliste.
- **Routen:** —
- **Screens:** Tab `journal` („Depot")
- **Entitäten:** `morgenroutine_custom_depots`, `morgenroutine_custom_besitzer`, `morgenroutine_checklist`
- **Funktionen:** —
- **Ebene:** app · **AC-Schätzung:** 9 (Sortierung, Aufklappzeile, Aufteilung, G/V je Aktie, Tagesgewinner, Depot anlegen/umbenennen, Rekonstruktion aus Käufen, Checklisten-CRUD)
- **Reihenfolge:** 5 — hängt an MR-4.

### MR-4 · Kauf- & Verkaufsjournal mit KESt
**Was es tut:** Bucht Käufe als Lose und Verkäufe nach FIFO oder Durchschnitt mit KESt 27,5 %, importiert Excel und JSON, zeigt Chronologie und Trade-Historie.
- **Routen:** —
- **Screens:** — (Komponente `CombinedJournal` im Tab „Depot", `PortfolioTab.tsx:2238`)
- **Entitäten:** `morgenroutine_purchases`, `morgenroutine_sold_trades`
- **Funktionen:** —
- **Ebene:** app · **AC-Schätzung:** 12 (Lose verbrauchen, Rückgabe beim Editieren, beide Methoden, KESt, Netto, Undo, Import-Parser, Pflichtfelder, Depot/Besitzer-Zuordnung)
- **Reihenfolge:** 4 — steuerlich relevant, früh verifizieren.

### MR-5 · Kaufziele & Stop-Schutz
**Was es tut:** Führt die Wächter-Positionen mit Hartem Anker, Limit, Tranche und Stop-Kurs, rechnet den Stop aus ATR-Parametern und springt in Rechner oder Verkaufsbuchung.
- **Routen:** —
- **Screens:** Tab `kaufziele` („🎯 Kaufziele")
- **Entitäten:** `morgenroutine_portfolio`, `morgenroutine_atr_multiplier`, `morgenroutine_atr_length`, `morgenroutine_atr_smoothing`
- **Funktionen:** `handleLoadToCalculator`
- **Ebene:** app · **AC-Schätzung:** 9 (Stop-Formel, Status-Ampel, Limit-Alarm, ATR-Parameter persistiert, Sprung Rechner, Sprung Verkauf, HODL-Sparplan)
- **Reihenfolge:** 3 — die Regel, die MR-2 absichern soll.

### MR-6 · Cash-Cockpit
**Was es tut:** Rechnet je Depot arbeitendes Kapital, freies Cash und reserviertes Budget aus Startkapital, Käufen und Verkäufen.
- **Routen:** —
- **Screens:** Tab `cash` („💵 Cash")
- **Entitäten:** `morgenroutine_depot_starting_cash`
- **Funktionen:** —
- **Ebene:** app · **AC-Schätzung:** 5 (Startkapital je Depot, Summen, Reservierung, Negativfall, Depot ohne Startkapital)
- **Reihenfolge:** 6 — liest MR-3 und MR-4.

### MR-7 · Rechner & Watchlist
**Was es tut:** Rechnet Stückzahl und Stop nach der 1-%-Regel mit Risikoanalyse, prüft Denkfehler, pflegt die Favoriten-Watchlist und sucht Aktien nach Name, Ticker, ISIN oder WKN.
- **Routen:** `POST /api/stock-search`
- **Screens:** Tab `rechner` („🧮 Rechner"), Block „⭐ Watchlist" im Depot
- **Entitäten:** `morgenroutine_watchlist`, Server-Cache `searchCache` + `lastRateLimitTime`
- **Funktionen:** `/api/stock-search`
- **Ebene:** app · **AC-Schätzung:** 11 (Abrunden, Stop über Einstieg, CRV, Tranche, ATR-Rechner, Suche lokal/Gemini, Debounce, Watchlist-CRUD, In den Rechner laden)
- **Reihenfolge:** 7 — eigenständig, braucht Kurse aus MR-1.

### MR-8 · Aktien-Screener (Einbettung)
**Was es tut:** Bettet den externen Screener ein, übergibt Watchlist- und Depot-Ticker und nimmt Symbole aus dem Screener in die Watchlist auf.
- **Routen:** —
- **Screens:** Tab `screener` („🔎 Screener")
- **Entitäten:** — (schreibt in `morgenroutine_watchlist`, Eigentümer MR-7)
- **Funktionen:** —
- **Ebene:** app · **AC-Schätzung:** 4 (iframe mit Parametern, Fallback-Origin, nur erlaubte Origins, Dublettenschutz)
- **Reihenfolge:** 12 — fremder Code, nur die Brücke gehört hierher.

### MR-9 · Auswertung & Erträgnisaufstellung
**Was es tut:** Aggregiert die Tages-Snapshots zu Wochen und Monaten, speichert Pareto-Notizen mit KI-Entwurf und stellt realisierte Erträge je Jahr und Depot zusammen.
- **Routen:** `POST /api/analyze-period`
- **Screens:** Tab `auswertung` („📊 Auswertung")
- **Entitäten:** `morgenroutine_period_learnings`
- **Funktionen:** `/api/analyze-period`
- **Ebene:** app · **AC-Schätzung:** 7 (ISO-Woche, Monat, Kennzahlen, Upsert je Periode, KI-Fallback, Jahresliste, KESt-Summen)
- **Reihenfolge:** 8 — liest MR-2 und MR-4.

### MR-10 · Regelwerk & KI-Coach
**Was es tut:** Zeigt das durchsuchbare Regel-Handbuch mit Direktsprung aus anderen Tabs und bietet den Chat mit dem Trading-Coach nach dem Regelwerk.
- **Routen:** `POST /api/chat`
- **Screens:** Tab `regelwerk` („🎓 Regeln & Coach"), Tab-Wert `ai-coach` (toter Wert, Eigentümer hier)
- **Entitäten:** — (Chat-Verlauf nur im React-State)
- **Funktionen:** `/api/chat`
- **Ebene:** app · **AC-Schätzung:** 6 (Suche im Handbuch, Direktsprung mit Zurück, 503 ohne Key, Rollen-Mapping, System-Prompt, Fehleranzeige)
- **Reihenfolge:** 11 — Randfunktion ohne Abhängige.

### MR-11 · Backup, Demo & Reset
**Was es tut:** Erstellt verschlüsselte Backup-Dateien mit PIN oder Passwort, stellt sie mit Vergleich wieder her, erinnert im Header an fällige Backups, lädt Demo-Daten und setzt alle Daten zurück.
- **Routen:** —
- **Screens:** Tab `workspace` („🗂️ Workspace & Backup"), Modal Backup erstellen, Modal Backup laden
- **Entitäten:** `morgenroutine_data_last_modified`, `morgenroutine_last_backup_at`, Backup-Datei `MR-BACKUP-1`, Demo-Datensatz
- **Funktionen:** `applyRestoredPayload` / `collectBackupPayload`
- **Ebene:** app · **AC-Schätzung:** 10 (Mindestlängen, Roundtrip, falsche PIN, Vergleich alt/neu, Badge ab 7 Tagen, Reset nur `morgenroutine_*`, Demo-Rückfrage, QR-Link)
- **Reihenfolge:** 9 — schützt alle anderen Daten.

### MR-12 · App-Hülle, Onboarding & PWA
**Was es tut:** Liefert die App als installierbare PWA mit Onboarding, Handbuch-Hilfe, Fehlerseite, Update-Banner, Kopfzeile und Diagnose-Endpunkt aus.
- **Routen:** `GET /api/ping`, `GET *` (SPA-Fallback), Vite-Middleware (Dev), Vercel-Function `api/index.ts`
- **Screens:** Modal Handbuch-Hilfe, Onboarding, PWA-Installationshinweis, PWA-Update-Banner, Fehlerseite
- **Entitäten:** `morgenroutine_onboarding_done`, `pwa_install_dismissed`, Service-Worker-Caches
- **Funktionen:** `GET /api/ping`, `startServer()`, `handler(req, res)`
- **Ebene:** app · **AC-Schätzung:** 8 (Onboarding einmalig, Install-Hinweis je Plattform, 7-Tage-Sperre, Update-Prompt, Hilfe springt zum Abschnitt, Fehlerseite leert nur SW-Caches, Ping-Antwort)
- **Reihenfolge:** 10 — querschnittlich.

### MR-13 · Blasen-Ampel (Sektoren)
_Nachtrag: gemergt in Commit `3d39c89` (PR #46) nach dem Stand dieser Karte; die Zeilen unten stammen aus den neuen Dateien selbst, die übrigen Dokumente kennen sie noch nicht — der nächste `/map`-Refresh holt sie nach._
**Was es tut:** Prüft je Sektor-ETF nach der Regel aus der Studie „Bubbles for Fama" (Greenwood, Shleifer & You 2019), ob eine Branche sich in zwei Jahren verdoppelt hat und damit Rückschlagrisiko trägt; zeigt GRÜN/GELB/ROT mit Verlauf und steuert Risikobudget, Hebel und Stopps, sperrt aber keinen Kauf.
- **Routen:** `POST /api/blasen-monatskurse` (`server.ts:1092`, Yahoo-Monatsschlüsse, Server-Cache 12 h, max. 30 Symbole)
- **Screens:** Karte „Blasen-Ampel" im Tab „Morgen" (`src/components/BlasenAmpel.tsx`, eingebunden `MorgenroutineTab.tsx:1282`)
- **Entitäten:** `morgenroutine_blasen_monatskurse` (localStorage-Cache 12 h, `BlasenAmpel.tsx:25`), Server-Cache `blasenCache` (`server.ts:1050`)
- **Funktionen:** `berechneBlasenAmpel`, `blasenTrend` (`src/utils/blasenAmpel.ts`, reine Funktionen, „einzige Stelle für die Regel")
- **Ebene:** app · **AC-Schätzung:** 9 (2J-Rendite absolut und relativ, 5J-Filter, Abstand zum Hoch, 10-Monats-Durchschnitt, Reset bei −40 %, 24-Monate-Fenster, Cache, Symbol-Validierung, Fehlerfall je ETF)
- **Reihenfolge:** 4 — ergänzt MR-2 direkt; die Regel ist dokumentiert und isoliert, daher gut als eine der ersten zu verifizieren.

## Vorgeschlagene Reihenfolge

MR-1 → MR-2 → MR-5 → MR-13 → MR-4 → MR-3 → MR-6 → MR-7 → MR-9 → MR-11 → MR-12 → MR-10 → MR-8

Kernfluss zuerst (Kurse → Ampel → Stop-Schutz), dann die Geld-Tabellen (Journal, Depot, Cash), dann Rechner und Auswertung, dann Backup und Hülle; Coach und Screener zuletzt.

## Unassigned

Reste einer entfernten Funktion (Google-Workspace-Anbindung) und eine Datei ohne Verweis. Im Client gibt es keinen Aufrufer; ob ein externes Skript sie nutzt, ist aus dem Repo nicht ersichtlich.
- `GET /auth/callback` — OAuth-Callback-Seite, kein Empfänger mehr im Client (`architecture.md`, Routen).
- `POST /api/profiles/save`, `POST /api/profiles/load`, Funktion `saveProfilesToFile`, Entität `cloud_profiles.json` — Cloud-Profile mit Klartext-PIN, kein Aufrufer in `src/`.
- `POST /api/parse-screenshot` — Screenshot-OCR, kein Aufrufer in `src/` mehr.
- Screen `/anleitung.html` — statische Installationsanleitung, nirgends verlinkt.

Entscheidung in `/init`: entfernen (dann sind es Aufräum-Aufgaben, kein Feature) oder einem Feature zuschlagen.

## Coverage

10 of 14 Server-Zeilen, 18 of 19 Screens, 29 of 30 Entitäten, 16 of 21 Server-/Client-Funktionen zugeordnet.
